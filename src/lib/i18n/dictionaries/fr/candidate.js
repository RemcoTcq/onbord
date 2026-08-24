// Parcours candidat — français.
//
// SOURCE DE VÉRITÉ. Les fichiers en/ et nl/ suivent exactement cette structure
// de clés ; toute clé ajoutée ici doit l'être dans les deux autres, sans quoi
// le candidat verra la version française (repli défini dans dictionaries/index.js).
//
// La langue servie ici ne vient PAS du navigateur du candidat : elle vient de
// jobs.experience_locale, choisie par le recruteur à la création de l'offre.
// Un candidat francophone qui postule à une offre néerlandaise voit du
// néerlandais — c'est voulu, la langue fait partie du poste.

const candidate = {
  // ── Écrans d'information hors parcours (lien mort, offre fermée) ──────────
  notice: {
    fallbackTeam: "l'équipe recrutement",

    invalidLinkTitle: "Accès impossible",
    invalidLinkBody: "Lien d'évaluation invalide ou expiré.",

    expiredTitle: "Ce lien n'est plus valide",
    expiredBody:
      "Les liens d'évaluation expirent au bout de 5 jours. Contactez {company} pour en recevoir un nouveau — votre candidature reste bien enregistrée.",

    notReadyTitle: "Cette évaluation n'est pas encore prête",
    notReadyBody:
      "{company} finalise le parcours pour ce poste. Conservez ce lien : il fonctionnera dès que l'évaluation sera ouverte, et vous serez prévenu par e-mail.",

    jobUnavailableTitle: "Offre indisponible",
    jobNotFound: "Cette offre d'emploi est introuvable ou a été supprimée.",

    applicationsClosedTitle: "Les candidatures ne sont pas encore ouvertes",
    applicationsClosedBody:
      "{company} finalise le processus de sélection pour ce poste. Revenez sur cette page dans quelques jours — vous pourrez alors postuler.",

    logoAlt: "Logo",
  },

  // ── Questions qualificatives, avant l'expérience ──────────────────────────
  qualifying: {
    title: "Avant de commencer",
    subtitle:
      "Quelques questions pour vérifier les prérequis du poste. Répondez honnêtement : vos réponses conditionnent la suite.",
    yes: "Oui",
    no: "Non",
    answerAll: "Répondez à toutes les questions",
    continue: "Continuer",
  },

  // ── Candidat recalé sur les prérequis ─────────────────────────────────────
  disqualified: {
    title: "Merci de votre intérêt",
    body:
      "Vos réponses ne correspondent pas aux prérequis de ce poste, nous ne pouvons donc pas donner suite à votre candidature. Merci du temps que vous nous avez accordé — n'hésitez pas à postuler à nos autres offres.",
  },

  // ── Écran d'accueil de l'expérience ───────────────────────────────────────
  intro: {
    fallbackTitle: "Votre évaluation",
    fallbackTeam: "L'équipe recrutement",
    // {duration} est déjà mis en forme par l'appelant (« (~12 min) » ou vide).
    welcome:
      "Bienvenue ! {company} vous invite à réaliser une courte mise en situation{duration}. Prenez votre temps, il n'y a pas de piège : montrez comment vous travaillez.",
    start: "Commencer",
  },

  // ── Déroulé de l'expérience ───────────────────────────────────────────────
  run: {
    stepCounter: "Étape {current} / {total}",
    minutes: "~{count} min",
    previous: "Précédent",
    next: "Suivant",
    finish: "Terminer",
    answerToContinue: "Répondez à cette étape pour continuer",
    yes: "Oui",
    no: "Non",
    saveFailed: "Impossible d'enregistrer la réponse.",
    submitFailed: "Échec de la soumission",
    genericError: "Une erreur est survenue.",
    retryError: "Une erreur est survenue. Réessayez.",
    crmMismatch:
      "Certaines informations de la fiche ne correspondent pas à ce que disent les sources. Prenez le temps de relire — ou continuez si vous êtes sûr de vous.",
  },

  // ── Fin de parcours ───────────────────────────────────────────────────────
  done: {
    title: "Merci, c'est terminé !",
    body:
      "Vos réponses ont bien été soumises à {company}. Vous pouvez maintenant fermer cet onglet.",
  },

  // ── Formulaire d'entrée (identité + consentement) ─────────────────────────
  onboarding: {
    fallbackName: "Candidat",
    fallbackCompany: "l'entreprise",
    welcome: "Nous sommes ravis de vous accueillir pour cette évaluation.",
    start: "Démarrer l'évaluation",

    // {highlight} porte le mot mis en couleur de marque : « Quel est votre
    // PRÉNOM ? ». En néerlandais le mot ne tombe pas au même endroit dans la
    // phrase, d'où le marqueur plutôt qu'un découpage en trois bouts.
    askFirstName: "Quel est votre {highlight} ?",
    firstNameHighlight: "prénom",
    firstNamePlaceholder: "Ex : Camille",

    askLastName: "Quel est votre {highlight} ?",
    lastNameHighlight: "nom",
    lastNamePlaceholder: "Ex : Dupont",

    askEmail: "Quel est votre {highlight} ?",
    emailHighlight: "email",
    emailPlaceholder: "camille.dupont@email.com",

    back: "Retour",
    lastStep: "Une dernière étape",

    // Phrases entières avec marqueurs : voir tNodes() dans I18nProvider.
    consentTerms: "J'ai lu et j'accepte les {terms} et la {privacy}",
    termsLink: "conditions d'utilisation",
    privacyPolicy: "politique de confidentialité",

    consentAi: "Je comprends qu'une {aiLink}, sous la supervision finale d'un recruteur humain.",
    aiAnalysis: "IA analysera mes réponses",

    submitting: "Validation…",
    continue: "Continuer",
  },

  // ── Assistant IA disponible pendant certaines étapes ──────────────────────
  assistant: {
    greeting:
      "Bonjour ! Je suis Claude. Vous avez accès à moi comme vous l'auriez au travail : posez vos questions, demandez un brouillon, un angle, une vérification, un regard critique.\n\nUne seule chose à savoir : **tout notre échange est enregistré et fait partie de l'évaluation**. Ce n'est pas le fait de m'utiliser qui compte, c'est votre façon de le faire.",
    open: "Ouvrir Claude",
    collapse: "Réduire",
    placeholder: "Écrivez à Claude…",
    send: "Envoyer",
    remainingMessages_one: "{count} échange restant",
    remainingMessages_other: "{count} échanges restants",
    limitReached: "Vous avez atteint le nombre maximum d'échanges pour cette évaluation.",
    error: "Désolé, une erreur est survenue.",
    interrupted: "\n\n_(réponse interrompue)_",
  },

  // ── Réponse vidéo ─────────────────────────────────────────────────────────
  recorder: {
    deviceError:
      "Impossible d'accéder à la caméra/au micro. Vérifiez les autorisations du navigateur.",
    uploadFailed: "Échec de l'envoi :",
    retake: "Refaire",
    cancel: "Annuler",
    stop: "Arrêter",
    validate: "Valider",
    saved: "Réponse vidéo enregistrée",
    testDevices: "Tester caméra & micro",
    testBadge: "Test — aperçu en direct",
    micLevel: "Niveau du micro — parlez pour vérifier que la barre bouge",
    testConfirm:
      "Vous voyez votre image et la barre de son réagit ? Démarrez l'enregistrement quand vous êtes prêt·e.",
    itWorks: "Ça fonctionne — démarrer l'enregistrement",
    uploading: "Envoi…",
  },

  // ── Mises en situation (sandbox) ──────────────────────────────────────────
  sandbox: {
    chatTitle: "Chat interne / client",
    chatPlaceholder: "Votre réponse dans le chat…",
    chatSampleMessage: "Pouvez-vous m'expliquer pourquoi cette solution est préférable ?",
    docTitle: "Document d'architecture / conception",
    docPlaceholder: "# Architecture proposée…",
    codeTitle: "Éditeur de code (sandbox)",
    codePlaceholder: "// Écrivez votre code ici…",
    defaultPlaceholder: "Votre réponse…",
  },

  // ── Sandbox CRM : fiche prospect à compléter depuis des sources ───────────
  crm: {
    cardTitle: "Fiche prospect — nouvelle opportunité",
    noSources: "Aucune source fournie.",
    notesPlaceholder: "Tout ce qui vous semble utile à l'équipe…",
    internalNotes: "Notes internes",
    from: "De :",
    sourceKinds: {
      email: "Email",
      call: "Appel",
      message: "Message",
      note: "Note",
    },
  },

  // ── Sandbox e-mail ────────────────────────────────────────────────────────
  emailComposer: {
    toPlaceholder: "destinataire@exemple.com",
    ccPlaceholder: "copie@exemple.com",
    send: "Envoyer",
    newMessage: "Nouveau message",
    subject: "Objet",
    subjectPlaceholder: "Objet de votre message",
    bodyPlaceholder: "Rédigez votre email…",
    bold: "Gras",
    italic: "Italique",
    bulletList: "Liste à puces",
  },

  // ── Dépôt de CV ───────────────────────────────────────────────────────────
  cvUpload: {
    title: "Votre CV",
    subtitle:
      "Importez votre CV au format PDF. Notre IA l'analysera pour évaluer votre profil face à l'offre.",
    analyzed: "Votre CV a été analysé avec succès.",
    dropzone: "Cliquez ou glissez votre CV ici",
    constraints: "Format PDF uniquement · Max 5 Mo",
    received: "CV bien reçu !",
    analyzing: "Analyse en cours…",
    analyzingHint: "Notre IA évalue votre profil, cela peut prendre quelques secondes.",
    notPdf: "Veuillez sélectionner un fichier PDF uniquement.",
    tooLarge: "Le fichier est trop volumineux (max 5 Mo).",
    uploadError: "Erreur lors de l'upload :",
    parseError: "Erreur lors de l'analyse du CV.",
    emptyPdf:
      "Le PDF semble vide ou illisible. Vérifiez que votre CV n'est pas une image scannée.",
    aiError: "Erreur lors de l'analyse IA",
    genericError: "Une erreur est survenue. Veuillez réessayer.",
  },

  // ── Garde anti-triche ─────────────────────────────────────────────────────
  fullscreenGuard: {
    title: "Mode plein écran obligatoire",
    body:
      "Pour garantir l'intégrité de l'évaluation, vous devez rester en mode plein écran. Toute tentative de sortie sera enregistrée et signalée au recruteur.",
    enable: "Activer le plein écran",
    active: "Anti-triche Onbord activé",
  },
};

export default candidate;
