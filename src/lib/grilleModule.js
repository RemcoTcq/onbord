// La GRILLE DE NOTATION d'une simulation d'onboarding, éditée à la main
// (16/11/2026) — module PUR, testé par tests/onboarding.test.mjs.
//
// Ce que le manager édite :
//   • les COMPÉTENCES de la simulation (nom, indispensable ou atout) — elles
//     vivent dans `modules.criteria`, au format des offres ;
//   • les CRITÈRES de l'étape (ses sous-dimensions) : nom, compétences notées,
//     et leurs POINTS DE CONTRÔLE, chacun noté 0, 1 ou 2.
//
// Une compétence est identifiée par son nom (competenceId) : la renommer
// change son identifiant. L'écran désigne donc chaque compétence par une clé
// qui lui est propre (`cle`), et c'est ici que les critères sont rebranchés
// sur les identifiants recalculés — un renommage ne casse aucun lien.

import { listerCompetences, normaliserCritere, competenceId, CHECKPOINTS_MAX, MUST } from "./competences.js";

const net = (s) => String(s ?? "").trim();

/**
 * La grille d'une étape et de son module, prête à l'écran : chaque compétence
 * et chaque point ont une clé stable pour l'édition.
 * @param {object} criteria `modules.criteria`
 * @param {Array} criteres `experience_steps.criteria`
 */
export function grillePourEdition(criteria, criteres) {
  // `type` : une compétence « savoir-être » (soft_skills) garde son type, donc
  // son préfixe d'identifiant — les autres étapes qui la notent restent liées.
  const competences = listerCompetences(criteria).map((c) => ({ cle: c.id, name: c.name, priority: c.tier, type: c.type }));
  return {
    competences,
    criteres: (criteres || []).filter((c) => Array.isArray(c?.checkpoints)).map((c, i) => ({
      cle: `c${i}`,
      name: c.name || "",
      skills: (c.skill_ids || []).filter((id) => competences.some((x) => x.cle === id)),
      checkpoints: c.checkpoints.map((cp, j) => ({ cle: `c${i}p${j}`, description: cp.description || "" })),
    })),
  };
}

/**
 * Applique la grille éditée. Rend ce qu'il faut écrire en base, ou une erreur
 * à montrer.
 * @param {{ competences: Array<{cle, name, priority}>, criteres: Array<{name, skills: string[], checkpoints: Array<{description}>}> }} grille
 * @returns {{ erreur?: string, criteria?: object, stepCriteria?: Array, skills_tested?: string[], targets_skills?: string[], skill_assessed?: string }}
 */
export function appliquerGrille(grille) {
  // Les compétences, dédoublonnées par nom : deux lignes au même nom n'en font qu'une.
  const parCle = new Map();
  const vus = new Map();
  const criteria = { hard_skills: [], soft_skills: [] };
  for (const c of grille?.competences || []) {
    const name = net(c.name).slice(0, 120);
    const type = c.type === "soft_skills" ? "soft_skills" : "hard_skills";
    const id = competenceId(type, name);
    if (!id) continue;
    if (!vus.has(id)) {
      vus.set(id, true);
      criteria[type].push({ name, priority: c.priority === "nice_to_have" ? "nice_to_have" : "must_have", evidence: "" });
    }
    parCle.set(c.cle, id);
  }
  if (!vus.size) return { erreur: "competenceManquante" };
  const liste = listerCompetences(criteria);

  const stepCriteria = [];
  for (const c of grille?.criteres || []) {
    const ids = [...new Set((c.skills || []).map((cle) => parCle.get(cle)).filter(Boolean))];
    const points = (c.checkpoints || []).map((cp) => ({ description: net(cp.description).slice(0, 500) })).filter((cp) => cp.description);
    // Un critère sans aucun point ne note rien : il est écarté.
    if (!points.length) continue;
    const critere = normaliserCritere({ name: net(c.name).slice(0, 160), skill_ids: ids, checkpoints: points }, ids, liste);
    if (!critere) continue;
    if (!critere.name) return { erreur: "critereSansNom" };
    if (!critere.skill_ids.length) return { erreur: "critereSansCompetence" };
    stepCriteria.push(critere);
  }
  if (!stepCriteria.length) return { erreur: "critereManquant" };

  const skills_tested = [...new Set(stepCriteria.flatMap((c) => [...c.skill_ids, ...c.checkpoints.map((cp) => cp.skill_id).filter(Boolean)]))];
  const noms = new Map(liste.map((c) => [c.id, c.name]));
  return {
    criteria,
    stepCriteria,
    skills_tested,
    targets_skills: skills_tested.map((id) => noms.get(id)).filter(Boolean),
    skill_assessed: noms.get(stepCriteria[0].skill_ids[0]) || "",
  };
}

/**
 * Combien de points de contrôle notent chaque compétence (clé → nombre). Une
 * compétence indispensable à 0 n'est pas évaluée : l'écran le signale.
 */
export function couvertureGrille(grille) {
  const out = new Map((grille?.competences || []).map((c) => [c.cle, 0]));
  for (const c of grille?.criteres || []) {
    const points = (c.checkpoints || []).filter((cp) => net(cp.description)).length;
    for (const cle of c.skills || []) if (out.has(cle)) out.set(cle, out.get(cle) + points);
  }
  return out;
}

export { CHECKPOINTS_MAX, MUST };
