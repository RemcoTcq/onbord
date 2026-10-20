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
    titleA: "Werf aan op",
    titleEm: "echte vaardigheden.",
    titleB: "Niet op cv's.",
    lede: "Plak een vacature. Onbord bouwt de simulatie, stuurt ze naar uw kandidaten, en rangschikt hen op wat ze werkelijk deden.",

    // Het venster van het platform (AppPeek.js). Zie de Engelse versie.
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
        { title: "Office manager", meta: "Leuven · Op kantoor", invited: 12, done: 12, date: "24 sep." },
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

  cta: {
    titleA: "Stuur ons één vacature.",
    titleEm: "Wij bouwen",
    titleB: "de simulatie.",
    body: "Eén echte vacature, en u ziet het geheel: de taken, het beoordelingsrooster, en het rapport dat u daarna zou lezen.",
  },
};

export default home;
