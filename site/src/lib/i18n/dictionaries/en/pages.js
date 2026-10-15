// Les quatre pages intérieures — anglais, version de référence.
//
// Elles portent le détail que la page d'accueil n'a que le temps d'annoncer.
// Tout ce qui y est affirmé se vérifie dans le code de l'application : le
// barème de crédits, les formats de simulation, les règles de conception, la
// vérification des citations. Ne rien ajouter ici qui ne soit vrai là-bas.
//
// ⚠️ UN BLOC = UN PARAGRAPHE COURT. `body` est un tableau parce que la mise en
// page accepte plusieurs paragraphes, pas parce qu'il en faut plusieurs. Le
// second ne se justifie que s'il dit une chose que le premier ne dit pas — et
// le plus souvent, il redisait le premier en plus long.

const pages = {
  // ── Comment ça marche ───────────────────────────────────────────────────
  how: {
    meta: {
      title: "How Onbord works: from your account to a ranked shortlist",
      description:
        "Eight steps: your company profile, the job posting, the skills, the pipeline, the screening questions, the simulation, your approval, the shortlist.",
    },
    eyebrow: "How it works",
    titleA: "From your account to a",
    titleEm: "ranked shortlist,",
    titleB: "in eight steps.",
    lede: "Nothing to install and nothing to configure. Half the steps are yours, and nothing reaches a candidate before you have approved it.",

    steps: [
      {
        n: "01",
        visual: "profile",
        title: "Your company, read from your own website.",
        body: "You create your account and give your website. Onbord reads it and fills in your profile: what you sell, to whom, in what tone. Everything built afterwards leans on it, so you never have to explain your company twice.",
      },
      {
        n: "02",
        visual: "import",
        title: "Your job posting, in whatever shape you have it.",
        body: "Paste the text, drop the PDF, or give the link to the live ad. Onbord reads it and takes it from there. Nothing has to be rewritten for its benefit.",
      },
      {
        n: "03",
        visual: "skills",
        title: "The skills, each one with the sentence it came from.",
        body: "Onbord pulls out the skills and quotes the exact line of the posting behind each one, so you can check rather than trust. It also reads the job family and the level, because a simulation for a manager is not the same exercise as one for an individual contributor. Each skill arrives marked must-have or nice-to-have, and you correct the sorting: must-have is what the simulation really tests, nice-to-have gets a lighter touch.",
      },
      {
        n: "04",
        visual: "pipeline",
        title: "A hiring pipeline, assembled for this role.",
        body: "Screening questions first, then the candidate experience. The interviews you already run appear in it too, so the whole path sits in one place, including the steps Onbord does not handle for you.",
      },
      {
        n: "05",
        visual: "questions",
        title: "The screening questions are already written.",
        body: "A driving licence, a work permit, a language: the things that disqualify before anyone spends time on anyone. They arrive written for this role, and you edit them, add your own, or delete the ones you do not need.",
      },
      {
        n: "06",
        visual: "chat",
        title: "You describe the simulation. It writes it.",
        body: "You tell the assistant what the job really looks like, in your own words. It asks a couple of questions, then writes the whole thing: tasks, scenario, and the scoring grid behind them. Anything it produced can be rewritten, regenerated or dropped.",
      },
      {
        n: "07",
        visual: "ready",
        title: "You approve it, and it is ready for candidates.",
        body: "Nothing is published on the model's say-so. You read the simulation and the grid it will be scored with, you approve, and the experience is ready to go out to the people you want to assess.",
      },
      {
        n: "08",
        visual: "shortlist",
        title: "They take it. You get a ranked list.",
        body: "Candidates are scored on the criteria you approved, and on nothing else. Every score carries the candidate's own sentence underneath it, checked against what they submitted. At the end, a list you can defend line by line.",
        more: "How scoring works",
        moreTo: "/scoring",
      },
    ],

    // Le contenu des vignettes. Court par construction : trois ou quatre
    // éléments chacune, et on comprend sans lire.
    viz: {
      profile: {
        tag: "Company profile",
        url: "your-company.be",
        rows: [
          { k: "Sector", v: "Industrial distribution" },
          { k: "Sells to", v: "Purchasing departments" },
          { k: "Tone", v: "Direct, factual" },
        ],
      },
      import: {
        tag: "New job posting",
        options: ["Paste the text", "PDF or Word file", "Link to the live ad"],
      },
      skills: {
        tag: "Skills extracted",
        mustLabel: "Must have",
        niceLabel: "Nice to have",
        must: ["Objection handling", "Prospecting"],
        nice: ["CRM hygiene", "Cold calling"],
        evidence: "“You handle price objections from purchasing managers daily.”",
      },
      questions: {
        tag: "Screening questions",
        rows: [
          { q: "Do you hold a valid driving licence?", a: "Yes" },
          { q: "Do you need a work permit?", a: "No" },
        ],
      },
      chat: {
        tag: "Designing the simulation",
        msg: "Our reps sell to purchasing managers, not founders.",
        result: "5 steps written · about 20 minutes",
      },
      ready: {
        tag: "Ready",
        title: "Approved by you",
        sub: "Tasks, scenario and scoring grid",
        invite: "Ready for your candidates",
      },
    },

    closing: {
      title: "That is the whole thing.",
      body: "No implementation project, no configuration workshop. An account, a posting, and a shortlist at the end.",
      cta: "Book a demo",
    },
  },

  // ── Les simulations ─────────────────────────────────────────────────────
  sims: {
    meta: {
      title: "The simulations: what a candidate actually does in Onbord",
      description:
        "Four capabilities, shaped however your role needs them: writing, speaking, running code, filing a record. Not a fixed catalogue of exercises.",
    },
    eyebrow: "Simulations",
    titleA: "Four things a candidate",
    titleEm: "actually produces.",
    titleB: "",
    lede: "Onbord has no catalogue of exercises. It has four ways of capturing what someone did, shaped however your role needs it.",

    // Les quatre GESTES, décrits comme des CAPACITÉS ouvertes, pas comme un
    // scénario unique. « The email nobody enjoys writing » disait UN exemple ;
    // « Writing, in whatever form the role needs » dit la capacité, et laisse
    // le recruteur imaginer la sienne. La maquette reste UN exemple concret,
    // mais le texte autour dit explicitement qu'elle n'est qu'un exemple.
    // Les quatre GESTES. Chaque carte a une ICÔNE ABSTRAITE (GestureIcon,
    // par `id`), un nom, et UNE phrase — pas de maquette, pas de deuxième
    // paragraphe. Voir la règle 4 ter du guide : l'icône montre le geste, pas
    // un exemple précis, pour que la carte dise « on peut écrire » et non
    // « voici cet e-mail ».
    families: [
      { id: "write", name: "Writing", measures: "Writing, judgement, commercial instinct, tone", body: "A reply, a note, a memo: whatever the role writes, with the AI assistant beside them exactly as it would be at work." },
      { id: "speak", name: "Speaking", measures: "Speaking, presence, thinking on your feet", body: "An objection, an update, an answer under pressure: out loud, on camera, one take." },
      { id: "run", name: "Code", measures: "Correctness, problem solving, debugging", body: "Real code, real tests: the candidate writes, runs, and fixes until it passes. Never deployed anywhere." },
      { id: "file", name: "Records", measures: "Rigour, attention to detail, note-taking", body: "Messy information in, the correct record out, in whatever system the role actually uses." },
    ],

    // Épilogue de la page, PAS un cinquième geste : aucune maquette ne l'illustre.
    // Voir la règle 4 ter du guide : une direction, jamais une date ou une
    // fonctionnalité livrée. `tag` vit sur CHAQUE item, pas sur le bloc entier :
    // le premier est honnêtement plus avancé que les deux autres, et un tag
    // partagé aurait gommé cette différence.
    next: {
      kicker: "What's next",
      title: "Where we're headed next.",
      lede: "Some of this is already in progress. All of it is a direction, not a date.",
      items: [
        {
          tag: "In progress",
          title: "A real conversation, not a single take",
          body: "We're building an agent that responds in real time, turn by turn: a one-to-one interview or role play today, a situational scenario, a case discussed live, or a full board meeting with several people in the room, next.",
        },
        {
          tag: "In the works",
          title: "What matters first",
          body: "A messy queue of tickets or leads to sort by urgency, checked against the order it actually deserves.",
        },
        {
          tag: "In the works",
          title: "Reading a number",
          body: "A small, imperfect dataset, and a decision or a filled-in answer at the end of it.",
        },
      ],
    },

    rules: {
      kicker: "The rules behind all of them",
      title: "What the generator is not allowed to do.",
      items: [
        {
          title: "No retrospective self-reporting",
          body: "“Tell me about a time when…” is banned. What a candidate does now, not what they say they once did.",
        },
        {
          title: "No generic version of the job",
          body: "A step that would fit any other posting with the same title gets rewritten.",
        },
        {
          title: "AI available on at least two tasks",
          body: "More than one data point on how they work with a model. You can switch it off anywhere.",
        },
        {
          title: "Behavioural scoring levels, with examples",
          body: "Every level describes observable behaviour and shows an example. “Good quality” is rejected as a level.",
        },
      ],
    },

    closing: {
      title: "Which ones you get depends on the role.",
      body: "A field sales role and a back-office analyst do not get the same simulation. Send us a posting and see.",
      cta: "Book a demo",
    },
  },

  // ── La notation ─────────────────────────────────────────────────────────
  scoring: {
    meta: {
      title: "Scoring: how Onbord turns an answer into a defensible number",
      description:
        "Sub-dimensions, behavioural scales, verified quotes, deterministic correction where possible, and a measured view of how candidates used AI.",
    },
    eyebrow: "Scoring",
    titleA: "A number you can",
    titleEm: "defend",
    titleB: "in the room.",
    lede: "When someone asks why this candidate is above that one, the answer is a sentence the candidate wrote.",

    blocks: [
      {
        index: "01",
        kicker: "Structure",
        title: "Skills are too big to score. Sub-dimensions are not.",
        body: [
          "“Teamwork” cannot be marked out of five. Each skill splits into two or three sub-dimensions, and each gets a three-level scale: 1 below expectations, 3 as expected, 5 excellent, where every level describes visible behaviour with a written example. Vague levels are rejected at generation.",
        ],
      },
      {
        index: "02",
        kicker: "Evidence",
        title: "Nothing is asserted without a quotation.",
        body: [
          "Each mark comes with a justification and a verbatim extract, and the extract is tested against the text the candidate actually submitted. Anything that is not a genuine substring of it is discarded before you see the report.",
        ],
      },
      {
        index: "03",
        kicker: "Determinism",
        title: "If it can be checked without a model, it is.",
        body: [
          "Three parts of a simulation never go near a language model: a multiple choice against the correct index, code by running the tests, a CRM field compared string by string. Judgement is kept for what needs it: prose, reasoning, tone, the quality of a decision.",
        ],
      },
      {
        index: "04",
        kicker: "AI",
        title: "How they used the model is part of the result.",
        body: [
          "The whole conversation with the assistant is stored and read, and candidates are told so before they start. Using it is not scored — how it's used is: framing the problem, iterating on the reply, reviewing what comes back with a critical eye.",
          "Separately, when a chunk of an answer is reproduced word for word from the assistant, that answer's score is capped and the report names the percentage copied. What is assessed is still what the candidate produced.",
        ],
      },
      {
        index: "05",
        kicker: "The decision",
        title: "The machine ranks. A person decides.",
        body: [
          "No candidate is ever automatically rejected by Onbord. Onbord only builds a shortlist: the recruiter always makes the final call. What comes out is a ranking and the evidence behind it, and who gets interviewed is a human call made at your company. The criteria were yours before the first candidate saw them, and any candidate can ask for a human review.",
        ],
      },
      {
        index: "06",
        kicker: "Afterwards",
        title: "The rejected candidate gets a real answer.",
        body: [
          "Because the evidence exists, feedback costs nothing extra: 120 to 180 words naming one or two genuine strengths and what made the difference for this role. If the data is too thin to say anything true, nothing is invented, the system says so instead.",
        ],
      },
    ],

    closing: {
      title: "Ask to see a real report.",
      body: "Not a slide about reports: a real one, on a real posting. The fastest way to judge whether any of this is true.",
      cta: "Book a demo",
    },
  },

  // ── Tarifs ──────────────────────────────────────────────────────────────
  pricing: {
    meta: {
      title: "Pricing: Onbord",
      description:
        "Two plans, credits spent on four things only, and the arithmetic in the open. Core from €100 a month, billed annually.",
    },
    eyebrow: "Pricing",
    titleA: "Straightforward pricing",
    titleEm: "",
    titleB: "",
    lede: "Credits are spent on four things. Everything in between is unlimited and free.",

    annual: "Annual",
    monthly: "Monthly",
    perMonth: "/month",
    billedAnnually: "billed annually",
    billedMonthly: "billed monthly",
    save: "2 months free",
    popular: "Most chosen",
    creditsPerMonth: "credits per month",
    rollover: "Unused credits roll over",
    onQuote: "On quote",
    tailored: "Tailored volume",

    plans: {
      core: {
        name: "Core",
        for: "For a team hiring steadily.",
        features: [
          "Automatic skill extraction from any posting",
          "AI-generated work simulations",
          "Evidence-based scoring with verified quotes",
          "Your logo, colour and tone on the candidate side",
          "Video and live-situation steps",
          "Email support",
        ],
        cta: "Choose Core",
      },
      pro: {
        name: "Pro",
        for: "For continuous hiring across several roles.",
        includes: "Everything in Core, plus:",
        features: [
          "Dedicated Slack channel",
          "Priority support",
        ],
        cta: "Choose Pro",
      },
      custom: {
        name: "Custom",
        for: "For high volume, or particular constraints.",
        includes: "Everything in Pro, plus:",
        features: [
          "Volume priced to your numbers",
          "Dedicated account manager",
          "Onboarding with your team",
        ],
        cta: "Talk to sales",
      },
    },

    credits: {
      kicker: "The credit table",
      title: "Four things cost credits.",
      lede: "That is the whole list. Editing by hand, publishing, inviting, reporting and sending feedback cost nothing.",
      rows: [
        {
          what: "Generate a simulation",
          cost: "6",
          when: "Charged when the agent has created the simulation: the first time, and on every full regeneration.",
          detail:
            "A generation that fails costs nothing. Parsing the job ad, choosing the skills, your edits and publishing are included.",
        },
        {
          what: "Rewrite a step",
          cost: "2",
          when: "Charged for each step the agent rewrites in full.",
          detail:
            "To redo one step without redoing the whole journey. Editing it yourself costs nothing.",
        },
        {
          what: "A candidate starts",
          cost: "1",
          when: "Charged when they actually enter the simulation.",
          detail:
            "An invited candidate who never begins costs nothing. Once per candidate, never twice.",
        },
        {
          what: "A candidate is scored",
          cost: "2",
          when: "Charged on submission, when the marking runs.",
          detail:
            "Never charged again, even if you reopen the report.",
        },
      ],
      totalLabel: "One candidate, start to finish",
      totalValue: "3 credits",
    },

    maths: {
      kicker: "What that buys",
      title: "The same sum you would do yourself.",
      lede: "No “up to X candidates” with the workings hidden. Here they are.",
      jobsLabel: "simulations created",
      resultLabel: "candidates assessed",
      note: "The point is that you can work this table out before you sign, and check it afterwards.",
      assumption: "This table assumes every invited candidate finishes. In practice, some won't: that only stretches your credits further, never less.",
    },

    faq: {
      kicker: "Before you ask",
      items: [
        {
          q: "Do unused credits carry over?",
          a: "Yes, on an annual plan. Whatever you don't use in a month is added to the next: use 200 of Pro's 500 credits in June, and July starts with 800. The balance resets when the year renews.",
        },
        {
          q: "Is there a free trial?",
          a: "Better: send us a real posting. We build the simulation and show you the whole thing, what a candidate sits through, and what you would read afterwards.",
        },
        {
          q: "Can candidates be assessed in a different language from ours?",
          a: "Yes. The candidate experience follows the language of the posting, English, French or Dutch, whatever language your team uses in the app.",
        },
        {
          q: "Do you charge per user?",
          a: "No. Seats are not metered, and colleagues reviewing candidates cost nothing.",
        },
      ],
    },

    closing: {
      title: "Still the fastest way to decide: send a posting.",
      body: "You see the simulation, the scoring grid and a real report before any money is discussed.",
      cta: "Book a demo",
    },
  },

  // La page « métiers business » (refaite le 14/10/2026). Trois blocs : les
  // familles de rôles, avec les seuls INTITULÉS des postes (ni description du
  // métier, ni a fortiori de l'exercice : c'est la matière de la démo, pas de
  // la vitrine) ; les quatre façons de travailler, et l'IA « là où elle a sa
  // place » (PAS « dans toutes » : elle n'est pas dans l'appel en direct, et
  // l'assistant s'ouvre étape par étape) ; puis le fonctionnement (personnages,
  // simulation construite sur vos données, copilote). Tout ce qui est dit ici
  // existe dans l'application (règle 2) : appel et chat (`persona`), e-mail,
  // document, tableur, boîte de réception, tableau, assistant IA. Le CRM et le
  // code sont EN PAUSE côté application : ils n'apparaissent pas ici.
  business: {
    meta: {
      title: "Business roles: Onbord",
      description: "Work simulations for sales, customer success, finance, HR and operations roles, built from your company, your job posting and the skills you need.",
    },
    titleA: "Simulations for",
    titleEm: "business roles.",
    titleB: "",
    lede: "Sales, customer success, finance, people and operations: five families that cover most of the business roles a company hires for.",
    families: {
      kicker: "The roles",
      title: "Five families, most of business hiring.",
      label: "Role families",
      items: [
        {
          id: "sales",
          name: "Sales and business development",
          roles: [
            "Sales Development Representative",
            "Business Developer",
            "Account Executive",
            "Account Manager",
            "Sales Manager",
            "Sales Director",
          ],
        },
        {
          id: "success",
          name: "Customer success and support",
          roles: [
            "Customer Support",
            "Customer Success",
            "Customer Success Manager",
            "Support Team Lead",
          ],
        },
        {
          id: "finance",
          name: "Finance",
          roles: [
            "Financial Analyst",
            "FP&A Analyst",
            "Business Controller",
          ],
        },
        {
          id: "people",
          name: "People and leadership",
          roles: [
            "Recruiter",
            "Talent Acquisition",
            "HR Business Partner",
            "People Operations",
            "HR Manager",
            "Chief of Staff",
          ],
        },
        {
          id: "operations",
          name: "Operations",
          roles: [
            "Operations Manager",
            "Product Manager",
            "Project Manager",
            "Business Operations Analyst",
          ],
        },
      ],
      note: "Your role isn't listed? If the job is done through conversations, writing and decisions, we can build it. Send us the posting.",
    },
    ways: {
      kicker: "How they work",
      title: "Four ways of working.",
      lede: "The formats the job is actually made of, built around your role. And AI where it belongs.",
      items: [
        { id: "call", title: "Live call", body: "A spoken conversation in real time with a client, a prospect or a colleague, who answers back." },
        { id: "chat", title: "Chat and email", body: "Messages that wait for a reply: a client on chat, a teammate on team chat, an email that needs the right tone." },
        { id: "document", title: "Documents", body: "Something to produce: a spreadsheet to work through, a proposal, a plan, any business document." },
        { id: "inbox", title: "Inbox and priorities", body: "A full inbox and a task board: what to answer, what to delegate, what can wait." },
      ],
      ai: {
        title: "AI, the way they would use it at work",
        body: "On the steps where it makes sense, candidates can work with an AI assistant, as they would on the job. We look at how they use it: what they ask, what they check, and what they make their own.",
      },
    },
    how: {
      kicker: "How it works",
      title: "A real simulation, with someone on the other side.",
      lede: "Not a questionnaire. The candidate talks and writes to people who answer back, and the conversation goes where their answers take it.",
      cast: {
        title: "Characters, not scripts.",
        body: "We built characters for every simulation: a client, a prospect, a colleague, a manager. Each one has a role, a personality and motivations of their own, and a few things they won't say unless they're asked the right way.",
        wantsLabel: "Wants",
        hiddenLabel: "Keeps to themselves",
        people: [
          { name: "Marc Peeters", role: "Procurement manager", mood: "Busy, sceptical", wants: "A lower price before he signs anything." },
          { name: "Thomas Leroy", role: "Your new team lead", mood: "Friendly, overloaded", wants: "Half of his backlog off his desk by Friday." },
        ],
      },
      custom: {
        title: "Made for your company, every time.",
        body: "No simulation comes off a shelf. Each one is built from your own material: your company context, the job posting, and the skills the role requires.",
        inputs: [
          { id: "company", label: "Company context", value: "B2B software for logistics, 40 people, sells to mid-size carriers." },
          { id: "posting", label: "Job posting", value: "Account Executive, Benelux" },
          { id: "skills", label: "Required skills", chips: ["Discovery", "Negotiation", "Written follow-up"] },
        ],
        output: {
          label: "Your simulation",
          title: "Account Executive, Benelux",
          meta: "4 steps, about 20 minutes",
          covered: "covered",
        },
      },
      copilot: {
        title: "Adjust it in plain words.",
        body: "The Onbord copilot builds the simulation with you. Tell it what's true about your team, and it rewrites the steps, the characters and the scoring to match.",
        window: "Onbord copilot",
        hello: "Your simulation is ready: four steps, about 20 minutes. What should I change?",
        try: "Try it",
        changedLabel: "Changed",
        reset: "Start over",
        suggestions: [
          { ask: "Our buyers are procurement teams, not founders.", reply: "Done. The call is now with a procurement manager who is comparing you with two other suppliers.", changed: "Step 1 rewritten, character updated" },
          { ask: "Make the client harder to convince.", reply: "He now pushes back twice on price, and asks for a reference before agreeing to a second meeting.", changed: "Character updated" },
          { ask: "Add a written follow-up after the call.", reply: "Added: a follow-up email to the same client the next morning, covering what was agreed on the call.", changed: "Step added, scoring grid updated" },
        ],
      },
    },
    closing: {
      title: "Hiring for one of these roles?",
      body: "Send us the posting: we build the simulation and show it to you before any candidate sees it.",
      cta: "Book a demo",
    },
  },

  // La partie « Resources » (15/10/2026) : les LIBELLÉS autour des articles.
  // Les articles eux-mêmes sont dans src/content/resources.js, en anglais.
  resources: {
    meta: {
      title: "Resources: Onbord",
      description: "Articles, honest comparisons and documentation about hiring on what people can actually do.",
    },
    eyebrow: "Resources",
    title: "Resources",
    lede: "Articles, honest comparisons and, soon, documentation. Everything about hiring on what people can actually do.",
    tabsLabel: "Categories",
    all: "All",
    soon: "Soon",
    cats: {
      blog: { name: "Blog", title: "Blog", lede: "How job simulations fit into the way you already hire." },
      comparisons: { name: "Comparisons", title: "Comparisons", lede: "Onbord next to the tools teams compare it with. Every claim about them is sourced." },
      docs: { name: "Documentation" },
    },
    empty: "Nothing here yet.",
    article: {
      back: "All resources",
      reviewed: "Last reviewed:",
      bottomLine: "Bottom line:",
      faq: "Frequently asked questions",
      related: "Related",
      by: "Written by",
      vs: "vs",
    },
    closing: {
      title: "See it on one of your roles.",
      body: "Send us a job posting: in 20 minutes we build your first simulation together, free.",
      cta: "Book a demo",
    },
  },

  // La page /demo : coordonnees d'abord, calendrier ensuite (DemoForm.js).
  demo: {
    meta: {
      title: "Book a demo: Onbord",
      description: "Leave your details and pick a time. We walk you through a real simulation built from one of your job postings."
    },
    eyebrow: "Takes 30 seconds",
    title: "Book a demo.",
    lede: "Tell us who you are, then pick a time that suits you.",
    firstName: "First name",
    lastName: "Last name",
    company: "Company name",
    email: "Work email",
    firstNamePh: "Jane",
    lastNamePh: "Smith",
    companyPh: "Acme Inc.",
    emailPh: "jane@acme.com",
    submit: "Continue to pick a time",
    sending: "One moment",
    missing: "Please fill in every field.",
    badEmail: "Please enter a valid email address.",
    privacy: "We only use these details to prepare your demo.",
    pickEyebrow: "Step 2 of 2",
    pickTitle: "Pick a time.",
    pickLede: "Thanks, {name}. Choose a slot, and the confirmation goes to {email}.",
    edit: "Edit my details"
  },
};

export default pages;
