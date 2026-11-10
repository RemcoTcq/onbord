// Les règles d'un ESSAI de learner — module PUR (phase 3 de l'onboarding),
// testé par tests/onboarding.test.mjs. Les actions (lib/actions/formation.js)
// et la mise à jour après notation (lib/assignations.js) s'en servent.

/**
 * Ce que devient une assignation après un essai noté `overall` (0-100).
 * Le meilleur score est retenu ; le seuil atteint la passe à « passed », ou
 * directement à « validated » si l'organisation valide automatiquement. Une
 * assignation validée le reste, et un seuil déjà atteint ne se perd pas.
 * @returns {{ maj: object, valideMaintenant: boolean }}
 */
export function issueEssai({ assignation, overall, minScore = 70, autoValidate = false, maintenant }) {
  const maj = { best_score: Math.max(assignation.best_score ?? 0, overall), updated_at: maintenant };
  let valideMaintenant = false;
  if (assignation.status !== "validated") {
    if (overall >= minScore) {
      maj.status = "passed";
      maj.passed_at = assignation.passed_at || maintenant;
      if (autoValidate) {
        Object.assign(maj, { status: "validated", validated_at: maintenant, validated_by: null });
        valideMaintenant = true;
      }
    } else if (!assignation.passed_at) {
      maj.status = "in_progress";
    }
  }
  return { maj, valideMaintenant };
}

/**
 * Les notes d'un essai (`run_scores.criterion_scores`) regroupées par
 * compétence, dans l'ordre de la grille. Les checkpoints non notés sont
 * retirés ; une citation que le correcteur n'a pas retrouvée dans la réponse
 * n'est pas montrée.
 */
export function parCompetence(criteres) {
  const groupes = new Map();
  for (const c of criteres || []) {
    const nom = c.skill_name || "—";
    if (!groupes.has(nom)) groupes.set(nom, []);
    groupes.get(nom).push({
      dimension: c.sub_dimension_name || "",
      score: c.score ?? null,
      justification: c.justification || "",
      checkpoints: (c.checkpoints || []).filter((cp) => !cp.not_scored).map((cp) => ({
        description: cp.description || "",
        score: cp.score,
        justification: cp.justification || "",
        citation: cp.verbatim_verified === false ? "" : (cp.verbatim || ""),
      })),
    });
  }
  return [...groupes].map(([nom, dims]) => {
    const notes = dims.map((d) => d.score).filter((s) => s != null);
    return { nom, score: notes.length ? Math.round(notes.reduce((x, y) => x + y, 0) / notes.length) : null, dimensions: dims };
  });
}

/**
 * La progression de chaque compétence d'un essai à l'autre. `essais` est dans
 * l'ordre chronologique, chacun avec `date` et `competences: [{nom, score}]`.
 * Les compétences les plus faibles d'abord : c'est ce qu'il faut travailler.
 */
export function progressionCompetences(essais) {
  const series = new Map();
  for (const e of essais || []) {
    for (const c of e.competences || []) {
      if (c.score == null) continue;
      if (!series.has(c.nom)) series.set(c.nom, []);
      series.get(c.nom).push({ date: e.date, score: c.score });
    }
  }
  return [...series].map(([nom, points]) => ({
    nom, points, premier: points[0].score, dernier: points[points.length - 1].score,
  })).sort((x, y) => x.dernier - y.dernier);
}

// Les domaines réservés (RFC 2606) ne reçoivent jamais rien : les comptes de
// test y vivent. Leur écrire ne ferait que des rebonds chez Resend.
const DOMAINES_RESERVES = /@(?:[^@]+\.)?(?:example\.(?:com|org|net)|test|invalid|localhost)$/i;

/** L'adresse est-elle sur un domaine réservé aux tests ? */
export function adresseDeTest(email) {
  return DOMAINES_RESERVES.test(String(email || "").trim());
}

/**
 * Les LACUNES d'une simulation de recrutement (phase 4) : les points de
 * contrôle notés 0 ou 1, les plus faibles d'abord, au plus `max`. C'est ce que
 * la nouvelle recrue accepte de partager, et ce sur quoi ses premiers modules
 * sont proposés.
 */
export function lacunesDuRecrutement(criteres, max = 20) {
  const lacunes = [];
  for (const c of criteres || []) {
    for (const cp of c.checkpoints || []) {
      if (cp.not_scored || (cp.score !== 0 && cp.score !== 1)) continue;
      lacunes.push({
        competence: c.skill_name || "",
        dimension: c.sub_dimension_name || "",
        point: cp.description || "",
        score: cp.score,
        justification: cp.justification || "",
      });
    }
  }
  return lacunes.filter((l) => l.point).sort((x, y) => x.score - y.score).slice(0, max);
}
