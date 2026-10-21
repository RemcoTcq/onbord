import { createAdminClient } from "@/lib/supabase/server";
import { consommer, ipDe } from "@/lib/rateLimit";
import { resolveContext, enregistrer, etat, NOMS_LANGUES } from "@/lib/personaContexte";
import {
  realtimeDisponible, configurationAgent, agentPour, lienSession, nomAgent, conversationTerminee,
  messagesDepuisConversation, finDeConversation, usageConversation, DUREE_MAX_APPEL_S,
} from "@/lib/realtimeAppel";

// Appel Realtime de la sandbox persona (voir lib/realtimeAppel.js). Deux gestes :
//   • "session" — avant l'appel : l'agent de l'étape (créé au besoin, consigne
//     déposée par ce serveur) et un lien de session signé pour le navigateur.
//     Toute impossibilité renvoie `fallback` : l'écran passe l'appel maison.
//   • "fin" — après l'appel : la conversation est relue CHEZ ElevenLabs (le
//     navigateur ne donne que son identifiant), vérifiée (elle vient bien de
//     l'agent de cette étape) et enregistrée au format de meta.persona.

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Une session préparée par étape d'appel affichée (deux en développement, où
// React monte les effets deux fois), plus l'import de fin et sa reprise : la
// marge doit couvrir un candidat qui passe vite d'un appel à l'autre.
const SEUIL_TOKEN = { max: 30, fenetre: 60_000 };
const SEUIL_IP = { max: 60, fenetre: 60_000 };

const repli = (status = 200) => Response.json({ fallback: true }, { status });

export async function POST(request) {
  try {
    const { token, stepId, action, conversationId, indice } = await request.json();

    for (const [cle, seuil] of [[`realtime:token:${token}`, SEUIL_TOKEN], [`realtime:ip:${ipDe(request.headers)}`, SEUIL_IP]]) {
      if (!consommer(cle, seuil.max, seuil.fenetre).autorise) {
        return action === "fin" ? Response.json({ error: "Trop de requêtes" }, { status: 429 }) : repli(429);
      }
    }

    const admin = createAdminClient();
    const ctx = await resolveContext(admin, token, stepId);
    if (ctx.error) return action === "fin" ? Response.json({ error: ctx.error }, { status: ctx.status }) : repli(ctx.status);
    if (ctx.run.status !== "in_progress") return action === "fin" ? Response.json({ error: "Run non actif" }, { status: 403 }) : repli(403);

    // ── Avant l'appel ──
    if (action === "session") {
      if (!realtimeDisponible() || ctx.persona.mode === "chat" || ctx.conv.ended) return repli();
      const langue = ctx.persona.language || ctx.locale;
      const agentId = await agentPour(configurationAgent(ctx.persona, ctx.step.id, langue, NOMS_LANGUES[langue] || langue));
      const signedUrl = await lienSession(agentId);
      return Response.json({ signedUrl, maxDurationSecs: DUREE_MAX_APPEL_S });
    }

    // ── Après l'appel ──
    if (action === "fin") {
      const id = String(conversationId || "").trim();
      if (!/^[\w-]{6,128}$/.test(id)) return Response.json({ error: "conversationId invalide" }, { status: 400 });
      // Déjà importée (l'écran a réessayé) : même réponse — sauf si l'import
      // précédent a saisi la conversation avant qu'ElevenLabs ne l'ait close,
      // auquel cas on la relit.
      const memeAppel = ctx.conv.realtime?.conversation_id === id;
      if (ctx.conv.ended && memeAppel && ctx.conv.realtime?.status === "done") return Response.json(etat(ctx, ctx.conv));
      if (ctx.conv.ended && !memeAppel) return Response.json({ ...etat(ctx, ctx.conv), error: "ended" }, { status: 409 });

      const conversation = await conversationTerminee(id);
      // La conversation doit venir d'un agent de CETTE étape : un identifiant
      // d'une autre étape, d'une autre offre ou d'un autre compte est refusé.
      const nom = conversation?.agent_id ? await nomAgent(conversation.agent_id).catch(() => "") : "";
      if (!nom.startsWith(`onbord-persona-${ctx.step.id}-`)) {
        return Response.json({ error: "Conversation inconnue pour cette étape" }, { status: 403 });
      }

      const conv = {
        messages: messagesDepuisConversation(conversation, ctx.persona),
        ended: true,
        ended_by: finDeConversation(conversation, indice),
        usage: usageConversation(conversation),
        realtime: { conversation_id: id, agent_id: conversation.agent_id, status: conversation.status },
      };
      await enregistrer(admin, ctx, conv);
      return Response.json(etat(ctx, conv));
    }

    return Response.json({ error: "action inconnue" }, { status: 400 });
  } catch (error) {
    console.error("appel realtime :", error?.message || error);
    return Response.json({ fallback: true, error: "Erreur de l'appel" }, { status: 500 });
  }
}
