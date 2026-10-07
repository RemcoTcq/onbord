/**
 * Plans et consommation de crédits.
 *
 * ── Les quatre plans ─────────────────────────────────────────────────────────
 *   core   le plan d'entrée, celui que voit la très grande majorité des comptes
 *   pro    le plan supérieur
 *   beta   un Core à l'identique, porté par les bêta-testeurs. Il n'existe QUE
 *          pour l'exploitation interne : le recruteur qui le porte lit « Core »
 *          partout, avec les crédits et les fonctionnalités de Core. Seuls les
 *          écrans /admin distinguent les deux (labelInterne). Rien de ce qui
 *          part vers le navigateur d'un bêta-testeur ne doit contenir « beta » —
 *          d'où planVisible(), appliqué à la sortie de getCreditInfo().
 *   admin  les comptes de l'équipe (ADMIN_EMAILS). Aucun débit, jamais.
 *
 * Le plan `custom` a été retiré : il ne correspondait à aucune offre vendue et
 * traînait dans les listes déroulantes d'administration.
 *
 * ── Ce qui consomme des crédits ──────────────────────────────────────────────
 * Trois opérations, et trois seulement (cf. CREDIT_COSTS plus bas) : générer une
 * simulation, en régénérer une étape, faire passer un candidat. L'ancien
 * barème — setup par module, banque de tests, scoring CV facturé à part — est
 * supprimé : ces modules ne structurent plus le produit.
 *
 * ── Les prix ─────────────────────────────────────────────────────────────────
 * Alignés le 07/10/2026 sur la page des tarifs du site (site/src/lib/pricing.js) :
 * Core 120 € au mois ou 100 € à l'année, Pro 360 € ou 300 € — deux mois
 * offerts sur douze. Les crédits n'ont pas bougé : même usage pour le client,
 * la hausse finance la marge des appels vocaux. Le site et l'application ne
 * partagent pas de code : ces chiffres sont RECOPIÉS dans les deux, à changer
 * ensemble.
 *
 * Plus de crédit supplémentaire à l'unité : l'achat de crédits en plus a été
 * retiré de l'offre (le site n'en vend plus). Un compte à court de crédits
 * prend contact ; l'équipe peut toujours en ajouter depuis /admin.
 */

/** Solde affiché pour un compte sans limite. Sentinelle, jamais un vrai solde. */
export const CREDITS_ILLIMITES = 999999;

const FEATURES_COMPLETES = {
  videoInterview: true,
  companyBranding: true,
  advancedAnalytics: true,
  historyMonths: 12,
};

const CORE = {
  label: "Core",
  creditsPerMonth: 150,
  priceMonthly: 120,
  priceAnnual: 100,     // prix MENSUEL sous engagement annuel : 10 mois payés sur 12
  features: {
    videoInterview: true,
    companyBranding: true,
    advancedAnalytics: false,
    historyMonths: 3,
  },
};

export const PLANS = {
  core: { ...CORE, labelInterne: "Core" },

  pro: {
    label: "Pro",
    labelInterne: "Pro",
    creditsPerMonth: 500,
    priceMonthly: 360,
    priceAnnual: 300,   // 10 mois payés sur 12
    features: { ...FEATURES_COMPLETES },
  },

  // Volontairement identique à Core, jusqu'au `label`. La seule différence est
  // `labelInterne`, lu par les écrans d'administration, et `estBeta`.
  beta: { ...CORE, labelInterne: "Bêta (Core)", estBeta: true },

  admin: {
    label: "Admin",
    labelInterne: "Admin",
    creditsPerMonth: CREDITS_ILLIMITES,
    priceMonthly: 0,
    priceAnnual: 0,
    illimite: true,
    features: { ...FEATURES_COMPLETES, historyMonths: 999 },
  },
};

/**
 * Cycles de facturation. Portés par `user_usage.billing_cycle` (migration 031),
 * réglés depuis /admin/billing : il n'y a pas de paiement en ligne, c'est
 * l'équipe qui sait si un client a signé à l'année.
 *
 * ── Mensuel ──────────────────────────────────────────────────────────────────
 * Au changement de mois, le solde repart à l'allocation du plan. Ce qui n'a pas
 * été utilisé est perdu.
 *
 * ── Annuel : les crédits se reportent ────────────────────────────────────────
 * Au changement de mois, l'allocation S'AJOUTE au solde : utilisez 200 des 500
 * crédits de Pro en juin, et juillet démarre à 800. Au RENOUVELLEMENT de
 * l'année, le report s'éteint : le solde repart de zéro, plus l'allocation du
 * mois. C'est la règle vendue par la page des tarifs du site (FAQ « Les crédits
 * non utilisés sont-ils perdus ? ») — à changer ensemble.
 *
 * L'année démarre au MOIS de `user_usage.cycle_start` ; le renouvellement tombe
 * le 1er du même mois l'année suivante, puis tous les douze mois. Les recharges
 * suivent le calendrier (le 1er du mois), comme en mensuel.
 */
export const CYCLES = ["monthly", "annual"];

/** Plans attribuables depuis /admin (création de compte, invitation, changement). */
export const PLANS_ATTRIBUABLES = ["core", "pro", "beta", "admin"];

/**
 * Identifiant de plan tel qu'il doit APPARAÎTRE au recruteur.
 * `beta` ne sort jamais du serveur : il devient `core`, qu'il est en tout point.
 */
export function planVisible(planId) {
  if (planId === "beta") return "core";
  return PLANS[planId] ? planId : "core";
}

/**
 * Coût en crédits, par opération.
 *
 * ── 1. Générer une simulation : 6 crédits ────────────────────────────────────
 * Débités QUAND L'AGENT A CRÉÉ LA SIMULATION — chaque génération complète
 * réussie et enregistrée : la première comme les régénérations complètes, qui
 * refont tout le parcours (nouvelle version). Une génération qui échoue ou
 * s'interrompt ne coûte rien : on facture ce que le recruteur obtient.
 *
 * Jusqu'au 25/09/2026, les 6 crédits tombaient au lancement de l'extraction et
 * couvraient tout le reste. L'extraction ne débite plus, mais elle reste
 * gardée — elle refuse un compte qui n'a pas de quoi payer la simulation
 * (checkCredits, sans débit) —, sinon un compte à sec ferait tourner l'IA
 * gratuitement. Les offres analysées sous l'ancien barème et jamais générées
 * ont déjà payé leur première simulation : elle leur est offerte, une fois
 * (table `simulations_prepayees`, migration 031).
 *
 * ── 2. Régénérer une étape : 1 crédit ────────────────────────────────────────
 * Chaque réécriture d'une étape par l'agent, à la demande du recruteur (bouton
 * ou chat). La passe de relecture automatique, qui réécrit elle aussi des
 * étapes, fait partie de la génération : elle est comprise dans les 6 crédits.
 * L'édition manuelle d'une étape ne coûte rien — le modèle ne tourne pas.
 *
 * ── 3. Faire passer un candidat : 3 crédits ──────────────────────────────────
 * En deux temps, sur deux faits observables :
 *   1 crédit à la CRÉATION DU RUN — le candidat entre réellement dans la
 *     simulation. Un candidat invité qui ne commence jamais ne coûte rien.
 *   2 crédits à la NOTATION — l'évaluation par le modèle, automatique à la
 *     soumission.
 * Chacun des deux est idempotent par construction : le run ne se crée qu'une
 * fois, et scoreRun() refuse de renoter un run déjà « scored ».
 *
 * Rien d'autre ne débite de crédits.
 */
export const CREDIT_COSTS = {
  simulation_generation: 6,
  step_regeneration: 1,
  candidate_start: 1,
  candidate_scoring: 2,
};

/** Coût complet d'un candidat mené jusqu'à sa note. Pour l'affichage. */
export const COUT_CANDIDAT_COMPLET =
  CREDIT_COSTS.candidate_start + CREDIT_COSTS.candidate_scoring;

/**
 * Montants d'ajout rapide de crédits — OUTIL ADMIN uniquement (/admin/billing).
 * Ce ne sont PAS des offres client : les crédits ne se vendent plus à l'unité.
 * Ils servent à dépanner un compte, un geste commercial, une correction.
 */
export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50 },
  { id: "pack_100", credits: 100 },
  { id: "pack_250", credits: 250 },
  { id: "pack_500", credits: 500 },
];
