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
    filRougeTitle: "Your scenario",
    filRougeReminder: "Scenario reminder",
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
    // The consent screen's button: the candidate does not "continue", they accept.
    accept: "I accept",
  },

  assistant: {
    greeting:
      "Hello! I'm Claude. You have access to me just as you would at work: ask questions, request a draft, an angle, a fact-check, a critical eye.\n\nOne thing to know: **our entire exchange is recorded and forms part of the assessment**. It isn't whether you use me that counts — it's how you use me.",
    open: "Open Claude",
    collapse: "Collapse",
    placeholder: "Message Claude…",
    send: "Send",
    writing: "Claude is writing…",
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
    brief: { title: "Context", to: "Recipient", subject: "Subject" },
    docTitle: "Architecture / design document",
    docPlaceholder: "# Proposed architecture…",
    defaultPlaceholder: "Your answer…",
  },

  persona: {
    contextLabel: "Situation:",
    statusOnline: "Online",
    statusEnded: "Conversation ended",
    youStart: "It's up to you to open the conversation.",
    typing: "{name} is typing…",
    placeholder: "Your message to {name}…",
    send: "Send",
    remaining_one: "{count} message left",
    remaining_other: "{count} messages left",
    end: "End the conversation",
    confirmEnd: "Confirm ending?",
    endedByYou: "You ended the conversation.",
    endedByPersona: "{name} ended the conversation.",
    endedByLimit: "The conversation reached its message limit.",
    error: "The reply couldn't come through. Please try again.",
  },

  call: {
    lobbyTitle: "Call ready",
    join: "Join the call",
    howItWorks: "Speak naturally: your voice is transcribed live. When you go quiet, a bar appears before your reply is sent — just keep talking to add more. If you'd rather stay in control, switch to manual mode and click “I'm done”. Your camera is recorded during the call. Use a headset or earphones if you can.",
    sendingSoon: "Sending in a moment… keep talking to add more.",
    autoSend: "Auto send",
    manualSend: "Manual send",
    autoHint: "Your reply is sent after a pause. Click to stay in control.",
    manualHint: "Click “I'm done” when you've finished speaking.",
    noSpeechSupport: "Your browser doesn't transcribe speech (use Chrome, Edge or Safari to speak). You can still take the call: you type, and the other person answers out loud.",
    howItWorksRealtime: "Speak naturally, as you would on the phone: the other person answers as soon as you've finished, and you can interrupt them. The call lasts as long as a real one would. Your camera is recorded during the call. Use a headset or earphones if you can.",
    connecting: "Connecting…",
    cameraError: "Camera unavailable — you can still take the call, but it won't be filmed.",
    you: "You",
    recording: "Recording",
    speaking: "Speaking…",
    thinking: "Thinking…",
    transcribing: "Heard you…",
    listening: "Listening to you",
    typeInstead: "Your reply…",
    mute: "Mute",
    unmute: "Unmute",
    doneSpeaking: "I'm done",
    hangUp: "Hang up",
    transcript: "Transcript",
    saving: "Saving the call…",
    ended: "Call ended.",
    endedHint: "The conversation is saved. You can move on.",
  },

  inbox: {
    title: "Inbox",
    titleOwner: "Inbox — {owner}",
    empty: "No messages.",
    progress: "{done}/{total} handled",
    backToList: "All messages",
    priorityLabel: "Priority",
    actionLabel: "Action",
    textRequired: "Write your reply or your hand-off note to handle this message.",
    planLabel: "How you'll organise your day (optional)",
    planPlaceholder: "In what order you'll handle things, what can wait, and why…",
    channels: {
      email: "Email",
      chat: "Team chat",
      ticket: "Ticket",
      calendar: "Invitation",
      voicemail: "Voicemail",
    },
    priorities: {
      urgent: "Urgent",
      today: "Today",
      week: "This week",
      none: "No action",
    },
    actions: {
      reply: "Reply",
      delegate: "Delegate",
      schedule: "Schedule",
      archive: "Archive",
    },
    textPlaceholders: {
      reply: "Your reply…",
      delegate: "To whom, and with what instructions…",
      schedule: "When, and what you plan to do (optional)…",
      archive: "A note, if useful (optional)…",
    },
  },

  emailComposer: {
    to: "To",
    send: "Send",
    newMessage: "New message",
    subject: "Subject",
    bodyPlaceholder: "Write your email…",
    expand: "Expand window",
    collapse: "Shrink window",
    bold: "Bold",
    italic: "Italic",
    bulletList: "Bulleted list",
  },

  cvUpload: {
    title: "Your CV",
    subtitle:
      "The company would like to receive your CV before the simulation. It is shared only with the team hiring for this role.",
    dropzone: "Click or drag your CV here",
    constraints: "PDF only · Max 5 MB",
    change: "Choose another file",
    uploading: "Uploading…",
    notPdf: "Please select a PDF file only.",
    tooLarge: "That file is too large (max 5 MB).",
    uploadError: "Your CV could not be uploaded. Please try again.",
    continue: "Send and start",
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
