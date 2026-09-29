// De vier binnenpagina's — Nederlands.
// Zelfde structuur als en/pages.js, de referentieversie: één blok = één korte
// alinea, en niets dat aan applicatiezijde niet waar is.

const pages = {
  how: {
    meta: {
      title: "Hoe Onbord werkt: van uw account tot een gerangschikte shortlist",
      description:
        "Acht stappen: het bedrijfsprofiel, de vacature, de vaardigheden, de pijplijn, de screeningvragen, de simulatie, uw goedkeuring, de shortlist.",
    },
    eyebrow: "Hoe het werkt",
    titleA: "Van uw account tot een",
    titleEm: "gerangschikte shortlist,",
    titleB: "in acht stappen.",
    lede: "Niets te installeren, niets in te stellen. De helft van de stappen is van u, en niets bereikt een kandidaat voor u het hebt goedgekeurd.",

    steps: [
      {
        n: "01",
        visual: "profile",
        title: "Uw bedrijf, gelezen van uw eigen website.",
        body: "U maakt uw account aan en geeft het adres van uw website. Onbord leest ze en vult uw profiel in: wat u verkoopt, aan wie, in welke toon. Alles wat daarna gebouwd wordt, steunt daarop, zodat u uw vak nooit twee keer hoeft uit te leggen.",
      },
      {
        n: "02",
        visual: "import",
        title: "Uw vacature, in de vorm die u hebt.",
        body: "Plak de tekst, sleep de PDF, of geef de link naar de online advertentie. Onbord leest ze en neemt het over. Niets hoeft herschreven te worden om hem te plezieren.",
      },
      {
        n: "03",
        visual: "skills",
        title: "De vaardigheden, elk met de zin waar ze vandaan komt.",
        body: "Onbord haalt de vaardigheden eruit en citeert de exacte regel van de vacature achter elk ervan, zodat u kunt nakijken in plaats van vertrouwen. Hij leest ook de functiefamilie en het niveau, want een simulatie voor een manager is niet dezelfde oefening als voor een individuele medewerker. Elke vaardigheid komt aangeduid als noodzakelijk of meegenomen, en u corrigeert die sortering: het noodzakelijke is wat de simulatie echt test, het meegenomene komt er lichter aan bod.",
      },
      {
        n: "04",
        visual: "pipeline",
        title: "Een aanwervingspijplijn, samengesteld voor deze functie.",
        body: "Eerst de screeningvragen, dan de kandidaatervaring. De gesprekken die u al voert, staan er ook in, zodat het hele traject op één plek zit, ook de stappen die Onbord niet voor u overneemt.",
      },
      {
        n: "05",
        visual: "questions",
        title: "De screeningvragen zijn al geschreven.",
        body: "Een rijbewijs, een arbeidskaart, een taal: wat afvalt voor iemand er tijd in steekt. Ze komen geschreven voor deze functie, en u past ze aan, voegt de uwe toe, of schrapt wat u niet nodig hebt.",
      },
      {
        n: "06",
        visual: "chat",
        title: "U beschrijft de simulatie. Hij schrijft ze.",
        body: "U vertelt de assistent hoe de functie er werkelijk uitziet, in uw eigen woorden. Hij stelt twee of drie vragen en schrijft dan het geheel: de taken, het scenario, en het beoordelingsrooster erachter. Alles wat hij maakte, kan herschreven, opnieuw gegenereerd of geschrapt worden.",
      },
      {
        n: "07",
        visual: "ready",
        title: "U keurt goed, en ze is klaar voor kandidaten.",
        body: "Niets wordt gepubliceerd op de keuze van het model alleen. U leest de simulatie en het rooster waarmee beoordeeld wordt, u keurt goed, en de ervaring is klaar om naar de mensen te gaan die u wilt beoordelen.",
      },
      {
        n: "08",
        visual: "shortlist",
        title: "Zij leggen ze af. U krijgt een gerangschikte lijst.",
        body: "Kandidaten worden beoordeeld op de criteria die u goedkeurde, en op niets anders. Elke score draagt de eigen zin van de kandidaat eronder, getoetst aan wat hij indiende. Op het einde een lijst die u regel voor regel kunt verdedigen.",
        more: "Hoe de beoordeling werkt",
        moreTo: "/scoring",
      },
    ],

    viz: {
      profile: {
        tag: "Bedrijfsprofiel",
        url: "uw-bedrijf.be",
        rows: [
          { k: "Sector", v: "Industriële distributie" },
          { k: "Verkoopt aan", v: "Aankoopafdelingen" },
          { k: "Toon", v: "Direct, feitelijk" },
        ],
      },
      import: {
        tag: "Nieuwe vacature",
        options: ["De tekst plakken", "PDF- of Word-bestand", "Link naar de advertentie"],
      },
      skills: {
        tag: "Vaardigheden eruit gehaald",
        mustLabel: "Noodzakelijk",
        niceLabel: "Meegenomen",
        must: ["Bezwaren opvangen", "Prospectie"],
        nice: ["CRM bijhouden", "Koud bellen"],
        evidence: "« U vangt dagelijks prijsbezwaren van aankoopverantwoordelijken op. »",
      },
      questions: {
        tag: "Screeningvragen",
        rows: [
          { q: "Hebt u een geldig rijbewijs?", a: "Ja" },
          { q: "Hebt u een arbeidskaart nodig?", a: "Neen" },
        ],
      },
      chat: {
        tag: "De simulatie afbakenen",
        msg: "Onze mensen verkopen aan aankoopverantwoordelijken, niet aan oprichters.",
        result: "5 stappen geschreven · ongeveer 20 minuten",
      },
      ready: {
        tag: "Klaar",
        title: "Door u goedgekeurd",
        sub: "Taken, scenario en beoordelingsrooster",
        invite: "Klaar voor uw kandidaten",
      },
    },

    closing: {
      title: "Dat is het hele verhaal.",
      body: "Geen implementatietraject, geen configuratieworkshop. Een account, een vacature, en een shortlist op het einde.",
      cta: "Demo boeken",
    },
  },

  sims: {
    meta: {
      title: "De simulaties: wat een kandidaat echt doet in Onbord",
      description:
        "Vier vaardigheden, gevormd zoals uw functie het vraagt: schrijven, spreken, code uitvoeren, een fiche invullen. Geen vaste catalogus van oefeningen.",
    },
    eyebrow: "Simulaties",
    titleA: "Vier dingen die een kandidaat",
    titleEm: "werkelijk voortbrengt.",
    titleB: "",
    lede: "Onbord heeft geen catalogus van oefeningen. Het heeft vier manieren om vast te leggen wat iemand deed, gevormd zoals uw functie het vraagt.",

    // Les quatre GESTES. Chaque carte a une ICÔNE ABSTRAITE (GestureIcon,
    // par `id`), un nom, et UNE phrase — pas de maquette, pas de deuxième
    // paragraphe. Voir la règle 4 ter du guide : l'icône montre le geste, pas
    // un exemple précis, pour que la carte dise « on peut écrire » et non
    // « voici cet e-mail ».
    families: [
      { id: "write", name: "Schrijven", measures: "Schrijven, oordeel, commercieel gevoel, toon", body: "Een antwoord, een nota, een memo: wat de functie schrijft, met de AI-assistent ernaast precies zoals op het werk." },
      { id: "speak", name: "Spreken", measures: "Spreken, présence, denken op je voeten", body: "Een bezwaar, een update, een antwoord onder druk: hardop, voor de camera, in één opname." },
      { id: "run", name: "Code", measures: "Correctheid, probleemoplossing, debuggen", body: "Echte code, echte tests: de kandidaat schrijft, voert uit, corrigeert tot het lukt. Nooit ergens uitgerold." },
      { id: "file", name: "Fiches", measures: "Nauwkeurigheid, oog voor detail, notities nemen", body: "Rommelige informatie erin, de juiste fiche eruit, in het systeem dat de functie werkelijk gebruikt." },
    ],

    // Epiloog van de pagina, GEEN vijfde gebaar: geen enkele maquette toont het.
    // Zie regel 4 ter van de gids: een richting, nooit een datum of een
    // geleverde functie. `tag` leeft op ELK item, niet op het hele blok.
    next: {
      kicker: "Wat erbij komt",
      title: "Waar we naartoe gaan.",
      lede: "Een deel is al bezig. De rest is een richting, nooit een datum.",
      items: [
        {
          tag: "Bezig",
          title: "Een echt gesprek, geen enkele opname",
          body: "We bouwen een assistent die in real time reageert, beurt na beurt: vandaag een één-op-één gesprek of rollenspel, straks een situatieoefening, een dossier dat live besproken wordt, of een volledig overleg met meerdere mensen in de kamer.",
        },
        {
          tag: "In de maak",
          title: "Wat eerst telt",
          body: "Een rommelige rij tickets of leads om op urgentie te sorteren, getoetst aan de volgorde die ze werkelijk verdient.",
        },
        {
          tag: "In de maak",
          title: "Een cijfer lezen",
          body: "Een kleine, onvolmaakte dataset, en een beslissing of een ingevuld antwoord aan het einde.",
        },
      ],
    },

    rules: {
      kicker: "De regels achter dit alles",
      title: "Wat de generator niet mag doen.",
      items: [
        {
          title: "Geen retrospectieve zelfrapportage",
          body: "« Vertel eens over een keer dat… » is verboden. Wat een kandidaat nu doet, niet wat hij zegt ooit gedaan te hebben.",
        },
        {
          title: "Geen generieke versie van de functie",
          body: "Een stap die even goed bij eender welke andere vacature met dezelfde titel zou passen, wordt herschreven.",
        },
        {
          title: "AI beschikbaar op minstens twee taken",
          body: "Meer dan één meetpunt over hoe hij met een model werkt. U kunt het overal uitschakelen.",
        },
        {
          title: "Gedragsmatige niveaus, met voorbeelden",
          body: "Elk niveau beschrijft waarneembaar gedrag en geeft een voorbeeld. « Goede kwaliteit » wordt geweigerd als niveau.",
        },
      ],
    },

    closing: {
      title: "Welke u krijgt, hangt af van de functie.",
      body: "Een buitendienstcommercieel en een backoffice-analist krijgen niet dezelfde simulatie. Stuur ons een vacature en zie.",
      cta: "Demo boeken",
    },
  },

  scoring: {
    meta: {
      title: "Beoordeling: hoe Onbord een antwoord omzet in een verdedigbaar cijfer",
      description:
        "Subdimensies, gedragsmatige schalen, geverifieerde citaten, deterministische correctie waar het kan, en een gemeten kijk op hoe kandidaten AI gebruikten.",
    },
    eyebrow: "Beoordeling",
    titleA: "Een cijfer dat u kunt",
    titleEm: "verdedigen",
    titleB: "in de vergadering.",
    lede: "Wanneer iemand vraagt waarom deze kandidaat boven die andere staat, is het antwoord een zin die de kandidaat zelf schreef.",

    blocks: [
      {
        index: "01",
        kicker: "Structuur",
        title: "Een vaardigheid is te groot om te scoren. Een subdimensie niet.",
        body: [
          "« Teamwork » zet je niet op vijf punten. Elke vaardigheid wordt opgesplitst in twee of drie subdimensies, en elke subdimensie krijgt drie niveaus: 1 onvoldoende, 3 zoals verwacht, 5 uitstekend, waarbij elk niveau zichtbaar gedrag beschrijft met een geschreven voorbeeld. Vage niveaus worden bij de generatie geweigerd.",
        ],
      },
      {
        index: "02",
        kicker: "Het bewijs",
        title: "Niets wordt beweerd zonder citaat.",
        body: [
          "Elke score komt met een motivering en een letterlijk fragment, en dat fragment wordt getoetst aan de werkelijk ingediende tekst. Wat er geen echt fragment van is, verdwijnt voor u het rapport ziet.",
        ],
      },
      {
        index: "03",
        kicker: "Determinisme",
        title: "Wat zonder model kan worden nagekeken, wordt zonder model nagekeken.",
        body: [
          "Drie delen van een simulatie komen nooit bij een taalmodel terecht: een meerkeuzevraag tegenover de juiste index, code door de tests uit te voeren, een CRM-veld tekenreeks per tekenreeks vergeleken. Het oordeel blijft voor wat er een vraagt: tekst, redenering, toon, de kwaliteit van een beslissing.",
        ],
      },
      {
        index: "04",
        kicker: "AI",
        title: "Hoe ze het model gebruikten, hoort bij het resultaat.",
        body: [
          "Het volledige gesprek met de assistent wordt bewaard en gelezen, en de kandidaat wordt daarover ingelicht vóór hij begint. Het gebruik zelf wordt niet beoordeeld — hoe het gebeurt wel: het probleem kaderen, de reactie bijsturen, kritisch kijken naar wat terugkomt.",
          "Apart daarvan: komt een stuk van een antwoord woordelijk uit de assistent, dan wordt de score van DAT antwoord geplafonneerd en noemt het rapport het percentage. Beoordeeld blijft wat de kandidaat zelf voortbracht.",
        ],
      },
      {
        index: "05",
        kicker: "De beslissing",
        title: "De machine rangschikt. Een mens beslist.",
        body: [
          "Geen enkele kandidaat wordt ooit automatisch afgewezen door Onbord. Onbord stelt alleen een shortlist samen: de recruiter neemt altijd de uiteindelijke beslissing. Eruit komt een rangschikking met haar bewijs, en wie op gesprek komt, beslist u. De criteria waren de uwe vóór de eerste kandidaat ze zag, en elke kandidaat kan om een menselijke herbeoordeling vragen.",
        ],
      },
      {
        index: "06",
        kicker: "Daarna",
        title: "De afgewezen kandidaat krijgt een echt antwoord.",
        body: [
          "Omdat het bewijs bestaat, kost feedback niets extra: 120 tot 180 woorden die één of twee echte sterktes noemen en wat voor deze functie het verschil maakte. Zijn de gegevens te dun om iets waars te zeggen, dan wordt er niets verzonnen, het systeem meldt dat.",
        ],
      },
    ],

    closing: {
      title: "Vraag om een echt rapport te zien.",
      body: "Geen slide over rapporten: een echt rapport, op een echte vacature. De snelste manier om te beoordelen of dit alles klopt.",
      cta: "Demo boeken",
    },
  },

  pricing: {
    meta: {
      title: "Tarieven: Onbord",
      description:
        "Twee plannen, credits die aan vier dingen worden besteed, en de rekensom in de open lucht. Core vanaf € 85 per maand, jaarlijks gefactureerd.",
    },
    eyebrow: "Tarieven",
    titleA: "Heldere tarieven",
    titleEm: "",
    titleB: "",
    lede: "Credits worden aan vier dingen besteed. Al de rest is onbeperkt en gratis.",

    annual: "Jaarlijks",
    monthly: "Maandelijks",
    perMonth: "/maand",
    billedAnnually: "jaarlijks gefactureerd",
    billedMonthly: "maandelijks gefactureerd",
    save: "15 % voordeel",
    popular: "Meest gekozen",
    creditsPerMonth: "credits per maand",
    rollover: "Ongebruikte credits schuiven door",
    onQuote: "Op offerte",
    tailored: "Volume op maat",

    plans: {
      core: {
        name: "Core",
        for: "Voor een team dat regelmatig aanwerft.",
        features: [
          "Automatische extractie van vaardigheden uit elke vacature",
          "Door AI gegenereerde werksimulaties",
          "Beoordeling op bewijs, met geverifieerde citaten",
          "Uw logo, kleur en toon aan kandidaatzijde",
          "Video- en situatieoefeningen",
          "Ondersteuning via e-mail",
        ],
        cta: "Kies Core",
      },
      pro: {
        name: "Pro",
        for: "Voor doorlopende aanwerving over meerdere functies.",
        includes: "Alles uit Core, plus:",
        features: [
          "Automatische e-mails aan kandidaten",
          "Eigen Slack-kanaal",
          "Prioritaire ondersteuning",
        ],
        cta: "Kies Pro",
      },
      custom: {
        name: "Op maat",
        for: "Voor hoge volumes, of bijzondere beperkingen.",
        includes: "Alles uit Pro, plus:",
        features: [
          "Volume geprijsd op uw cijfers",
          "Eigen accountmanager",
          "Opstart samen met uw team",
        ],
        cta: "Praat met sales",
      },
    },

    credits: {
      kicker: "De creditstabel",
      title: "Vier dingen kosten credits.",
      lede: "Dat is de volledige lijst. Zelf aanpassen, publiceren, uitnodigen, rapporten bekijken en feedback versturen kosten niets.",
      rows: [
        {
          what: "Een simulatie genereren",
          cost: "6",
          when: "Afgeboekt wanneer de agent de simulatie heeft aangemaakt: de eerste keer, en bij elke volledige hergeneratie.",
          detail:
            "Een generatie die mislukt, kost niets. De analyse van de vacature, de keuze van de vaardigheden, uw aanpassingen en de publicatie zijn inbegrepen.",
        },
        {
          what: "Eén stap hergenereren",
          cost: "1",
          when: "Afgeboekt voor elke stap die de agent herschrijft.",
          detail:
            "Om één stap bij te werken zonder het hele traject opnieuw te doen. Zelf aanpassen kost niets.",
        },
        {
          what: "Een kandidaat start",
          cost: "1",
          when: "Afgeboekt wanneer hij werkelijk aan de simulatie begint.",
          detail:
            "Een uitgenodigde kandidaat die nooit begint, kost niets. Eén keer per kandidaat, nooit twee keer.",
        },
        {
          what: "Een kandidaat wordt beoordeeld",
          cost: "2",
          when: "Afgeboekt bij indiening, wanneer de correctie loopt.",
          detail:
            "Nooit opnieuw afgeboekt, ook niet als u het rapport heropent.",
        },
      ],
      totalLabel: "Eén kandidaat, van begin tot eind",
      totalValue: "3 credits",
    },

    maths: {
      kicker: "Wat dat oplevert",
      title: "Dezelfde rekensom die u zelf zou maken.",
      lede: "Geen « tot X kandidaten » met het rekenwerk verstopt. Hier staat het.",
      jobsLabel: "aangemaakte simulaties",
      resultLabel: "beoordeelde kandidaten",
      note: "Het punt is dat u deze tabel zelf kunt maken vóór u tekent, en ze achteraf kunt nakijken.",
      assumption: "Deze tabel gaat ervan uit dat elke uitgenodigde kandidaat tot het einde gaat. In de praktijk haken sommigen af: dan reiken uw credits verder, nooit minder ver.",
    },

    faq: {
      kicker: "Voor u het vraagt",
      items: [
        {
          q: "Gaan ongebruikte credits verloren?",
          a: "Nee, op een jaarplan. Wat u in een maand niet gebruikt, komt bij de volgende: gebruik in juni 200 van de 500 credits van Pro, en juli start met 800. Het saldo begint opnieuw bij de jaarlijkse verlenging.",
        },
        {
          q: "Is er een gratis proefversie?",
          a: "Beter: stuur ons een echte vacature. Wij bouwen de simulatie en tonen u het geheel, wat een kandidaat doorloopt, en wat u daarna zou lezen.",
        },
        {
          q: "Kunnen kandidaten in een andere taal beoordeeld worden dan de onze?",
          a: "Ja. De kandidaatervaring volgt de taal van de vacature, Nederlands, Frans of Engels, los van de taal die uw team in de applicatie gebruikt.",
        },
        {
          q: "Rekent u per gebruiker aan?",
          a: "Neen. Accounts worden niet geteld, en collega's die kandidaten nalezen kosten niets.",
        },
      ],
    },

    closing: {
      title: "Het snelst blijft: stuur een vacature.",
      body: "U ziet de simulatie, het rooster en een echt rapport vóór er over geld gesproken wordt.",
      cta: "Demo boeken",
    },
  },

  // La page /demo : coordonnees d'abord, calendrier ensuite (DemoForm.js).
  demo: {
    meta: {
      title: "Demo boeken: Onbord",
      description: "Laat uw gegevens achter en kies een moment. We tonen u een echte simulatie, gebouwd op een van uw vacatures."
    },
    eyebrow: "30 seconden",
    title: "Boek een demo.",
    lede: "Zeg ons wie u bent en kies daarna een moment dat u past.",
    firstName: "Voornaam",
    lastName: "Achternaam",
    company: "Bedrijf",
    email: "Zakelijk e-mailadres",
    firstNamePh: "Lotte",
    lastNamePh: "Peeters",
    companyPh: "Acme NV",
    emailPh: "lotte@acme.be",
    submit: "Kies een moment",
    sending: "Even geduld",
    missing: "Vul alle velden in.",
    badEmail: "Geef een geldig e-mailadres op.",
    privacy: "We gebruiken deze gegevens alleen om uw demo voor te bereiden.",
    pickEyebrow: "Stap 2 van 2",
    pickTitle: "Kies een moment.",
    pickLede: "Bedankt, {name}. Kies een moment, de bevestiging gaat naar {email}.",
    edit: "Mijn gegevens aanpassen"
  },
};

export default pages;
