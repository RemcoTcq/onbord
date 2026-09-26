// Homepage — Nederlands.
// Zelfde structuur als en/home.js, de referentieversie. Lees daar de inleiding:
// dit is een homepage en geen handleiding, het probleem wordt nooit benoemd, de
// tekst is kort, we zeggen « simulatie », geen kastlijntje, en op deze pagina
// staat geen enkele prijs of credit.

const home = {
  meta: {
    title: "Onbord — Werf aan op echte vaardigheden. Niet op cv's.",
    description:
      "Plak een vacature. Onbord maakt er een werksimulatie van, stuurt ze naar uw kandidaten en rangschikt hen op wat ze werkelijk deden, met het bewijs achter elk cijfer.",
  },

  hero: {
    titleA: "Werf aan op",
    titleEm: "echte vaardigheden.",
    titleB: "Niet op cv's.",
    lede: "Plak een vacature. Onbord bouwt de simulatie, stuurt ze naar uw kandidaten, en rangschikt hen op wat ze werkelijk deden.",
    primary: "Demo boeken",

    peek: {
      job: "Business developer",
      experience: "Kandidaatervaring",
      duration: "~20 min",
      writing: "schrijven",
      steps: [
        { name: "Een prijsbezwaar beantwoorden", format: "E-mail", min: "6 min" },
        { name: "Het gesprek voor de camera voeren", format: "Live", min: "5 min" },
        { name: "De fiche invullen", format: "CRM", min: "4 min" },
        { name: "Een lijst dubbele leads opschonen", format: "Code", min: "" },
      ],
    },

    play: {
      label: "Beschrijf de functie die u wilt invullen",
      placeholders: [
        "Ik wil een simulatie voor een business developer",
        "Ik wil een simulatie om te testen of iemand in Python kan coderen",
        "Ik wil een simulatie voor een office manager",
      ],
      send: "Bouw de simulatie",
    steps: [
        "De functie begrijpen",
        "De vaardigheden kiezen die tellen",
        "De simulatie bouwen",
        "Het beoordelingsrooster schrijven",
        "Nalezen",
      ],
      done: {
        title: "Daar begint de echte.",
        body: "Stuur ons de vacature en wij bouwen ze echt, met haar taken en haar beoordelingsrooster. U ziet het geheel vóór de eerste kandidaat.",
        primary: "Stuur ons dit",
        secondary: "Iemand spreken",
        again: "Een andere functie proberen",
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
    lede: "Ze antwoorden de klant met de goedkopere offerte, voeren het gesprek voor de camera, en lossen de bug op voor hij live gaat. De AI-assistent staat naast hen open, precies zoals op het werk, en hoe ze hem gebruiken hoort bij het resultaat.",
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
    primary: "Demo boeken",
  },
};

export default home;
