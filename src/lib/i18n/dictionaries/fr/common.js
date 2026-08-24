// Chaînes partagées — français. SOURCE DE VÉRITÉ.
//
// Ce namespace est chargé partout, y compris sur le parcours candidat : il
// reste donc volontairement petit. Tout ce qui n'est vu que par le recruteur
// va dans dashboard.js, tout ce qui n'est vu que par le candidat dans
// candidate.js.

const common = {
  // ── Actions récurrentes ───────────────────────────────────────────────────
  actions: {
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

    alreadyHaveAccount: "Déjà un compte ?",
    signIn: "Se connecter",

    fields: {
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
};

export default common;
