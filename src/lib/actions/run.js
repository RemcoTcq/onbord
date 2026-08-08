"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { deductCredits } from "@/lib/utils/limits";
import { scoreRun } from "@/lib/runScoring";
import { evaluateCrm, crmAnswerToText } from "@/lib/crmScoring";

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
  // Sandbox CRM : le corrigé des champs factuels et la description du piège ne
  // doivent JAMAIS partir dans le HTML du candidat. On retire aussi `nature`,
  // qui révélerait quels champs sont corrigés automatiquement.
  if (config.crm) {
    config.crm = {
      ...config.crm,
      fields: (config.crm.fields || []).map(({ expected, nature, ...rest }) => rest),
    };
    delete config.crm.traps;
  }
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

// Questions qualificatives DE LA PIPELINE (nœud "qualifying_questions" de
// l'éditeur visuel). C'est la source de vérité : saved_flow_nodes est ce que le
// recruteur édite. assessment_config.modules n'est renseigné qu'à la création de
// l'offre et n'est plus resynchronisé ensuite — d'où le repli, et dans cet ordre.
function getQualifyingQuestions(job) {
  const node = (job?.saved_flow_nodes || []).find((n) => n.type === "qualifying_questions");
  const fromNode = node?.config?.questions;
  if (Array.isArray(fromNode) && fromNode.length) return fromNode;

  const legacy = job?.assessment_config?.modules?.qualifying_questions;
  if (legacy?.enabled && Array.isArray(legacy.questions) && legacy.questions.length) return legacy.questions;

  return [];
}

async function resolveCandidateAndRun(admin, token) {
  const { data: candidate } = await admin
    .from("candidates").select("id, job_id, first_name, assessment_status").eq("interview_token", token).single();
  if (!candidate) return { error: "Lien d'évaluation invalide." };

  const { data: job, error: jobError } = await admin
    .from("jobs").select("id, user_id, title, saved_flow_nodes, assessment_config").eq("id", candidate.job_id).single();
  if (jobError) console.error("resolveCandidateAndRun job error:", jobError);
  if (!job) return { error: "Offre introuvable." };

  const { data: recruiter } = await admin
    .from("users").select("company_name, brand_primary_color, company_logo_url").eq("id", job.user_id).single();

  const { data: exp } = await admin
    .from("experiences").select("*")
    .eq("job_id", candidate.job_id).eq("status", "published")
    .order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (!exp) return { error: "Aucune expérience publiée pour cette offre." };

  let { data: run } = await admin
    .from("candidate_runs").select("*")
    .eq("candidate_id", candidate.id).eq("experience_id", exp.id).maybeSingle();

  return { candidate, job, recruiter, exp, run };
}

// Le candidat doit-il être routé vers le nouveau run Experience ?
// Vrai dès qu'une expérience est publiée pour l'offre du candidat (sinon on
// laisse le parcours hérité — bascule douce, cf. étape 7c).
export async function hasPublishedExperience(token) {
  try {
    if (!token) return { hasExperience: false };
    const admin = createAdminClient();
    const { data: candidate } = await admin
      .from("candidates").select("job_id").eq("interview_token", token).single();
    if (!candidate) return { hasExperience: false };
    const { data: exp } = await admin
      .from("experiences").select("id")
      .eq("job_id", candidate.job_id).eq("status", "published").limit(1).maybeSingle();
    return { hasExperience: !!exp };
  } catch (err) {
    console.error("hasPublishedExperience error:", err);
    return { hasExperience: false };
  }
}

// Démarre (ou reprend) le run du candidat sur l'expérience publiée.
export async function startRun(token) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error) return { success: false, error: ctx.error };
    const { candidate, exp, job, recruiter } = ctx;
    let run = ctx.run;

    const branding = {
      job: { id: job.id, title: job.title },
      recruiter: recruiter || {},
    };

    // ── Porte qualificative ────────────────────────────────────────────────
    // Un candidat déjà recalé ne revoit jamais l'expérience, même avec son lien.
    if (candidate.assessment_status === "disqualified") {
      return { success: true, disqualified: true, ...branding };
    }

    // Les questions de la pipeline sont posées AVANT tout : tant qu'elles n'ont
    // pas été passées, on ne crée même pas le run (sinon un candidat recalé
    // verrouillerait l'expérience via locked_at et compterait comme participant).
    // Deux marqueurs de "porte franchie" : un run déjà entamé, ou
    // assessment_status = 'in_progress' (posé à la réussite, comme le parcours
    // hérité — un candidat qualifié là-bas n'a pas à repasser la porte ici).
    const qualifying = getQualifyingQuestions(job);
    if (!run && qualifying.length > 0 && candidate.assessment_status !== "in_progress") {
      return {
        success: true,
        ...branding,
        // La réponse attendue ne sort JAMAIS du serveur : sinon la porte se lit
        // dans le HTML. La correction se fait dans submitQualifyingAnswers.
        qualifying: { questions: qualifying.map((q, i) => ({ id: q.id ?? String(i), text: q.text })) },
      };
    }

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
      candidate: { id: candidate.id, first_name: candidate.first_name },
      job: { id: job.id, company: job.company, title: job.title },
      recruiter: recruiter || {},
      experience: {
        id: exp.id,
        estimated_minutes: exp.estimated_minutes,
        welcome_message: exp.welcome_message || null,
        thank_you_message: exp.thank_you_message || null,
      },
      steps: (steps || []).map(sanitizeStepForCandidate),
      responses: responses || [],
    };
  } catch (err) {
    console.error("startRun error:", err);
    return { success: false, error: err.message };
  }
}

// Corrige les questions qualificatives de la pipeline. La correction est
// SERVEUR : le client n'a jamais reçu les réponses attendues, il ne peut donc
// pas se qualifier lui-même. Une seule mauvaise réponse suffit à recaler.
export async function submitQualifyingAnswers(token, answers) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error) return { success: false, error: ctx.error };
    const { candidate, job } = ctx;

    if (candidate.assessment_status === "disqualified") {
      return { success: true, passed: false };
    }

    const questions = getQualifyingQuestions(job);
    if (questions.length === 0) return { success: true, passed: true };

    // Une réponse manquante vaut une réponse fausse : on ne laisse pas passer
    // un candidat qui n'aurait pas répondu à tout.
    const given = answers || {};
    const passed = questions.every((q, i) => {
      const key = q.id ?? String(i);
      return given[key] === (q.expectedAnswer || "yes");
    });

    if (!passed) {
      // Mêmes champs que la disqualification du parcours hérité, pour que la
      // fiche candidat et les listes affichent l'état sans traitement spécial.
      await admin.from("candidates").update({
        assessment_status: "disqualified",
        status: "rejected",
        assessment_submitted_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      return { success: true, passed: false };
    }

    // Marque la porte comme franchie, sinon le candidat y serait renvoyé à
    // chaque chargement (le run, lui, n'est créé qu'à l'étape suivante).
    await admin.from("candidates")
      .update({ assessment_status: "in_progress" })
      .eq("id", candidate.id);

    return { success: true, passed: true };
  } catch (err) {
    console.error("submitQualifyingAnswers error:", err);
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
      .from("experience_steps").select("id, experience_id, response_format, sandbox_kind, config")
      .eq("id", stepId).eq("experience_id", ctx.exp.id).single();
    if (!step) return { success: false, error: "Étape invalide" };

    let meta = payload.meta ?? {};
    let textAnswer = payload.text_answer ?? null;

    // Sandbox CRM : la fiche structurée arrive dans meta.crm ; le texte lisible
    // (utilisé par le scoring et le rapport) est dérivé ICI, jamais envoyé par le
    // client. Les drapeaux `warned`/`revised` appartiennent au serveur : le
    // client ne peut ni les poser ni les effacer.
    if (step.sandbox_kind === "crm" && step.config?.crm) {
      const crm = step.config.crm;
      const submitted = { fields: meta.crm?.fields || {}, notes: meta.crm?.notes || "" };
      const { data: existing } = await admin
        .from("run_step_responses").select("meta")
        .eq("run_id", ctx.run.id).eq("step_id", stepId).maybeSingle();
      const prior = existing?.meta?.crm || {};
      const changed = JSON.stringify(prior.fields || {}) !== JSON.stringify(submitted.fields)
        || (prior.notes || "") !== submitted.notes;
      meta = {
        ...meta,
        crm: {
          ...submitted,
          warned: !!prior.warned,
          // Signal de rigueur : le candidat a-t-il retouché sa fiche APRÈS
          // l'avertissement ? (l'avertissement ne dit jamais quel champ.)
          revised: !!prior.revised || (!!prior.warned && changed),
        },
      };
      textAnswer = crmAnswerToText(crm, submitted);
    }

    const row = {
      run_id: ctx.run.id,
      step_id: stepId,
      response_format: step.response_format,
      text_answer: textAnswer,
      meta,
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

// Vérification "sans oracle" d'une fiche CRM, appelée une seule fois par étape.
// Elle ne renvoie JAMAIS quel champ est faux ni la bonne valeur : juste un
// booléen. Sinon le candidat tâtonnerait jusqu'au ✓ et le signal d'extraction ne
// vaudrait plus rien. Le drapeau `warned` est posé côté serveur pour que
// l'avertissement ne puisse pas être rejoué.
export async function checkCrmAnswer(token, stepId) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };

    const { data: step } = await admin
      .from("experience_steps").select("id, sandbox_kind, config")
      .eq("id", stepId).eq("experience_id", ctx.exp.id).single();
    if (!step || step.sandbox_kind !== "crm" || !step.config?.crm) {
      return { success: true, hasMismatch: false };
    }

    const { data: existing } = await admin
      .from("run_step_responses").select("meta")
      .eq("run_id", ctx.run.id).eq("step_id", stepId).maybeSingle();
    const stored = existing?.meta?.crm;
    if (!stored || stored.warned) return { success: true, hasMismatch: false };

    const { factualCount, correctCount } = evaluateCrm(step.config.crm, stored);
    const hasMismatch = factualCount > 0 && correctCount < factualCount;
    if (!hasMismatch) return { success: true, hasMismatch: false };

    await admin.from("run_step_responses")
      .update({ meta: { ...existing.meta, crm: { ...stored, warned: true } }, updated_at: new Date().toISOString() })
      .eq("run_id", ctx.run.id).eq("step_id", stepId);

    return { success: true, hasMismatch: true };
  } catch (err) {
    console.error("checkCrmAnswer error:", err);
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

// Soumet le run. Le scoring unique (scoreRun) est déclenché ICI, à la soumission
// finale : le recruteur qui ouvre la fiche candidat voit un résultat déjà prêt,
// jamais un déclenchement à la volée.
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

    // Scoring unique à la soumission. Non-bloquant : si le scoring échoue, la
    // soumission reste valide (run "submitted"), le recruteur pourra relancer.
    try {
      await scoreRun(ctx.run.id);
    } catch (e) {
      console.error("submitRun scoreRun failed (non-blocking):", e.message);
    }

    return { success: true };
  } catch (err) {
    console.error("submitRun error:", err);
    return { success: false, error: err.message };
  }
}
