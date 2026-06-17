import { TAXONOMIE_COMPETENCES } from "./constants/taxonomie";

// Temps estimés par défaut (en minutes)
const ESTIMATED_TIMES = {
  qualifying_questions: 2,
  cv_scoring: 0,
  skills_test: 10, // par test
  ai_interview: 10,
  video_interview: 15
};

// Mapping from taxonomy "Mode d'évaluation suggéré" to actual DB test IDs
const SUGGESTED_TEST_TO_DB_ID = {
  "Test — B2B Account Executive": "01431ef2-3753-46e4-9876-257d04555d56",
  "Test — B2B Lead Generation": "82dca8d4-5aa1-4ca9-898d-8eb69bbcedd2",
  "Test — B2B Outside Sales": "0c1ef6f7-6120-4b34-9627-9b4270e39492",
  "Test — Communication Skills": "610fc329-07fe-485c-a590-68d6282af23a",
  "Test — Négociation": "68f90df9-d8f1-4a48-825f-aeef5726bfc9",
  "Test — Sales Aptitude": "c14fa2e2-3eec-4409-993c-47a7e23b87df"
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

  // Extraction des nice-to-have (ne forcent plus de module, restent dispos en DB)
  const allSkills = [...(jobData.hard_skills || []), ...(jobData.soft_skills || [])];

  // Séparation des Must-Have
  const mustHaveSkills = allSkills.filter(s => s.priority === "must_have");
  
  const testableSkills = [];
  const interviewSkills = [];

  mustHaveSkills.forEach(skill => {
    // Retrouver la compétence dans la taxonomie si l'ID est fourni
    const taxonomyEntry = TAXONOMIE_COMPETENCES.find(c => c.ID === skill.taxonomy_id) || TAXONOMIE_COMPETENCES.find(c => c.Compétence?.toLowerCase() === skill.name?.toLowerCase());
    
    if (taxonomyEntry) {
      if (taxonomyEntry["Testable objectivement"] === "Oui") {
        const suggestedTest = taxonomyEntry["Mode d'évaluation suggéré"];
        testableSkills.push({
          ...skill,
          taxonomyData: taxonomyEntry,
          suggested_test: suggestedTest,
          test_db_id: SUGGESTED_TEST_TO_DB_ID[suggestedTest] || null
        });
      } else {
        interviewSkills.push({
          ...skill,
          taxonomyData: taxonomyEntry
        });
      }
    } else {
      // Hors taxonomie : on le met par défaut en entretien vidéo
      interviewSkills.push({
        ...skill,
        taxonomyData: null
      });
    }
  });

  // 3. Tests de compétences
  if (testableSkills.length > 0) {
    // Grouper par test suggéré
    const uniqueTests = [...new Set(testableSkills.map(s => s.suggested_test).filter(Boolean))];
    const testCount = uniqueTests.length > 0 ? uniqueTests.length : 1;
    const time = ESTIMATED_TIMES.skills_test * testCount;

    steps.push({
      id: "skills_test",
      type: "skills_test",
      name: "Tests de compétences",
      description: `Évaluation objective de ${testableSkills.length} compétence(s) critique(s) (${testCount} test(s) estimé(s)).`,
      covered_skills: testableSkills,
      estimated_time: time
    });
    totalTime += time;
  }

  // 4. Entretien Vidéo (format recommandé pour les compétences non testables)
  if (interviewSkills.length > 0) {
    const time = ESTIMATED_TIMES.video_interview;

    steps.push({
      id: "video_interview",
      type: "video_interview",
      name: "Entretien Vidéo One-Way",
      description: "Évaluation des soft skills et des connaissances métier non testables objectivement.",
      covered_skills: interviewSkills,
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
