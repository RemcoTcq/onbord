import anthropic from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

// AssemblyAI transcription helper
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

// Claude evaluation helper
async function evaluateResponse(questionText, evaluationCriteria, transcript, jobContext) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    temperature: 0.1,
    system: `Vous etes un expert en evaluation d'entretiens de recrutement video. Votre role est d'analyser la transcription d'une reponse video d'un candidat a une question specifique.

Contexte du poste: ${JSON.stringify(jobContext)}

REGLE ABSOLUE: Repondez UNIQUEMENT avec un JSON valide, sans texte avant ou apres. N'utilisez aucun emoji.`,
    messages: [
      {
        role: "user",
        content: `Question posee au candidat: "${questionText}"

Criteres d'evaluation definis par le recruteur: "${evaluationCriteria || "Pertinence, clarte, structure, exemples concrets"}"

Transcription de la reponse video du candidat:
"${transcript}"

Analysez cette reponse. Vous devez faire un résumé de ce que le candidat a dit, puis l'évaluer sur base des critères.
Repondez avec ce format exact :
{
  "score": nombre entier de 0 a 100,
  "feedback": "Résumé clair et concis de ce que le candidat a dit, suivi de votre avis sur la qualité de la réponse.",
  "strengths": ["point fort 1", "point fort 2"],
  "improvements": ["axe d'amelioration 1"]
}`,
      },
    ],
  });

  const text = response.content[0].text;
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");
  return JSON.parse(jsonMatch[0]);
}

// Helper pour recalculer le score global
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
  const { data: videoResps } = await supabase
    .from("video_interview_responses")
    .select("ai_score")
    .eq("candidate_id", candidateId)
    .eq("status", "evaluated");

  if (videoResps && videoResps.length > 0) {
    const total = videoResps.reduce((sum, r) => sum + (r.ai_score || 0), 0);
    scoreVideo = Math.round(total / videoResps.length);
  }

  const baseWeights = { cv: 10, tests: 50, interview: 40, video: 40 };
  const activeWeights = {};
  if (cvEnabled && candidate.score_cv != null) activeWeights.cv = baseWeights.cv;
  if (testsEnabled && candidate.score_tests != null) activeWeights.tests = baseWeights.tests;
  if (interviewEnabled && candidate.score_interview != null) activeWeights.interview = baseWeights.interview;
  if (videoEnabled && scoreVideo != null) activeWeights.video = baseWeights.video;

  const totalBase = Object.values(activeWeights).reduce((s, w) => s + w, 0);

  let scoreGlobal = null;
  if (totalBase > 0) {
    let weighted = 0;
    if (activeWeights.cv) weighted += (candidate.score_cv * activeWeights.cv) / totalBase;
    if (activeWeights.tests) weighted += (candidate.score_tests * activeWeights.tests) / totalBase;
    if (activeWeights.interview) weighted += (candidate.score_interview * activeWeights.interview) / totalBase;
    if (activeWeights.video) weighted += (scoreVideo * activeWeights.video) / totalBase;
    scoreGlobal = Math.round(weighted);
  }

  await supabase
    .from("candidates")
    .update({ score_global: scoreGlobal, video_interview_score: scoreVideo })
    .eq("id", candidateId);
}

export async function POST(request) {
  try {
    const { responseId, videoUrl, questionText, evaluationCriteria, jobContext } =
      await request.json();

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

    // Step 2: Evaluate with Claude
    let evaluation = null;
    try {
      evaluation = await evaluateResponse(
        questionText,
        evaluationCriteria,
        transcript,
        jobContext
      );
    } catch (evalErr) {
      console.error("Evaluation failed:", evalErr);
      evaluation = { score: 0, feedback: "Evaluation indisponible.", strengths: [], improvements: [] };
    }

    // Step 3: Save results
    await supabase
      .from("video_interview_responses")
      .update({
        transcript,
        ai_score: evaluation.score,
        ai_feedback: evaluation.feedback,
        ai_strengths: evaluation.strengths,
        ai_improvements: evaluation.improvements,
        status: "evaluated",
      })
      .eq("id", responseId);

    // Step 4: Recalculate candidate global score
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
