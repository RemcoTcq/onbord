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
    filRougeTitle: "Votre mise en situation",
    filRougeReminder: "Rappel de la situation",
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
    // Le bouton de l'écran de consentement : on n'y « continue » pas, on accepte.
    accept: "J'accepte",
  },

  // ── Assistant IA disponible pendant certaines étapes ──────────────────────
  assistant: {
    greeting:
      "Bonjour ! Je suis Claude. Vous avez accès à moi comme vous l'auriez au travail : posez vos questions, demandez un brouillon, un angle, une vérification, un regard critique.\n\nUne seule chose à savoir : **tout notre échange est enregistré et fait partie de l'évaluation**. Ce n'est pas le fait de m'utiliser qui compte, c'est votre façon de le faire.",
    open: "Ouvrir Claude",
    collapse: "Réduire",
    placeholder: "Écrivez à Claude…",
    send: "Envoyer",
    writing: "Claude écrit…",
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
    brief: { title: "Contexte", to: "Destinataire", subject: "Objet" },
    docTitle: "Document d'architecture / conception",
    docPlaceholder: "# Architecture proposée…",
    codeTitle: "Éditeur de code (sandbox)",
    codePlaceholder: "// Écrivez votre code ici…",
    code: {
      run: "Exécuter les tests",
      running: "Exécution…",
      summary: "{passed}/{total} tests réussis",
      attemptsLeft: "{count} exécutions restantes",
      hiddenTests: "{count} tests cachés",
      hiddenTest: "Test caché {n}",
      noTests: "Aucun test automatique sur cette étape : votre code sera relu tel quel.",
      compileError: "Erreur de compilation",
      input: "Entrée",
      expected: "Attendu",
      got: "Obtenu",
      empty: "(vide)",
      verdicts: {
        timeout: "temps dépassé",
        runtime_error: "erreur à l'exécution",
        compile_error: "ne compile pas",
        error: "échec d'exécution",
      },
      errors: {
        not_configured: "L'exécution du code n'est pas disponible pour le moment. Écrivez votre solution : elle sera relue.",
        quota_exceeded: "Le service d'exécution est momentanément saturé. Réessayez dans quelques minutes.",
        provider_busy: "Le service d'exécution est saturé en ce moment — cela ne vient pas de votre code. Patientez un instant et relancez.",
        provider_unreachable: "Le service d'exécution est injoignable. Réessayez dans quelques instants.",
        provider_error: "L'exécution a échoué pour une raison technique. Réessayez.",
        timeout: "L'exécution a été trop longue et a été interrompue. Vérifiez les boucles infinies.",
        no_tests: "Aucun test n'est configuré sur cette étape.",
        limit_reached: "Vous avez atteint la limite d'exécutions pour cette étape. Votre code reste enregistré et sera relu.",
        generic: "L'exécution a échoué. Réessayez.",
      },
    },
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
      meeting: "Réunion",
    },
    pipeline: "Pipeline",
    recordCount_one: "{count} fiche",
    recordCount_other: "{count} fiches",
    allStages: "Toutes",
    focus: "Votre fiche",
    stage: "Étape",
    amount: "Montant",
    closeDate: "Clôture prévue",
    contact: "Contact",
    owner: "Propriétaire",
    lastActivity: "Dernière activité",
    activity: "Historique",
    noActivity: "Aucune activité enregistrée sur cette fiche.",
    nextStep: {
      title: "Prochaine action planifiée",
      typePlaceholder: "Type d'action…",
      types: { call: "Appel", email: "E-mail", meeting: "Rendez-vous", task: "Tâche" },
      date: "Date",
      textPlaceholder: "Ce qui est prévu, avec qui, et dans quel but…",
    },
  },

  // ── Sandbox tableur ───────────────────────────────────────────────────────
  sheet: {
    title: "Classeur",
    empty: "Aucune donnée fournie.",
    fillDown: "Recopier vers le bas",
    fillDownHint: "Recopie la formule de la cellule (ou de la première ligne de la sélection) vers le bas — Ctrl+D",
    formulaPlaceholder: "Valeur ou formule, ex. : =MOYENNE(C2:C20)",
    status: "Somme : {sum} · Moyenne : {average} · Nb : {count}",
    hint: "Double-cliquez ou tapez pour saisir · Maj+clic pour sélectionner une plage",
    conclusion: "Votre synthèse",
    conclusionPlaceholder: "Ce que montrent les données, et ce que vous recommandez…",
    chart: "Graphique",
    chartHint: "Sélectionnez une plage (Maj+clic), puis créez un graphique. Une première colonne de texte sert de libellés.",
    chartTitle: "Titre du graphique",
    chartTypes: { bar: "Barres", line: "Courbe" },
    chartRemove: "Supprimer le graphique",
  },

  // ── Sandbox personnage : conversation écrite ──────────────────────────────
  persona: {
    contextLabel: "Situation :",
    statusOnline: "En ligne",
    statusEnded: "Conversation terminée",
    youStart: "C'est à vous d'ouvrir la conversation.",
    typing: "{name} écrit…",
    placeholder: "Votre message à {name}…",
    send: "Envoyer",
    remaining_one: "{count} message restant",
    remaining_other: "{count} messages restants",
    end: "Terminer la conversation",
    confirmEnd: "Confirmer la fin ?",
    endedByYou: "Vous avez mis fin à la conversation.",
    endedByPersona: "{name} a mis fin à la conversation.",
    endedByLimit: "La conversation a atteint sa limite de messages.",
    error: "La réponse n'a pas pu arriver. Réessayez.",
  },

  // ── Sandbox personnage : appel ────────────────────────────────────────────
  call: {
    lobbyTitle: "Appel prêt",
    join: "Rejoindre l'appel",
    howItWorks: "Parlez naturellement : votre voix est transcrite en direct. Quand vous vous taisez, une barre s'affiche avant l'envoi — reprenez la parole pour compléter. Si vous préférez garder la main, passez en mode manuel et cliquez « J'ai terminé ». Votre caméra est enregistrée pendant l'appel. Utilisez un casque ou des écouteurs si possible.",
    sendingSoon: "Envoi dans un instant… continuez à parler pour compléter.",
    autoSend: "Envoi auto",
    manualSend: "Envoi manuel",
    autoHint: "Votre réponse part après un silence. Cliquez pour garder la main.",
    manualHint: "Cliquez « J'ai terminé » quand vous avez fini de parler.",
    noSpeechSupport: "Votre navigateur ne transcrit pas la voix (utilisez Chrome, Edge ou Safari pour parler). Vous pouvez quand même passer l'appel : vous écrivez, votre interlocuteur vous répond à voix haute.",
    cameraError: "Caméra indisponible — l'appel reste possible, mais il ne sera pas filmé.",
    you: "Vous",
    recording: "Enregistrement",
    speaking: "Parle…",
    thinking: "Réfléchit…",
    transcribing: "Vous a entendu…",
    listening: "Vous écoute",
    typeInstead: "Votre réponse…",
    mute: "Couper le micro",
    unmute: "Rétablir le micro",
    doneSpeaking: "J'ai terminé",
    hangUp: "Raccrocher",
    transcript: "Transcription",
    saving: "Enregistrement de l'appel…",
    ended: "Appel terminé.",
    endedHint: "La conversation est enregistrée. Vous pouvez passer à la suite.",
  },

  // ── Sandbox tableau de cartes ─────────────────────────────────────────────
  board: {
    title: "Tableau",
    empty: "Aucune carte.",
    progress: "{done}/{total} classées",
    unsorted: "À classer",
    dropHere: "Déposez une carte ici",
    moveTo: "Déplacer vers",
    up: "Monter",
    down: "Descendre",
    hasNote: "Annotée",
    notePlaceholder: "Une note sur cette carte (facultatif)…",
    justification: "Votre justification",
    justificationPlaceholder: "Ce qui passe en premier, ce qui attend, ce que vous écartez — et pourquoi, au regard de la contrainte…",
  },

  // ── Sandbox boîte de réception ────────────────────────────────────────────
  inbox: {
    title: "Boîte de réception",
    titleOwner: "Boîte de réception — {owner}",
    empty: "Aucun message.",
    progress: "{done}/{total} traités",
    backToList: "Tous les messages",
    priorityLabel: "Priorité",
    actionLabel: "Action",
    textRequired: "Rédigez votre réponse ou votre consigne pour traiter ce message.",
    planLabel: "Votre organisation de la journée (facultatif)",
    planPlaceholder: "Dans quel ordre vous traitez les choses, ce que vous gardez pour plus tard, et pourquoi…",
    channels: {
      email: "E-mail",
      chat: "Message interne",
      ticket: "Ticket",
      calendar: "Invitation",
      voicemail: "Message vocal",
    },
    priorities: {
      urgent: "Urgent",
      today: "Aujourd'hui",
      week: "Cette semaine",
      none: "Sans suite",
    },
    actions: {
      reply: "Répondre",
      delegate: "Déléguer",
      schedule: "Planifier",
      archive: "Archiver",
    },
    textPlaceholders: {
      reply: "Votre réponse…",
      delegate: "À qui, et avec quelle consigne…",
      schedule: "Quand, et ce que vous prévoyez (facultatif)…",
      archive: "Une note, si utile (facultatif)…",
    },
  },

  // ── Sandbox e-mail ────────────────────────────────────────────────────────
  emailComposer: {
    to: "À",
    send: "Envoyer",
    newMessage: "Nouveau message",
    subject: "Objet",
    bodyPlaceholder: "Rédigez votre email…",
    expand: "Agrandir la fenêtre",
    collapse: "Réduire la fenêtre",
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
