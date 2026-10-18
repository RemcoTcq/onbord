import { generateQualifyingQuestions } from "@/lib/recommendationEngine";
import { coerceExperienceLocale } from "@/lib/i18n/config";

// Questions de présélection d'une offre — le premier temps du parcours
// candidat, avant la simulation.
//
// Elles vivent dans `jobs.saved_flow_nodes`, dans un nœud de type
// "qualifying_questions" : c'est là que le parcours candidat les lit
// (getQualifyingQuestions, lib/actions/run.js). L'éditeur visuel de pipeline
// qui gérait ces nœuds a disparu (octobre 2026) ; on garde le format, pour que
// les offres déjà publiées continuent de fonctionner sans migration.
//
// Module PUR : appelé à la création d'une offre (client) comme sur sa fiche.

export const TYPE_QUESTIONS = "qualifying_questions";

/**
 * Questions proposées par défaut, tirées des critères de l'offre (langues,
 * expérience, diplôme, lieu). Identifiants indexés : deux appels successifs
 * donnent les mêmes questions.
 */
export function questionsParDefaut(jobData, locale = "fr") {
  return generateQualifyingQuestions(jobData || {}, coerceExperienceLocale(locale))
    .map((q, i) => ({ ...q, id: `q_${i}` }));
}

/** Les questions d'une offre : son nœud, sinon l'ancienne configuration. */
export function questionsDuJob(job) {
  const noeud = (job?.saved_flow_nodes || []).find((n) => n.type === TYPE_QUESTIONS);
  if (Array.isArray(noeud?.config?.questions)) return noeud.config.questions;
  const legacy = job?.assessment_config?.modules?.qualifying_questions;
  if (legacy?.enabled && Array.isArray(legacy.questions)) return legacy.questions;
  return [];
}

/**
 * Les nœuds à enregistrer après modification des questions : le nœud des
 * questions remplacé (ou ajouté), les autres nœuds laissés tels quels — le
 * message d'accueil d'une ancienne offre, par exemple, reste lu par le candidat.
 */
export function noeudsAvecQuestions(noeuds, questions) {
  const config = { enabled: questions.length > 0, questions };
  const liste = Array.isArray(noeuds) ? noeuds : [];
  const existe = liste.some((n) => n.type === TYPE_QUESTIONS);
  if (existe) {
    return liste.map((n) => (n.type === TYPE_QUESTIONS ? { ...n, config: { ...n.config, ...config }, v2: true } : n));
  }
  return [...liste, { id: TYPE_QUESTIONS, type: TYPE_QUESTIONS, v2: true, config }];
}
