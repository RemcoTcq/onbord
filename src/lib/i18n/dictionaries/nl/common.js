// Gedeelde teksten — Nederlands. Spiegelt fr/common.js sleutel voor sleutel.
//
// Alleen het kandidaattraject draait in het Nederlands: de auth-teksten hier
// worden in de praktijk zelden getoond (recruiters loggen in het FR of EN in),
// maar ze blijven vertaald zodat de pariteitscontrole klopt en een toekomstig
// NL-dashboard niet op gaten stuit.

const common = {
  actions: {
    save: "Opslaan",
    cancel: "Annuleren",
    delete: "Verwijderen",
    edit: "Bewerken",
    close: "Sluiten",
    confirm: "Bevestigen",
    back: "Terug",
    next: "Volgende",
    previous: "Vorige",
    continue: "Doorgaan",
    search: "Zoeken",
    copy: "Kopiëren",
    copied: "Gekopieerd",
    download: "Downloaden",
    retry: "Opnieuw proberen",
    seeMore: "Meer tonen",
    seeLess: "Minder tonen",
    noOption: "Geen optie beschikbaar",
  },

  states: {
    loading: "Laden…",
    saving: "Opslaan…",
    sending: "Versturen…",
    empty: "Geen resultaten",
    none: "—",
    pending: "In afwachting",
    yes: "Ja",
    no: "Nee",
  },

  errors: {
    generic: "Er is iets misgegaan.",
    retry: "Er is iets misgegaan. Probeer het opnieuw.",
    notFound: "Pagina niet gevonden",
    notFoundMessage: "De pagina die je zoekt bestaat niet of is verplaatst. Geen zorgen — onze AI zoekt al uit wat er gebeurd is.",
    backHome: "Terug naar de startpagina",
    network: "Geen verbinding. Controleer je netwerk.",
    unauthorized: "Je hebt geen toegang tot deze pagina.",
  },

  auth: {
    planNamed: "{plan}-abonnement",
    brand: "Onbord",

    loginTitle: "Inloggen",
    loginSubtitle: "Fijn je terug te zien op Onbord",
    loginSubmit: "Inloggen",
    loginPending: "Bezig met inloggen…",
    emailPlaceholder: "jij@bedrijf.com",
    noAccountYet: "Nog geen account?",
    createAccount: "Account aanmaken",
    forgotPassword: "Vergeten?",

    registerTitle: "Registreren",
    registerSubtitle: "Maak je recruiteraccount aan",
    registerSubmit: "Account aanmaken",
    registerPending: "Account wordt aangemaakt…",

    joinTitle: "Word lid van Onbord",
    joinSubtitle: "Maak je account aan om toegang te krijgen tot het platform.",
    joinInvalidTitle: "Ongeldige link",
    joinInvalidToken: "Ongeldige uitnodigingslink. Geen token opgegeven.",
    joinPlanError: "Er ging iets mis bij het toekennen van je abonnement.",


    // ── Wachten op e-mailbevestiging ────────────────────────────────────
    // Getoond wanneer signUp() slaagt zonder sessie terug te geven.
    confirmTitle: "Controleer je mailbox",
    confirmBody:
      "Je account is aangemaakt. We hebben net een bevestigingslink naar {email} gestuurd — open die om je account te activeren en het platform te bereiken.",
    confirmSpamHint:
      "Na een paar minuten nog niets? Kijk even in je spammap.",
    confirmResend: "E-mail opnieuw versturen",
    confirmResent: "E-mail opnieuw verstuurd. Controleer je mailbox.",
    confirmAlreadyDone: "Al bevestigd?",
    confirmLinkFailed:
      "Deze bevestigingslink kon niet worden gevalideerd: hij is mogelijk al gebruikt, verlopen, of geopend op een ander apparaat dan waarop je je hebt geregistreerd. Log hieronder in, of vraag een nieuwe link aan via de registratiepagina.",
    alreadyHaveAccount: "Heb je al een account?",
    signIn: "Inloggen",

    fields: {
      firstName: "Voornaam",
      lastName: "Achternaam",
      company: "Bedrijf",
      companyPlaceholder: "Naam van het bedrijf",
      email: "E-mail",
      workEmail: "Zakelijk e-mailadres",
      password: "Wachtwoord",
      passwordHint: "Minimaal 6 tekens",
    },
  },

  locales: {
    fr: "Français",
    en: "English",
    nl: "Nederlands",
    uiLabel: "Taal van de interface",
    experienceLabel: "Taal van de vacature en het kandidaattraject",
  },
};

export default common;
