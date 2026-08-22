"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";
import { deductCredits } from "../utils/limits";
import { resolveJobEntry, entryIsOpen } from "@/lib/candidateEntry";
import { urlSignee, supprimerFichiersDesCandidats } from "@/lib/storage";
import { consommer, ipDe, SEUILS } from "@/lib/rateLimit";
import { DELAI_CORBEILLE_JOURS } from "@/lib/jobPurge";
import { headers } from "next/headers";

// Digue serveur : aucun candidat n'est créé sur une offre qui n'a rien à lui
// faire passer. Le blocage d'interface ne suffit pas — un lien public déjà
// copié dans une annonce continue de fonctionner sans ce contrôle.
// Lecture en admin : l'appelant est tantôt anonyme (candidature publique),
// tantôt le recruteur, et les deux doivent obtenir le même verdict.
async function assertJobAcceptsCandidates(jobId) {
  const entry = await resolveJobEntry(createAdminClient(), jobId);
  if (entry === "invalid") throw new Error("Offre d'emploi introuvable");
  if (!entryIsOpen(entry)) {
    throw new Error("Cette offre n'accepte pas encore de candidatures : aucune expérience n'est publiée.");
  }
}

/**
 * Met une offre à la corbeille. RÉVERSIBLE pendant 7 jours.
 *
 * Ne supprime plus rien : pose `deleted_at`, ce qui suffit à faire disparaître
 * l'offre de tous les écrans recruteur — le filtre est porté par la policy RLS
 * (migration 024) — et à fermer le parcours candidat, filtré à la main dans
 * resolveJobEntry() et getPublicJobAndBranding() puisque ceux-là lisent en
 * service_role.
 *
 * L'effacement réel a lieu au-delà du délai, dans lib/jobPurge.js, appelé par
 * /api/cron/purge.
 *
 * PASSE PAR LE SERVICE_ROLE, comme listDeletedJobs et restoreJob, et pour la
 * même raison — que la migration 024 avait vue pour la lecture, mais pas pour
 * l'écriture. PostgREST n'émet jamais un UPDATE nu : il l'enveloppe dans un
 * `with ... as (update ... returning ...) select`, si bien que la policy SELECT
 * est évaluée sur la ligne APRÈS modification. Or cette policy exige désormais
 * `deleted_at is null` : la ligne qu'on vient de mettre à la corbeille est, à
 * l'instant même, devenue invisible. Postgres refuse le RETURNING — « new row
 * violates row-level security policy for table "jobs" » — et annule l'UPDATE.
 * L'offre restait donc en place.
 *
 * Élargir la policy SELECT aux lignes en corbeille ferait sauter la digue de
 * 024 : c'est elle qui garantit qu'aucune des 23 lectures de `jobs` ne peut
 * ressortir une offre supprimée. Le contrôle de propriété est donc porté à la
 * main ici, comme dans les deux autres chemins de corbeille.
 */
export async function deleteJob(jobId) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // `user_id` n'est plus un second rideau mais LA protection : le service_role
    // contourne la RLS. Ne jamais le retirer. `count` dit si la ligne a bougé —
    // 0 = offre inconnue, appartenant à un autre, ou déjà en corbeille.
    const { error, count } = await createAdminClient()
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) throw error;
    if (count === 0) return { success: false, error: "Suppression impossible ou permission refusée." };

    return { success: true, corbeille: true, delaiJours: DELAI_CORBEILLE_JOURS };
  } catch (error) {
    console.error("Delete Job Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Offres en corbeille du recruteur connecté, avec le nombre de jours restants.
 *
 * Passe par le service_role À DESSEIN : la policy de lecture exclut
 * `deleted_at is not null`, donc le client soumis à RLS ne verrait jamais rien.
 * C'est la contrepartie annoncée du filtre porté par la policy — d'où le filtre
 * explicite sur user_id, qui remplace ici la protection de la RLS.
 */
export async function listDeletedJobs() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data } = await createAdminClient()
      .from('jobs')
      .select('id, title, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    const maintenant = Date.now();
    const offres = (data || []).map((j) => {
      const echeance = new Date(j.deleted_at).getTime() + DELAI_CORBEILLE_JOURS * 86400000;
      return { ...j, joursRestants: Math.max(0, Math.ceil((echeance - maintenant) / 86400000)) };
    });

    return { success: true, jobs: offres };
  } catch (error) {
    console.error("listDeletedJobs error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Sort une offre de la corbeille. Sans effet si elle a déjà été purgée. */
export async function restoreJob(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error, count } = await createAdminClient()
      .from('jobs')
      .update({ deleted_at: null }, { count: 'exact' })
      .eq('id', jobId)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null);

    if (error) throw error;
    if (count === 0) return { success: false, error: "Offre introuvable ou déjà purgée." };

    return { success: true };
  } catch (error) {
    console.error("restoreJob error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function scoreCandidate(jobId, cvText, jobData, candidateName, existingCandidateId = null) {
  try {
    const prompt = `Voici le texte extrait du profil candidat à analyser :\n\n${cvText}`;
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0.1,
      system: `Vous êtes un recruteur expert très rigoureux. Votre mission est d'évaluer un CV candidat face à une offre d'emploi précise.
Vous devez être particulièrement strict sur les 'Must Have' techniques. Si un 'Must Have' technique est manquant, le score doit être fortement pénalisé et cela doit apparaître dans les 'red_flags'.
ATTENTION SOFT SKILLS : Si les soft skills ne sont pas mentionnées dans le CV ou très peu, ne les mettez PAS en 'red_flags'. Classifiez-les comme 'Points d'attention' dans les 'yellow_flags' afin que le recruteur puisse les vérifier en entretien.

L'offre d'emploi :
Titre : ${jobData.title}
Domaine : ${jobData.category}
Expérience requise : ${jobData.experience_level} ${jobData.years_of_experience ? `(${jobData.years_of_experience})` : ''}
Diplôme requis : ${jobData.education_level}
${jobData.contract_type ? `Type de contrat : ${jobData.contract_type}` : ''}

Hard Skills :
${jobData.hard_skills ? jobData.hard_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Soft Skills :
${jobData.soft_skills ? jobData.soft_skills.map(s => `- ${s.name} (${s.priority})`).join('\n') : 'Non spécifié'}

Langues :
${jobData.languages ? jobData.languages.map(l => `- ${l.name} (Niveau ${l.level})`).join('\n') : 'Non spécifié'}

CRITÈRES DE SÉLECTION (Utilisez UNIQUEMENT ces critères pour calculer le score final) :
${jobData.selection_criteria ? jobData.selection_criteria.map(c => `- ${c.name} (Poids: ${c.weight}%)`).join('\n') : 'Non spécifié'}

IMPORTANT : Le score final doit être la moyenne pondérée des scores de 0 à 100 attribués à chaque critère ci-dessus.

Retournez l'évaluation sous forme de JSON strict avec cette structure exacte :
{
  "first_name": "Prénom du candidat (Extrait du profil, ou inconnu)",
  "last_name": "Nom de famille (Extrait du profil, ou inconnu)",
  "email": "Adresse email si trouvée, sinon null",
  "score": nombre entier de 0 à 100 (moyenne pondérée),
  "criteria_breakdown": [
    { "name": "Nom du critère 1", "score": 0-100, "reason": "Pourquoi cette note ?" },
    { "name": "Nom du critère 2", "score": 0-100, "reason": "Pourquoi cette note ?" }
  ],
  "ai_summary": "Un résumé de 3-4 lignes de l'adéquation du profil.",
  "green_flags": ["point fort 1", "point fort 2"],
  "yellow_flags": ["point d'attention 1", "point d'attention 2"],
  "red_flags": ["critère éliminatoire 1"]
}`,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const messageContent = response.content[0].text;
    
    // Log the raw response to help debugging
    console.log("Raw AI Response:", messageContent);
    
    // Extract JSON from response
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in response:", messageContent);
      throw new Error("L'IA n'a pas renvoyé un format JSON valide. Réponse brute : " + messageContent.substring(0, 100) + "...");
    }

    let evaluation;
    try {
      // Nettoyer d'éventuels caractères de contrôle invalides avant de parser
      const cleanJsonStr = jsonMatch[0].replace(/[\u0000-\u001F]+/g, " ");
      evaluation = JSON.parse(cleanJsonStr);
    } catch (parseError) {
      console.error("JSON Parse error:", parseError, "for string:", jsonMatch[0]);
      throw new Error("Le JSON renvoyé par l'IA est mal formaté.");
    }

    // Save to Supabase
    const supabase = await createClient();
    
    // Extract first/last name if the AI couldn't find it but we have the filename
    let finalFirstName = evaluation.first_name && evaluation.first_name !== 'inconnu' ? evaluation.first_name : candidateName.split(' ')[0] || 'Candidat';
    let finalLastName = evaluation.last_name && evaluation.last_name !== 'inconnu' ? evaluation.last_name : candidateName.split(' ').slice(1).join(' ') || 'Inconnu';

    let candidate;
    let candidateError;

    if (existingCandidateId) {
      // UPDATE existing candidate (self-serve flow: candidate uploaded their own CV)
      const { data, error } = await supabase
        .from('candidates')
        .update({
          cv_raw_text: cvText,
          score_cv: evaluation.score,
          green_flags: evaluation.green_flags,
          yellow_flags: evaluation.yellow_flags,
          red_flags: evaluation.red_flags,
          ai_summary: evaluation.ai_summary,
          cv_score_breakdown: evaluation.criteria_breakdown,
          status: 'scored',
        })
        .eq('id', existingCandidateId)
        .select()
        .single();
      candidate = data;
      candidateError = error;
    } else {
      // INSERT new candidate (legacy flow: recruiter imports CSV)
      const { data, error } = await supabase
        .from('candidates')
        .insert({
          job_id: jobId,
          first_name: finalFirstName,
          last_name: finalLastName,
          email: evaluation.email,
          cv_raw_text: cvText,
          score_cv: evaluation.score,
          score_global: evaluation.score,
          green_flags: evaluation.green_flags,
          yellow_flags: evaluation.yellow_flags,
          red_flags: evaluation.red_flags,
          ai_summary: evaluation.ai_summary,
          cv_score_breakdown: evaluation.criteria_breakdown,
          status: 'scored'
        })
        .select()
        .single();
      candidate = data;
      candidateError = error;
    }

    if (candidateError) {
      console.error("Supabase Error:", candidateError);
      throw new Error("Impossible d'enregistrer le candidat en base de données.");
    }

    // ★ Déduire 1 crédit CV (idempotent via flag credits_charged_cv)
    let recruiterId = null;
    const { data: job } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();
    if (job) {
      recruiterId = job.user_id;
    }
    if (recruiterId) {
      await deductCredits(recruiterId, candidate.id, "cv_scoring_per_candidate");
    }

    return { success: true, candidate };
  } catch (error) {
    console.error("Score Candidate Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create an empty candidate "shell" with a unique token for the self-serve flow.
 * The recruiter sends the link; the candidate fills their info via the assessment page.
 */
export async function createCandidateShell(jobId, firstName, lastName, email) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    await assertJobAcceptsCandidates(jobId);

    // Generate a unique interview token
    const token = crypto.randomUUID().replace(/-/g, '');

    // 5 days from now
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidate, error } = await supabase
      .from('candidates')
      .insert({
        job_id: jobId,
        first_name: firstName || 'Candidat',
        last_name: lastName || '',
        email: email || null,
        interview_token: token,
        interview_expires_at: expiresAt,
        status: 'invited',
        assessment_status: 'pending',
        score_cv: null,
        score_global: null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, candidate };
  } catch (err) {
    console.error("createCandidateShell error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Public action for candidates to apply for a job.
 * Does not require authentication.
 */
// `gdprConsentAt` est posé ICI, dans l'insert, et non plus par un UPDATE lancé
// depuis le navigateur juste après. Cet update anonyme n'était possible que via
// une policy RLS `USING (true)` sur candidates — qui autorisait du même coup la
// modification de n'importe quel candidat par n'importe qui (voir migration 014).
// Il ne restait par ailleurs aucune raison de faire un aller-retour de plus :
// la valeur est connue au moment de la candidature.
export async function applyForJob(jobId, firstName, lastName, email, gdprConsentAt = null) {
  try {
    // Point d'entrée entièrement anonyme : sans limite de débit, il permet de
    // remplir la table `candidates` et de déclencher des envois d'e-mails en
    // boucle. Postuler reste un acte rare — 5 par heure et par IP ne gêne
    // personne (cf. SEUILS.candidatureParIp).
    const verdict = consommer(
      `apply:ip:${ipDe(await headers())}`,
      SEUILS.candidatureParIp.max,
      SEUILS.candidatureParIp.fenetre
    );
    if (!verdict.autorise) {
      return { success: false, error: "Trop de candidatures envoyées depuis cette connexion. Réessayez dans un moment." };
    }

    // Toutes les lectures de cette action passent par le service_role : le
    // candidat qui postule est ANONYME.
    //
    // Sur `candidates`, parce que depuis la migration 014 le rôle anon n'a plus
    // aucun droit de lecture sur cette table (il ne lui reste qu'un INSERT).
    // Avec le client anon, l'anti-doublon plus bas ne trouverait plus jamais
    // rien — il créerait des doublons en silence — et le `.select()` de l'insert
    // échouerait, le RETURNING d'un insert exigeant un droit SELECT.
    //
    // Sur `jobs`, pour la même raison depuis la migration 021, qui ferme la
    // table au rôle anon. Le contrôle de publication ci-dessous serait sinon
    // devenu un refus systématique : « Offre d'emploi introuvable » sur toutes
    // les candidatures.
    //
    // La digue métier reste au-dessus : assertJobAcceptsCandidates.
    const admin = createAdminClient();

    // Verify job exists — et qu'elle est publiée. Une offre en brouillon
    // acceptait des candidatures : le lien public fonctionnait avant même que le
    // recruteur ait terminé de la créer.
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('id, status')
      .eq('id', jobId)
      .maybeSingle();

    if (jobError || !job) throw new Error("Offre d'emploi introuvable");
    if (job.status === 'draft') throw new Error("Cette offre n'est pas encore ouverte aux candidatures.");

    await assertJobAcceptsCandidates(jobId);

    // ── Anti-doublon : vérifier si un candidat avec ce même email a déjà postulé ──
    if (email) {
      const { data: existing } = await admin
        .from('candidates')
        .select('id, interview_token, assessment_status')
        .eq('job_id', jobId)
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existing) {
        // Renvoyer vers l'assessment existant plutôt que créer un doublon.
        // Le consentement est tout de même (re)posé s'il vient d'être donné :
        // c'est ce que faisait l'update navigateur, qui ne distinguait pas les
        // deux cas.
        if (gdprConsentAt) {
          await admin
            .from("candidates")
            .update({ gdpr_consent_at: gdprConsentAt })
            .eq("id", existing.id);
        }
        return { success: true, candidate: existing, alreadyApplied: true };
      }
    }

    // Generate a unique interview token
    const token = crypto.randomUUID().replace(/-/g, '');

    // 5 days from now
    const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: candidate, error } = await admin
      .from('candidates')
      .insert({
        job_id: jobId,
        first_name: firstName || 'Candidat',
        last_name: lastName || '',
        email: email ? email.trim().toLowerCase() : null,
        interview_token: token,
        interview_expires_at: expiresAt,
        gdpr_consent_at: gdprConsentAt,
        status: 'invited',
        assessment_status: 'pending',
        score_cv: null,
        score_global: null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, candidate };
  } catch (err) {
    console.error("applyForJob error:", err);
    return { success: false, error: err.message };
  }
}

export async function getCandidatesForJob(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('candidates')
      .select('*, test_sessions:candidate_test_sessions(score, status, test_id)')
      .eq('job_id', jobId)
      .order('score_cv', { ascending: false });
    
    if (error) throw error;
    
    // Dynamically compute score_tests if not fully submitted
    const candidatesWithDynamicScores = data.map(c => {
      let finalScoreTests = c.score_tests;
      if (c.test_sessions && c.test_sessions.length > 0) {
        const completedTests = c.test_sessions.filter(s => s.status === 'completed' && s.score != null);
        if (completedTests.length > 0) {
          const avg = Math.round(completedTests.reduce((sum, s) => sum + s.score, 0) / completedTests.length);
          // Prefer dynamic average over db value to always reflect latest passed tests
          finalScoreTests = avg;
        }
      }
      return { ...c, score_tests: finalScoreTests };
    });

    return { success: true, candidates: candidatesWithDynamicScores };
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getCandidateDetail(candidateId) {
  try {
    const supabase = await createClient();
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*, jobs(*)')
      .eq('id', candidateId)
      .single();
    
    if (error) throw error;

    // Get messages from transcript field
    let messages = [];
    if (candidate && candidate.interview_transcript) {
      try {
        messages = typeof candidate.interview_transcript === 'string' 
          ? JSON.parse(candidate.interview_transcript) 
          : candidate.interview_transcript;
      } catch (e) {
        console.error("Error parsing transcript:", e);
        messages = [];
      }
    }

    // Fetch test sessions
    let testSessions = [];
    const { data: tests } = await supabase
      .from('candidate_test_sessions')
      .select('*, assessment_tests(name, category)')
      .eq('candidate_id', candidateId);
    if (tests) testSessions = tests;

    // Fetch video interview responses
    let videoResponses = [];
    const { data: videos } = await supabase
      .from('video_interview_responses')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('question_index');
    if (videos) videoResponses = videos;

    // Dynamically compute score_tests
    let finalScoreTests = candidate.score_tests;
    if (testSessions.length > 0) {
      const completedTests = testSessions.filter(s => s.status === 'completed' && s.score != null);
      if (completedTests.length > 0) {
        finalScoreTests = Math.round(completedTests.reduce((sum, s) => sum + s.score, 0) / completedTests.length);
      }
    }

    // Fetch Experience Run (new assessment flow).
    // candidate_runs / run_scores sont RLS deny-all (service_role only, cf.
    // migration 011) : lecture via admin. Le candidat est déjà owner-scopé —
    // la lecture RLS de `candidates` ci-dessus n'a réussi que si le recruteur
    // possède ce candidat.
    const admin = createAdminClient();
    const { data: expRun } = await admin
      .from('candidate_runs')
      .select('*, run_scores(*), experiences(*)')
      .eq('candidate_id', candidateId)
      .maybeSingle();

    // Rapport de preuves complet, structuré PAR STEP dans l'ordre du parcours :
    // réponse intégrale + critères BARS (justif + verbatim) + log assistant IA.
    let experienceReport = null;
    if (expRun) {
      const [{ data: rSteps }, { data: rResponses }, { data: rAiMsgs }] = await Promise.all([
        admin.from('experience_steps')
          // `criteria` (grilles BARS) et `config` (corrigé QCM, définition de la
          // fiche CRM) sont indispensables au rapport : sans eux le recruteur lit
          // « N2 » sans savoir ce que vaut N2, ni quelle était la bonne réponse.
          // Vue recruteur, propriétaire de l'offre — rien à masquer ici, à la
          // différence du parcours candidat (cf. sanitizeStepForCandidate).
          .select('id, order_index, kind, title, prompt, response_format, sandbox_kind, skill_assessed, criteria, config')
          .eq('experience_id', expRun.experience_id).order('order_index'),
        admin.from('run_step_responses')
          .select('step_id, response_format, text_answer, transcript, video_url, meta, status')
          .eq('run_id', expRun.id),
        admin.from('run_ai_messages')
          .select('step_id, role, content, created_at')
          .eq('run_id', expRun.id).order('created_at'),
      ]);
      const respByStep = Object.fromEntries((rResponses || []).map((r) => [r.step_id, r]));
      const critByStep = {};
      // `run_scores` est en relation UN-À-UN avec le run (contrainte unique sur
      // run_id), donc PostgREST renvoie un OBJET, pas un tableau : l'ancien
      // `?.[0]` valait toujours undefined et vidait tout le rapport de sa
      // substance (ni note, ni justification, ni corrigé — seulement les
      // réponses brutes). On accepte les deux formes par sécurité.
      const rs = Array.isArray(expRun.run_scores) ? expRun.run_scores[0] : expRun.run_scores;
      for (const c of rs?.criterion_scores || []) { (critByStep[c.step_id] ||= []).push(c); }
      const aiByStep = {};
      for (const m of rAiMsgs || []) { (aiByStep[m.step_id] ||= []).push(m); }

      experienceReport = {
        scored: expRun.status === 'scored',
        overall: rs?.overall ?? null,
        summary: rs?.summary || null,
        ai_usage_used: !!rs?.ai_usage_used,
        ai_usage_score: rs?.ai_usage_score ?? null,
        // NULL sur les runs scorés avant la migration 017 : l'écran masque
        // alors simplement le bloc d'explication.
        ai_usage_justification: rs?.ai_usage_justification ?? null,
        // Nombre de sollicitations réelles de l'assistant, pour situer la note.
        ai_usage_prompts: (rAiMsgs || []).filter((m) => m.role === 'user').length,
        steps: (rSteps || []).map((s) => ({
          id: s.id,
          order_index: s.order_index,
          kind: s.kind,
          title: s.title,
          prompt: s.prompt,
          response_format: s.response_format,
          sandbox_kind: s.sandbox_kind || null,
          skill_assessed: s.skill_assessed || null,
          // Grille BARS de référence : l'échelle sur laquelle le modèle a placé
          // le candidat. C'est elle qui rend la note lisible.
          bars: s.criteria || [],
          // Corrigé QCM (options + bonne réponse) et définition de la fiche CRM.
          config: s.config || null,
          response: respByStep[s.id] || null,
          // Scores par sous-dimension ; chacun porte son skill_name, qui sert de
          // clé de regroupement à l'affichage. Vide sur les runs pré-016.
          criteria: critByStep[s.id] || [],
          ai_messages: aiByStep[s.id] || [],
        })),
      };
    }

    // `resumes` et `video-responses` sont des buckets PRIVÉS : ce que la base
    // stocke est un chemin (ou, sur les lignes anciennes, une URL publique
    // devenue inerte). On signe ici, une fois l'ownership déjà établi — la
    // lecture RLS de `candidates` plus haut n'a réussi que pour le recruteur
    // propriétaire. Une URL non signable devient null, et l'écran masque le lien.
    const cvUrlSignee = await urlSignee(admin, "resumes", candidate.cv_url);

    const videoResponsesSignees = await Promise.all(
      videoResponses.map(async (r) => ({
        ...r,
        video_url: await urlSignee(admin, "video-responses", r.video_url),
      }))
    );

    if (experienceReport) {
      experienceReport.steps = await Promise.all(
        experienceReport.steps.map(async (s) => (
          s.response?.video_url
            ? { ...s, response: { ...s.response, video_url: await urlSignee(admin, "video-responses", s.response.video_url) } }
            : s
        ))
      );
    }

    return {
      success: true,
      candidate: {
        ...candidate,
        cv_url: cvUrlSignee,
        score_tests: finalScoreTests,
        interview_messages: messages,
        test_sessions: testSessions,
        video_responses: videoResponsesSignees,
        experience_run: expRun || null,
        experience_report: experienceReport,
      }
    };
  } catch (error) {
    console.error("Get Candidate Detail Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getJobDetail(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) throw error;
    return { success: true, job: data };
  } catch (error) {
    console.error("Get Job Detail Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * URL signée du CV d'un candidat, pour les écrans qui chargent le candidat
 * depuis le navigateur (pool de talents) et n'ont donc pas d'URL exploitable :
 * `resumes` est un bucket privé.
 *
 * L'ownership n'est pas revérifié à la main : la lecture passe par le client
 * SOUMIS À RLS, donc elle ne renvoie une ligne que si le recruteur connecté
 * possède ce candidat. La signature, elle, exige le service_role.
 */
export async function getCvSignedUrl(candidateId) {
  try {
    if (!candidateId) return { success: false, error: "candidateId requis" };

    const supabase = await createClient();
    const { data: candidate } = await supabase
      .from('candidates')
      .select('cv_url, cv_storage_path')
      .eq('id', candidateId)
      .maybeSingle();

    if (!candidate) return { success: false, error: "Accès refusé" };

    const url = await urlSignee(
      createAdminClient(),
      "resumes",
      candidate.cv_storage_path || candidate.cv_url
    );
    return url ? { success: true, url } : { success: false, error: "CV introuvable" };
  } catch (error) {
    console.error("getCvSignedUrl error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

// Page publique /apply/<job_id> : l'appelant est un candidat ANONYME.
//
// Cette action faisait `.select('*')` avec le client soumis à RLS, donc en rôle
// anon — ce qui exigeait une policy de lecture ouverte sur `jobs`, et livrait au
// navigateur user_id, extracted_criteria, ai_interview_config, assessment_config
// et saved_flow_nodes : la configuration complète du pipeline d'évaluation de
// chaque recruteur, brouillons compris (audit du 19/08/2026, §3).
//
// La lecture passe désormais par le service_role, et la liste des champs rendus
// publics est ÉCRITE ICI. Une policy RLS ne sait pas restreindre les colonnes ;
// une liste explicite dans le code, elle, se relit à chaque revue — et une
// nouvelle colonne sensible ne devient pas publique par défaut.
export async function getPublicJobAndBranding(jobId) {
  try {
    const admin = createAdminClient();

    // `deleted_at` filtré ici aussi : cette lecture est en service_role, la
    // policy de la migration 024 ne s'y applique donc pas. Une offre en
    // corbeille doit cesser de s'afficher tout de suite, pas au bout de 7 jours.
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('id, title, status, user_id, saved_flow_nodes')
      .eq('id', jobId)
      .is('deleted_at', null)
      .maybeSingle();

    if (jobError) throw jobError;
    // Une offre en brouillon ne s'affiche pas : même digue que dans applyForJob,
    // où un lien public déjà diffusé continuait de fonctionner avant publication.
    if (!job || job.status === 'draft') {
      return { success: false, error: "Offre introuvable" };
    }

    let recruiter = null;
    try {
      const { data: recData, error: recError } = await admin
        .rpc("get_public_branding", { user_uuid: job.user_id });

      if (!recError && recData) {
        recruiter = recData;
      }
    } catch (err) {
      console.error("Failed to fetch recruiter branding via rpc:", err);
    }

    // `user_id` a servi au branding ci-dessus et ne sort pas ; de
    // saved_flow_nodes on ne garde que le nœud d'accueil, seul élément que le
    // parcours candidat affiche — le reste décrit le pipeline d'évaluation.
    const offrePublique = {
      id: job.id,
      title: job.title,
      status: job.status,
      saved_flow_nodes: (job.saved_flow_nodes || []).filter((n) => n?.type === 'accueil'),
    };

    return { success: true, job: offrePublique, recruiter };
  } catch (error) {
    console.error("Get Public Job And Branding Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateCandidateStatus(candidateId, status) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, candidate: data };
  } catch (error) {
    console.error("Update Candidate Status Error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCandidate(candidateId) {
  try {
    const supabase = await createClient();

    // La lecture par le client soumis à RLS FAIT office de contrôle de propriété :
    // elle ne renvoie la ligne que si le recruteur possède l'offre du candidat.
    // Elle doit précéder tout ce qui suit, qui s'exécute en service_role.
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, interview_token')
      .eq('id', candidateId)
      .maybeSingle();

    if (!candidate) return { success: false, error: "Suppression impossible ou permission refusée." };

    const admin = createAdminClient();

    const { erreurs } = await supprimerFichiersDesCandidats(admin, [candidate]);
    if (erreurs.length) console.error("deleteCandidate — fichiers non supprimés :", erreurs);

    // Cascade vers candidate_runs et tout le run.
    const { error } = await admin.from('candidates').delete().eq('id', candidateId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Delete Candidate Error:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkUpdateCandidateStatus(candidateIds, status) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .in('id', candidateIds);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Bulk Update Error:", error);
    return { success: false, error: error.message };
  }
}

export async function bulkDeleteCandidates(candidateIds) {
  try {
    if (!candidateIds?.length) return { success: true };

    const supabase = await createClient();

    // Lecture RLS : ne remontent que les candidats effectivement possédés. On
    // supprime EXACTEMENT ceux-là, jamais la liste reçue du client — sans quoi
    // un identifiant glissé dans le lot ferait supprimer le candidat d'autrui,
    // la suite s'exécutant en service_role.
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, interview_token')
      .in('id', candidateIds);

    if (!candidates?.length) return { success: false, error: "Suppression impossible ou permission refusée." };

    const admin = createAdminClient();

    // Le nettoyage des vidéos manquait entièrement ici : cette action ne
    // s'occupait que des CV.
    const { erreurs } = await supprimerFichiersDesCandidats(admin, candidates);
    if (erreurs.length) console.error("bulkDeleteCandidates — fichiers non supprimés :", erreurs);

    const { error } = await admin
      .from('candidates')
      .delete()
      .in('id', candidates.map((c) => c.id));

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Bulk Delete Error:", error);
    return { success: false, error: error.message };
  }
}

export async function logMailSent(candidateId, jobId, mailType) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { error } = await supabase
      .from('mail_logs')
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        user_id: user.id,
        mail_type: mailType
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Log Mail Error:", error);
    return { success: false, error: error.message };
  }
}

export async function getMailLogs(jobId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('mail_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('sent_at', { ascending: false });

    if (error) throw error;
    return { success: true, logs: data };
  } catch (error) {
    console.error("Get Mail Logs Error:", error);
    return { success: false, error: error.message };
  }
}

import { sendEmail } from '@/lib/resend';

export async function sendCandidateEmail(candidateId, jobId, mailType, toEmail, subject, body, replyTo) {
  try {
    // Vérification de la session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    if (!toEmail) {
      return { success: false, error: "Le candidat n'a pas d'adresse e-mail renseignée." };
    }

    // Envoi de l'e-mail
    const emailResult = await sendEmail({
      to: toEmail,
      subject: subject,
      html: body.replace(/\n/g, '<br/>'), // Conversion simple texte -> html
      text: body,
      replyTo: replyTo,
    });

    if (!emailResult.success) {
      return { success: false, error: "Erreur lors de l'envoi de l'e-mail" };
    }

    // Enregistrement dans l'historique
    await supabase.from('mail_logs').insert({
      candidate_id: candidateId,
      job_id: jobId,
      user_id: user.id,
      mail_type: mailType
    });

    return { success: true };
  } catch (error) {
    console.error("Send Candidate Email Error:", error);
    return { success: false, error: error.message };
  }
}

export async function generateConstructiveFeedback(candidateId) {
  try {
    const supabase = await createClient();
    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*, jobs(title)')
      .eq('id', candidateId)
      .single();

    if (error || !candidate) throw new Error("Candidat introuvable");

    // Garde-fou données insuffisantes
    if (!candidate.score_global && !candidate.ai_summary) {
      return { success: false, error: "Données d'évaluation insuffisantes pour générer un feedback (l'évaluation n'est pas terminée)." };
    }

    if (candidate.generated_feedback) {
      return { success: true, feedback: candidate.generated_feedback };
    }

    // Determine status label for prompt
    const statusLabel = candidate.status === 'rejected' ? 'REFUSÉ' : candidate.status === 'shortlisted' ? 'RETENU' : 'EN RÉFLEXION';
    
    const prompt = `Tu es un expert en recrutement bienveillant qui rédige un retour destiné directement à un candidat, au nom de l'entreprise qui recrute. Ton feedback sera lu par le candidat lui-même.

CONTEXTE FOURNI :
- Poste visé : ${candidate.jobs?.title || 'Non précisé'}
- Décision : ${statusLabel}
- Synthèse de l'évaluation : ${candidate.ai_summary || 'N/A'}
- Points forts observés : ${(candidate.green_flags || []).join(', ')}
- Axes plus faibles observés : ${(candidate.red_flags || []).concat(candidate.yellow_flags || []).join(', ')}
- Compétences évaluées et observations : ${JSON.stringify(candidate.cv_score_breakdown || [])}

TA MISSION :
Rédige un feedback constructif, humain et respectueux, adressé au candidat ("vous"), en français, de 120 à 180 mots.

RÈGLES ABSOLUES :
1. Ne mentionne JAMAIS de score, de note, de pourcentage, de niveau chiffré, ni aucune mécanique d'évaluation interne. Parle uniquement en langage naturel.
2. Parle des COMPÉTENCES et des SITUATIONS, jamais de la personne. Écris "sur la négociation de contrats complexes, le profil recherché demandait plus d'expérience" — jamais "vous manquez de X" ou "vous n'êtes pas assez Y".
3. Reste honnête. Pas de fausse gentillesse, pas de langue de bois. Un candidat préfère un retour vrai et utile à un compliment creux.
4. Cohérence avec la décision :
   - Si REFUSÉ : reconnais sincèrement 1 ou 2 points forts réels, puis explique avec tact le ou les axes qui ont fait la différence pour CE poste. Le feedback doit rendre la décision compréhensible, sans l'aggraver.
   - Si RETENU : félicite, souligne les forces, et indique éventuellement un axe de progression pour la prise de poste.
   - Si EN RÉFLEXION : reste neutre et encourageant, sans annoncer de décision.
5. Toujours tourné vers le futur : termine par un encouragement concret et sincère, pas par une formule générique.
6. Ne formule jamais de promesse au nom de l'entreprise (pas de "nous vous recontacterons", pas de "postulez à nouveau dans 6 mois") sauf si c'est explicitement dans les données fournies.
7. Ne compare JAMAIS le candidat à d'autres candidats.

STRUCTURE ATTENDUE :
- Une ouverture qui remercie sincèrement pour le temps et l'effort.
- 1 ou 2 points forts réels et spécifiques.
- Le ou les axes d'amélioration, formulés par rapport aux exigences du poste.
- Une clôture encourageante et tournée vers la suite.

Si les données d'évaluation fournies sont insuffisantes ou vides, ne rédige PAS de feedback inventé : réponds exactement "DONNÉES_INSUFFISANTES".

Rédige uniquement le feedback, sans titre ni commentaire.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      temperature: 0.7,
      system: "Tu es un expert en recrutement bienveillant.",
      messages: [{ role: "user", content: prompt }]
    });

    const generatedText = response.content[0].text.trim();

    if (generatedText.includes("DONNÉES_INSUFFISANTES")) {
      return { success: false, error: "L'IA a déterminé qu'il n'y a pas assez de données pertinentes pour formuler un feedback." };
    }

    // Save to DB
    await supabase.from('candidates').update({ generated_feedback: generatedText }).eq('id', candidateId);

    return { success: true, feedback: generatedText };
  } catch (error) {
    console.error("Generate feedback error:", error);
    return { success: false, error: error.message };
  }
}

export async function saveConstructiveFeedback(candidateId, feedback) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('candidates').update({ generated_feedback: feedback }).eq('id', candidateId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Save feedback error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update job details (title, location, contract_type, work_mode, status).
 */
export async function updateJobDetails(jobId, updates) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Only allow safe fields
    const allowed = ['title', 'location', 'contract_type', 'work_mode', 'status', 'saved_flow_nodes'];
    const safeUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(safeUpdates)
      .eq('id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, job: data };
  } catch (error) {
    console.error("Update Job Details Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update the job description / context text.
 */
export async function updateJobDescription(jobId, description) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error } = await supabase
      .from('jobs')
      .update({ description })
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Update Job Description Error:", error);
    return { success: false, error: error.message };
  }
}

