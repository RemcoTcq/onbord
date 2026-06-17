// Script de comparaison Haiku vs Sonnet pour la génération de questions vidéo
// Usage: node --env-file=.env.local compare_video_questions.mjs

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Job data: Account Executive B2B ──────────────────────────────────────────
const jobTitle = "Account Executive B2B SaaS";
const jobDescription = `Nous recherchons un(e) Account Executive expérimenté(e) pour rejoindre notre équipe commerciale B2B SaaS. Vous serez responsable du cycle de vente complet, de la qualification des opportunités au closing. Le poste requiert une forte capacité de prospection, de négociation et de gestion de comptes stratégiques. Vous travaillerez en étroite collaboration avec les équipes marketing et customer success.`;

// Compétences NON TESTABLES uniquement (celles qui vont en interview)
// Filtrées depuis la taxonomie: "Testable objectivement" === "Non"
const nonTestableSkills = [
  { name: "Storytelling commercial", definition: "Utiliser le récit pour rendre une offre mémorable et convaincante." },
  { name: "Vente multi-interlocuteurs", definition: "Coordonner plusieurs contacts dans un même compte." },
  { name: "Esprit de compétition", definition: "Tirer de l'énergie de la performance et du dépassement." },
  { name: "Gestion du stress", definition: "Rester performant sous pression et en situation tendue." },
  { name: "Empathie commerciale", definition: "Comprendre la perspective et les émotions du client." },
  { name: "Confiance en soi", definition: "Aborder les échanges avec assurance et crédibilité." },
];

// TOUTES les skills (comme fait actuellement generateVideoQuestions)
const allHardSkills = "Prospection téléphonique, Qualification d'opportunités, Négociation commerciale, Vente consultative, Gestion du pipeline, Closing";
const allSoftSkills = "Storytelling commercial, Vente multi-interlocuteurs, Esprit de compétition, Gestion du stress, Empathie commerciale, Confiance en soi";

// ─── Prompt ACTUEL (toutes skills, Sonnet, 0.7) ──────────────────────────────
const currentPrompt = `Poste: ${jobTitle}
Competences techniques: ${allHardSkills}
Soft skills: ${allSoftSkills}
Description: ${jobDescription}

Genere 4 questions d'entretien video adaptees a ce poste. Pour chaque question, propose aussi un critere d'evaluation pour l'IA.

Reponds avec:
{
  "questions": [
    {
      "text": "La question complete",
      "category": "Motivation|Experience|Soft Skills|Technique",
      "hint": "Conseil pour le candidat (1 phrase)",
      "evaluation_criteria": "Ce que l'IA doit evaluer (1-2 phrases)"
    }
  ]
}`;

// ─── Prompt CORRIGÉ (non-testables seulement) ─────────────────────────────────
const skillsList = nonTestableSkills.map(s => `- ${s.name} : ${s.definition}`).join("\n");
const fixedPrompt = `Tu es un expert RH. Tu génères des questions d'entretien vidéo one-way pertinentes pour un poste spécifique.

Poste: ${jobTitle}
Description: ${jobDescription}

COMPÉTENCES À ÉVALUER EN ENTRETIEN (non testables objectivement, donc non couvertes par les tests techniques) :
${skillsList}

RÈGLES :
1. Génère 4 questions d'entretien vidéo adaptées à ce poste.
2. Chaque question doit cibler au moins une des compétences listées ci-dessus.
3. Formule les questions pour qu'elles soient lues telles quelles au candidat (vouvoiement).
4. Pour chaque question, indique un critère d'évaluation précis pour l'IA.

Réponds UNIQUEMENT avec un JSON valide :
{
  "questions": [
    {
      "text": "La question complète",
      "category": "Motivation|Experience|Soft Skills|Technique",
      "hint": "Conseil pour le candidat (1 phrase)",
      "evaluation_criteria": "Ce que l'IA doit évaluer (1-2 phrases)"
    }
  ]
}`;

// ─── Run tests ────────────────────────────────────────────────────────────────
async function runTest(label, model, temperature, prompt) {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`▸ ${label}`);
  console.log(`  Modèle: ${model} | Temperature: ${temperature}`);
  console.log(`${"─".repeat(80)}`);

  try {
    const start = Date.now();
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1200,
      temperature,
      system: "Tu es un expert RH. Tu génères des questions d'entretien vidéo pertinentes pour un poste spécifique. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{ role: "user", content: prompt }],
    });
    const elapsed = Date.now() - start;

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("  ❌ Pas de JSON valide dans la réponse");
      return;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const questions = parsed.questions || [];

    console.log(`  ⏱ ${elapsed}ms | ${questions.length} questions\n`);
    questions.forEach((q, i) => {
      console.log(`  Q${i + 1} [${q.category}]`);
      console.log(`     "${q.text}"`);
      console.log(`     💡 Hint: ${q.hint}`);
      console.log(`     📊 Critère: ${q.evaluation_criteria}`);
      console.log();
    });

    // Token usage
    console.log(`  Tokens: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`);
  } catch (err) {
    console.log(`  ❌ Erreur: ${err.message}`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Comparaison: Haiku vs Sonnet pour questions vidéo         ║");
  console.log("║  Job: Account Executive B2B SaaS                          ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Test 1: ACTUEL — Sonnet 0.7, toutes skills
  await runTest(
    "ACTUEL: Sonnet + temp 0.7 + TOUTES skills",
    "claude-sonnet-4-6",
    0.7,
    currentPrompt
  );

  // Test 2: CORRIGÉ — Haiku 0.3, non-testables seulement
  await runTest(
    "CORRIGÉ (Haiku): Haiku + temp 0.3 + non-testables seulement",
    "claude-haiku-4-5",
    0.3,
    fixedPrompt
  );

  // Test 3: CORRIGÉ — Sonnet 0.3, non-testables seulement (fallback si Haiku insuffisant)
  await runTest(
    "CORRIGÉ (Sonnet): Sonnet + temp 0.3 + non-testables seulement",
    "claude-sonnet-4-6",
    0.3,
    fixedPrompt
  );

  console.log("\n" + "═".repeat(80));
  console.log("Comparaison terminée. Évaluez la qualité des questions ci-dessus.");
}

main();
