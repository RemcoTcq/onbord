// Estimation de la durée d'une expérience candidat.
//
// Module PUR, sans "use server" : il est appelé côté serveur (génération,
// démarrage d'un run) ET côté client (l'en-tête de l'éditeur, qui doit réagir
// avant tout aller-retour réseau). Même motif que jobPurge.js et candidateEntry.js.
//
// ── Pourquoi ce calcul remplace un nombre stocké ─────────────────────────────
// La durée venait du modèle, écrite une fois pour toutes dans
// experiences.estimated_minutes au moment de la génération. Elle ne bougeait
// plus jamais : supprimer deux étapes sur quatre laissait « ~15 min » affiché
// à l'identique, au candidat comme au recruteur. Un chiffre qui ne suit pas ce
// qu'on lui montre est pire que pas de chiffre du tout.
//
// L'estimation ci-dessous ne prétend pas à l'exactitude — aucune ne le peut,
// deux candidats ne mettent pas le même temps. Elle prétend à la COHÉRENCE :
// retirer une tâche doit faire baisser le total, et un exercice de code doit
// peser plus lourd qu'un QCM.

// Minutes par étape, selon ce que le candidat doit réellement PRODUIRE.
// Le sandbox prime sur le format : rédiger un email dans une boîte simulée ne
// coûte pas le même temps qu'une réponse libre de trois lignes.
const MINUTES_SANDBOX = {
  crm: 7,           // lire deux ou trois sources désordonnées, puis remplir la fiche
  code: 8,          // lire l'énoncé, écrire, lancer les tests, corriger
  document: 5,
  email: 5,
  client_reply: 4,
};

const MINUTES_FORMAT = {
  qcm: 1,
  choice: 1,
  video: 3,         // une prise, rarement plus, sur une consigne courte
  code: 8,
  text: 4,
};

// Une étape qui ouvre l'assistant ne se contente pas d'être répondue : elle est
// lue, questionnée, relue. Un forfait modeste, pas un multiplicateur.
const MINUTES_ASSISTANT = 1;

/** Durée d'UNE étape, en minutes. */
export function minutesEtape(step) {
  if (!step) return 0;
  // Étape qualificative : un filtre administratif d'une ligne (langue, permis,
  // disponibilité). Elle ne demande aucune production.
  if (step.kind === "qualifying") return 1;

  const sandbox = MINUTES_SANDBOX[step.sandbox_kind];
  const format = MINUTES_FORMAT[step.response_format] ?? MINUTES_FORMAT.text;
  let minutes = sandbox ?? format;

  // Une "question" en texte libre appelle une réponse courte, là où une "task"
  // demande un livrable. Même format, effort différent.
  if (step.kind === "question" && !sandbox && step.response_format === "text") minutes = 2;

  if (step.ai_assistant_allowed) minutes += MINUTES_ASSISTANT;
  return minutes;
}

/**
 * Durée totale d'une expérience, arrondie au multiple de 5 supérieur.
 *
 * L'arrondi n'est pas cosmétique : « ~20 min » est une promesse qu'on tient,
 * « 23 min » affiche une précision qu'on n'a pas. Au multiple SUPÉRIEUR, parce
 * qu'une évaluation qui déborde de son annonce est bien plus coûteuse pour le
 * candidat qu'une qui se termine en avance.
 *
 * @param {Array<object>} steps étapes de l'expérience
 * @returns {number|null} minutes, ou null si l'expérience n'a aucune étape
 */
export function estimerMinutes(steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  const total = steps.reduce((n, s) => n + minutesEtape(s), 0);
  return Math.max(5, Math.ceil(total / 5) * 5);
}
