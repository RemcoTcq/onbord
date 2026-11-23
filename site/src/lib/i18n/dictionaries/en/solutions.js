// Les trois pages « Solutions » (10/11/2026, demande directe), gabarit
// CasUsage.js : deux cas d'usage (hiring, onboarding) et un secteur (saas).
// Les titres, intros, blocs, questions et appels sont ceux de Remco ; les
// RÉPONSES de la FAQ et le contenu des visuels ont été écrits ici.
//
// ⚠️ Règle 2 (site/AGENTS.md) : tout doit être vrai dans l'application.
//   - recrutement : vrai (conversation `persona`, points de contrôle,
//     classement, présélection « Shortlist », retour modifiable puis envoyé,
//     ~20 minutes, consentement IA du candidat, fr/en/nl) ;
//   - ONBOARDING : N'EXISTE PAS ENCORE. La page `onboarding`, les blocs
//     `modules` et `updated` de la page `saas` et leurs réponses décrivent le
//     produit à venir ;
//   - « weeks sooner » (saas) n'est mesuré nulle part.
// Les visuels reprennent les noms du reste du site : Daniel Visser (le
// client simulé), Lucas Martens (la recrue), Sarah D. (la candidate).

const solutions = {
  faqTitle: "Frequently asked questions",

  hiring: {
    meta: {
      title: "Hiring with customer simulations | Onbord",
      description: "Hire sales, customer success and support people on what they actually do with a customer: realistic simulations, clear scorecards and feedback for every candidate.",
    },
    tag: "Hiring",
    title: "Hire smarter, faster.",
    lede: "Onbord uses realistic customer simulations and clear scorecards to help you find the right people for sales, customer success and support, without relying on gut feeling.",
    blocks: [
      {
        key: "simulations",
        title: "Realistic customer simulations",
        body: "See how candidates handle customers before you hire them. They chat, email, call or meet a simulated customer built from your job posting and your company.",
        visual: "conversation",
        alt: "A candidate in a chat with Daniel Visser, a simulated customer who pushes back on the price.",
      },
      {
        key: "scorecards",
        title: "Scorecards you can trust",
        body: "Every candidate is scored on clear checkpoints you approve. Each score shows the exact words behind it.",
        visual: "report",
        alt: "A criterion opened up: each checkpoint met or missed, with the candidate's own words under it.",
      },
      {
        key: "ranking",
        title: "Find your best candidates fast",
        body: "Candidates are ranked on the same situations, so you compare like for like. Shortlist the best in one click.",
        visual: "cands",
        alt: "The candidates for a job, ranked by overall score.",
      },
      {
        key: "feedback",
        title: "Feedback for every candidate",
        body: "Every candidate gets a personal answer based on what they actually did. Edit it and send it in two clicks.",
        visual: "feedback",
        alt: "The feedback email sent to a candidate, quoting what she did in the simulation.",
      },
    ],
    faq: [
      { q: "Can the simulation match our roles and processes?", a: "Yes. Each simulation is built from your job posting and your company, so the customer talks like yours and the situations follow your process. You review every step before you send it." },
      { q: "How long does a simulation take for a candidate?", a: "About twenty minutes. You see the duration before you send it, and candidates take it from a single link, whenever suits them." },
      { q: "Which languages does Onbord support?", a: "English, French and Dutch. Each simulation runs in one language, chosen when you create it." },
      { q: "Do candidates know they're talking to AI?", a: "Yes. Before they start, candidates accept that AI analyses their answers, and that a person at your company makes the final decision." },
      { q: "Do we need to integrate anything?", a: "No. You share one link. Nothing to install, nothing to connect to your current tools." },
    ],
    cta: "Ready to see who can really do the job?",
  },

  onboarding: {
    meta: {
      title: "New hire onboarding with customer simulations | Onbord",
      description: "Get new sales, customer success and support hires ready faster: practice modules built from your company, clear feedback, and one place to see who is ready.",
    },
    tag: "New hire onboarding",
    title: "Get new hires ready faster.",
    lede: "Onbord turns your pitch deck and company knowledge into realistic practice, so new hires handle real customer conversations before they meet a real customer.",
    blocks: [
      {
        key: "practice",
        title: "Practice from day one",
        body: "Shrink the learning curve. New hires practice the conversations of their role from their first day, instead of learning on real customers.",
        visual: "modules",
        alt: "Lucas Martens's page: five assigned modules, three validated, and the latest attempt with each checkpoint and the words behind it.",
      },
      {
        key: "company",
        title: "Built from your company",
        body: "Upload your pitch deck, product information and common customer questions. Onbord turns them into practice modules for each role.",
        visual: "source",
        alt: "The company documents that feed the simulations: pitch deck, product guide and customer questions in use, last year's pricing set aside.",
      },
      {
        key: "feedback",
        title: "Clear feedback on every module",
        body: "Every module is scored on clear checkpoints, with the exact words behind each score. New hires know what to improve.",
        visual: "done",
        alt: "What a new hire sees after an attempt: the score against the pass mark, then each expected point scored 0, 1 or 2 with their own words.",
      },
      {
        key: "ready",
        title: "See who's ready",
        body: "Follow every new hire's progress in one place. Know who's ready for real customers, and who needs more practice.",
        visual: "ready",
        alt: "The new hires still onboarding: modules validated and average score for each.",
      },
    ],
    faq: [
      { q: "How does Onbord shorten ramp time?", a: "New hires practice the real conversations of their role before they meet a customer, and every module tells them what to improve. By their first real call, they have already had it several times." },
      { q: "What do we need to provide?", a: "Your pitch deck, your product information and the questions your customers ask most. Onbord builds the modules from them, and you review each one before it goes out." },
      { q: "Does it replace our training sessions?", a: "No. It adds the practice. Your team keeps teaching, and new hires rehearse what they learned with simulated customers until it sticks." },
      { q: "Which roles does it work for?", a: "Customer-facing roles in B2B SaaS: SDRs, BDRs, account executives, account managers, sales managers, customer success managers and support teams." },
      { q: "Can managers follow progress?", a: "Yes. Every new hire's modules, scores and progress are in one place, so managers see who is ready for real customers and who needs more practice." },
    ],
    cta: "Ready to get your next hire up to speed?",
  },

  saas: {
    meta: {
      title: "Customer simulations for B2B SaaS teams | Onbord",
      description: "Hire and ramp SaaS sales, customer success and support teams on realistic customer conversations: demos, renewals and urgent tickets, by chat, email, phone or video call.",
    },
    tag: "B2B SaaS",
    title: "SaaS moves fast.",
    lede: "Your sales, customer success and support teams need to learn quickly, keep up with product changes and handle demanding customers from day one.",
    blocks: [
      {
        key: "hire",
        title: "Hire people who can handle your customers",
        body: "Growing teams hire every quarter. Onbord shows you who can handle a demo, a renewal or an urgent ticket before you hire them.",
        visual: "cands",
        alt: "The candidates for a job, ranked by overall score.",
      },
      {
        key: "onboarding",
        title: "Faster onboarding",
        body: "Get new hires ready weeks sooner. They practice on your product and your customers before their first real conversation.",
        visual: "modules",
        alt: "A new hire's page: five assigned modules, three validated, and the latest attempt with each checkpoint.",
      },
      {
        key: "product",
        title: "Keep up with your product",
        body: "New features, new pricing, new processes. Your team practices the new message before it reaches a customer.",
        visual: "updated",
        alt: "A practice module, Present the new pricing, published and ready to regenerate from the company's updated documents.",
      },
      {
        key: "channels",
        title: "Every customer conversation covered",
        body: "From the first prospect email to the renewal call and the support ticket, Onbord simulates them all, by chat, email, phone or video call.",
        visual: "channels",
        alt: "The four channels side by side: chat, email, phone and video call.",
      },
    ],
    faq: [
      { q: "Which SaaS teams is Onbord for?", a: "Customer-facing teams: SDRs, BDRs, account executives, account managers, sales managers, customer success managers and support." },
      { q: "Can it handle a technical product?", a: "Yes. Simulations are built from what you tell Onbord about your company and your product, so the customer asks about your features, in your terms. You review every step before it goes out." },
      { q: "Which languages does Onbord support?", a: "English, French and Dutch. Each simulation runs in one language, chosen when you create it." },
      { q: "Where is our data stored?", a: "In the European Union, on servers in Paris. Nothing your team says in a simulation is used to train any AI model." },
    ],
    cta: "Ready to hire and ramp faster?",
  },

  // ── Le contenu des visuels (CasVisuels.js) ────────────────────────────────
  visuals: {
    report: { name: "Amine B.", pct: "88%" },
    // Libellés du chat candidat de l'application (candidate.js, `persona`).
    conversation: {
      initials: "DV",
      name: "Daniel Visser",
      status: "Online",
      step: "Step 2 of 3 · Chat",
      contextLabel: "Situation:",
      context: "Daniel leads sales ops at Brightline. He answered your email, but he isn't convinced yet.",
      messages: [
        { from: "them", text: "We already pay for a CRM. Why would we add another tool?" },
        { from: "me", text: "Fair question. What happens today when a rep forgets to log a call?" },
        { from: "them", text: "We lose the history. Last quarter it cost us two renewals." },
      ],
      typing: "Daniel is typing…",
      placeholder: "Your message to Daniel…",
    },
    // Libellés du retour candidat de l'application (dashboard.js, `feedback`).
    // Le corps est celui de `common.mocks.feedback`, onglet « Not selected ».
    feedback: {
      title: "Feedback: Sarah D.",
      sent: "Sent on 12 Nov",
      toLabel: "To",
      to: "sarah.d@email.com",
      subjectLabel: "Subject",
      subject: "Your application for Account Executive",
    },
    // L'onboarding, recopié de l'application le 23/11/2026 (CasVisuels.js) :
    // libellés de dashboard.js (`knowledge.documents`, `onb.modules`,
    // `learner.attempt`). Lucas Martens est la recrue de la fenêtre
    // (home.moments.onboardingApp) : son essai sur le renouvellement est
    // celui de sa fiche, 75 %.
    source: {
      title: "Documents",
      count: "3 of 4 used by the simulations.",
      inUse: "In use",
      aside: "Set aside",
      docs: [
        { title: "Pitch deck 2026", meta: "Pitch deck · 18,240 characters · 4 Nov", on: true },
        { title: "Product guide", meta: "Product · 42,915 characters · 4 Nov", on: true },
        { title: "Top customer questions", meta: "FAQ · 6,380 characters · 6 Nov", on: true },
        { title: "Pricing 2025", meta: "Pricing · 3,112 characters · 12 Jan", on: false },
      ],
    },
    done: {
      attempt: "Attempt 2 · 18 Nov",
      title: "Renewal call with a hesitant customer",
      scoreLabel: "Your score",
      score: 75,
      passMark: "Module pass mark: 70%",
      passed: "Pass mark reached",
      skills: "Skill by skill",
      hint: "Each expected point: 0 = missing, 1 = partial, 2 = mastered.",
      skill: "Securing the renewal",
      skillScore: 75,
      points: [
        { s: 2, d: "Asks what changed since last year", v: "“What's different for your team compared to last year?”" },
        { s: 2, d: "Links the price to the value used", v: "“Your reps logged 1,400 calls through the sync this year.”" },
        { s: 1, d: "Answers the budget concern", v: "“I understand, budgets are tight everywhere.”" },
        { s: 1, d: "Agrees a dated next step", v: "“Let's talk again before the end of the month.”" },
      ],
    },
    updated: {
      crumb: "Modules",
      title: "Present the new pricing",
      channel: "phone",
      channelName: "Phone call",
      chips: ["Account manager", "English", "Medium", "pass mark 70%"],
      state: "Published",
      regenerate: "Regenerate",
      step: "Step 1 · Phone call",
      stepTitle: "Explain the new plans to an existing customer",
      persona: {
        initials: "MD",
        name: "Marc Dubois",
        role: "CFO · Northwind Logistics",
        personality: "Direct, watches every euro, wants the numbers before the story.",
      },
    },
    channels: [
      { key: "chat", name: "Chat", use: "Live support" },
      { key: "email", name: "Email", use: "First outreach" },
      { key: "phone", name: "Phone call", use: "Renewal call" },
      { key: "video", name: "Video call", use: "Product demo" },
    ],
  },
};

export default solutions;
