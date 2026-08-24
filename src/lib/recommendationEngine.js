import { coerceExperienceLocale } from "@/lib/i18n/config";
import { nomLangue, nomDiplome } from "@/lib/i18n/languages";

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

// Gabarits des questions qualifiantes, par langue.
//
// Elles sont lues par le CANDIDAT, pas par le recruteur : elles suivent donc
// jobs.experience_locale. Les valeurs interpolées (nom de langue, niveau de
// diplôme) sont stockées en français et traduites à l'affichage — même règle
// que partout ailleurs, voir lib/i18n/languages.js.
const QUESTIONS = {
  fr: {
    // Élision : « l'anglais », mais « le français ». Le gabarit d'origine
    // écrivait « le Anglais » quelle que soit la langue.
    langue: (l) => `Maîtrisez-vous ${/^[aeiouéèêh]/i.test(l) ? "l'" : "le "}${l} à un niveau professionnel ?`,
    experience: (n) => `Disposez-vous d'au moins ${n} ans d'expérience dans un poste similaire ?`,
    diplome: (d) => `Possédez-vous un diplôme de niveau ${d} ou équivalent ?`,
    localisation: (v) => `Êtes-vous disponible pour travailler à ${v} ?`,
  },
  en: {
    langue: (l) => `Do you speak ${l} at a professional level?`,
    experience: (n) => `Do you have at least ${n} years of experience in a similar role?`,
    diplome: (d) => `Do you hold a ${d} degree or equivalent?`,
    localisation: (v) => `Are you available to work in ${v}?`,
  },
  nl: {
    langue: (l) => `Beheers je ${l} op professioneel niveau?`,
    experience: (n) => `Heb je minstens ${n} jaar ervaring in een vergelijkbare functie?`,
    diplome: (d) => `Heb je een ${d}-diploma of gelijkwaardig?`,
    localisation: (v) => `Ben je beschikbaar om in ${v} te werken?`,
  },
};

/**
 * Génère automatiquement les questions qualificatives en fonction des critères
 * de l'offre, dans la langue du parcours candidat.
 *
 * @param {object} jobData critères extraits de l'offre
 * @param {string} locale  jobs.experience_locale — fr | en | nl
 */
export function generateQualifyingQuestions(jobData, locale = "fr") {
  const loc = coerceExperienceLocale(locale);
  const T = QUESTIONS[loc] || QUESTIONS.fr;
  const questions = [];
  const ajoute = (text) => questions.push({
    id: Date.now().toString() + Math.random().toString(36).substring(7),
    text,
    expectedAnswer: "yes",
  });

  for (const lang of jobData.languages || []) ajoute(T.langue(nomLangue(lang.name, loc)));

  if (jobData.years_of_experience) ajoute(T.experience(jobData.years_of_experience));

  if (jobData.education_level && jobData.education_level !== "Indifférent") {
    ajoute(T.diplome(nomDiplome(jobData.education_level, loc)));
  }

  if (jobData.location && jobData.location.toLowerCase() !== "remote") {
    ajoute(T.localisation(jobData.location));
  }

  return questions;
}
