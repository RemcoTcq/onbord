import anthropic from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { system, messages, candidateId } = await request.json();

    // Claude requires at least one user message
    const finalMessages = messages.length === 0
      ? [{ role: "user", content: "Bonjour, je suis prêt pour l'entretien." }]
      : messages.map(m => ({ role: m.role, content: m.content }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6", // Sonnet = much cheaper than Opus
      max_tokens: 600,            // Limit response length for conciseness
      temperature: 0.7,
      system: system,
      messages: finalMessages,
    });

    const content = response.content[0].text;

    // If interview just ended, score it
    if (content.includes("[INTERVIEW_TERMINÉE]") && candidateId) {
      try {
        await scoreInterview(candidateId, finalMessages, content);
      } catch (scoreErr) {
        console.error("Interview scoring failed:", scoreErr);
        // Don't block the response, scoring can be retried
      }
    }

    return Response.json({ content });
  } catch (error) {
    console.error("Interview API Error:", error);
    return Response.json(
      { error: error.message || "Erreur lors de la communication avec l'IA." },
      { status: 500 }
    );
  }
}

async function scoreInterview(candidateId, messages, lastAiMessage) {
  const supabase = await createClient();

  // Get candidate + job info
  const { data: candidate } = await supabase
    .from("candidates")
    .select("*, jobs(*)")
    .eq("id", candidateId)
    .single();

  if (!candidate) return;

  const jobCriteria = candidate.jobs?.extracted_criteria || {};

  // Build conversation transcript
  const allMessages = [...messages, { role: "assistant", content: lastAiMessage }];
  const transcript = allMessages
    .map(m => `${m.role === "user" ? "CANDIDAT" : "RECRUTEUR IA"}: ${m.content}`)
    .join("\n\n");

  // Ask Claude to score the interview
  const scoringResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    temperature: 0.1,
    system: `Vous êtes un expert en évaluation d'entretiens de recrutement. Analysez la transcription d'entretien suivante et évaluez le candidat.

Poste : ${jobCriteria.title || candidate.jobs?.title || "Non spécifié"}
Domaine : ${jobCriteria.category || ""}
Compétences recherchées : ${jobCriteria.hard_skills?.map(s => s.name).join(", ") || "Non spécifié"}
Soft skills : ${jobCriteria.soft_skills?.map(s => s.name).join(", ") || "Non spécifié"}

Évaluez le candidat sur les critères suivants :
- Pertinence et profondeur des réponses
- Compétences techniques démontrées
- Qualité de communication et structure (Soft skills)
- Comportement et attitude (Politesse, écoute, réactivité)
- Motivation et adéquation culturelle

RÈGLE ABSOLUE : N'utilisez AUCUN emoji (comme 🤔, ✅, ❌, etc.) dans votre réponse. Rédigez du texte brut, neutre et professionnel.

Répondez UNIQUEMENT avec un JSON valide :
{
  "score": nombre entier de 0 à 100,
  "summary": "Résumé de 3-4 lignes de la performance en entretien.",
  "strengths": ["point fort 1", "point fort 2"],
  "weaknesses": ["point faible 1"],
  "recommendation": "hire" ou "maybe" ou "pass"
}`,
    messages: [
      {
        role: "user",
        content: `Voici la transcription complète de l'entretien :\n\n${transcript}`,
      },
    ],
  });

  const scoreText = scoringResponse.content[0].text;
  const jsonMatch = scoreText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error("Interview scoring: no JSON found", scoreText);
    return;
  }

  const evaluation = JSON.parse(jsonMatch[0].replace(/[\u0000-\u001F]+/g, " "));

  // Compute global score (weighted: 40% CV + 60% interview)
  const scoreCv = candidate.score_cv || 0;
  const scoreInterview = evaluation.score;
  const scoreGlobal = Math.round(scoreCv * 0.4 + scoreInterview * 0.6);

  // Update candidate in DB
  await supabase
    .from("candidates")
    .update({
      score_interview: scoreInterview,
      score_global: scoreGlobal,
      interview_summary: evaluation.summary,
      interview_strengths: evaluation.strengths,
      interview_weaknesses: evaluation.weaknesses,
      interview_recommendation: evaluation.recommendation,
      status: "interview_completed",
    })
    .eq("id", candidateId);

  console.log(`Interview scored for candidate ${candidateId}: ${scoreInterview}/100 (global: ${scoreGlobal}/100)`);
}
