export const PLANS = {
  admin: {
    label: "Admin",
    creditsPerMonth: 999999,
    priceMonthly: 0,
    priceAnnual: 0,
    extraCreditPrice: 0,
    features: {
      videoInterview: true,
      companyBranding: true,
      advancedAnalytics: true,
      automatedEmails: true,
      historyMonths: 999,
    },
  },
  core: {
    label: "Core",
    creditsPerMonth: 170,
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
  },
  pro: {
    label: "Pro",
    creditsPerMonth: 450,
    priceMonthly: 625,
    priceAnnual: 499,
    extraCreditPrice: 2.5,
    features: {
      videoInterview: true,
      companyBranding: true,
      advancedAnalytics: true,
      automatedEmails: true,
      historyMonths: 12,
    },
  },
  custom: {
    label: "Custom",
    creditsPerMonth: 9999,
    priceMonthly: null, // Sur devis
    priceAnnual: null,  // Sur devis
    extraCreditPrice: null,
    features: {
      videoInterview: true,
      companyBranding: true,
      advancedAnalytics: true,
      automatedEmails: true,
      historyMonths: 999,
    },
  },
};

/**
 * Coût en crédits par type d'action.
 * 
 * Deux catégories :
 * - "setup" : facturé une seule fois à l'ajout du module dans le pipeline d'une offre
 * - "per_candidate" : facturé à chaque candidat qui passe l'étape
 */
export const CREDIT_COSTS = {
  // --- Coûts à l'ajout (setup, par offre) ---
  qualifying_questions: 0,   // Gratuit
  assessment_setup: 4,       // Ajout d'un test de compétences (hérité)
  video_setup: 6,            // Ajout d'un module vidéo (hérité)
  cv_scoring_setup: 0,       // Gratuit à l'ajout (hérité)
  experience_setup: 5,       // 1re publication d'une expérience (une fois par offre). PROVISOIRE :
                             // à recalculer sur le coût réel complet par run (génération + scoring + assistant).
                             // Regénérer ne coûte rien ; seule la 1re publication du poste facture.

  // --- Coûts par candidat ---
  cv_scoring_per_candidate: 2,  // Scoring CV par candidat testé
  candidate_completion: 2,      // Candidat qui complète le parcours complet
};

/**
 * Prix du crédit supplémentaire par plan.
 */
export const EXTRA_CREDIT_PRICING = {
  core: 3,      // 3 €/crédit
  pro: 2.5,     // 2,50 €/crédit
  custom: null,  // Sur devis
};

/**
 * Montants d'ajout rapide de crédits — OUTIL ADMIN uniquement (panneau /admin/billing).
 * Ce ne sont PAS des offres client : la vente de crédits supplémentaires se fait à
 * l'unité via EXTRA_CREDIT_PRICING. `price` est indicatif (tarif Core à 3 €/crédit).
 * À ajuster librement si besoin.
 */
export const CREDIT_PACKS = [
  { id: "pack_50", credits: 50, price: 150 },
  { id: "pack_100", credits: 100, price: 300 },
  { id: "pack_250", credits: 250, price: 750 },
  { id: "pack_500", credits: 500, price: 1500 },
];

/**
 * Grille tarifaire complète pour affichage.
 */
export const PLAN_PRICING = [
  {
    id: "core",
    label: "Core",
    priceAnnual: 199,
    priceMonthly: 249,
    credits: 170,
    extraCreditPrice: 3,
    features: [
      "170 crédits/mois",
      "Tests de compétences",
      "Questions vidéo (jusqu'à 3)",
      "Scoring CV par IA",
      "Questions qualificatives",
      "Marque employeur",
    ],
  },
  {
    id: "pro",
    label: "Pro",
    priceAnnual: 499,
    priceMonthly: 625,
    credits: 450,
    extraCreditPrice: 2.5,
    popular: true,
    features: [
      "450 crédits/mois",
      "Tout ce qui est dans Core",
      "Analytiques avancés",
      "Emails automatisés",
      "Historique 12 mois",
      "Support prioritaire",
    ],
  },
  {
    id: "custom",
    label: "Custom",
    priceAnnual: null,
    priceMonthly: null,
    credits: null,
    extraCreditPrice: null,
    features: [
      "Crédits sur mesure",
      "Tout ce qui est dans Pro",
      "Intégrations personnalisées",
      "Account manager dédié",
      "SLA garanti",
      "Formation équipe",
    ],
  },
];
