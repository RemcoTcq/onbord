// Chaînes partagées — français. SOURCE DE VÉRITÉ.
//
// Ce namespace est chargé partout, y compris sur le parcours candidat : il
// reste donc volontairement petit. Tout ce qui n'est vu que par le recruteur
// va dans dashboard.js, tout ce qui n'est vu que par le candidat dans
// candidate.js.

const common = {
  // ── Actions récurrentes ───────────────────────────────────────────────────
  actions: {
    search: "Rechercher…",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    close: "Fermer",
    confirm: "Confirmer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    continue: "Continuer",
    search: "Rechercher",
    copy: "Copier",
    copied: "Copié",
    download: "Télécharger",
    retry: "Réessayer",
    seeMore: "Voir plus",
    seeLess: "Voir moins",
    noOption: "Aucune option disponible",
  },

  // ── États transverses ─────────────────────────────────────────────────────
  states: {
    loading: "Chargement…",
    saving: "Enregistrement…",
    sending: "Envoi…",
    empty: "Aucun résultat",
    none: "—",
    pending: "En attente",
    yes: "Oui",
    no: "Non",
  },

  // ── Erreurs génériques ────────────────────────────────────────────────────
  errors: {
    generic: "Une erreur est survenue.",
    retry: "Une erreur est survenue. Réessayez.",
    notFound: "Page introuvable",
    notFoundMessage: "Il semble que la page que vous cherchez n'existe pas ou a été déplacée. Ne vous inquiétez pas, notre IA est déjà sur le coup pour comprendre ce qu'il s'est passé.",
    backHome: "Retour à l'accueil",
    network: "Connexion impossible. Vérifiez votre réseau.",
    unauthorized: "Vous n'avez pas accès à cette ressource.",
  },

  // ── Authentification (hors dashboard, d'où sa place ici) ──────────────────
  auth: {
    planNamed: "Formule {plan}",
    brand: "Onbord",

    loginTitle: "Connexion",
    loginSubtitle: "Content de vous revoir sur Onbord",
    loginSubmit: "Se connecter",
    loginPending: "Connexion…",
    emailPlaceholder: "vous@entreprise.com",
    noAccountYet: "Pas encore de compte ?",
    createAccount: "Créer un compte",
    forgotPassword: "Oublié ?",

    registerTitle: "Inscription",
    registerSubtitle: "Créez votre compte recruteur",
    registerSubmit: "Créer mon compte",
    registerPending: "Création en cours…",

    joinTitle: "Rejoindre Onbord",
    joinSubtitle: "Créez votre compte pour accéder à la plateforme.",
    joinInvalidTitle: "Lien invalide",
    joinInvalidToken: "Lien d'invitation invalide. Aucun token fourni.",
    joinPlanError: "Erreur lors de l'attribution du plan.",


    // ── Attente de confirmation d'e-mail ────────────────────────────────
    // Écran affiché quand signUp() réussit sans rendre de session.
    confirmTitle: "Vérifiez votre boîte mail",
    confirmBody:
      "Votre compte est créé. Nous venons d'envoyer un lien de confirmation à {email} : ouvrez-le pour activer votre compte et accéder à la plateforme.",
    confirmSpamHint:
      "Rien reçu au bout de quelques minutes ? Regardez dans vos indésirables.",
    confirmResend: "Renvoyer l'e-mail",
    confirmResent: "E-mail renvoyé. Vérifiez votre boîte.",
    confirmAlreadyDone: "Déjà confirmé ?",
    confirmLinkFailed:
      "Ce lien de confirmation n'a pas pu être validé : il a peut-être déjà servi, expiré, ou été ouvert sur un autre appareil que celui où vous vous êtes inscrit. Connectez-vous ci-dessous, ou demandez un nouveau lien depuis la page d'inscription.",
    alreadyHaveAccount: "Déjà un compte ?",
    signIn: "Se connecter",

    fields: {
      emailPlaceholder: "votre@email.com",
      firstName: "Prénom",
      lastName: "Nom",
      company: "Entreprise",
      companyPlaceholder: "Nom de l'entreprise",
      email: "Email",
      workEmail: "Email professionnel",
      password: "Mot de passe",
      passwordHint: "Minimum 6 caractères",
    },
  },

  // ── Langues, pour les sélecteurs ──────────────────────────────────────────
  locales: {
    fr: "Français",
    en: "English",
    nl: "Nederlands",
    uiLabel: "Langue de l'interface",
    experienceLabel: "Langue de l'offre et du parcours candidat",
  },

  // ── Titres d'onglet du navigateur (« Connexion · Onbord ») ──────────────
  // Le « · Onbord » est ajouté par le gabarit de app/layout.js.
  pageTitles: {
    login: "Connexion",
    register: "Inscription",
    invitation: "Invitation",
    home: "Accueil",
    simulations: "Simulations",
    createSimulation: "Créer une simulation",
    simulationTest: "Test de la simulation",
    hiring: "Recrutement",
    jobs: "Jobs",
    newJob: "Nouveau job",
    job: "Job",
    jobSimulation: "Simulation du job",
    step: "Étape",
    candidates: "Candidats",
    candidate: "Candidat",
    onboarding: "Onboarding",
    people: "Personnes",
    person: "Personne",
    modules: "Modules",
    module: "Module",
    programs: "Programmes",
    knowledge: "Connaissances",
    personas: "Personnages",
    persona: "Personnage",
    settings: "Paramètres",
    companyProfile: "Profil entreprise",
    branding: "Branding & logo",
    security: "Sécurité & connexion",
    billing: "Crédits & facturation",
    team: "Équipe",
    onboardingSettings: "Réglages de l'onboarding",
    admin: "Administration",
    adminBilling: "Administration · Facturation",
    adminCosts: "Administration · Coûts",
    training: "Mon entraînement",
    attempt: "Mon essai",
    results: "Mes résultats",
    apply: "Postuler",
    run: "Simulation",
    assessment: "Évaluation",
    interview: "Entretien",
  },
};

export default common;
