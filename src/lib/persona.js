// Sandbox « persona » — une conversation écrite avec un interlocuteur joué par
// l'IA. Module PUR.
//
// Ce qu'elle mesure et que la vidéo ne mesure pas : la conduite d'un ÉCHANGE.
// Une réponse vidéo est un monologue d'une prise — bonne pour la posture, le
// pitch, la clarté orale. Une découverte client, une négociation, une
// escalade, un feedback difficile se jouent sur plusieurs tours : poser la
// bonne question, entendre l'objection, rebondir sur ce que l'autre vient de
// lâcher. Les deux formats restent disponibles ; la génération choisit.
//
// ── Ce qui est caché ────────────────────────────────────────────────────────
// Le personnage a une personnalité, des objectifs, des objections, et surtout
// des INFORMATIONS CACHÉES qu'il ne livre que si le candidat sait les faire
// sortir. Rien de cela ne part chez le candidat (sanitizeStepForCandidate) :
// seuls son nom, sa fonction, le contexte remis et son premier message.
//
// ── Ce qui est stocké ───────────────────────────────────────────────────────
// La conversation appartient au SERVEUR : la route /api/run/persona écrit
// chaque tour dans run_step_responses.meta.persona. Le client ne peut ni
// réécrire une réplique du personnage ni en inventer une. Elle n'est PAS dans
// run_ai_messages : ces messages-là mesurent l'usage de l'assistant Claude, et
// parler à un client simulé n'est pas utiliser une IA.

// Deux modes, un seul personnage :
//   • "call" — un appel : le candidat parle, le personnage répond à voix haute,
//     caméra du candidat allumée. Le geste des métiers où tout se joue à
//     l'oral : appel à froid, découverte, objection, négociation, escalade,
//     feedback. C'est le mode par défaut.
//   • "chat" — une messagerie : chat client, message interne, LinkedIn. Pour
//     les situations qui se vivent réellement par écrit.
export const MODES_PERSONA = ["call", "chat"];

export const DEFAUT_TOURS = 12;          // messages du candidat, au plus
export const MAX_TOURS = 20;
export const MIN_TOURS_CANDIDAT = 2;     // en dessous, l'échange ne prouve rien
export const SENTINELLE_FIN = "[FIN_CONVERSATION]";

const net = (v) => String(v ?? "").trim();
const liste = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map(net).filter(Boolean);

/** Remet un personnage généré (ou édité) dans sa forme stockée, ou null. */
export function normaliserPersona(p) {
  const name = net(p?.name);
  if (!name) return null;
  const tours = Number(p?.max_turns);
  return {
    name,
    mode: MODES_PERSONA.includes(p?.mode) ? p.mode : "call",
    role: net(p?.role),
    company: net(p?.company),
    // Langue dans laquelle le personnage s'exprime (celle de la scène).
    language: net(p?.language).toLowerCase().slice(0, 2) || null,
    // Accent (BE, FR, NL, GB, US…) et genre : ils choisissent la voix de
    // l'appel (lib/constants/voix.js). Une voix ElevenLabs précise, choisie
    // par le recruteur, l'emporte sur ce choix.
    accent: net(p?.accent).toUpperCase().slice(0, 2) || null,
    gender: p?.gender === "m" ? "m" : "f",
    voice_id: net(p?.voice_id).slice(0, 64) || null,
    context: net(p?.context),
    opening_message: net(p?.opening_message),
    personality: net(p?.personality),
    goals: net(p?.goals),
    hidden_info: liste(p?.hidden_info).slice(0, 8),
    objections: liste(p?.objections).slice(0, 8),
    red_lines: liste(p?.red_lines).slice(0, 6),
    success_signals: liste(p?.success_signals).slice(0, 8),
    max_turns: Number.isFinite(tours) && tours > 0 ? Math.min(MAX_TOURS, Math.round(tours)) : DEFAUT_TOURS,
  };
}

/** Ce que le candidat a le droit de savoir du personnage. */
export function personaPourCandidat(p) {
  if (!p) return null;
  return {
    name: p.name, mode: p.mode || "call", role: p.role, company: p.company,
    // Langue et accent règlent aussi la reconnaissance vocale du candidat.
    language: p.language || null, accent: p.accent || null,
    context: p.context, opening_message: p.opening_message,
    max_turns: p.max_turns || DEFAUT_TOURS,
  };
}

function identite(p) {
  return [p?.name, [p?.role, p?.company].filter(Boolean).join(", ")].filter(Boolean).join(" — ");
}

/** Les répliques, ouverture comprise, dans l'ordre. */
export function repliques(persona, conv) {
  const out = [];
  if (persona?.opening_message) out.push({ role: "persona", content: persona.opening_message });
  for (const m of conv?.messages || []) out.push(m);
  return out;
}

export const toursCandidat = (conv) => (conv?.messages || []).filter((m) => m.role === "candidate").length;

/**
 * La conversation en texte : la « réponse » lue par le correcteur et par le
 * recruteur. Chaque ligne dit qui parle — le correcteur ne note que celles du
 * candidat.
 */
export function personaTranscript(persona, conv) {
  const lignes = [persona?.mode === "chat"
    ? `CONVERSATION ÉCRITE AVEC ${identite(persona) || "l'interlocuteur"} (personnage joué par l'IA) :`
    : `APPEL AVEC ${identite(persona) || "l'interlocuteur"} (personnage joué par l'IA) — paroles du candidat transcrites automatiquement :`];
  for (const m of repliques(persona, conv)) {
    const qui = m.role === "candidate" ? "Candidat" : (persona?.name || "Interlocuteur");
    lignes.push(`${qui} : ${net(m.content).replace(/\s*\n\s*/g, " / ")}`);
  }
  if (!toursCandidat(conv)) lignes.push("(le candidat n'a rien écrit)");
  const fin = { candidate: "par le candidat", persona: "par l'interlocuteur", limit: "à la limite de messages" }[conv?.ended_by];
  if (conv?.ended && fin) lignes.push(`[Conversation terminée ${fin}.]`);
  return lignes.join("\n");
}

/** Le personnage tel que le candidat le voit — pour l'assistant et le correcteur. */
export function personaSceneText(persona) {
  if (!persona?.name) return "";
  return [
    `Interlocuteur : ${identite(persona)}`,
    persona.context ? `Contexte remis au candidat : ${persona.context}` : null,
    persona.opening_message ? `Premier message de l'interlocuteur : ${persona.opening_message}` : null,
  ].filter(Boolean).join("\n");
}

/**
 * Ce que le correcteur doit savoir : ce que le personnage cachait, ce qu'il
 * objectait, et à quoi se reconnaît une conversation réussie. Plus une règle
 * de preuve propre à ce format : la transcription contient AUSSI les répliques
 * du personnage, qui ne prouvent rien du candidat.
 */
export function personaBriefing(persona) {
  if (!persona?.name) return "";
  const bloc = (titre, items) => (items?.length ? `    ${titre} :\n${items.map((x) => `      • ${x}`).join("\n")}` : null);
  return [
    "  Conversation avec un personnage joué par l'IA (préparation NON communiquée au candidat).",
    "  PREUVE : seules les lignes « Candidat » sont du candidat. Ne cite JAMAIS une réplique du personnage comme verbatim. Une information que le personnage a livrée compte pour le candidat seulement s'il l'a obtenue par ses questions ou s'en est servi ensuite.",
    persona.mode === "chat" ? null
      : "  APPEL VOCAL : les lignes du candidat sont une transcription automatique de sa voix. Ponctuation absente, mot mal reconnu, phrase hachée : ce sont des artefacts de la reconnaissance vocale, jamais une faute du candidat. Juge ce qu'il dit, pas la forme écrite.",
    persona.personality ? `    Personnalité jouée : ${persona.personality}` : null,
    persona.goals ? `    Ce que veut le personnage : ${persona.goals}` : null,
    bloc("Informations cachées, livrées seulement si le candidat sait les faire sortir", persona.hidden_info),
    bloc("Objections prévues", persona.objections),
    bloc("Ce que le personnage n'accepte pas", persona.red_lines),
    bloc("Signes d'une conversation réussie (repères, pas un barème)", persona.success_signals),
  ].filter(Boolean).join("\n");
}

/**
 * La consigne de jeu du personnage. Écrite pour TENIR le rôle : un modèle
 * conversationnel a le réflexe d'aider, de tout dire, de conclure poliment —
 * exactement ce qui viderait l'exercice de son sens.
 *
 * @param {object} persona config.persona complet (côté serveur)
 * @param {string} nomLangue langue du personnage, en toutes lettres
 * @param {number} toursRestants messages du candidat encore possibles
 */
export function consignePersona(persona, nomLangue, toursRestants) {
  const puces = (items) => items.map((x) => `- ${x}`).join("\n");
  const appel = persona.mode !== "chat";
  const canal = appel
    ? "Vous êtes AU TÉLÉPHONE (ou en visio, sans caméra de ton côté). Le candidat te parle ; ce que tu reçois est la transcription automatique de sa voix, et ta réponse sera LUE À VOIX HAUTE par une synthèse vocale."
    : "Le candidat t'écrit, dans une messagerie professionnelle.";
  const forme = appel
    ? `- Tu PARLES : phrases orales, courtes, naturelles (1 à 3 phrases). Jamais de liste, de titre, de mise en forme, d'emoji ni de parenthèse : tout est prononcé tel quel.
- La transcription peut écorcher un mot ou couper une phrase : comprends ce qu'un humain aurait entendu, sans le relever. Si c'est vraiment incompréhensible, fais répéter, comme au téléphone.`
    : "- Réponses COURTES, comme en messagerie : 1 à 4 phrases. Tu ne fais pas de liste.";
  return `Tu joues un PERSONNAGE dans une mise en situation de recrutement. Tu n'es pas un assistant : tu es cette personne, avec ses intérêts, son humeur et ses limites. ${canal}

QUI TU ES : ${identite(persona)}.
${persona.personality ? `PERSONNALITÉ : ${persona.personality}\n` : ""}${persona.goals ? `CE QUE TU VEUX DANS CETTE CONVERSATION : ${persona.goals}\n` : ""}${persona.context ? `CE QUE LE CANDIDAT SAIT DE LA SITUATION : ${persona.context}\n` : ""}${persona.hidden_info.length ? `\nCE QUE TU SAIS ET NE DIS PAS SPONTANÉMENT — tu ne le livres que si le candidat pose une question qui y mène vraiment, ou s'il a su te mettre en confiance. Une question vague obtient une réponse vague :\n${puces(persona.hidden_info)}\n` : ""}${persona.objections.length ? `\nTES OBJECTIONS — tu les soulèves au moment où elles viennent naturellement, une à la fois, et tu ne les abandonnes que face à une vraie réponse :\n${puces(persona.objections)}\n` : ""}${persona.red_lines.length ? `\nCE QUE TU N'ACCEPTES PAS :\n${puces(persona.red_lines)}\n` : ""}
COMMENT TU JOUES :
- Tu restes dans le personnage du début à la fin. Tu ne dis jamais que tu es une IA, tu ne commentes pas l'exercice, tu ne donnes aucun conseil au candidat.
${forme}
- Tu réagis à ce que le candidat écrit vraiment. S'il est flou, tu restes flou ; s'il est maladroit ou insistant, tu te refermes un peu ; s'il est précis et à l'écoute, tu t'ouvres.
- Tu n'inventes pas de faits majeurs qui contrediraient ce qui précède. Pour un détail secondaire qu'on te demande, tu réponds de façon plausible et cohérente.
- Tu ne conclus pas à la place du candidat : c'est à lui d'obtenir une suite (rendez-vous, accord, engagement).
- Quand la conversation arrive à une fin naturelle — accord obtenu, rendez-vous fixé, ou tu y mets un terme parce que l'échange ne mène nulle part — écris ta dernière réplique puis, sur une ligne seule, ${SENTINELLE_FIN}
${toursRestants <= 2 ? `- Le temps presse : il reste au plus ${toursRestants} message(s) au candidat. Amène l'échange vers sa fin, comme le ferait quelqu'un qui doit raccrocher.\n` : ""}
LANGUE — CONSIGNE PRIORITAIRE : tu t'exprimes en ${nomLangue}, la langue de ce personnage. Si le candidat t'écrit dans une autre langue, tu réagis comme le ferait cette personne, et tu continues en ${nomLangue}.`;
}

/** Retire la sentinelle de fin d'une réplique. */
export function nettoyerReplique(texte) {
  const fin = String(texte || "").includes(SENTINELLE_FIN);
  return { texte: String(texte || "").replace(SENTINELLE_FIN, "").trim(), fin };
}
