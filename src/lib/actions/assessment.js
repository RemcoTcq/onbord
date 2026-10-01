"use server";

import { createClient } from "@/lib/supabase/server";
import { aggregateVideoScore, computeGlobalScore, resolveEnabledModules } from "../scoring";

/**
 * Get all active tests from the library
 */
export async function getTestsLibrary() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assessment_tests")
      .select("id, name, description, category, difficulty, estimated_duration_minutes, status")
      .eq("status", "active")
      .order("category")
      .order("name");

    if (error) throw error;
    return { success: true, tests: data };
  } catch (err) {
    console.error("getTestsLibrary error:", err);
    return { success: false, error: err.message };
  }
}

export async function getMyAssessments() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data, error } = await supabase
      .from("company_assessments")
      .select(`
        id,
        status,
        created_at,
        assessment_id,
        assessment_tests (
          id, name, description, category, difficulty, estimated_duration_minutes, status
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Flatten the result
    const tests = data.map(ref => ({
      ...ref.assessment_tests,
      company_assessment_id: ref.id,
      company_assessment_status: ref.status
    }));

    return { success: true, tests };
  } catch (err) {
    console.error("getMyAssessments error:", err);
    return { success: false, error: err.message };
  }
}

export async function addTestToMyAssessments(assessmentId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error } = await supabase
      .from("company_assessments")
      .insert({
        user_id: user.id,
        assessment_id: assessmentId,
        status: 'actif'
      });

    // Ignore unique constraint violation if already added
    if (error && error.code !== '23505') throw error;
    
    return { success: true };
  } catch (err) {
    console.error("addTestToMyAssessments error:", err);
    return { success: false, error: err.message };
  }
}

export async function searchAvailableAssessments(role, skills) {
  try {
    const supabase = await createClient();
    
    // Combine role and skills to search
    const keywords = [role, ...skills].filter(Boolean);
    
    // Or conditions for ILIKE search on name, description, category
    const orConditions = keywords.flatMap(kw => [
      `name.ilike.%${kw}%`,
      `description.ilike.%${kw}%`,
      `category.ilike.%${kw}%`
    ]).join(',');

    const { data, error } = await supabase
      .from("assessment_tests")
      .select("id, name, description, category, difficulty, estimated_duration_minutes, status")
      .eq("status", "active")
      .or(orConditions)
      .limit(3);

    if (error) throw error;
    
    return { success: true, tests: data };
  } catch (err) {
    console.error("searchAvailableAssessments error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Randomly select N questions from a test pool and save them to the assessment config.
 * This ensures all candidates for the same job answer the same questions.
 * Call this when the recruiter finalizes the job configuration.
 */
export async function selectQuestionsForJob(jobId, testId, questionCount = 10) {
  try {
    const supabase = await createClient();

    // Get all questions for this test
    const { data: allQuestions, error } = await supabase
      .from("assessment_questions")
      .select("id, difficulty, created_at")
      .eq("test_id", testId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    if (!allQuestions || allQuestions.length === 0) {
      return { success: false, error: "Aucune question disponible pour ce test." };
    }

    // Logic for specific tests
    const MIXED_TESTS = [
      "d8b98579-abe2-4c2d-8890-9048b4fb2745", // Suites Logiques
      "d79d52e7-ad1e-46bd-930a-3a8a862baca4", // Raisonnement numérique
      "bbe560bc-650d-4839-89cd-8d0d7ee0d445", // Déduction logique
      "172f1772-1bfa-4889-968a-3f74821532d1"  // Attention & rapidité mentale
    ];
    const AI_PROFICIENCY_TEST = "1dac9ae1-d8ae-4cc5-82f3-a010c6bf6f11"; // Test de Maîtrise de l'IA
    let selectedIds = [];
    
    if (testId === AI_PROFICIENCY_TEST) {
      // Balanced selection: fetch with scoring_criteria to get category, pick 2 per category (C1–C5)
      const { data: allWithCriteria } = await supabase
        .from("assessment_questions")
        .select("id, scoring_criteria")
        .eq("test_id", testId);
      const categories = ["C1", "C2", "C3", "C4", "C5"];
      for (const cat of categories) {
        const catQs = (allWithCriteria || []).filter(q => q.scoring_criteria?.category === cat);
        const picked = catQs.sort(() => Math.random() - 0.5).slice(0, 2);
        selectedIds.push(...picked.map(q => q.id));
      }
    } else if (MIXED_TESTS.includes(testId)) {
      const facile = allQuestions.filter(q => q.difficulty === "facile").sort(() => Math.random() - 0.5).slice(0, 3);
      const moyen = allQuestions.filter(q => q.difficulty === "moyen").sort(() => Math.random() - 0.5).slice(0, 5);
      const difficile = allQuestions.filter(q => q.difficulty === "difficile").sort(() => Math.random() - 0.5).slice(0, 2);
      selectedIds = [...facile, ...moyen, ...difficile].map(q => q.id);
    } else {
      // Default logic: natural order
      const selected = allQuestions.slice(0, Math.min(questionCount, allQuestions.length));
      selectedIds = selected.map((q) => q.id);
    }

    // Update assessment_config on the job
    const { data: job } = await supabase
      .from("jobs")
      .select("assessment_config")
      .eq("id", jobId)
      .single();

    const config = job?.assessment_config || {};
    const modules = config.modules || {};
    const skillsTests = modules.skills_tests || { enabled: true, tests: [] };
    const tests = skillsTests.tests || [];

    // Update or add the test config
    // Fetch the test name to store it alongside the config
    const { data: testMeta } = await supabase
      .from("assessment_tests")
      .select("name")
      .eq("id", testId)
      .single();

    const testIndex = tests.findIndex((t) => t.test_id === testId);
    const testConfig = { test_id: testId, test_name: testMeta?.name || null, selected_question_ids: selectedIds };
    if (testIndex >= 0) {
      tests[testIndex] = testConfig;
    } else {
      tests.push(testConfig);
    }

    const newConfig = {
      ...config,
      modules: {
        ...modules,
        // enabled: true — sélectionner un test active forcément le module côté candidat.
        skills_tests: { ...skillsTests, enabled: true, tests },
      },
    };

    const { error: updateError } = await supabase
      .from("jobs")
      .update({ assessment_config: newConfig })
      .eq("id", jobId);

    if (updateError) throw updateError;
    return { success: true, selectedIds };
  } catch (err) {
    console.error("selectQuestionsForJob error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get questions for a specific session (using pre-selected IDs from job config).
 * Returns full question data WITHOUT the correct answer.
 */
export async function getQuestionsForSession(questionIds) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assessment_questions")
      .select("id, statement, option_a, option_b, option_c, option_d, time_limit_seconds, difficulty, image_url, question_type, options, skill_dimension, bars_dimensions")
      .in("id", questionIds);

    if (error) throw error;

    // Maintain the original order of questionIds
    const ordered = questionIds
      .map((id) => data.find((q) => q.id === id))
      .filter(Boolean);

    return { success: true, questions: ordered };
  } catch (err) {
    console.error("getQuestionsForSession error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Start or get an existing test session for a candidate
 */
export async function getOrCreateTestSession(candidateId, testId) {
  try {
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("candidate_test_sessions")
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("test_id", testId)
      .single();

    if (existing) return { success: true, session: existing };

    const { data: session, error } = await supabase
      .from("candidate_test_sessions")
      .insert({ candidate_id: candidateId, test_id: testId })
      .select()
      .single();

    if (error) throw error;
    return { success: true, session };
  } catch (err) {
    console.error("getOrCreateTestSession error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save an answer to a test session
 */
export async function saveTestAnswer(sessionId, answer) {
  // answer: { question_id, chosen, time_seconds }
  try {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("candidate_test_sessions")
      .select("answers, status")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session introuvable");
    if (session.status === "completed") return { success: true }; // idempotent

    const answers = session.answers || [];
    const existingIndex = answers.findIndex((a) => a.question_id === answer.question_id);
    if (existingIndex >= 0) {
      answers[existingIndex] = answer;
    } else {
      answers.push(answer);
    }

    const { error } = await supabase
      .from("candidate_test_sessions")
      .update({
        answers,
        status: "in_progress",
        started_at: session.started_at || new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveTestAnswer error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save an open-ended text answer to a test session
 */
export async function saveOpenAnswer(sessionId, questionId, textAnswer, timeSeconds = 0) {
  try {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("candidate_test_sessions")
      .select("answers, status")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session introuvable");
    if (session.status === "completed") return { success: true }; // idempotent

    const answers = session.answers || [];
    const answer = { question_id: questionId, text_answer: textAnswer, time_seconds: timeSeconds };
    const existingIndex = answers.findIndex((a) => a.question_id === questionId);
    if (existingIndex >= 0) {
      answers[existingIndex] = answer;
    } else {
      answers.push(answer);
    }

    const { error } = await supabase
      .from("candidate_test_sessions")
      .update({
        answers,
        status: "in_progress",
        started_at: session.started_at || new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveOpenAnswer error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get all test sessions for a candidate
 */
export async function getCandidateTestSessions(candidateId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("candidate_test_sessions")
      .select("*, assessment_tests(name, category, estimated_duration_minutes)")
      .eq("candidate_id", candidateId);

    if (error) throw error;
    return { success: true, sessions: data };
  } catch (err) {
    console.error("getCandidateTestSessions error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Submit the full assessment — compute composite score, update candidate
 */
export async function submitAssessment(candidateId) {
  try {
    const supabase = await createClient();

    const { data: candidate } = await supabase
      .from("candidates")
      .select("*, jobs(assessment_config, ai_interview_config, extracted_criteria, title)")
      .eq("id", candidateId)
      .single();

    if (!candidate) throw new Error("Candidat introuvable");

    const { cv: cvEnabled, tests: testsEnabled, interview: interviewEnabled, video: videoEnabled } =
      resolveEnabledModules(candidate.jobs);

    // Compute score_tests: average of all completed test sessions
    let scoreTests = null;
    if (testsEnabled) {
      const { data: sessions } = await supabase
        .from("candidate_test_sessions")
        .select("score")
        .eq("candidate_id", candidateId)
        .eq("status", "completed");

      if (sessions && sessions.length > 0) {
        const total = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
        scoreTests = Math.round(total / sessions.length);
      }
    }

    // Compute score_video: average of evaluated video responses
    let scoreVideo = null;
    let videoCompleteness = null;
    if (videoEnabled) {
      const { data: videoResps } = await supabase
        .from("video_interview_responses")
        .select("ai_score, status")
        .eq("candidate_id", candidateId);

      if (videoResps && videoResps.length > 0) {
        ({ scoreVideo, videoCompleteness } = aggregateVideoScore(videoResps));
      } else if (candidate.video_interview_score && candidate.video_interview_score > 0) {
        // Fallback: use previously stored value if API already ran
        scoreVideo = candidate.video_interview_score;
        videoCompleteness = candidate.video_score_completeness;
      }
    }

    // Score global — source unique : computeGlobalScore (formule proportionnelle)
    const scoreGlobal = computeGlobalScore({
      cvEnabled,        scoreCv: candidate.score_cv,
      testsEnabled,     scoreTests,
      interviewEnabled, scoreInterview: candidate.score_interview,
      videoEnabled,     scoreVideo, videoCompleteness,
    });

    const updates = {
      assessment_status: "submitted",
      status: "soumis",
      assessment_submitted_at: new Date().toISOString(),
      score_global: scoreGlobal,
    };
    if (scoreTests !== null)  updates.score_tests           = scoreTests;
    if (scoreVideo !== null)  updates.video_interview_score = scoreVideo;

    const { error } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidateId);

    if (error) throw error;

    // Rien n'est facturé ici. Ce parcours hérité (banque de tests + module
    // vidéo) ne structure plus le produit : seule la simulation Experience
    // débite, à la création du run puis à sa notation.
    return { success: true, scoreGlobal, scoreTests, scoreVideo };
  } catch (err) {
    console.error("submitAssessment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Soumettre une évaluation manuelle pour une réponse vidéo
 */
export async function submitManualVideoScore(candidateId, responseId, scoreOutOf5, justification) {
  try {
    const supabase = await createClient();
    
    // Convert 1-5 to 0-100%
    const scorePct = Math.round((scoreOutOf5 / 5) * 100);

    const { error } = await supabase
      .from("video_interview_responses")
      .update({
        ai_score: scorePct,
        ai_feedback: justification || "Évalué manuellement par le recruteur.",
        status: "evaluated",
        updated_at: new Date().toISOString()
      })
      .eq("id", responseId);

    if (error) throw error;

    // Recalculer le score global
    await submitAssessment(candidateId);

    return { success: true, score: scorePct };
  } catch (err) {
    console.error("submitManualVideoScore error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save the job's assessment configuration (modules enabled + test selections)
 */
export async function saveAssessmentConfig(jobId, config) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    // Ensure all tests have pre-selected questions
    const testsModule = config?.modules?.skills_tests;
    if (testsModule?.enabled && testsModule.tests?.length > 0) {
      for (const testConfig of testsModule.tests) {
        if (!testConfig.selected_question_ids || testConfig.selected_question_ids.length === 0) {
          // Fetch questions for this test
            const { data: questions } = await supabase
              .from("assessment_questions")
              .select("id, difficulty")
              .eq("test_id", testConfig.test_id);

          if (questions && questions.length > 0) {
            const MIXED_TESTS = [
              "d8b98579-abe2-4c2d-8890-9048b4fb2745", 
              "d79d52e7-ad1e-46bd-930a-3a8a862baca4",
              "bbe560bc-650d-4839-89cd-8d0d7ee0d445",
              "172f1772-1bfa-4889-968a-3f74821532d1"
            ];
            if (MIXED_TESTS.includes(testConfig.test_id)) {
              const facile = questions.filter(q => q.difficulty === "facile").sort(() => Math.random() - 0.5).slice(0, 3);
              const moyen = questions.filter(q => q.difficulty === "moyen").sort(() => Math.random() - 0.5).slice(0, 5);
              const difficile = questions.filter(q => q.difficulty === "difficile").sort(() => Math.random() - 0.5).slice(0, 2);
              testConfig.selected_question_ids = [...facile, ...moyen, ...difficile].map(q => q.id);
            } else {
              const shuffled = [...questions].sort(() => Math.random() - 0.5);
              testConfig.selected_question_ids = shuffled.slice(0, 10).map((q) => q.id);
            }
          }
        }
      }
    }

    // Configurer les modules ne facture rien : le forfait de création d'offre
    // (6 crédits, débité à l'extraction) couvre toute la configuration.
    const { error } = await supabase
      .from("jobs")
      .update({ assessment_config: config })
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveAssessmentConfig error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Disqualify a candidate (e.g. they failed qualifying questions)
 */
export async function disqualifyCandidate(candidateId) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("candidates")
      .update({
        assessment_status: "disqualified",
        status: "rejected",
        assessment_submitted_at: new Date().toISOString()
      })
      .eq("id", candidateId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("disqualifyCandidate error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mark qualifying questions as passed
 */
export async function passQualifyingQuestions(candidateId) {
  try {
    const supabase = await createClient();
    // We just set status to in_progress to mark that they've started the assessment successfully
    const { error } = await supabase
      .from("candidates")
      .update({ assessment_status: "in_progress" })
      .eq("id", candidateId)
      // Only update if it's pending so we don't accidentally override other statuses
      .eq("assessment_status", "pending");

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("passQualifyingQuestions error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get the video interview question library
 */
export async function getVideoQuestionLibrary() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("video_interview_questions")
      .select("id, category, text, hint")
      .eq("is_library", true)
      .order("category")
      .order("text");
    if (error) throw error;
    return { success: true, questions: data };
  } catch (err) {
    console.error("getVideoQuestionLibrary error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save video interview config on a job (inside assessment_config)
 */
export async function saveVideoInterviewConfig(jobId, videoConfig) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    const { data: job } = await supabase
      .from("jobs")
      .select("assessment_config")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    const existingConfig = job?.assessment_config || { modules: {} };
    const newConfig = {
      ...existingConfig,
      modules: {
        ...(existingConfig.modules || {}),
        video_interview: {
          enabled: true,
          ...videoConfig,
        },
      },
    };

    // Configurer les modules ne facture rien : le forfait de création d'offre
    // (6 crédits, débité à l'extraction) couvre toute la configuration.
    const { error } = await supabase
      .from("jobs")
      .update({ assessment_config: newConfig })
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveVideoInterviewConfig error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Get video interview responses for a candidate
 */
export async function getVideoInterviewResponses(candidateId) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("video_interview_responses")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("question_index");
    if (error) throw error;
    return { success: true, responses: data || [] };
  } catch (err) {
    console.error("getVideoInterviewResponses error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Create a video interview response record (before upload)
 */
export async function createVideoInterviewResponse(candidateId, jobId, questionIndex, questionText, evaluationCriteria) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("video_interview_responses")
      .insert({
        candidate_id: candidateId,
        job_id: jobId,
        question_index: questionIndex,
        question_text: questionText,
        evaluation_criteria: evaluationCriteria,
        status: "pending",
      })
      .select()
      .single();
    if (error) throw error;
    return { success: true, response: data };
  } catch (err) {
    console.error("createVideoInterviewResponse error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Update video response after upload
 */
export async function updateVideoResponseAfterUpload(responseId, videoStoragePath, videoUrl, durationSeconds) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("video_interview_responses")
      .update({
        video_storage_path: videoStoragePath,
        video_url: videoUrl,
        duration_seconds: durationSeconds,
        status: "recorded",
      })
      .eq("id", responseId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateVideoResponseAfterUpload error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Mark video interview as completed on the candidate
 */
export async function markVideoInterviewCompleted(candidateId, averageScore) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("candidates")
      .update({
        video_interview_score: averageScore,
        // NE PAS écrire `status: "interview_completed"` ici : ce statut est lu comme
        // « l'entretien TEXTE est terminé » (AssessmentHub, InterviewModule). L'écrire
        // depuis le chemin vidéo marquait à tort l'entretien texte comme fait et en
        // privait le candidat. L'état vidéo a son propre champ dédié ci-dessous.
        video_interview_status: "completed",
      })
      .eq("id", candidateId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("markVideoInterviewCompleted error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save candidate feedback for the experience
 */
export async function saveCandidateFeedback(candidateId, rating, comment) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("candidates")
      .update({
        experience_rating: rating,
        experience_comment: comment || null,
      })
      .eq("id", candidateId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveCandidateFeedback error:", err);
    return { success: false, error: err.message };
  }
}
