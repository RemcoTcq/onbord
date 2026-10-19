// Page d'accueil — anglais, la version de référence.
//
// ── Le plan, et ce que chaque section doit obtenir ───────────────────────────
//   hero    « qu'est-ce que c'est »       → et la plateforme, en quatre onglets
//   truth   « pourquoi ça me concerne »   → le problème, compris sans être nommé
//   work    « c'est quoi, concrètement »  → vingt minutes du métier
//   how     « comment ça se passe »       → trois gestes, pas huit étapes
//   proof   « est-ce que j'y crois »      → la note et ce qui la tient
//   answer  « et le candidat »            → il reçoit une réponse, même refusé
//   next    « j'en veux plus »            → les trois pages de détail
//   cta     l'action
//
// ⚠️ C'EST UNE PAGE D'ACCUEIL, PAS UN MODE D'EMPLOI. Le déroulé complet du
// produit vit sur /how-it-works, les formats sur /simulations, les prix sur
// /pricing. Ici on nomme vite, on montre bien, et on sort par une flèche.
//
// ⚠️ LE PROBLÈME NE SE NOMME PAS. `truth` pose trois constats que le lecteur
// reconnaît tout seul ; la maquette d'à côté montre autre chose, et l'écart
// fait l'argument. Écrire « le problème du recrutement, c'est… » remettrait le
// visiteur en position d'élève.
//
// ⚠️ QUATRE RÈGLES D'ÉCRITURE :
//   1. LONGUEUR. Un titre = une ligne ; un corps = une à trois phrases.
//   2. SIMULATION, jamais « assessment » ni « évaluation ».
//   3. PAS DE TIRET CADRATIN dans la copie.
//   4. NI PRIX NI CRÉDITS. `next` sort vers /pricing, et c'est tout.

const home = {
  meta: {
    title: "Onbord | Job simulations to hire on real skills, not CVs",
    description:
      "Onbord turns any job posting into a job simulation. Candidates do the real work of the role, and you get a skills assessment with evidence behind every score.",
  },

  hero: {
    titleA: "Hire on",
    titleEm: "real skills.",
    titleB: "Not CVs.",
    lede: "Paste a job posting. Onbord builds a job simulation, sends it to your candidates, and ranks them on what they actually did.",
    primary: "Book a demo",

    // ── La fenêtre de la plateforme (AppPeek.js) ─────────────────────────────
    // Quatre écrans de l'application, qui défilent tout seuls. Les
    // libellés suivent l'interface recruteur (src/lib/i18n/dictionaries/en/
    // dashboard.js à la racine du dépôt) : un prospect les retrouvera mot pour
    // mot en démo. Les candidats et leurs notes viennent de common.mocks
    // (shortlist, score), pas d'une seconde série inventée.
    app: {
      // Ce que la fenêtre montre, pour un lecteur d'écran (elle y est une image).
      alt: "Onbord's recruiter interface: the dashboard, candidates ranked by overall score, and a candidate report.",
      pct: "{n}%",
      me: "LV",
      nav: {
        search: "Search…",
        menu: "Menu",
        home: "Dashboard",
        jobs: "Jobs",
        recent: "Recent jobs",
        settings: "Settings",
      },
      jobs: [
        { title: "Sales Development Rep", meta: "Ghent · Hybrid", invited: 34, done: 21, date: "Oct 7" },
        { title: "Customer Success Manager", meta: "Brussels · Permanent", invited: 18, done: 11, date: "Oct 2" },
        { title: "Office Manager", meta: "Leuven · On site", invited: 12, done: 12, date: "Sep 24" },
        { title: "Account Executive", meta: "Antwerp · Hybrid", invited: 22, done: 10, date: "Sep 19" },
      ],
      job: {
        tabs: ["Candidate journey", "Candidates", "Context", "Settings"],
        chips: ["Ghent", "Hybrid"],
        open: "Applications open",
        copy: "Copy public link",
      },
      cands: {
        search: "Search for a candidate",
        sort: "Sort",
        sortBy: "Highest score",
        colCandidate: "Candidate",
        colScore: "Overall score",
        colStatus: "Status",
        view: "View report",
        subs: ["Completed Oct 14", "Completed Oct 14", "Completed Oct 13", "Completed Oct 12", "Invited Oct 15"],
      },
      report: {
        candidates: "Candidates",
        expand: "Expand all",
        feedback: "Feedback",
        status: "Status",
        invited: "Invited",
        invitedOn: "Oct 9, 2026",
        completed: "Completed",
        completedOn: "Oct 13, 2026",
        gdpr: "GDPR",
        granted: "Granted",
        shortlist: "Shortlist",
        next: "Move to next stage",
        reject: "Reject",
        score: "Overall score",
        scoreSub: "Weighted average of your selection criteria.",
        scoreLine: "4 steps scored",
        scoreNote: "The detail per criterion is in each step below.",
        stepType: "Email",
        criteria: "Criteria",
        must: "Must-have",
        quote: "“{q}”",
      },
      home: {
        title: "Dashboard",
        newJob: "New job",
        hello: "Hello Laura",
        figures: [
          { label: "Jobs", n: "4", unit: "open" },
          { label: "Candidates", n: "86", unit: "in total" },
          { label: "Completed", n: "54", unit: "simulations" },
        ],
        yourJobs: "Your jobs",
        status: "Status",
        open: "Open",
        candidates: "Candidates",
        candidatesN: "{n} candidates",
        completed: "Completed",
        created: "Created",
        latest: "Latest candidates",
        activity: "This week's activity",
        week: "Week",
        range: "Oct 12 – 18, 2026",
        doneN: "9",
        doneLabel: "simulations completed this week",
        legendInvited: "Invited",
        legendDone: "Completed",
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      },
    },
  },

  // Trois constats, et rien d'autre. La dernière ligne passe en dégradé.
  truth: {
    lines: [
      "A CV is what someone wrote about themselves.",
      "An interview is what they say under pressure.",
      "Neither one is the work.",
    ],
    lede: "So Onbord hands every candidate twenty minutes of the actual job, in tools that behave like the real ones, and shows you exactly what they did with it.",
    // Les deux en-têtes du visuel CV / preuve, voir CvProof dans Mocks.js.
    cvLabel: "CV",
    proofLabel: "What Onbord shows",
  },

  // Le problème, ÉNUMÉRÉ. C'est un ajout tardif et il contredit à moitié la
  // règle 0 (« le problème ne se nomme pas ») : demandé explicitement, sur le
  // modèle des sites qui posent deux colonnes barrées et une cochée. Ce qui
  // reste de la règle : aucune de ces lignes n'invente un reproche, chacune
  // redit dans un autre format ce que la page affirme déjà ailleurs.
  compare: {
    eyebrow: "The difference",
    titleA: "Two ways to be",
    titleEm: "wrong",
    titleB: "about someone.",
    lede: "What usually decides who gets an interview, and what should.",
    cards: [
      {
        ok: false,
        title: "The CV",
        items: [
          "Claims nobody can check",
          "A keyword match, not an ability",
          "Written to get past a filter",
        ],
      },
      {
        ok: false,
        title: "Gut feel",
        items: [
          "A skim, not a read",
          "Confidence mistaken for competence",
          "A different bar for every candidate",
        ],
      },
      {
        ok: true,
        title: "A work simulation",
        items: [
          "Twenty minutes of the actual job",
          "Every score comes with the sentence behind it",
          "The same criteria, approved before anyone starts",
        ],
      },
    ],
    note: "Onbord comes in before the interview. The conversation starts from evidence, not guesswork.",
  },

  work: {
    eyebrow: "What candidates do",
    titleA: "Twenty minutes of",
    titleEm: "the job.",
    titleB: "Not a questionnaire.",
    lede: "They answer the client who has a cheaper quote, take the call on camera, and read the numbers before the Monday meeting. The AI assistant is open beside them, exactly like at work, and how they use it is part of the result.",
  },

  how: {
    eyebrow: "How it works",
    titleA: "You paste.",
    titleEm: "It builds.",
    titleB: "You decide.",
    lede: "Nothing to configure, nothing to integrate, nothing to rewrite. The parts that matter still wait for your approval.",
    steps: [
      {
        n: "01",
        title: "Paste the posting",
        body: "Onbord pulls out the skills that actually matter. You correct them and approve, and everything after is built on your version.",
      },
      {
        n: "02",
        title: "Talk it through",
        body: "You talk to the assistant in plain words. It writes the tasks, the scenario and the scoring grid, and you change anything you want.",
      },
      {
        n: "03",
        title: "Send one link",
        body: "Candidates do the work. You get them ranked on your own criteria, with the sentence behind every number.",
      },
    ],
    // Les trois visuels des étapes cliquables (Steps.js). Le deuxième réutilise
    // la conversation de `common.mocks.chat` : le site raconte le même moment
    // à deux endroits, et une seconde version finirait par diverger.
    viz: {
      drop: { file: "Sales-Development-Rep.pdf", size: "142 KB", hint: "Paste the text, drop the file, or give the link." },
      talk: { made: "5 steps written · about 20 min" },
      link: { label: "Ready to send", url: "onbord.be/s/sdr-gent", copied: "Copied" },
    },
    // Le mot qui précède le numéro d'étape sur l'accueil (« Step 1 »).
    stepLabel: "Step",
    resultTitle: "And this is what you get back.",
    resultBody: "Every candidate who started, ranked on the criteria you approved, with the evidence one click under each number. Onbord only builds a shortlist: the recruiter always makes the final call.",
  },

  proof: {
    eyebrow: "Every score, and its proof",
    titleA: "A number you can",
    titleEm: "defend",
    titleB: "in the room.",
    lede: "Every skill splits into sub-dimensions, and every level on every scale describes a behaviour you could actually observe. Every score points to something the candidate actually wrote. Not a summary. Not a guess.",
  },

  answer: {
    titleA: "Everyone gets",
    titleEm: "an answer.",
    titleB: "",
    body: "Including the ones you turn down, in a hundred and fifty words built from what they actually did. Silence is what a candidate remembers of a company, and it costs you the next application.",
  },

  cta: {
    titleA: "Send us one job posting.",
    titleEm: "We'll build",
    titleB: "the simulation.",
    body: "One real posting, and you see the whole thing: the tasks, the scoring grid, and the report you would read afterwards.",
    primary: "Book a demo",
  },
};

export default home;
