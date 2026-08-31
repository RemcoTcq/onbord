// Shared strings — English. Mirrors fr/common.js key for key.

const common = {
  actions: {
    search: "Search…",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    confirm: "Confirm",
    back: "Back",
    next: "Next",
    previous: "Previous",
    continue: "Continue",
    search: "Search",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    retry: "Try again",
    seeMore: "Show more",
    seeLess: "Show less",
    noOption: "No option available",
  },

  states: {
    loading: "Loading…",
    saving: "Saving…",
    sending: "Sending…",
    empty: "No results",
    none: "—",
    pending: "Pending",
    yes: "Yes",
    no: "No",
  },

  errors: {
    generic: "Something went wrong.",
    retry: "Something went wrong. Please try again.",
    notFound: "Page not found",
    notFoundMessage: "The page you are looking for does not exist, or has moved. Don't worry — our AI is already looking into what happened.",
    backHome: "Back to home",
    network: "Can't connect. Check your network.",
    unauthorized: "You don't have access to this resource.",
  },

  auth: {
    planNamed: "{plan} plan",
    brand: "Onbord",

    loginTitle: "Sign in",
    loginSubtitle: "Good to see you back on Onbord",
    loginSubmit: "Sign in",
    loginPending: "Signing in…",
    emailPlaceholder: "you@company.com",
    noAccountYet: "Don't have an account yet?",
    createAccount: "Create an account",
    forgotPassword: "Forgot?",

    registerTitle: "Sign up",
    registerSubtitle: "Create your recruiter account",
    registerSubmit: "Create my account",
    registerPending: "Creating your account…",

    joinTitle: "Join Onbord",
    joinSubtitle: "Create your account to access the platform.",
    joinInvalidTitle: "Invalid link",
    joinInvalidToken: "Invalid invitation link. No token provided.",
    joinPlanError: "Something went wrong while assigning your plan.",


    // ── Waiting for email confirmation ──────────────────────────────────
    // Shown when signUp() succeeds without returning a session.
    confirmTitle: "Check your inbox",
    confirmBody:
      "Your account is created. We've just sent a confirmation link to {email} — open it to activate your account and reach the platform.",
    confirmSpamHint:
      "Nothing after a few minutes? Have a look in your spam folder.",
    confirmResend: "Resend the email",
    confirmResent: "Email sent again. Check your inbox.",
    confirmAlreadyDone: "Already confirmed?",
    confirmLinkFailed:
      "That confirmation link couldn't be validated: it may have already been used, expired, or been opened on a different device from the one you signed up on. Sign in below, or request a new link from the sign-up page.",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",

    fields: {
      emailPlaceholder: "you@company.com",
      firstName: "First name",
      lastName: "Last name",
      company: "Company",
      companyPlaceholder: "Company name",
      email: "Email",
      workEmail: "Work email",
      password: "Password",
      passwordHint: "At least 6 characters",
    },
  },

  locales: {
    fr: "Français",
    en: "English",
    nl: "Nederlands",
    uiLabel: "Interface language",
    experienceLabel: "Language of the job posting and candidate pipeline",
  },
};

export default common;
