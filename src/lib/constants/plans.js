export const PLANS = {
  beta: {
    label: "Beta",
    creditsPerMonth: 170,
    priceMonthly: 0,
    priceAnnual: 0,
    extraCreditPrice: 3,
    features: {
      videoInterview: true,
      companyBranding: true,
      advancedAnalytics: false,
      automatedEmails: false,
      historyMonths: 3,
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
  assessment_setup: 4,       // Ajout d'un test de compétences
  video_setup: 6,            // Ajout d'un module vidéo
  cv_scoring_setup: 0,       // Gratuit à l'ajout

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
