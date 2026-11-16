import { Anthropic } from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion, contexteEntreprise } from "@/lib/org";
import { identitePersona } from "@/lib/persona";
import { RUBRIQUES } from "@/lib/knowledge";
import { promptAgentOnboarding, OUTIL_RECAP, NOMS_RUBRIQUES } from "@/lib/agentOnboarding";
import { coerceCanal, normaliserBrief, criteresDepuisCompetences } from "@/lib/simulationCanal";
import { coerceExperienceLocale, coerceUiLocale } from "@/lib/i18n/config";
import { consommer } from "@/lib/rateLimit";

// Un tour de l'agent de conception d'une simulation d'ONBOARDING
// (lib/agentOnboarding.js, 16/11/2026). Le fil vit côté client le temps de la
// création : rien n'est écrit en base avant le clic sur « Générer ». Le cadre
// (rôle, canal, langue, difficulté, personnage) est relu à chaque tour — le
// manager peut le changer pendant l'échange.
//
// Rien n'est débité : c'est de l'onboarding (décision du 10/11/2026).

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 40;

/** Le fil, réduit à ce que l'API accepte : deux messages de suite d'un même rôle sont fusionnés. */
function fil(messages) {
  const out = [];
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || !["user", "assistant"].includes(m.role)) continue;
    const blocs = typeof m.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m.content) ? m.content : [];
    if (!blocs.length) continue;
    const dernier = out[out.length - 1];
    if (dernier && dernier.role === m.role) dernier.content.push(...blocs);
    else out.push({ role: m.role, content: [...blocs] });
  }
  return out.slice(-MAX_MESSAGES);
}

export async function POST(req) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return Response.json({ error: ctx.erreur }, { status: 401 });
    if (!consommer(`agent-module:${ctx.user.id}`, 40, 10 * 60_000).autorise) {
      return Response.json({ error: "Trop de requêtes. Réessayez dans un instant." }, { status: 429 });
    }

    const { messages, cadre = {}, locale } = await req.json();
    const messagesApi = fil(messages);
    if (!messagesApi.length || messagesApi[0].role !== "user") return Response.json({ error: "Aucun message à traiter." }, { status: 400 });

    const admin = createAdminClient();
    let identite = null;
    if (cadre.personaId) {
      const { data } = await admin.from("personas").select("data").eq("id", cadre.personaId).eq("organization_id", ctx.orgId).maybeSingle();
      identite = data ? identitePersona(data.data) : null;
    }
    const { data: org } = await admin.from("organizations").select("knowledge_sections").eq("id", ctx.orgId).maybeSingle();
    const sections = org?.knowledge_sections || {};
    const rubriquesVides = RUBRIQUES.filter((r) => !String(sections[r] || "").trim()).map((r) => NOMS_RUBRIQUES[r]);

    const system = promptAgentOnboarding({
      cadre: {
        role: String(cadre.role || "").slice(0, 160),
        canal: coerceCanal(cadre.canal),
        langue: coerceExperienceLocale(cadre.langue),
        difficulte: cadre.difficulte,
      },
      identite,
      companyContext: await contexteEntreprise(ctx.user.id),
      rubriquesVides,
      langueEchange: coerceUiLocale(locale),
    });

    // Mêmes réglages que le chat de conception du recrutement
    // (app/api/chat/assessment) : réflexion adaptative non affichée, et
    // `drop_block` parce que le prompt système change d'un tour à l'autre.
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });
    const reponse = await anthropic.beta.messages.create({
      model: "claude-sonnet-5-5",
      betas: ["thinking-binding-controls-2026-08-01"],
      max_tokens: 4000,
      thinking: { type: "adaptive", display: "omitted", block_binding: { prefix_mismatch_behavior: "drop_block" } },
      output_config: { effort: "low" },
      system,
      messages: messagesApi,
      tools: [OUTIL_RECAP],
    });

    const filApres = [...messagesApi, { role: "assistant", content: reponse.content }];
    const texte = reponse.content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const outil = reponse.content.find((b) => b.type === "tool_use" && b.name === OUTIL_RECAP.name);
    if (!outil) return Response.json({ messages: filApres, texte, recap: null });

    // Le récapitulatif est montré au manager ; le tour suivant de l'agent
    // reprendra sur ce résultat d'outil.
    const entree = outil.input || {};
    const recap = {
      title: String(entree.title || "").trim().slice(0, 160),
      brief: normaliserBrief(entree),
      criteres: criteresDepuisCompetences(entree.competences),
    };
    filApres.push({ role: "user", content: [{ type: "tool_result", tool_use_id: outil.id, content: "Récapitulatif affiché au manager, avec le bouton « Générer ». Il peut générer, ou te demander des changements." }] });
    return Response.json({ messages: filApres, texte, recap });
  } catch (error) {
    console.error("chat module error:", error);
    return Response.json({ error: "L'agent n'a pas pu répondre. Réessayez." }, { status: 500 });
  }
}
