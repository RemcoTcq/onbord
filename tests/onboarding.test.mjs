// Phases 3 à 5 de l'onboarding : ce que devient une assignation après un essai, le
// retour par compétence, la progression d'un essai à l'autre, et les e-mails
// aux learners. Lancé par `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { issueEssai, parCompetence, progressionCompetences, adresseDeTest, lacunesDuRecrutement, compterLearnersActifs } from "../src/lib/essais.js";
import { emailNouveauxModules, emailModuleValide, emailInvitation } from "../src/lib/emailsApplication.js";

const T = "2026-11-10T12:00:00.000Z";

test("essai sous le seuil : en cours, meilleur score retenu", () => {
  const { maj, valideMaintenant } = issueEssai({ assignation: { status: "assigned", best_score: null }, overall: 55, minScore: 70, maintenant: T });
  assert.deepEqual(maj, { best_score: 55, updated_at: T, status: "in_progress" });
  assert.equal(valideMaintenant, false);
});

test("seuil atteint : « passed », c'est le manager qui valide", () => {
  const { maj, valideMaintenant } = issueEssai({ assignation: { status: "in_progress", best_score: 55 }, overall: 74, minScore: 70, maintenant: T });
  assert.equal(maj.status, "passed");
  assert.equal(maj.passed_at, T);
  assert.equal(maj.best_score, 74);
  assert.equal(valideMaintenant, false);
});

test("validation automatique : le seuil atteint valide directement", () => {
  const { maj, valideMaintenant } = issueEssai({ assignation: { status: "in_progress" }, overall: 80, minScore: 70, autoValidate: true, maintenant: T });
  assert.equal(maj.status, "validated");
  assert.equal(maj.validated_at, T);
  assert.equal(maj.validated_by, null);
  assert.equal(valideMaintenant, true);
});

test("un essai raté après coup ne défait rien", () => {
  const passe = issueEssai({ assignation: { status: "passed", best_score: 82, passed_at: "2026-11-01" }, overall: 40, minScore: 70, maintenant: T });
  assert.equal(passe.maj.status, undefined);
  assert.equal(passe.maj.best_score, 82);
  const valide = issueEssai({ assignation: { status: "validated", best_score: 82 }, overall: 95, minScore: 70, autoValidate: true, maintenant: T });
  assert.equal(valide.maj.status, undefined);
  assert.equal(valide.maj.best_score, 95);
  assert.equal(valide.valideMaintenant, false);
});

test("retour : regroupé par compétence, checkpoints non notés et citations douteuses retirés", () => {
  const groupes = parCompetence([
    { skill_name: "Découverte", sub_dimension_name: "Questions", score: 50, checkpoints: [
      { id: "cp1", description: "Demande le contexte", score: 2, justification: "Oui", verbatim: "Qu'utilisez-vous ?", verbatim_verified: true },
      { id: "cp2", description: "Reformule", score: 0, justification: "Non", verbatim: "inventé", verbatim_verified: false },
      { id: "cp3", description: "—", score: 0, not_scored: true },
    ] },
    { skill_name: "Découverte", sub_dimension_name: "Écoute", score: 70 },
    { skill_name: "Closing", sub_dimension_name: "Prochaine étape", score: null },
  ]);
  assert.equal(groupes.length, 2);
  assert.equal(groupes[0].nom, "Découverte");
  assert.equal(groupes[0].score, 60);
  assert.equal(groupes[0].dimensions[0].checkpoints.length, 2);
  assert.equal(groupes[0].dimensions[0].checkpoints[0].citation, "Qu'utilisez-vous ?");
  assert.equal(groupes[0].dimensions[0].checkpoints[1].citation, "");
  assert.equal(groupes[1].score, null);
  assert.deepEqual(parCompetence(null), []);
});

test("progression : premier et dernier score par compétence, les plus faibles d'abord", () => {
  const p = progressionCompetences([
    { date: "2026-11-01", competences: [{ nom: "Découverte", score: 40 }, { nom: "Closing", score: 80 }] },
    { date: "2026-11-03", competences: [{ nom: "Découverte", score: 65 }, { nom: "Closing", score: null }] },
  ]);
  assert.deepEqual(p.map((c) => [c.nom, c.premier, c.dernier, c.points.length]), [["Découverte", 40, 65, 2], ["Closing", 80, 80, 1]]);
});

test("adresses de test : jamais d'envoi vers un domaine réservé", () => {
  assert.equal(adresseDeTest("onbord-test-p0-learner@example.com"), true);
  assert.equal(adresseDeTest("a@b.test"), true);
  assert.equal(adresseDeTest("remco@onbord.be"), false);
  assert.equal(adresseDeTest("x@example.company.com"), false);
});

// Un `t()` minimal : la clé et les variables, pour vérifier ce qui est demandé.
const t = (cle, vars) => `${cle}${vars ? JSON.stringify(vars) : ""}`;

test("e-mail « nouveaux modules » : un paragraphe par module, compte au pluriel", () => {
  const m = emailNouveauxModules({ t, prenom: "Sam", organisation: "Acme", titres: ["Objection prix", "Client <fâché>"], lien: "https://app.onbord.be/en/training" });
  assert.match(m.subject, /newModules\.subject.*"count":2/);
  assert.match(m.text, /• Objection prix/);
  assert.match(m.html, /Client &lt;fâché&gt;/);
  assert.match(m.html, /href="https:\/\/app\.onbord\.be\/en\/training"/);
});

test("e-mail « module validé » : le module et le meilleur score", () => {
  const m = emailModuleValide({ t, prenom: "", organisation: "Acme", module: "Objection prix", score: 84, lien: "https://x" });
  assert.match(m.subject, /moduleValidated\.subject.*Objection prix/);
  assert.match(m.text, /helloAnonymous/);
  assert.match(m.text, /"score":84/);
});

test("lacunes du recrutement : points à 0 puis à 1, rien de maîtrisé ni de non noté", () => {
  const l = lacunesDuRecrutement([
    { skill_name: "Découverte", sub_dimension_name: "Questions", checkpoints: [
      { description: "Demande le budget", score: 1, justification: "Partiel" },
      { description: "Reformule", score: 2 },
      { description: "Hors sujet", score: 0, not_scored: true },
    ] },
    { skill_name: "Closing", sub_dimension_name: "Suite", checkpoints: [{ description: "Fixe une date", score: 0, justification: "Absent" }] },
    { skill_name: "Ton", sub_dimension_name: "Niveaux", score: 40 },
  ]);
  assert.deepEqual(l.map((x) => [x.competence, x.point, x.score]), [["Closing", "Fixe une date", 0], ["Découverte", "Demande le budget", 1]]);
  assert.equal(lacunesDuRecrutement(null).length, 0);
  const beaucoup = Array.from({ length: 30 }, (_, i) => ({ skill_name: "S", checkpoints: [{ description: `p${i}`, score: 0 }] }));
  assert.equal(lacunesDuRecrutement(beaucoup).length, 20);
});

test("invitation venue du recrutement : un paragraphe annonce le choix de partager", () => {
  const avec = emailInvitation({ t, organisation: "Acme", invitePar: "Sam", role: "learner", lien: "https://x", depuisRecrutement: true });
  const sans = emailInvitation({ t, organisation: "Acme", invitePar: "Sam", role: "learner", lien: "https://x" });
  assert.match(avec.text, /invitation.body_hiring/);
  assert.doesNotMatch(sans.text, /body_hiring/);
});

test("learners actifs : un essai commencé dans les 30 jours, par organisation", () => {
  const maintenant = Date.parse("2026-11-10T12:00:00Z");
  const parOrg = compterLearnersActifs(
    [{ user_id: "a", organization_id: "o1" }, { user_id: "b", organization_id: "o1" }, { user_id: "c", organization_id: "o2" }],
    [
      { learner_id: "a", started_at: "2026-11-01T00:00:00Z" },
      { learner_id: "a", started_at: "2026-11-02T00:00:00Z" },
      { learner_id: "b", started_at: "2026-09-01T00:00:00Z" },
      { learner_id: null, started_at: "2026-11-09T00:00:00Z" },
    ],
    maintenant,
  );
  assert.deepEqual(parOrg.get("o1"), { total: 2, actifs: 1 });
  assert.deepEqual(parOrg.get("o2"), { total: 1, actifs: 0 });
});
