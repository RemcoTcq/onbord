// Le parcours de recrutement, sur ce qui se teste sans base ni modèle :
// la liste des compétences, la notation 0/1/2 des checkpoints, la note
// pondérée, l'aiguillage d'entrée du candidat, et ce que le candidat voit du
// personnage. Lancé par `npm test` (node:test, sans dépendance).
//
// Ces tests figent le comportement d'AVANT l'onboarding : la phase 0 et les
// suivantes ne doivent rien y changer (docs/PLAN.md, §4).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  competenceId, listerCompetences, resoudreIds, normaliserCritere,
  pourcentageCheckpoints, moyennePonderee, poidsEtape, MUST, NICE,
} from "../src/lib/competences.js";
import { entryFor, entryIsOpen, resolveJobEntry } from "../src/lib/candidateEntry.js";
import { normaliserPersona, personaPourCandidat } from "../src/lib/persona.js";

const CRITERIA = {
  hard_skills: [
    { name: "Prospection", priority: "must_have" },
    { name: "Négociation", priority: "nice_to_have" },
    { name: "prospection", priority: "nice_to_have" }, // doublon : ignoré
  ],
  soft_skills: [{ name: "Écoute active", priority: "ambiguous" }],
};

test("identifiant de compétence : dérivé du nom, préfixé par le type", () => {
  assert.equal(competenceId("hard_skills", "Négociation"), "h:negociation");
  assert.equal(competenceId("soft_skills", "Écoute active"), "s:ecoute-active");
  assert.equal(competenceId("hard_skills", "   "), null);
});

test("liste canonique : doublons écartés, « ambiguous » vaut must-have", () => {
  const liste = listerCompetences(CRITERIA);
  assert.deepEqual(liste.map((c) => c.id), ["h:prospection", "h:negociation", "s:ecoute-active"]);
  assert.deepEqual(liste.map((c) => c.tier), [MUST, NICE, MUST]);
});

test("résolution des compétences : par identifiant, ou par nom en repli", () => {
  const liste = listerCompetences(CRITERIA);
  assert.deepEqual(resoudreIds(["h:negociation", "Écoute active", "inconnue"], liste), ["h:negociation", "s:ecoute-active"]);
});

test("critère à checkpoints : identifiants posés par le code, au plus 5", () => {
  const liste = listerCompetences(CRITERIA);
  const c = normaliserCritere({
    name: "Découverte",
    skill_ids: ["h:prospection"],
    checkpoints: ["a", "b", "", "c", "d", "e", "f"],
  }, [], liste);
  assert.deepEqual(c.checkpoints.map((cp) => cp.id), ["cp1", "cp2", "cp3", "cp4", "cp5"]);
  assert.deepEqual(c.skill_ids, ["h:prospection"]);
});

test("checkpoints notés 0, 1 ou 2 : pourcentage du maximum", () => {
  assert.equal(pourcentageCheckpoints([2, 2, 2]), 100);
  assert.equal(pourcentageCheckpoints([2, 1, 0]), 50);
  assert.equal(pourcentageCheckpoints([]), 0);
});

test("note finale : must-have compté double, importance d'étape appliquée", () => {
  assert.equal(moyennePonderee([{ score: 100, tier: MUST }, { score: 40, tier: NICE }]), 80);
  // Sans tier connu, tout pèse comme un must-have : la moyenne simple.
  assert.equal(moyennePonderee([{ score: 100 }, { score: 50 }]), 75);
  // Une étape ×2 pèse deux fois plus.
  assert.equal(moyennePonderee([{ score: 100, tier: MUST, facteur: 2 }, { score: 40, tier: MUST }]), 80);
  assert.equal(moyennePonderee([]), null);
  assert.equal(poidsEtape({ config: { poids_etape: 1.5 } }), 1.5);
  assert.equal(poidsEtape({ config: { poids_etape: 7 } }), 1);
});

test("entrée du candidat : ouverte seulement avec une simulation publiée", () => {
  assert.equal(entryFor({ job: { id: "j" }, hasPublishedExperience: true }), "experience");
  assert.equal(entryFor({ job: { id: "j" }, hasPublishedExperience: false }), "not_ready");
  assert.equal(entryFor({ job: null, hasPublishedExperience: false }), "invalid");
  assert.equal(entryIsOpen("experience"), true);
  assert.equal(entryIsOpen("not_ready"), false);
});

/** Une base factice : `jobs` et `experiences`, lues comme par supabase-js. */
function baseFactice({ job, experience }) {
  return {
    from(table) {
      const ligne = table === "jobs" ? job : experience;
      const q = {
        select: () => q, eq: () => q, is: () => q, limit: () => q,
        maybeSingle: async () => ({ data: ligne || null }),
      };
      return q;
    },
  };
}

test("entrée par l'offre : offre en corbeille ou inconnue = invalide", async () => {
  assert.equal(await resolveJobEntry(baseFactice({ job: null, experience: { id: "e" } }), "j"), "invalid");
  assert.equal(await resolveJobEntry(baseFactice({ job: { id: "j" }, experience: { id: "e" } }), "j"), "experience");
  assert.equal(await resolveJobEntry(baseFactice({ job: { id: "j" }, experience: null }), "j"), "not_ready");
  assert.equal(await resolveJobEntry(baseFactice({ job: { id: "j" } }), ""), "invalid");
});

test("personnage : ce que le candidat voit ne contient rien de caché", () => {
  const p = normaliserPersona({
    name: "Daniel Visser", role: "Head of sales ops", company: "Brightline",
    hidden_info: ["Budget validé jusqu'à 40 k€"], objections: ["Trop cher"],
    personality: "Pressé", opening_message: "Bonjour.", mode: "inconnu",
  });
  assert.equal(p.mode, "call"); // un mode inconnu retombe sur l'appel
  const vu = personaPourCandidat(p);
  for (const champ of ["hidden_info", "objections", "personality", "red_lines", "success_signals", "end_condition"]) {
    assert.equal(champ in vu, false, `${champ} ne doit pas partir chez le candidat`);
  }
  assert.equal(vu.name, "Daniel Visser");
});
