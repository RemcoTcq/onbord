// Les briques communes de la phase 1 : le contexte d'entreprise des prompts
// (résumé du site + base de connaissances bornée) et le personnage (canal
// téléphone, humeur). Lancé par `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { assemblerConnaissances, blocEntreprise, MAX_CONNAISSANCES } from "../src/lib/knowledge.js";
import { normaliserPersona, personaPourCandidat, estVocal, MODES_PERSONA } from "../src/lib/persona.js";

test("contexte d'entreprise : identique à avant sans base de connaissances", () => {
  const ctx = { description: "Logiciel RH", industry: "SaaS", target_market: "PME", domain: "B2B" };
  assert.equal(blocEntreprise(ctx), "Description : Logiciel RH\nSecteur : SaaS\nMarché cible : PME\nModèle : B2B");
  assert.equal(blocEntreprise(ctx, { avecModele: false }), "Description : Logiciel RH\nSecteur : SaaS\nMarché cible : PME");
  assert.equal(blocEntreprise({}), "Aucun contexte entreprise fourni.");
  assert.equal(blocEntreprise(null, { vide: "Rien." }), "Rien.");
});

test("contexte d'entreprise : la base de connaissances s'ajoute après le résumé", () => {
  const bloc = blocEntreprise({ industry: "SaaS", connaissances: "Notes de l'entreprise :\nOn répond au prix par le ROI." });
  assert.match(bloc, /^Secteur : SaaS\n\nBase de connaissances/);
  assert.match(bloc, /ROI/);
});

test("base de connaissances : notes en tête, documents récents d'abord, taille bornée", () => {
  const long = "x".repeat(40_000);
  const texte = assemblerConnaissances({
    notes: "Nos clients sont des PME.",
    documents: [
      { title: "Pitch", kind: "pitch_deck", extracted_text: long },
      { title: "Tarifs", kind: "pricing", extracted_text: "Core 120 €" },
      { title: "Vide", kind: "other", extracted_text: "   " },
    ],
  });
  assert.ok(texte.startsWith("Autres notes de l'entreprise :\nNos clients sont des PME."));
  assert.ok(texte.length <= MAX_CONNAISSANCES + 400, `taille ${texte.length}`);
  assert.match(texte, /Document « Pitch » \(pitch_deck\)/);
  assert.match(texte, /Document « Tarifs » \(pricing\) :\nCore 120 €/);
  assert.doesNotMatch(texte, /« Vide »/);
  assert.equal(assemblerConnaissances({}), "");
});

test("personnage : le téléphone est un mode vocal, le chat non", () => {
  assert.deepEqual(MODES_PERSONA, ["call", "phone", "chat"]);
  assert.equal(normaliserPersona({ name: "A", mode: "phone" }).mode, "phone");
  assert.equal(estVocal({ mode: "phone" }), true);
  assert.equal(estVocal({ mode: "call" }), true);
  assert.equal(estVocal({}), true);
  assert.equal(estVocal({ mode: "chat" }), false);
});

test("personnage : l'humeur est gardée, et ne part pas chez le candidat", () => {
  const p = normaliserPersona({ name: "Sophie", mood: "Agacée par une facture erronée" });
  assert.equal(p.mood, "Agacée par une facture erronée");
  assert.equal("mood" in personaPourCandidat(p), false);
  assert.equal(normaliserPersona({ name: "Sans humeur" }).mood, "");
});
