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

// Un learner ACTIF (phase 5, base de la facturation de l'onboarding) : il a
// commencé au moins un essai dans les 30 derniers jours. Un compte invité qui
// ne s'entraîne pas ne compte pas.
export const FENETRE_LEARNER_ACTIF_JOURS = 30;

/**
 * Les learners de chaque organisation, et combien sont actifs.
 * @param {Array<{user_id: string, organization_id: string}>} learners
 * @param {Array<{learner_id: string, started_at: string}>} essais
 * @returns {Map<string, {total: number, actifs: number}>} par organisation
 */
export function compterLearnersActifs(learners, essais, maintenant = Date.now(), jours = FENETRE_LEARNER_ACTIF_JOURS) {
  const depuis = maintenant - jours * 86_400_000;
  const actifs = new Set((essais || [])
    .filter((e) => e.learner_id && new Date(e.started_at).getTime() >= depuis)
    .map((e) => e.learner_id));
  const parOrg = new Map();
  for (const l of learners || []) {
    const o = parOrg.get(l.organization_id) || { total: 0, actifs: 0 };
    o.total += 1;
    if (actifs.has(l.user_id)) o.actifs += 1;
    parOrg.set(l.organization_id, o);
  }
  return parOrg;
}

// Le TEST d'une simulation par celui qui la construit (manager ou admin) : il
// la joue en entier, comme la jouera la personne, et lit son retour avant de
// publier. Un test complet coûte un appel à la voix et une notation : un seul
// par simulation (décision de Remco du 16/11/2026).
export const TESTS_PAR_SIMULATION = 1;

/**
 * Un passage est-il un test ? Il a un compte (`learner_id`), mais ni
 * assignation ni numéro d'essai — un essai de learner a toujours les deux à sa
 * création, et garde son numéro si l'assignation est retirée ensuite.
 */
export function estUnTest(run) {
  return Boolean(run?.learner_id) && !run.assignment_id && run.attempt_number == null;
}

/**
 * Ce que peut faire celui qui veut tester : reprendre SON test en cours, en
 * lancer un, ou rien si le test de la simulation est déjà fait.
 * @param {Array<{id, learner_id, status}>} tests ceux de la simulation, toutes versions confondues
 * @returns {{ reprendre: string|null, autorise: boolean, restants: number }}
 */
export function droitDeTester(tests, userId, max = TESTS_PAR_SIMULATION) {
  const liste = tests || [];
  const enCours = liste.find((r) => r.status === "in_progress" && r.learner_id === userId);
  const restants = Math.max(0, max - liste.length);
  return { reprendre: enCours?.id || null, autorise: Boolean(enCours) || restants > 0, restants };
}
