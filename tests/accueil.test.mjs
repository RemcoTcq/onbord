// L'accueil (17/11/2026) : la liste « À faire » et les résumés, lib/accueil.js.
import test from "node:test";
import assert from "node:assert/strict";
import { calculerAFaire, estADecider } from "../src/lib/accueil.js";

const maintenant = new Date("2026-11-17T12:00:00Z");
const ilYa = (jours) => new Date(maintenant.getTime() - jours * 86400000).toISOString();

test("accueil : un candidat est à décider s'il a terminé et que personne n'a tranché", () => {
  assert.equal(estADecider({ status: "scored", score_global: 70 }), true);
  assert.equal(estADecider({ status: "soumis", assessment_submitted_at: ilYa(1) }), true);
  assert.equal(estADecider({ status: "shortlisted", score_global: 80 }), false);
  assert.equal(estADecider({ status: "rejected", score_global: 20 }), false);
  assert.equal(estADecider({ status: "invited" }), false);
});

test("accueil : chaque situation donne sa ligne, et une seule personne mène à sa fiche", () => {
  const learners = [
    { id: "a", nom: "Ana", lifecycle: "onboarding" },
    { id: "b", nom: "Bob", lifecycle: "onboarding" },
    { id: "c", nom: "Cléo", lifecycle: "ready" },
    { id: "d", nom: "Dan", lifecycle: "onboarding" },
  ];
  const assignations = [
    { id: "x1", learner_id: "a", status: "passed", created_at: ilYa(2) },
    { id: "x2", learner_id: "b", status: "validated", created_at: ilYa(20) },
    { id: "x3", learner_id: "c", status: "validated", created_at: ilYa(20) },
    { id: "x4", learner_id: "d", status: "in_progress", due_at: ilYa(1), created_at: ilYa(30) },
    { id: "x5", learner_id: "a", status: "assigned", created_at: ilYa(1) },
  ];
  const essais = [
    ...[1, 2, 3].map((i) => ({ learner_id: "d", assignment_id: "x4", status: "scored", started_at: ilYa(10 + i) })),
    { learner_id: "a", assignment_id: "x1", status: "scored", started_at: ilYa(2) },
  ];
  const lignes = calculerAFaire({
    candidats: [{ status: "scored", score_global: 60 }, { status: "shortlisted", score_global: 90 }],
    simulations: [{ status: "pending_review", href: "/onboarding/modules/m1" }, { status: "published", href: "/jobs/j1/experience" }],
    learners, assignations, essais, maintenant,
  });
  const parCle = Object.fromEntries(lignes.map((l) => [l.cle, l]));
  assert.deepEqual(lignes.map((l) => l.cle), ["candidatesToReview", "attemptsToValidate", "readyToDeclare", "overdue", "struggling", "inactive", "toPublish"]);
  assert.equal(parCle.candidatesToReview.n, 1);
  assert.deepEqual(parCle.attemptsToValidate, { cle: "attemptsToValidate", n: 1, noms: ["Ana"], href: "/onboarding/personnes/a" });
  assert.deepEqual(parCle.readyToDeclare.noms, ["Bob"], "Cléo est déjà déclarée prête");
  assert.deepEqual(parCle.overdue.noms, ["Dan"]);
  assert.deepEqual(parCle.struggling.noms, ["Dan"]);
  assert.deepEqual(parCle.inactive.noms, ["Dan"], "Ana a essayé il y a 2 jours");
  assert.equal(parCle.toPublish.href, "/onboarding/modules/m1");
});

test("accueil : rien à faire, aucune ligne ; plusieurs personnes mènent à la liste", () => {
  assert.deepEqual(calculerAFaire({ maintenant }), []);
  const learners = ["a", "b", "c", "d"].map((id) => ({ id, nom: id.toUpperCase(), lifecycle: "onboarding" }));
  const assignations = learners.map((l, i) => ({ id: `x${i}`, learner_id: l.id, status: "passed", created_at: ilYa(1) }));
  const [l] = calculerAFaire({ learners, assignations, maintenant });
  assert.equal(l.n, 4);
  assert.equal(l.noms.length, 3);
  assert.equal(l.href, "/onboarding/personnes");
});

test("onboarding : l'étape vers les vrais clients", async () => {
  const { etapeVersClients } = await import("../src/lib/accueil.js");
  assert.equal(etapeVersClients({ lifecycle: "ready", assignes: 5, valides: 1 }), "ready");
  assert.equal(etapeVersClients({ lifecycle: "onboarding", assignes: 5, valides: 3 }), "almost");
  assert.equal(etapeVersClients({ lifecycle: "onboarding", assignes: 2, valides: 2 }), "almost");
  assert.equal(etapeVersClients({ lifecycle: "onboarding", assignes: 5, valides: 2 }), "onboarding");
  assert.equal(etapeVersClients({ lifecycle: "onboarding", assignes: 1, valides: 0 }), "onboarding", "rien de validé : pas encore presque prête");
  assert.equal(etapeVersClients({ lifecycle: "onboarding", assignes: 0, valides: 0 }), "onboarding");
});

test("onboarding : ce qui bloque nomme la simulation en cause, retards d'abord", async () => {
  const { blocages } = await import("../src/lib/accueil.js");
  const b = blocages({
    learners: [{ id: "a", nom: "Ana" }, { id: "b", nom: "Bob" }],
    assignations: [
      { id: "x1", learner_id: "a", module_id: "m1", status: "in_progress", created_at: ilYa(20) },
      { id: "x2", learner_id: "b", module_id: "m2", status: "assigned", due_at: ilYa(2), created_at: ilYa(3) },
      { id: "x3", learner_id: "b", module_id: "m1", status: "validated", due_at: ilYa(5), created_at: ilYa(30) },
    ],
    essais: [1, 2, 3].map((i) => ({ learner_id: "a", assignment_id: "x1", status: "scored", started_at: ilYa(10 + i) })),
    titres: new Map([["m1", "Objection prix"], ["m2", "Facture contestée"]]),
    maintenant,
  });
  assert.deepEqual(b.map((x) => [x.nom, x.raison, x.module || null]), [
    ["Bob", "overdue", "Facture contestée"],
    ["Ana", "struggling", "Objection prix"],
    ["Ana", "inactive", null],
  ]);
  assert.equal(b[2].jours, 11);
});
