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
    filRougeTitle: "Je situatie",
    filRougeReminder: "Herinnering aan de situatie",
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
    // De knop van het toestemmingsscherm: de kandidaat gaat niet verder, hij stemt in.
    accept: "Ik ga akkoord",
  },

  assistant: {
    greeting:
      "Hallo! Ik ben Claude. Je hebt toegang tot mij zoals je dat op het werk ook zou hebben: stel je vragen, vraag om een opzet, een invalshoek, een controle, een kritische blik.\n\nEén ding moet je weten: **ons hele gesprek wordt vastgelegd en maakt deel uit van de beoordeling**. Het gaat er niet om óf je mij gebruikt, maar hóe je dat doet.",
    open: "Claude openen",
    collapse: "Inklappen",
    placeholder: "Schrijf naar Claude…",
    send: "Versturen",
    writing: "Claude schrijft…",
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
    brief: { title: "Context", to: "Ontvanger", subject: "Onderwerp" },
    docTitle: "Architectuur- / ontwerpdocument",
    docPlaceholder: "# Voorgestelde architectuur…",
    defaultPlaceholder: "Je antwoord…",
  },

  persona: {
    contextLabel: "Situatie:",
    statusOnline: "Online",
    statusEnded: "Gesprek beëindigd",
    youStart: "Het is aan jou om het gesprek te openen.",
    typing: "{name} typt…",
    placeholder: "Je bericht aan {name}…",
    send: "Versturen",
    remaining_one: "Nog {count} bericht",
    remaining_other: "Nog {count} berichten",
    end: "Gesprek beëindigen",
    confirmEnd: "Beëindigen bevestigen?",
    endedByYou: "Je hebt het gesprek beëindigd.",
    endedByPersona: "{name} heeft het gesprek beëindigd.",
    endedByLimit: "Het gesprek heeft de berichtenlimiet bereikt.",
    error: "Het antwoord kwam niet door. Probeer opnieuw.",
  },

  call: {
    lobbyTitle: "Gesprek klaar",
    join: "Deelnemen aan het gesprek",
    howItWorks: "Spreek natuurlijk: je stem wordt live uitgeschreven. Als je stilvalt, verschijnt er een balk voordat je antwoord vertrekt — spreek gewoon verder om aan te vullen. Wil je zelf de controle houden, schakel dan over naar handmatig en klik op „Ik ben klaar”. Je camera wordt tijdens het gesprek opgenomen. Gebruik indien mogelijk een headset of oortjes.",
    sendingSoon: "Wordt zo verstuurd… spreek verder om aan te vullen.",
    autoSend: "Automatisch",
    manualSend: "Handmatig",
    autoHint: "Je antwoord vertrekt na een stilte. Klik om zelf de controle te houden.",
    manualHint: "Klik op „Ik ben klaar” wanneer je klaar bent met spreken.",
    noSpeechSupport: "Je browser zet spraak niet om in tekst (gebruik Chrome, Edge of Safari om te spreken). Je kunt het gesprek toch voeren: jij typt, je gesprekspartner antwoordt hardop.",
    howItWorksRealtime: "Spreek natuurlijk, zoals aan de telefoon: je gesprekspartner antwoordt zodra je klaar bent, en je kunt hem of haar onderbreken. Het gesprek duurt zo lang als een echt gesprek. Je camera wordt tijdens het gesprek opgenomen. Gebruik indien mogelijk een headset of oortjes.",
    connecting: "Verbinden…",
    cameraError: "Camera niet beschikbaar — het gesprek blijft mogelijk, maar wordt niet gefilmd.",
    you: "Jij",
    recording: "Opname",
    speaking: "Spreekt…",
    thinking: "Denkt na…",
    transcribing: "Heeft je gehoord…",
    listening: "Luistert naar je",
    typeInstead: "Je antwoord…",
    mute: "Microfoon uit",
    unmute: "Microfoon aan",
    doneSpeaking: "Ik ben klaar",
    hangUp: "Ophangen",
    transcript: "Transcriptie",
    saving: "Gesprek wordt opgeslagen…",
    ended: "Gesprek beëindigd.",
    endedHint: "Het gesprek is opgeslagen. Je kunt verder.",
  },

  inbox: {
    title: "Inbox",
    titleOwner: "Inbox — {owner}",
    empty: "Geen berichten.",
    progress: "{done}/{total} behandeld",
    backToList: "Alle berichten",
    priorityLabel: "Prioriteit",
    actionLabel: "Actie",
    textRequired: "Schrijf je antwoord of je instructie om dit bericht te behandelen.",
    planLabel: "Hoe je je dag organiseert (optioneel)",
    planPlaceholder: "In welke volgorde je de dingen aanpakt, wat kan wachten, en waarom…",
    channels: {
      email: "E-mail",
      chat: "Intern bericht",
      ticket: "Ticket",
      calendar: "Uitnodiging",
      voicemail: "Voicemail",
    },
    priorities: {
      urgent: "Dringend",
      today: "Vandaag",
      week: "Deze week",
      none: "Geen actie",
    },
    actions: {
      reply: "Antwoorden",
      delegate: "Delegeren",
      schedule: "Inplannen",
      archive: "Archiveren",
    },
    textPlaceholders: {
      reply: "Je antwoord…",
      delegate: "Aan wie, en met welke instructie…",
      schedule: "Wanneer, en wat je van plan bent (optioneel)…",
      archive: "Een notitie, indien nuttig (optioneel)…",
    },
  },

  emailComposer: {
    to: "Aan",
    send: "Versturen",
    newMessage: "Nieuw bericht",
    subject: "Onderwerp",
    bodyPlaceholder: "Schrijf je e-mail…",
    expand: "Venster vergroten",
    collapse: "Venster verkleinen",
    bold: "Vet",
    italic: "Cursief",
    bulletList: "Opsomming",
  },

  cvUpload: {
    title: "Je cv",
    subtitle:
      "Het bedrijf wil je cv graag ontvangen vóór de simulatie. Het wordt alleen gedeeld met het team dat voor deze functie aanwerft.",
    dropzone: "Klik of sleep je cv hierheen",
    constraints: "Alleen pdf · Max 5 MB",
    change: "Ander bestand kiezen",
    uploading: "Bezig met verzenden…",
    notPdf: "Selecteer alleen een pdf-bestand.",
    tooLarge: "Dit bestand is te groot (max 5 MB).",
    uploadError: "Je cv kon niet worden verzonden. Probeer het opnieuw.",
    continue: "Verzenden en beginnen",
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
