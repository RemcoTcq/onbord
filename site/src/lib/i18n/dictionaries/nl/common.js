// Gedeelde chrome en inhoud van de interfacevoorbeelden — Nederlands.
// Zelfde structuur als en/common.js, de referentieversie.
//
// Aanspreekvorm: « u ». De doelgroep zijn HR-verantwoordelijken en
// zaakvoerders in België; « je » leest hier te los.

const common = {
  nav: {
    how: "Hoe het werkt",
    simulations: "Simulaties",
    scoring: "Beoordeling",
    pricing: "Tarieven",
    demo: "Demo boeken",
    login: "Aanmelden",
    language: "Taal wijzigen",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    skip: "Naar de inhoud",
  },

  footer: {
    tagline: "Werf aan op wat mensen echt kunnen.",
    product: "Product",
    company: "Bedrijf",
    legal: "Juridisch",
    ai: "AI-transparantie",
    terms: "Voorwaarden",
    privacy: "Privacy",
    contact: "Contact",
    rights: "Alle rechten voorbehouden.",
  },

  mocks: {
    scenes: {
      label: "Een kandidaat die een e-mail beantwoordt en een gesprek voor de camera voert",
      more: "…meer",
      meName: "Sarah D.",
      themName: "David M.",
      testsLabel: "tests geslaagd",
      signOff: "Met vriendelijke groeten,",
      codeFile: "leads.js",
      compose: "Nieuw bericht",
      to: "Aan",
      subject: "Onderwerp",
      send: "Versturen",
      fromInitials: "MD",
      fromName: "Marie De Clercq",
      fromRole: "Aankoopverantwoordelijke, Vandelaer NV",
    },

    cv: {
      window: "Sollicitatie 14 minuten geleden binnen",
      initials: "SD",
      name: "Sarah D.",
      role: "Business developer, 4 jaar",
      match: "92 % trefwoordmatch",
      lines: [
        "Uitstekende communicator, vlot met veeleisende klanten",
        "Drie jaar op rij boven het doel",
        "Sterk in CRM bijhouden en pijplijnopvolging",
        "Zelfstandig, nauwkeurig, resultaatgericht",
        "Vlot Engels, echt commercieel gevoel",
      ],
    },

    shortlist: {
      window: "34 kandidaten",
      waiting: "Wacht op reactie",
      rows: [
        { n: "01", initials: "AB", name: "Amine B.", score: "88", state: "Beoordeeld", top: true },
        { n: "02", initials: "TV", name: "Tom V.", score: "70", state: "Beoordeeld", top: true },
        { n: "03", initials: "SD", name: "Sarah D.", score: "67", state: "Beoordeeld", top: false },
        { n: "04", initials: "JM", name: "Julie M.", score: "58", state: "Beoordeeld", top: false },
        { n: "05", initials: "KH", name: "Karim H.", score: "", state: "Uitgenodigd", top: false },
      ],
    },

    // ── Het begin van het traject, aan recruiterzijde ────────────────────────
    skills: {
      window: "Vaardigheden uit uw vacature",
      familyLabel: "Functiefamilie",
      family: "Sales · Business development",
      hardLabel: "Harde vaardigheden",
      softLabel: "Zachte vaardigheden",
      must: "Noodzakelijk",
      nice: "Meegenomen",
      hard: [
        { name: "Prospectie", must: true },
        { name: "Bezwaren opvangen", must: true },
        { name: "Zakelijk schrijven", must: true },
        { name: "CRM bijhouden", must: false },
        { name: "Koud bellen", must: false },
      ],
      soft: [
        { name: "Veerkracht", must: true },
        { name: "Luisteren", must: false },
        { name: "Nauwkeurigheid", must: false },
      ],
    },

    pipeline: {
      window: "Aanwervingspijplijn",
      nodes: [
        { name: "Screeningvragen", meta: "3 vragen · filteren voor iemand er tijd in steekt", on: true },
        { name: "Kandidaatervaring", meta: "5 stappen · ~20 min", on: true },
        { name: "Videogesprek", meta: "Door uw team gevoerd", on: false },
        { name: "Gesprek op kantoor", meta: "Door uw team gevoerd", on: false },
      ],
    },

    chat: {
      window: "De ervaring afbakenen",
      msgMe: "Onze mensen verkopen aan aankoopverantwoordelijken, niet aan oprichters. En haal het koude bellen eruit, hier gaat alles per e-mail.",
      msgAi: "Gebeurd. Stap 2 heeft nu een aankoopverantwoordelijke die tegenpruttelt over levertermijnen, en het gesprek is vervangen door een opvolgmail na een stille week.",
      changedLabel: "Gewijzigd",
      changed: "Stap 2 herschreven · stap 4 vervangen · beoordelingsrooster bijgewerkt",
    },


    score: {
      skill: "Een prijsbezwaar behandelen",
      score: "3,7",
      outOf: "/5",
      dims: [
        {
          name: "Het verschil benoemen",
          pct: 75,
          quote:
            "Ik begrijp het, op die volumes is 8 % verschil met uw huidige leverancier geen klein bedrag.",
          why: "Herformuleert het bezwaar in de woorden van de klant vóór hij antwoordt.",
        },
        {
          name: "Een uitweg voorstellen",
          pct: 50,
          quote: "Kunnen we kijken naar een engagement van twaalf maanden? Dat verandert de eenheidsprijs.",
          why: "Biedt een concrete hefboom, maar gaat nooit na of ze de klant past.",
        },
        {
          name: "Houding onder druk",
          pct: 75,
          quote: "U hebt gelijk om hierop door te duwen.",
          why: "Blijft warm zonder inhoudelijk toe te geven.",
        },
      ],
    },

    aiUsage: {
      window: "Kandidaatrapport · AI-gebruik",
      msgMe: "Hoe antwoord ik op een prijsbezwaar als ik niet met de prijs kan zakken?",
      msgAi:
        "Benoem het bezwaar in plaats van eromheen te gaan, en verleg het gesprek naar wat de prijs koopt: levertermijnen, voorraadgarantie, de kost van een gemiste levering.",
      ai: {
        name: "AI-gebruik",
        pct: 78,
        why: "78 %, omdat de kandidaat een gerichte vraag stelt in plaats van de context te plakken, het voorstel herschrijft in eigen woorden, en een zin schrapt die hier niet relevant is.",
      },
    },

    email: {
      briefLabel: "Context",
      brief:
        "Concurrerende offerte, 8 % goedkoper, antwoord vandaag verwacht. U kunt bewegen op betaaltermijnen, niet op de eenheidsprijs.",
      subject: "Onderwerp",
      subjectValue: "Re: Offerte 2291 · uw feedback",
      body:
        "Geachte mevrouw De Clercq,\n\nDank om zo snel terug te koppelen, en om open te zijn over de andere offerte. Op uw volumes is 8 % geen klein bedrag, en ik ga niet doen alsof.",
      assistant: "AI-assistent",
      msgMe: "Hoe antwoord ik op een prijsbezwaar als ik niet met de prijs kan zakken?",
      msgAi:
        "Benoem het bezwaar in plaats van eromheen te gaan, en verleg het gesprek naar wat de prijs koopt: levertermijnen, voorraadgarantie, de kost van een gemiste levering.",
    },

    crm: {
      sourceLabel: "Bron",
      source: "Voicemail, 48 seconden + doorgestuurde e-mailketen",
      rows: [
        { k: "Bedrijf", v: "Vandelaer NV", ok: true },
        { k: "Contact", v: "Marie De Clercq", ok: true },
        { k: "Budget", v: "€ 40–45k", ok: true },
        { k: "Deadline", v: "Eind Q3", ok: false, expected: "Vóór 30 juni" },
      ],
      flagLabel: "Tegenstrijdigheid in de briefing",
      flag:
        "De e-mail zegt Q3. De voicemail zegt « vóór eind juni ». Niemand heeft de kandidaat gezegd ernaar te zoeken.",
      missed: "Gemist",
    },

    code: {
      task: "Dubbele leads op e-mailadres verwijderen, de eerste behouden.",
      tests: [
        { name: "verwijdert een herhaald e-mailadres", ok: true },
        { name: "behoudt leads met verschillende e-mailadressen", ok: true },
        { name: "negeert hoofdletters in het e-mailadres", ok: true },
        { name: "5 000 leads onder 200 ms", ok: false, verdict: "tijd overschreden" },
      ],
    },

    live: {
      who: "David M. · aan de lijn",
      line:
        "Eerlijk? Wij zijn tevreden met onze huidige leverancier. Wat zou ons zelfs maar doen instemmen met een afspraak?",
      instruction: "Antwoord nu, hardop, alsof u daar aan de lijn hangt.",
      time: "00:34",
      recording: "Opname",
    },

    gen: {
      window: "De simulatie wordt gebouwd",
      lines: [
        { text: "De vacature lezen", t: "0:04", state: "done" },
        { text: "Vaardigheden extraheren · 9 gevonden, 6 behouden", t: "0:21", state: "done" },
        { text: "Het CRM-scenario bouwen", t: "1:48", state: "done" },
        {
          text: "Het ontwerp naast de vacature herlezen",
          t: "2:15",
          state: "now",
          note: "Stap 3 zou op elke commerciële vacature passen. Wordt herschreven rond partnerwerving.",
        },
        { text: "Herschrijving, ronde 2 van 2", t: "", state: "todo" },
      ],
    },
    // Geschreven feedback aan een niet-weerhouden kandidaat.
    feedback: {
      window: "Feedback naar een kandidaat",
      tabs: [
        {
          id: "next",
          label: "Weerhouden",
          tag: "Verstuurd · uitgenodigd voor gesprek",
          body: [
            "Hallo Amine,",
            "We zouden u graag ontmoeten. Dit viel op, zodat u weet waar we op zullen doorgaan.",
            "In de e-mail aan mevrouw De Clercq benoemde u het echte cijfer, de 8 % verschil, voordat u de offerte verdedigde. De meeste kandidaten beginnen met een verontschuldiging.",
            "Eén punt waarop we terugkomen: de leverdatum die u haar beloofde, staat nergens schriftelijk bevestigd.",
          ],
        },
        {
          id: "no",
          label: "Niet weerhouden",
          tag: "Verstuurd · niet weerhouden",
          body: [
            "Hallo Sarah,",
            "We gaan niet verder met uw kandidatuur, en hier is waarom, in plaats van stilte.",
            "Uw antwoord op het prijsbezwaar was een van de helderste die we kregen: u benoemde de 8 % in plaats van eromheen te praten. Het verschil zat in wat daarna kwam, u stelde een engagement van twaalf maanden voor zonder na te gaan of ze dat konden tekenen.",
            "Voor deze functie is die controle het grootste deel van het werk.",
          ],
        },
      ],
    },

    grid: {
      dim: "Tegenstrijdige informatie opmerken",
      levels: [
        {
          n: "1",
          pct: 0,
          label: "Onvoldoende",
          text: "Noteert beide waarden zonder te zien dat ze elkaar tegenspreken, bv. schrijft « Q3 » en laat de notitie leeg.",
        },
        {
          n: "3",
          pct: 50,
          label: "Zoals verwacht",
          text: "Merkt het conflict op en houdt de betrouwbaarste bron aan, bv. « Eind juni (volgens voicemail). »",
        },
        {
          n: "5",
          pct: 100,
          label: "Uitstekend",
          text: "Merkt het op, houdt de veiligste datum aan en signaleert het, bv. « Data spreken elkaar tegen, bevestigen bij Marie vóór we offreren. »",
        },
      ],
    },
  },
};

export default common;
