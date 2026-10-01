// Recruiter interface — English. Mirrors fr/dashboard.js key for key.

const dashboard = {
  nav: {
    brand: "Onbord",
    home: "Home",
    jobs: "Jobs",
    experiences: "Experiences",
    assessments: "Assessments",
    account: "My account",
    manageAccount: "Manage my account",
    admin: "Admin",
    administration: "Administration",
    newJob: "New job",
    settings: "Settings",
    signOut: "Sign out",
  },

  home: {
    activeJobs: "Your active jobs",
    latestJobs: "Latest jobs",
    mainPages: "Main pages",
    addShortcut: "Add a shortcut",
    noShortcuts: "No shortcuts set up",
    company: "Company",
    plan: "Plan",
    creditsUsed: "Credits used",
    candidates: "Candidates",
    candidatesCount_one: "{count} candidate",
    candidatesCount_other: "{count} candidates",
    noLocation: "No location specified",
    noActiveJobs: "No active jobs",
    open: "Open",
    greeting: "Hello, {name}",
  },

  jobs: {
    tabActive: "Active",
    tabDrafts: "Drafts",
    tabTrash: "Trash",
    title: "Jobs",
    subtitle: "Manage your job postings and track your candidates.",
    untitled: "Untitled job",
    untitledShort: "Untitled",
    noActiveJobs: "No active jobs",
    noDrafts: "No drafts",
    createFirst: "Create your first job to get started.",
    draftsAppearHere: "Your unpublished jobs will appear here.",

    create: "Create a job",

    delete: "Delete",
    deleteConfirm: "Delete this job and all its candidates?",
    deleteError: "Something went wrong while deleting",
    restore: "Restore",
    restored: "Job restored",
    restoreError: "Couldn't restore this job",

    trashNotice:
      "These jobs and all their candidates will be permanently erased when the countdown ends — CVs and videos included. You can restore them until then.",
    purgeSoon: "Deleting soon",
    purgeIn_one: "Permanently deleted in {count} day",
    purgeIn_other: "Permanently deleted in {count} days",

    // The delay guards against slips; it must not hold back a deliberate
    // decision — permanent deletion is available straight from the trash.
    purgeNow: "Delete permanently",
    purgeNowConfirm:
      "Permanently erase this job, its candidates, their CVs and their videos?\n\nThis CANNOT be undone: it skips the 7-day window and nothing can be restored.",
    purged: "Job permanently deleted",
    purgeError: "Couldn't delete this job",
  },

  candidateStatus: {
    invited: "Invited",
    in_progress: "In progress",
    interview_completed: "Interview completed",
    termine: "Completed",
    soumis: "Submitted",
    scored: "Scored",
    shortlisted: "Shortlisted",
    next_step: "Next stage",
    rejected: "Rejected",
    disqualified: "Disqualified",
  },

  pipelineNodes: {
    sourcing: "Sourcing & publishing",
    accueil: "Candidate welcome",
    qualifying_questions: "Screening questions",
    cv_scoring: "CV scoring (AI)",
    assessment: "Assessment",
    assessmentSubtitle: "Click to choose",
    ai_interview: "AI interview",
    single_video_question: "Video question",
    remerciements: "Thank you",
    entretien_visio: "Video call interview",
    entretien_site: "On-site interview",
    debrief_finale: "Final debrief",
    customStep: "Custom step",
  },

  jobDetail: {
    delete: "Delete",
    colCandidate: "Candidate",
    colScore: "Overall score",
    colStatus: "Status",
    colActions: "Actions",
    back: "Back",
    jobLabel: "Job",

    tabs: {
      pipelines: "Pipeline",
      evaluations: "Assessments",
      candidats: "Candidates",
      context: "Context",
      parametres: "Settings",
    },

    copyPublicLink: "Copy public link",
    linkCopied: "Link copied!",
    publicLinkCopied: "Public link copied!",
    publishFirst:
      "Publish the experience first — the link would send candidates to a waiting screen.",
    publishFirstShort:
      "Publish the experience first: without it, the link leads to a waiting screen.",

    deleteCandidateConfirm: "Are you sure you want to delete this candidate?",
    candidateDeleted: "Candidate deleted",
    deleteError: "Something went wrong while deleting",

    settingsSaved: "Settings saved",
    error: "Error",
    applicationsNowClosed: "Applications are now closed",
    deleteJobConfirm:
      "Are you sure you want to delete this job? This cannot be undone.",
    jobDeleted: "Job deleted",
    stepDeleted: "Step deleted",
    stepAdded: "Step added",
    contextSaved: "Context saved",

    lockPipeline: "Lock the pipeline",
    unlockPipeline: "Unlock the pipeline",
    noAssessment: "No assessment configured",
    addTestsHint: "Add tests from the « Pipeline » step of your job.",
    journey: "Pipeline",
    detailsLink: "Details",
    linkTest: "Link a test",
    testBeingCreated: "Test being built by the Onbord team",
    testLinked: "Test linked successfully",
    testLinkError: "Something went wrong while linking the test",
    testLinkedSyncError:
      "Test linked to the pipeline, but candidate sync failed",
    skillsTest: "Skills test",
    test: "Test",
    customCreation: "Bespoke build",
    pending: "Pending",
    notConfigured: "Not configured",
    videoQuestions: "Video questions",
    videoInterview: "Video interview",
    aiEvaluation: "AI assessment (Experience)",

    searchCandidate: "Search for a candidate…",
    noCandidates: "No candidates",
    shareLinkToStart: "Share the public link to start receiving applications.",
    sort: {
      score: "Score",
      scoreDesc: "Highest first",
      scoreAsc: "Lowest first",
      date: "Date added",
      dateDesc: "Newest first",
      dateAsc: "Oldest first",
      dateRecent: "Added (newest)",
      dateOld: "Added (oldest)",
      name: "Name",
      nameAsc: "Name A → Z",
      nameDesc: "Name Z → A",
    },

    contextHelp:
      "Used as context for this job. Editable at any time: it informs how assessments are authored.",
    markdownContent: "Markdown content",
    sourcesHelp:
      "Sources attached to this job. Toggle one off to keep it attached but exclude it from the context used to author assessments.",
    jobDescriptionUrl: "Job description — URL",

    details: "DETAILS",
    title: "Title",
    location: "Location",
    contractType: "Contract type",
    employmentType: "Employment type",
    contract: {
      freelance: "Freelance",
      internship: "Internship",
      apprenticeship: "Apprenticeship",
      temp: "Temporary",
    },
    workMode: {
      remote: "Remote",
      hybrid: "Hybrid",
      fullTime: "Full time",
    },

    visibility: "VISIBILITY",
    applicationsClosed: "Applications are closed",
    applicationsOpen: "Applications are open",
    applicationsClosedHelp: "Candidates can no longer apply for this job.",
    applicationsOpenHelp:
      "Candidates can be invited and moved through the stages of your hiring process.",

    closeApplications: "Close",
    deleteJob: "Delete this job",
    deleteJobHelp:
      "Deletes the posting and unlinks it from its candidates. Assessments stay in your library. This cannot be undone.",
  },

  candidateDetail: {
    integrityTracking: "Integrity tracking",
    manualReview: "Needs manual review",
    criteriaDetail: "Breakdown by criterion",
    taxonomyId: "Taxonomy ID",
    backToCandidates: "Back to candidates",
    feedback: "Feedback",
    feedbackSentOn: "Feedback sent on {date}",
    viewOriginalCv: "View original CV",
    delete: "Delete",
    gdpr: "GDPR",
    cvAnalysis: "CV analysis",
    skillsTests: "Skills tests",
    aiAnalysis: "AI analysis",
    slowerThanAverage: "Slower than average",
    topPerformer: "Top performer",
    aiInterview: "AI interview",
    videoInterview: "Video interview",
    levelBetween: "Level {level}: between N{low} ({lowLabel}) and N{high} ({highLabel}).",
    notFound: "Candidate not found",
    back: "Back",
    deleteConfirm: "Are you sure you want to delete this candidate?",
    manualScoreError: "Something went wrong while saving the manual score:",

    status: "Status",
    invitedOn: "Invited on",
    completedOn: "Completed on",
    pending: "Pending",
    validateProfile: "Shortlist this profile",
    granted: "Granted",
    windowExits: "Window exits",
    mailHistory: "Email history",
    mail: {
      invitation: "Invitation",
      validation: "Shortlisted",
      rejection: "Rejection",
      feedback: "Feedback",
    },

    actions: {
      shortlist: "Shortlist",
      nextStep: "Move to the next stage",
      reject: "Reject",
      disqualify: "Disqualify",
    },

    globalScore: "Overall assessment score",
    globalScoreHelp: "Weighted average based on your selection criteria.",
    scoreLevel: {
      excellent: "Excellent",
      average: "Average",
      weak: "Weak",
      insufficient: "Below expectations",
    },
    tests: "Tests",
    videoInterviewShort: "Video int.",
    perCriterion: "Breakdown by criterion",
    strengths: "Strengths",
    watchPoints: "Watch points",
    scored: "Scored",
    partialScore: "Partial score, excluded from the ranking",

    evidenceReport: "Evidence report (Experience)",
    inProgress: "In progress",
    aiUsage: "AI assistant usage",
    aiUsageHelp: "Measures {em} the candidate steered the AI, not whether they used it",
    aiUsageHelpEm: "how",
    aiPrompts_one: " — {count} prompt to the assistant on this pipeline",
    aiPrompts_other: " — {count} prompts to the assistant on this pipeline",
    aiUsageNotScoredHelp:
      "The candidate did not call on the assistant. This dimension measures {em} they would have steered it: it is not scored in its absence, and does not penalise the overall score.",
    expected: "expected:",
    aiUsageNotScored: "AI assistant usage — not scored",
    aiAxes: {
      framing: "Framing the problem",
      iteration: "Iteration",
      criticalEye: "Critical eye on the output",
    },
    justificationUnavailable:
      "Justification unavailable: this run was scored before this explanation was kept. Re-scoring will produce it.",

    candidateAnswer: "Candidate's answer",
    noAnswer: "(no answer)",
    transcriptPending: "(transcript pending)",
    optionSelected: "Option {index} selected",
    yes: "Yes",
    no: "No",
    evaluationGrid: "Scoring rubric",
    proposalsAndKey: "Options and answer key",
    correctAnswer: "correct answer",
    notFilled: "not filled in",
    trap: "trap",
    verbatimVerified: "✓ Excerpt verified in the answer",
    verbatimNotFound: "⚠ Excerpt not found verbatim",
    checkpointPoints: "{points}/{max} pts · {score}%",
    checkpointLevel: {
      0: "missing",
      1: "present but weak",
      2: "present and done well",
    },
    tier: {
      must_have: "Must-have",
      nice_to_have: "Nice-to-have",
    },

    expKind: {
      qualifying: "Screening",
      question: "Targeted question",
      task: "Task",
      classic_qcm: "Multiple choice",
    },

    perQuestion: "Breakdown by question",
    showTranscript: "Show transcript",
    hideTranscript: "Hide transcript",
    videoRecording: "Video recording",
    candidateTranscript: "Candidate transcript",
    transcriptTooShort:
      "The transcript is missing or too short for an AI assessment. Watch the video to score this candidate's answer.",
    quoteVerified: "✓ Quote verified",
    quoteNotVerified: "⚠ Quote not verified in the transcript",
    noQuote: "No quote provided",
    improvementAreas: "Areas for improvement",

    saved: "Saved",
    aiAnalyzing: "AI analysis…",
    analyzed: "Analysed ✓",
    manualReview: "Manual review",
    transcribing: "Transcribing…",
    aiAnalysisQuestions: "AI analysis — {count} questions scored",
    questionsScored: "{scored}/{total} questions scored —",
    aiRecruiter: "Leo (AI recruiter)",
    editScore: "Edit the score",
    scoreThisAnswer: "Score this answer",
    scoreOutOf5: "Score out of 5",
    justificationPlaceholder: "Justification for the score (optional but recommended)…",
    confirmScore: "Confirm the score",
    analysisInProgress: "Analysis in progress, reload the page in a few moments.",

    aiCategories: {
      C1: "AI strategy",
      C2: "Prompting",
      C3: "Critical thinking",
      C4: "Ethics",
      C5: "Workflow",
    },
  },

  experienceEditor: {
    sourceFrom: "From…",
    sourceSubject: "Subject…",
    sourceReceived: "Received…",
    fieldLabel: "Displayed label",
    fieldKey: "key",
    addSource: "Source",
    addField: "Field",
    addTrap: "Inconsistency",
    reviewTitle: "Experience review",
    stepCount_one: "{count} step",
    stepCount_other: "{count} steps",
    estimatedMinutes: " · ~{minutes} min",
    loadError: "Couldn't load",
    error: "Error",

    generated: "Experience generated — review and adjust before publishing",
    generatedShort: "Experience generated — review before publishing",
    generationFailed: "Generation failed",
    stepRewritten: "Step rewritten — the others are unchanged",
    published: "Experience published — visible to candidates",
    publishFailed: "Publishing failed",
    deleteStepConfirm: "Delete this step?",
    stepSaved: "Step saved",

    chatIntro:
      "Describe what you're after. The assistant asks a few questions to refine it, then generates the pipeline (practical exercises). You review and approve each step before publishing.",
    generateDirectly: "Or generate straight away, without the conversation",
    closeAssistant: "Close the assistant",
    adjustStepByStep: "Adjust step by step",
    publish: "Publish",
    regenerate: "Regenerate",
    backToJob: "Back to the job",
    lockedWarning:
      "⚠️ At least one candidate has already started this version. Your next change will create a new one, taken only by {next} candidates: those already in progress keep theirs and are scored on its rubric.",
    forkedNotice:
      "New version v{version} created: candidates already in progress keep the previous one, new candidates will take this one.",
    lockedWarningNext: "future",
    designWithAssistant: "Design the experience with the assistant",
    publishedNotice:
      "✓ Published — candidates see this version. Any change is visible immediately.",

    status: {
      draft: "Draft",
      pending_review: "To review",
      published: "Published",
      archived: "Archived",
    },

    stepTitle: "Step title",
    stepPrompt: "Prompt read by the candidate",
    responseFormat: "Response format",
    sandbox: "Sandbox",
    messageCap: "Message cap",
    skillAssessed: "Skill assessed",
    skillAssessedHint: "Main skill targeted by this step",
    subDimensions: "Sub-dimensions",
    addSubDimension: "Sub-dimension",
    subDimensionName: "Sub-dimension name",
    newSubDimension: "New sub-dimension",
    addCheckpoint: "Checkpoint",
    checkpointPlaceholder: "One observable behaviour in the answer",
    checkpointsHelp:
      "Each checkpoint is scored on its own — missing, present but weak, present and done well — and the checkpoints add up. A checkpoint describes a single behaviour, achievable with what the prompt and the scene give the candidate.",
    legacyGrid:
      "Legacy level-based rubric — still scored as is. Having the assistant rewrite the step converts it to checkpoints.",
    criterionSkills: "Skills scored:",
    addSkill: "+ skill",
    noSkill: "No skill linked",
    addedForCoverage: "Added to cover the skill \"{skill}\"",
    qcmSkill: "Skill checked by this multiple-choice question",
    coverage: {
      title: "Skill coverage",
      must: "Must-have",
      nice: "Nice-to-have",
      missing_one: "{count} must-have skill tested nowhere",
      missing_other: "{count} must-have skills tested nowhere",
      allCovered: "Every must-have skill is tested",
      uncovered: "No checkpoint tests this skill: a candidate would be shortlisted or rejected without it ever being observed.",
      uncoveredNice: "not tested (no consequence)",
      testedIn: "Step {n} \"{title}\"",
      checkpointCount_one: "{count} checkpoint",
      checkpointCount_other: "{count} checkpoints",
      automatic: "auto-graded",
      addedTag: "added for coverage",
      cover: "Cover this skill",
      coverHelp:
        "Adds a sub-dimension to the step that fits best, or creates a dedicated exercise if none does. 1 credit.",
      covering: "Looking for a step…",
      coveredAttached: "Skill added to the rubric of step {n}",
      coveredNewStep: "New exercise created for this skill (step {n})",
      overDuration:
        "This simulation has {steps} exercises, above the target of {max}, to cover {count} must-have skills. To shorten it, move a skill to nice-to-have or remove it from the job's list.",
      noSkills:
        "No validated skills on this job: the simulation's coverage cannot be checked.",
      offList: "{id} (not in the list)",
      publishWithGaps:
        "These must-have skills are not tested by any checkpoint:\n{skills}\n\nPublish anyway?",
    },
    addStep: "Add a step",
    addOption: "Add an option",
    promptPlaceholder: "Instructions / scenario",
    save: "Save",
    saved: "Saved",

    barsLevels: {
      insufficient: "Below expectations",
      expected: "Meets expectations",
      excellent: "Excellent",
    },

    kind: {
      qualifying: "Screening",
      question: "Targeted question",
      task: "Task",
      classic_qcm: "Multiple choice",
    },

    format: {
      text: "Text",
      video: "Video (role play)",
      qcm: "Multiple choice",
      choice: "Choice (yes/no)",
      code: "Code (sandbox)",
    },

    sandboxKind: {
      none: "None",
      email: "📧  Email",
      client_reply: "💬  Client reply",
      document: "📄  Document",
      code: "💻  Code",
      crm: "🗂️  CRM record",
    },

    qcmOptions: "Multiple choice options",
    qcmCorrect: "Correct answer",
    qcmHelp:
      "Select the correct answer with the radio button. The candidate is scored automatically (right/wrong).",

    code: {
      language: "Execution language",
      starter: "Starter code",
      starterPlaceholder: "Code shown to the candidate when the step loads.",
      tests: "Test cases",
      testCount: "{visible} visible, {hidden} hidden",
      testNamePlaceholder: "Case name (e.g. empty list)",
      hidden: "Hidden",
      stdin: "Standard input",
      expected: "Expected output",
      addTest: "Add a test case",
      warnNoVisible: "No visible case: the candidate will not know what output format to produce.",
      warnNoHidden: "No hidden case: printing the displayed answers would be enough to pass everything.",
      help: "Grading runs the code for real: a wrong expected output fails every candidate. Trailing whitespace and a final empty line are ignored when comparing.",
    },
    // Keyed by the step's config key (CHAMPS_SCENE, experience page).
    scene: {
      client_message: "Message from the counterpart — shown to the candidate",
      to: "Recipient — shown to the candidate",
      subject: "Fixed subject — leave empty if the candidate writes it",
      context: "Context given to the candidate",
      document_context: "Document context — shown to the candidate",
    },
    crm: {
      fieldsHelp: "{factual} fields are marked automatically (no AI) and grouped into one criterion, under the step's skill. {judgment} fields are scored by the checkpoints above. The candidate sees no difference between the two.",
      fieldsHelpFactual: "Factual",
      fieldsHelpJudgment: "Judgment",
      recordTitle: "CRM record — title",
      recordTitlePlaceholder: "Prospect record — new opportunity",
      sourceTypes: {
        email: "Email",
        call_transcript: "Call transcript",
        message: "Incoming message",
        note: "Internal note",
      },
      tabLabelPlaceholder: "Tab label (e.g. Call — Tuesday 9:10)",
      sourceBodyPlaceholder: "Source content, exactly as the candidate will read it…",
      natureFactual: "Factual (auto-marked)",
      natureJudgment: "Judgment (rubric-scored)",
      optionsPlaceholder: "Options separated by commas",
      unitPlaceholder: "Unit (€, d, …)",
      expectedLabel: "Expected value — check it actually appears in the sources",
      expectedMissing:
        "⚠ This value doesn't appear verbatim in the sources. The candidate can't guess it — fix the expected value, add an accepted variant, or complete the source.",
      exactAnswer: "Exact answer",
      acceptedVariants: "Accepted variants (commas)",
      tolerance: "Tolerance",
      trapFieldPlaceholder: "Factual field concerned…",
      trapSourcesPlaceholder: "What each source says and how they contradict each other",
      trapResolutionPlaceholder: "Which value stands, and why",
      trapBehaviourPlaceholder: "Behaviour expected from a good candidate",
    },
  },

  jobLocale: {
    label: "Language of the job posting and candidate pipeline",
    help: "The entire assessment will be written in this language: questions, practical exercises, AI assistant and candidate emails.",
    lockedTitle: "Language locked",
    lockedHelp:
      "This job's experience has already been generated in {locale}. To change language, delete the experience and generate it again.",
    changeWarning:
      "Changing the language now only affects future jobs: text already generated will stay in {locale}.",
  },


  account: {
    title: "My account",
    subtitle: "Manage your personal details and security settings.",

    tabs: {
      general: "General information",
      company: "Company profile",
      branding: "Branding & logo",
      security: "Security & sign-in",
      billing: "Credits & billing",
    },

    general: "General information",
    firstName: "First name",
    lastName: "Last name",
    company: "Company",
    saveChanges: "Save changes",
    profileUpdated: "Profile updated successfully!",

    // ── Session ─────────────────────────────────────────────────────────
    session: "Session",
    signOutHelp:
      "This ends your session on this device. Your data and your jobs stay untouched.",

    security: "Security & sign-in",
    securityIntro:
      "To change your email or password, you must confirm your current password.",
    currentPassword: "Current password (required)",
    currentPasswordHint: "Required to save your changes",
    currentPasswordRequired: "Please enter your current password for security reasons.",
    email: "Email address",
    emailHint:
      "A confirmation link may be sent to the new address depending on your server settings.",
    emailConfirmationSent:
      "A confirmation link has been sent to your new email address. The change takes effect once confirmed.",
    newPassword: "New password",
    newPasswordHint: "Leave empty to keep your current password",
    updateSecurity: "Update security settings",
    securityUpdated: "Security settings updated!",
  },

  aiInterview: {
    contextPlaceholder: "e.g. a 20-person fintech start-up, collaborative culture…",
    dealbreakerPlaceholder: "e.g. « not available for 3 months », « no driving licence »",
    hiddenFromCandidate: "Not visible to the candidate",
    heading: "Assessment (AI interview)",
    intro:
      "The AI will run an interview with candidates to assess their skills and motivation.",
    enabled: "Enabled",
    disabled: "Disabled",
    enableTitle: "Turn on the AI interview",
    enableHelp:
      "The AI interview pre-qualifies candidates automatically, before you meet them.",
    enableAction: "Turn on the AI interview",

    saved: "Configuration saved successfully",
    saveError: "Something went wrong while saving",

    requiredQuestions: "Required questions",
    requiredQuestionsHelp: "Specific questions the AI must ask.",
    questionPlaceholder: "e.g. \"Describe your experience with Next.js.\"",

    introSection: "Intro & closing",
    introSectionHelp: "Welcome message, closing message and interview tone.",
    tone: "Interview tone",
    tones: {
      Formel: "Formal",
      Neutre: "Neutral",
      Décontracté: "Relaxed",
    },
    introMessage: "Opening message",
    outroMessage: "Closing message",
    estimatedDuration: "Estimated duration:",
    estimatedDurationValue: "10 to 15 minutes depending on the candidate's answers.",
    candidateFacingHint: "Read to the candidate: write it in the language of the job.",

    contextSection: "Context for the AI",
    contextSectionHelp: "Information invisible to the candidate, used to steer the AI.",
    contextHelp:
      "These act as a brief for the AI so it can tailor its questions. You can edit the generated text by hand.",
    aboutCompany: "About the company",
    whyHiring: "Why this hire?",
    whyHiringPlaceholder: "e.g. growing the product team, launching a new feature…",
    whatMatters: "What really matters",
    whatMattersPlaceholder:
      "e.g. someone self-directed, driven, who communicates well asynchronously…",

    criteriaSection: "Scoring criteria",
    criteriaSectionHelp: "Criterion weights and deal-breakers.",
    globalWeight: "Overall scoring weights",
    customPreset: "✏️ Custom",
    presets: {
      Technique: "Technical",
      Commercial: "Sales",
      Créatif: "Creative",
      Junior: "Junior",
      Personnalisé: "Custom",
    },
    weights: {
      hard_skills: "Hard skills (technical)",
      soft_skills: "Communication & soft skills",
      motivation: "Motivation",
      culture: "Culture fit",
      potential: "Potential & adaptability",
    },
    total: "Total",
    mustEqual100: "must add up to 100%",
    resetDefaults: "Reset to defaults",
    decisiveCriteria: "Deal-breakers",
    decisiveCriteriaHelp:
      "If the AI spots these conditions in the candidate's answers, they'll be flagged in the report.",
    neverAutoRejects: "The AI never rejects a candidate on its own.",

    appliesToNext: "Changes will apply to interviews sent from now on.",
    saveConfig: "Save configuration",
  },

  videoInterview: {
    levelShort: "Lvl {level}",
    levelPlaceholder: "Describe the level {level} behaviour ({label})...",
    addBarsCriterion: "Add a BARS criterion",
    maxReached: " (limit reached)",
    customQuestion: "Custom question",
    categories: { motivation: "Motivation", experience: "Experience", softSkills: "Soft skills", technical: "Technical", cultureFit: "Culture fit", custom: "Custom" },
    loadLibraryError: "Couldn't load the library",
    saveJobFirst: "Save your job first",
    generationError: "Generation failed",
    maxQuestions: "Maximum 3 questions per video module",
    alreadyAdded: "This question has already been added",
    aiQuestionAdded: "AI question added",
    questionAdded: "Question added",

    categories: {
      Technique: "Technical",
      "Soft Skills": "Soft skills",
      "Culture Fit": "Culture fit",
      Custom: "Custom",
      Toutes: "All",
    },

    maxDuration: "Max length per answer",
    twoMinutesRecommended: "2 minutes (recommended)",
    retakesAllowed: "Retakes allowed",
    retakes: {
      one: "1 extra attempt",
      two: "2 extra attempts",
      unlimited: "Unlimited",
    },
    scoreMyself: "Score the videos myself",
    scoreMyselfHelp: "You'll score each video after watching it.",

    limitReached: "Limit reached: 3 questions max",
    generating: "Generating…",
    generateWithAi: "Generate with AI",
    closeLibrary: "Close the library",
    openLibrary: "Question library",
    libraryLimitReached: "Limit of 3 questions reached for this module.",
    aiSuggestions: "AI suggestions",
    added: "Added",
    add: "Add",
    onbordLibrary: "Onbord library",
    libraryShort: "📚 Library",

    noQuestions: "No questions configured",
    noQuestionsHelp: "Generate questions with AI, or pick some from our library.",
    questionPlaceholder: "Question text…",
    deleteQuestion: "Delete",
    minOneCriterion: "⚠ At least 1 BARS criterion is required for scoring.",
    criterionPlaceholder: "Criterion name (e.g. sales storytelling)",
    deleteCriterion: "Delete this criterion",
    legacyFormat:
      "Legacy format (no BARS rubric). Regenerate the questions to get structured scoring.",

    barsLevels: {
      insufficient: "Below expectations",
      expected: "Meets expectations",
      excellent: "Excellent",
    },

    allCategories: "All",
    aiSuggestionsGenerated_one: "{count} suggestion generated by AI!",
    aiSuggestionsGenerated_other: "{count} suggestions generated by AI!",
    summaryQuestions_one: "{count} question",
    summaryQuestions_other: "{count} questions",
    summaryDuration: "Max {duration} per answer",
    summaryNoRetake: "No retakes",
    summaryRetakes_one: "{count} retake allowed",
    summaryRetakes_other: "{count} retakes allowed",
  },

  jobForm: {
    categoryPlaceholder: "e.g. Sales, Engineering…",
    subFamilyPlaceholder: "e.g. Account Executive (B2B)…",
    yearsPlaceholder: "e.g. 3 years, 1-3 years, 5+ years",
    mustHave: "Must have",
    niceToHave: "Nice to have",
    subFamily: "Specification",
    section: "Job details",
    sectionHelp: "Pre-filled from your posting. Adjust as needed.",
    jobTitle: "Job title *",
    shortDescription: "Short description *",
    jobFamily: "Job family",
    roleType: "Role type",
    selectPlaceholder: "Select…",
    roleTypes: {
      ic: "Individual contributor (IC) — no management duties, expert in their field",
      manager: "Manager — runs a team, reviews people, decides on resources",
      seniorIc: "Senior IC / Lead — senior expert with no direct reports but real influence",
      director: "Director / Executive — manages managers, sets strategy",
    },

    hardSkills: "Hard skills *",
    addCustomSkill: "Add a custom skill",
    softSkills: "Soft skills",
    addSoftSkill: "Add a soft skill",
    languages: "Languages",
    addLanguage: "Add a language",
    languageNames: { french: "French", english: "English", dutch: "Dutch" },
    // Keyed by the stored level (1-5); the CEFR code comes from lib/i18n/languages.
    languageLevels: { 1: "Basic", 2: "Intermediate", 3: "Upper intermediate", 4: "Advanced", 5: "Proficient" },
    degree: "Degree",
    degrees: { master: "Master's", bachelor: "Bachelor's", any: "No preference" },
    experienceRequired: "Experience required",

    manuallySelected: "Selected manually",
    changePriority: "Change priority",
    remove: "Remove",
    uncertaintyZone: "Priority unclear",
    noSkillsIn: "No “{label}” skills",
    confirmPriority:
      "The AI couldn't determine how important these skills are. Please confirm their priority:",
    mustHave: "Must have",
    niceToHave: "Nice to have",
  },

  assessmentModules: {
    saved: "Configuration saved!",
    saveError: "Something went wrong while saving",
    title: "Assessment modules",
    subtitle:
      "Choose which modules are active for this job. Candidates only see the ones you turn on.",

    cvScoring: "CV scoring",
    cvScoringHelp:
      "The candidate uploads their CV (PDF). Our AI analyses it and produces a match score.",
    skillsTests: "Skills tests",
    skillsTestsHelp:
      "Pick tests from your library. Questions are drawn at random but are the same for every candidate.",
    videoInterview: "Video interview (one-way)",
    videoInterviewHelp:
      "The candidate answers questions by recording themselves on webcam. The AI transcribes and scores each answer.",
    recommended: "RECOMMENDED",
    textInterview: "Text-based AI interview",
    textInterviewHelp:
      "Leo, our AI, runs a written interview with the candidate. Less reliable: answers may be AI-generated, and it's slower for the candidate.",
    notRecommended: "⚠️ NOT RECOMMENDED",

    totalDuration: "Total estimated time for the candidate",
    durationOptimal: "✅ Optimal",
    over30min: "⚠️ Over the recommended 30 min",
    questionsFixedOnSave:
      "Questions are drawn at random and locked when you save, so every candidate answers the same ones.",
  },

  pipeline: {
    title: "Hiring pipeline",
    addStep: "Add a step",
    deleteStep: "Delete",
    deleteStepConfirm: "Delete this step?",
    customStep: "Custom step",

    nodes: {
      qualifying: "Screening questions",
      qualifyingCount_one: "{count} question",
      qualifyingCount_other: "{count} questions",

      experience: "Candidate experience",
      // Three states, three messages: the card said "click to configure" even
      // on an experience that had already been generated.
      experienceEmpty: "Click to generate it",
      experienceDraft_one: "Draft · {count} step",
      experienceDraft_other: "Draft · {count} steps",
      experienceReady_one: "{count} step · ~{minutes} min",
      experienceReady_other: "{count} steps · ~{minutes} min",
      sourcingHelp: "Handled through your ATS or your sourcing channels.",
      videoCall: "Video call interview",
      videoCallHelp: "Phone or video interview, run directly by your team.",
      onSite: "On-site interview",
      onSiteHelp: "In-person interview, run directly by your team.",
      debrief: "Final debrief",
      debriefHelp: "Final decision and, if it goes well, an offer.",
    },
  },

  experiences: {
    titlePlaceholder: "e.g. Account Executive B2B",
    title: "Experiences",
    subtitle: "The candidate experiences generated for your roles.",
    search: "Search for a job…",
    none: "No experience created yet",
    noResults: "No results",
    noneHelp: "Create your first candidate experience for one of your roles.",
    noResultsHelp: "Try a different search term.",
    generated: "Experience generated — review it and publish",
    jobDeleted: "Job deleted",
    untitled: "Untitled",
    create: "Create a candidate experience",

    whichExperience: "Which candidate experience do you want to build?",
    attachJob: "Attach an existing job",
    attachJobHelp:
      "Experiences linked to a job automatically use its posting and your company context.",
    existingJob: "Existing job",
    existingJobHelp: "Link a job you already created",
    newJob: "New job",
    newJobHelp: "Create one on the fly",
    chooseJob: "Choose a job",
    noJobYet: "No jobs yet. Create a new one.",

    jobTitleRequired: "Add a title, or paste a posting (50 characters minimum).",
    jobCreated: "Job created",
    error: "Error",
    jobTitle: "Job title",
    jobDescription: "Job posting (optional, improves generation)",
    jobDescriptionPlaceholder: "Paste the job posting here…",
    createAndContinue: "Create and continue",
  },

  chatCreator: {
    stepRewritten: "Step {n} rewritten",
    stepRewrittenTitle: " — “{title}”",
    stepRewrittenSummary: ": {summary}",
    title: 'Assessment expert',
    greeting: "Hello! Let's design the screening experience together. Describe what you need, in your own words.",
    // The FIRST question, deliberately written here rather than left to the
    // prompt: this way it is guaranteed to come first, costs nothing, and is
    // already in the right language. The previous version offered a menu of
    // categories and harvested exactly that — categories.
    greetingForJob:
      "Let's design the screening experience for {role} together. Let's start with what matters most: what does the ideal exercise look like to you — what would you really want to watch a candidate handle?",
    thisRole: "this role",

    alreadyGenerated_one:
      "The screening experience for {role} is already generated: {count} step, version v{version}{published}.",
    alreadyGenerated_other:
      "The screening experience for {role} is already generated: {count} steps, version v{version}{published}.",
    publishedSuffix: ", published",
    adjustHint:
      "Tell me what you'd like to adjust — for example « rewrite step 2 with a more direct tone ». I'll redo just that step, leaving the others alone.",
    connectionError: 'Connection to the assistant failed.',
    placeholder: 'Type your message…',
    placeholderShort: 'Reply…',
    confirmFirst: 'Please confirm or cancel the action above…',
    confirmFirstShort: 'Please confirm the action…',
    clearConversation: 'Clear the conversation',
    clearConfirm: 'Clear this conversation? Steps already generated are not affected.',
    // Clearing the conversation also clears the discovery record (the whole row
    // is deleted), so we ask the opening question again.
    cleared:
      "Starting fresh. What does the ideal exercise look like to you for this role — what would you really want to watch a candidate handle?",

    sendError: 'Something went wrong while sending your message',
    generationFailed: 'Generation failed',
    rewriteFailed: 'Rewrite failed',
    error: 'Error',
    unexpectedError: 'Unexpected error',

    customNeeded: 'Bespoke build required',
    role: 'Role:',
    skills: 'Skills:',
    summary: 'Summary:',
    confirmRequest: 'Confirm the request',
    requestSaved: 'Request saved!',
    requestError: 'Something went wrong with the request',

    testFound: 'Test found!',
    testSelected: 'Selected test:',
    addToAssessments: 'Add to my assessments',
    noThanks: 'No thanks',
    testAdded: 'Test added to My Assessments!',
    testAttached: 'Test attached to the job!',
    testAttachError: 'Test added, but linking it to the job failed',
    addError: 'Something went wrong while adding',
  },

  companyProfile: {
    websitePlaceholder: "https://your-company.com",
    targetMarketPlaceholder: "e.g. HR SaaS, fintech, retail, IT consulting…",
    businessModelPlaceholder: "e.g. B2B SaaS, B2C, marketplace, professional services…",
    title: "Company profile",
    websiteAndContext: "Website & AI context",
    targetMarket: "Target market",
    businessModel: "Business model (Domain)",
    observedTrends: "Observed trends (auto-generated)",
    privateNotice: "{label} — This data enriches the AI analyses (job qualification, candidate scoring) but is never shown to candidates.",
    urlRequired: "Please enter your website URL.",
    contextGenerated: "AI context generated! Check and adjust the fields if needed.",
    analysisFailed: "Couldn't analyse the site. Fill in the fields manually.",
    saved: "Company profile saved!",
    subtitle:
      "This information is used only by Onbord's AI to tailor how it analyses your jobs. Candidates never see it.",
    privateContext: "Private context",
    habits: "How you hire",
    analyze: "Analyse",
    analyzeHelp: "Onbord will read your site and pre-fill the fields below automatically.",
    description: "Company description",
    generating: "Generating…",
    descriptionPlaceholder:
      "In 3 to 5 sentences, describe what your company does, what sets it apart, and your main products or services…",
    targetMarketPlaceholder: "e.g. European SMEs, enterprise accounts, consumers…",
    habitsPlaceholder:
      "Describe how you usually hire: your process, how many stages, tools, cultural criteria that matter…",
    habitsHelp: "The AI uses this to tailor the assessment pipelines it designs.",
    habitsExample:
      "e.g. we usually hire in 3 stages — a 30-minute HR screening call, a 1-hour technical interview with the manager, and a final practical exercise. We put a lot of weight on intellectual curiosity and the ability to work independently. Our process takes about 3 weeks…",
    afterFirstHire: "Available after your first hire on Onbord",
    afterFirstHireHelp:
      "Onbord will analyse patterns from your past hires to enrich this context automatically.",
    save: "Save profile",
  },

  billing: {
    contactUs: "Contact us",
    loadError: "Couldn't load your billing information.",
    title: "Billing & credits",
    subtitle: "Track your usage and top up your account.",
    costPerAction: "Cost per action",
    total: "Total",
    creditsSuffix: "{count} credits",
    currentPlan: "Current plan",
    unlimitedCredits: "Unlimited credits",
    creditsPerMonth: "{count} credits/month",
    pricePerMonthAnnual: "€{price}/month (billed annually)",
    pricePerMonth: "€{price}/month",
    nextRefill: "+{count} credits added to your balance on",
    rolloverHelp:
      "Annual plan: credits you don't use roll over from month to month. Your balance starts again from zero when your subscription renews, on {date}.",
    remainingCredits: "Credits remaining",
    unlimitedAccess: "✓ Your account has unlimited access.",

    autoReset: "Resets automatically on",

    createJob: "Create a simulation",
    createJobHelp:
      "Charged every time the AI agent creates a job's simulation: the first time, and on each full regeneration. Parsing the ad, editing by hand and publishing cost nothing — and neither does a generation that fails.",
    perJobUnit: "per generation",

    regenerateStep: "Regenerate a step",
    regenerateStepHelp:
      "Each step the AI agent rewrites at your request, from the button or the chat. Editing a step yourself costs nothing.",
    perStepUnit: "per step",

    candidateRun: "Put a candidate through",
    candidateRunHelp:
      "{start} credit when they enter the simulation, {scoring} for the AI evaluation that runs automatically on submission. An invited candidate who never starts costs nothing.",
    perCandidateUnit: "per candidate",

    nothingElse: "Nothing else consumes credits.",

    needMore: "Need more credits, or an upgrade?",
    needMoreHelp: "Get in touch — we manage your account by hand.",
  },

  branding: {
    companyNamePlaceholder: "e.g. Acme Corp",
    taglinePlaceholder: "e.g. an innovative greentech start-up…",
    visualCustomisation: "Visual customisation",
    logoUploaded: "Logo uploaded!",
    uploadFailed: "Upload failed.",
    appliedToAll: "Changes applied to ALL your company's jobs.",
    saved: "Branding updated!",

    globalSetting: "Global setting (company level)",
    globalSettingHelp: "This setting applies automatically to {allJobs}.",
    globalSettingAllJobs: "all your job postings",

    identity: "Company identity",
    displayName: "Display name",
    shortPitch: "Short pitch (optional)",
    logo: "Logo",
    uploading: "Uploading…",
    chooseImage: "Choose an image",
    primaryColor: "Primary colour (accent)",
    primaryColorHelp:
      "Applied to buttons, borders and interactive elements (never to the page background).",
    save: "Save changes",

    pageSubtitle: "Set the overall look of the assessments your candidates will go through.",
    preview: "Preview (candidate view)",
    previewCompanyName: "Company name",
    previewProgress: "Progress",
    previewSelected: "Selected option",
    previewContinue: "Continue the assessment",
  },

  jobCreate: {
    tipLabel: "Tip:",
    protectedSites: "LinkedIn, Indeed or Glassdoor",
    urlHint: "{tip} This works with your own careers site or with ATSs such as Greenhouse, Lever or Workable. It may not work with {sites}, which protect their pages. In that case, paste the job text directly.",
    steps: { job: "1. Job posting", details: "2. Details", journey: "3. Pipeline" },
    heading: "Let's start with your job posting",
    intro:
      "Onbord reads your posting and pulls out the skills to assess. You approve them, and we build the screening pipeline.",

    modePaste: "Paste the text",
    modeFile: "Import a file",
    modeUrl: "Posting URL",
    readingFile: "Reading the file…",
    changeFile: "Click to change file",
    importFile: "Click to import your posting",
    analyze: "Analyse",
    loading: "Loading…",
    descriptionPlaceholder:
      "Paste your job posting here, or describe the role: title, responsibilities, expected skills, languages…",

    back: "Back",
    next: "Next",
    untitledJob: "Untitled role",

    parseError: "Something went wrong while reading the document.",
    readError: "Something went wrong while reading the file.",
    urlError: "Something went wrong while loading the URL.",
    tooShort: "That description is too short. Please give us more detail.",
    analysisError: "Something went wrong during the analysis.",
    mustBeLoggedIn: "You must be signed in to save.",
    saveError: "Something went wrong while saving.",
    pipelineSaveError: "Something went wrong while saving the pipeline",

    fetchingTitle: "Loading the posting…",
    analyzingTitle: "Analysing the posting…",
    fetchingHelp: "We're fetching the page content and preparing it for AI analysis.",
    analyzingHelp:
      "Our AI is reading and structuring your posting to set the candidate assessment criteria automatically.",
    fetchingStatus: "Loading…",
    analyzingStatus: "Artificial intelligence at work",
  },

  admin: {
    accessDenied: "Access denied",
    adminsOnly: "This page is for administrators only.",
    title: "Administration",
    subtitle: "Create your clients' accounts and manage their access.",
    tabInvites: "Invitations",
    tabCosts: "API costs",
    tabCredits: "Credits & plans",

    // ── Direct account creation ─────────────────────────────────────────
    createAccount: "Create an account",
    createAccountHelp:
      "Public sign-up is closed: this is the only way to create an account. It works straight away, with no email confirmation.",
    createAccountSubmit: "Create the account",
    accountCreated: "Account created",
    accountError: "Couldn't create the account",
    copyCredentials: "Copy the credentials",
    passwordOnce:
      "Write this password down now: it is shown once and cannot be recovered afterwards.",
    fields: {
      email: "Email address",
      company: "Company",
      firstName: "First name",
      lastName: "Last name",
    },

    // ── Existing accounts ───────────────────────────────────────────────
    accountsTitle: "Existing accounts",
    accountsHelp:
      "Passwords are stored nowhere: Supabase only keeps a hash. A lost password cannot be recovered — it can only be replaced.",
    noAccounts: "No accounts yet.",
    noPlan: "No plan",
    neverSignedIn: "Never signed in",
    resetPassword: "New password",
    resetConfirm:
      "Generate a new password for {email}?\n\nThe old one stops working immediately. If this person is already using it, let them know — they won't be able to sign in without the new one.",
    resetDone: "New password generated",
    resetError: "Reset failed",

    // ── Invitations ─────────────────────────────────────────────────────
    invitesNeedSignup:
      "These links only work while public sign-up is enabled in Supabase. It is currently closed — use direct creation above.",
    linkGenerated: "Link generated and copied!",
    tokenDeleted: "Token deleted",
    linkCopied: "Link copied!",
    generateLink: "Generate the link",
    noTokens: "No links generated yet.",
    copyLink: "Copy the link",
    delete: "Delete",
    // An account's billing cycle (/admin/billing).
    cycles: {
      monthly: "Monthly",
      annual: "Annual",
      since: "Year starts",
      renewal: "Renews {date}",
      updated: "Billing cycle updated",
    },
    columns: {
      token: "Token",
      plan: "Plan",
      status: "Status",
      expires: "Expires",
      actions: "Actions",
      user: "User",
      creditsLeft: "Credits left",
      allocatedPerMonth: "Allocated/month",
      reset: "Reset",
      account: "Account",
      created: "Created",
      lastSignIn: "Last sign-in",
    },
    tokenStatus: { used: "Used", expired: "Expired", active: "Active" },

    costsTitle: "API costs",
    costsSubtitle:
      "Average cost of a candidate pipeline, based on tracked usage (generation, scoring, AI assistant).",
    periodAll: "All",
    periodDays: "{count} days",
    avgMarginalCost: "Average cost / pipeline (marginal)",
    avgMarginalCostHelp: "scoring + assistant, per candidate (excluding generation)",
    fullCost: "Full cost / pipeline",
    fullCostHelp: "including amortised generation",
    totalPeriod: "Total for the period",
    breakdown: "Cost breakdown (period)",
    generationCost: "Experience generation",
    scoringCost: "End-of-run scoring",
    assistantCost: "AI assistant (Claude)",
    transcriptionNote:
      "Video transcription (AssemblyAI, billed per minute) is not included — it isn't token-based.",
    perJob: "Per job",
    jobColumn: "Job",
    runsColumn: "Runs",
    noDataPeriod: "No data for this period.",

    creditsTitle: "Credits & plans management",
    creditsSubtitle: "Change a plan or add credits for your clients.",
    noUsers: "No users registered.",
    creditsResetNote: "💡 Credits reset automatically each month according to the plan.",
  },

  generationFeed: {
    jobLine_one: "Job analysed: {title} — {count} skill extracted",
    jobLine_other: "Job analysed: {title} — {count} skills extracted",
    jobLineNoSkill: "Job analysed: {title} — no skills extracted",
    untitledJob: "untitled role",
    contextLine: "Company context loaded — {industry}",
    contextLoaded: "Company context loaded",
    contextNone: "No company context: generating from the job posting alone",
    brief: "Your notes take priority",
    localeLine: "Candidate journey language: {label}",
    reflexion: "Thinking through skill coverage and overall coherence…",
    designStart: "Designing the practical exercises…",
    critiqueStart: "Reviewing the journey with a critical eye…",
    critiqueSkipped: "Critical review skipped to stay within the generation time limit — review the journey before publishing",
    critiqueOk: "Review: the journey holds up, nothing to rework",
    critiqueFix: "Review: step {n} “{label}” is being rewritten",
    designDone_one: "Full pipeline: {count} step",
    designDone_other: "Full pipeline: {count} steps",
    designMinutes: ", ~{minutes} min",
    thisStep: "this step",
    codeStart: "Coding exercise: designing « {label} »",
    crmStart: "CRM scenario: writing the brief for « {label} »",
    codeTest_one: "{count} test case ({hidden} hidden)",
    codeTest_other: "{count} test cases ({hidden} hidden)",
    retry: "Incomplete response — retrying",
    newVersion: "New version v{version} (previous ones stay intact)",
    firstVersion: "Creating version v1",
    saved: "{steps} steps and {subDims} sub-dimensions saved",
    done: "Experience ready for review",
    couldNotStart: "Generation couldn't start.",
    interrupted: "Generation was interrupted.",
    unexpectedError: "Unexpected error",
    step: "Step",
    generating: "Generating the experience…",
    generated: "Experience generated",
    stepLine: "Step {n} — {kind}: {label}",
    skillLine: "Skill assessed: {label}",
    criterionLine: "Sub-dimension: {label}",
    sourceLine: "Brief source: {label}",
    fieldLine: "Record field: {label}",
    trapLine: "Deliberate inconsistency: {label}",
    coverageOk_one: "Coverage: the must-have skill is tested",
    coverageOk_other: "Coverage: all {count} must-have skills are tested",
    coverageFix: "Coverage: \"{label}\" added to the rubric of step {n}",
    coverageGap: "Coverage: no step tests \"{label}\" — to decide at review",
    sourceKinds: {
      email: "email",
      call_transcript: "call transcript",
      chat: "incoming message",
      note: "internal note",
    },
    kinds: {
      classic_qcm: "Classic MCQ",
      qualifying: "Screening question",
      question: "Targeted question",
      task: "Practical exercise",
    },
  },

  feedback: {
    title: "Feedback: {name}",
    loading: "Preparing the feedback…",
    loadError: "Couldn't load the feedback. Please try again in a moment.",
    needsDecision:
      "Please shortlist this candidate, move them to the next stage or reject them first.",
    notScored:
      "This candidate's simulation hasn't been scored yet. The feedback is written as soon as scoring finishes.",
    noMaterial:
      "No point in the simulation was scored with a quote from the candidate's answer. Without evidence, no feedback is written: nothing is made up.",
    version: {
      negative: "Version: candidate rejected",
      positive: "Version: candidate moving forward",
    },
    localeNotice: "Written in {locale}, the language of the job",
    to: "To",
    from: "From",
    replyTo: "Replies to",
    subject: "Subject",
    message: "Message",
    words_one: "{count} word",
    words_other: "{count} words",
    send: "Send",
    sending: "Sending…",
    close: "Close",
    sentOn: "Sent on {date} to {email}",
    warnings: {
      noStrength:
        "No strength is backed by a quote from the answer, so the draft doesn't invent one. Check the tone before sending.",
      noReason:
        "No missed point was found, so the draft can't explain the rejection from the simulation.",
      noImprovement:
        "Every point was achieved: there is no real area for improvement to quote, so the draft doesn't invent one.",
      unverifiedQuote:
        "A quote in the draft couldn't be found word for word in the candidate's answer. Check it or remove it before sending.",
    },
    errors: {
      noEmail: "This candidate has no email address on file.",
      needsDecision: "No decision has been recorded for this candidate.",
      alreadySent: "This feedback has already been sent.",
      empty: "The subject and message can't be empty.",
      tooLong: "The message is too long.",
      send: "The email couldn't be sent. Nothing went out, you can try again.",
    },
  },

  nodeConfig: {
    createExperienceWithAi: "Build the experience with AI",
    tabMessage: "Message",
    tabBranding: "Employer brand",
    welcomeLabel: "Candidate welcome message",
    thanksLabel: "End-of-pipeline message",
    messagePlaceholder: "Write your message here…",
    aiExperience: "AI assessment (Experience)",
    configured: "✅ AI experience configured.",
    editWithAi: "Edit with AI",
    generateHelp:
      "Generate a complete, true-to-life practical exercise through the AI chat.",
  },

  jobSelection: {
    notAuthenticated: "Not authenticated",
    loadError: "Something went wrong while loading your jobs",
    title: "Select a job",
    subtitle: "Choose the job you want to build this assessment for.",
    search: "Search for a job…",
    noResults: "No jobs found",
    changeSearch: "Try a different search.",
    noJobsYet: "You haven't created any jobs yet.",
    draft: "Draft",
    noLocation: "No location set",
    select: "Select",
    createdOn: "Created on {date}",
  },

  testSelection: {
    loadError: "Something went wrong while loading the tests",
    title: "Link a test",
    subtitle: "Choose a test from your library to link to this step.",
    search: "Search My Assessments…",
    noResults: "No tests found",
    changeSearch: "Try a different search.",
    noTestsYet: "You don't have any tests in your library yet.",
    attach: "Link",
  },

  skillsTestConfig: {
    requestCustom: "Request a custom test",
    categories: { cognitif: "Cognitive", langue: "Languages", metier: "Job-specific", personnalite: "Personality", ia: "AI" },
    loadingLibrary: "Loading the library…",
    totalDuration: "Total estimated time for the candidate",
    selectOneTest: "Select 1 test",
    comingSoon: "Soon",
    categories: {
      Cognitif: "Cognitive",
      Langues: "Languages",
      Métier: "Role-specific",
      Personnalité: "Personality",
    },
  },

  recommendation: {
    fallbackTitle: "Account Manager",
    fallbackRoleType: "Individual contributor",
    skillsTest: "Skills test",
    backToSkills: "Back to skill selection",
    configureAllModules:
      "Please configure every module you've added (questions, video, test) before confirming.",
    validate: "Confirm",
  },

  qualifyingConfig: {
    questionPlaceholder: "e.g. do you hold a driving licence?",
    addQuestion: "Add a question",
    addAnother: "Add another question",
    questionNumber: "Question {n}",
    none: "No screening questions",
    noneHelp:
      "Add questions to filter candidates automatically before they reach the assessment.",
    expectedAnswer: "Expected answer",
    yes: "Yes",
    no: "No",
    deleteQuestion: "Delete this question",
  },

  assessmentCreation: {
    closeAssistant: "Close the assistant",
    hello: "Hello {name}",
    whichType: "What kind of assessment do you want to build?",
    addContext: "Add context",
    jobAsPdf: "Job posting as PDF",
    comingSoon: "Coming soon",
    connectGithub: "Connect a GitHub repo",
    uploadZip: "Upload a ZIP",
  },

  assessmentAction: {
    skillsTest: "Skills test",
    whatToDo: "What would you like to do?",
    addNewTest: "Add a new test",
    createWithAi: "Build a bespoke test with AI",
    selectFromLibrary: "Pick from the library",
    useExisting: "Use an existing test",
  },

  onboarding: {
    title: "Getting started",
    ready: "Ready to hire?",
    done: "Well done — you're all set.",
    dismiss: "Hide this guide",
    progress: "{done}/{total} steps done",

    // The five steps of the actual journey since the Experience switch. Each
    // label states the RESULT reached, not the action to take: it is a list of
    // what is done, and it reads ticked off.
    steps: {
      account: "Account created",
      company: "Company profile and branding filled in",
      firstJob: "First job created and analysed",
      firstExperience: "First candidate experience generated",
      firstCandidate: "First candidate received",
    },
  },

  usage: {
    credits: "Credits",
    planNamed: "{plan} plan",
    credits: "Credits",
    resetsMonthly: "Resets on the 1st of the month",
    creditsUsed: "Credits used",
    changePlan: "Change plan",
    topUp: "Top up",
  },

  cvCriteria: {
    intro: "The AI picked these 5 criteria from your job posting. They will be used to compute the {score} of every CV you import. You can adjust their labels and their weight.",
    introScore: "match score",
    weightWarning: "The weights add up to {total}. They should total 100% for accurate scoring.",
    addCriterion: "Add a criterion",
    placeholder: "e.g. experience managing a team",
    distributeEvenly: "Distribute evenly",
  },

  preferences: {
    uiLanguage: "Interface language",
    uiLanguageHelp:
      "Only affects how the dashboard looks to you. The language your candidates see is set per job.",
    languageSaved: "Language updated",
    languageError: "Couldn't save your language setting.",
  },
};

export default dashboard;
