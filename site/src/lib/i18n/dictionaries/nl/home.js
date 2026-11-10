// Homepage — Nederlands.
// Zelfde structuur als en/home.js, de referentieversie. Lees daar de inleiding:
// dit is een homepage en geen handleiding, het probleem wordt nooit benoemd, de
// tekst is kort, we zeggen « simulatie », geen kastlijntje, en op deze pagina
// staat geen enkele prijs of credit.

const home = {
  meta: {
    title: "Onbord | Werksimulaties om aan te werven op echte vaardigheden",
    description:
      "Onbord zet elke vacature om in een werksimulatie. Kandidaten doen het echte werk, en u krijgt een vaardigheidsbeoordeling met bewijs achter elke score.",
  },

  hero: {
    // La bulle au-dessus du titre (voir la version anglaise).
    badge: "Gemaakt voor klantgerichte functies",
    // Le titre du 05/11/2026, traduit de l'anglais (« You hire better. They
    // ramp faster. ») : le recrutement, puis l'onboarding.
    titleA: "U werft beter aan.",
    titleEm: "",
    titleB: "Zij draaien sneller mee.",
    lede: "Kandidaten bewijzen hun vaardigheden in het echte werk, nieuwe medewerkers oefenen het vóór hun eerste dag.",

    // Het venster van het platform (AppPeek.js). Zie de Engelse versie.
    // De keuze boven het venster (Vitrine.js). Zie de Engelse versie.
    tabs: { label: "Wat het platform toont", recruitment: "Werving", onboarding: "Onboarding" },
    // Le pop-up « Try it now » (TryModal.js), second bouton du hero. TEXTE
    // PROVISOIRE, à reprendre au copywriting. La promesse des 24 heures est
    // tenue À LA MAIN par l'équipe : ne la raccourcissez pas sans elle.
    try: {
      button: "Test het op uw eigen functie",
      eyebrow: "Testsimulatie",
      title: "Probeer het nu",
      lede: "Stuur ons een functieomschrijving. Wij bouwen de simulatie voor die functie en openen uw privéomgeving.",
      firstName: "Voornaam",
      firstNamePh: "Emma",
      lastName: "Achternaam",
      lastNamePh: "Peeters",
      email: "Zakelijk e-mailadres",
      emailPh: "emma@bedrijf.be",
      file: "Functieomschrijving",
      filePick: "Upload uw functieomschrijving",
      fileHint: "PDF, Word of tekst, maximaal 4 MB",
      fileChange: "Klik om een ander bestand te kiezen",
      submit: "Versturen",
      sending: "Versturen…",
      privacy: "We gebruiken uw gegevens alleen om uw omgeving klaar te zetten.",
      missing: "Vul uw voornaam, achternaam en e-mailadres in.",
      badEmail: "Dit e-mailadres lijkt niet te kloppen.",
      noFile: "Upload uw functieomschrijving.",
      tooBig: "Dit bestand is groter dan 4 MB. Upload een lichter bestand.",
      badType: "Upload een PDF-, Word- of tekstbestand.",
      failed: "Uw aanvraag kon niet worden verstuurd. Mail uw functieomschrijving naar",
      close: "Sluiten",
      doneTitle: "Bedankt, {name}.",
      doneLede: "Binnen 24 uur krijgt u toegang tot uw privéomgeving, met een simulatie op basis van uw functieomschrijving. We schrijven u op {email}.",
      doneClose: "Sluiten",
    },
    app: {
      // Ce que la fenêtre montre, pour un lecteur d'écran (elle y est une image).
      alt: "De recruiterinterface van Onbord: het dashboard, kandidaten gerangschikt op totaalscore, en het rapport van een kandidaat.",
      pct: "{n}%",
      me: "LV",
      nav: {
        search: "Zoeken…",
        menu: "Menu",
        home: "Dashboard",
        jobs: "Jobs",
        recent: "Recente jobs",
        settings: "Instellingen",
      },
      jobs: [
        { title: "Business developer", meta: "Gent · Hybride", invited: 34, done: 21, date: "7 okt." },
        { title: "Customer Success Manager", meta: "Brussel · Vast", invited: 18, done: 11, date: "2 okt." },
        { title: "Klantensupport medewerker", meta: "Leuven · Op kantoor", invited: 12, done: 12, date: "24 sep." },
        { title: "Account executive", meta: "Antwerpen · Hybride", invited: 22, done: 10, date: "19 sep." },
      ],
      job: {
        tabs: ["Kandidaattraject", "Kandidaten", "Context", "Instellingen"],
        chips: ["Gent", "Hybride"],
        open: "Sollicitaties open",
        copy: "Publieke link kopiëren",
      },
      cands: {
        search: "Kandidaat zoeken",
        sort: "Sorteren",
        sortBy: "Hoogste score",
        colCandidate: "Kandidaat",
        colScore: "Totaalscore",
        colStatus: "Status",
        view: "Rapport bekijken",
        subs: ["Afgerond op 14 okt.", "Afgerond op 14 okt.", "Afgerond op 13 okt.", "Afgerond op 12 okt.", "Uitgenodigd op 15 okt."],
      },
      report: {
        candidates: "Kandidaten",
        expand: "Alles openen",
        feedback: "Feedback",
        status: "Status",
        invited: "Uitgenodigd op",
        invitedOn: "9 okt. 2026",
        completed: "Afgerond op",
        completedOn: "13 okt. 2026",
        gdpr: "AVG",
        granted: "Gegeven",
        shortlist: "Shortlisten",
        next: "Naar de volgende stap",
        reject: "Afwijzen",
        score: "Totaalscore",
        scoreSub: "Gewogen gemiddelde volgens uw selectiecriteria.",
        scoreLine: "4 stappen beoordeeld",
        scoreNote: "Het detail per criterium staat in elke stap hieronder.",
        stepType: "E-mail",
        criteria: "Criteria",
        must: "Must-have",
        quote: "“{q}”",
      },
      home: {
        title: "Dashboard",
        newJob: "Nieuwe job",
        hello: "Hallo Laura",
        figures: [
          { label: "Jobs", n: "4", unit: "open" },
          { label: "Kandidaten", n: "86", unit: "in totaal" },
          { label: "Afgerond", n: "54", unit: "simulaties" },
        ],
        yourJobs: "Uw jobs",
        status: "Status",
        open: "Open",
        candidates: "Kandidaten",
        candidatesN: "{n} kandidaten",
        completed: "Afgerond",
        created: "Aangemaakt",
        latest: "Laatste kandidaten",
        activity: "Activiteit deze week",
        week: "Week",
        range: "12 – 18 okt. 2026",
        doneN: "9",
        doneLabel: "simulaties afgerond deze week",
        legendInvited: "Uitgenodigd",
        legendDone: "Afgerond",
        days: ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"],
      },
    },
  },

  truth: {
    lines: [
      "Een cv is wat iemand over zichzelf schreef.",
      "Een gesprek is wat hij zegt onder druk.",
      "Geen van beide is het werk.",
    ],
    lede: "Daarom zet Onbord elke kandidaat twintig minuten in de functie zelf, met tools die zich als de echte gedragen, en toont u precies wat hij ermee deed.",
    cvLabel: "Cv",
    proofLabel: "Wat Onbord toont",
  },

  // Onder de hero (05/11/2026). VOORLOPIGE tekst, zie de Engelse versie.
  figures: {
    statement: "Kies de juiste mensen en help hen sneller hun functie te beheersen, met realistische werksimulaties.",
  },

  // « Two moments that matter » (05/11/2026). Zie de Engelse versie.
  moments: {
    title: "Twee momenten die tellen",
    items: [
      {
        key: "hiring",
        tag: "Werving",
        title: "Zie wie het werk aankan voor u aanwerft.",
        lede: "Kandidaten doen twintig minuten van het echte werk. U krijgt hen gerangschikt op uw criteria, met het bewijs achter elke score.",
        link: "Ontdek werving",
        alt: "De recruiterinterface van Onbord: de kandidaten voor een functie, gerangschikt op totaalscore.",
      },
      {
        key: "onboarding",
        tag: "Onboarding van nieuwe medewerkers",
        title: "Nieuwe medewerkers klaar vóór hun eerste dag.",
        lede: "Ze doorlopen de echte situaties van de functie, module per module, en u ziet waar elk van hen staat voor ze een klant spreken.",
        link: "Ontdek onboarding",
        alt: "Een onboardingtraject in Onbord: een nieuwe account executive doorloopt vijf werksimulaties vóór de eerste werkdag.",
      },
    ],
    onboardingApp: {
      alt: "Een onboardingtraject in Onbord: een nieuwe account executive doorloopt vijf werksimulaties vóór de eerste werkdag.",
      initials: "LM",
      name: "Lucas Martens",
      nav: "Onboarding",
      role: "Account executive",
      starts: "Start op 16 nov.",
      onTrack: "Op schema",
      ready: "Klaar voor dag één",
      progress: "{done} van {total} modules",
      colModule: "Module",
      colScore: "Score",
      colStatus: "Status",
      pct: "{n}%",
      states: { done: "Afgerond", current: "Bezig", todo: "Nog te doen" },
      modules: [
        { kind: "call", title: "Verkennend gesprek met een prospect", format: "Live gesprek", min: "15 min", state: "done", score: "82" },
        { kind: "email", title: "Een prijsbezwaar beantwoorden", format: "E-mail", min: "10 min", state: "done", score: "71" },
        { kind: "inbox", title: "De inbox van maandagochtend sorteren", format: "Inbox", min: "10 min", state: "current" },
        { kind: "document", title: "Een verlengingsvoorstel voorbereiden", format: "Document", min: "15 min", state: "todo" },
        { kind: "chat", title: "Een ontevreden klant kalmeren via chat", format: "Chat", min: "10 min", state: "todo" },
      ],
    },
  },

  flow: {
    title: "Hoe het werkt",
    lede: "Waarvoor u het ook gebruikt, elke simulatie volgt dezelfde drie stappen.",
    steps: [
      {
        key: "build",
        title: "Bouw de simulatie",
        body: "Realistische klantscenario's, gebouwd op uw bedrijf, uw product en uw klanten. Kies de personages, kanalen, moeilijkheid en taal.",
        alt: "Een AI-personage, Daniel Visser, ingesteld voor een videogesprek in het Engels op gemiddelde moeilijkheid, gebouwd op de bedrijfscontext en de vacature.",
      },
      {
        key: "channels",
        title: "Zij voeren het gesprek",
        body: "Uw medewerkers praten met gesimuleerde klanten via chat, e-mail, telefoon of videogesprek, zoals uw team dat elke dag doet, met dezelfde bezwaren, vragen en druk.",
        alt: "De vier kanalen om uit te kiezen, met videogesprek en e-mail allebei geselecteerd voor dezelfde simulatie.",
      },
      {
        key: "evaluate",
        title: "Zie precies hoe ze het deden",
        body: "Elk gesprek wordt beoordeeld op duidelijke checkpoints, met het bewijs achter elk ervan. Zo steunt elke beslissing op wat ze echt deden.",
        alt: "Een beoordeeld videogesprek: 74%, met de gehaalde en gemiste checkpoints, elk met de woorden uit het gesprek die het bewijzen.",
      },
    ],
    persona: {
      tag: "AI-personage",
      name: "Daniel Visser",
      rows: [
        { label: "Kanaal", value: "Videogesprek" },
        { label: "Taal", value: "Engels" },
        { label: "Moeilijkheid", value: "Gemiddeld", level: 2 },
      ],
      builtFrom: "Gebouwd op",
      sources: ["Bedrijfscontext", "Vacature"],
    },
    channels: [
      { key: "video", name: "Videogesprek", on: true },
      { key: "phone", name: "Telefoongesprek" },
      { key: "chat", name: "Chat" },
      { key: "email", name: "E-mail", on: true },
    ],
    report: {
      name: "Lucas Martens",
      pct: "74%",
      criterion: "Brengt de echte behoefte boven",
      critPct: 80,
      checks: [
        { ok: true, text: "Vraagt wie het budget beheert", said: "\u201cWie keurt zo'n tool bij jullie goed?\u201d" },
        { ok: true, text: "Herformuleert het probleem in de woorden van de klant", said: "\u201cDus het probleem is niet de tool, maar dat uw verkopers hun gesprekken niet meer registreren?\u201d" },
        { ok: false, text: "Spreekt een gedateerde volgende stap af", said: "\u201cPrima, ik stuur u wat informatie en we houden contact.\u201d" },
      ],
    },
  },

  compare: {
    eyebrow: "Het verschil",
    titleA: "Twee manieren om zich te",
    titleEm: "vergissen",
    titleB: "in iemand.",
    lede: "Wat meestal bepaalt wie op gesprek komt, en wat dat zou moeten bepalen.",
    cards: [
      {
        ok: false,
        title: "Het cv",
        items: [
          "Beweringen die niemand nakijkt",
          "Een trefwoordmatch, geen vaardigheid",
          "Geschreven om door een filter te raken",
        ],
      },
      {
        ok: false,
        title: "Onderbuikgevoel",
        items: [
          "Een blik, geen lezing",
          "Vlotheid verward met bekwaamheid",
          "Een andere lat voor elke kandidaat",
        ],
      },
      {
        ok: true,
        title: "Een werksimulatie",
        items: [
          "Twintig minuten van de functie zelf",
          "Elke score komt met de zin die haar staaft",
          "Dezelfde criteria, goedgekeurd voor iemand begint",
        ],
      },
    ],
    note: "Onbord komt vóór het sollicitatiegesprek. Dat gesprek begint bij bewijs, niet bij vermoedens.",
  },

  work: {
    eyebrow: "Wat kandidaten doen",
    titleA: "Twintig minuten",
    titleEm: "van het werk.",
    titleB: "Geen vragenlijst.",
    lede: "Ze antwoorden de klant met de goedkopere offerte, voeren het gesprek voor de camera, en lezen de cijfers voor de vergadering van maandag. De AI-assistent staat naast hen open, precies zoals op het werk, en hoe ze hem gebruiken hoort bij het resultaat.",
  },

  how: {
    eyebrow: "Hoe het werkt",
    titleA: "U plakt.",
    titleEm: "Hij bouwt.",
    titleB: "U beslist.",
    lede: "Niets in te stellen, niets te integreren, niets te herschrijven. Wat telt, wacht toch op uw goedkeuring.",
    steps: [
      {
        n: "01",
        title: "Plak de vacature",
        body: "Onbord haalt de vaardigheden eruit die echt tellen. U corrigeert ze en keurt goed, en alles wat volgt wordt op uw versie gebouwd.",
      },
      {
        n: "02",
        title: "Praat het door",
        body: "U praat met de assistent in uw eigen woorden. Hij schrijft de taken, het scenario en het beoordelingsrooster, en u past aan wat u wilt.",
      },
      {
        n: "03",
        title: "Stuur één link",
        body: "Kandidaten doen het werk. U krijgt hen gerangschikt op uw eigen criteria, met de zin achter elk cijfer.",
      },
    ],
    viz: {
      drop: { file: "Business-developer.pdf", size: "142 KB", hint: "Plak de tekst, sleep het bestand, of geef de link." },
      talk: { made: "5 stappen geschreven · ongeveer 20 min" },
      link: { label: "Klaar om te versturen", url: "onbord.be/s/bd-gent", copied: "Gekopieerd" },
    },
    // Le mot qui précède le numéro d'étape sur l'accueil (« Step 1 »).
    stepLabel: "Stap",
    resultTitle: "En dit krijgt u terug.",
    resultBody: "Elke kandidaat die begon, gerangschikt op de criteria die u goedkeurde, met het bewijs op één klik onder elk cijfer. Onbord stelt alleen een shortlist samen: de recruiter neemt altijd de uiteindelijke beslissing.",
  },

  proof: {
    eyebrow: "Elke score, en haar bewijs",
    titleA: "Een cijfer dat u kunt",
    titleEm: "verdedigen",
    titleB: "in de vergadering.",
    lede: "Elke vaardigheid splitst in subdimensies, en elk niveau op elke schaal beschrijft gedrag dat u werkelijk kunt waarnemen. Elke score verwijst naar iets dat de kandidaat werkelijk schreef. Geen samenvatting. Geen gok.",
  },

  answer: {
    titleA: "Iedereen krijgt",
    titleEm: "een antwoord.",
    titleB: "",
    body: "Ook wie u afwijst, in honderdvijftig woorden gebouwd op wat hij werkelijk deed. Stilte is wat een kandidaat van een bedrijf onthoudt, en ze kost u de volgende sollicitatie.",
  },

  // La confiance, à notre façon (09/11/2026, Confiance.js) : quatre
  // engagements, pas de sceau. ⚠️ Règle 2 : chacun est écrit dans les pages
  // légales (données à Paris, pas d'entraînement, décision humaine) ou vrai
  // dans l'application (citations vérifiées, runScoring.js).
  trust: {
    title: "Gebouwd om te vertrouwen",
    lede: "Vier engagementen, vastgelegd in onze voorwaarden en ingebouwd in het product, zodat u AI met vertrouwen inzet bij werving en onboarding.",
    link: "Hoe onze AI werkt",
    items: [
      { key: "eu", title: "Uw gegevens blijven in de EU", body: "Alle gegevens worden opgeslagen in de Europese Unie, op servers in Parijs." },
      { key: "training", title: "Nooit gebruikt om AI te trainen", body: "Niets wat uw kandidaten of uw team in een simulatie zeggen, wordt gebruikt om een AI-model te trainen." },
      { key: "human", title: "Een mens neemt elke beslissing", body: "Onbord beoordeelt en legt uit. Beslissingen over aanwerving en inzetbaarheid blijven altijd bij uw team." },
      { key: "proof", title: "Elke score toont zijn bewijs", body: "Elk checkpoint toont de exacte woorden die het verdienden, rechtstreeks uit het gesprek." },
    ],
  },
  // La FAQ (Faq.js). ⚠️ Le lien de la dernière réponse n'est pas encore
  // branché : voir l'en-tête de Faq.js. Langues : EXPERIENCE_LOCALES de
  // l'application (fr, en, nl).
  faq: {
    title: "Veelgestelde vragen",
    items: [
      { q: "Voor welke functies werkt het?", a: "Klantgerichte functies in B2B SaaS: SDR's, BDR's, account executives, account managers, sales managers, customer success managers en supportteams." },
      { q: "Hoe lang duurt de opstart?", a: "Onbord bouwt in enkele minuten een eerste versie van een simulatie, op basis van uw bedrijfscontext en de functie. U past aan wat u wilt en verstuurt ze. Uw eigen omgeving staat binnen 24 uur klaar." },
      { q: "Welke talen worden ondersteund?", a: "Engels, Frans en Nederlands. Elke simulatie verloopt in één taal, gekozen bij het aanmaken." },
      { q: "Moeten we iets integreren?", a: "Nee. U deelt één link. Niets te installeren, niets te koppelen aan uw huidige tools." },
      { q: "Kunnen we het uitproberen voor we een demo boeken?", a: "Ja. Probeer Onbord in 30 seconden, zonder kredietkaart of verkoopgesprek. ", link: "Probeer een rollenspel" },
    ],
  },
  // L'appel final (Cta, Bits.js) : les boutons sont ceux du hero.
  cta: {
    title: "Hoor uw team aan het werk, vóór uw klanten het doen.",
    body: "Boek een demo, of stuur ons een functieomschrijving en krijg binnen 24 uur toegang tot uw eigen omgeving.",
  },
};

export default home;
