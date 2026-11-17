// Les indications de jeu de la voix (17/11/2026) : lib/indicationsJeu.js.
import test from "node:test";
import assert from "node:assert/strict";
import { afficherIndications } from "../src/lib/indicationsJeu.js";

test("indications : traduites dans la langue de l'appel, les inconnues retirées", () => {
  assert.equal(afficherIndications("[impatient] Ja, wat wilt u precies?", "nl"), "(ongeduldig) Ja, wat wilt u precies?");
  assert.equal(afficherIndications("Bon. [sighs] Allez-y.", "fr"), "Bon. (soupire) Allez-y.");
  assert.equal(afficherIndications("[Clears Throat] Go on.", "en"), "(clears throat) Go on.");
  assert.equal(afficherIndications("[whatever-unknown] Oké.", "nl"), "Oké.");
  assert.equal(afficherIndications("Geen tags hier.", "nl"), "Geen tags hier.");
  assert.equal(afficherIndications("[curious] Hoe dan?", "de"), "(curious) Hoe dan?", "langue sans traduction : l'anglais");
});
