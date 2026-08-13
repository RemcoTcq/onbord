import anthropic from "@/lib/anthropic";
import { createClient } from "@/lib/supabase/server";
import { aggregateVideoScore, computeGlobalScore, resolveEnabledModules } from "@/lib/scoring";

// ─── Construction du prompt système côté serveur ──────────────────────────────
// Portée depuis InterviewModule (client) : le client ne construit plus le prompt,
// ce qui empêche toute manipulation (injection, contournement du scoring).
function buildInterviewSystemPrompt(candidate, job) {
  const criteria = job?.extracted_criteria || {};
  const aiConfig = job?.ai_interview_config || {};
  const customQuestions = criteria.custom_questions || aiConfig.questions || [];
  const contextAbout = aiConfig.context_about || "";
  const contextWhy = aiConfig.context_why || "";
  const contextMatters = aiConfig.context_what_matters || "";

  const customQuestionsSection = customQuestions.length > 0
    ? `\nQuestions obligatoires à poser :\n${customQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
    : "";

  const contextSection = [contextAbout, contextWhy, contextMatters].filter(Boolean).length > 0
    ? `\nContexte :\n${[contextAbout && `À propos : ${contextAbout}`, contextWhy && `Pourquoi ce recrutement : ${contextWhy}`, contextMatters && `Ce qui compte : ${contextMatters}`].filter(Boolean).join("\n")}`
    : "";

  const intro = (aiConfig.intro_text || "").replace("{title}", criteria.title || job?.title || "ce poste");

  return `Vous êtes Leo, recruteur IA chez Onbord. Vous menez un entretien pour le poste : ${criteria.title || job?.title || "Poste"}.
Candidat : ${candidate.first_name} ${candidate.last_name}.
Compétences techniques requises : ${criteria.hard_skills?.map((s) => s.name).join(", ") || "Non spécifié"}.
Soft skills à évaluer : ${criteria.soft_skills?.map((s) => s.name).join(", ") || "Non spécifié"}.${contextSection}${customQuestionsSection}
${intro ? `\nMessage d'introduction à utiliser pour votre premier message : "${intro}"` : ""}

Règles d'entretien :
1. Présentez-vous brièvement.
2. Posez UNE SEULE question à la fois.
3. ÉVALUEZ les compétences techniques MAIS AUSSI le comportement.
4. Posez des questions anti-triche : exemples précis et personnels.
5. Challengez les réponses trop vagues.
6. Soyez professionnel et bienveillant.

Après 6-8 échanges, terminez poliment avec le mot-clé [INTERVIEW_TERMINÉE] à la fin.
Formatage : texte brut uniquement, pas d'astérisques, pas d'emojis, pas de listes.`;
}

export async function POST(request) {
  try {
    // `system` et `candidateId` bruts du client ne sont plus dignes de confiance.
    // On identifie le candidat par son token (fiable) ; `candidateId` reste accepté
    // en repli le temps de la transition de déploiement (cf. Phase B : à retirer).
    const { token, candidateId: legacyCandidateId, messages } = await request.json();

    const supabase = await createClient();

    let query = supabase.from("candidates").select("*, jobs(*)");
    if (token) query = query.eq("interview_token", token);
    else if (legacyCandidateId) query = query.eq("id", legacyCandidateId);
    else return Response.json({ error: "token requis." }, { status: 400 });

    const { data: candidate } = await query.single();
    if (!candidate) return Response.json({ error: "Candidat introuvable." }, { status: 404 });

    // Prompt système reconstruit côté serveur — tout `system` envoyé par le client est ignoré.
    const system = buildInterviewSystemPrompt(candidate, candidate.jobs);

    // Claude requires at least one user message
    const finalMessages = (!messages || messages.length === 0)
      ? [{ role: "user", content: "Bonjour, je suis prêt pour l'entretien." }]
      : messages.map(m => ({ role: m.role, content: m.content }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6", // Sonnet = much cheaper than Opus
      max_tokens: 600,            // Limit response length for conciseness
      temperature: 0.7,
      system,
      messages: finalMessages,
    });

    const content = response.content[0].text;

    // If interview just ended, score it
    if (content.includes("[INTERVIEW_TERMINÉE]")) {
      try {
        await scoreInterview(candidate.id, finalMessages, content);
      } catch (scoreErr) {
        console.error("Interview scoring failed:", scoreErr);
        // Échec d'évaluation (JSON illisible, erreur API…) : on bascule explicitement
        // en revue manuelle plutôt que de laisser le candidat sans score ni alerte.
        try {
          await flagInterviewForManualReview(supabase, candidate.id, scoreErr.message);
        } catch (flagErr) {
          console.error("Could not flag interview for manual review:", flagErr);
        }
        // On ne bloque pas la réponse au candidat : l'entretien se termine normalement.
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

// ─── Bascule en revue manuelle ────────────────────────────────────────────────
// Réplique le comportement de la route vidéo : quand l'évaluation IA échoue, on ne
// laisse pas le candidat sans score ET sans signal. Le recruteur est informé via
// interview_summary, affiché sur la fiche candidat. `score_interview` n'est pas
// touché (il reste null), donc la pondération proportionnelle exclut simplement ce
// module — mais l'absence devient visible au lieu d'être silencieuse.
async function flagInterviewForManualReview(supabase, candidateId, reason) {
  await supabase
    .from("candidates")
    .update({
      interview_summary:
        "⚠️ Évaluation automatique de l'entretien indisponible — revue manuelle requise. " +
        `La transcription reste consultable. (Motif technique : ${reason})`,
      interview_recommendation: "manual_review",
    })
    .eq("id", candidateId);
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
Événements techniques pendant l'entretien (anti-triche) : ${JSON.stringify(candidate.anti_cheat_metrics || [])}

Évaluez le candidat sur les critères suivants :
- Pertinence et profondeur des réponses
- Compétences techniques démontrées
- Qualité de communication et structure (Soft skills)
- Comportement et attitude (Politesse, écoute, réactivité)
- Motivation et adéquation culturelle
- Intégrité et authenticité : Analysez attentivement le style de réponse (robotique, trop parfait ?) et les événements techniques fournis (changements d'onglet "tab_switch", "window_blur", copier-coller "paste", temps de réponse "response_time" suspects). S'il y a des indices de fraude ou d'utilisation d'IA, mentionnez-le explicitement et pénalisez fortement le score.

CRITÈRES DÉCISIFS : ${JSON.stringify(candidate.jobs?.ai_interview_config?.decisive_criteria || [])}
QUESTIONS IMPOSÉES : ${JSON.stringify(candidate.jobs?.ai_interview_config?.questions || [])}

RÈGLE ABSOLUE : N'utilisez AUCUN emoji (comme 🤔, ✅, ❌, etc.) dans votre réponse. Rédigez du texte brut, neutre et professionnel.

Répondez UNIQUEMENT avec un JSON valide :
{
  "score": nombre entier de 0 à 100,
  "summary": "Résumé de 3-4 lignes de la performance en entretien.",
  "strengths": ["point fort 1", "point fort 2"],
  "weaknesses": ["point faible 1"],
  "recommendation": "hire" ou "maybe" ou "pass",
  "questions": [
    {
      "question": "Résumé court de la question posée par l'IA",
      "answer": "Résumé court de la réponse du candidat",
      "score": nombre de 0 à 10,
      "explanation": "Explication du score pour cette réponse spécifique (max 2 lignes)"
    }
  ]
}
`,
    messages: [
      {
        role: "user",
        content: `Voici la transcription complète de l'entretien :\n\n${transcript}`,
      },
    ],
  });

  const scoreText = scoringResponse.content[0].text;
  const jsonMatch = scoreText.match(/\{[\s\S]*\}/);

  // Ne jamais abandonner silencieusement : on remonte l'erreur pour que l'appelant
  // bascule l'entretien en revue manuelle (même pattern que la route vidéo).
  if (!jsonMatch) {
    throw new Error("aucun JSON exploitable dans la réponse d'évaluation de l'IA");
  }

  const evaluation = JSON.parse(jsonMatch[0].replace(/[\u0000-\u001F]+/g, " "));

  const scoreInterview = evaluation.score;

  // Score global — source unique : computeGlobalScore (formule proportionnelle),
  // alignée sur submitAssessment et la route vidéo (fin de l'ancien calcul 40/60
  // qui ignorait tests et vidéo et divergeait des autres chemins).
  const { cv: cvEnabled, tests: testsEnabled, interview: interviewEnabled, video: videoEnabled } =
    resolveEnabledModules(candidate.jobs);

  const { data: videoResps } = await supabase
    .from("video_interview_responses")
    .select("ai_score, status")
    .eq("candidate_id", candidateId);
  const { scoreVideo, videoCompleteness } = aggregateVideoScore(videoResps);

  const scoreGlobal = computeGlobalScore({
    cvEnabled,        scoreCv: candidate.score_cv,
    testsEnabled,     scoreTests: candidate.score_tests,
    interviewEnabled, scoreInterview,
    videoEnabled,     scoreVideo, videoCompleteness,
  });

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
      interview_score_breakdown: evaluation.questions,
      interview_transcript: JSON.stringify(allMessages),
      status: "interview_completed",
    })
    .eq("id", candidateId);

  console.log(`Interview scored for candidate ${candidateId}: ${scoreInterview}/100 (global: ${scoreGlobal}/100)`);
}
