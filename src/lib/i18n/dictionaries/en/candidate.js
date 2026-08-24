// Candidate journey — English.
// Mirrors fr/candidate.js key for key. Keep both in sync when adding keys.

const candidate = {
  notice: {
    fallbackTeam: "the hiring team",

    invalidLinkTitle: "Access denied",
    invalidLinkBody: "This assessment link is invalid or has expired.",

    expiredTitle: "This link is no longer valid",
    expiredBody:
      "Assessment links expire after 5 days. Contact {company} to get a new one — your application is still on file.",

    notReadyTitle: "This assessment isn't ready yet",
    notReadyBody:
      "{company} is finalising the journey for this role. Keep this link: it will work as soon as the assessment opens, and you'll be notified by email.",

    jobUnavailableTitle: "Position unavailable",
    jobNotFound: "This job posting can't be found or has been removed.",

    applicationsClosedTitle: "Applications aren't open yet",
    applicationsClosedBody:
      "{company} is finalising the selection process for this role. Check back on this page in a few days — you'll be able to apply then.",

    logoAlt: "Logo",
  },

  qualifying: {
    title: "Before you start",
    subtitle:
      "A few questions to check the requirements for this role. Please answer honestly: your answers determine what comes next.",
    yes: "Yes",
    no: "No",
    answerAll: "Please answer every question",
    continue: "Continue",
  },

  disqualified: {
    title: "Thank you for your interest",
    body:
      "Your answers don't match the requirements for this role, so we're unable to take your application further. Thank you for the time you gave us — do feel free to apply for our other openings.",
  },

  intro: {
    fallbackTitle: "Your assessment",
    fallbackTeam: "The hiring team",
    welcome:
      "Welcome! {company} invites you to complete a short practical exercise{duration}. Take your time — there are no trick questions: just show how you work.",
    start: "Start",
  },

  run: {
    stepCounter: "Step {current} of {total}",
    minutes: "~{count} min",
    previous: "Back",
    next: "Next",
    finish: "Finish",
    answerToContinue: "Answer this step to continue",
    yes: "Yes",
    no: "No",
    saveFailed: "Your answer couldn't be saved.",
    submitFailed: "Submission failed",
    genericError: "Something went wrong.",
    retryError: "Something went wrong. Please try again.",
    crmMismatch:
      "Some details on the record don't match what the sources say. Take a moment to review them — or continue if you're confident.",
  },

  done: {
    title: "All done — thank you!",
    body: "Your answers have been submitted to {company}. You can now close this tab.",
  },

  onboarding: {
    fallbackName: "Candidate",
    fallbackCompany: "the company",
    welcome: "We're delighted to welcome you to this assessment.",
    start: "Start the assessment",

    askFirstName: "What's your {highlight}?",
    firstNameHighlight: "first name",
    firstNamePlaceholder: "e.g. Camille",

    askLastName: "What's your {highlight}?",
    lastNameHighlight: "last name",
    lastNamePlaceholder: "e.g. Dupont",

    askEmail: "What's your {highlight}?",
    emailHighlight: "email",
    emailPlaceholder: "camille.dupont@email.com",

    back: "Back",
    lastStep: "One last step",

    consentTerms: "I have read and accept the {terms} and the {privacy}",
    termsLink: "terms of use",
    privacyPolicy: "privacy policy",

    consentAi: "I understand that {aiLink}, with final oversight by a human recruiter.",
    aiAnalysis: "AI will analyse my answers",

    submitting: "Confirming…",
    continue: "Continue",
  },

  assistant: {
    greeting:
      "Hello! I'm Claude. You have access to me just as you would at work: ask questions, request a draft, an angle, a fact-check, a critical eye.\n\nOne thing to know: **our entire exchange is recorded and forms part of the assessment**. It isn't whether you use me that counts — it's how you use me.",
    open: "Open Claude",
    collapse: "Collapse",
    placeholder: "Message Claude…",
    send: "Send",
    remainingMessages_one: "{count} message left",
    remainingMessages_other: "{count} messages left",
    limitReached: "You've reached the maximum number of exchanges for this assessment.",
    error: "Sorry, something went wrong.",
    interrupted: "\n\n_(response interrupted)_",
  },

  recorder: {
    deviceError:
      "Can't access your camera or microphone. Check your browser permissions.",
    uploadFailed: "Upload failed:",
    retake: "Retake",
    cancel: "Cancel",
    stop: "Stop",
    validate: "Confirm",
    saved: "Video answer saved",
    testDevices: "Test camera & mic",
    testBadge: "Test — live preview",
    micLevel: "Mic level — speak to check the bar moves",
    testConfirm:
      "Can you see yourself and does the sound bar react? Start recording when you're ready.",
    itWorks: "It works — start recording",
    uploading: "Uploading…",
  },

  sandbox: {
    chatTitle: "Internal / client chat",
    chatPlaceholder: "Your reply in the chat…",
    chatSampleMessage: "Can you explain why this solution is preferable?",
    docTitle: "Architecture / design document",
    docPlaceholder: "# Proposed architecture…",
    codeTitle: "Code editor (sandbox)",
    codePlaceholder: "// Write your code here…",
    defaultPlaceholder: "Your answer…",
  },

  crm: {
    cardTitle: "Prospect record — new opportunity",
    noSources: "No sources provided.",
    notesPlaceholder: "Anything you think the team should know…",
    internalNotes: "Internal notes",
    from: "From:",
    sourceKinds: {
      email: "Email",
      call: "Call",
      message: "Message",
      note: "Note",
    },
  },

  emailComposer: {
    toPlaceholder: "recipient@example.com",
    ccPlaceholder: "cc@example.com",
    send: "Send",
    newMessage: "New message",
    subject: "Subject",
    subjectPlaceholder: "Subject of your message",
    bodyPlaceholder: "Write your email…",
    bold: "Bold",
    italic: "Italic",
    bulletList: "Bulleted list",
  },

  cvUpload: {
    title: "Your CV",
    subtitle:
      "Upload your CV as a PDF. Our AI will analyse it to assess your profile against the role.",
    analyzed: "Your CV was analysed successfully.",
    dropzone: "Click or drag your CV here",
    constraints: "PDF only · Max 5 MB",
    received: "CV received!",
    analyzing: "Analysing…",
    analyzingHint: "Our AI is reviewing your profile, this may take a few seconds.",
    notPdf: "Please select a PDF file only.",
    tooLarge: "That file is too large (max 5 MB).",
    uploadError: "Upload error:",
    parseError: "Something went wrong while reading your CV.",
    emptyPdf:
      "This PDF looks empty or unreadable. Check that your CV isn't a scanned image.",
    aiError: "Something went wrong during AI analysis",
    genericError: "Something went wrong. Please try again.",
  },

  fullscreenGuard: {
    title: "Full screen required",
    body:
      "To protect the integrity of this assessment, you must stay in full screen. Any attempt to leave it will be recorded and reported to the recruiter.",
    enable: "Enter full screen",
    active: "Onbord anti-cheating active",
  },
};

export default candidate;
