// De drie « Solutions »-pagina's. Zie en/solutions.js (referentietaal) voor
// de regels en wat nog niet in de applicatie bestaat.

const solutions = {
  faqTitle: "Veelgestelde vragen",

  hiring: {
    meta: {
      title: "Werven met klantsimulaties | Onbord",
      description: "Werf sales-, customer success- en supportmedewerkers op wat ze echt doen met een klant: realistische simulaties, duidelijke scorekaarten en feedback voor elke kandidaat.",
    },
    tag: "Werving",
    title: "Werf slimmer, sneller.",
    lede: "Onbord gebruikt realistische klantsimulaties en duidelijke scorekaarten om u te helpen de juiste mensen te vinden voor sales, customer success en support, zonder op uw buikgevoel te vertrouwen.",
    blocks: [
      {
        key: "simulations",
        title: "Realistische klantsimulaties",
        body: "Zie hoe kandidaten met klanten omgaan voordat u ze aanwerft. Ze chatten, mailen, bellen of videobellen met een gesimuleerde klant, gebouwd op uw vacature en uw bedrijf.",
        visual: "conversation",
        alt: "Een kandidaat in een chat met Daniel Visser, een gesimuleerde klant die de prijs in vraag stelt.",
      },
      {
        key: "scorecards",
        title: "Scorekaarten die u kunt vertrouwen",
        body: "Elke kandidaat wordt beoordeeld op duidelijke checkpoints die u goedkeurt. Elke score toont de exacte woorden erachter.",
        visual: "report",
        alt: "Een opengeklapt criterium: elk checkpoint gehaald of gemist, met de woorden van de kandidaat eronder.",
      },
      {
        key: "ranking",
        title: "Vind snel uw beste kandidaten",
        body: "Kandidaten worden gerangschikt op dezelfde situaties, dus u vergelijkt appels met appels. Zet de beste met één klik op de shortlist.",
        visual: "cands",
        alt: "De kandidaten voor een vacature, gerangschikt op totaalscore.",
      },
      {
        key: "feedback",
        title: "Feedback voor elke kandidaat",
        body: "Elke kandidaat krijgt een persoonlijk antwoord, gebaseerd op wat hij of zij echt deed. Pas het aan en verstuur het in twee klikken.",
        visual: "feedback",
        alt: "De feedbackmail aan een kandidate, die citeert wat ze in de simulatie deed.",
      },
    ],
    faq: [
      { q: "Kan de simulatie aansluiten bij onze functies en processen?", a: "Ja. Elke simulatie wordt gebouwd op uw vacature en uw bedrijf: de klant praat zoals de uwe en de situaties volgen uw proces. U leest elke stap na voordat u ze verstuurt." },
      { q: "Hoe lang duurt een simulatie voor een kandidaat?", a: "Ongeveer twintig minuten. U ziet de duur voordat u ze verstuurt, en kandidaten doen ze via één link, wanneer het hen past." },
      { q: "Welke talen ondersteunt Onbord?", a: "Engels, Frans en Nederlands. Elke simulatie verloopt in één taal, gekozen bij het aanmaken." },
      { q: "Weten kandidaten dat ze met AI praten?", a: "Ja. Voor ze beginnen, aanvaarden kandidaten dat AI hun antwoorden analyseert, en dat een persoon in uw bedrijf de eindbeslissing neemt." },
      { q: "Moeten we iets integreren?", a: "Nee. U deelt één link. Niets te installeren, niets te koppelen aan uw huidige tools." },
    ],
    cta: "Klaar om te zien wie de job echt aankan?",
  },

  onboarding: {
    meta: {
      title: "Onboarding van nieuwe medewerkers met klantsimulaties | Onbord",
      description: "Maak nieuwe sales-, customer success- en supportmedewerkers sneller klaar: oefenmodules gebouwd op uw bedrijf, duidelijke feedback, en één plek om te zien wie klaar is.",
    },
    tag: "Onboarding van nieuwe medewerkers",
    title: "Maak nieuwe medewerkers sneller klaar.",
    lede: "Onbord maakt van uw pitch deck en bedrijfskennis realistische oefening: nieuwe medewerkers voeren echte klantgesprekken voordat ze een echte klant ontmoeten.",
    blocks: [
      {
        key: "practice",
        title: "Oefenen vanaf dag één",
        body: "Verkort de leercurve. Nieuwe medewerkers oefenen de gesprekken van hun functie vanaf hun eerste dag, in plaats van te leren op echte klanten.",
        visual: "modules",
        alt: "De pagina van Lucas Martens: vijf toegewezen modules, drie gevalideerd, en de laatste poging met elk verwacht punt en de woorden die het bewijzen.",
      },
      {
        key: "company",
        title: "Gebouwd op uw bedrijf",
        body: "Laad uw pitch deck, productinformatie en veelgestelde klantvragen op. Onbord maakt er oefenmodules van voor elke functie.",
        visual: "source",
        alt: "De bedrijfsdocumenten die de simulaties voeden: pitch deck, productgids en klantvragen in gebruik, de tarieven van vorig jaar opzijgezet.",
      },
      {
        key: "feedback",
        title: "Duidelijke feedback op elke module",
        body: "Elke module wordt beoordeeld op duidelijke checkpoints, met de exacte woorden achter elke score. Nieuwe medewerkers weten wat ze moeten verbeteren.",
        visual: "done",
        alt: "Wat een nieuwe medewerker na een poging ziet: de score tegenover de drempel, en elk verwacht punt gescoord op 0, 1 of 2, met de eigen woorden.",
      },
      {
        key: "ready",
        title: "Zie wie klaar is",
        body: "Volg de vooruitgang van elke nieuwe medewerker op één plek. Weet wie klaar is voor echte klanten, en wie nog moet oefenen.",
        visual: "ready",
        alt: "De nieuwe medewerkers die nog in onboarding zijn: gevalideerde modules en gemiddelde score van elk.",
      },
    ],
    faq: [
      { q: "Hoe verkort Onbord de inwerktijd?", a: "Nieuwe medewerkers oefenen de echte gesprekken van hun functie voordat ze een klant ontmoeten, en elke module vertelt hen wat ze moeten verbeteren. Bij hun eerste echte gesprek hebben ze het al meermaals gevoerd." },
      { q: "Wat moeten we aanleveren?", a: "Uw pitch deck, uw productinformatie en de vragen die uw klanten het vaakst stellen. Onbord bouwt er de modules mee, en u leest elke module na voor ze online gaat." },
      { q: "Vervangt het onze trainingen?", a: "Nee. Het voegt de oefening toe. Uw team blijft opleiden, en nieuwe medewerkers oefenen wat ze leerden met gesimuleerde klanten tot het vastzit." },
      { q: "Voor welke functies werkt het?", a: "Klantgerichte functies in B2B SaaS: SDR's, BDR's, account executives, account managers, sales managers, customer success managers en supportteams." },
      { q: "Kunnen managers de vooruitgang volgen?", a: "Ja. De modules, scores en vooruitgang van elke nieuwe medewerker staan op één plek, zodat managers zien wie klaar is voor echte klanten en wie nog moet oefenen." },
    ],
    cta: "Klaar om uw volgende medewerker snel op snelheid te krijgen?",
  },

  saas: {
    meta: {
      title: "Klantsimulaties voor B2B SaaS-teams | Onbord",
      description: "Werf en onboard SaaS-teams in sales, customer success en support op realistische klantgesprekken: demo's, verlengingen en dringende tickets, via chat, e-mail, telefoon of videogesprek.",
    },
    tag: "B2B SaaS",
    title: "SaaS gaat snel.",
    lede: "Uw sales-, customer success- en supportteams moeten snel leren, productwijzigingen bijhouden en veeleisende klanten aankunnen vanaf dag één.",
    blocks: [
      {
        key: "hire",
        title: "Werf mensen die uw klanten aankunnen",
        body: "Groeiende teams werven elk kwartaal. Onbord toont u wie een demo, een verlenging of een dringend ticket aankan voordat u aanwerft.",
        visual: "cands",
        alt: "De kandidaten voor een vacature, gerangschikt op totaalscore.",
      },
      {
        key: "onboarding",
        title: "Snellere onboarding",
        body: "Maak nieuwe medewerkers weken sneller klaar. Ze oefenen op uw product en uw klanten vóór hun eerste echte gesprek.",
        visual: "modules",
        alt: "De pagina van een nieuwe medewerker: vijf toegewezen modules, drie gevalideerd, en de laatste poging met elk verwacht punt.",
      },
      {
        key: "product",
        title: "Blijf bij met uw product",
        body: "Nieuwe functies, nieuwe prijzen, nieuwe processen. Uw team oefent de nieuwe boodschap voordat ze bij een klant komt.",
        visual: "updated",
        alt: "Een oefenmodule, De nieuwe tarieven voorstellen, gepubliceerd en klaar om opnieuw gegenereerd te worden uit de bijgewerkte bedrijfsdocumenten.",
      },
      {
        key: "channels",
        title: "Elk klantgesprek gedekt",
        body: "Van de eerste prospectiemail tot het verlengingsgesprek en het supportticket: Onbord simuleert ze allemaal, via chat, e-mail, telefoon of videogesprek.",
        visual: "channels",
        alt: "De vier kanalen naast elkaar: chat, e-mail, telefoon en videogesprek.",
      },
    ],
    faq: [
      { q: "Voor welke SaaS-teams is Onbord?", a: "Klantgerichte teams: SDR's, BDR's, account executives, account managers, sales managers, customer success managers en support." },
      { q: "Kan het een technisch product aan?", a: "Ja. Simulaties worden gebouwd op wat u Onbord vertelt over uw bedrijf en uw product, dus de klant stelt vragen over uw functies, in uw woorden. U leest elke stap na voor ze online gaat." },
      { q: "Welke talen ondersteunt Onbord?", a: "Engels, Frans en Nederlands. Elke simulatie verloopt in één taal, gekozen bij het aanmaken." },
      { q: "Waar worden onze gegevens opgeslagen?", a: "In de Europese Unie, op servers in Parijs. Niets wat uw team in een simulatie zegt, wordt gebruikt om een AI-model te trainen." },
    ],
    cta: "Klaar om sneller te werven en in te werken?",
  },

  visuals: {
    report: { name: "Amine B.", pct: "88%" },
    conversation: {
      initials: "DV",
      name: "Daniel Visser",
      status: "Online",
      step: "Stap 2 van 3 · Chat",
      contextLabel: "Situatie:",
      context: "Daniel leidt sales ops bij Brightline. Hij antwoordde op uw e-mail, maar hij is nog niet overtuigd.",
      messages: [
        { from: "them", text: "We betalen al voor een CRM. Waarom zouden we er nog een tool bij nemen?" },
        { from: "me", text: "Terechte vraag. Wat gebeurt er vandaag als een verkoper vergeet een gesprek te loggen?" },
        { from: "them", text: "Dan verliezen we de historiek. Vorig kwartaal kostte dat ons twee verlengingen." },
      ],
      typing: "Daniel typt…",
      placeholder: "Uw bericht aan Daniel…",
    },
    feedback: {
      title: "Feedback: Sarah D.",
      sent: "Verstuurd op 12 nov.",
      toLabel: "Aan",
      to: "sarah.d@email.com",
      subjectLabel: "Onderwerp",
      subject: "Uw sollicitatie als Account Executive",
    },
    // De onboarding, overgenomen uit de applicatie op 23/11/2026
    // (CasVisuels.js). Zie de Engelse versie.
    source: {
      title: "Documenten",
      count: "3 van 4 gebruikt door de simulaties.",
      inUse: "In gebruik",
      aside: "Opzijgezet",
      docs: [
        { title: "Pitch deck 2026", meta: "Pitch deck · 18.240 tekens · 4 nov.", on: true },
        { title: "Productgids", meta: "Product · 42.915 tekens · 4 nov.", on: true },
        { title: "Veelgestelde klantvragen", meta: "FAQ · 6.380 tekens · 6 nov.", on: true },
        { title: "Tarieven 2025", meta: "Tarieven · 3.112 tekens · 12 jan.", on: false },
      ],
    },
    done: {
      attempt: "Poging 2 · 18 nov.",
      title: "Verlengingsgesprek met een twijfelende klant",
      scoreLabel: "Uw score",
      score: 75,
      passMark: "Drempel van de module: 70%",
      passed: "Drempel gehaald",
      skills: "Vaardigheid per vaardigheid",
      hint: "Elk verwacht punt: 0 = ontbreekt, 1 = gedeeltelijk, 2 = beheerst.",
      skill: "De verlenging binnenhalen",
      skillScore: 75,
      points: [
        { s: 2, d: "Vraagt wat er sinds vorig jaar veranderde", v: "“Wat is er voor uw team anders dan vorig jaar?”" },
        { s: 2, d: "Koppelt de prijs aan het werkelijke gebruik", v: "“Uw verkopers registreerden dit jaar 1.400 gesprekken via de sync.”" },
        { s: 1, d: "Beantwoordt de zorg over het budget", v: "“Ik begrijp het, budgetten staan overal onder druk.”" },
        { s: 1, d: "Spreekt een volgende stap met een datum af", v: "“Laten we het er voor het einde van de maand nog over hebben.”" },
      ],
    },
    updated: {
      crumb: "Modules",
      title: "De nieuwe tarieven voorstellen",
      channel: "phone",
      channelName: "Telefoongesprek",
      chips: ["Account manager", "Nederlands", "Gemiddeld", "drempel 70%"],
      state: "Gepubliceerd",
      regenerate: "Opnieuw genereren",
      step: "Stap 1 · Telefoongesprek",
      stepTitle: "De nieuwe formules uitleggen aan een bestaande klant",
      persona: {
        initials: "MD",
        name: "Marc Dubois",
        role: "CFO · Northwind Logistics",
        personality: "Direct, let op elke euro, wil de cijfers voor het verhaal.",
      },
    },
    channels: [
      { key: "chat", name: "Chat", use: "Live support" },
      { key: "email", name: "E-mail", use: "Eerste contact" },
      { key: "phone", name: "Telefoon", use: "Verlenging" },
      { key: "video", name: "Videogesprek", use: "Productdemo" },
    ],
  },
};

export default solutions;
