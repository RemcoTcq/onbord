// Company Knowledge — module PUR (phase 1 de l'onboarding, docs/PLAN.md).
//
// Ce que les générateurs savent de l'entreprise tient en deux parties :
//   • le résumé du site web (`organizations.ai_context` : description, secteur,
//     marché, modèle), qui existait déjà ;
//   • la base de connaissances : les notes libres et le texte extrait des
//     documents déposés (pitch deck, produit, tarifs, objections, politiques,
//     FAQ — migration 039).
//
// `contexteEntreprise()` (lib/org.js) assemble les deux en un objet ;
// `blocEntreprise()` le met en texte pour un prompt. C'est le SEUL endroit
// où ce texte s'écrit : il était recopié à la main dans sept prompts
// (génération, scènes, critique, couverture, réécriture, chat de conception).
//
// ── La taille ───────────────────────────────────────────────────────────────
// Un pitch deck de 40 pages fait vite 30 000 caractères, et les prompts de
// génération sont déjà longs (budget de 270 s sous le plafond Vercel). La
// base est donc BORNÉE : MAX_CONNAISSANCES au total, partagés entre les
// notes (en tête : c'est ce que l'entreprise a écrit elle-même) et les
// documents (du plus récent au plus ancien, chacun coupé à sa part).

export const MAX_CONNAISSANCES = 12_000;
// Les types de documents proposés au dépôt (16/11/2026 : transcriptions
// d'appels, échanges écrits, playbooks). « objections » reste lisible pour les
// documents déjà déposés, mais n'est plus proposé : les objections se disent à
// l'agent de conception, simulation par simulation.
export const TYPES_DOCUMENT = ["pitch_deck", "product", "pricing", "transcript", "emails", "playbook", "policies", "faq", "other"];
export const TYPES_DOCUMENT_CONNUS = [...TYPES_DOCUMENT, "objections"];

// Les RUBRIQUES des connaissances (migration 045, `organizations.knowledge_sections`) :
// ce qu'un agent a besoin de savoir d'une entreprise pour écrire des
// conversations crédibles. L'offre, les acheteurs, les concurrents et les
// marchés se pré-remplissent depuis le site ; le reste, l'entreprise l'écrit.
export const RUBRIQUES = ["offre", "acheteurs", "concurrents", "marches", "vente", "support", "recrutement"];
export const RUBRIQUES_DU_SITE = ["offre", "acheteurs", "concurrents", "marches"];
const TITRES_RUBRIQUES = {
  offre: "Offre (produits, forfaits, prix)",
  acheteurs: "Acheteurs types (ICP)",
  concurrents: "Concurrents et ce qui nous distingue",
  marches: "Marchés et langues",
  vente: "Comment on vend",
  support: "Comment on fait du support",
  recrutement: "Comment on recrute",
};
export const RUBRIQUE_MAX = 4000;

/** Les rubriques, nettoyées et bornées. */
export function normaliserRubriques(s = {}) {
  const out = {};
  for (const r of RUBRIQUES) out[r] = String(s?.[r] ?? "").trim().slice(0, RUBRIQUE_MAX);
  return out;
}

const net = (s) => String(s ?? "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Le texte de la base de connaissances, borné.
 * @param {{ rubriques?: object, notes?: string, documents?: Array<{title: string, kind: string, extracted_text: string}> }} base
 * @param {number} max
 */
export function assemblerConnaissances({ rubriques, notes, documents } = {}, max = MAX_CONNAISSANCES) {
  const morceaux = [];
  let reste = max;

  // Les rubriques d'abord : c'est ce que l'entreprise a écrit pour ça, rangé.
  for (const r of RUBRIQUES) {
    const texte = net(rubriques?.[r]);
    if (!texte || reste <= 200) continue;
    const part = texte.slice(0, Math.min(reste, RUBRIQUE_MAX));
    morceaux.push(`${TITRES_RUBRIQUES[r]} :\n${part}`);
    reste -= part.length;
  }

  const n = net(notes);
  if (n) {
    const part = n.slice(0, Math.min(reste, Math.round(max / 3)));
    morceaux.push(`Autres notes de l'entreprise :\n${part}`);
    reste -= part.length;
  }

  const docs = (documents || []).filter((d) => net(d?.extracted_text));
  docs.forEach((d, i) => {
    if (reste <= 200) return;
    // Chaque document restant reçoit une part égale de ce qui reste.
    const part = Math.floor(reste / (docs.length - i));
    const texte = net(d.extracted_text);
    const coupe = texte.length > part ? `${texte.slice(0, part)}…` : texte;
    morceaux.push(`Document « ${net(d.title) || "sans titre"} » (${d.kind || "other"}) :\n${coupe}`);
    reste -= coupe.length;
  });

  return morceaux.join("\n\n");
}

/**
 * Le contexte d'entreprise en texte, pour un prompt.
 * @param {object} ctx  `contexteEntreprise()` : champs du résumé + `connaissances`
 * @param {{ sep?: string, avecModele?: boolean, vide?: string }} options
 *   `avecModele` : ajouter le modèle d'affaires (`domain`), que certains
 *   prompts ne lisaient pas.
 */
export function blocEntreprise(ctx, { sep = "\n", avecModele = true, vide = "Aucun contexte entreprise fourni." } = {}) {
  const c = ctx || {};
  const resume = [
    c.description && `Description : ${c.description}`,
    c.industry && `Secteur : ${c.industry}`,
    c.target_market && `Marché cible : ${c.target_market}`,
    avecModele && c.domain && `Modèle : ${c.domain}`,
  ].filter(Boolean).join(sep);
  const base = net(c.connaissances);
  const bloc = [resume, base && `Base de connaissances de l'entreprise (faits à respecter, ne rien inventer qui les contredise) :\n${base}`]
    .filter(Boolean).join("\n\n");
  return bloc || vide;
}
