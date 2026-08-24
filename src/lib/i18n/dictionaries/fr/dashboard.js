// Interface recruteur — français. SOURCE DE VÉRITÉ.
//
// Namespace chargé uniquement sous app/(dashboard)/ : il ne part jamais dans le
// bundle du parcours candidat. Pas de version néerlandaise (cf. config.js :
// UI_LOCALES = fr, en).

const dashboard = {
  // ── Navigation ────────────────────────────────────────────────────────────
  nav: {
    brand: "Onbord",
    home: "Accueil",
    jobs: "Offres d'emploi",
    experiences: "Expériences",
    assessments: "Évaluations",
    account: "Mon compte",
    manageAccount: "Gérer mon compte",
    admin: "Admin",
    administration: "Administration",
    newJob: "Nouvelle offre",
    settings: "Paramètres",
    signOut: "Déconnexion",
  },

  // ── Accueil ───────────────────────────────────────────────────────────────
  home: {
    activeJobs: "Vos offres d'emploi actives",
    latestJobs: "Dernières offres",
    mainPages: "Pages principales",
    addShortcut: "Ajouter un raccourci",
    noShortcuts: "Aucun raccourci configuré",
    company: "Entreprise",
    plan: "Plan",
    creditsUsed: "Crédits utilisés",
    candidates: "Candidats",
    candidatesCount_one: "{count} candidat",
    candidatesCount_other: "{count} candidats",
    noLocation: "Localisation non précisée",
    noActiveJobs: "Aucune offre d'emploi active",
    open: "Ouverte",
    greeting: "Bonjour, {name}",
  },

  // ── Liste des offres ──────────────────────────────────────────────────────
  jobs: {
    tabActive: "Actifs",
    tabDrafts: "Brouillons",
    tabTrash: "Corbeille",
    title: "Offres d'emploi",
    subtitle: "Gérez vos offres d'emploi et suivez vos candidats.",
    untitled: "Offre sans titre",
    untitledShort: "Sans titre",
    noActiveJobs: "Aucune offre active",
    noDrafts: "Aucun brouillon",
    createFirst: "Créez votre première offre pour démarrer.",
    draftsAppearHere: "Vos offres non publiées apparaîtront ici.",

    create: "Créer une offre",

    delete: "Supprimer",
    deleteConfirm: "Supprimer cette offre et tous ses candidats ?",
    deleteError: "Erreur lors de la suppression",
    restore: "Restaurer",
    restored: "Offre restaurée",
    restoreError: "Restauration impossible",

    // ── Corbeille de 7 jours (migration 024) ──────────────────────────────
    trashNotice:
      "Ces offres et tous leurs candidats seront définitivement effacés à l'échéance — CV et vidéos compris. La restauration reste possible jusque-là.",
    purgeSoon: "Effacement imminent",
    purgeIn_one: "Effacement définitif dans {count} jour",
    purgeIn_other: "Effacement définitif dans {count} jours",
  },

  // ── Statuts d'un candidat ─────────────────────────────────────────────────
  // Clés = valeurs stockées en base (candidates.status). Elles ne changent
  // JAMAIS ; seuls les libellés se traduisent.
  candidateStatus: {
    invited: "Invité",
    in_progress: "En cours",
    interview_completed: "Entretien réalisé",
    termine: "Terminé",
    soumis: "Soumis",
    scored: "Évalué",
    shortlisted: "Validé",
    rejected: "Rejeté",
    disqualified: "Disqualifié",
  },

  // ── Étapes de la pipeline ─────────────────────────────────────────────────
  pipelineNodes: {
    sourcing: "Sourcing & Publication",
    accueil: "Accueil candidat",
    qualifying_questions: "Questions qualificatives",
    cv_scoring: "Scoring CV (IA)",
    assessment: "Évaluation",
    assessmentSubtitle: "Cliquer pour choisir",
    ai_interview: "Interview IA",
    single_video_question: "Question vidéo",
    remerciements: "Remerciements",
    entretien_visio: "Entretien visio",
    entretien_site: "Interview sur site",
    debrief_finale: "Débrief final",
    customStep: "Étape personnalisée",
  },

  // ── Fiche offre ───────────────────────────────────────────────────────────
  jobDetail: {
    back: "Retour",
    jobLabel: "Offre d'emploi",

    tabs: {
      pipelines: "Parcours (Pipeline)",
      evaluations: "Évaluations",
      candidats: "Candidats",
      context: "Contexte",
      parametres: "Paramètres",
    },

    // ── Lien public ─────────────────────────────────────────────────────
    copyPublicLink: "Copier le lien public",
    linkCopied: "Lien copié !",
    publicLinkCopied: "Lien public copié !",
    publishFirst:
      "Publiez d'abord l'expérience — le lien enverrait les candidats sur un écran d'attente.",
    publishFirstShort:
      "Publiez d'abord l'expérience : sans elle, le lien mène à un écran d'attente.",

    // ── Actions sur les candidats ───────────────────────────────────────
    deleteCandidateConfirm: "Êtes-vous sûr de vouloir supprimer ce candidat ?",
    candidateDeleted: "Candidat supprimé",
    deleteError: "Erreur lors de la suppression",

    // ── Actions sur l'offre ─────────────────────────────────────────────
    settingsSaved: "Paramètres sauvegardés",
    error: "Erreur",
    applicationsNowClosed: "Les candidatures sont maintenant fermées",
    deleteJobConfirm:
      "Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.",
    jobDeleted: "Offre supprimée",
    stepDeleted: "Étape supprimée",
    stepAdded: "Étape ajoutée",
    contextSaved: "Contexte sauvegardé",

    // ── Pipeline ────────────────────────────────────────────────────────
    lockPipeline: "Verrouiller la pipeline",
    unlockPipeline: "Déverrouiller la pipeline",
    noAssessment: "Aucune évaluation configurée",
    addTestsHint: "Ajoutez des tests via l'étape « Parcours » de votre offre.",
    welcomePlaceholder: "Bienvenue ! Voici une courte mise en situation…",
    journey: "Parcours",
    detailsLink: "Détails",
    linkTest: "Associer un test",
    testBeingCreated: "Test en cours de création par l'équipe Onbord",
    testLinked: "Test associé avec succès",
    testLinkError: "Erreur lors de l'association du test",
    testLinkedSyncError:
      "Test associé au pipeline, mais erreur de synchronisation candidat",
    skillsTest: "Test de compétences",
    test: "Test",
    customCreation: "Création sur-mesure",
    pending: "En attente",
    notConfigured: "Non configuré",
    videoQuestions: "Questions vidéos",
    videoInterview: "Interview Vidéo",
    aiEvaluation: "Évaluation IA (Expérience)",

    // ── Messages d'accueil et de fin, écrits par le recruteur ───────────
    // Ils sont montrés AU CANDIDAT : leur langue est celle de l'offre, pas
    // celle du dashboard. L'aide le rappelle pour éviter qu'un recruteur en
    // interface anglaise les rédige en anglais sur une offre néerlandaise.
    welcomeMessage: "Message de bienvenue",
    thankYouMessage: "Message de remerciement",
    welcomeMessageHelp:
      "Affiché au candidat à son arrivée dans l'expérience, avant la 1re étape. À rédiger dans la langue de l'offre.",
    thankYouMessageHelp:
      "Affiché au candidat sur la page de fin, une fois le parcours terminé. À rédiger dans la langue de l'offre.",
    thankYouPlaceholder:
      "Merci d'avoir pris le temps ! Nous revenons vers vous rapidement.",
    messageSaved: "Message enregistré",
    generateExperienceFirst: "Générez d'abord l'expérience candidat.",
    noExperienceYet:
      "Aucune expérience n'existe encore. Générez l'expérience candidat (carte du milieu) avant d'enregistrer un message.",

    // ── Liste des candidats ─────────────────────────────────────────────
    searchCandidate: "Rechercher un candidat…",
    noCandidates: "Aucun candidat",
    shareLinkToStart:
      "Partagez le lien public pour commencer à recevoir des candidatures.",
    sort: {
      score: "Score",
      scoreDesc: "Décroissant",
      scoreAsc: "Croissant",
      date: "Date d'ajout",
      dateDesc: "Récent en premier",
      dateAsc: "Ancien en premier",
      dateRecent: "Ajout (récent)",
      dateOld: "Ajout (ancien)",
      name: "Nom",
      nameAsc: "Nom A → Z",
      nameDesc: "Nom Z → A",
    },

    // ── Onglet Contexte ─────────────────────────────────────────────────
    contextHelp:
      "Sert de contexte à cette offre. Modifiable à tout moment : il nourrit la conception des évaluations.",
    markdownContent: "Contenu Markdown",
    sourcesHelp:
      "Sources rattachées à cette offre. Désactivez-en une pour la garder attachée tout en l'excluant du contexte utilisé pour concevoir les évaluations.",
    jobDescriptionUrl: "Description du poste — URL",

    // ── Onglet Paramètres ───────────────────────────────────────────────
    details: "DÉTAILS",
    title: "Titre",
    location: "Localisation",
    contractType: "Type de contrat",
    employmentType: "Type d'emploi",
    contract: {
      freelance: "Freelance",
      internship: "Stage",
      apprenticeship: "Alternance",
      temp: "Intérim",
    },
    workMode: {
      remote: "Télétravail",
      hybrid: "Hybride",
      fullTime: "Temps plein",
    },

    visibility: "VISIBILITÉ",
    applicationsClosed: "Les candidatures sont fermées",
    applicationsOpen: "Les candidatures sont ouvertes",
    applicationsClosedHelp: "Les candidats ne peuvent plus postuler à cette offre.",
    applicationsOpenHelp:
      "Les candidats peuvent être invités et suivre les différentes étapes du processus de recrutement.",

    closeApplications: "Terminé",
    deleteJob: "Supprimer l'offre",
    deleteJobHelp:
      "Supprime l'annonce et la dissocie de ses candidats. Les évaluations restent dans votre bibliothèque. Cette action ne peut pas être annulée.",
  },

  // ── Fiche candidat : le rapport de preuves ────────────────────────────────
  //
  // C'est l'écran de décision du recruteur. Il suit donc la langue de
  // L'INTERFACE, pas celle de l'offre — un recruteur anglophone doit pouvoir
  // lire le rapport d'un candidat néerlandophone. Les réponses du candidat et
  // les verbatims cités, eux, restent dans leur langue d'origine.
  candidateDetail: {
    levelBetween: "Niveau {level} : intermédiaire entre N{low} ({lowLabel}) et N{high} ({highLabel}).",
    notFound: "Candidat introuvable",
    back: "Retour",
    deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce candidat ?",
    manualScoreError: "Erreur lors de la sauvegarde du score manuel :",

    // ── Colonne d'identité ──────────────────────────────────────────────
    status: "Statut",
    invitedOn: "Invité le",
    completedOn: "Complété le",
    pending: "En attente",
    validateProfile: "Valider le profil",
    granted: "Accordé",
    windowExits: "Sorties de fenêtre",
    mailHistory: "Historique mails",
    mail: {
      invitation: "Invitation",
      validation: "Validation",
      rejection: "Refus",
    },

    // ── Actions de statut (verbes, pas états) ───────────────────────────
    actions: {
      shortlist: "Valider",
      reject: "Rejeter",
      disqualify: "Disqualifier",
    },

    // ── Score global ────────────────────────────────────────────────────
    globalScore: "Score global de l'assessment",
    globalScoreHelp: "Moyenne pondérée basée sur les critères de sélection.",
    scoreLevel: {
      excellent: "Excellent",
      average: "Moyen",
      weak: "Faible",
      insufficient: "Insuffisant",
    },
    tests: "Tests",
    videoInterviewShort: "Int. Vidéo",
    perCriterion: "Détail par critère",
    strengths: "Points forts",
    watchPoints: "Points d'attention",
    scored: "Évalué",
    partialScore: "Score partiel, exclu du classement",

    // ── Usage de l'assistant IA ─────────────────────────────────────────
    evidenceReport: "Rapport de preuves (Expérience)",
    inProgress: "En cours",
    aiUsage: "Usage de l'Assistant IA",
    aiUsageHelp: "Mesure {em} le candidat a piloté l'IA, pas s'il l'a utilisée",
    aiUsageHelpEm: "comment",
    aiPrompts_one: " — {count} sollicitation de l'assistant sur ce parcours",
    aiPrompts_other: " — {count} sollicitations de l'assistant sur ce parcours",
    aiUsageNotScoredHelp:
      "Le candidat n'a pas sollicité l'assistant. Cette dimension mesure {em} il l'aurait piloté : elle n'est pas notée en son absence, et ne pénalise pas le score global.",
    expected: "attendu :",
    aiUsageNotScored: "Usage de l'Assistant IA — non noté",
    aiAxes: {
      framing: "Cadrage du problème",
      iteration: "Itération",
      criticalEye: "Regard critique sur la sortie",
    },
    justificationUnavailable:
      "Justification indisponible : ce run a été évalué avant que cette explication soit conservée. Un nouveau scoring la produira.",

    // ── Rapport d'expérience ────────────────────────────────────────────
    candidateAnswer: "Réponse du candidat",
    noAnswer: "(pas de réponse)",
    transcriptPending: "(transcription en attente)",
    optionSelected: "Option {index} sélectionnée",
    yes: "Oui",
    no: "Non",
    evaluationGrid: "Grille d'évaluation",
    proposalsAndKey: "Propositions et corrigé",
    correctAnswer: "bonne réponse",
    notFilled: "non renseigné",
    trap: "piège",
    verbatimVerified: "✓ Extrait vérifié dans la réponse",
    verbatimNotFound: "⚠ Extrait non retrouvé tel quel",

    expKind: {
      qualifying: "Qualificative",
      question: "Question ciblée",
      task: "Tâche",
      classic_qcm: "QCM",
    },

    // ── Entretien vidéo ─────────────────────────────────────────────────
    perQuestion: "Détail par question",
    showTranscript: "Voir la transcription",
    hideTranscript: "Cacher la transcription",
    videoRecording: "Enregistrement vidéo",
    candidateTranscript: "Transcription du candidat",
    transcriptTooShort:
      "La transcription est absente ou insuffisante pour une évaluation IA. Visionnez la vidéo pour évaluer la réponse de ce candidat.",
    quoteVerified: "✓ Citation vérifiée",
    quoteNotVerified: "⚠ Citation non vérifiée dans la transcription",
    noQuote: "Aucun élément cité",
    improvementAreas: "Axes d'amélioration",

    saved: "Enregistré",
    aiAnalyzing: "Analyse IA…",
    analyzed: "Analysé ✓",
    manualReview: "Revue manuelle",
    transcribing: "Transcription…",
    aiAnalysisQuestions: "Analyse IA — {count} questions évaluées",
    questionsScored: "{scored}/{total} questions évaluées —",
    aiRecruiter: "Leo (IA Recruteur)",
    editScore: "Modifier la note",
    scoreThisAnswer: "Évaluer cette réponse",
    scoreOutOf5: "Score sur 5",
    justificationPlaceholder: "Justification de la note (optionnelle mais recommandée)…",
    confirmScore: "Valider la note",
    analysisInProgress: "Analyse en cours, rechargez la page dans quelques instants.",

    // Catégories du test « maîtrise de l'IA » (identifiants C1…C5 stables).
    aiCategories: {
      C1: "Stratégie IA",
      C2: "Prompting",
      C3: "Esprit critique",
      C4: "Éthique",
      C5: "Workflow",
    },
  },

  // ── Éditeur d'expérience ──────────────────────────────────────────────────
  //
  // ATTENTION à ce qui se traduit ici. L'ÉCRAN suit la langue du recruteur,
  // mais le CONTENU qu'il édite (titres d'étapes, énoncés, options de QCM,
  // sources CRM) est celui vu par le candidat : il est stocké dans la langue de
  // l'offre et ne doit jamais être traduit à l'affichage. Seuls les libellés
  // d'interface, les aides et les valeurs par défaut sont ci-dessous.
  experienceEditor: {
    loadError: "Erreur de chargement",
    error: "Erreur",

    generated: "Expérience générée — relisez et ajustez avant publication",
    generatedShort: "Expérience générée — à relire avant publication",
    generationFailed: "Échec de la génération",
    stepRewritten: "Étape réécrite — les autres n'ont pas changé",
    published: "Expérience publiée — visible par les candidats",
    publishFailed: "Échec de la publication",
    deleteStepConfirm: "Supprimer cette étape ?",
    stepSaved: "Étape enregistrée",

    chatIntro:
      "Décrivez votre intention. L'assistant vous pose quelques questions pour affiner, puis génère le parcours (mises en situation). Vous relisez et validez chaque étape avant publication.",
    generateDirectly: "Ou générer directement, sans dialoguer",
    closeAssistant: "Fermer l'assistant",
    adjustStepByStep: "Ajuster étape par étape",
    publish: "Publier",
    regenerate: "Regénérer",
    backToJob: "Retour à l'offre",
    lockedWarning:
      "⚠️ Au moins un candidat a déjà commencé cette expérience. Vos modifications seront prises en compte pour les {next} candidats uniquement.",
    lockedWarningNext: "prochains",
    designWithAssistant: "Concevez l'expérience avec l'assistant",
    publishedNotice:
      "✓ Publiée — les candidats voient cette version. Toute modification sera visible immédiatement.",

    status: {
      draft: "Brouillon",
      pending_review: "À valider",
      published: "Publiée",
      archived: "Archivée",
    },

    // ── Édition d'une étape ─────────────────────────────────────────────
    stepTitle: "Titre de l'étape",
    stepPrompt: "Énoncé lu au candidat",
    responseFormat: "Format de réponse",
    sandbox: "Sandbox",
    messageCap: "Plafond d'échanges",
    skillAssessed: "Compétence évaluée",
    skillAssessedHint: "Compétence principale ciblée par cette étape",
    newSubDimension: "Nouvelle sous-dimension",
    save: "Enregistrer",
    saved: "Enregistré",

    barsLevels: {
      insufficient: "Insuffisant",
      expected: "Attendu",
      excellent: "Excellent",
    },

    kind: {
      qualifying: "Qualificative",
      question: "Question ciblée",
      task: "Tâche",
      classic_qcm: "QCM",
    },

    format: {
      text: "Texte",
      video: "Vidéo (mise en situation)",
      qcm: "QCM",
      choice: "Choix (oui/non)",
      code: "Code (sandbox)",
    },

    sandboxKind: {
      none: "Aucun",
      email: "📧  Email",
      client_reply: "💬  Réponse client",
      document: "📄  Document",
      code: "💻  Code",
      crm: "🗂️  Fiche CRM",
    },

    // ── QCM ─────────────────────────────────────────────────────────────
    qcmOptions: "Options QCM",
    qcmCorrect: "Bonne réponse",
    qcmHelp:
      "Sélectionnez la bonne réponse avec le bouton radio. Le candidat sera noté automatiquement (correct/incorrect).",

    // ── Sandbox CRM ─────────────────────────────────────────────────────
    crm: {
      recordTitle: "Fiche CRM — titre de l'enregistrement",
      recordTitlePlaceholder: "Fiche prospect — nouvelle opportunité",
      sourceTypes: {
        email: "Email",
        call_transcript: "Retranscription d'appel",
        message: "Message entrant",
        note: "Note interne",
      },
      tabLabelPlaceholder: "Libellé de l'onglet (ex. Appel — mardi 9h10)",
      sourceBodyPlaceholder: "Contenu de la source, tel que le candidat le lira…",
      natureFactual: "Factuel (corrigé auto)",
      natureJudgment: "Jugement (noté BARS)",
      optionsPlaceholder: "Options séparées par des virgules",
      unitPlaceholder: "Unité (€, j, …)",
      expectedLabel:
        "Valeur attendue — vérifiez qu'elle est bien présente dans les sources",
      expectedMissing:
        "⚠ Cette valeur ne se retrouve pas telle quelle dans les sources. Le candidat ne pourra pas la deviner — corrigez l'attendu, ajoutez une variante acceptée, ou complétez la source.",
      exactAnswer: "Réponse exacte",
      acceptedVariants: "Variantes acceptées (virgules)",
      tolerance: "Tolérance",
      trapFieldPlaceholder: "Champ factuel concerné…",
      trapSourcesPlaceholder: "Ce que dit chaque source et en quoi elles se contredisent",
      trapResolutionPlaceholder: "Quelle valeur fait foi, et pourquoi",
      trapBehaviourPlaceholder: "Comportement recherché chez un bon candidat",
    },
  },

  // ── Langue de l'offre, choisie à la création ──────────────────────────────
  //
  // Le libellé insiste sur la conséquence pour le candidat, pas sur le réglage :
  // c'est la question que se pose le recruteur au moment de choisir.
  jobLocale: {
    label: "Langue de l'offre et du parcours candidat",
    help: "Toute l'évaluation sera rédigée dans cette langue : questions, mises en situation, assistant IA et e-mails au candidat.",
    lockedTitle: "Langue verrouillée",
    lockedHelp:
      "L'expérience de cette offre a déjà été générée en {locale}. Pour changer de langue, supprimez l'expérience et régénérez-la.",
    changeWarning:
      "Changer la langue maintenant n'affecte que les offres à venir : les textes déjà générés resteront en {locale}.",
  },


  // ── Mon compte ────────────────────────────────────────────────────────────
  account: {
    title: "Mon compte",
    subtitle: "Gérez vos informations personnelles et vos paramètres de sécurité.",

    tabs: {
      general: "Informations générales",
      company: "Profil entreprise",
      branding: "Branding & logo",
      security: "Sécurité & connexion",
      billing: "Crédits & facturation",
    },

    general: "Informations générales",
    firstName: "Prénom",
    lastName: "Nom",
    company: "Entreprise",
    saveChanges: "Enregistrer les modifications",
    profileUpdated: "Profil mis à jour avec succès !",

    // ── Sécurité ────────────────────────────────────────────────────────
    security: "Sécurité & connexion",
    securityIntro:
      "Pour modifier votre e-mail ou votre mot de passe, vous devez confirmer votre mot de passe actuel.",
    currentPassword: "Mot de passe actuel (requis)",
    currentPasswordHint: "Nécessaire pour enregistrer les modifications",
    currentPasswordRequired:
      "Veuillez saisir votre mot de passe actuel pour des raisons de sécurité.",
    email: "Adresse e-mail",
    emailHint:
      "Un lien de confirmation pourrait être envoyé à la nouvelle adresse selon les paramètres de votre serveur.",
    emailConfirmationSent:
      "Un lien de confirmation a été envoyé à votre nouvelle adresse e-mail. Le changement sera effectif une fois validé.",
    newPassword: "Nouveau mot de passe",
    newPasswordHint: "Laissez vide pour conserver le mot de passe actuel",
    updateSecurity: "Mettre à jour la sécurité",
    securityUpdated: "Paramètres de sécurité mis à jour !",
  },

  // ── Fenêtre de rédaction d'e-mail ─────────────────────────────────────────
  // Seule L'INTERFACE de la fenêtre est ici. Le CORPS du message vit dans
  // lib/emails/templates.js : il suit la langue de l'offre, pas celle du
  // recruteur, parce qu'il est lu par le candidat.
  emails: {
    title: "Générer un mail",
    forCandidate: "Pour {name}",
    subject: "Objet",
    recruiterFallback: "Recruteur",
    copied: "Mail copié dans le presse-papier !",
    copyError: "Erreur lors de la copie.",
    noEmail: "Ce candidat n'a pas d'adresse e-mail renseignée.",
    sent: "E-mail envoyé avec succès !",
    sendError: "Erreur lors de l'envoi de l'e-mail.",
    genericSendError: "Erreur lors de l'envoi.",
    proRequired: "Plan Pro requis",
    proUpsell: "Passez au plan Pro pour envoyer des e-mails directement.",
    sentBadge: "Envoyé !",
    alreadySent: "Mail déjà envoyé",
    send: "Envoyer l'e-mail",
    localeNotice:
      "Rédigé en {locale} — la langue de cette offre, celle que le candidat connaît.",
  },

  // ── Configuration de l'entretien IA ───────────────────────────────────────
  // L'INTERFACE seulement. Les messages d'ouverture et de clôture, dits au
  // candidat, vivent dans lib/interview/defaults.js et suivent la langue de
  // l'offre.
  aiInterview: {
    heading: "Assessment (entretien IA)",
    intro:
      "L'IA mènera un entretien avec les candidats pour évaluer leurs compétences et leur motivation.",
    enabled: "Activée",
    disabled: "Désactivée",
    enableTitle: "Activez l'interview IA",
    enableHelp:
      "L'interview IA vous permet de pré-qualifier automatiquement les candidats avant de les rencontrer.",
    enableAction: "Activer l'interview IA",

    saved: "Configuration sauvegardée avec succès",
    saveError: "Erreur lors de la sauvegarde",
    contextGenerated: "Contexte généré avec succès ! Vous pouvez le modifier librement.",
    generationError: "Erreur de génération",

    requiredQuestions: "Questions imposées",
    requiredQuestionsHelp: "Questions spécifiques que l'IA doit absolument poser.",
    questionPlaceholder: "Ex : « Décrivez votre expérience avec Next.js. »",

    introSection: "Intro & clôture",
    introSectionHelp: "Message d'accueil, message de fin et ton de l'interview.",
    tone: "Ton de l'interview",
    tones: {
      Formel: "Formel",
      Neutre: "Neutre",
      Décontracté: "Décontracté",
    },
    introMessage: "Message d'introduction",
    outroMessage: "Message de clôture",
    estimatedDuration: "Durée estimée :",
    estimatedDurationValue: "10 à 15 minutes selon les réponses du candidat.",
    candidateFacingHint:
      "Lu au candidat : à rédiger dans la langue de l'offre.",

    contextSection: "Contexte pour l'IA",
    contextSectionHelp: "Informations invisibles pour le candidat pour orienter l'IA.",
    prefillFromJob: "Pré-remplir depuis l'offre d'emploi",
    contextHelp:
      "Ces éléments servent de brief à l'IA pour personnaliser ses questions. Vous pouvez modifier manuellement les textes générés.",
    aboutCompany: "À propos de l'entreprise",
    whyHiring: "Pourquoi ce recrutement ?",
    whyHiringPlaceholder:
      "Ex : croissance de l'équipe produit, lancement d'une nouvelle fonctionnalité…",
    whatMatters: "Ce qui compte vraiment",
    whatMattersPlaceholder:
      "Ex : quelqu'un d'autonome, passionné, qui communique bien en asynchrone…",

    criteriaSection: "Critères d'évaluation",
    criteriaSectionHelp: "Poids des critères et éléments éliminatoires.",
    globalWeight: "Poids de l'évaluation globale",
    customPreset: "✏️ Personnalisé",
    presets: {
      Technique: "Technique",
      Commercial: "Commercial",
      Créatif: "Créatif",
      Junior: "Junior",
      Personnalisé: "Personnalisé",
    },
    weights: {
      hard_skills: "Hard skills (techniques)",
      soft_skills: "Communication & soft skills",
      motivation: "Motivation",
      culture: "Culture fit",
      potential: "Potentiel & adaptabilité",
    },
    total: "Total",
    mustEqual100: "doit être égal à 100 %",
    resetDefaults: "Réinitialiser par défaut",
    decisiveCriteria: "Critères décisifs (points bloquants)",
    decisiveCriteriaHelp:
      "Si l'IA détecte ces conditions dans les réponses du candidat, elles seront signalées dans le rapport.",
    neverAutoRejects: "L'IA ne rejette jamais un candidat automatiquement.",

    appliesToNext: "Les modifications s'appliqueront aux prochains entretiens envoyés.",
    saveConfig: "Sauvegarder la configuration",
  },

  // ── Configuration de l'entretien vidéo ────────────────────────────────────
  videoInterview: {
    categories: { motivation: "Motivation", experience: "Expérience", softSkills: "Soft skills", technical: "Technique", cultureFit: "Culture fit", custom: "Sur-mesure" },
    loadLibraryError: "Erreur lors du chargement de la bibliothèque",
    saveJobFirst: "Sauvegardez d'abord votre offre",
    generationError: "Erreur lors de la génération",
    maxQuestions: "Maximum 3 questions par module vidéo",
    alreadyAdded: "Cette question est déjà ajoutée",
    aiQuestionAdded: "Question IA ajoutée",
    questionAdded: "Question ajoutée",

    categories: {
      Technique: "Technique",
      "Soft Skills": "Soft skills",
      "Culture Fit": "Culture fit",
      Custom: "Sur-mesure",
      Toutes: "Toutes",
    },

    maxDuration: "Durée max par réponse",
    twoMinutesRecommended: "2 minutes (recommandé)",
    retakesAllowed: "Ré-enregistrements autorisés",
    retakes: {
      one: "1 essai supplémentaire",
      two: "2 essais supplémentaires",
      unlimited: "Illimité",
    },
    scoreMyself: "Évaluer moi-même les vidéos",
    scoreMyselfHelp: "Vous noterez chaque vidéo après l'avoir visionnée.",

    limitReached: "Limite atteinte : 3 questions max",
    generating: "Génération IA…",
    generateWithAi: "Générer avec l'IA",
    closeLibrary: "Fermer la bibliothèque",
    openLibrary: "Bibliothèque de questions",
    libraryLimitReached: "Limite de 3 questions atteinte pour ce module.",
    aiSuggestions: "Suggestions IA",
    added: "Ajoutée",
    add: "Ajouter",
    onbordLibrary: "Bibliothèque Onbord",
    libraryShort: "📚 Bibliothèque",

    noQuestions: "Aucune question configurée",
    noQuestionsHelp:
      "Générez des questions avec l'IA ou choisissez-en dans notre bibliothèque.",
    questionPlaceholder: "Texte de la question…",
    deleteQuestion: "Supprimer",
    minOneCriterion: "⚠ Minimum 1 critère BARS requis pour le scoring.",
    criterionPlaceholder: "Nom du critère (ex. : storytelling commercial)",
    deleteCriterion: "Supprimer ce critère",
    legacyFormat:
      "Ancien format (sans grille BARS). Régénérez les questions pour bénéficier du scoring structuré.",

    barsLevels: {
      insufficient: "Insuffisant",
      expected: "Attendu",
      excellent: "Excellent",
    },

    allCategories: "Toutes",
    aiSuggestionsGenerated_one: "{count} suggestion générée par l'IA !",
    aiSuggestionsGenerated_other: "{count} suggestions générées par l'IA !",
    // Récapitulatif sous la liste de questions.
    summaryQuestions_one: "{count} question",
    summaryQuestions_other: "{count} questions",
    summaryDuration: "Durée max {duration} par réponse",
    summaryNoRetake: "Aucun ré-enregistrement",
    summaryRetakes_one: "{count} ré-enregistrement autorisé",
    summaryRetakes_other: "{count} ré-enregistrements autorisés",
  },

// ── Formulaire d'offre — étape 2 (critères) ───────────────────────────────
  jobForm: {
    section: 'Détails du poste',
    sectionHelp: 'Pré-rempli depuis votre offre. Ajuster si besoin.',
    jobTitle: 'Titre du poste *',
    shortDescription: 'Description courte *',
    jobFamily: "Famille d'emploi",
    roleType: 'Type de rôle',
    selectPlaceholder: 'Sélectionnez…',
    roleTypes: {
      ic: 'Contributeur individuel (IC) — pas de responsabilité managériale, expert de son domaine',
      manager: 'Manager — gère une équipe, évalue, décide des ressources',
      seniorIc: 'Senior IC / Lead — expert senior sans équipe directe mais avec influence',
      director: 'Director / Executive — management de managers, vision stratégique',
    },

    hardSkills: 'Hard skills *',
    addCustomSkill: 'Ajouter un skill personnalisé',
    softSkills: 'Soft skills',
    addSoftSkill: 'Ajouter un soft skill',
    languages: 'Langues',
    addLanguage: 'Ajouter une langue',
    languageNames: { french: "Français", english: "Anglais", dutch: "Néerlandais" },
    degree: 'Diplôme',
    degrees: { master: 'Master', bachelor: 'Bachelier', any: 'Indifférent' },
    experienceRequired: 'Expérience requise',

    manuallySelected: 'Sélectionné manuellement',
    changePriority: 'Changer de priorité',
    remove: 'Supprimer',
    confirmPriority:
      "L'IA n'a pas pu déterminer l'importance de ces compétences. Veuillez confirmer leur priorité :",
    mustHave: 'Must have',
    niceToHave: 'Nice to have',
  },

  // ── Modules d'évaluation d'une offre ──────────────────────────────────────
  assessmentModules: {
    saved: 'Configuration sauvegardée !',
    saveError: 'Erreur lors de la sauvegarde',
    title: "Modules d'évaluation",
    subtitle:
      'Configurez les modules actifs pour cette offre. Le candidat verra uniquement les modules que vous activez.',

    cvScoring: 'Scoring CV',
    cvScoringHelp:
      "Le candidat téléverse son CV (PDF). Notre IA l'analyse et génère un score de correspondance.",
    skillsTests: 'Tests de compétences',
    skillsTestsHelp:
      'Sélectionnez des tests de votre bibliothèque. Les questions sont tirées aléatoirement mais identiques pour tous les candidats.',
    videoInterview: 'Entretien vidéo (one-way)',
    videoInterviewHelp:
      "Le candidat répond à des questions en s'enregistrant à la webcam. L'IA transcrit et évalue chaque réponse.",
    recommended: 'RECOMMANDÉ',
    textInterview: 'Entretien IA par texte',
    textInterviewHelp:
      'Leo, notre IA, mène un entretien textuel avec le candidat. Moins fiable : réponses potentiellement générées par IA, et processus plus lent pour le candidat.',
    notRecommended: '⚠️ NON RECOMMANDÉ',

    totalDuration: 'Durée estimée totale pour le candidat',
    durationOptimal: '✅ Optimal',
    over30min: '⚠️ Dépasse les 30 min recommandées',
    questionsFixedOnSave:
      'Les questions sont tirées aléatoirement et fixées à la sauvegarde pour que tous les candidats répondent aux mêmes questions.',
  },

  // ── Éditeur visuel de pipeline ────────────────────────────────────────────
  pipeline: {
    title: 'Pipeline de recrutement',
    addStep: 'Ajouter une étape',
    deleteStep: 'Supprimer',
    deleteStepConfirm: 'Supprimer cette étape ?',
    customStep: 'Étape personnalisée',
    clickToConfigure: 'Cliquez pour configurer la mise en situation',
    clickToEdit: 'Cliquez pour éditer le texte',

    nodes: {
      welcome: 'Message de bienvenue',
      qualifying: 'Questions qualificatives',
      experience: 'Expérience candidat',
      thanks: 'Message de remerciement',
      sourcingHelp: 'Géré via votre ATS ou vos canaux de sourcing.',
      videoCall: 'Entretien visio',
      videoCallHelp: 'Entretien téléphonique ou en visio, géré directement par votre équipe.',
      onSite: 'Entretien sur site',
      onSiteHelp: 'Entretien en présentiel, géré directement par votre équipe.',
      debrief: 'Débrief final',
      debriefHelp: "Décision finale et éventuelle offre d'embauche.",
    },
  },

  // ── Bibliothèque des expériences ──────────────────────────────────────────
  experiences: {
    title: "Expériences",
    subtitle: "Les expériences candidat générées pour vos postes.",
    search: "Rechercher un poste…",
    none: "Aucune expérience créée",
    noResults: "Aucun résultat",
    noneHelp: "Créez votre première expérience candidat pour un de vos postes.",
    noResultsHelp: "Essayez un autre terme de recherche.",
    generated: "Expérience générée — relisez et publiez",
    jobDeleted: "Poste supprimé",
    untitled: "Sans titre",
    create: "Créer une expérience candidat",

    // ── Création : choix du poste ───────────────────────────────────────
    whichExperience: "Quelle expérience candidat voulez-vous créer ?",
    attachJob: "Attacher une offre existante",
    attachJobHelp:
      "Les expériences liées à un poste utilisent automatiquement son offre et son contexte entreprise.",
    existingJob: "Poste existant",
    existingJobHelp: "Lier un poste déjà créé",
    newJob: "Nouveau poste",
    newJobHelp: "En créer un à la volée",
    chooseJob: "Choisir un poste",
    noJobYet: "Aucun poste. Créez-en un nouveau.",

    jobTitleRequired: "Ajoutez un titre ou collez une offre (≥ 50 caractères).",
    jobCreated: "Poste créé",
    error: "Erreur",
    jobTitle: "Titre du poste",
    jobDescription: "Offre d'emploi (optionnel, améliore la génération)",
    jobDescriptionPlaceholder: "Collez l'offre d'emploi ici…",
    createAndContinue: "Créer et continuer",
  },

  // ── Chat de conception d'expérience ───────────────────────────────────────
  // Ce chat parle au RECRUTEUR : il suit la langue du dashboard. Les réponses
  // de l'assistant, elles, sont produites par le modèle et sortent dans la
  // langue du prompt (cf. lib/experienceChat.js).
  chatCreator: {
    title: 'Expert Assessment',
    greeting: "Bonjour ! On conçoit ensemble l'expérience de présélection. Décrivez votre besoin en langage libre.",
    greetingForJob:
      "On conçoit ensemble l'expérience de présélection pour {role}. Dites-moi votre intention en quelques mots — par ex. le type de mise en situation qui compte le plus, le ton attendu, ou le profil de client typique. Je vous poserai quelques questions puis je génère.",
    thisRole: "ce poste",

    // Message d'ouverture quand une expérience existe déjà mais qu'aucune
    // conversation n'a été enregistrée. Il énonce l'état plutôt que de le
    // sous-entendre : c'est ce que le recruteur venait vérifier.
    alreadyGenerated_one:
      "L'expérience de présélection pour {role} est déjà générée : {count} étape en version v{version}{published}.",
    alreadyGenerated_other:
      "L'expérience de présélection pour {role} est déjà générée : {count} étapes en version v{version}{published}.",
    publishedSuffix: ", publiée",
    adjustHint:
      "Dites-moi ce que vous voulez ajuster — par exemple « réécris l'étape 2 avec un ton plus direct ». Je reprends l'étape visée, sans toucher aux autres.",
    connectionError: "Erreur de communication avec l'assistant.",
    placeholder: 'Tapez votre message…',
    placeholderShort: 'Répondre…',
    confirmFirst: "Veuillez confirmer ou annuler l'action ci-dessus…",
    confirmFirstShort: "Veuillez confirmer l'action…",
    clearConversation: 'Effacer la conversation',
    clearConfirm: 'Effacer cette conversation ? Les étapes déjà générées ne sont pas modifiées.',
    cleared: 'On repart de zéro. Décrivez votre intention pour cette expérience de présélection.',

    sendError: "Erreur lors de l'envoi du message",
    generationFailed: 'Échec de la génération',
    rewriteFailed: 'Échec de la réécriture',
    error: 'Erreur',
    unexpectedError: 'Erreur inattendue',

    customNeeded: 'Création sur-mesure requise',
    role: 'Poste :',
    skills: 'Compétences :',
    summary: 'Résumé :',
    confirmRequest: 'Confirmer la demande',
    requestSaved: 'Demande enregistrée avec succès !',
    requestError: 'Erreur lors de la demande',

    testFound: 'Test trouvé !',
    testSelected: 'Test sélectionné :',
    addToAssessments: 'Ajouter à mes assessments',
    noThanks: 'Non merci',
    testAdded: 'Test ajouté à Mes Assessments !',
    testAttached: "Test attaché à l'offre avec succès !",
    testAttachError: "Test ajouté mais erreur lors de la liaison à l'offre",
    addError: "Erreur lors de l'ajout",
  },

// ── Profil entreprise (contexte IA privé) ─────────────────────────────────
  companyProfile: {
    urlRequired: "Veuillez saisir l'URL de votre site web.",
    contextGenerated: 'Contexte IA généré avec succès ! Vérifiez et ajustez les champs si besoin.',
    analysisFailed: 'Analyse impossible. Remplissez les champs manuellement.',
    saved: 'Profil entreprise enregistré !',
    subtitle:
      "Ces informations sont utilisées uniquement par l'IA d'Onbord pour personnaliser l'analyse de vos offres. Elles ne sont pas visibles par les candidats.",
    privateContext: 'Contexte privé',
    habits: 'Habitudes de recrutement',
    analyze: 'Analyser',
    analyzeHelp: 'Onbord va lire votre site et pré-remplir les champs ci-dessous automatiquement.',
    description: "Description de l'entreprise",
    generating: 'Génération en cours…',
    descriptionPlaceholder:
      'En 3 à 5 phrases, décrivez ce que fait votre entreprise, votre valeur ajoutée, vos produits ou services principaux…',
    targetMarketPlaceholder: 'Ex : PME européennes, grands comptes, grand public…',
    habitsPlaceholder:
      "Décrivez comment vous recrutez habituellement : processus, nombre d'étapes, outils, critères culturels importants…",
    habitsHelp: "L'IA utilisera ces informations pour mieux adapter les parcours d'évaluation.",
    habitsExample:
      'Ex : nous recrutons généralement en 3 étapes — un entretien RH de qualification (30 min), un entretien technique avec le manager (1 h) et un cas pratique final. Nous valorisons beaucoup la curiosité intellectuelle et la capacité à travailler en autonomie. Nos processus durent environ 3 semaines…',
    afterFirstHire: 'Disponible après votre premier recrutement sur Onbord',
    afterFirstHireHelp:
      'Onbord analysera les tendances de vos recrutements passés pour enrichir ce contexte automatiquement.',
    save: 'Enregistrer le profil',
  },

  // ── Facturation ───────────────────────────────────────────────────────────
  billing: {
    loadError: 'Impossible de charger les informations de facturation.',
    title: 'Facturation & crédits',
    subtitle: 'Suivez votre consommation et rechargez votre compte.',
    costPerAction: 'Coût par action',
    total: 'Total',
    creditsSuffix: '{count} crédits',
    currentPlan: 'Plan actuel',
    unlimitedCredits: 'Crédits illimités',
    creditsPerMonth: '{count} crédits/mois',
    pricePerMonthAnnual: '{price} €/mois (annuel)',
    remainingCredits: 'Crédits restants',
    unlimitedAccess: '✓ Votre compte a un accès illimité.',

    onAdd: "À l'ajout (par offre)",
    qualifyingQuestions: 'Questions qualificatives',
    skillsTest: 'Test de compétences',
    videoModule: "Module vidéo (jusqu'à 3 questions)",
    cvScoring: 'Scoring CV (IA)',
    free: 'Gratuit',

    perCandidate: 'Par candidat',
    cvScoringPerCandidate: 'Scoring CV par candidat',
    fullJourney: 'Parcours complet (candidat)',

    extraCredits: 'Crédits supplémentaires',
    extraCreditsHelp: 'Besoin de plus de crédits ce mois-ci ? Rechargez à tout moment.',
    pricePerExtraCredit: 'Prix par crédit supplémentaire',
    onQuote: 'Sur devis',
    needMore: "Besoin de plus de crédits ou d'un upgrade ?",
    needMoreHelp: 'Contactez-nous, nous gérons votre compte manuellement.',
  },

  // ── Branding employeur ────────────────────────────────────────────────────
  branding: {
    logoUploaded: 'Logo téléversé avec succès !',
    uploadFailed: 'Échec du téléversement.',
    appliedToAll: 'Modifications appliquées à TOUTES les offres de votre entreprise.',
    saved: 'Branding mis à jour avec succès !',

    globalSetting: 'Réglage global (niveau entreprise)',
    globalSettingHelp: "Ce réglage s'appliquera automatiquement à {allJobs}.",
    globalSettingAllJobs: "toutes vos offres d'emploi",

    identity: "Identité de l'entreprise",
    displayName: "Nom d'affichage",
    shortPitch: 'Courte présentation (optionnel)',
    logo: 'Logo',
    uploading: 'Téléversement…',
    chooseImage: 'Choisir une image',
    primaryColor: 'Couleur principale (accent)',
    primaryColorHelp:
      'Appliquée aux boutons, bordures et éléments interactifs (jamais au fond de la page).',
    save: 'Enregistrer les modifications',

    pageSubtitle: "Configurez l'apparence globale des évaluations que vos candidats vont parcourir.",
    preview: 'Aperçu (vue candidat)',
    previewCompanyName: "Nom de l'entreprise",
    previewProgress: 'Progression',
    previewSelected: 'Option sélectionnée',
    previewContinue: "Continuer l'évaluation",
  },

// ── Création d'une offre ──────────────────────────────────────────────────
  jobCreate: {
    steps: { job: "1. Offre d'emploi", details: '2. Détails', journey: '3. Parcours' },
    heading: "Commençons par votre offre d'emploi",
    intro:
      "Onbord lit votre offre d'emploi et en extrait automatiquement les compétences à évaluer. Vous validez, on construit le parcours de screening.",

    modePaste: 'Coller le texte',
    modeFile: 'Importer un fichier',
    modeUrl: "URL de l'offre",
    readingFile: 'Lecture du fichier…',
    changeFile: 'Cliquez pour changer de fichier',
    importFile: 'Cliquez pour importer votre offre',
    analyze: 'Analyser',
    loading: 'Chargement…',
    descriptionPlaceholder:
      "Collez ici votre offre d'emploi, ou décrivez le poste : intitulé, missions, compétences attendues, langues…",

    back: 'Retour',
    next: 'Suivant',
    untitledJob: 'Poste sans titre',

    // ── Erreurs ─────────────────────────────────────────────────────────
    parseError: "Erreur lors de l'analyse du document.",
    readError: 'Erreur lors de la lecture du fichier.',
    urlError: "Erreur lors du chargement de l'URL.",
    tooShort: 'La description est trop courte. Veuillez fournir plus de détails.',
    analysisError: "Une erreur est survenue lors de l'analyse.",
    mustBeLoggedIn: 'Vous devez être connecté pour sauvegarder.',
    saveError: 'Une erreur est survenue lors de la sauvegarde.',
    pipelineSaveError: 'Erreur lors de la sauvegarde du parcours',

    // ── Écran d'attente pendant l'analyse ───────────────────────────────
    fetchingTitle: "Chargement de l'offre…",
    analyzingTitle: "Analyse de l'offre en cours…",
    fetchingHelp: "On récupère le contenu de la page et on le prépare pour l'analyse IA.",
    analyzingHelp:
      "Notre IA lit et structure votre offre d'emploi pour définir automatiquement les critères d'évaluation des candidats.",
    fetchingStatus: 'Chargement en cours…',
    analyzingStatus: 'Intelligence artificielle en action',
  },

// ── Administration (équipe Onbord, pas les clients) ───────────────────────
  admin: {
    accessDenied: 'Accès refusé',
    adminsOnly: 'Cette page est réservée aux administrateurs.',
    title: 'Administration',
    subtitle: "Générez des liens d'invitation pour vos clients.",
    tabInvites: 'Invitations',
    tabCosts: 'Coûts API',
    tabCredits: 'Crédits & plans',

    // ── Invitations ─────────────────────────────────────────────────────
    linkGenerated: 'Lien généré et copié !',
    tokenDeleted: 'Token supprimé',
    linkCopied: 'Lien copié !',
    generateLink: 'Générer le lien',
    noTokens: "Aucun lien généré pour l'instant.",
    copyLink: 'Copier le lien',
    delete: 'Supprimer',
    columns: {
      token: 'Token',
      plan: 'Plan',
      status: 'Statut',
      expires: 'Expire',
      actions: 'Actions',
      user: 'Utilisateur',
      creditsLeft: 'Crédits restants',
      allocatedPerMonth: 'Alloués/mois',
      reset: 'Reset',
    },
    tokenStatus: { used: 'Utilisé', expired: 'Expiré', active: 'Actif' },

    // ── Coûts API ───────────────────────────────────────────────────────
    costsTitle: 'Coûts API',
    costsSubtitle:
      "Coût moyen d'un parcours candidat, basé sur les usages tracés (génération, scoring, assistant IA).",
    periodAll: 'Tout',
    periodDays: '{count} jours',
    avgMarginalCost: 'Coût moyen / parcours (marginal)',
    avgMarginalCostHelp: 'scoring + assistant, par candidat (hors génération)',
    fullCost: 'Coût complet / parcours',
    fullCostHelp: 'génération amortie incluse',
    totalPeriod: 'Total sur la période',
    breakdown: 'Répartition des coûts (période)',
    generationCost: "Génération d'expériences",
    scoringCost: 'Scoring de fin de run',
    assistantCost: 'Assistant IA (Claude)',
    transcriptionNote:
      "La transcription vidéo (AssemblyAI, facturée à la minute) n'est pas incluse — elle n'est pas basée sur des tokens.",
    perJob: 'Par poste',
    jobColumn: 'Poste',
    runsColumn: 'Runs',
    noDataPeriod: 'Aucune donnée sur la période.',

    // ── Crédits & plans ─────────────────────────────────────────────────
    creditsTitle: 'Gestion des crédits & plans',
    creditsSubtitle: 'Modifiez le plan ou ajoutez des crédits à vos clients.',
    noUsers: 'Aucun utilisateur enregistré.',
    creditsResetNote:
      '💡 Les crédits se réinitialisent automatiquement chaque mois selon le plan.',
  },

// ── Flux de génération (retour temps réel) ────────────────────────────────
  generationFeed: {
    couldNotStart: "La génération n'a pas pu démarrer.",
    interrupted: "La génération s'est interrompue.",
    unexpectedError: 'Erreur inattendue',
    step: 'Étape',
    generating: "Génération de l'expérience…",
    generated: 'Expérience générée',
    stepLine: 'Étape {n} — {kind} : {label}',
    skillLine: 'Compétence évaluée : {label}',
    criterionLine: 'Sous-dimension : {label}',
    sourceLine: 'Source du brief : {label}',
    fieldLine: 'Champ de la fiche : {label}',
    trapLine: 'Incohérence volontaire : {label}',
    sourceKinds: {
      email: 'email',
      call_transcript: "retranscription d'appel",
      chat: 'message entrant',
      note: 'note interne',
    },
    kinds: {
      qualifying: 'Question qualifiante',
      question: 'Question ciblée',
      task: 'Mise en situation',
    },
  },

  // ── Feedback constructif au candidat ──────────────────────────────────────
  // Le TEXTE du feedback est rédigé par l'IA dans la langue de l'offre ; ce
  // sont les libellés de la fenêtre qui sont ici, en langue du recruteur.
  feedback: {
    generationError: 'Une erreur est survenue lors de la génération du feedback.',
    saveError: 'Erreur lors de la sauvegarde.',
    generating: "Génération du feedback par l'IA…",
    explanation:
      "Ce brouillon a été généré en se basant sur les points forts, les axes d'amélioration et le statut actuel du candidat.",
    editable:
      "Vous pouvez l'éditer librement avant de le copier. N'oubliez pas de sauvegarder si vous souhaitez conserver vos modifications !",
    placeholder: 'Rédigez ou modifiez le feedback ici…',
    save: 'Sauvegarder',
    close: 'Fermer',
    copied: 'Copié !',
    copy: 'Copier',
  },

  // ── Panneau de configuration d'une étape de pipeline ──────────────────────
  nodeConfig: {
    createExperienceWithAi: "Créer l'expérience avec l'IA",
    tabMessage: 'Message',
    tabBranding: 'Marque employeur',
    welcomeLabel: "Message d'accueil candidat",
    thanksLabel: 'Message de fin de parcours',
    messagePlaceholder: 'Saisissez votre message ici…',
    aiExperience: 'Évaluation IA (Expérience)',
    configured: '✅ Expérience IA configurée avec succès.',
    editWithAi: "Modifier avec l'IA",
    generateHelp:
      'Générez une expérience de mise en situation complète et ultra-réaliste grâce au chat IA.',
  },

  // ── Sélection d'une offre ─────────────────────────────────────────────────
  jobSelection: {
    notAuthenticated: 'Non authentifié',
    loadError: 'Erreur lors du chargement des offres',
    title: 'Sélectionner une offre',
    subtitle: "Choisissez l'offre pour laquelle vous souhaitez créer cette évaluation.",
    search: 'Rechercher une offre…',
    noResults: 'Aucune offre trouvée',
    changeSearch: 'Modifiez votre recherche.',
    noJobsYet: "Vous n'avez pas encore créé d'offres.",
    draft: 'Brouillon',
    noLocation: 'Localisation non définie',
    select: 'Sélectionner',
    createdOn: 'Créée le {date}',
  },

  // ── Sélection d'un test dans la bibliothèque ──────────────────────────────
  testSelection: {
    loadError: 'Erreur lors du chargement des tests',
    title: 'Associer un test',
    subtitle: "Choisissez un test de votre bibliothèque pour l'associer à cette étape.",
    search: 'Rechercher dans Mes Assessments…',
    noResults: 'Aucun test trouvé',
    changeSearch: 'Modifiez votre recherche.',
    noTestsYet: "Vous n'avez pas encore de tests dans votre bibliothèque.",
    attach: 'Associer',
  },

  // ── Configuration des tests de compétences ────────────────────────────────
  skillsTestConfig: {
    categories: { cognitif: "Cognitif", langue: "Langues", metier: "Métier", personnalite: "Personnalité", ia: "IA" },
    loadingLibrary: 'Chargement de la bibliothèque…',
    totalDuration: 'Durée totale estimée pour le candidat',
    selectOneTest: 'Sélectionnez 1 test',
    comingSoon: 'Bientôt',
    categories: {
      Cognitif: 'Cognitif',
      Langues: 'Langues',
      Métier: 'Métier',
      Personnalité: 'Personnalité',
    },
  },

  // ── Recommandation de parcours ────────────────────────────────────────────
  recommendation: {
    fallbackTitle: "Account Manager",
    fallbackRoleType: "Contributeur individuel",
    skillsTest: 'Test de compétences',
    backToSkills: 'Retour à la sélection des compétences',
    configureAllModules:
      'Veuillez configurer tous les modules ajoutés (questions, vidéo, test) avant de valider.',
    validate: 'Valider',
  },

  // ── Questions qualificatives ──────────────────────────────────────────────
  qualifyingConfig: {
    questionNumber: "Question {n}",
    none: 'Aucune question qualificative',
    noneHelp:
      "Ajoutez des questions pour filtrer automatiquement les candidats avant qu'ils ne passent l'assessment.",
    expectedAnswer: 'Réponse attendue',
    yes: 'Oui',
    no: 'Non',
    deleteQuestion: 'Supprimer la question',
  },

  // ── Création d'une évaluation ─────────────────────────────────────────────
  assessmentCreation: {
    hello: "Bonjour {name}",
    whichType: "Quel type d'évaluation souhaitez-vous créer ?",
    addContext: 'Ajouter du contexte',
    jobAsPdf: 'Poste en PDF',
    comingSoon: 'Bientôt disponible',
    connectGithub: 'Connecter repo Github',
    uploadZip: 'Upload un doc ZIP',
  },

  // ── Modale d'action sur une étape d'évaluation ────────────────────────────
  assessmentAction: {
    skillsTest: 'Test de compétences',
    whatToDo: 'Que souhaitez-vous faire ?',
    addNewTest: 'Ajouter un nouveau test',
    createWithAi: "Créer un test sur-mesure avec l'IA",
    selectFromLibrary: 'Sélectionner depuis la bibliothèque',
    useExisting: 'Utiliser un test déjà existant',
  },

  // ── Guide d'activation ────────────────────────────────────────────────────
  onboarding: {
    title: "Guide d'activation",
    ready: 'Prêt à recruter ?',
    done: 'Bravo ! Vous êtes opérationnel.',
    dismiss: 'Faire disparaître ce guide',
    steps: {
      account: 'Compte créé',
      firstJob: 'Première demande créée',
      firstCandidate: 'Premier candidat importé',
      firstScoring: 'Premier scoring lancé',
    },
  },

  // ── Widget de crédits ─────────────────────────────────────────────────────
  usage: {
    planNamed: "Formule {plan}",
    credits: 'Crédits',
    resetsMonthly: 'Réinitialisation le 1er du mois',
    creditsUsed: 'Crédits utilisés',
    changePlan: 'Changer de plan',
    topUp: 'Recharger',
  },

  // ── Critères de scoring CV ────────────────────────────────────────────────
  cvCriteria: {
    placeholder: "Ex : expérience en management d'équipe",
    distributeEvenly: 'Répartir équitablement',
  },

  // ── Préférences de compte ─────────────────────────────────────────────────
  preferences: {
    uiLanguage: "Langue de l'interface",
    uiLanguageHelp:
      "N'affecte que votre affichage du dashboard. La langue vue par vos candidats se règle offre par offre.",
    languageSaved: "Langue mise à jour",
    languageError: "Impossible d'enregistrer la langue.",
  },
};

export default dashboard;
