/**
 * Source unique de vérité pour le calcul du score global d'un candidat.
 *
 * Ces fonctions sont PURES (aucun accès DB, aucun effet de bord) afin de pouvoir
 * être appelées indifféremment depuis les server actions et les route handlers.
 * Toute écriture de `score_global` DOIT passer par `computeGlobalScore` pour
 * éviter que plusieurs chemins ne divergent (bug historique : la route entretien
 * utilisait une pondération 40/60 différente des autres chemins).
 *
 * Pondération de référence (proportionnelle) : seuls les modules activés ET
 * effectivement scorés comptent ; les poids sont renormalisés sur le total actif.
 */
export const GLOBAL_SCORE_WEIGHTS = { cv: 10, tests: 50, interview: 40, video: 40 };

/**
 * Quels modules du parcours hérité sont actifs pour une offre ?
 *
 * Centralisé ici pour la même raison que `computeGlobalScore` : ces défauts
 * étaient recopiés dans cinq fichiers, et le scoring CV y valait `?? true` —
 * un module allumé sur toute offre sans configuration. Un candidat pouvait
 * ainsi se voir réclamer un CV sans que personne l'ait demandé, et ce score
 * entrait dans la pondération globale. Le défaut est désormais FALSE partout :
 * un module doit être choisi explicitement.
 *
 * Les autres défauts (`?? false`) et le repli entretien sur `ai_interview_config`
 * sont conservés à l'identique — seul le défaut CV change.
 *
 * @param {object} job ligne `jobs` (avec assessment_config et ai_interview_config)
 */
export function resolveEnabledModules(job) {
  const modules = job?.assessment_config?.modules || {};
  return {
    cv: modules.cv_scoring?.enabled ?? false,
    tests: modules.skills_tests?.enabled ?? false,
    interview: modules.ai_interview?.enabled ?? job?.ai_interview_config?.enabled ?? false,
    video: modules.video_interview?.enabled ?? false,
    qualifying: modules.qualifying_questions?.enabled ?? false,
  };
}

/**
 * Agrège les réponses d'entretien vidéo en un score /100 + un état de complétude.
 * La vidéo n'est jamais scorée sur du vide : `scoreVideo` reste null tant qu'aucune
 * réponse n'est évaluée, et `is_complete` n'est vrai que si TOUTES le sont.
 *
 * @param {Array<{ai_score:number|null, status:string}>} videoResps
 * @returns {{ scoreVideo: number|null, videoCompleteness: {evaluated:number,total:number,is_complete:boolean}|null }}
 */
export function aggregateVideoScore(videoResps) {
  if (!videoResps || videoResps.length === 0) {
    return { scoreVideo: null, videoCompleteness: null };
  }

  const evaluated = videoResps.filter((r) => r.status === "evaluated" && r.ai_score != null);
  const total = videoResps.length;

  const videoCompleteness = {
    evaluated: evaluated.length,
    total,
    is_complete: evaluated.length === total,
  };

  const scoreVideo = evaluated.length > 0
    ? Math.round(evaluated.reduce((sum, r) => sum + r.ai_score, 0) / evaluated.length)
    : null;

  return { scoreVideo, videoCompleteness };
}

/**
 * Calcule le score global proportionnel à partir des scores de chaque module.
 *
 * La vidéo n'est comptabilisée que si elle est complète (toutes les réponses
 * évaluées) — sinon elle est exclue de la pondération, exactement comme avant.
 *
 * @returns {number|null} score global 0-100, ou null si aucun module scoré.
 */
export function computeGlobalScore({
  cvEnabled,
  scoreCv,
  testsEnabled,
  scoreTests,
  interviewEnabled,
  scoreInterview,
  videoEnabled,
  scoreVideo,
  videoCompleteness,
}) {
  // Vidéo comptabilisée SEULEMENT si complète
  const videoForGlobal = (videoCompleteness?.is_complete && scoreVideo != null)
    ? scoreVideo
    : null;

  const W = GLOBAL_SCORE_WEIGHTS;
  const active = {};
  if (cvEnabled && scoreCv != null) active.cv = W.cv;
  if (testsEnabled && scoreTests != null) active.tests = W.tests;
  if (interviewEnabled && scoreInterview != null) active.interview = W.interview;
  if (videoEnabled && videoForGlobal != null) active.video = W.video;

  const totalBase = Object.values(active).reduce((s, w) => s + w, 0);
  if (totalBase <= 0) return null;

  let weighted = 0;
  if (active.cv) weighted += (scoreCv * active.cv) / totalBase;
  if (active.tests) weighted += (scoreTests * active.tests) / totalBase;
  if (active.interview) weighted += (scoreInterview * active.interview) / totalBase;
  if (active.video) weighted += (videoForGlobal * active.video) / totalBase;

  return Math.round(weighted);
}
