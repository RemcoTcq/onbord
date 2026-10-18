import { coerceExperienceLocale } from "@/lib/i18n/config";
import { nomLangue, nomDiplome } from "@/lib/i18n/languages";
import { nomLieu, avecPrepositionFr } from "@/lib/i18n/lieux";


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
    // « à Gand », mais « en Wallonie », « dans le Hainaut » : voir lib/i18n/lieux.js.
    localisation: (v) => `Êtes-vous disponible pour travailler ${avecPrepositionFr(v)} ?`,
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
    // Le lieu est stocké dans la langue de l'annonce : « Gent » sur une offre
    // flamande. Le candidat d'un parcours anglais doit lire « Ghent ».
    ajoute(T.localisation(nomLieu(jobData.location, loc)));
  }

  return questions;
}
