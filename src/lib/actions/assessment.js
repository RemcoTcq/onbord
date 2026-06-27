"use server";

import { createClient } from "@/lib/supabase/server";
import anthropic from "../anthropic";
import { deductCredits } from "../utils/limits";

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

    if (!session) throw new Error("Session introuvable");
    if (session.status === "completed") return { success: true, score: session.score };

    // Get questions with scoring data (server-side only)
    const { data: questions } = await supabase
      .from("assessment_questions")
      .select("id, question_type, correct_answer, options, skill_dimension, bars_dimensions")
      .in("id", questionIds);

    const answers = session.answers || [];
    const qMap = {};
    (questions || []).forEach((q) => { qMap[q.id] = q; });

    // ── Score each question by type ──────────────────────────────────────────
    const gradedAnswers = [];
    const dimensionScores = {}; // skill_dimension → [ratio, ratio, ...]

    for (const qId of questionIds) {
      const q = qMap[qId];
      if (!q) continue;

      const answer = answers.find((a) => a.question_id === qId);
      const dim = q.skill_dimension || "general";
      if (!dimensionScores[dim]) dimensionScores[dim] = [];

      let ratio = 0;
      let gradedAnswer = { question_id: qId, chosen: answer?.chosen ?? null, time_seconds: answer?.time_seconds ?? 0 };

      if (q.question_type === "tjs_weighted") {
        // Custom weighted: chosen.points / max_points
        const opts = q.options || [];
        const maxPoints = Math.max(...opts.map((o) => o.points ?? 0), 1);
        const chosen = opts.find((o) => o.key === answer?.chosen);
        ratio = chosen ? (chosen.points ?? 0) / maxPoints : 0;
        gradedAnswer.ratio = ratio;

      } else if (q.question_type === "qcm_single") {
        // Classical: 1 if correct, 0 otherwise
        ratio = q.correct_answer && answer?.chosen === q.correct_answer ? 1 : 0;
        gradedAnswer.correct = ratio === 1;
        gradedAnswer.correct_answer = q.correct_answer;

      } else if (q.question_type === "qcm_multiple") {
        // Classical MC: (correct selected / total correct) - (wrong selected × 0.5), floor 0
        const opts = q.options || [];
        const correctKeys = opts.filter((o) => o.correct).map((o) => o.key);
        const chosen = Array.isArray(answer?.chosen) ? answer.chosen : [];
        const correctSelected = chosen.filter((k) => correctKeys.includes(k)).length;
        const wrongSelected = chosen.filter((k) => !correctKeys.includes(k)).length;
        ratio = correctKeys.length > 0
          ? Math.max(0, correctSelected / correctKeys.length - wrongSelected * 0.5)
          : 0;
        gradedAnswer.correct_keys = correctKeys;
        gradedAnswer.ratio = ratio;

      } else if (q.question_type === "open_bars") {
        // BARS: delegated to AI — skip here, handled in completeOpenTestSession
        // Still record the answer in gradedAnswers
        gradedAnswer.text_answer = answer?.text_answer ?? "";
        // ratio stays 0 until AI scores it
      }

      dimensionScores[dim].push(ratio);
      gradedAnswers.push(gradedAnswer);
    }

    // ── Aggregate: average per dimension, then average across dimensions ─────
    const dims = Object.values(dimensionScores);
    const globalRatio = dims.length > 0
      ? dims.reduce((sum, ratios) => {
          const dimAvg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
          return sum + dimAvg;
        }, 0) / dims.length
      : 0;
    const score = Math.round(globalRatio * 100);

    // ── Cheat detection ──────────────────────────────────────────────────────
    const times = answers.map((a) => a.time_seconds || 0).filter((t) => t > 0);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    const suspectedCheat = avgTime > 0 && avgTime < 4;
    const cheatFlags = { avg_response_time: Math.round(avgTime), suspected_cheat: suspectedCheat };

    // ── Check for BARS questions that need AI evaluation ────────────────────
    const hasBars = (questions || []).some((q) => q.question_type === "open_bars");

    if (hasBars) {
      // Delegate to BARS scorer then return its score
      return await completeMixedTestSession(session, questions, gradedAnswers, cheatFlags, supabase);
    }

    // ── Pure classical/TJS test: save and return ─────────────────────────────
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

    // Deduct credits
    if (session?.candidate_id) {
      const { data: candidateJob } = await supabase
        .from("candidates")
        .select("jobs(user_id)")
        .eq("id", session.candidate_id)
        .single();
      const recruiterId = candidateJob?.jobs?.user_id;
      if (recruiterId) await deductCredits(recruiterId, session.candidate_id, "skill_test");
    }

    return { success: true, score, cheatFlags };
  } catch (err) {
    console.error("completeTestSession error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Internal helper: score a mixed test that includes open_bars questions.
 * AI scores each BARS question; combined with pre-computed classical/TJS scores.
 */
async function completeMixedTestSession(session, questions, gradedAnswers, cheatFlags, supabase) {
  try {
    const barsQuestions = questions.filter((q) => q.question_type === "open_bars");
    const answers = session.answers || [];

    // Build AI batch prompt for BARS questions
    const barsItems = barsQuestions.map((q) => {
      const answer = answers.find((a) => a.question_id === q.id);
      return {
        question_id: q.id,
        question: q.statement || "",
        answer: answer?.text_answer || "(Sans réponse)",
        bars_dimensions: q.bars_dimensions || [],
      };
    });

    const systemPrompt = `Tu es un évaluateur expert en recrutement commercial B2B. Tu reçois une réponse rédigée par un candidat à une question ouverte, accompagnée d'une grille BARS (Behaviorally Anchored Rating Scales).

Pour chaque question, évalue la réponse en utilisant EXACTEMENT les dimensions fournies dans bars_dimensions. Pour chaque dimension, attribue le score (parmi les niveaux disponibles : 0, 1 ou 2) dont la description correspond le mieux à la réponse.

Sois juste et équitable : valorise les réponses qui montrent une compréhension pratique, même imparfaite. Pénalise uniquement les réponses hors sujet, vides ou du verbiage creux.

Réponds UNIQUEMENT avec un JSON valide, format exact :
{"evaluations": [{"question_id": "...", "dimension_scores": [{"name": "Nom dimension", "score": 0|1|2, "justification": "1 phrase"}], "total_ratio": 0.0 à 1.0}]}`;

    const userPrompt = `Évalue ${barsItems.length} réponse(s) ouverte(s) :\n\n${JSON.stringify(barsItems, null, 2)}`;

    let barsRatios = {}; // question_id → ratio [0,1]
    let aiFeedback = [];

    try {
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        temperature: 0,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const jsonMatch = response.content[0].text.match(/{[\s\S]*}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        for (const ev of (parsed.evaluations || [])) {
          // Compute ratio from dimension_scores if total_ratio not provided
          let ratio = ev.total_ratio ?? null;
          if (ratio === null && ev.dimension_scores) {
            const dims = ev.dimension_scores;
            const maxScore = dims.length * 2;
            const sumScore = dims.reduce((s, d) => s + (d.score ?? 0), 0);
            ratio = maxScore > 0 ? sumScore / maxScore : 0;
          }
          barsRatios[ev.question_id] = Math.max(0, Math.min(1, ratio ?? 0));
          aiFeedback.push({ question_id: ev.question_id, dimension_scores: ev.dimension_scores, ratio });
        }
      }
    } catch (aiErr) {
      console.error("BARS AI evaluation error:", aiErr);
      // Fallback: score 0 for all BARS questions
    }

    // Update gradedAnswers with BARS ratios
    const finalAnswers = gradedAnswers.map((ga) => {
      if (barsRatios[ga.question_id] !== undefined) {
        return { ...ga, ratio: barsRatios[ga.question_id] };
      }
      return ga;
    });

    // Recompute global score with BARS ratios
    const dimensionScores = {};
    for (const q of questions) {
      const dim = q.skill_dimension || "general";
      if (!dimensionScores[dim]) dimensionScores[dim] = [];
      const ga = finalAnswers.find((a) => a.question_id === q.id);
      const ratio = ga?.ratio ?? 0;
      dimensionScores[dim].push(ratio);
    }
    const dims = Object.values(dimensionScores);
    const globalRatio = dims.length > 0
      ? dims.reduce((sum, ratios) => {
          const dimAvg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
          return sum + dimAvg;
        }, 0) / dims.length
      : 0;
    const score = Math.round(globalRatio * 100);

    const { error } = await supabase
      .from("candidate_test_sessions")
      .update({
        status: "completed",
        score,
        answers: finalAnswers,
        cheat_flags: cheatFlags,
        ai_feedback: aiFeedback,
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    if (error) throw error;

    // Deduct credits
    if (session?.candidate_id) {
      const { data: candidateJob } = await supabase
        .from("candidates")
        .select("jobs(user_id)")
        .eq("id", session.candidate_id)
        .single();
      const recruiterId = candidateJob?.jobs?.user_id;
      if (recruiterId) await deductCredits(recruiterId, session.candidate_id, "skill_test");
    }

    return { success: true, score, cheatFlags };
  } catch (err) {
    console.error("completeMixedTestSession error:", err);
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
 * Generate video interview questions with Claude based on job context.
 * Produces BARS-based criteria for each question.
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
    const skillsList = allSkills.map(s => `- ${s.name}`).join("\n");
    const title = job.title || "Poste inconnu";
    const description = job.description?.slice(0, 1000) || "Aucune description fournie";

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 3000,
      temperature: 0.3,
      system: `Tu es un expert RH sp\u00e9cialis\u00e9 en \u00e9valuation par grilles BARS (Behaviorally Anchored Rating Scales). Tu g\u00e9n\u00e8res des questions d'entretien vid\u00e9o one-way avec des grilles d'\u00e9valuation structur\u00e9es. R\u00e9ponds UNIQUEMENT avec un JSON valide.`,
      messages: [
        {
          role: "user",
          content: `Poste: ${title}
Description: ${description}

COMP\u00c9TENCES CL\u00c9S DU POSTE :
${skillsList || "Aucune comp\u00e9tence sp\u00e9cifique fournie, basez-vous sur la description du poste."}

R\u00c8GLES :
1. G\u00e9n\u00e8re 4 questions d'entretien vid\u00e9o adapt\u00e9es \u00e0 ce poste.
2. Chaque question doit cibler au moins une comp\u00e9tence cl\u00e9.
3. Formule les questions pour qu'elles soient lues telles quelles au candidat (vouvoiement).
4. Pour chaque question, g\u00e9n\u00e8re 2 \u00e0 3 crit\u00e8res d'\u00e9valuation BARS (maximum 5).
5. Chaque crit\u00e8re BARS a un nom court (2-4 mots) ET une grille \u00e0 3 niveaux :
   - Niveau 1 (Insuffisant) : description du comportement d'un candidat faible
   - Niveau 3 (Attendu) : description du comportement attendu pour le poste
   - Niveau 5 (Excellent) : description d'un comportement exceptionnel
   Les descriptions doivent \u00eatre concr\u00e8tes et observables (comportements, pas traits abstraits).

R\u00e9ponds avec:
{
  "questions": [
    {
      "text": "La question compl\u00e8te",
      "category": "Motivation|Experience|Soft Skills|Technique",
      "hint": "Conseil pour le candidat (1 phrase)",
      "criteria": [
        {
          "name": "Nom du crit\u00e8re (2-4 mots)",
          "bars_levels": [
            { "level": 1, "label": "Insuffisant", "description": "Comportement de niveau 1..." },
            { "level": 3, "label": "Attendu", "description": "Comportement de niveau 3..." },
            { "level": 5, "label": "Excellent", "description": "Comportement de niveau 5..." }
          ]
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
