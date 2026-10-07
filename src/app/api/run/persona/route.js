import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { consommer, ipDe, SEUILS } from "@/lib/rateLimit";
import { coerceExperienceLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";
import {
  normaliserPersona, repliques, toursCandidat, personaTranscript, consignePersona,
  nettoyerReplique, SENTINELLE_FIN,
} from "@/lib/persona";

// Conversation du candidat avec un personnage joué par l'IA (sandbox
// « persona »). Même transport que l'assistant (NDJSON streamé), mêmes
// garde-fous : identité par token, étape résolue serveur, plafond de tours
// appliqué SERVEUR, limite de débit avant toute requête coûteuse.
//
// Différence de fond avec l'assistant : la conversation est la RÉPONSE de
// l'étape. Elle est écrite dans run_step_responses (meta.persona + la
// transcription dans text_answer), jamais dans run_ai_messages, qui mesure
// l'usage de Claude comme outil.

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// Sonnet : le personnage doit tenir un rôle avec nuance, sur plusieurs tours.
const MODEL = "claude-sonnet-5-5";

const NOMS_LANGUES = { ...LOCALE_NAMES_FR, de: "allemand", es: "espagnol", it: "italien" };

async function resolveContext(admin, token, stepId) {
  if (!token || !stepId) return { error: "token et stepId requis", status: 400 };

  const { data: candidate } = await admin
    .from("candidates").select("id").eq("interview_token", token).single();
  if (!candidate) return { error: "Lien invalide", status: 403 };

  const { data: step } = await admin
    .from("experience_steps")
    .select("id, experience_id, sandbox_kind, response_format, config")
    .eq("id", stepId).single();
  const persona = step?.sandbox_kind === "persona" ? normaliserPersona(step.config?.persona) : null;
  if (!step || !persona) return { error: "Conversation non disponible pour cette étape", status: 403 };

  // Le run du candidat sur l'expérience qui porte CETTE étape : une étape d'une
  // autre offre ne trouve pas de run, donc pas de conversation.
  const { data: run } = await admin
    .from("candidate_runs").select("id, status")
    .eq("candidate_id", candidate.id).eq("experience_id", step.experience_id).maybeSingle();
  if (!run) return { error: "Run introuvable", status: 403 };

  const { data: existing } = await admin
    .from("run_step_responses").select("meta")
    .eq("run_id", run.id).eq("step_id", step.id).maybeSingle();
  const conv = existing?.meta?.persona || { messages: [], ended: false, usage: null };

  const { data: exp } = await admin
    .from("experiences").select("jobs!inner(experience_locale)")
    .eq("id", step.experience_id).single();
  const locale = coerceExperienceLocale(exp?.jobs?.experience_locale);

  return { step, run, persona, conv, meta: existing?.meta || {}, locale };
}

async function enregistrer(admin, ctx, conv) {
  const { error } = await admin.from("run_step_responses").upsert({
    run_id: ctx.run.id,
    step_id: ctx.step.id,
    response_format: ctx.step.response_format || "text",
    text_answer: personaTranscript(ctx.persona, conv),
    meta: { ...ctx.meta, persona: conv },
    status: "submitted",
    updated_at: new Date().toISOString(),
  }, { onConflict: "run_id,step_id" });
  if (error) throw error;
}

function etat(ctx, conv) {
  return {
    messages: repliques(ctx.persona, conv).map((m) => ({ role: m.role, content: m.content })),
    turns: toursCandidat(conv),
    remaining: Math.max(0, ctx.persona.max_turns - toursCandidat(conv)),
    ended: !!conv.ended,
    endedBy: conv.ended_by || null,
    active: ctx.run.status === "in_progress",
  };
}

// ─── Historique ──────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = createAdminClient();
    const ctx = await resolveContext(admin, searchParams.get("token"), searchParams.get("stepId"));
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });
    return Response.json(etat(ctx, ctx.conv));
  } catch (error) {
    console.error("run persona history error:", error);
    return Response.json({ error: "Erreur de conversation" }, { status: 500 });
  }
}

// ─── Un message du candidat, ou la fin de la conversation ────────────────────
export async function POST(request) {
  try {
    const { token, stepId, message, end } = await request.json();

    for (const [cle, seuil] of [
      [`persona:token:${token}`, SEUILS.assistantParToken],
      [`persona:ip:${ipDe(request.headers)}`, SEUILS.assistantParIp],
    ]) {
      const verdict = consommer(cle, seuil.max, seuil.fenetre);
      if (!verdict.autorise) {
        return Response.json(
          { error: "Trop de messages d'affilée. Patientez quelques instants." },
          { status: 429, headers: { "Retry-After": String(verdict.resetDans) } }
        );
      }
    }

    const admin = createAdminClient();
    const ctx = await resolveContext(admin, token, stepId);
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });
    if (ctx.run.status !== "in_progress") return Response.json({ error: "Run non actif" }, { status: 403 });

    const conv = { messages: [...(ctx.conv.messages || [])], ended: !!ctx.conv.ended, ended_by: ctx.conv.ended_by || null, usage: ctx.conv.usage || null };

    // Le candidat met fin à l'échange : c'est un geste, il est consigné.
    if (end) {
      if (!conv.ended) {
        conv.ended = true;
        conv.ended_by = "candidate";
        await enregistrer(admin, ctx, conv);
      }
      return Response.json(etat(ctx, conv));
    }

    const texte = String(message || "").trim().slice(0, 4000);
    if (!texte) return Response.json({ error: "message requis" }, { status: 400 });
    if (conv.ended) return Response.json({ ...etat(ctx, conv), error: "ended" }, { status: 409 });
    if (toursCandidat(conv) >= ctx.persona.max_turns) {
      conv.ended = true;
      conv.ended_by = "limit";
      await enregistrer(admin, ctx, conv);
      return Response.json({ ...etat(ctx, conv), limitReached: true });
    }

    const maintenant = new Date().toISOString();
    conv.messages.push({ role: "candidate", content: texte, at: maintenant });
    const restants = ctx.persona.max_turns - toursCandidat(conv);

    // L'API exige qu'un échange commence par un message de l'utilisateur. Quand
    // le personnage ouvre la conversation, une amorce neutre le précède.
    const historique = repliques(ctx.persona, conv).map((m) => ({
      role: m.role === "candidate" ? "user" : "assistant",
      content: m.content,
    }));
    if (historique[0]?.role === "assistant") historique.unshift({ role: "user", content: "(La conversation commence.)" });

    const langue = ctx.persona.language || ctx.locale;
    const system = consignePersona(ctx.persona, NOMS_LANGUES[langue] || langue, restants);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (obj) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); }
          catch { closed = true; }
        };

        // La sentinelle de fin ne doit jamais s'afficher, même à moitié : on
        // retient la fin du flux tant qu'elle peut être le début de la
        // sentinelle, et on ne la lâche qu'une fois levée l'ambiguïté.
        let brut = "";
        let envoye = 0;
        const emettre = (final = false) => {
          const propre = brut.replace(SENTINELLE_FIN, "");
          let limite = propre.length;
          if (!final) {
            const crochet = propre.lastIndexOf("[");
            if (crochet >= 0 && SENTINELLE_FIN.startsWith(propre.slice(crochet))) limite = crochet;
          }
          if (limite > envoye) {
            send({ type: "delta", text: propre.slice(envoye, limite) });
            envoye = limite;
          }
        };

        try {
          const claude = anthropic.messages.stream({
            model: MODEL, max_tokens: 2000, output_config: { effort: "low" }, system, messages: historique,
          });
          claude.on("text", (delta) => { brut += delta; emettre(); });
          const final = await claude.finalMessage();
          const texteFinal = final.content.filter((b) => b.type === "text").map((b) => b.text).join("");
          if (texteFinal) brut = texteFinal;
          emettre(true);

          const { texte: reponse, fin } = nettoyerReplique(brut);
          const usage = computeAiCost(MODEL, final.usage);
          conv.messages.push({ role: "persona", content: reponse, at: new Date().toISOString() });
          conv.usage = {
            model: MODEL,
            input_tokens: (conv.usage?.input_tokens || 0) + (usage.input_tokens || 0),
            output_tokens: (conv.usage?.output_tokens || 0) + (usage.output_tokens || 0),
            cost_usd: Number(((conv.usage?.cost_usd || 0) + (usage.cost_usd || 0)).toFixed(6)),
          };
          if (fin) { conv.ended = true; conv.ended_by = "persona"; }
          else if (toursCandidat(conv) >= ctx.persona.max_turns) { conv.ended = true; conv.ended_by = "limit"; }
          await enregistrer(admin, ctx, conv);

          send({ type: "done", ...etat(ctx, conv) });
        } catch (err) {
          console.error("run persona stream error:", err);
          // Le message du candidat est gardé même si la réponse a échoué : il
          // l'a écrit, il fait partie de ce que le recruteur relit.
          const { texte: partiel } = nettoyerReplique(brut);
          if (partiel) conv.messages.push({ role: "persona", content: partiel, at: new Date().toISOString() });
          try { await enregistrer(admin, ctx, conv); } catch (e) { console.error("run persona save error:", e); }
          send({ type: "error", error: "La réponse a été interrompue." });
        } finally {
          closed = true;
          try { controller.close(); } catch { /* déjà fermé */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("run persona error:", error);
    return Response.json({ error: "Erreur de conversation" }, { status: 500 });
  }
}
