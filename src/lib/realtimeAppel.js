// Appel « Realtime » — le mode appel de la sandbox persona joué par un agent
// vocal ElevenLabs (Eleven Realtime) plutôt que par notre chaîne maison
// (reconnaissance du navigateur → Claude → voix phrase par phrase). L'agent
// entend le candidat et lui répond de vive voix, en moins d'une seconde, et
// gère seul les tours de parole et les interruptions.
//
// ── Ce qui ne change pas ────────────────────────────────────────────────────
// Le personnage est le MÊME : sa fiche (config.persona de l'étape, générée et
// éditée comme avant) devient la consigne de l'agent par consignePersona, en
// variante « realtime ». La conversation revient chez nous à la fin de
// l'appel, au format de meta.persona : la transcription, le correcteur et le
// dossier recruteur ne voient aucune différence.
//
// ── Les infos cachées ne passent jamais par le navigateur ────────────────────
// La consigne est déposée chez ElevenLabs par NOTRE serveur, dans un agent
// privé (enable_auth) ; le navigateur ne reçoit qu'un lien de session signé,
// valable 15 minutes. Un agent par étape et par version de fiche : son nom
// porte l'empreinte de sa configuration, si bien qu'une fiche retouchée par le
// recruteur crée un nouvel agent au prochain appel, sans rien stocker en base.
//
// ── Interrupteur ─────────────────────────────────────────────────────────────
// ELEVENLABS_REALTIME=off (ou pas de clé) : l'appel retombe sur la chaîne
// maison, intacte. Toute panne à l'ouverture de session fait de même.

import crypto from "node:crypto";
import { consignePersona } from "@/lib/persona";
import { voixDuPersonnage } from "@/lib/constants/voix";

export const MODELE_REALTIME = process.env.ELEVENLABS_REALTIME_MODEL || "eleven_realtime_v1_mini";
// Plafond de sécurité, pas la durée visée : c'est le personnage qui écourte
// selon le type d'appel (consignePersona) — un appel à froid en 1 à 3 minutes,
// une démo jusqu'à 10 (Remco, 21/10/2026).
export const DUREE_MAX_APPEL_S = 600;

const API = "https://api.elevenlabs.io/v1/convai";
const LANGUES_AGENT = ["fr", "nl", "en", "de", "es", "it"];

// Coût d'un crédit ElevenLabs, pour /admin/couts : le forfait Creator donne
// ~131 000 crédits pour 22 $. Une estimation, comme les autres coûts affichés.
const USD_PAR_CREDIT = Number(process.env.ELEVENLABS_USD_PAR_CREDIT) || 22 / 121_000;

export function realtimeDisponible() {
  return !!process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_REALTIME !== "off";
}

async function api(chemin, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${chemin}`, {
    method,
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 400);
    const err = new Error(`ElevenLabs ${method} ${chemin.split("?")[0]} → ${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * La configuration de l'agent d'une étape, et son nom — qui porte l'empreinte
 * de la configuration.
 * @param {object} persona fiche normalisée (normaliserPersona)
 * @param {string} stepId
 * @param {string} langue code à deux lettres (langue du personnage, sinon de l'offre)
 * @param {string} nomLangue la même, en toutes lettres
 */
export function configurationAgent(persona, stepId, langue, nomLangue) {
  const code = LANGUES_AGENT.includes(langue) ? langue : "en";
  const conversation_config = {
    realtime_model: MODELE_REALTIME,
    agent: {
      first_message: persona.opening_message || "",
      language: code,
      prompt: {
        prompt: consignePersona(persona, nomLangue, persona.max_turns, {
          realtime: true, dureeMaxMinutes: Math.round(DUREE_MAX_APPEL_S / 60),
        }),
        built_in_tools: {
          end_call: { type: "system", name: "end_call", description: "", params: { system_tool_type: "end_call" } },
        },
      },
    },
    tts: { voice_id: voixDuPersonnage(persona) },
    conversation: { max_duration_seconds: DUREE_MAX_APPEL_S },
  };
  const platform_settings = {
    auth: { enable_auth: true },
    // Nous enregistrons nous-mêmes la caméra du candidat et gardons la
    // transcription : ElevenLabs n'a pas à conserver sa voix.
    privacy: { record_voice: false, retention_days: 30 },
  };
  const empreinte = crypto.createHash("sha256")
    .update(JSON.stringify({ conversation_config, platform_settings }))
    .digest("hex").slice(0, 12);
  const name = `onbord-persona-${stepId}-${empreinte}`;
  return { name, body: { name, tags: ["onbord", "persona"], conversation_config, platform_settings } };
}

// Nom → identifiant, pour ne pas interroger ElevenLabs à chaque appel tant que
// l'instance serveur vit.
const agentsConnus = new Map();

/** L'agent de cette configuration : retrouvé par son nom, sinon créé. */
export async function agentPour({ name, body }) {
  if (agentsConnus.has(name)) return agentsConnus.get(name);
  const liste = await api(`/agents?search=${encodeURIComponent(name)}&page_size=10`);
  let id = (liste.agents || []).find((a) => a.name === name)?.agent_id;
  if (!id) id = (await api("/agents/create", { method: "POST", body })).agent_id;
  agentsConnus.set(name, id);
  return id;
}

/** Le lien de session signé que le navigateur utilise pour ouvrir l'appel. */
export async function lienSession(agentId) {
  const data = await api(`/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`);
  return data.signed_url;
}

/** Le nom d'un agent — pour vérifier qu'une conversation vient bien de l'étape. */
export async function nomAgent(agentId) {
  return (await api(`/agents/${encodeURIComponent(agentId)}`)).name;
}

/**
 * La conversation terminée, telle qu'ElevenLabs la restitue. Juste après la
 * fin de l'appel, elle passe par « in-progress » puis « processing » avant
 * « done » : tant qu'elle n'est pas « done », la transcription peut être
 * incomplète — les répliques du candidat manquaient sur un appel importé en
 * « processing » (21/10/2026), ce qui bloquait l'étape. On attend donc « done »
 * (ou « failed »), sans dépasser `attenteMaxMs`.
 */
export async function conversationTerminee(conversationId, { attenteMaxMs = 45_000 } = {}) {
  const debut = Date.now();
  for (;;) {
    const conv = await api(`/conversations/${encodeURIComponent(conversationId)}`);
    if (["done", "failed"].includes(conv.status) || Date.now() - debut > attenteMaxMs) return conv;
    await new Promise((r) => setTimeout(r, 2000));
  }
}

const net = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
// Les indications de jeu de la voix (« [clears throat] », « [interested] ») se
// jouent, elles ne se lisent pas : hors de la transcription.
const sansIndications = (v) => net(String(v ?? "").replace(/\[[^\]\n]{1,40}\]/g, " "));

/**
 * Une conversation ElevenLabs → les messages de meta.persona. La première
 * réplique de l'agent est l'ouverture du personnage, que repliques() ajoute
 * déjà : elle n'est pas recopiée. Deux répliques de suite du même côté (une
 * phrase coupée en deux par une pause) n'en font qu'une.
 */
export function messagesDepuisConversation(conv, persona) {
  const debut = Number(conv?.metadata?.start_time_unix_secs) || Math.floor(Date.now() / 1000);
  const items = (conv?.transcript || [])
    .map((t) => ({ ...t, message: t.role === "agent" ? sansIndications(t.message) : net(t.message) }))
    .filter((t) => t.message);
  const ouverture = net(persona?.opening_message);
  if (ouverture && items[0]?.role === "agent") {
    const premier = net(items[0].message);
    if (ouverture.startsWith(premier) || premier.startsWith(ouverture.slice(0, 40))) items.shift();
  }
  const messages = [];
  for (const t of items) {
    const role = t.role === "user" ? "candidate" : "persona";
    const at = new Date((debut + (Number(t.time_in_call_secs) || 0)) * 1000).toISOString();
    const precedent = messages[messages.length - 1];
    if (precedent?.role === role) precedent.content = `${precedent.content} ${t.message}`;
    else messages.push({ role, content: t.message, at });
  }
  return messages;
}

/**
 * Qui a mis fin à l'appel : la durée maximale atteinte, le personnage qui
 * raccroche (end_call), sinon le candidat. `indice` vient de l'écran (« agent »
 * ou « user ») ; il ne décide que d'une étiquette.
 */
export function finDeConversation(conv, indice) {
  const duree = Number(conv?.metadata?.call_duration_secs) || 0;
  const raison = String(conv?.metadata?.termination_reason || "").toLowerCase();
  if (duree >= DUREE_MAX_APPEL_S - 3 || /max(imum)?[ _-]?duration|time ?limit/.test(raison)) return "limit";
  if (/end_call|agent/.test(raison) || indice === "agent") return "persona";
  return "candidate";
}

/** L'usage de l'appel, au format de meta.persona.usage (lu par /admin/couts). */
export function usageConversation(conv) {
  const credits = Number(conv?.metadata?.cost) || 0;
  const fiat = Number(conv?.metadata?.cost_fiat);
  return {
    provider: "elevenlabs_realtime",
    model: MODELE_REALTIME,
    conversation_id: conv?.conversation_id || null,
    duration_secs: Number(conv?.metadata?.call_duration_secs) || 0,
    credits,
    cost_usd: Number((Number.isFinite(fiat) && fiat > 0 ? fiat : credits * USD_PAR_CREDIT).toFixed(6)),
  };
}
