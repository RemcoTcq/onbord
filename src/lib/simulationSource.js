// La SOURCE d'une simulation — module PUR (phase 2 de l'onboarding).
//
// Une simulation (`experiences`) naît soit d'une OFFRE (`job_id`, le
// recrutement), soit d'un MODULE (`module_id`, l'onboarding, migration 042).
// Tout le moteur — génération, réécriture d'étape, chat d'étape, couverture,
// notation — a été écrit pour l'offre et lit un objet « job » : titre,
// description, critères, langue, propriétaire, organisation. Plutôt que de
// dédoubler chaque chemin, un module se présente sous cette même forme.
//
// Les lectures embarquent les deux relations :
//   experiences.select(`…, ${SOURCE_EMBARQUEE}`)
// et `sourceDe(exp)` rend l'objet « job », que la simulation vienne d'une
// offre ou d'un module.

export const COLONNES_JOB = "id, user_id, organization_id, title, description, extracted_criteria, experience_locale";
export const COLONNES_MODULE = "id, organization_id, created_by, title, objective, target_role, situation, difficulty, min_score, locale, criteria";
export const SOURCE_EMBARQUEE = `jobs(${COLONNES_JOB}), modules(${COLONNES_MODULE})`;

const DIFFICULTES = {
  easy: "facile : un interlocuteur coopératif, une seule difficulté claire",
  medium: "moyenne : un interlocuteur exigeant, deux ou trois difficultés réalistes",
  hard: "difficile : un interlocuteur pressé ou hostile, des difficultés qui s'enchaînent",
};

/**
 * La description d'un module, rédigée pour les générateurs : ce qu'ils
 * trouvaient dans le texte d'une offre (le poste, la situation, l'objectif).
 */
export function descriptionModule(m) {
  return [
    "MODULE D'ENTRAÎNEMENT (onboarding) — il ne s'agit PAS d'un recrutement : la personne est déjà embauchée et s'entraîne avant de rencontrer de vrais clients.",
    m?.target_role && `Rôle de la personne qui s'entraîne : ${m.target_role}`,
    m?.situation && `Situation à travailler : ${m.situation}`,
    m?.objective && `Objectif du module : ${m.objective}`,
    `Difficulté : ${DIFFICULTES[m?.difficulty] || DIFFICULTES.medium}`,
  ].filter(Boolean).join("\n");
}

/** Le module, sous la forme « job » que lit le moteur de simulation. */
export function jobDepuisModule(m) {
  if (!m) return null;
  return {
    id: null,
    module_id: m.id,
    user_id: m.created_by || null,
    organization_id: m.organization_id,
    title: m.title,
    description: descriptionModule(m),
    extracted_criteria: m.criteria || {},
    experience_locale: m.locale || "en",
  };
}

/**
 * La source d'une simulation lue avec SOURCE_EMBARQUEE : l'offre si elle en a
 * une, sinon son module ; null si aucune des deux.
 */
export function sourceDe(exp) {
  if (exp?.jobs) return exp.jobs;
  if (exp?.modules) return jobDepuisModule(exp.modules);
  return null;
}
