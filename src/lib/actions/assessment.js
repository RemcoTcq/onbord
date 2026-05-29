"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";

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
export async function selectQuestionsForJob(jobId, testId, questionCount = 5) {
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

    // Logic for specific tests (e.g., Suites Logiques, Raisonnement numérique, Déduction logique with 3/5/2 distribution)
    const MIXED_TESTS = [
      "d8b98579-abe2-4c2d-8890-9048b4fb2745", // Suites Logiques
      "d79d52e7-ad1e-46bd-930a-3a8a862baca4", // Raisonnement numérique
      "bbe560bc-650d-4839-89cd-8d0d7ee0d445", // Déduction logique
      "172f1772-1bfa-4889-968a-3f74821532d1"  // Attention & rapidité mentale
    ];
    let selectedIds = [];
    
    if (MIXED_TESTS.includes(testId)) {
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
      .select("id, statement, option_a, option_b, option_c, option_d, time_limit_seconds, difficulty, image_url")
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
    return { success: true, score, cheatFlags };
  } catch (err) {
    console.error("completeTestSession error:", err);
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

    const cvEnabled = modules.cv_scoring?.enabled ?? true;
    const testsEnabled = modules.skills_tests?.enabled ?? false;
    const interviewEnabled = modules.ai_interview?.enabled
      ?? candidate.jobs?.ai_interview_config?.enabled
      ?? false;

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

    // Proportional weighting
    const baseWeights = { cv: 10, tests: 50, interview: 40 };
    const activeWeights = {};
    if (cvEnabled && candidate.score_cv != null) activeWeights.cv = baseWeights.cv;
    if (testsEnabled && scoreTests != null) activeWeights.tests = baseWeights.tests;
    if (interviewEnabled && candidate.score_interview != null) activeWeights.interview = baseWeights.interview;

    const totalBase = Object.values(activeWeights).reduce((s, w) => s + w, 0);

    let scoreGlobal = null;
    if (totalBase > 0) {
      let weighted = 0;
      if (activeWeights.cv) weighted += (candidate.score_cv * activeWeights.cv) / totalBase;
      if (activeWeights.tests) weighted += (scoreTests * activeWeights.tests) / totalBase;
      if (activeWeights.interview) weighted += (candidate.score_interview * activeWeights.interview) / totalBase;
      scoreGlobal = Math.round(weighted);
    }

    const updates = {
      assessment_status: "submitted",
      assessment_submitted_at: new Date().toISOString(),
      score_global: scoreGlobal,
    };
    if (scoreTests !== null) updates.score_tests = scoreTests;

    const { error } = await supabase
      .from("candidates")
      .update(updates)
      .eq("id", candidateId);

    if (error) throw error;

    // Generate CV feedback if CV was submitted
    if (candidate.cv_raw_text && !candidate.cv_feedback) {
      generateCvFeedback(candidateId, candidate).catch(console.error);
    }

    return { success: true, scoreGlobal, scoreTests };
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
              testConfig.selected_question_ids = shuffled.slice(0, 5).map((q) => q.id);
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
