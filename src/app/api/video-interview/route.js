import anthropic from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

// ─── Rétrocompatibilité : normalise les critères (string → array) ─────────────
function normalizeCriteria(question) {
  if (question.criteria && question.criteria.length > 0) return question.criteria;
  if (question.evaluation_criteria) {
    return [{
      id: "legacy_0",
      name: "Évaluation globale",
      description: question.evaluation_criteria,
      weight: 1,
      source: "manual",
    }];
  }
  return [{ id: "fallback_0", name: "Pertinence générale", description: "Pertinence, clarté, structure, exemples concrets", weight: 1, source: "manual" }];
}

// ─── AssemblyAI transcription helper ──────────────────────────────────────────
async function transcribeAudio(audioUrl) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY not configured");

  // Submit transcription job
  const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language_detection: true,
      punctuate: true,
      format_text: true,
    }),
  });

  const { id } = await submitRes.json();

  // Poll until complete (max 60 seconds)
  const pollUrl = `https://api.assemblyai.com/v2/transcript/${id}`;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(pollUrl, {
      headers: { authorization: apiKey },
    });
    const data = await pollRes.json();
    if (data.status === "completed") return data.text || "";
    if (data.status === "error") throw new Error("Transcription error: " + data.error);
  }
  throw new Error("Transcription timeout");
}

// ─── Vérification des verbatims ───────────────────────────────────────────────
/**
 * Vérifie que chaque verbatim est une sous-chaîne exacte de la transcription.
 * Normalise la comparaison (casse, espaces multiples, ponctuation).
 * Marque chaque verbatim comme vérifié ou non.
 */
function verifyVerbatims(criteriaScores, transcript) {
  const normalize = (s) => (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?"""«»'']/g, "")
    .trim();

  const normalizedTranscript = normalize(transcript);

  return criteriaScores.map(cs => {
    if (!cs.verbatim || cs.verbatim.trim() === "" || cs.verbatim === "Aucun élément dans la réponse") {
      return { ...cs, verbatim_verified: false };
    }

    const normalizedVerbatim = normalize(cs.verbatim);
    const isFound = normalizedVerbatim.length >= 5 && normalizedTranscript.includes(normalizedVerbatim);

    return { ...cs, verbatim_verified: isFound };
  });
}

// ─── Claude evaluation helper (BARS-based scoring) ────────────────────────────
async function evaluateResponse(questionText, criteria, transcript, jobContext) {
  // Guard : pas de scoring si transcription absente/vide/trop courte
  if (!transcript || transcript.trim().length < 20 || transcript === "[Transcription indisponible]") {
    return {
      status: "manual_review",
      score: null,
      feedback: "Transcription absente ou trop courte pour être évaluée. Revue manuelle requise.",
      criteria_scores: [],
      strengths: [],
      improvements: [],
    };
  }

  // Check if any criterion has BARS levels — determines the scoring mode
  const hasBars = criteria.some(c => c.bars_levels && c.bars_levels.length > 0);

  let criteriaList;
  let scoringInstructions;

  if (hasBars) {
    // ── BARS mode : structured behavioral anchors ──
    criteriaList = criteria.map((c, i) => {
      const barsGrid = (c.bars_levels || []).map(bl =>
        `    Niveau ${bl.level} (${bl.label}) : ${bl.description}`
      ).join("\n");
      return `${i + 1}. "${c.name}" (ID: ${c.id})\n   Grille BARS :\n${barsGrid}`;
    }).join("\n\n");

    scoringInstructions = `Pour chaque critère, positionnez le candidat sur un niveau de 1 à 5 en comparant son comportement observé aux ancres comportementales fournies :
- Niveau 1 = Insuffisant (correspond à l'ancre de niveau 1)
- Niveau 2 = Entre insuffisant et attendu
- Niveau 3 = Attendu (correspond à l'ancre de niveau 3)
- Niveau 4 = Entre attendu et excellent
- Niveau 5 = Excellent (correspond à l'ancre de niveau 5)

Format JSON exact :
{
  "criteria_scores": [
    {
      "criterion_id": "ID exact du critère",
      "criterion_name": "Nom du critère",
      "bars_level": 1-5,
      "score": 0-100,
      "justification": "Explication du positionnement sur la grille BARS",
      "verbatim": "Citation EXACTE mot pour mot de la transcription"
    }
  ],
  "feedback": "Résumé global de la qualité de la réponse (2-3 phrases)",
  "strengths": ["Point fort 1", "Point fort 2"],
  "improvements": ["Axe d'amélioration 1"]
}

IMPORTANT: Le champ "score" DOIT être calculé à partir du bars_level : score = (bars_level - 1) * 25. Par exemple: niveau 1 = 0, niveau 3 = 50, niveau 5 = 100.`;
  } else {
    // ── Legacy mode : free 0-100 scoring ──
    criteriaList = criteria.map((c, i) =>
      `${i + 1}. "${c.name}" (ID: ${c.id}) — ${c.description || "Évaluation générale"}`
    ).join("\n");

    scoringInstructions = `Évaluez chaque critère séparément. Pour chaque critère, donnez :
- Un score de 0 à 100
- Une justification en 1-2 phrases
- Une citation EXACTE (verbatim, copier-coller MOT POUR MOT) de la transcription

Format JSON exact :
{
  "criteria_scores": [
    {
      "criterion_id": "ID exact du critère",
      "criterion_name": "Nom du critère",
      "score": 0-100,
      "justification": "Explication de la note",
      "verbatim": "Citation EXACTE mot pour mot de la transcription"
    }
  ],
  "feedback": "Résumé global de la qualité de la réponse (2-3 phrases)",
  "strengths": ["Point fort 1", "Point fort 2"],
  "improvements": ["Axe d'amélioration 1"]
}`;
  }

  // max_tokens adaptatif : ~400 tokens par critère + 300 pour le résumé
  const maxTokens = Math.min(4000, 300 + criteria.length * 400);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    temperature: 0.1,
    system: `Vous êtes un expert en évaluation d'entretiens de recrutement vidéo${hasBars ? ", spécialisé dans l'évaluation par grilles BARS (Behaviorally Anchored Rating Scales)" : ""}.
Contexte du poste: ${JSON.stringify(jobContext)}

RÈGLES ABSOLUES:
- Évaluez CHAQUE critère individuellement.
- Citez un EXTRAIT EXACT (verbatim, copier-coller MOT POUR MOT) de la transcription pour justifier chaque note. La citation doit être une sous-chaîne exacte de la transcription.
- Si la transcription ne contient rien de pertinent pour un critère, mettez "" pour le verbatim et donnez le score le plus bas.
- Répondez UNIQUEMENT avec un JSON valide, sans texte avant ou après.`,
    messages: [{
      role: "user",
      content: `QUESTION POSÉE AU CANDIDAT:
"${questionText}"

CRITÈRES D'ÉVALUATION (${criteria.length} critère${criteria.length > 1 ? "s" : ""}):
${criteriaList}

TRANSCRIPTION DE LA RÉPONSE VIDÉO:
"${transcript}"

${scoringInstructions}`
    }]
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  const parsed = JSON.parse(jsonMatch[0]);

  // Post-traitement : vérification des verbatims
  const criteriaScores = verifyVerbatims(parsed.criteria_scores || [], transcript);

  // Calculer le score question = moyenne des critères
  const avgScore = criteriaScores.length > 0
    ? Math.round(criteriaScores.reduce((s, c) => s + (c.score || 0), 0) / criteriaScores.length)
    : 0;

  return {
    status: "evaluated",
    score: avgScore,
    feedback: parsed.feedback || "",
    criteria_scores: criteriaScores,
    strengths: parsed.strengths || [],
    improvements: parsed.improvements || [],
  };
}

// ─── Recalculate candidate global scores (with completeness tracking) ─────────
async function updateGlobalScores(supabase, candidateId) {
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, jobs(assessment_config, ai_interview_config)")
    .eq("id", candidateId)
    .single();

  if (!candidate) return;

  const assessmentConfig = candidate.jobs?.assessment_config || {};
  const modules = assessmentConfig.modules || {};

  const cvEnabled = modules.cv_scoring?.enabled ?? true;
  const testsEnabled = modules.skills_tests?.enabled ?? false;
  const interviewEnabled = modules.ai_interview?.enabled ?? candidate.jobs?.ai_interview_config?.enabled ?? false;
  const videoEnabled = modules.video_interview?.enabled ?? false;

  let scoreVideo = null;
  let videoCompleteness = null;

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
      scoreVideo = Math.round(
        evaluated.reduce((sum, r) => sum + r.ai_score, 0) / evaluated.length
      );
    }
  }

  // Score global : vidéo comptabilisée SEULEMENT si toutes les questions sont évaluées
  const videoForGlobal = (videoCompleteness?.is_complete && scoreVideo != null)
    ? scoreVideo
    : null;

  const baseWeights = { cv: 10, tests: 50, interview: 40, video: 40 };
  const activeWeights = {};
  if (cvEnabled && candidate.score_cv != null) activeWeights.cv = baseWeights.cv;
  if (testsEnabled && candidate.score_tests != null) activeWeights.tests = baseWeights.tests;
  if (interviewEnabled && candidate.score_interview != null) activeWeights.interview = baseWeights.interview;
  if (videoEnabled && videoForGlobal != null) activeWeights.video = baseWeights.video;

  const totalBase = Object.values(activeWeights).reduce((s, w) => s + w, 0);

  let scoreGlobal = null;
  if (totalBase > 0) {
    let weighted = 0;
    if (activeWeights.cv) weighted += (candidate.score_cv * activeWeights.cv) / totalBase;
    if (activeWeights.tests) weighted += (candidate.score_tests * activeWeights.tests) / totalBase;
    if (activeWeights.interview) weighted += (candidate.score_interview * activeWeights.interview) / totalBase;
    if (activeWeights.video) weighted += (videoForGlobal * activeWeights.video) / totalBase;
    scoreGlobal = Math.round(weighted);
  }

  await supabase
    .from("candidates")
    .update({
      score_global: scoreGlobal,
      video_interview_score: scoreVideo,
      video_score_completeness: videoCompleteness,
    })
    .eq("id", candidateId);
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const body = await request.json();
    const { responseId, videoUrl, questionText, jobContext } = body;
    // Support both new criteria[] and legacy evaluationCriteria string
    const criteria = body.criteria && body.criteria.length > 0
      ? body.criteria
      : normalizeCriteria({ evaluation_criteria: body.evaluationCriteria });

    if (!responseId || !videoUrl) {
      return Response.json({ error: "responseId and videoUrl are required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get candidate ID
    const { data: respData } = await supabase
      .from("video_interview_responses")
      .select("candidate_id")
      .eq("id", responseId)
      .single();

    if (!respData?.candidate_id) {
      throw new Error("Response not found");
    }

    // Update status to transcribing
    await supabase
      .from("video_interview_responses")
      .update({ status: "transcribing" })
      .eq("id", responseId);

    // Step 1: Transcribe with AssemblyAI
    let transcript = "";
    try {
      transcript = await transcribeAudio(videoUrl);
    } catch (transcribeErr) {
      console.error("Transcription failed:", transcribeErr);
      transcript = "[Transcription indisponible]";
    }

    await supabase
      .from("video_interview_responses")
      .update({ transcript, status: "evaluating" })
      .eq("id", responseId);

    // Step 2: Evaluate with Claude (per-criterion)
    let evaluation = null;
    try {
      evaluation = await evaluateResponse(
        questionText,
        criteria,
        transcript,
        jobContext
      );
    } catch (evalErr) {
      console.error("Evaluation failed:", evalErr);
      evaluation = {
        status: "manual_review",
        score: null,
        feedback: "Erreur lors de l'évaluation IA. Revue manuelle requise.",
        criteria_scores: [],
        strengths: [],
        improvements: [],
      };
    }

    // Step 3: Save results
    const finalStatus = evaluation.status || "evaluated";
    await supabase
      .from("video_interview_responses")
      .update({
        transcript,
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
        ai_criteria_scores: evaluation.criteria_scores,
        ai_strengths: evaluation.strengths,
        ai_improvements: evaluation.improvements,
        status: finalStatus,
      })
      .eq("id", responseId);

    // Step 4: Recalculate candidate global score (with completeness)
    await updateGlobalScores(supabase, respData.candidate_id);

    return Response.json({ success: true, transcript, evaluation });
  } catch (error) {
    console.error("Video interview API error:", error);
    return Response.json(
      { error: error.message || "Erreur lors du traitement de la reponse video." },
      { status: 500 }
    );
  }
}
