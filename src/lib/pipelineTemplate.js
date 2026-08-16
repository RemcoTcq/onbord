import { generateRecommendation, generateQualifyingQuestions } from "@/lib/recommendationEngine";

// Pipeline par défaut d'une offre — SOURCE UNIQUE.
//
// Cette construction était dupliquée à deux endroits qui ne s'accordaient pas :
// l'étape 3 de la création la dérivait du moteur de recommandation, tandis que
// la fiche offre la reconstruisait depuis `assessment_config`. Un brouillon
// abandonné avant validation affichait donc une pipeline différente de celle
// qu'on venait de lui proposer (questions qualificatives et nœud d'évaluation
// en moins). Les deux écrans passent désormais par ici.
//
// La fonction est PURE et DÉTERMINISTE : mêmes données d'offre, même pipeline.
// C'est ce qui garantit que les deux écrans tombent d'accord — d'où les
// identifiants stables ci-dessous plutôt que des `Date.now()`.

// Nœuds hors-Onbord, non éditables, qui encadrent toujours le parcours.
const LOCKED_BEFORE = [
  { id: "locked_sourcing", type: "sourcing" },
];
const LOCKED_AFTER = [
  { id: "locked_entretien_visio", type: "entretien_visio" },
  { id: "locked_entretien_site", type: "entretien_site" },
  { id: "locked_debrief_finale", type: "debrief_finale" },
];

const locked = (n) => ({ ...n, locked: true, v2: true, config: {} });

/** Encadre des nœuds Onbord des étapes verrouillées amont/aval. */
export function withLockedNodes(onbordNodes) {
  return [
    ...LOCKED_BEFORE.map(locked),
    ...onbordNodes.map((n) => ({ ...n, v2: true })),
    ...LOCKED_AFTER.map(locked),
  ];
}

/**
 * Pipeline proposée par défaut pour une offre qui n'en a pas encore.
 * @param {object} jobData - critères de l'offre (forme `extracted_criteria`).
 * @returns {Array} nœuds complets, verrouillés inclus.
 */
export function buildDefaultPipeline(jobData) {
  const rec = generateRecommendation(jobData || {});
  const nodes = [];

  nodes.push({
    id: "accueil",
    type: "accueil",
    config: { text: "Bienvenue sur notre espace de recrutement. Nous sommes ravis de découvrir votre profil." },
  });

  if (rec.steps.some((s) => s.type === "qualifying_questions")) {
    nodes.push({
      id: "qualifying_questions",
      type: "qualifying_questions",
      // Identifiants de questions indexés, et non horodatés : deux appels
      // successifs doivent produire exactement la même pipeline.
      config: {
        questions: generateQualifyingQuestions(jobData || {}).map((q, i) => ({ ...q, id: `q_${i}` })),
      },
    });
  }

  if (rec.steps.some((s) => ["skills_test", "video_interview", "ai_interview"].includes(s.type))) {
    nodes.push({
      id: "experience",
      type: "experience",
      config: { title: "Évaluation IA (Expérience)", configured: false },
    });
  }

  nodes.push({
    id: "remerciements",
    type: "remerciements",
    config: { text: "Merci pour votre temps. Vos réponses ont bien été enregistrées." },
  });

  return withLockedNodes(nodes);
}
