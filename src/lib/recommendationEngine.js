// Temps estimés par défaut (en minutes)
const ESTIMATED_TIMES = {
  qualifying_questions: 2,
  cv_scoring: 0,
  skills_test: 10, // par test
  ai_interview: 10,
  video_interview: 15
};

export function generateRecommendation(jobData) {
  const steps = [];
  let totalTime = 0;

  // 1. Filtres Qualifiants (Critères éliminatoires)
  const qualifyingCriteria = [];
  if (jobData.languages && jobData.languages.length > 0) {
    jobData.languages.forEach(lang => {
      qualifyingCriteria.push({
        type: 'langue',
        name: lang.name,
        evidence: `Niveau requis: ${lang.level}`,
        confidence: 5
      });
    });
  }
  if (jobData.education_level && jobData.education_level !== "Indifférent") {
    qualifyingCriteria.push({
      type: 'diplôme',
      name: jobData.education_level,
      evidence: "Mentionné dans les critères globaux",
      confidence: 5
    });
  }
  if (jobData.location && jobData.location.toLowerCase() !== "remote") {
    qualifyingCriteria.push({
      type: 'localisation',
      name: jobData.location,
      evidence: "Localisation du poste",
      confidence: 5
    });
  }
  if (jobData.years_of_experience) {
    qualifyingCriteria.push({
      type: 'expérience',
      name: `${jobData.years_of_experience} ans min`,
      evidence: "Expérience minimale requise",
      confidence: 5
    });
  }

  if (qualifyingCriteria.length > 0) {
    steps.push({
      id: "qualifying_questions",
      type: "qualifying_questions",
      name: "Questions qualificatives",
      description: "Filtres éliminatoires (bloquants) placés en premier.",
      covered_skills: qualifyingCriteria,
      estimated_time: ESTIMATED_TIMES.qualifying_questions
    });
    totalTime += ESTIMATED_TIMES.qualifying_questions;
  }

  // Extraction de toutes les compétences pour l'entretien vidéo
  const allSkills = [...(jobData.hard_skills || []), ...(jobData.soft_skills || [])];

  // 3. Tests de compétences métiers (basés sur la recommandation dynamique de l'IA)
  if (jobData.recommended_test_ids && jobData.recommended_test_ids.length > 0) {
    const time = ESTIMATED_TIMES.skills_test * jobData.recommended_test_ids.length;

    // Simulation de 'covered_skills' pour la compatibilité avec l'interface JobFormStepRecommendation
    const mockCoveredSkills = jobData.recommended_test_ids.map(id => ({
      test_db_id: id,
      suggested_test: "Test Métier Recommandé"
    }));

    steps.push({
      id: "skills_test",
      type: "skills_test",
      name: "Test Métier",
      description: `Évaluation recommandée par l'IA (${jobData.recommended_test_ids.length} test(s) suggéré(s)).`,
      covered_skills: mockCoveredSkills,
      estimated_time: time
    });
    totalTime += time;
  }

  // 4. Entretien Vidéo (format recommandé pour l'évaluation humaine des soft skills)
  if (allSkills.length > 0) {
    const time = ESTIMATED_TIMES.video_interview;

    steps.push({
      id: "video_interview",
      type: "video_interview",
      name: "Entretien Vidéo One-Way",
      description: "Évaluation asynchrone des compétences générales et du savoir-être.",
      covered_skills: allSkills,
      estimated_time: time
    });
    totalTime += time;
  }

  return {
    steps,
    totalTime,
    warning: totalTime > 30 ? "Le parcours candidat dépasse 30 minutes, ce qui peut réduire le taux de complétion." : null
  };
}

/**
 * Génère automatiquement les questions qualificatives en fonction des critères de l'offre.
 * (Phase 2.2)
 */
export function generateQualifyingQuestions(jobData) {
  const questions = [];

  if (jobData.languages && jobData.languages.length > 0) {
    jobData.languages.forEach(lang => {
      questions.push({
        id: Date.now().toString() + Math.random().toString(36).substring(7),
        text: `Maîtrisez-vous le ${lang.name} à un niveau professionnel ?`,
        expectedAnswer: "yes"
      });
    });
  }

  if (jobData.years_of_experience) {
    questions.push({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      text: `Disposez-vous d'au moins ${jobData.years_of_experience} ans d'expérience dans un poste similaire ?`,
      expectedAnswer: "yes"
    });
  }

  if (jobData.education_level && jobData.education_level !== "Indifférent") {
    questions.push({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      text: `Possédez-vous un diplôme de niveau ${jobData.education_level} ou équivalent ?`,
      expectedAnswer: "yes"
    });
  }

  if (jobData.location && jobData.location.toLowerCase() !== "remote") {
    questions.push({
      id: Date.now().toString() + Math.random().toString(36).substring(7),
      text: `Êtes-vous disponible pour travailler à ${jobData.location} ?`,
      expectedAnswer: "yes"
    });
  }

  return questions;
}
