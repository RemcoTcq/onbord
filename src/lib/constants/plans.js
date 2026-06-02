export const PLANS = {
  beta: {
    label: "Beta",
    creditsPerMonth: 500,
    features: {
      videoInterview: false,
      companyBranding: false,
      advancedAnalytics: false,
      automatedEmails: false,
      historyMonths: 3,
    },
  },
  core: {
    label: "Core",
    creditsPerMonth: 100,
    features: {
      videoInterview: false,
      companyBranding: true,
      advancedAnalytics: false,
      automatedEmails: false,
      historyMonths: 3,
    },
  },
  scale: {
    label: "Scale",
    creditsPerMonth: 500,
    features: {
      videoInterview: true,
      companyBranding: true,
      advancedAnalytics: true,
      automatedEmails: true,
      historyMonths: 12,
    },
  },
  enterprise: {
    label: "Enterprise",
    creditsPerMonth: 999999,
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
 * Coût en crédits par type d'assessment (par candidat, facturé une seule fois).
 */
export const CREDIT_COSTS = {
  cv_screening: 1,
  skill_test: 2,
  text_interview: 3,
  video_interview: 5,
};

/**
 * Packs de crédits supplémentaires.
 */
export const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, price: 29 },
  { id: "pack_300", credits: 300, price: 69 },
  { id: "pack_1000", credits: 1000, price: 199 },
];
