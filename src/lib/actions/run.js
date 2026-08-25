"use server";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { deductCredits } from "@/lib/utils/limits";
import { scoreRun } from "@/lib/runScoring";
import { evaluateCrm, crmAnswerToText } from "@/lib/crmScoring";
import { resolveJobEntry } from "@/lib/candidateEntry";
import { executeBatch } from "@/lib/judge0";

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
  // Sandbox code : les cas de test CACHÉS ne doivent pas exister dans le HTML du
  // candidat — sinon il code pour la sortie attendue au lieu de résoudre le
  // problème, et les cas cachés ne servent plus à rien. Seul leur NOMBRE part.
  if (config.code) {
    const tests = config.code.tests || [];
    config.code = {
      language: config.code.language,
      starter_code: config.code.starter_code,
      tests: tests.filter((t) => !t.hidden).map(({ name, stdin, expected_output }) => ({ name, stdin, expected_output })),
      hidden_count: tests.filter((t) => t.hidden).length,
    };
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

// Un lien d'évaluation vit 5 jours. `interview_expires_at` est posé à la création
// du candidat et fait foi ; on retombe sur created_at + 5 jours pour les lignes
// antérieures à cette colonne, comme le faisait l'ancien hub.
const LINK_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000;

function linkHasExpired(candidate) {
  const explicit = candidate?.interview_expires_at;
  if (explicit) {
    const at = new Date(explicit);
    if (!Number.isNaN(at.getTime())) return Date.now() > at.getTime();
  }
  if (!candidate?.created_at) return false; // sans date, on ne recale personne
  const created = new Date(candidate.created_at);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() > created.getTime() + LINK_LIFETIME_MS;
}

async function resolveCandidateAndRun(admin, token) {
  const { data: candidate } = await admin
    .from("candidates")
    .select("id, job_id, first_name, assessment_status, created_at, interview_expires_at")
    .eq("interview_token", token).single();
  if (!candidate) return { error: "Lien d'évaluation invalide." };

  const { data: job, error: jobError } = await admin
    .from("jobs").select("id, user_id, title, saved_flow_nodes, assessment_config, experience_locale").eq("id", candidate.job_id).single();
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

// ─── Aiguillage d'entrée du candidat ─────────────────────────────────────────
// La règle vit dans lib/candidateEntry.js (module pur, partagé avec la création
// de candidature et les écrans recruteur). Ici, seules les deux portes d'entrée.

// Entrée par le lien personnel du candidat (/assessment/[token]).
//
// Renvoie aussi de quoi habiller l'écran d'attente (titre de l'offre + branding
// du recruteur). C'est délibéré : la page lisait ces champs elle-même avec la
// CLÉ ANON depuis le navigateur, ce qui n'était possible que grâce à une policy
// RLS `USING (true)` sur candidates — donc toute la table lisible par n'importe
// qui. La résolution se fait ici, par token et en service_role, comme partout
// ailleurs dans le parcours candidat (cf. resolveCandidateAndRun).
export async function getCandidateEntry(token) {
  try {
    if (!token) return { entry: "invalid" };
    const admin = createAdminClient();
    const { data: candidate } = await admin
      .from("candidates").select("job_id").eq("interview_token", token).maybeSingle();
    if (!candidate) return { entry: "invalid" };

    const entry = await resolveJobEntry(admin, candidate.job_id);
    // Le parcours part sur /run : inutile de charger l'habillage d'attente.
    if (entry !== "not_ready") return { entry };

    const { data: job } = await admin
      .from("jobs").select("title, user_id, experience_locale").eq("id", candidate.job_id).maybeSingle();

    let recruiter = null;
    if (job?.user_id) {
      const { data } = await admin
        .from("users")
        .select("company_name, company_logo_url, brand_primary_color, brand_secondary_color")
        .eq("id", job.user_id).maybeSingle();
      recruiter = data || null;
    }

    return { entry, job: job ? { title: job.title, experience_locale: job.experience_locale } : null, recruiter };
  } catch (err) {
    console.error("getCandidateEntry error:", err);
    // En cas d'incident, on ferme plutôt que d'ouvrir : mieux vaut un écran
    // d'attente qu'une candidature enregistrée sans évaluation derrière.
    return { entry: "not_ready" };
  }
}

// Entrée par le lien public de l'offre (/apply/[job_id]).
export async function getJobEntry(jobId) {
  try {
    if (!jobId) return { entry: "invalid" };
    return { entry: await resolveJobEntry(createAdminClient(), jobId) };
  } catch (err) {
    console.error("getJobEntry error:", err);
    return { entry: "not_ready" };
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
      job: { id: job.id, title: job.title, experience_locale: job.experience_locale },
      recruiter: recruiter || {},
    };

    // ── Porte qualificative ────────────────────────────────────────────────
    // Un candidat déjà recalé ne revoit jamais l'expérience, même avec son lien.
    if (candidate.assessment_status === "disqualified") {
      return { success: true, disqualified: true, ...branding };
    }

    // ── Péremption du lien ─────────────────────────────────────────────────
    // Elle bloque l'ENTRÉE, jamais la sortie : un candidat qui a déjà commencé
    // termine son parcours même si son lien vient d'expirer. Le recaler à
    // mi-chemin lui ferait perdre un travail déjà fourni, ce qu'aucune règle
    // d'invitation ne justifie.
    if (!run && linkHasExpired(candidate)) {
      return { success: true, expired: true, ...branding };
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
      job: { id: job.id, company: job.company, title: job.title, experience_locale: job.experience_locale },
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

    // Sandbox code : le résultat d'exécution (meta.code) appartient au serveur,
    // il est écrit par runCode(). Cette action-ci ne transporte que le source,
    // et son `meta` vide écraserait les tests passés — d'où la reprise.
    if (step.sandbox_kind === "code") {
      const { data: existing } = await admin
        .from("run_step_responses").select("meta")
        .eq("run_id", ctx.run.id).eq("step_id", stepId).maybeSingle();
      if (existing?.meta?.code) meta = { ...meta, code: existing.meta.code };
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

// ─── Sandbox code : exécution réelle du code du candidat ─────────────────────
// Le nombre d'exécutions est plafonné SERVEUR. Deux raisons : chaque exécution
// est un appel facturé chez le fournisseur, et un candidat qui relance à
// l'aveugle 200 fois ne démontre plus rien — le nombre d'essais est lui-même un
// signal, lisible dans le rapport.
const MAX_CODE_RUNS = 12;

export async function runCode(token, stepId, source) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };
    if (ctx.run.status !== "in_progress") return { success: false, error: "Run déjà soumis" };

    const { data: step } = await admin
      .from("experience_steps").select("id, sandbox_kind, config")
      .eq("id", stepId).eq("experience_id", ctx.exp.id).single();
    // Les tests viennent de la BASE, jamais du client : c'est tout l'intérêt
    // d'avoir des cas cachés.
    const codeConfig = step?.sandbox_kind === "code" ? step.config?.code : null;
    const tests = codeConfig?.tests || [];
    if (!tests.length) return { success: false, error: "no_tests" };

    const { data: existing } = await admin
      .from("run_step_responses").select("meta")
      .eq("run_id", ctx.run.id).eq("step_id", stepId).maybeSingle();
    const attempts = existing?.meta?.code?.attempts || 0;
    if (attempts >= MAX_CODE_RUNS) return { success: false, error: "limit_reached", attemptsLeft: 0 };

    const exec = await executeBatch({ source, language: codeConfig.language, tests });
    if (!exec.success) return { success: false, error: exec.error, attemptsLeft: MAX_CODE_RUNS - attempts };

    // Résultats complets côté serveur (entrées et attendus compris) : c'est ce
    // que relira le scoring. La version renvoyée au candidat est filtrée plus bas.
    const executions = tests.map((test, i) => ({
      name: test.name || `Test ${i + 1}`,
      hidden: !!test.hidden,
      passed: exec.results[i].passed,
      verdict: exec.results[i].verdict,
      stdout: exec.results[i].stdout,
      stderr: exec.results[i].stderr,
      compile_output: exec.results[i].compile_output,
      time: exec.results[i].time,
    }));
    const passed = executions.filter((e) => e.passed).length;

    const codeMeta = {
      language: codeConfig.language || null,
      attempts: attempts + 1,
      passed,
      total: tests.length,
      executions,
      last_run_at: new Date().toISOString(),
    };

    // On persiste aussi le source : un candidat qui exécute puis ferme l'onglet
    // ne doit pas perdre son travail.
    const { error } = await admin.from("run_step_responses").upsert({
      run_id: ctx.run.id,
      step_id: stepId,
      response_format: "code",
      text_answer: source ?? "",
      meta: { ...(existing?.meta || {}), code: codeMeta },
      status: "submitted",
      updated_at: new Date().toISOString(),
    }, { onConflict: "run_id,step_id" });
    if (error) throw error;

    // Ce qui redescend au navigateur : le détail des cas VISIBLES, et pour les
    // cas cachés uniquement réussi/échoué. Ni leur entrée, ni leur attendu.
    const visibleTests = tests.filter((t) => !t.hidden);
    const visible = executions.filter((e) => !e.hidden);
    const hidden = executions.filter((e) => e.hidden);
    return {
      success: true,
      attemptsLeft: MAX_CODE_RUNS - codeMeta.attempts,
      summary: { passed, total: tests.length, hiddenPassed: hidden.filter((e) => e.passed).length, hiddenTotal: hidden.length },
      // Une erreur de compilation frappe tous les cas de la même façon : on la
      // remonte une seule fois plutôt que répétée sur chaque ligne.
      compileError: executions.find((e) => e.verdict === "compile_error")?.compile_output || null,
      results: visible.map((e, i) => ({
        name: e.name,
        passed: e.passed,
        verdict: e.verdict,
        stdin: visibleTests[i]?.stdin ?? "",
        expected: visibleTests[i]?.expected_output ?? "",
        stdout: e.stdout,
        stderr: e.stderr,
        time: e.time,
      })),
      hiddenResults: hidden.map((e) => ({ passed: e.passed, verdict: e.verdict })),
    };
  } catch (err) {
    console.error("runCode error:", err);
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
// jamais un déclenchement à la volée. Il tourne APRÈS la réponse (voir `after`
// plus bas) : le candidat ne doit pas attendre 30 s derrière son clic.
export async function submitRun(token) {
  try {
    const admin = createAdminClient();
    const ctx = await resolveCandidateAndRun(admin, token);
    if (ctx.error || !ctx.run) return { success: false, error: ctx.error || "Run introuvable" };

    const now = new Date().toISOString();
    await admin.from("candidate_runs")
      .update({ status: "submitted", submitted_at: now })
      .eq("id", ctx.run.id);

    // Statut candidat — les écrans recruteur (liste et fiche) lisent
    // `candidates.status`, que le parcours Experience ne renseignait pas : un
    // candidat qui avait tout terminé restait affiché « Invité ».
    // `assessment_status` est inconditionnel (c'est l'état du parcours), mais
    // `status` ne bouge QUE depuis un état non terminal : un candidat déjà
    // shortlisted / rejected par le recruteur garde sa décision.
    await admin.from("candidates")
      .update({ assessment_status: "submitted", assessment_submitted_at: now })
      .eq("id", ctx.candidate.id);
    await admin.from("candidates")
      .update({ status: "soumis" })
      .eq("id", ctx.candidate.id)
      .in("status", ["invited", "in_progress"]);

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

    // Scoring unique à la soumission, planifié APRÈS l'envoi de la réponse :
    // le candidat voit son écran de remerciement tout de suite au lieu
    // d'attendre l'appel au modèle (~30 s). Toujours non-bloquant : si le
    // scoring échoue, la soumission reste valide (run "submitted") et le
    // recruteur pourra relancer.
    const runId = ctx.run.id;
    after(async () => {
      try {
        const res = await scoreRun(runId);
        if (!res?.success) console.error(`submitRun scoreRun ${runId} en échec :`, res?.error);
      } catch (e) {
        console.error("submitRun scoreRun failed (non-blocking):", e.message);
      }
    });

    return { success: true };
  } catch (err) {
    console.error("submitRun error:", err);
    return { success: false, error: err.message };
  }
}
