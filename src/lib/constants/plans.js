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
 * Deux opérations, et deux seulement (cf. CREDIT_COSTS plus bas). L'ancien
 * barème — setup par module, banque de tests, scoring CV facturé à part — est
 * supprimé : ces modules ne structurent plus le produit.
 */

/** Solde affiché pour un compte sans limite. Sentinelle, jamais un vrai solde. */
export const CREDITS_ILLIMITES = 999999;

const FEATURES_COMPLETES = {
  videoInterview: true,
  companyBranding: true,
  advancedAnalytics: true,
  automatedEmails: true,
  historyMonths: 12,
};

const CORE = {
  label: "Core",
  creditsPerMonth: 150,
  priceMonthly: 249,
  priceAnnual: 199,
  extraCreditPrice: 3,
  features: {
    videoInterview: true,
    companyBranding: true,
    advancedAnalytics: false,
    automatedEmails: false,
    historyMonths: 3,
  },
};

export const PLANS = {
  core: { ...CORE, labelInterne: "Core" },

  pro: {
    label: "Pro",
    labelInterne: "Pro",
    creditsPerMonth: 450,
    priceMonthly: 625,
    priceAnnual: 499,
    extraCreditPrice: 2.5,
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
    extraCreditPrice: 0,
    illimite: true,
    features: { ...FEATURES_COMPLETES, historyMonths: 999 },
  },
};

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
 * ── 1. Créer une offre : 6 crédits ───────────────────────────────────────────
 * Débités AU LANCEMENT DE L'EXTRACTION, une fois. Le forfait couvre toute la
 * suite — choix des compétences, génération de la simulation, régénérations,
 * relecture, publication — qui ne coûte plus rien. Le débit est en tête de
 * parcours parce que c'est là que part le premier appel au modèle : facturé à
 * la publication, un brouillon abandonné aurait consommé l'IA gratuitement.
 *
 * ── 2. Faire passer un candidat : 3 crédits ──────────────────────────────────
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
  job_creation: 6,
  candidate_start: 1,
  candidate_scoring: 2,
};

/** Coût complet d'un candidat mené jusqu'à sa note. Pour l'affichage. */
export const COUT_CANDIDAT_COMPLET =
  CREDIT_COSTS.candidate_start + CREDIT_COSTS.candidate_scoring;

/** Prix du crédit supplémentaire, par plan. `beta` suit Core, comme le reste. */
export const EXTRA_CREDIT_PRICING = {
  core: 3,
  beta: 3,
  pro: 2.5,
  admin: 0,
};

/**
 * Montants d'ajout rapide de crédits — OUTIL ADMIN uniquement (/admin/billing).
 * Ce ne sont PAS des offres client : la vente se fait à l'unité, au tarif
 * EXTRA_CREDIT_PRICING. `price` est indicatif (tarif Core, 3 €/crédit).
 */
export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50, price: 150 },
  { id: "pack_100", credits: 100, price: 300 },
  { id: "pack_250", credits: 250, price: 750 },
  { id: "pack_500", credits: 500, price: 1500 },
];
