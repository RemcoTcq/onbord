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

Analysez cette reponse et repondez avec:
{
  "score": nombre entier de 0 a 100,
  "feedback": "Resume concis de 2-3 phrases de la qualite de la reponse.",
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

export async function POST(request) {
  try {
    const { responseId, videoUrl, questionText, evaluationCriteria, jobContext } =
      await request.json();

    if (!responseId || !videoUrl) {
      return Response.json({ error: "responseId and videoUrl are required" }, { status: 400 });
    }

    const supabase = await createClient();

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
      // If transcription fails, still try to save partial data
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

    return Response.json({ success: true, transcript, evaluation });
  } catch (error) {
    console.error("Video interview API error:", error);
    return Response.json(
      { error: error.message || "Erreur lors du traitement de la reponse video." },
      { status: 500 }
    );
  }
}
