// Interface recruteur — français. SOURCE DE VÉRITÉ.
//
// Namespace chargé uniquement sous app/(dashboard)/ : il ne part jamais dans le
// bundle du parcours candidat. Pas de version néerlandaise (cf. config.js :
// UI_LOCALES = fr, en).

const dashboard = {
  // ── Navigation ────────────────────────────────────────────────────────────
  nav: {
    home: "Tableau de bord",
    jobs: "Jobs",
    manageAccount: "Gérer mon compte",
    newJob: "Nouveau job",
    settings: "Paramètres",
    signOut: "Déconnexion",
    menu: "Menu",
    recentJobs: "Jobs récents",
    search: "Rechercher",
    searchPlaceholder: "Rechercher…",
    collapse: "Replier le menu",
    expand: "Déplier le menu",
  },

  // ── Recherche ⌘K ──────────────────────────────────────────────────────────
  search: {
    placeholder: "Rechercher un job ou un candidat…",
    pages: "Raccourcis",
    candidates: "Candidats",
    noResults: "Aucun résultat",
  },

  // ── Éléments partagés ─────────────────────────────────────────────────────
  common: {
    copyPublicLink: "Copier le lien public",
    linkCopied: "Lien copié",
  },

  // ── Tableau de bord ───────────────────────────────────────────────────────
  home: {
    keyFigures: "Chiffres clés",
    hello: "Bonjour {name}",
    openJobs_one: "ouvert",
    openJobs_other: "ouverts",
    candidates: "Candidats",
    inTotal: "au total",
    credits: "Crédits",
    creditsUsedOf: "{used} utilisés sur {total}",
    creditsLeft: "restants",
    yourJobs: "Vos jobs",
    seeAllJobs: "Voir tous les jobs",
    noActiveJobs: "Aucun job ouvert",
    status: "Statut",
    statusOpen: "Ouvert",
    candidatesCount_one: "{count} candidat",
    candidatesCount_other: "{count} candidats",
    completed: "Ont terminé",
    createdOn: "Créé le",
    latestCandidates: "Derniers candidats",
    noCandidates: "Aucun candidat pour l'instant",
    activityWeek: "Activité de la semaine",
    activityMonth: "Activité du mois",
    period: "Période",
    week: "Semaine",
    month: "Mois",
    completedThisWeek_one: "simulation terminée cette semaine",
    completedThisWeek_other: "simulations terminées cette semaine",
    completedThisMonth_one: "simulation terminée ce mois-ci",
    completedThisMonth_other: "simulations terminées ce mois-ci",
    legendInvited: "Invités",
    legendCompleted: "Terminées",
    tooltip: "{inv} invités · {done} terminées",
    chartDay: "{day} : {inv} invités, {done} terminées",
  },

  // ── Liste des offres ──────────────────────────────────────────────────────
  jobs: {
    tabOpen: "Ouverts",
    tabDrafts: "Brouillons",
    tabClosed: "Fermés",
    untitled: "Job sans titre",
    noActiveJobs: "Aucun job ouvert",
    noDrafts: "Aucun brouillon",
    noClosed: "Aucun job fermé",
    createFirst: "Créez votre premier job pour démarrer.",
    draftsAppearHere: "Vos jobs non publiés apparaîtront ici.",
    closedAppearHere: "Les jobs dont vous fermez les candidatures apparaîtront ici.",
    filterLabel: "Filtrer les jobs",
    sort: "Trier",
    sortRecent: "Plus récents",
    sortOldest: "Plus anciens",
    sortCandidates: "Nombre de candidats",
    colJob: "Job",
    colCreated: "Créé le",
    colCandidates: "Candidats",
    colCompleted: "Terminé par",
    colActions: "Actions",
    moreActions: "Plus d'actions",
    moreActionsFor: "Plus d'actions pour {title}",
    footerOpen_one: "{count} job ouvert",
    footerOpen_other: "{count} jobs ouverts",
    footerDrafts_one: "{count} brouillon",
    footerDrafts_other: "{count} brouillons",
    footerClosed_one: "{count} job fermé",
    footerClosed_other: "{count} jobs fermés",

    delete: "Supprimer",
    deleteConfirm: "Supprimer ce job et tous ses candidats ?",
    deleteError: "Erreur lors de la suppression",
    deleted: "Job supprimé",
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
    next_step: "Étape suivante",
    rejected: "Rejeté",
    disqualified: "Disqualifié",
  },

  // ── Étapes de la pipeline ─────────────────────────────────────────────────

  // ── Fiche offre ───────────────────────────────────────────────────────────
  jobDetail: {
    tabs: {
      parcours: "Parcours candidat",
      candidats: "Candidats",
      context: "Contexte",
      parametres: "Paramètres",
    },
    sectionsLabel: "Sections du job",
    applicationsOpenChip: "Candidatures ouvertes",
    applicationsClosedChip: "Candidatures fermées",
    draftChip: "Brouillon",
    dangerZone: "Zone de danger",
    contextTitle: "Description du poste",
    viewReport: "Voir le rapport",
    selectAll: "Sélectionner tous les candidats",
    selectOne: "Sélectionner {name}",
    deleteOne: "Supprimer {name}",
    deleteSelected_one: "Supprimer ({count})",
    deleteSelected_other: "Supprimer ({count})",
    bulkDeleteConfirm_one: "Supprimer {count} candidat ?",
    bulkDeleteConfirm_other: "Supprimer {count} candidats ?",
    bulkDeleted_one: "{count} candidat supprimé",
    bulkDeleted_other: "{count} candidats supprimés",

    // ── Onglet Parcours candidat ────────────────────────────────────────
    journeyCard: {
      title: "Parcours du candidat",
      subtitle: "Le candidat répond d'abord aux questions de présélection, puis passe la simulation.",
      step: "Étape {n}",
      questionsCount_one: "{count} question fermée, avec la réponse attendue",
      questionsCount_other: "{count} questions fermées, avec la réponse attendue",
      noQuestions: "Aucune question pour l'instant",
      noQuestionsHelp: "Ajoutez des questions fermées pour écarter d'emblée les profils hors critères.",
      editQuestions: "Modifier les questions",
      addQuestions: "Ajouter des questions",
      simulation: "Simulation",
      steps_one: "{count} étape",
      steps_other: "{count} étapes",
      noSimulation: "Pas encore de simulation",
      editSimulation: "Modifier la simulation",
      designSimulation: "Concevoir la simulation",
      cvRequired: "CV demandé",
      coverage: "Couverture des compétences",
      coverageValue: "{covered} sur {total}",
      in: { fr: "en français", en: "en anglais", nl: "en néerlandais" },
    },

    // ── Panneau des questions de présélection ───────────────────────────
    questions: {
      title: "Questions de présélection",
      subtitle: "{job} · étape 1 du parcours candidat",
      intro: "Des questions fermées, avec la réponse que vous attendez de chaque candidat.",
      question: "Question",
      questionN: "Question {n}",
      expected: "Réponse attendue",
      expectedN: "Réponse attendue à la question {n}",
      placeholder: "Nouvelle question…",
      deleteN: "Supprimer la question {n}",
      count_one: "{count} question",
      count_other: "{count} questions",
      done: "Terminé",
      saved: "Questions enregistrées",
    },
    delete: "Supprimer",
    colCandidate: "Candidat",
    colScore: "Score global",
    colStatus: "Statut",
    colActions: "Actions",
    back: "Retour",
    jobLabel: "Offre d'emploi",


    // ── Lien public ─────────────────────────────────────────────────────
    copyPublicLink: "Copier le lien public",
    linkCopied: "Lien copié !",
    publicLinkCopied: "Lien public copié !",
    publishFirst: 
      "Publiez d'abord la simulation : le lien enverrait les candidats sur un écran d'attente.",
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
      "Êtes-vous sûr de vouloir supprimer ce job ? Cette action est irréversible.",
    jobDeleted: "Job supprimé",
    stepDeleted: "Étape supprimée",
    stepAdded: "Étape ajoutée",
    contextSaved: "Contexte sauvegardé",

    // ── Pipeline ────────────────────────────────────────────────────────
    lockPipeline: "Verrouiller la pipeline",
    unlockPipeline: "Déverrouiller la pipeline",
    noAssessment: "Aucune évaluation configurée",
    addTestsHint: "Ajoutez des tests via l'étape « Parcours » de votre offre.",
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

    // ── Liste des candidats ─────────────────────────────────────────────
    searchCandidate: "Rechercher un candidat",
    noCandidates: "Aucun candidat",
    shareLinkToStart:
      "Partagez le lien public pour commencer à recevoir des candidatures.",
    sort: {
      score: "Score",
      scoreDesc: "Score décroissant",
      scoreAsc: "Score croissant",
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
      "Sert de contexte à ce job. Modifiable à tout moment : elle guide la rédaction des évaluations.",
    markdownContent: "Contenu",
    sourcesHelp:
      "Sources rattachées à cette offre. Désactivez-en une pour la garder attachée tout en l'excluant du contexte utilisé pour concevoir les évaluations.",
    jobDescriptionUrl: "Description du poste — URL",

    // ── Onglet Paramètres ───────────────────────────────────────────────
    details: "Détails du poste",
    title: "Titre",
    location: "Lieu",
    contractType: "Type de contrat",
    employmentType: "Mode de travail",
    contract: {
      freelance: "Freelance",
      internship: "Stage",
      apprenticeship: "Alternance",
      temp: "Intérim",
    },
    workMode: {
      remote: "Télétravail",
      hybrid: "Hybride",
      fullTime: "Sur site",
    },

    visibility: "Visibilité",
    applicationsClosed: "Les candidatures sont fermées",
    applicationsOpen: "Les candidatures sont ouvertes",
    applicationsClosedHelp: "Les candidats ne peuvent plus postuler à cette offre.",
    applicationsOpenHelp:
      "Les candidats peuvent être invités et suivre les différentes étapes du processus de recrutement.",

    closeApplications: "Fermer les candidatures",
    deleteJob: "Supprimer ce job",
    deleteJobHelp: 
      "Supprime le job et le dissocie de ses candidats. Les évaluations restent dans votre bibliothèque. Cette action ne peut pas être annulée.",
  },

  // ── Fiche candidat : le rapport de preuves ────────────────────────────────
  //
  // C'est l'écran de décision du recruteur. Il suit donc la langue de
  // L'INTERFACE, pas celle de l'offre — un recruteur anglophone doit pouvoir
  // lire le rapport d'un candidat néerlandophone. Les réponses du candidat et
  // les verbatims cités, eux, restent dans leur langue d'origine.
  candidateDetail: {
    collapseAll: "Tout replier",
    expandAll: "Tout déplier",
    candidateCard: "Candidat",
    deleteCandidate: "Supprimer le candidat",
    lastMail: "Dernier e-mail",
    pastes: "Copier-coller",
    pointsOutOf: "{pts} points sur {max}",
    stepsScored_one: "{count} étape notée · le détail par critère est dans l'étape ci-dessous.",
    stepsScored_other: "{count} étapes notées · le détail par critère est dans chaque étape ci-dessous.",
    conversationTitle: "Transcription et enregistrement de l'échange",
    interlocutor: "Interlocuteur",
    aiExchanges_one: "{count} question à l'IA",
    aiExchanges_other: "{count} questions à l'IA",
    aiExchangesTitle_one: "Échanges avec l'assistant IA ({count} message)",
    aiExchangesTitle_other: "Échanges avec l'assistant IA ({count} messages)",
    skillCriteria: "{skill} · critères",
    candidateChoice: "Choix du candidat",
    expectation: "Attendu : « {text} »",
    aiAnalysisCount_one: "Analyse IA — {count} question évaluée",
    aiAnalysisCount_other: "Analyse IA — {count} questions évaluées",
    questionN: "Question {n}",
    averageScore: "Score moyen",
    aiInterviewShort: "Entretien IA",
    integrityTracking: "Suivi de l'intégrité",
    manualReview: "À revoir manuellement",
    criteriaDetail: "Détail par critère",
    taxonomyId: "ID taxonomie",
    backToCandidates: "Retour aux candidats",
    feedback: "Feedback",
    feedbackSentOn: "Feedback envoyé le {date}",
    viewOriginalCv: "Voir le CV original",
    delete: "Supprimer",
    gdpr: "RGPD",
    cvAnalysis: "Analyse du CV",
    skillsTests: "Tests de compétences",
    aiAnalysis: "Analyse IA",
    slowerThanAverage: "Plus lent que la moyenne",
    topPerformer: "Top Performer",
    aiInterview: "Entretien IA",
    videoInterview: "Entretien vidéo",
    levelBetween: "Niveau {level} : intermédiaire entre N{low} ({lowLabel}) et N{high} ({highLabel}).",
    notFound: "Candidat introuvable",
    back: "Retour",
    deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce candidat ?",
    manualScoreError: "Erreur lors de la sauvegarde du score manuel :",

    // ── Colonne d'identité ──────────────────────────────────────────────
    status: "Statut",
    invitedOn: "Invité le",
    completedOn: "Terminé le",
    pending: "En attente",
    validateProfile: "Présélectionner",
    granted: "Accordé",
    windowExits: "Sorties de fenêtre",
    mailHistory: "Historique mails",
    mail: {
      invitation: "Invitation",
      validation: "Validation",
      rejection: "Refus",
      feedback: "Feedback",
    },

    // ── Actions de statut (verbes, pas états) ───────────────────────────
    actions: {
      shortlist: "Valider",
      nextStep: "Passer à l'étape suivante",
      reject: "Refuser",
      disqualify: "Disqualifier",
    },

    // ── Score global ────────────────────────────────────────────────────
    globalScore: "Score global de l'évaluation",
    globalScoreHelp: "Moyenne pondérée selon vos critères de sélection.",
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
    evidenceReport: "Rapport d'évidence",
    inProgress: "En cours",
    aiUsage: "Usage de l'Assistant IA",
    aiUsageHelp: "Mesure {em} le candidat a piloté l'IA, pas s'il l'a utilisée",
    aiUsageHelpEm: "comment",
    aiPrompts_one: " — {count} sollicitation de l'assistant sur ce parcours",
    aiPrompts_other: " — {count} sollicitations de l'assistant sur ce parcours",
    aiUsageNotScoredHelp:
      "Le candidat n'a pas sollicité l'assistant. Cette dimension mesure {em} il l'aurait piloté : elle n'est pas notée en son absence, et ne pénalise pas le score global.",
    expected: "attendu :",
    aiUsageNotScored: "Usage de l'assistant IA : non noté",
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
    checkpointPoints: "{points}/{max} pts · {score}%",
    checkpointLevel: {
      0: "absent",
      1: "présent mais faible",
      2: "présent et bien fait",
    },
    tier: {
      must_have: "Must-have",
      nice_to_have: "Nice-to-have",
    },

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
    // Sélecteur de voix du personnage (appel).
    voices: {
      title: "Voix du personnage",
      titleNamed: "Voix de {name}",
      help: "La voix de l'IA qui joue le personnage pendant l'appel.",
      loading: "Chargement des voix…",
      male: "Homme",
      female: "Femme",
      variant: "{lang} ({region})",
      standard: "{genre} · voix standard ({lang})",
      custom: "Voix personnalisée",
      forcedGender: "Seule une voix de {genre} existe pour cette langue : l'appel se fera avec elle. Pensez à adapter le prénom du personnage.",
      lang: { fr: "français", nl: "néerlandais", en: "anglais", de: "allemand", es: "espagnol", it: "italien" },
      region: {
        nl_BE: "Flandre", nl_NL: "Pays-Bas", fr_BE: "Belgique", fr_FR: "France",
        en_GB: "Royaume-Uni", en_US: "États-Unis", de_DE: "Allemagne", es_ES: "Espagne", it_IT: "Italie",
      },
    },
    // Éléments d'interface partagés (panneaux repliables).
    ui: {
      toggle: "Réduire ou agrandir : {title}",
      toggleShort: "Réduire / agrandir",
    },
    sourceFrom: "De…",
    sourceSubject: "Objet…",
    sourceReceived: "Reçu le…",
    fieldLabel: "Libellé affiché",
    fieldKey: "clé",
    addSource: "Source",
    addField: "Champ",
    addTrap: "Incohérence",
    reviewTitle: "Relecture de l'expérience",
    stepCount_one: "{count} étape",
    stepCount_other: "{count} étapes",
    estimatedMinutes: " · ~{minutes} min",
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
      "⚠️ Au moins un candidat a déjà commencé cette version. Votre prochaine modification en créera une nouvelle, que seuls les {next} candidats passeront : ceux déjà engagés gardent la leur et sont notés sur sa grille.",
    forkedNotice:
      "Nouvelle version v{version} créée : les candidats déjà engagés gardent la précédente, les suivants passeront celle-ci.",
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
    subDimensions: "Sous-compétences",
    addSubDimension: "Sous-compétence",
    subDimensionName: "Nom de la sous-compétence",
    newSubDimension: "Nouvelle sous-compétence",
    addCheckpoint: "Checkpoint",
    checkpointPlaceholder: "Un seul comportement observable dans la réponse",
    checkpointsHelp:
      "Chaque checkpoint est noté à part — absent, présent mais faible, présent et bien fait — puis les checkpoints s'additionnent. Un checkpoint décrit un seul comportement, atteignable avec ce que l'énoncé et la scène donnent au candidat.",
    legacyGrid:
      "Ancienne grille à niveaux — toujours notée telle quelle. Une réécriture de l'étape par l'assistant la convertit en checkpoints.",
    criterionSkills: "Compétences notées :",
    addSkill: "+ compétence",
    noSkill: "Aucune compétence rattachée",
    addedForCoverage: "Ajoutée pour couvrir la compétence « {skill} »",
    qcmSkill: "Compétence vérifiée par ce QCM",
    coverage: {
      title: "Couverture des compétences",
      // Le geste par lequel la compétence est prouvée, à côté de l'étape.
      format: {
        text: "réponse écrite",
        video: "vidéo",
        qcm: "QCM",
        choice: "choix",
        code: "code",
        email: "e-mail",
        client_reply: "réponse client",
        document: "document",
        crm: "CRM",
        sheet: "tableur",
        inbox: "boîte de réception",
        persona: "conversation avec un personnage",
        board: "tableau à prioriser",
      },
      must: "Must-have",
      nice: "Nice-to-have",
      missing_one: "{count} compétence must-have testée nulle part",
      missing_other: "{count} compétences must-have testées nulle part",
      allCovered: "Toutes les compétences must-have sont testées",
      uncovered: "Aucun checkpoint ne teste cette compétence : un candidat serait retenu ou écarté sans qu'elle ait été observée.",
      uncoveredNice: "non testée (sans conséquence)",
      testedIn: "Étape {n} « {title} »",
      checkpointCount_one: "{count} checkpoint",
      checkpointCount_other: "{count} checkpoints",
      automatic: "corrigée automatiquement",
      addedTag: "ajoutée pour la couverture",
      cover: "Couvrir cette compétence",
      coverHelp:
        "Ajoute une sous-compétence à l'étape qui s'y prête le mieux, ou crée un exercice dédié si aucune ne convient. 2 crédits.",
      covering: "Recherche d'une étape…",
      coveredAttached: "Compétence ajoutée à la grille de l'étape {n}",
      coveredNewStep: "Nouvel exercice créé pour cette compétence (étape {n})",
      overDuration:
        "Cette simulation compte {steps} exercices, au-delà de la cible de {max}, pour couvrir {count} compétences must-have. Pour la raccourcir, passez une compétence en nice-to-have ou retirez-la de la liste de l'offre.",
      noSkills:
        "Aucune compétence validée sur cette offre : la couverture de la simulation ne peut pas être vérifiée.",
      offList: "{id} (hors liste)",
      publishWithGaps:
        "Ces compétences must-have ne sont testées par aucun checkpoint :\n{skills}\n\nPublier quand même ?",
    },
    addStep: "Ajouter une étape",
    addOption: "Ajouter une option",
    promptPlaceholder: "Consigne / mise en situation",
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
      crm: "🗂️  CRM",
      sheet: "📊  Tableur",
      inbox: "📥  Boîte de réception",
      persona: "📞  Personnage IA (appel ou chat)",
      board: "🗃️  Tableau à prioriser",
    },

    // ── QCM ─────────────────────────────────────────────────────────────
    qcmOptions: "Options QCM",
    qcmCorrect: "Bonne réponse",
    qcmHelp:
      "Sélectionnez la bonne réponse avec le bouton radio. Le candidat sera noté automatiquement (correct/incorrect).",

    // ── Sandbox CRM ─────────────────────────────────────────────────────
    code: {
      language: "Langage d'exécution",
      starter: "Squelette de départ",
      starterPlaceholder: "Code affiché au candidat au chargement de l'étape.",
      tests: "Cas de test",
      testCount: "{visible} visibles, {hidden} cachés",
      testNamePlaceholder: "Nom du cas (ex. : liste vide)",
      hidden: "Caché",
      stdin: "Entrée standard",
      expected: "Sortie attendue",
      addTest: "Ajouter un cas de test",
      warnNoVisible: "Aucun cas visible : le candidat ne saura pas quel format de sortie produire.",
      warnNoHidden: "Aucun cas caché : il suffit d'imprimer les réponses affichées pour tout réussir.",
      help: "La correction se fait par exécution réelle : une sortie attendue erronée fait échouer tous les candidats. Les espaces en fin de ligne et la ligne vide finale sont ignorés à la comparaison.",
    },
    // Indexés par la clé de config de l'étape (CHAMPS_SCENE, page de l'expérience).
    scene: {
      client_message: "Message de l'interlocuteur — montré au candidat",
      to: "Destinataire — montré au candidat",
      subject: "Objet imposé — vide si le candidat l'écrit",
      context: "Contexte remis au candidat",
      document_context: "Contexte du document — montré au candidat",
    },
    crm: {
      fieldsHelp: "Les champs {factual} sont corrigés automatiquement (sans IA) et regroupés en un critère, sous la compétence de l'étape. Les champs de {judgment} sont notés par les checkpoints ci-dessus. Le candidat ne voit aucune différence entre les deux.",
      fieldsHelpFactual: "factuels",
      fieldsHelpJudgment: "jugement",
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
      natureJudgment: "Jugement (noté par la grille)",
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
      // CRM v2 : le pipeline
      mission: "Mission du candidat",
      missions: {
        update: "Mettre à jour une fiche",
        pipeline_review: "Passer le pipeline en revue",
        account_prep: "Préparer un rendez-vous",
      },
      pipelineName: "Nom du pipeline",
      focusRecord: "Fiche concernée par la mission",
      stages: "Étapes du pipeline (virgules)",
      records_one: "Fiches du pipeline ({count})",
      records_other: "Fiches du pipeline ({count})",
      addRecord: "Ajouter une fiche",
      activityCount_one: "{count} activité",
      activityCount_other: "{count} activités",
      recordName: "Nom de la fiche",
      recordCompany: "Société",
      recordContact: "Contact (fonction)",
      recordStage: "Étape",
      recordAmount: "Montant",
      recordCurrency: "Devise",
      recordCloseDate: "Clôture prévue",
      recordOwner: "Propriétaire",
      recordLastActivity: "Dernière activité",
      properties: "Autres propriétés",
      propertiesPlaceholder: "Une par ligne — Effectif : 120",
      timeline: "Historique",
      addActivity: "Ajouter une activité",
      activityTypes: {
        email: "E-mail",
        call_transcript: "Compte rendu d'appel",
        chat: "Message",
        note: "Note interne",
        meeting: "Réunion",
      },
    },
    sheet: {
      fileName: "Nom du fichier",
      deliverableLabel: "Libellé de la synthèse demandée",
      data: "Données",
      dataHelp: "Une ligne par ligne, en-têtes en première ligne, colonnes séparées par des tabulations — collez directement depuis votre tableur.",
      addTab: "Ajouter un onglet",
      tabName: "Nom de l'onglet",
      dataSize: "{rows} lignes · {cols} colonnes",
      unevenRows: "⚠ Certaines lignes n'ont pas le même nombre de colonnes que les en-têtes.",
      analysisNotes: "Ce que les données cachent — lu par le correcteur, jamais par le candidat",
      analysisHelp: "Vérifiez que le constat décrit ici se lit vraiment dans les chiffres : le correcteur s'y fie. Les totaux exacts lui sont recalculés automatiquement.",
    },
    inbox: {
      owner: "Boîte de",
      now: "Moment",
      messages_one: "Messages ({count})",
      messages_other: "Messages ({count})",
      addMessage: "Ajouter un message",
      from: "Expéditeur",
      fromRole: "Fonction, société",
      subject: "Objet",
      receivedAt: "Reçu",
      expectedTriage: "Tri attendu",
      trap: "Piège",
      why: "Pourquoi (lu par le correcteur)",
      help: "Le tri attendu et les pièges ne sont jamais montrés au candidat : ils guident le correcteur, qui crédite aussi un autre ordre s'il est justifié.",
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
    },
    persona: {
      modeHelp: "Comment l'échange se déroule avec le candidat.",
      voiceTitle: "Langue, accent et voix",
      voiceHelp: "Comment parle le personnage pendant l'échange.",
      voiceIdHelp: "La voix de l'IA qui joue le personnage pendant l'appel.",
      turnsHelp: "Nombre de répliques du candidat avant la fin de l'échange.",
      turnsLess: "Une réplique de moins",
      turnsMore: "Une réplique de plus",
      mode: "Canal",
      modes: { call: "Appel (vocal)", chat: "Chat (écrit)" },
      name: "Nom",
      role: "Fonction",
      company: "Entreprise",
      language: "Langue",
      accent: "Accent",
      gender: "Voix",
      genders: { f: "Féminine", m: "Masculine" },
      voiceId: "Voix ElevenLabs imposée (facultatif)",
      voiceIdPlaceholder: "Vide = voix par défaut de la langue et de l'accent — sinon l'ID d'une voix de votre compte ElevenLabs",
      maxTurns: "Messages max",
      context: "Contexte remis au candidat",
      opening: "Première réplique du personnage",
      openingPlaceholder: "Vide si c'est au candidat de parler en premier",
      hiddenTitle: "Le jeu du personnage — jamais montré au candidat",
      personality: "Personnalité",
      goals: "Ce que veut le personnage",
      hiddenInfo: "Informations cachées (livrées seulement si le candidat sait les faire sortir)",
      objections: "Objections",
      redLines: "Ce que le personnage n'accepte pas",
      successSignals: "Signes d'une conversation réussie — lus par le correcteur",
      onePerLine: "Un élément par ligne",
      help: "En appel, le candidat parle et le personnage répond à voix haute ; sa caméra est enregistrée. La transcription est notée par la grille de l'étape, comme toute réponse.",
    },
    board: {
      title: "Titre du tableau",
      mode: "Type de tableau",
      modes: { backlog: "Backlog produit", roadmap: "Roadmap", project: "Plan de projet", tickets: "File de tickets" },
      constraint: "Contrainte (capacité, budget, délai) — montrée au candidat",
      columns: "Colonnes (virgules, de la plus urgente au rejet)",
      cards_one: "Cartes ({count})",
      cards_other: "Cartes ({count})",
      addCard: "Ajouter une carte",
      cardTitle: "Titre de la carte",
      expected: "Colonne attendue",
      metaPlaceholder: "Repères, un par ligne — Effort : 5 j",
      help: "La colonne attendue et les pièges ne sont jamais montrés au candidat : ils guident le correcteur, qui crédite aussi un autre arbitrage s'il tient compte de la contrainte.",
    },
    filRouge: {
      fullscreen: "Afficher le fil conducteur en plein écran",
      fullscreenSub: "Texte lu par le candidat avant de commencer · {job}",
      reduce: "Réduire",
      finish: "Terminer",
      unsavedHint: "Modifications non enregistrées : enregistrez-les pour que les candidats les lisent.",
      liveHint: "C'est le texte que lisent les candidats.",
      title: "Fil conducteur",
      help: "Le candidat lit ce texte avant de commencer et peut le relire à chaque étape. Videz-le pour retirer le fil conducteur.",
      candidateText: "Texte lu par le candidat",
      universe: "Fiche de cohérence (noms, chiffres, dates)",
      universeHelp: "Utilisée pour écrire et réécrire les mises en situation détaillées. Jamais montrée au candidat.",
      saved: "Fil conducteur enregistré",
      removed: "Fil conducteur retiré",
    },
    // Case « CV avant la simulation » (jobs.cv_requis). Le ton est celui d'un
    // conseil, pas d'une interdiction : l'entreprise garde le CV si elle y tient,
    // et on lui dit pourquoi elle peut s'en passer.
    cv: {
      adviceLead: "Notre conseil : essayez sans.",
      adviceRich: "{lead} La simulation montre ce que les candidats savent faire ; un CV montre ce qu'ils disent avoir fait, et le demander d'abord décourage une partie des meilleurs profils.",
      title: "CV des candidats",
      label: "Demander le CV avant la simulation",
      help: "Cochée, chaque candidat dépose son CV (PDF) avant de commencer. Vous le retrouvez sur sa fiche, à côté de ses résultats.",
      advice: "Notre conseil : essayez sans. La simulation montre ce que le candidat sait faire ; le CV, ce qu'il dit avoir fait — et le demander en premier décourage une partie des bons profils.",
      onlyNext: "S'applique aux candidats qui n'ont pas encore commencé.",
      enabled: "Le CV sera demandé avant la simulation",
      disabled: "Le CV n'est plus demandé",
    },

    // ── Vue d'ensemble de la simulation et page d'une étape (09/10/2026) ──
    overview: {
      steps: "Les étapes",
      stepsHelp: "Cliquez sur une étape pour revoir son scénario et sa notation, ou la retravailler avec l'IA.",
      type: "Type",
      duration: "Durée",
      skillsAssessed: "Compétences évaluées",
      gradeShare: "Part de la note",
      title: "Votre simulation",
      journey: "Le parcours",
      journeyHelp: "Cliquez sur une étape pour relire son scénario, son scoring, ou la retoucher avec l'IA.",
      minutes: "{minutes} min",
      skills_one: "{count} compétence",
      skills_other: "{count} compétences",
      share: "{part} % de la note",
      noShare: "non notée",
      recapLoading: "Résumé en cours…",
      moveEarlier: "Avancer d'une place",
      moveLater: "Reculer d'une place",
      settings: "Paramètres de la simulation",
      call: "appel",
      chat: "conversation écrite",
    },
    notation: {
      title: "Comment le candidat est noté",
      intro: "La note finale, sur 100, est la moyenne de toutes les sous-compétences des étapes. Une sous-compétence liée à une compétence obligatoire de l'offre compte double.",
      skill: "Compétence",
      stepShort: "É{n}",
      share: "Part de la note",
      must: "Obligatoire · compte double",
      nice: "Bonus · compte simple",
      auto: "auto",
      legend: "Chiffre = nombre de checkpoints qui notent la compétence dans l'étape · auto = correction automatique. Cliquez sur une étape pour modifier ce qu'elle vérifie.",
      summary_one: "{count} compétence — ouvrez pour voir où elle est notée",
      summary_other: "{count} compétences — ouvrez pour voir où chacune est notée",
      inStep: "Étape {n}",
    },
    stepPage: {
      presentation: "Présentation de l'étape",
      viewsLabel: "Vues de l'étape",
      back: "Parcours",
      stepOf: "Étape {n} sur {total}",
      previous: "Étape précédente",
      next: "Étape suivante",
      tabScenario: "Scénario",
      tabScoring: "Notation",
      delete: "Supprimer",
      notFound: "Cette étape n'existe plus dans la version affichée de la simulation.",
      unsaved: "Modifications non enregistrées",
      discard: "Annuler",
      leaveUnsaved: "Vous avez des modifications non enregistrées. Les abandonner ?",
      content: "Mise en situation",
      format: "Format de l'étape",
      assistant: "Assistant IA autorisé pendant l'étape",
      lockedShort: "Un candidat a déjà commencé cette version : votre prochaine modification créera une nouvelle version pour les candidats suivants.",
    },
    scoring: {
      checkpointsCount_one: "{count} point de contrôle",
      checkpointsCount_other: "{count} points de contrôle",
      howTitle: "Comment cette étape est notée",
      share: "Cette étape compte pour {part} % de la note finale.",
      shareNone: "Cette étape n'entre pas dans la note finale.",
      checkpointsRule: "Après la simulation, l'IA relit la réponse du candidat et note chaque checkpoint : 0 s'il est absent, 1 s'il est présent mais faible, 2 s'il est présent et bien fait — en citant le passage qui le prouve. Le score d'une sous-compétence est la somme de ses checkpoints, en % du maximum.",
      doubt: "En cas de doute, un second avis indépendant est demandé, et un troisième si les deux divergent.",
      weightRule: "Dans la note finale, chaque sous-compétence compte une fois — deux fois si elle porte sur une compétence obligatoire de l'offre.",
      autoQcm: "QCM corrigé automatiquement : 100 si la bonne réponse est choisie, 0 sinon.",
      autoCrm: "Les champs factuels de la fiche CRM sont corrigés automatiquement, par comparaison avec les valeurs attendues.",
      autoCode: "Le code est exécuté sur les tests : le score est le pourcentage de tests réussis. Les tests se modifient dans l'onglet Scénario.",
      level0: "absent",
      level1: "partiel",
      level2: "maîtrisé",
      weightMust: "×2 obligatoire",
      weightNice: "×1 bonus",
      checkpointsTitle: "Ce que l'IA vérifie",
      noCriteria: "Aucune sous-compétence : l'IA ne note pas cette étape.",
      howLink: "Comment l'IA note-t-elle ?",
      mainSkill: "Compétence principale :",
      addSubSkill: "Ajouter une sous-compétence",
      countsDouble: "Compte double",
      countsOnce: "Compte simple",
      scores: "Note :",
      skillsTitle: "Compétences évaluées",
      skillsHelp: "Les compétences de l'offre que cette étape juge. Cliquez sur une compétence pour ouvrir le critère qui la juge.",
      judges: "Évalue",
      whatItAssesses: "Ce qui est évalué",
      criteriaCount_one: "{count} critère",
      criteriaCount_other: "{count} critères",
      addCriterionFor: "Ajouter un critère pour cette compétence",
      criteriaTitle: "Critères d'évaluation",
      criteriaHelp: "Les comportements et résultats mesurés. Chaque critère évalue comment le candidat démontre une compétence pendant cette étape.",
      addSkill: "Ajouter une compétence",
      pickSkill: "Choisir une compétence de l'offre…",
      gradedSkill: "Compétence notée",
      howEvaluated: "Comment c'est noté",
      whatReviewed: "Ce qui est relu",
      gradingPlan: "Barème",
      pointsScale_one: "{count} point · 0 à 2",
      pointsScale_other: "{count} points · 0 à 2 chacun",
      showPoints_one: "Voir le point vérifié",
      showPoints_other: "Voir les {count} points vérifiés",
      hidePoints_one: "Masquer le point vérifié",
      hidePoints_other: "Masquer les {count} points vérifiés",
      describing: "Description en cours…",
      reviewed: {
        call: "La conversation (appel transcrit)",
        chat: "La conversation écrite",
        email: "L'e-mail rédigé",
        client_reply: "La réponse au client",
        document: "Le document rédigé",
        sheet: "Le tableur et la conclusion",
        inbox: "Le tri de la boîte de réception",
        board: "Le tableau priorisé",
        crm: "La fiche CRM",
        code: "Le code et ses tests",
        video: "La vidéo (transcrite)",
        text: "La réponse écrite",
        choice: "La réponse choisie",
        qcm: "La réponse choisie",
      },
      tested: "Ce qui est testé",
      testedSummary: "{subs} sous-compétences · {points} points vérifiés",
      points_one: "{count} point",
      points_other: "{count} points",
      importance: "Importance de l'étape",
      importanceHelp: "Multiplie le poids de toute l'étape dans la note finale. Sa part ci-dessus s'ajuste en direct.",
      importanceLevels: {
        low: "Faible ×0,5",
        normal: "Normale ×1",
        high: "Forte ×1,5",
        veryHigh: "Très forte ×2",
      },
    },
    stepChat: {
      knows: "Connaît cette étape, sa notation et le poste",
      greeting: "Bonjour {name}. Je connais cette étape, sa grille de notation et l'offre {job}. Posez une question ou demandez un changement : je propose une réécriture, que vous appliquez ou non.",
      greetingNoName: "Bonjour. Je connais cette étape, sa grille de notation et l'offre {job}. Posez une question ou demandez un changement : je propose une réécriture, que vous appliquez ou non.",
      newConversation: "Nouvelle conversation",
      collapse: "Replier Simulation Copilot",
      open: "Ouvrir Simulation Copilot",
      logLabel: "Conversation avec Simulation Copilot",
      inputLabel: "Message à Simulation Copilot",
      copy: "Copier la réponse",
      regenerate: "Régénérer la réponse",
      title: "Simulation Copilot",
      intro: "Posez vos questions sur cette étape : ce qu'elle teste, comment elle est notée, si le niveau convient au poste. Demandez un changement : je vous propose une réécriture, que vous appliquez ou non.",
      cost: "Questions gratuites · 2 crédits par réécriture appliquée",
      placeholder: "Ex. : pourquoi ce checkpoint ? · rends le prospect plus sceptique",
      send: "Envoyer",
      thinking: "Réflexion…",
      working: "Réécriture de l'étape… (20 à 60 s)",
      done: "Étape réécrite.",
      failed: "La réécriture a échoué : {error}",
      failedAnswer: "Je n'ai pas pu répondre : {error}",
      unsavedConfirm: "Vos modifications non enregistrées seront remplacées par la réécriture. Continuer ?",
      proposal: "Modification proposée",
      proposalIntro: "Voici ce que je propose :",
      apply: "Appliquer · 2 crédits",
      dismiss: "Ignorer",
      applied: "Appliquée — l'étape a été réécrite.",
      dismissed: "Proposition écartée.",
      suggestions: {
        scoring: "Comment cette étape est-elle notée ?",
        level: "Le niveau est-il adapté au poste ?",
        harder: "Rends la situation plus difficile",
      },
    },
    // L'étape racontée (onglet Scénario).
    recit: {
      formatHelp: "Comment le candidat répond.",
      sandboxHelp: "La mise en situation dans laquelle il répond.",
      assistantHelp: "Il peut s'aider de l'IA, comme au travail. Son usage est observé, pas pénalisé.",
      on: "Activé",
      off: "Désactivé",
      edit: "Modifier",
      done: "Terminé",
      onePerLine: "Un élément par ligne",
      brief: "La consigne",
      briefHelp: "Ce que le candidat lit avant de commencer.",
      showMore: "Voir plus",
      showMoreCount: "Voir les {count} autres",
      showLess: "Voir moins",
      advanced: "Réglages avancés",
      advancedHelp: "Format de réponse, assistant IA, voix et durée de l'échange — rarement à changer.",
      persona: {
        hiddenTitle: "Dans la tête du personnage",
        hiddenSub: "Le candidat ne le voit jamais. L'IA qui joue le rôle s'en sert pour réagir.",
        hiddenHint: "il ne le dit que si on lui pose la bonne question",
        call: "Appel",
        chat: "Conversation écrite",
        at: " chez ",
        knows: "Ce que le candidat sait en arrivant",
        opening: "Sa première phrase",
        openingEmpty: "C'est au candidat d'ouvrir l'échange.",
        hiddenNote: "Dans la tête du personnage — le candidat ne le voit jamais. L'IA qui joue le rôle s'en sert pour réagir.",
        personality: "Son caractère",
        goals: "Ce qu'il veut",
        hidden: "Ce qu'il cache",
        objections: "Ses objections",
        redLines: "Ce qu'il refuse",
      },
      data: {
        title: "Ce que le candidat a sous les yeux",
        edit: "Voir et modifier les données",
        crm: "Pipeline « {name} » · {records} fiches · mission : {mission}",
        crmSources: "{count} sources à lire",
        crmFields: "Le candidat remplit {count} champs, dont {factual} vérifiés automatiquement :",
        sheet: "Fichier « {file} » · {tabs} onglet(s) · {rows} lignes",
        sheetDeliverable: "Livrable demandé : {label}",
        inbox: "Boîte de {owner} · {count} messages · {now}",
        board: "« {title} » · {count} cartes à classer",
        boardColumns: "Colonnes : {columns}",
        boardConstraint: "Contrainte : {constraint}",
        code: "{language} · {visible} tests visibles, {hidden} cachés",
      },
    },
    corrige: {
      title: "Le corrigé",
      help: "Ce que l'IA sait pour noter, et que le candidat ne voit jamais. Il n'est pas noté à part : il aide l'IA à attribuer les points des checkpoints ci-dessus.",
      triage: "Ce qu'un bon professionnel en ferait",
      crmExpected: "Valeurs attendues — corrigées automatiquement",
      crmTraps: "Piège : une information contradictoire à repérer",
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

    // ── Session ─────────────────────────────────────────────────────────
    session: "Session",
    signOutHelp:
      "Vous fermez la session sur cet appareil. Vos données et vos offres restent intactes.",

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

  // ── Configuration de l'entretien IA ───────────────────────────────────────
  // L'INTERFACE seulement. Les messages d'ouverture et de clôture, dits au
  // candidat, vivent dans lib/interview/defaults.js et suivent la langue de
  // l'offre.
  aiInterview: {
    contextPlaceholder: "Ex : start-up de 20 personnes dans la fintech, ambiance collaborative…",
    dealbreakerPlaceholder: "Ex : « indisponible avant 3 mois », « pas de permis B »",
    hiddenFromCandidate: "Non visible par le candidat",
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
    levelShort: "Niv. {level}",
    levelPlaceholder: "Décrivez le comportement de niveau {level} ({label})...",
    addBarsCriterion: "Ajouter un critère BARS",
    maxReached: " (max atteint)",
    customQuestion: "Question personnalisée",
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
    categoryPlaceholder: "ex : Vente, Engineering…",
    subFamilyPlaceholder: "ex : Account Executive (B2B)…",
    yearsPlaceholder: "ex : 3 ans, 1-3 ans, 5+ ans",
    mustHave: "Indispensable",
    niceToHave: "Apprécié",
    subFamily: "Sous-famille",
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
    // Indexés par le niveau stocké (1-5) ; le code CECR vient de lib/i18n/languages.
    languageLevels: { 1: 'Notions', 2: 'Intermédiaire', 3: 'Intermédiaire avancé', 4: 'Avancé', 5: 'Maîtrise' },
    degree: 'Diplôme',
    degrees: { master: 'Master', bachelor: 'Bachelier', any: 'Indifférent' },
    experienceRequired: 'Expérience requise',

    manuallySelected: 'Sélectionné manuellement',
    changePriority: 'Changer de priorité',
    remove: 'Supprimer',
    uncertaintyZone: "Zone d'incertitude",
    noSkillsIn: "Aucune compétence « {label} »",
    confirmPriority:
      "L'IA n'a pas pu déterminer l'importance de ces compétences. Veuillez confirmer leur priorité :",
    mustHave: 'Must have',
    niceToHave: 'Nice to have',
  },

  // ── Modules d'évaluation d'une offre ──────────────────────────────────────

  // ── Éditeur visuel de pipeline ────────────────────────────────────────────

  // ── Bibliothèque des expériences ──────────────────────────────────────────

  // ── Chat de conception d'expérience ───────────────────────────────────────
  // Ce chat parle au RECRUTEUR : il suit la langue du dashboard. Les réponses
  // de l'assistant, elles, sont produites par le modèle et sortent dans la
  // langue du prompt (cf. lib/experienceChat.js).
  chatCreator: {
    stepRewritten: "Étape {n} réécrite",
    stepRewrittenTitle: " — « {title} »",
    stepRewrittenSummary: " : {summary}",
    title: 'Expert Assessment',
    greeting: "Bonjour ! On conçoit ensemble l'expérience de présélection. Décrivez votre besoin en langage libre.",
    // La PREMIÈRE question, et elle n'est pas dans le prompt : elle est écrite
    // ici, donc garantie d'être posée en premier, gratuitement et dans la bonne
    // langue. L'ancienne version proposait un menu de catégories (« le ton
    // attendu, le profil de client typique ») et récoltait exactement ça : des
    // catégories. Celle-ci demande une image concrète, et sa réponse remplit
    // souvent trois emplacements de la fiche de découverte d'un coup.
    greetingForJob:
      "On conçoit ensemble l'expérience de présélection pour {role}. Commençons par le plus important : comment voyez-vous la mise en situation idéale pour ce poste — qu'est-ce que vous aimeriez vraiment voir un candidat gérer ?",
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
    // Effacer la conversation efface aussi la fiche de découverte (la ligne
    // entière est supprimée) : on repose donc la première question, comme au
    // premier jour.
    cleared:
      "On repart de zéro. Comment voyez-vous la mise en situation idéale pour ce poste — qu'est-ce que vous aimeriez vraiment voir un candidat gérer ?",

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
    analyzeErrors: {
      auth: "Session expirée : reconnectez-vous.",
      missingUrl: "Indiquez l'adresse du site.",
      invalidUrl: "Adresse invalide. Vérifiez le format (ex. : https://acme.com).",
      siteError: "Le site a renvoyé une erreur ({status}). Remplissez les champs à la main.",
      timeout: "Le site met trop de temps à répondre. Remplissez les champs à la main.",
      unreachable: "Impossible d'accéder au site. Remplissez les champs à la main.",
      tooLittle: "Trop peu de contenu sur la page d'accueil. Remplissez les champs à la main.",
      aiFailed: "L'analyse a échoué. Remplissez les champs à la main ou réessayez.",
    },
    websiteUrl: "URL du site web",
    analyzing: "Analyse…",
    industry: "Industrie / secteur",
    websitePlaceholder: "https://votre-entreprise.com",
    targetMarketPlaceholder: "Ex : SaaS RH, Fintech, Retail, conseil IT…",
    businessModelPlaceholder: "Ex : B2B SaaS, B2C, marketplace, services professionnels…",
    title: "Profil entreprise",
    websiteAndContext: "Site web & contexte IA",
    targetMarket: "Marché cible",
    businessModel: "Modèle commercial (Domain)",
    observedTrends: "Tendances observées (auto-généré)",
    privateNotice: "{label} — Ces données enrichissent les analyses IA (qualification des offres, scoring candidats) mais ne sont jamais affichées aux candidats.",
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
    contactUs: "Nous contacter",
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
    pricePerMonth: '{price} €/mois',
    nextRefill: '+{count} crédits ajoutés à votre solde le',
    rolloverHelp:
      "Plan annuel : les crédits que vous n'utilisez pas sont reportés d'un mois sur l'autre. Le solde repart de zéro au renouvellement de votre abonnement, le {date}.",
    remainingCredits: 'Crédits restants',
    unlimitedAccess: '✓ Votre compte a un accès illimité.',

    autoReset: 'Réinitialisation automatique le',

    createJob: 'Créer une simulation',
    createJobHelp:
      "Débités chaque fois que l'agent IA crée la simulation d'une offre : la première fois, et à chaque régénération complète. L'analyse de l'annonce, l'édition manuelle et la publication ne coûtent rien — et une génération qui échoue non plus.",
    perJobUnit: 'par génération',

    regenerateStep: 'Réécrire une étape',
    regenerateStepHelp:
      "Chaque étape réécrite en entier par l'agent IA à votre demande, depuis le chat de l'étape, ou pour couvrir une compétence. Modifier une étape vous-même ne coûte rien.",
    perStepUnit: 'par étape',


    candidateRun: 'Faire passer un candidat',
    candidateRunHelp:
      "{start} crédit à son entrée dans la simulation, {scoring} pour son évaluation par l'IA, automatique à la soumission. Un candidat invité qui ne commence jamais ne coûte rien.",
    perCandidateUnit: 'par candidat',

    nothingElse: "Rien d'autre ne consomme de crédits.",

    needMore: "Besoin de plus de crédits ou d'un upgrade ?",
    needMoreHelp: 'Contactez-nous, nous gérons votre compte manuellement.',
  },

  // ── Branding employeur ────────────────────────────────────────────────────
  branding: {
    tooLarge: "L'image doit faire moins de 2 Mo.",
    companyNamePlaceholder: "Ex : Acme Corp",
    taglinePlaceholder: "Ex : start-up innovante dans la greentech…",
    visualCustomisation: "Personnalisation visuelle",
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
    validate: "Valider et créer la simulation",
    stepsLabel: "Étapes de création",
    jobOffer: "Offre d'emploi",
    sourceLabel: "Source de l'offre",
    textLabel: "Texte de l'offre",
    dropFile: "Glissez le fichier de l'offre ici",
    fileFormats: "PDF, DOCX ou TXT · {browse}",
    browse: "parcourir",
    urlLabel: "Lien vers l'offre publiée",
    languageLabel: "Langue de l'offre et du parcours candidat",
    languageShort: "Langue du parcours",
    extract: "Extraire les compétences",
    languageNote: "Questions, exercices, assistant IA et e-mails aux candidats seront rédigés dans la langue choisie.",
    tipLabel: "Conseil :",
    protectedSites: "LinkedIn, Indeed ou Glassdoor",
    urlHint: "{tip} Cette option fonctionne avec votre propre site carrière ou des ATS comme Greenhouse, Lever ou Workable. Elle peut ne pas fonctionner avec {sites} qui protègent leurs pages. Dans ce cas, copiez-collez le texte de l'offre directement.",
    steps: { job: "Offre", details: "Compétences" },
    heading: "Commençons par votre offre d'emploi",
    intro: 
      "Onbord la lit et en extrait les compétences à évaluer. Vous les validez, puis on construit la simulation.",

    modePaste: 'Coller le texte',
    modeFile: 'Importer un fichier',
    modeUrl: "Lien de l'offre",
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
    subtitle: "Créez les comptes de vos clients et gérez leurs accès.",
    tabInvites: 'Invitations',
    tabCosts: 'Coûts API',
    tabCredits: 'Crédits & plans',

    // ── Création directe d'un compte ────────────────────────────────────
    createAccount: 'Créer un compte',
    createAccountHelp:
      "L'inscription publique est fermée : c'est le seul moyen de créer un compte. Il est utilisable immédiatement, sans confirmation par e-mail.",
    createAccountSubmit: 'Créer le compte',
    accountCreated: 'Compte créé',
    accountError: 'Création impossible',
    copyCredentials: 'Copier les identifiants',
    passwordOnce:
      "Notez ce mot de passe maintenant : il n'est affiché qu'une fois et ne peut pas être retrouvé ensuite.",
    fields: {
      email: 'Adresse e-mail',
      company: 'Entreprise',
      firstName: 'Prénom',
      lastName: 'Nom',
    },

    // ── Comptes existants ───────────────────────────────────────────────
    accountsTitle: 'Comptes existants',
    accountsHelp:
      "Les mots de passe ne sont stockés nulle part : Supabase n'en garde qu'un hachage. Un mot de passe perdu ne se retrouve pas, il se remplace.",
    noAccounts: 'Aucun compte pour le moment.',
    noPlan: 'Sans plan',
    neverSignedIn: 'Jamais connecté',
    resetPassword: 'Nouveau mot de passe',
    resetConfirm:
      "Générer un nouveau mot de passe pour {email} ?\n\nL'ancien cessera immédiatement de fonctionner. Si cette personne l'utilise déjà, prévenez-la : elle ne pourra plus se connecter sans le nouveau.",
    resetDone: 'Nouveau mot de passe généré',
    resetError: 'Réinitialisation impossible',

    // ── Invitations ─────────────────────────────────────────────────────
    invitesNeedSignup:
      "Ces liens ne fonctionnent que si l'inscription publique est activée dans Supabase. Elle est fermée pour l'instant : utilisez la création directe ci-dessus.",
    linkGenerated: 'Lien généré et copié !',
    tokenDeleted: 'Token supprimé',
    linkCopied: 'Lien copié !',
    generateLink: 'Générer le lien',
    noTokens: "Aucun lien généré pour l'instant.",
    copyLink: 'Copier le lien',
    delete: 'Supprimer',
    // Cycle de facturation d'un compte (/admin/billing).
    cycles: {
      monthly: 'Mensuel',
      annual: 'Annuel',
      since: "Début de l'année",
      renewal: 'Renouv. {date}',
      updated: 'Cycle mis à jour',
    },
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
      account: 'Compte',
      created: 'Créé le',
      lastSignIn: 'Dernière connexion',
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
    personaCost: 'Personnages IA (appels et chats)',
    personaCostSub: '{runs} runs avec un personnage · moy {avg}/run',
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
    jobLine_one: "Offre analysée : {title} — {count} compétence extraite",
    jobLine_other: "Offre analysée : {title} — {count} compétences extraites",
    jobLineNoSkill: "Offre analysée : {title} — aucune compétence extraite",
    untitledJob: "poste sans titre",
    contextLine: "Contexte entreprise chargé — {industry}",
    contextLoaded: "Contexte entreprise chargé",
    contextNone: "Aucun contexte entreprise : génération sur la seule offre",
    brief: "Précisions du recruteur prises en compte en priorité",
    localeLine: "Langue du parcours candidat : {label}",
    reflexion: "Réflexion : répartition des compétences et cohérence du parcours…",
    designStart: "Conception des mises en situation…",
    critiqueStart: "Relecture critique du parcours…",
    critiqueOk: "Relecture : le parcours passe la barre, rien à reprendre",
    critiqueSkipped: "Relecture critique sautée pour tenir le temps de génération — relisez le parcours avant publication",
    critiqueFix: "Relecture : l'étape {n} « {label} » est réécrite",
    designDone_one: "Parcours complet : {count} étape",
    designDone_other: "Parcours complet : {count} étapes",
    designMinutes: ", ~{minutes} min",
    thisStep: "l'étape",
    codeStart: "Exercice de code : conception pour « {label} »",
    crmStart: "Mise en situation CRM : rédaction du pipeline pour « {label} »",
    recordLine: "Fiche : {label}",
    sheetStart: "Tableur : construction des données pour « {label} »",
    sheetData: "{rows} lignes de données sur {cols} colonnes",
    inboxStart: "Boîte de réception : rédaction des messages pour « {label} »",
    inboxItems_one: "{count} message · pièges prévus : {traps}",
    inboxItems_other: "{count} messages · pièges prévus : {traps}",
    filRouge: "Fil rouge : les étapes se suivent dans une même situation",
    personaStart: "Personnage : écriture du rôle pour « {label} »",
    personaReadyCall: "Appel avec {label} : objections et informations cachées prêtes",
    personaReadyChat: "Échange écrit avec {label} : objections et informations cachées prêtes",
    boardStart: "Tableau : rédaction des cartes pour « {label} »",
    boardCards_one: "{count} carte à arbitrer",
    boardCards_other: "{count} cartes à arbitrer",
    codeTest_one: "{count} cas de test ({hidden} caché)",
    codeTest_other: "{count} cas de test ({hidden} cachés)",
    retry: "Réponse incomplète — nouvelle tentative",
    newVersion: "Nouvelle version v{version} (les précédentes restent intactes)",
    firstVersion: "Création de la version v1",
    saved: "{steps} étapes et {subDims} sous-compétences enregistrées",
    done: "Expérience prête pour relecture",
    couldNotStart: "La génération n'a pas pu démarrer.",
    interrupted: "La génération s'est interrompue.",
    unexpectedError: 'Erreur inattendue',
    step: 'Étape',
    generating: "Génération de l'expérience…",
    generated: 'Expérience générée',
    stepLine: 'Étape {n} — {kind} : {label}',
    skillLine: 'Compétence évaluée : {label}',
    criterionLine: 'Sous-compétence : {label}',
    sourceLine: 'Source du brief : {label}',
    fieldLine: 'Champ de la fiche : {label}',
    trapLine: 'Incohérence volontaire : {label}',
    coverageOk_one: "Couverture : la compétence must-have est testée",
    coverageOk_other: "Couverture : les {count} compétences must-have sont testées",
    coverageFix: "Couverture : « {label} » ajoutée à la grille de l'étape {n}",
    coverageGap: "Couverture : aucune étape ne teste « {label} » — à trancher à la relecture",
    sourceKinds: {
      email: 'email',
      call_transcript: "retranscription d'appel",
      chat: 'message entrant',
      note: 'note interne',
      meeting: 'réunion',
    },
    kinds: {
      classic_qcm: "QCM",
      qualifying: 'Question qualifiante',
      question: 'Question ciblée',
      task: 'Mise en situation',
    },
  },

  // ── Feedback au candidat ──────────────────────────────────────────────────
  // Le TEXTE du feedback est rédigé dans la langue de l'offre, celle du
  // candidat (lib/candidateFeedback.js) ; ce sont les libellés de la fenêtre
  // qui sont ici, en langue du recruteur.
  feedback: {
    title: "Feedback : {name}",
    loading: "Préparation du feedback…",
    loadError: "Impossible de charger le feedback. Réessayez dans un instant.",
    needsDecision:
      "Veuillez d'abord valider, faire passer un candidat à la prochaine étape ou rejeter le candidat.",
    notScored:
      "La simulation de ce candidat n'est pas encore notée. Le feedback se rédige dès que la notation est terminée.",
    noMaterial:
      "Aucun point de la simulation n'est noté avec un extrait de la réponse du candidat. Sans preuve, aucun feedback n'est rédigé : rien n'est inventé.",
    version: {
      negative: "Version : candidat rejeté",
      positive: "Version : candidat retenu",
    },
    localeNotice: "Rédigé en {locale}, la langue de l'offre",
    to: "À",
    from: "De",
    replyTo: "Réponses à",
    subject: "Objet",
    message: "Message",
    words_one: "{count} mot",
    words_other: "{count} mots",
    send: "Envoyer",
    sending: "Envoi…",
    close: "Fermer",
    sentOn: "Envoyé le {date} à {email}",
    warnings: {
      noStrength:
        "Aucun point fort n'est étayé par un extrait de la réponse : le brouillon n'en invente pas. Relisez le ton avant d'envoyer.",
      noReason:
        "Aucun point manqué n'a été relevé : le brouillon ne peut pas expliquer le refus par la simulation.",
      noImprovement:
        "Tous les points ont été réussis : aucun axe d'amélioration réel à citer, le brouillon n'en invente pas.",
      unverifiedQuote:
        "Une citation du brouillon n'a pas été retrouvée telle quelle dans la réponse du candidat. Vérifiez-la ou retirez-la avant d'envoyer.",
    },
    errors: {
      noEmail: "Ce candidat n'a pas d'adresse e-mail renseignée.",
      needsDecision: "Aucune décision n'est enregistrée pour ce candidat.",
      alreadySent: "Ce feedback a déjà été envoyé.",
      empty: "L'objet et le message ne peuvent pas être vides.",
      tooLong: "Le message est trop long.",
      send: "L'e-mail n'a pas pu partir. Rien n'a été envoyé, vous pouvez réessayer.",
    },
  },

  // ── Panneau de configuration d'une étape de pipeline ──────────────────────

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
    requestCustom: "Demander un test sur-mesure",
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

  // ── Questions qualificatives ──────────────────────────────────────────────
  qualifyingConfig: {
    questionPlaceholder: "Ex : avez-vous le permis B ?",
    addQuestion: "Ajouter une question",
    addAnother: "Ajouter une autre question",
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
    closeAssistant: "Fermer l'assistant",
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
    minimize: "Réduire",
    title: "Guide d'activation",
    ready: 'Prêt à recruter ?',
    done: 'Bravo ! Vous êtes opérationnel.',
    dismiss: 'Faire disparaître ce guide',
    progress: '{done}/{total} étapes franchies',

    // Les cinq étapes du parcours réel, depuis la bascule Experience. Les
    // libellés disent le RÉSULTAT atteint, pas l'action à faire : c'est une
    // liste de ce qui est fait, elle se lit cochée.
    steps: {
      account: 'Compte créé',
      company: 'Profil entreprise et branding renseignés',
      firstJob: 'Première offre créée et analysée',
      firstExperience: 'Première expérience candidat générée',
      firstCandidate: 'Premier candidat reçu',
    },
  },

  // ── Widget de crédits ─────────────────────────────────────────────────────
  usage: {
    credits: "Crédits",
    planNamed: "Formule {plan}",
    credits: 'Crédits',
    resetsMonthly: 'Réinitialisation le 1er du mois',
    creditsUsed: 'Crédits utilisés',
    changePlan: 'Changer de plan',
    topUp: 'Recharger',
  },

  // ── Critères de scoring CV ────────────────────────────────────────────────
  cvCriteria: {
    intro: "L'IA a identifié ces 5 critères basés sur votre offre. Ils seront utilisés pour calculer le {score} de chaque CV importé. Vous pouvez ajuster les intitulés et leur importance (poids).",
    introScore: "score de correspondance",
    weightWarning: "Le total des poids est de {total}. Il devrait être de 100 % pour un scoring précis.",
    addCriterion: "Ajouter un critère",
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
