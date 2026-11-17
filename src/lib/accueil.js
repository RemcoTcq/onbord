// L'ACCUEIL de la plateforme (17/11/2026) — module PUR, testé par
// tests/accueil.test.mjs. Les données sont lues par lib/actions/accueil.js.
//
// L'accueil dit d'abord ce qui ATTEND UNE ACTION, sur les deux métiers à la
// fois, puis résume chacun. Les vues d'ensemble (/recrutement, /onboarding)
// portent le détail.

// Un candidat qui a terminé et dont personne n'a encore décidé du sort.
export const STATUTS_DECIDES = ["shortlisted", "next_step", "rejected", "disqualified"];
export const ESSAIS_AVANT_ALERTE = 3;
export const JOURS_INACTIVITE = 7;
const JOUR = 24 * 60 * 60 * 1000;

export function aTermine(c) {
  return Boolean(c?.assessment_submitted_at) || c?.score_global != null;
}

export function estADecider(c) {
  return aTermine(c) && !STATUTS_DECIDES.includes(c.status);
}

const ouverte = (a) => a.status === "assigned" || a.status === "in_progress";

/** Une ligne « À faire » qui nomme des personnes : le lien mène à la seule, ou à la liste. */
function parPersonnes(cle, ids, noms, hrefPersonne, hrefListe) {
  const uniques = [...new Set(ids)];
  if (!uniques.length) return null;
  return {
    cle,
    n: uniques.length,
    noms: uniques.slice(0, 3).map((id) => noms.get(id) || "—"),
    href: uniques.length === 1 ? hrefPersonne(uniques[0]) : hrefListe,
  };
}

/**
 * La liste « À faire », la plus urgente d'abord. Chaque ligne : { cle, n,
 * noms?, href } — le texte se compose à l'écran (dashboard.home.todo.<cle>).
 * @param {{ candidats: Array, simulations: Array, learners: Array<{id, nom, lifecycle}>,
 *           assignations: Array, essais: Array, maintenant?: Date }} d
 */
export function calculerAFaire({ candidats = [], simulations = [], learners = [], assignations = [], essais = [], maintenant = new Date() }) {
  const t = maintenant.getTime();
  const noms = new Map(learners.map((l) => [l.id, l.nom]));
  const estLearner = new Set(learners.map((l) => l.id));
  const assig = assignations.filter((a) => estLearner.has(a.learner_id));
  const personne = (id) => `/onboarding/personnes/${id}`;
  const lignes = [];

  // 1. Recrutement : des candidats ont fini, personne n'a tranché.
  const aDecider = candidats.filter(estADecider);
  if (aDecider.length) lignes.push({ cle: "candidatesToReview", n: aDecider.length, href: "/candidats" });

  // 2. Onboarding : un essai a passé le seuil, la validation attend le manager.
  lignes.push(parPersonnes("attemptsToValidate", assig.filter((a) => a.status === "passed").map((a) => a.learner_id), noms, personne, "/onboarding/personnes"));

  // 3. Tout est validé, la personne n'est pas encore déclarée prête.
  const pretes = learners.filter((l) => {
    if (l.lifecycle === "ready") return false;
    const siennes = assig.filter((a) => a.learner_id === l.id);
    return siennes.length > 0 && siennes.every((a) => a.status === "validated");
  });
  lignes.push(parPersonnes("readyToDeclare", pretes.map((l) => l.id), noms, personne, "/onboarding/personnes"));

  // 4. Échéance dépassée sur une simulation encore ouverte.
  lignes.push(parPersonnes("overdue", assig.filter((a) => ouverte(a) && a.due_at && new Date(a.due_at).getTime() < t).map((a) => a.learner_id), noms, personne, "/onboarding/personnes"));

  // 5. Plusieurs essais notés sur la même simulation, toujours sous le seuil.
  const notesParAssignation = new Map();
  for (const e of essais) {
    if (!e.assignment_id || e.status !== "scored") continue;
    notesParAssignation.set(e.assignment_id, (notesParAssignation.get(e.assignment_id) || 0) + 1);
  }
  lignes.push(parPersonnes("struggling", assig.filter((a) => ouverte(a) && (notesParAssignation.get(a.id) || 0) >= ESSAIS_AVANT_ALERTE).map((a) => a.learner_id), noms, personne, "/onboarding/personnes"));

  // 6. Des simulations à faire, aucun essai depuis une semaine.
  const dernierEssai = new Map();
  for (const e of essais) {
    const d = new Date(e.started_at || 0).getTime();
    if (d > (dernierEssai.get(e.learner_id) || 0)) dernierEssai.set(e.learner_id, d);
  }
  const limite = t - JOURS_INACTIVITE * JOUR;
  const inactifs = learners.filter((l) => {
    const ouvertes = assig.filter((a) => a.learner_id === l.id && ouverte(a));
    if (!ouvertes.length) return false;
    const depuis = Math.max(dernierEssai.get(l.id) || 0, ...ouvertes.map((a) => new Date(a.created_at || 0).getTime()));
    return depuis < limite;
  });
  lignes.push(parPersonnes("inactive", inactifs.map((l) => l.id), noms, personne, "/onboarding/personnes"));

  // 7. Des simulations générées, jamais publiées.
  const aPublier = simulations.filter((s) => s.status === "pending_review" || s.status === "draft");
  if (aPublier.length) lignes.push({ cle: "toPublish", n: aPublier.length, href: aPublier.length === 1 ? aPublier[0].href : "/simulations" });

  return lignes.filter(Boolean);
}

/** Les deux résumés de l'accueil. */
export function resumer({ jobs = [], candidats = [], learners = [], assignations = [], essais = [], maintenant = new Date() }) {
  const semaine = maintenant.getTime() - 7 * JOUR;
  const notes = essais.filter((e) => e.note != null).map((e) => e.note);
  return {
    recrutement: {
      offres: jobs.filter((j) => j.status === "active").length,
      enCours: candidats.filter((c) => !aTermine(c) && c.assessment_status === "in_progress").length,
      terminesSemaine: candidats.filter((c) => c.assessment_submitted_at && new Date(c.assessment_submitted_at).getTime() >= semaine).length,
      aDecider: candidats.filter(estADecider).length,
    },
    onboarding: {
      personnes: learners.length,
      pretes: learners.filter((l) => l.lifecycle === "ready").length,
      moyenne: notes.length ? Math.round(notes.reduce((s, n) => s + n, 0) / notes.length) : null,
      validees: assignations.filter((a) => a.status === "validated").length,
      assignees: assignations.length,
    },
  };
}
