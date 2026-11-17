// La liste des simulations (17/11/2026) : les règles pures derrière les
// colonnes de /simulations. La lecture en base vit dans lib/actions/simulations.js.

import { aTermine } from "./accueil.js";

/** La version courante de chaque simulation : la plus récente non archivée, par `cle` (job_id ou module_id). */
export function versionsCourantes(experiences, cle) {
  const out = new Map();
  for (const e of experiences || []) {
    if (e.status === "archived") continue;
    const k = e[cle];
    if (!out.has(k) || e.created_at > out.get(k).created_at) out.set(k, e);
  }
  return out;
}

/**
 * L'état affiché d'une simulation. Une offre sans simulation est « à
 * construire » ; une offre fermée ou en brouillon le dit avant l'état de sa
 * simulation, parce que c'est ce qui décide si des candidats peuvent la passer.
 */
export function etatSimulation({ usage, statutOffre = null, experience = null }) {
  if (!experience) return "toBuild";
  if (usage === "hiring" && statutOffre === "closed") return "jobClosed";
  if (usage === "hiring" && statutOffre === "draft") return "jobDraft";
  return ["draft", "pending_review", "published"].includes(experience.status) ? experience.status : "draft";
}

const moyenne = (notes) => {
  const n = notes.filter((x) => typeof x === "number" && Number.isFinite(x));
  return n.length ? Math.round(n.reduce((s, x) => s + x, 0) / n.length) : null;
};

/** Recrutement : combien ont terminé la simulation, sur combien d'invités, et leur note moyenne. */
export function passagesOffre(candidats) {
  const termines = (candidats || []).filter(aTermine);
  return { faits: termines.length, total: (candidats || []).length, moyenne: moyenne(termines.map((c) => c.score_global)) };
}

/**
 * Onboarding : combien de personnes ont au moins un essai noté, sur combien
 * d'assignées, et la moyenne de leur meilleure note. Les tests du manager ne
 * passent pas par une assignation : ils ne comptent pas.
 */
export function passagesModule(assignations) {
  const essayees = (assignations || []).filter((a) => a.best_score != null || a.status === "passed" || a.status === "validated");
  return { faits: essayees.length, total: (assignations || []).length, moyenne: moyenne(essayees.map((a) => a.best_score)) };
}
