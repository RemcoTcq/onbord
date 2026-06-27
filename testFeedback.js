import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runTest() {
  // Mock candidate data
  const candidate = {
    first_name: "Jean",
    jobs: { title: "Développeur Full Stack React/Node" },
    status: "rejected",
    ai_summary: "Le candidat possède une bonne maîtrise du front-end avec React, et a une expérience intéressante en création de composants UI. En revanche, son expérience en back-end (Node.js/Express) semble très limitée à des projets scolaires, et il manque de recul sur l'architecture des bases de données et la conception d'API robustes requises pour le poste.",
    green_flags: ["Maîtrise de React", "Conception UI", "Passionné par l'UX"],
    red_flags: ["Manque d'expérience en architecture backend", "Peu d'expérience en bases de données relationnelles"],
    cv_score_breakdown: [
      { name: "React", score: 85, reason: "Plusieurs projets concrets mentionnés." },
      { name: "Node.js", score: 40, reason: "Uniquement mentionné dans la section formation." },
      { name: "Architecture BDD", score: 30, reason: "Aucune expérience mentionnée en modélisation SQL/NoSQL." }
    ]
  };

  const statusLabel = candidate.status === 'rejected' ? 'REFUSÉ' : candidate.status === 'shortlisted' ? 'RETENU' : 'EN RÉFLEXION';
    
  const prompt = `Tu es un expert en recrutement bienveillant qui rédige un retour destiné directement à un candidat, au nom de l'entreprise qui recrute. Ton feedback sera lu par le candidat lui-même.

CONTEXTE FOURNI :
- Poste visé : ${candidate.jobs?.title || 'Non précisé'}
- Décision : ${statusLabel}
- Synthèse de l'évaluation : ${candidate.ai_summary || 'N/A'}
- Points forts observés : ${(candidate.green_flags || []).join(', ')}
- Axes plus faibles observés : ${(candidate.red_flags || []).concat(candidate.yellow_flags || []).join(', ')}
- Compétences évaluées et observations : ${JSON.stringify(candidate.cv_score_breakdown || [])}

TA MISSION :
Rédige un feedback constructif, humain et respectueux, adressé au candidat ("vous"), en français, de 120 à 180 mots.

RÈGLES ABSOLUES :
1. Ne mentionne JAMAIS de score, de note, de pourcentage, de niveau chiffré, ni aucune mécanique d'évaluation interne. Parle uniquement en langage naturel.
2. Parle des COMPÉTENCES et des SITUATIONS, jamais de la personne. Écris "sur la négociation de contrats complexes, le profil recherché demandait plus d'expérience" — jamais "vous manquez de X" ou "vous n'êtes pas assez Y".
3. Reste honnête. Pas de fausse gentillesse, pas de langue de bois. Un candidat préfère un retour vrai et utile à un compliment creux.
4. Cohérence avec la décision :
   - Si REFUSÉ : reconnais sincèrement 1 ou 2 points forts réels, puis explique avec tact le ou les axes qui ont fait la différence pour CE poste. Le feedback doit rendre la décision compréhensible, sans l'aggraver.
   - Si RETENU : félicite, souligne les forces, et indique éventuellement un axe de progression pour la prise de poste.
   - Si EN RÉFLEXION : reste neutre et encourageant, sans annoncer de décision.
5. Toujours tourné vers le futur : termine par un encouragement concret et sincère, pas par une formule générique.
6. Ne formule jamais de promesse au nom de l'entreprise (pas de "nous vous recontacterons", pas de "postulez à nouveau dans 6 mois") sauf si c'est explicitement dans les données fournies.
7. Ne compare JAMAIS le candidat à d'autres candidats.

STRUCTURE ATTENDUE :
- Une ouverture qui remercie sincèrement pour le temps et l'effort.
- 1 ou 2 points forts réels et spécifiques.
- Le ou les axes d'amélioration, formulés par rapport aux exigences du poste.
- Une clôture encourageante et tournée vers la suite.

Si les données d'évaluation fournies sont insuffisantes ou vides, ne rédige PAS de feedback inventé : réponds exactement "DONNÉES_INSUFFISANTES".

Rédige uniquement le feedback, sans titre ni commentaire.`;

  console.log("Appel à l'API Anthropic en cours...");
  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022", // The real model
    max_tokens: 1500,
    temperature: 0.7,
    system: "Tu es un expert en recrutement bienveillant.",
    messages: [{ role: "user", content: prompt }]
  });

  console.log("\n================ RÉSULTAT DU FEEDBACK ================\n");
  console.log(response.content[0].text);
  console.log("\n======================================================\n");
}

runTest().catch(console.error);
