import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { consommer, ipDe, SEUILS } from "@/lib/rateLimit";
import { coerceExperienceLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

// Assistant IA intégré au candidat, pour un step qui l'autorise.
// - identité par token candidat (jamais candidateId/prompt du client) ;
// - prompt système reconstruit serveur (cadrage "aide, ne fais pas à sa place") ;
// - plafond d'échanges appliqué SERVEUR (config.ai_max_messages du step) ;
// - chaque message loggé dans run_ai_messages (usage tokens compris).
//
// La réponse est STREAMÉE (NDJSON) : un vrai chat n'affiche pas sa réponse d'un
// bloc après dix secondes de silence. Même transport que la génération
// d'expérience — pas de dépendance supplémentaire.

// Le streaming peut durer : sans ce plafond relevé, l'hébergeur coupe la
// réponse en plein milieu d'un message.
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";

// Contrôles communs au GET (historique) et au POST (envoi) : le client ne
// fournit qu'un token et un stepId, tout le reste est résolu serveur.
async function resolveContext(admin, token, stepId) {
  if (!token || !stepId) return { error: "token et stepId requis", status: 400 };

  const { data: candidate } = await admin
    .from("candidates").select("id").eq("interview_token", token).single();
  if (!candidate) return { error: "Lien invalide", status: 403 };

  const { data: step } = await admin
    .from("experience_steps")
    .select("id, prompt, ai_assistant_allowed, config, experience_id")
    .eq("id", stepId).single();
  if (!step || !step.ai_assistant_allowed) {
    return { error: "Assistant non disponible pour cette étape", status: 403 };
  }

  const { data: run } = await admin
    .from("candidate_runs").select("id, status")
    .eq("candidate_id", candidate.id).eq("experience_id", step.experience_id).maybeSingle();
  if (!run) return { error: "Run introuvable", status: 403 };

  const perStep = Number(step.config?.ai_max_messages);
  const maxMessages = perStep > 0 ? perStep : 50;

  // Langue du parcours : elle donne à l'assistant sa langue par défaut, celle
  // dans laquelle il ouvre la conversation et celle vers laquelle il retombe si
  // le message du candidat ne permet pas de trancher (« ok », « merci »).
  const { data: exp } = await admin
    .from("experiences").select("jobs!inner(experience_locale)")
    .eq("id", step.experience_id).single();
  const locale = coerceExperienceLocale(exp?.jobs?.experience_locale);

  return { candidate, step, run, maxMessages, locale };
}

// ─── Historique de la conversation ───────────────────────────────────────────
// Le serveur garde tout dans run_ai_messages et renvoie déjà cet historique à
// Claude à chaque appel : sans cette route, le modèle se souvenait de l'échange
// mais l'écran l'oubliait au moindre rechargement.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const admin = createAdminClient();
    const ctx = await resolveContext(admin, searchParams.get("token"), searchParams.get("stepId"));
    if (ctx.error) return Response.json({ error: ctx.error }, { status: ctx.status });

    const { data: history } = await admin
      .from("run_ai_messages").select("role, content, created_at")
      .eq("run_id", ctx.run.id).eq("step_id", ctx.step.id)
      .order("created_at", { ascending: true });

    const { count: usedCount } = await admin
      .from("run_ai_messages").select("id", { count: "exact", head: true })
      .eq("run_id", ctx.run.id).eq("role", "user");

    return Response.json({
      messages: (history || []).map((m) => ({ role: m.role, content: m.content })),
      remaining: Math.max(0, ctx.maxMessages - (usedCount || 0)),
      active: ctx.run.status === "in_progress",
    });
  } catch (error) {
    console.error("run assistant history error:", error);
    return Response.json({ error: error.message || "Erreur assistant" }, { status: 500 });
  }
}

// ─── Envoi d'un message, réponse en streaming ────────────────────────────────
export async function POST(request) {
  try {
    const { token, stepId, message } = await request.json();
    if (!message) return Response.json({ error: "message requis" }, { status: 400 });

    // Limite de débit AVANT toute requête base ou modèle : c'est l'appel le plus
    // coûteux de l'application (Sonnet, 2000 tokens de sortie). Le plafond
    // ai_max_messages plus bas est un plafond par run, pas par unité de temps.
    for (const [cle, seuil] of [
      [`assistant:token:${token}`, SEUILS.assistantParToken],
      [`assistant:ip:${ipDe(request.headers)}`, SEUILS.assistantParIp],
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

    const { step, run, maxMessages, locale } = ctx;
    if (run.status !== "in_progress") {
      return Response.json({ error: "Run non actif" }, { status: 403 });
    }

    // Plafond vérifié AVANT de commencer à streamer : on ne laisse jamais partir
    // un message au-delà de la limite.
    const { count: usedCount } = await admin
      .from("run_ai_messages").select("id", { count: "exact", head: true })
      .eq("run_id", run.id).eq("role", "user");
    if ((usedCount || 0) >= maxMessages) {
      return Response.json({ limitReached: true, remaining: 0 });
    }

    // Historique de CE step : c'est ce qui donne sa continuité à la conversation.
    const { data: history } = await admin
      .from("run_ai_messages").select("role, content, created_at")
      .eq("run_id", run.id).eq("step_id", step.id).order("created_at", { ascending: true });

    // Claude complet : assistant généraliste, sans bridage — on mesure COMMENT le
    // candidat s'en sert (noté séparément), pas s'il s'en sert. Tout est loggé.
    const system = `Tu es Claude, un assistant IA généraliste développé par Anthropic. Tu aides l'utilisateur du mieux possible : réponses claires, utiles et honnêtes. Contexte : l'utilisateur travaille sur la tâche suivante pendant une évaluation professionnelle.
"""
${step.prompt || ""}
"""
Réponds naturellement, comme dans une conversation normale.

LANGUE : cette évaluation se déroule en ${LOCALE_NAMES_FR[locale]}. C'est ta langue par défaut. Si le candidat t'écrit dans une autre langue, suis-le — mais quand son message ne permet pas de trancher (« ok », « merci », un simple bout de code), reviens au ${LOCALE_NAMES_FR[locale]}.`;

    const messages = [
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const send = (obj) => {
          if (closed) return;
          try { controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); }
          catch { closed = true; }
        };

        let reply = "";
        try {
          const claude = anthropic.messages.stream({
            model: MODEL, max_tokens: 2000, temperature: 0.7, system, messages,
          });
          claude.on("text", (delta) => { reply += delta; send({ type: "delta", text: delta }); });

          const final = await claude.finalMessage();
          reply = final.content[0]?.text ?? reply;
          const usage = computeAiCost(MODEL, final.usage);

          // Log APRÈS le flux, sur le texte complet : le message du candidat ne
          // porte pas de coût, celui de l'assistant porte l'usage.
          await admin.from("run_ai_messages").insert([
            { run_id: run.id, step_id: step.id, role: "user", content: message },
            { run_id: run.id, step_id: step.id, role: "assistant", content: reply, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
          ]);

          send({ type: "done", remaining: Math.max(0, maxMessages - (usedCount || 0) - 1) });
        } catch (err) {
          console.error("run assistant stream error:", err);
          // Si des tokens sont déjà partis, on conserve l'échange : le candidat
          // l'a vu à l'écran, il doit rester dans ce que le recruteur relit.
          if (reply) {
            await admin.from("run_ai_messages").insert([
              { run_id: run.id, step_id: step.id, role: "user", content: message },
              { run_id: run.id, step_id: step.id, role: "assistant", content: reply },
            ]);
          }
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
    console.error("run assistant error:", error);
    return Response.json({ error: error.message || "Erreur assistant" }, { status: 500 });
  }
}
