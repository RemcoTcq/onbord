"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { deductCredits } from "@/lib/utils/limits";

// Toutes ces actions sont médiatisées serveur : le candidat n'a pas de session,
// et les tables du run sont en RLS deny-all. On valide le candidat par son
// interview_token, puis on opère avec le client service_role (bypass RLS).
// Jamais on ne fait confiance au client pour l'identité ou pour des données
// sensibles (critères BARS, corrigés QCM) — voir le durcissement É3/É4.

// Retire du step tout ce que le candidat ne doit pas voir (critères, corrigés).
function sanitizeStepForCandidate(step) {
  const config = { ...(step.config || {}) };
  delete config.correct_index;
  delete config.expected_answer;
  return {
    id: step.id,
    order_index: step.order_index,
    kind: step.kind,
    response_format: step.response_format,
    title: step.title,
    prompt: step.prompt,
    sandbox_kind: step.sandbox_kind,
    ai_assistant_allowed: step.ai_assistant_allowed,
    config,
  };
}

async function resolveCandidateAndRun(admin, token) {
  const { data: candidate } = await admin
    .from("candidates").select("id, job_id").eq("interview_token", token).single();
  if (!candidate) return { error: "Lien d'évaluation invalide." };

  const { data: exp } = await admin
    .from("experiences").select("*")
    .eq("job_id", candidate.job_id).eq("status", "published")
    .order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (!exp) return { error: "Aucune expérience publiée pour cette offre." };

  let { data: run } = await admin
    .from("candidate_runs").select("*")
    .eq("candidate_id", candidate.id).eq("experience_id", exp.id).maybeSingle();

  return { candidate, exp, run };
}

// Démarre (ou reprend) le run du candidat sur l'expérience publiée.
export async function startRun(token) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error) return { success: false, error: ctx.error };
    const { candidate, exp } = ctx;
    let run = ctx.run;

    if (!run) {
      const ins = await admin.from("candidate_runs")
        .insert({ candidate_id: candidate.id, experience_id: exp.id, status: "in_progress" })
        .select().single();
      run = ins.data;
      // Verrouille l'expérience au 1er run (versionnage : plus d'édition destructive).
      if (!exp.locked_at) {
        await admin.from("experiences").update({ locked_at: new Date().toISOString() }).eq("id", exp.id);
      }
    }

    const { data: steps } = await admin
      .from("experience_steps").select("*").eq("experience_id", exp.id).order("order_index");
    const { data: responses } = await admin
      .from("run_step_responses")
      .select("step_id, response_format, text_answer, video_url, transcript, meta, status")
      .eq("run_id", run.id);

    return {
      success: true,
      run: { id: run.id, status: run.status },
      experience: { id: exp.id, estimated_minutes: exp.estimated_minutes },
      steps: (steps || []).map(sanitizeStepForCandidate),
      responses: responses || [],
    };
  } catch (err) {
    console.error("startRun error:", err);
    return { success: false, error: err.message };
  }
}

// Enregistre la réponse d'un step (texte, choix, QCM). La vidéo passe par
// saveVideoResponse + /api/transcribe.
export async function saveStepResponse(token, stepId, payload) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };
    if (ctx.run.status !== "in_progress") return { success: false, error: "Run déjà soumis" };

    // Le step doit bien appartenir à l'expérience du run.
    const { data: step } = await admin
      .from("experience_steps").select("id, experience_id, response_format")
      .eq("id", stepId).eq("experience_id", ctx.exp.id).single();
    if (!step) return { success: false, error: "Étape invalide" };

    const row = {
      run_id: ctx.run.id,
      step_id: stepId,
      response_format: step.response_format,
      text_answer: payload.text_answer ?? null,
      meta: payload.meta ?? {},
      status: "submitted",
      updated_at: new Date().toISOString(),
    };
    const { error } = await admin
      .from("run_step_responses").upsert(row, { onConflict: "run_id,step_id" });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveStepResponse error:", err);
    return { success: false, error: err.message };
  }
}

// Enregistre l'URL vidéo uploadée pour un step (statut "transcribing").
// La transcription est déclenchée ensuite via /api/transcribe.
export async function saveVideoResponse(token, stepId, videoUrl, durationSeconds) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };

    const { data: step } = await admin
      .from("experience_steps").select("id").eq("id", stepId).eq("experience_id", ctx.exp.id).single();
    if (!step) return { success: false, error: "Étape invalide" };

    const { data: resp, error } = await admin.from("run_step_responses").upsert({
      run_id: ctx.run.id,
      step_id: stepId,
      response_format: "video",
      video_url: videoUrl,
      duration_seconds: durationSeconds || null,
      status: "transcribing",
      updated_at: new Date().toISOString(),
    }, { onConflict: "run_id,step_id" }).select("id").single();
    if (error) throw error;
    return { success: true, responseId: resp.id };
  } catch (err) {
    console.error("saveVideoResponse error:", err);
    return { success: false, error: err.message };
  }
}

// Soumet le run. Le scoring unique (scoreRun) est déclenché PARESSEUSEMENT à la
// première ouverture du rapport par le recruteur (getRunReport) — inutile de
// faire attendre le candidat ~30 s sur "Terminer".
export async function submitRun(token) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };

    await admin.from("candidate_runs")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", ctx.run.id);

    // Facturation "candidat qui complète le parcours" — au propriétaire de
    // l'offre, idempotente (flag credits_charged_tests sur le candidat).
    // Non-bloquant : n'empêche jamais la soumission.
    try {
      const { data: job } = await admin
        .from("jobs").select("user_id").eq("id", ctx.candidate.job_id).single();
      if (job?.user_id) await deductCredits(job.user_id, ctx.candidate.id, "candidate_completion");
    } catch (e) {
      console.error("submitRun completion charge failed (non-blocking):", e.message);
    }

    return { success: true };
  } catch (err) {
    console.error("submitRun error:", err);
    return { success: false, error: err.message };
  }
}
