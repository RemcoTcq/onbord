// Kandidaattraject — Nederlands.
// Spiegelt fr/candidate.js sleutel voor sleutel. Bij nieuwe sleutels beide
// bestanden bijwerken.
//
// Register: consequent "je/jij". De doelgroep is Belgisch-Nederlandstalig en
// het product spreekt kandidaten informeel aan, zoals in het Franse "vous" dat
// hier warm en niet formeel bedoeld is.

const candidate = {
  notice: {
    fallbackTeam: "het recruitmentteam",

    invalidLinkTitle: "Geen toegang",
    invalidLinkBody: "Deze beoordelingslink is ongeldig of verlopen.",

    expiredTitle: "Deze link is niet meer geldig",
    expiredBody:
      "Beoordelingslinks verlopen na 5 dagen. Neem contact op met {company} voor een nieuwe — je sollicitatie blijft gewoon bewaard.",

    notReadyTitle: "Deze beoordeling is nog niet klaar",
    notReadyBody:
      "{company} legt de laatste hand aan het traject voor deze functie. Bewaar deze link: hij werkt zodra de beoordeling opengaat, en je krijgt bericht per e-mail.",

    jobUnavailableTitle: "Vacature niet beschikbaar",
    jobNotFound: "Deze vacature bestaat niet of is verwijderd.",

    applicationsClosedTitle: "De sollicitaties zijn nog niet geopend",
    applicationsClosedBody:
      "{company} legt de laatste hand aan de selectieprocedure voor deze functie. Kom over een paar dagen terug op deze pagina — dan kun je solliciteren.",

    logoAlt: "Logo",
  },

  qualifying: {
    title: "Voor je begint",
    subtitle:
      "Een paar vragen om de vereisten voor deze functie te controleren. Antwoord eerlijk: je antwoorden bepalen het vervolg.",
    yes: "Ja",
    no: "Nee",
    answerAll: "Beantwoord alle vragen",
    continue: "Doorgaan",
  },

  disqualified: {
    title: "Bedankt voor je interesse",
    body:
      "Je antwoorden komen niet overeen met de vereisten voor deze functie, waardoor we je sollicitatie niet verder kunnen behandelen. Bedankt voor de tijd die je hebt genomen — solliciteer gerust op onze andere vacatures.",
  },

  intro: {
    fallbackTitle: "Je beoordeling",
    fallbackTeam: "Het recruitmentteam",
    welcome:
      "Welkom! {company} nodigt je uit voor een korte praktijkopdracht{duration}. Neem je tijd, er zitten geen strikvragen bij: laat gewoon zien hoe je werkt.",
    start: "Beginnen",
  },

  run: {
    stepCounter: "Stap {current} van {total}",
    minutes: "~{count} min",
    previous: "Vorige",
    next: "Volgende",
    finish: "Afronden",
    answerToContinue: "Beantwoord deze stap om door te gaan",
    yes: "Ja",
    no: "Nee",
    saveFailed: "Je antwoord kon niet worden opgeslagen.",
    submitFailed: "Verzenden mislukt",
    genericError: "Er is iets misgegaan.",
    retryError: "Er is iets misgegaan. Probeer het opnieuw.",
    crmMismatch:
      "Sommige gegevens op de fiche komen niet overeen met wat de bronnen zeggen. Neem even de tijd om na te lezen — of ga verder als je zeker bent.",
  },

  done: {
    title: "Klaar, bedankt!",
    body: "Je antwoorden zijn verstuurd naar {company}. Je kunt dit tabblad nu sluiten.",
  },

  onboarding: {
    fallbackName: "Kandidaat",
    fallbackCompany: "het bedrijf",
    welcome: "Fijn dat je meedoet aan deze beoordeling.",
    start: "Beoordeling starten",

    // Het gemarkeerde woord staat in het Nederlands vóór het werkwoord, niet
    // achteraan zoals in het Frans — precies waarom dit één zin met een
    // marker is en geen drie losse stukken.
    askFirstName: "Wat is je {highlight}?",
    firstNameHighlight: "voornaam",
    firstNamePlaceholder: "Bijv. Camille",

    askLastName: "Wat is je {highlight}?",
    lastNameHighlight: "achternaam",
    lastNamePlaceholder: "Bijv. Dupont",

    askEmail: "Wat is je {highlight}?",
    emailHighlight: "e-mailadres",
    emailPlaceholder: "camille.dupont@email.com",

    back: "Terug",
    lastStep: "Nog één stap",

    consentTerms: "Ik heb de {terms} en het {privacy} gelezen en ga ermee akkoord",
    termsLink: "gebruiksvoorwaarden",
    privacyPolicy: "privacybeleid",

    consentAi: "Ik begrijp dat {aiLink}, onder eindtoezicht van een menselijke recruiter.",
    aiAnalysis: "AI mijn antwoorden analyseert",

    submitting: "Bevestigen…",
    continue: "Doorgaan",
  },

  assistant: {
    greeting:
      "Hallo! Ik ben Claude. Je hebt toegang tot mij zoals je dat op het werk ook zou hebben: stel je vragen, vraag om een opzet, een invalshoek, een controle, een kritische blik.\n\nEén ding moet je weten: **ons hele gesprek wordt vastgelegd en maakt deel uit van de beoordeling**. Het gaat er niet om óf je mij gebruikt, maar hóe je dat doet.",
    open: "Claude openen",
    collapse: "Inklappen",
    placeholder: "Schrijf naar Claude…",
    send: "Versturen",
    remainingMessages_one: "Nog {count} bericht",
    remainingMessages_other: "Nog {count} berichten",
    limitReached: "Je hebt het maximumaantal berichten voor deze beoordeling bereikt.",
    error: "Sorry, er is iets misgegaan.",
    interrupted: "\n\n_(antwoord onderbroken)_",
  },

  recorder: {
    deviceError:
      "Geen toegang tot je camera of microfoon. Controleer de rechten in je browser.",
    uploadFailed: "Verzenden mislukt:",
    retake: "Opnieuw",
    cancel: "Annuleren",
    stop: "Stoppen",
    validate: "Bevestigen",
    saved: "Video-antwoord opgeslagen",
    testDevices: "Camera & microfoon testen",
    testBadge: "Test — live voorbeeld",
    micLevel: "Microfoonniveau — spreek om te controleren of de balk beweegt",
    testConfirm:
      "Zie je jezelf en reageert de geluidsbalk? Start de opname wanneer je er klaar voor bent.",
    itWorks: "Het werkt — opname starten",
    uploading: "Bezig met verzenden…",
  },

  sandbox: {
    chatTitle: "Interne chat / klantchat",
    chatPlaceholder: "Je antwoord in de chat…",
    chatSampleMessage: "Kun je uitleggen waarom deze oplossing beter is?",
    docTitle: "Architectuur- / ontwerpdocument",
    docPlaceholder: "# Voorgestelde architectuur…",
    codeTitle: "Code-editor (sandbox)",
    codePlaceholder: "// Schrijf hier je code…",
    code: {
      run: "Tests uitvoeren",
      running: "Bezig…",
      summary: "{passed}/{total} tests geslaagd",
      attemptsLeft: "Nog {count} uitvoeringen",
      hiddenTests: "{count} verborgen tests",
      hiddenTest: "Verborgen test {n}",
      noTests: "Geen automatische tests bij deze stap: uw code wordt zo nagelezen.",
      compileError: "Compilatiefout",
      input: "Invoer",
      expected: "Verwacht",
      got: "Gekregen",
      empty: "(leeg)",
      verdicts: {
        timeout: "tijd overschreden",
        runtime_error: "fout tijdens uitvoering",
        compile_error: "compileert niet",
        error: "uitvoering mislukt",
      },
      errors: {
        not_configured: "Code uitvoeren is momenteel niet beschikbaar. Schrijf uw oplossing: ze wordt nagelezen.",
        quota_exceeded: "De uitvoeringsdienst is momenteel verzadigd. Probeer het over enkele minuten opnieuw.",
        provider_busy: "De uitvoeringsdienst is momenteel overbelast — dit ligt niet aan uw code. Wacht even en probeer opnieuw.",
        provider_unreachable: "De uitvoeringsdienst is onbereikbaar. Probeer het zo meteen opnieuw.",
        provider_error: "De uitvoering is om technische redenen mislukt. Probeer opnieuw.",
        timeout: "De uitvoering duurde te lang en werd gestopt. Controleer op oneindige lussen.",
        no_tests: "Er zijn geen tests ingesteld bij deze stap.",
        limit_reached: "U hebt de limiet aan uitvoeringen voor deze stap bereikt. Uw code is bewaard en wordt nagelezen.",
        generic: "De uitvoering is mislukt. Probeer opnieuw.",
      },
    },
    defaultPlaceholder: "Je antwoord…",
  },

  crm: {
    cardTitle: "Prospectfiche — nieuwe opportuniteit",
    noSources: "Geen bronnen beschikbaar.",
    notesPlaceholder: "Alles wat volgens jou nuttig is voor het team…",
    internalNotes: "Interne notities",
    from: "Van:",
    sourceKinds: {
      email: "E-mail",
      call: "Telefoongesprek",
      message: "Bericht",
      note: "Notitie",
    },
  },

  emailComposer: {
    toPlaceholder: "ontvanger@voorbeeld.com",
    ccPlaceholder: "cc@voorbeeld.com",
    send: "Versturen",
    newMessage: "Nieuw bericht",
    subject: "Onderwerp",
    subjectPlaceholder: "Onderwerp van je bericht",
    bodyPlaceholder: "Schrijf je e-mail…",
    bold: "Vet",
    italic: "Cursief",
    bulletList: "Opsomming",
  },

  cvUpload: {
    title: "Je cv",
    subtitle:
      "Upload je cv als pdf. Onze AI analyseert het om je profiel te toetsen aan de vacature.",
    analyzed: "Je cv is met succes geanalyseerd.",
    dropzone: "Klik of sleep je cv hierheen",
    constraints: "Alleen pdf · Max 5 MB",
    received: "Cv goed ontvangen!",
    analyzing: "Bezig met analyseren…",
    analyzingHint: "Onze AI bekijkt je profiel, dit kan enkele seconden duren.",
    notPdf: "Selecteer alleen een pdf-bestand.",
    tooLarge: "Dit bestand is te groot (max 5 MB).",
    uploadError: "Fout bij het uploaden:",
    parseError: "Er ging iets mis bij het lezen van je cv.",
    emptyPdf:
      "Deze pdf lijkt leeg of onleesbaar. Controleer of je cv geen gescande afbeelding is.",
    aiError: "Er ging iets mis bij de AI-analyse",
    genericError: "Er is iets misgegaan. Probeer het opnieuw.",
  },

  fullscreenGuard: {
    title: "Volledig scherm verplicht",
    body:
      "Om de integriteit van deze beoordeling te waarborgen, moet je in volledig scherm blijven. Elke poging om dit te verlaten wordt geregistreerd en gemeld aan de recruiter.",
    enable: "Volledig scherm inschakelen",
    active: "Onbord-fraudepreventie actief",
  },
};

export default candidate;
