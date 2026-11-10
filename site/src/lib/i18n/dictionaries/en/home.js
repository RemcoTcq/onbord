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
    // La bulle au-dessus du titre. « Customer-facing » est le terme qui
    // couvre les trois familles à la fois (sales, support, customer success).
    badge: "Built for customer-facing roles",
    // Le titre du 05/11/2026 (demande directe), une ligne par côté du
    // produit : le recrutement, puis l'onboarding. ⚠️ PAS DE MOT EN BLEU :
    // tout le titre dans la même typo et la même couleur (demande directe).
    // `titleEm` reste vide, mais il reste là, TitleH1 le lit.
    titleA: "You hire better.",
    titleEm: "",
    titleB: "They ramp faster.",
    // ⚠️ La seconde moitié annonce l'ONBOARDING, pas encore construit dans
    // l'application (règle 2) : décision de Remco du 05/11/2026, le site
    // anticipe le produit. À relire le jour de la mise en ligne.
    lede: "Candidates prove their skills on the real job, new hires practice it before day one.",

    // ── La fenêtre de la plateforme (AppPeek.js) ─────────────────────────────
    // Quatre écrans de l'application, qui défilent tout seuls. Les
    // libellés suivent l'interface recruteur (src/lib/i18n/dictionaries/en/
    // dashboard.js à la racine du dépôt) : un prospect les retrouvera mot pour
    // mot en démo. Les candidats et leurs notes viennent de common.mocks
    // (shortlist, score), pas d'une seconde série inventée.
    // Le choix au-dessus de la fenêtre (Vitrine.js). L'onglet Onboarding
    // montre encore la fenêtre du recrutement : son visuel arrivera avec lui.
    tabs: { label: "What the platform shows", recruitment: "Recruitment", onboarding: "Onboarding" },
    // Le pop-up « Try it now » (TryModal.js), second bouton du hero. TEXTE
    // PROVISOIRE, à reprendre au copywriting. La promesse des 24 heures est
    // tenue À LA MAIN par l'équipe : ne la raccourcissez pas sans elle.
    try: {
      button: "Test it on your own role",
      eyebrow: "Test simulation",
      title: "Try it now",
      lede: "Send us a job description. We build the simulation for that role and open your private environment.",
      firstName: "First name",
      firstNamePh: "Emma",
      lastName: "Last name",
      lastNamePh: "Peeters",
      email: "Work email",
      emailPh: "emma@company.com",
      file: "Job description",
      filePick: "Upload your job description",
      fileHint: "PDF, Word or text, up to 4 MB",
      fileChange: "Click to choose another file",
      submit: "Send",
      sending: "Sending…",
      privacy: "We only use your details to set up your environment.",
      missing: "Please fill in your first name, last name and email.",
      badEmail: "This email address doesn't look right.",
      noFile: "Please upload your job description.",
      tooBig: "This file is over 4 MB. Please upload a lighter one.",
      badType: "Please upload a PDF, Word or text file.",
      failed: "Your request couldn't be sent. Email your job description to",
      close: "Close",
      doneTitle: "Thanks, {name}.",
      doneLede: "Within 24 hours, you'll get access to your private environment, with a simulation built from your job description. We'll write to {email}.",
      doneClose: "Close",
    },
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
        { title: "Support Specialist", meta: "Leuven · On site", invited: 12, done: 12, date: "Sep 24" },
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

  // ── Sous le hero : une phrase seule (05/11/2026), chiffres retirés ───────
  // Texte PROVISOIRE, le copywriting vient après. Chaque chiffre doit rester
  // vrai dans l'application (règle 2 de site/AGENTS.md).
  figures: {
    // ⚠️ Règle 2 : « help them reach proficiency faster » parle de
    // l'onboarding, qui n'existe pas encore dans l'application.
    statement: "Pick the right reps and help them reach proficiency faster with realistic job simulations.",
  },

  // Le problème, ÉNUMÉRÉ. C'est un ajout tardif et il contredit à moitié la
  // règle 0 (« le problème ne se nomme pas ») : demandé explicitement, sur le
  // modèle des sites qui posent deux colonnes barrées et une cochée. Ce qui
  // reste de la règle : aucune de ces lignes n'invente un reproche, chacune
  // redit dans un autre format ce que la page affirme déjà ailleurs.
  // ── « Two moments that matter » (05/11/2026), Moments.js ────────────────
  // Texte PROVISOIRE, à reprendre au copywriting. ⚠️ Règle 2 : l'onboarding
  // n'existe PAS ENCORE dans l'application ; son visuel (onboardingApp) est
  // une projection, seuls les formats de ses modules existent déjà.
  moments: {
    title: "Two moments that matter",
    items: [
      {
        key: "hiring",
        tag: "Hiring",
        title: "See who can do the job before you hire.",
        lede: "Candidates do twenty minutes of the real job. You get them ranked on your criteria, with the evidence behind every score.",
        link: "Explore hiring",
        alt: "The Onbord recruiter view: candidates for a job, ranked by overall score.",
      },
      {
        key: "onboarding",
        tag: "New hire onboarding",
        title: "Get new hires ready before day one.",
        lede: "They work through the real situations of the role, module by module, and you see where each one stands before they meet a customer.",
        link: "Explore onboarding",
        alt: "An Onbord onboarding program: a new account executive works through five job simulations before their first day.",
      },
    ],
    onboardingApp: {
      alt: "An Onbord onboarding program: a new account executive works through five job simulations before their first day.",
      initials: "LM",
      name: "Lucas Martens",
      nav: "Onboarding",
      role: "Account executive",
      starts: "Starts on 16 Nov",
      onTrack: "On track",
      ready: "Ready for day one",
      progress: "{done} of {total} modules",
      colModule: "Module",
      colScore: "Score",
      colStatus: "Status",
      pct: "{n}%",
      states: { done: "Completed", current: "In progress", todo: "Not started" },
      modules: [
        { kind: "call", title: "Discovery call with a new prospect", format: "Live call", min: "15 min", state: "done", score: "82" },
        { kind: "email", title: "Answer a pricing objection", format: "Email", min: "10 min", state: "done", score: "71" },
        { kind: "inbox", title: "Sort a Monday-morning inbox", format: "Inbox", min: "10 min", state: "current" },
        { kind: "document", title: "Prepare a renewal proposal", format: "Document", min: "15 min", state: "todo" },
        { kind: "chat", title: "Calm an unhappy client in chat", format: "Chat", min: "10 min", state: "todo" },
      ],
    },
  },

  // « How it works », trois étapes en TROIS GRANDS BLOCS aux couleurs
  // d'Onbord, le visuel au centre, le titre et le texte dessous sur le
  // blanc (09/11/2026, demande directe, Etapes.js). Retenue contre la section
  // des quatre canaux, supprimée. Les étapes valent pour le recrutement comme pour
  // l'onboarding : construire la simulation, la jouer sur les canaux de
  // l'équipe, évaluer.
  // ⚠️ Règle 2 : le NIVEAU DE DIFFICULTÉ n'existe pas dans l'application, et
  // le personnage n'y a pas de photo (ses initiales). La langue et le
  // contexte de l'entreprise, si. Appel vidéo et appel téléphonique sont le
  // même module vocal.
  flow: {
    title: "How it works",
    lede: "Whatever you use it for, every simulation follows the same three steps.",
    steps: [
      {
        key: "build",
        title: "Build the simulation",
        body: "Realistic customer scenarios built from your company, your product and your customers. Set the personas, channels, difficulty and language.",
        alt: "An AI persona, Daniel Visser, set up for a video call in English at medium difficulty, built from the company context and the job offer.",
      },
      {
        key: "channels",
        title: "They have the conversation",
        body: "Your reps talk to simulated customers by chat, email, phone or video call, the way your team does every day, with the same objections, questions and pressure.",
        alt: "The four channels to choose from, with video call and email both selected for the same simulation.",
      },
      {
        key: "evaluate",
        title: "See exactly how they performed",
        body: "Every conversation is scored on clear checkpoints, with the evidence behind each one. So every decision rests on what they actually did.",
        alt: "A scored video call: 74%, with the checkpoints met and missed, each with the words from the call that prove it.",
      },
    ],
    persona: {
      tag: "AI Persona",
      name: "Daniel Visser",
      rows: [
        { label: "Channel", value: "Video call" },
        { label: "Language", value: "English" },
        { label: "Difficulty", value: "Medium", level: 2 },
      ],
      builtFrom: "Built from",
      sources: ["Company Context", "Job Offer"],
    },
    channels: [
      { key: "video", name: "Video call", on: true },
      { key: "phone", name: "Phone call" },
      { key: "chat", name: "Chat" },
      { key: "email", name: "Email", on: true },
    ],
    report: {
      name: "Lucas Martens",
      pct: "74%",
      criterion: "Uncovers the real need",
      critPct: 80,
      checks: [
        { ok: true, text: "Asks who owns the budget", said: "\u201cWho signs off on a tool like this on your side?\u201d" },
        { ok: true, text: "Restates the pain in the client's words", said: "\u201cSo the issue isn't the tool, it's that your reps stopped logging their calls?\u201d" },
        { ok: false, text: "Agrees on a dated next step", said: "\u201cGreat, I'll send you some info and we'll be in touch.\u201d" },
      ],
    },
  },

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

  // La confiance, à notre façon (09/11/2026, Confiance.js) : quatre
  // engagements, pas de sceau. ⚠️ Règle 2 : chacun est écrit dans les pages
  // légales (données à Paris, pas d'entraînement, décision humaine) ou vrai
  // dans l'application (citations vérifiées, runScoring.js).
  trust: {
    title: "Built to be trusted",
    lede: "Four commitments, written into our terms and built into the product, so you can use AI in hiring and onboarding with confidence.",
    link: "How our AI works",
    items: [
      { key: "eu", title: "Your data stays in the EU", body: "All data is stored in the European Union, on servers in Paris." },
      { key: "training", title: "Never used to train AI", body: "Nothing your candidates or team say in a simulation is used to train any AI model." },
      { key: "human", title: "A person makes every decision", body: "Onbord scores and explains. Hiring and readiness decisions always stay with your team." },
      { key: "proof", title: "Every score shows its proof", body: "Each checkpoint shows the exact words that earned it, straight from the conversation." },
    ],
  },
  // La FAQ (Faq.js). ⚠️ Le lien de la dernière réponse n'est pas encore
  // branché : voir l'en-tête de Faq.js. Langues : EXPERIENCE_LOCALES de
  // l'application (fr, en, nl).
  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "Which roles does it work for?", a: "Customer-facing roles in B2B SaaS: SDRs, BDRs, account executives, account managers, sales managers, customer success managers and support teams." },
      { q: "How long does setup take?", a: "Onbord builds a first version of a simulation in a few minutes, from your company context and the role. You adjust what you want, then send it. Your private environment is ready within 24 hours." },
      { q: "Which languages does it support?", a: "English, French and Dutch. Each simulation runs in one language, chosen when you create it." },
      { q: "Do we need to integrate anything?", a: "No. You share one link. Nothing to install, nothing to connect to your current tools." },
      { q: "Can we try it before booking a demo?", a: "Yes. Try Onbord in 30 seconds, with no credit card or sales call required. ", link: "Try a roleplay" },
    ],
  },
  // L'appel final (Cta, Bits.js) : les boutons sont ceux du hero.
  cta: {
    title: "Hear your team at work, before your customers do.",
    body: "Book a demo, or send us a job description and get your private environment within 24 hours.",
  },
};

export default home;
