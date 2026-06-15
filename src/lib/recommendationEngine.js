import { TAXONOMIE_COMPETENCES } from "./constants/taxonomie";

// Temps estimés par défaut (en minutes)
const ESTIMATED_TIMES = {
  qualifying_questions: 2,
  cv_scoring: 0,
  skills_test: 15, // par test
  ai_interview: 10,
  video_interview: 15
};

export function generateRecommendation(jobData, preferVideo = false) {
  const steps = [];
  let totalTime = 0;

  // 1. Filtres Qualifiants (Critères éliminatoires)
  const qualifyingCriteria = [];
  if (jobData.languages && jobData.languages.length > 0) {
    jobData.languages.forEach(lang => {
      qualifyingCriteria.push({
        type: 'langue',
        name: lang.name,
        evidence: \`Niveau requis: \${lang.level}\`,
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
      name: \`\${jobData.years_of_experience} ans min\`,
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

  // 2. CV Scoring
  const niceToHaveSkills = [];
  const allSkills = [...(jobData.hard_skills || []), ...(jobData.soft_skills || [])];
  allSkills.forEach(skill => {
    if (skill.priority === "nice_to_have" || !skill.priority) {
      niceToHaveSkills.push(skill);
    }
  });

  // CV Scoring est toujours recommandé pour vérifier la cohérence du profil
  steps.push({
    id: "cv_scoring",
    type: "cv_scoring",
    name: "Scoring de CV",
    description: "Analyse automatique du CV pour vérifier le fit général et les 'nice-to-have'. Non bloquant.",
    covered_skills: niceToHaveSkills.length > 0 ? niceToHaveSkills : [{ name: "Analyse globale du profil", evidence: "Cohérence avec la description", confidence: 5 }],
    estimated_time: ESTIMATED_TIMES.cv_scoring
  });
  totalTime += ESTIMATED_TIMES.cv_scoring;

  // Séparation des Must-Have
  const mustHaveSkills = allSkills.filter(s => s.priority === "must_have");
  
  const testableSkills = [];
  const interviewSkills = [];

  mustHaveSkills.forEach(skill => {
    // Retrouver la compétence dans la taxonomie si l'ID est fourni
    const taxonomyEntry = TAXONOMIE_COMPETENCES.find(c => c.ID === skill.taxonomy_id) || TAXONOMIE_COMPETENCES.find(c => c.Compétence.toLowerCase() === skill.name.toLowerCase());
    
    if (taxonomyEntry) {
      if (taxonomyEntry["Testable objectivement"] === "Oui") {
        testableSkills.push({
          ...skill,
          taxonomyData: taxonomyEntry,
          suggested_test: taxonomyEntry["Mode d'évaluation suggéré"]
        });
      } else {
        interviewSkills.push({
          ...skill,
          taxonomyData: taxonomyEntry
        });
      }
    } else {
      // Hors taxonomie : on le met par défaut en interview IA
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
      description: \`Évaluation objective de \${testableSkills.length} compétence(s) critique(s) (\${testCount} test(s) estimé(s)).\`,
      covered_skills: testableSkills,
      estimated_time: time
    });
    totalTime += time;
  }

  // 4. Interview IA
  if (interviewSkills.length > 0) {
    const interviewType = preferVideo ? "video_interview" : "ai_interview";
    const time = ESTIMATED_TIMES[interviewType];

    steps.push({
      id: interviewType,
      type: interviewType,
      name: preferVideo ? "Entretien Vidéo One-Way" : "Interview IA (Texte)",
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
