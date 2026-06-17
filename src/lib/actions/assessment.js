"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";
import { deductCredits } from "../utils/limits";
import { TAXONOMIE_COMPETENCES } from "../constants/taxonomie";

/**
 * Get all active tests from the library
 */
export async function getTestsLibrary() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("assessment_tests")
      .select("id, name, description, category, difficulty, estimated_duration_minutes, status")
      .order("category")
      .order("name");

    if (error) throw error;
    return { success: true, tests: data };
  } catch (err) {
    console.error("getTestsLibrary error:", err);
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
      .select("id, difficulty")
      .eq("test_id", testId);

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
      // Default logic: random pick
      const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(questionCount, allQuestions.length));
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
    const testIndex = tests.findIndex((t) => t.test_id === testId);
    const testConfig = { test_id: testId, selected_question_ids: selectedIds };
    if (testIndex >= 0) {
      tests[testIndex] = testConfig;
    } else {
      tests.push(testConfig);
    }

    const newConfig = {
      ...config,
      modules: {
        ...modules,
        skills_tests: { ...skillsTests, tests },
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
      .select("id, statement, option_a, option_b, option_c, option_d, time_limit_seconds, difficulty, image_url, question_type")
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
 * Complete a test session — grades it, detects cheat flags
 */
export async function completeTestSession(sessionId, questionIds) {
  try {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("candidate_test_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    // Get correct answers
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, correct_answer")
      .in("id", questionIds);

    const answers = session.answers || [];
    const correctMap = {};
    (questions || []).forEach((q) => { correctMap[q.id] = q.correct_answer; });

    // Grade
    let correct = 0;
    const gradedAnswers = answers.map((a) => {
      const isCorrect = correctMap[a.question_id] === a.chosen;
      if (isCorrect) correct++;
      return { ...a, correct: isCorrect, correct_answer: correctMap[a.question_id] };
    });

    const score = questionIds.length > 0
      ? Math.round((correct / questionIds.length) * 100)
      : 0;

    // Cheat detection: avg response time
    const times = answers.map((a) => a.time_seconds || 0).filter((t) => t > 0);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const suspectedCheat = avgTime > 0 && avgTime < 4; // less than 4s average = suspicious

    // Duration check for specific tests
    let isSlow = false;
    const totalSeconds = times.reduce((a, b) => a + b, 0);
    
    if (session.test_id === "d8b98579-abe2-4c2d-8890-9048b4fb2745") {
      if (totalSeconds > 480) isSlow = true; // > 8 minutes for Logic Suites
    } else if (session.test_id === "d79d52e7-ad1e-46bd-930a-3a8a862baca4") {
      if (totalSeconds > 600) isSlow = true; // > 10 minutes for Num Reasoning
    } else if (session.test_id === "bbe560bc-650d-4839-89cd-8d0d7ee0d445") {
      if (totalSeconds > 480) isSlow = true; // > 8 minutes for Logical Deduction
    } else if (session.test_id === "172f1772-1bfa-4889-968a-3f74821532d1") {
      if (totalSeconds > 180) isSlow = true; // > 3 minutes for Attention & Speed
    }

    // Performance bonus for Attention & Speed: Fast & Accurate
    let isFastAndAccurate = false;
    if (session.test_id === "172f1772-1bfa-4889-968a-3f74821532d1") {
      if (score === 100 && totalSeconds < 90) isFastAndAccurate = true;
    }

    const cheatFlags = { 
      avg_response_time: Math.round(avgTime), 
      suspected_cheat: suspectedCheat,
      slow_candidate: isSlow,
      top_performer: isFastAndAccurate
    };

    const { error } = await supabase
      .from("candidate_test_sessions")
      .update({
        status: "completed",
        score,
        answers: gradedAnswers,
        cheat_flags: cheatFlags,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;

    // ★ Déduire 2 crédits tests (idempotent via flag credits_charged_tests)
    if (session?.candidate_id) {
      const { data: candidateJob } = await supabase
        .from("candidates")
        .select("jobs(user_id)")
        .eq("id", session.candidate_id)
        .single();
      const recruiterId = candidateJob?.jobs?.user_id;
      if (recruiterId) {
        await deductCredits(recruiterId, session.candidate_id, "skill_test");
      }
    }

    return { success: true, score, cheatFlags };
  } catch (err) {
    console.error("completeTestSession error:", err);
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
 * Complete an open-ended test session — batch AI evaluation via Claude
 * Scores all answers in ONE API call to minimize AI credit usage.
 * AI feedback is stored for recruiter only (not exposed to candidate).
 */
export async function completeOpenTestSession(sessionId, questionIds) {
  try {
    const supabase = await createClient();

    const { data: session } = await supabase
      .from("candidate_test_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session introuvable");
    if (session.status === "completed") return { success: true, score: session.score };

    // Get questions with scoring criteria (server-side only — never sent to candidate)
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, statement, scoring_criteria")
      .in("id", questionIds);

    const answers = session.answers || [];
    const criteriaMap = {};
    (questions || []).forEach((q) => { criteriaMap[q.id] = q; });

    // Build batch evaluation prompt
    const answersForPrompt = questionIds.map((qId) => {
      const q = criteriaMap[qId];
      const a = answers.find((ans) => ans.question_id === qId);
      return {
        question_id: qId,
        question: q?.statement || "",
        answer: a?.text_answer || "(Sans réponse)",
        criteria: q?.scoring_criteria || {},
      };
    });

    const systemPrompt = `Tu es un évaluateur expert, juste et équitable en maîtrise de l'IA en contexte professionnel. Ton rôle est de déceler si le candidat a une véritable expérience pratique ou une bonne compréhension, tout en restant objectif.
Tu reçois une liste de questions ouvertes avec les réponses d'un candidat et des critères d'évaluation détaillés.
Valorise les réponses qui montrent une compréhension claire, du bon sens ou des exemples pertinents. Pénalise les réponses totalement hors-sujet ou qui ne sont que du verbiage vide ("bullshit"), sans être excessivement sévère sur la forme.

Pour chaque question, attribue un score selon ces règles :
- 2 = Bonne à excellente réponse (démontre une compréhension claire et pratique, correspond aux critères "excellent")
- 1 = Réponse moyenne ou partielle (connaissances de base correctes mais un peu vagues, correspond aux critères "moyen")
- 0 = Mauvaise réponse, totalement hors sujet, fausse ou pas de réponse (correspond aux critères "mauvais")

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ou après, dans ce format exact :
{"evaluations": [{"question_id": "...", "score": 0|1|2, "justification": "1-2 phrases max en français, objectives et constructives"}]}`;

    const userPrompt = `Évalue ces ${answersForPrompt.length} réponses :\n\n${JSON.stringify(answersForPrompt, null, 2)}`;

    let evaluations = [];
    let score = 0;

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const rawText = response.content[0].text.trim();
      const parsed = JSON.parse(rawText);
      evaluations = parsed.evaluations || [];

      // Compute score: (sum of scores / max possible) * 100
      const totalScore = evaluations.reduce((sum, e) => sum + (e.score || 0), 0);
      const maxScore = questionIds.length * 2;
      score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    } catch (aiErr) {
      console.error("AI evaluation error:", aiErr);
      // Fallback: score 0, no feedback — don't block the candidate
      score = 0;
    }

    const { error } = await supabase
      .from("candidate_test_sessions")
      .update({
        status: "completed",
        score,
        ai_feedback: evaluations.length > 0 ? { evaluations, evaluated_at: new Date().toISOString() } : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw error;

    // ★ Déduire 2 crédits tests (idempotent — même flag que completeTestSession)
    if (session?.candidate_id) {
      const { data: candidateJob } = await supabase
        .from("candidates")
        .select("jobs(user_id)")
        .eq("id", session.candidate_id)
        .single();
      const recruiterId = candidateJob?.jobs?.user_id;
      if (recruiterId) {
        await deductCredits(recruiterId, session.candidate_id, "skill_test");
      }
    }

    return { success: true, score };
  } catch (err) {
    console.error("completeOpenTestSession error:", err);
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

    const assessmentConfig = candidate.jobs?.assessment_config || {};
    const modules = assessmentConfig.modules || {};

    const cvEnabled       = modules.cv_scoring?.enabled ?? true;
    const testsEnabled    = modules.skills_tests?.enabled ?? false;
    const interviewEnabled = modules.ai_interview?.enabled
      ?? candidate.jobs?.ai_interview_config?.enabled
      ?? false;
    const videoEnabled    = modules.video_interview?.enabled ?? false;

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
        const evaluated = videoResps.filter(r => r.status === "evaluated" && r.ai_score != null);
        const total = videoResps.length;
        
        videoCompleteness = {
          evaluated: evaluated.length,
          total,
          is_complete: evaluated.length === total,
        };

        if (evaluated.length > 0) {
          const totalScore = evaluated.reduce((sum, r) => sum + (r.ai_score || 0), 0);
          scoreVideo = Math.round(totalScore / evaluated.length);
        }
      } else if (candidate.video_interview_score && candidate.video_interview_score > 0) {
        // Fallback: use previously stored value if API already ran
        scoreVideo = candidate.video_interview_score;
        videoCompleteness = candidate.video_score_completeness;
      }
    }

    // Score global : vidéo comptabilisée SEULEMENT si complète
    const videoForGlobal = (videoCompleteness?.is_complete && scoreVideo != null)
      ? scoreVideo
      : null;

    // Proportional weighting — only active & scored modules count
    const baseWeights = { cv: 10, tests: 50, interview: 40, video: 40 };
    const activeWeights = {};
    if (cvEnabled       && candidate.score_cv    != null) activeWeights.cv        = baseWeights.cv;
    if (testsEnabled    && scoreTests            != null) activeWeights.tests     = baseWeights.tests;
    if (interviewEnabled && candidate.score_interview != null) activeWeights.interview = baseWeights.interview;
    if (videoEnabled    && videoForGlobal        != null) activeWeights.video     = baseWeights.video;

    const totalBase = Object.values(activeWeights).reduce((s, w) => s + w, 0);

    let scoreGlobal = null;
    if (totalBase > 0) {
      let weighted = 0;
      if (activeWeights.cv)        weighted += (candidate.score_cv        * activeWeights.cv)        / totalBase;
      if (activeWeights.tests)     weighted += (scoreTests                * activeWeights.tests)     / totalBase;
      if (activeWeights.interview) weighted += (candidate.score_interview * activeWeights.interview) / totalBase;
      if (activeWeights.video)     weighted += (videoForGlobal            * activeWeights.video)     / totalBase;
      scoreGlobal = Math.round(weighted);
    }

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

    // Generate CV feedback if CV was submitted
    if (candidate.cv_raw_text && !candidate.cv_feedback) {
      generateCvFeedback(candidateId, candidate).catch(console.error);
    }

    // ★ Déduire crédits interview texte
    if (interviewEnabled && candidate.score_interview != null) {
      const { data: job } = await supabase
        .from("jobs")
        .select("user_id")
        .eq("id", candidate.job_id)
        .single();
      if (job?.user_id) {
        await deductCredits(job.user_id, candidateId, "text_interview");
      }
    }

    return { success: true, scoreGlobal, scoreTests, scoreVideo };
  } catch (err) {
    console.error("submitAssessment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Generate a brief candidate-facing CV feedback (async, non-blocking)
 */
async function generateCvFeedback(candidateId, candidate) {
  try {
    const supabase = await createClient();
    const jobCriteria = candidate.jobs?.extracted_criteria || {};

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 300,
      temperature: 0.3,
      system: `Tu es un recruteur bienveillant. Rédige un court feedback (2-3 phrases max) pour un candidat après l'analyse de son CV pour le poste de ${jobCriteria.title || candidate.jobs?.title || "ce poste"}. Sois encourageant et constructif. Ne mentionne pas de score. Écris directement le feedback sans phrase d'introduction.`,
      messages: [{ role: "user", content: `CV analysé :\n${candidate.cv_raw_text?.substring(0, 500)}` }],
    });

    const feedback = response.content[0].text.trim();
    await supabase.from("candidates").update({ cv_feedback: feedback }).eq("id", candidateId);
  } catch (err) {
    console.error("generateCvFeedback error:", err);
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
 * Generate video interview questions with Claude based on job context
 */
export async function generateVideoQuestions(jobId) {
  try {
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("jobs")
      .select("title, description, extracted_criteria")
      .eq("id", jobId)
      .single();

    if (!job) return { success: false, error: "Job not found" };

    const criteria = job.extracted_criteria || {};
    const allSkills = [...(criteria.hard_skills || []), ...(criteria.soft_skills || [])];
    
    // Filtrer pour ne garder que les compétences non testables (celles qui vont en interview)
    const interviewSkills = [];
    allSkills.forEach(skill => {
      const taxonomyEntry = TAXONOMIE_COMPETENCES.find(c => c.ID === skill.taxonomy_id) || TAXONOMIE_COMPETENCES.find(c => c.Compétence?.toLowerCase() === skill.name?.toLowerCase());
      if (!taxonomyEntry || taxonomyEntry["Testable objectivement"] !== "Oui") {
        interviewSkills.push({
          name: skill.name,
          definition: taxonomyEntry?.Définition || "Aucune définition disponible"
        });
      }
    });

    const skillsList = interviewSkills.map(s => `- ${s.name} : ${s.definition}`).join("\n");
    const title = job.title || "Poste inconnu";
    const description = job.description?.slice(0, 1000) || "Aucune description fournie";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2000,
      temperature: 0.3,
      system: `Tu es un expert RH. Tu génères des questions d'entretien vidéo one-way pertinentes pour un poste spécifique. Réponds UNIQUEMENT avec un JSON valide.`,
      messages: [
        {
          role: "user",
          content: `Poste: ${title}
Description: ${description}

COMPÉTENCES À ÉVALUER EN ENTRETIEN (non testables objectivement, donc non couvertes par les tests techniques) :
${skillsList || "Aucune compétence spécifique fournie, basez-vous sur la description du poste."}

RÈGLES :
1. Génère 4 questions d'entretien vidéo adaptées à ce poste.
2. Chaque question doit cibler au moins une des compétences listées ci-dessus.
3. Formule les questions pour qu'elles soient lues telles quelles au candidat (vouvoiement).
4. Pour chaque question, génère 2 à 3 critères d'évaluation nommés (maximum 5). Chaque critère a un nom court (2-4 mots) et une description précise (1-2 phrases).

Réponds avec:
{
  "questions": [
    {
      "text": "La question complète",
      "category": "Motivation|Experience|Soft Skills|Technique",
      "hint": "Conseil pour le candidat (1 phrase)",
      "criteria": [
        {
          "name": "Nom du critère (2-4 mots)",
          "description": "Ce que l'IA doit évaluer précisément (1-2 phrases)"
        }
      ]
    }
  ]
}`,
        },
      ],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, error: "AI did not return valid JSON" };
    const parsed = JSON.parse(jsonMatch[0]);
    return { success: true, questions: parsed.questions || [] };
  } catch (err) {
    console.error("generateVideoQuestions error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Save video interview config on a job (inside assessment_config)
 */
export async function saveVideoInterviewConfig(jobId, videoConfig) {
  try {
    const supabase = await createClient();
    const { data: job } = await supabase
      .from("jobs")
      .select("assessment_config")
      .eq("id", jobId)
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

    const { error } = await supabase
      .from("jobs")
      .update({ assessment_config: newConfig })
      .eq("id", jobId);

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
        video_interview_status: "completed",
        status: "interview_completed",
      })
      .eq("id", candidateId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("markVideoInterviewCompleted error:", err);
    return { success: false, error: err.message };
  }
}
