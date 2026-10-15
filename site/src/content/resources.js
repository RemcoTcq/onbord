// ─────────────────────────────────────────────────────────────────────────────
// Le CONTENU de la partie « Resources » : articles de blog et comparaisons
// (15/10/2026). La documentation viendra plus tard (onglet « Soon »).
//
// ⚠️ CE N'EST PAS UN DICTIONNAIRE. Les articles sont écrits en ANGLAIS
// seulement, et c'est voulu : ce sont de longs textes de référencement, pas
// des libellés d'interface, et le site n'est publié qu'en anglais. Les
// libellés AUTOUR des articles (onglets, « Bottom line », « FAQ »...) sont,
// eux, dans les trois dictionnaires (`pages.resources`).
//
// Les textes sont ceux fournis par Remco, mot pour mot, à trois retouches
// près, toutes pour la règle 2 (le site ne dit que ce qui est vrai) :
//   • nos prix portent « billed annually » : 100 et 300 € sont les prix
//     mensuels sous engagement ANNUEL (120 et 360 € au mois, src/lib/pricing.js),
//     exactement comme les prix TestGorilla cités à côté ;
//   • les « (coming soon) » qui renvoyaient d'un article à l'autre sont
//     devenus des liens : les trois pages sont publiées ensemble ;
//   • la comparaison AssessFirst reçoit le même avertissement de sources et
//     de marques que la comparaison TestGorilla, qui en avait un et pas elle.
//
// ── Le format ────────────────────────────────────────────────────────────────
// Un article est une liste de BLOCS (`body`), rendus par ArticleBody.js :
//   { t: "p", x }                paragraphe
//   { t: "h2", x } / { t: "h3", x }
//   { t: "callout", lead, x }    encadré, phrase d'attaque en gras
//   { t: "bottom", x }           « Bottom line: », l'encadré de fin de section
//   { t: "list", items }         puces, chaque item [attaque en gras, suite]
//   { t: "steps", items }        liste numérotée, même forme
//   { t: "table", head, rows, note }
// Dans le texte, `[libellé](/chemin)` fait un lien interne, et
// `[libellé](demo)` ouvre la page de démo. Les chemins sont CANONIQUES (sans
// langue) : le rendu ajoute le préfixe.
// ─────────────────────────────────────────────────────────────────────────────

const ONBORD_PRICE = `Core €100/month, Pro €300/month, billed annually; Custom on quote`;

export const AUTHOR = { name: `Remco Tacquenier`, role: `Co-founder, Onbord` };

export const ARTICLES = [
  // ── Blog ──────────────────────────────────────────────────────────────────
  {
    slug: `onbord-and-your-ats`,
    category: `blog`,
    date: `2026-10-15`,
    seoTitle: `Onbord and Your ATS: Why You Need Both (2026)`,
    description: `An ATS organises your applicants. Onbord shows you what they can actually do. Why Onbord doesn't replace your ATS, and where it fits in your hiring process.`,
    title: `Onbord and your ATS: why you need both`,
    excerpt: `An ATS organises your applicants. Onbord shows you what they can actually do. Why the two work best side by side.`,
    cover: { kind: `plus`, label: `Your ATS` },
    body: [
      { t: `p`, x: `One of the first questions teams ask us is simple: "We already have an ATS. Is Onbord another one?" The answer is no. An ATS and Onbord do two different jobs, and they work best side by side.` },
      { t: `p`, x: `An ATS organises your hiring: who applied, where each candidate stands, who said what. Onbord answers the question an ATS was never built to answer: can this person actually do the job?` },
      { t: `h2`, x: `What an ATS does well` },
      { t: `p`, x: `An applicant tracking system, such as Teamtailor, Recruitee, Workable or Greenhouse, is the backbone of a hiring process. It publishes your job offers, collects applications in one place, moves candidates through a pipeline, keeps the history of every exchange and lets hiring managers and recruiters work on the same file.` },
      { t: `p`, x: `Many ATS now add AI on top: reading CVs automatically, ranking applications against the job description, or searching the candidate database in plain language.` },
      { t: `p`, x: `All of that saves time. It turns a pile of emails into a process.` },
      { t: `h2`, x: `What an ATS can't tell you` },
      { t: `p`, x: `Everything an ATS stores comes from what candidates say about themselves: their CV, their cover letter, their answers to a few screening questions. Reading CVs faster, even with AI, still means sorting claims.` },
      { t: `p`, x: `The question that decides a hire is different: how will this person handle the work? How do they write to a client who is unhappy? How do they handle an objection in a conversation? How do they work with AI when nobody is watching over their shoulder? No pipeline stage answers that.` },
      { t: `p`, x: `That gap is where hiring mistakes slip through, and it is the one Onbord is built to close.` },
      { t: `h2`, x: `What Onbord adds` },
      { t: `p`, x: `Onbord is a job simulation platform. You start from your job description, and AI generates a simulation of the role.` },
      { t: `list`, items: [
        [`Candidates do the work.`, `They write the email a client is waiting for, handle a conversation on video, and answer open questions about real situations of the role.`],
        [`Every score comes with evidence.`, `Each skill is broken into checkpoints scored 0, 1 or 2, and each checkpoint quotes the passage of the candidate's answer that justifies it. Must-have skills are separated from nice-to-haves.`],
        [`AI is part of the picture.`, `Candidates keep an AI assistant during the simulation, and how they use it is visible in the results.`],
        [`Every candidate hears back.`, `Onbord generates written feedback on each candidate's assessment. You review it and send it on your company's behalf in two clicks.`],
      ] },
      { t: `h2`, x: `ATS and Onbord at a glance` },
      { t: `table`, head: [``, `Your ATS`, `Onbord`], rows: [
        [`Main job`, `Organise, track and share applications`, `Show what candidates can actually do`],
        [`What you learn`, `Background, CV, status in the process`, `How each candidate handles tasks from the role, with evidence`],
        [`Role of AI`, `Read CVs, rank applications, search the database`, `Generate the simulation, score checkpoints, prepare feedback`],
        [`When`, `From application to hire`, `Between the first shortlist and the interviews`],
        [`Candidate communication`, `Process messages and statuses`, `Feedback on the assessment, edited by you and sent in two clicks`],
      ] },
      { t: `h2`, x: `Where Onbord fits in your hiring process` },
      { t: `steps`, items: [
        [`Publish and collect in your ATS.`, `Your job offer, your applications and your pipeline stay where they are.`],
        [`Shortlist as usual.`, `Use your ATS, your screening questions or your own judgement to decide who moves forward.`],
        [`Invite the shortlist to an Onbord simulation.`, `Each candidate does the work of the role.`],
        [`Read the evidence.`, `Compare candidates checkpoint by checkpoint, with their own words behind every score.`],
        [`Interview the right people.`, `Spend interview time on the candidates who showed they can do the job, and use their answers to ask sharper questions.`],
        [`Close the loop.`, `Send feedback to every candidate in two clicks, and record your decision in your ATS.`],
      ] },
      { t: `p`, x: `Your ATS stays the system of record. Onbord adds the step that was missing between a CV and an interview.` },
      { t: `h3`, x: `Do you need an ATS to use Onbord?` },
      { t: `p`, x: `No. Onbord works on its own, whether you manage applications in an ATS, a spreadsheet or your inbox. If you hire a few people a year, you can start with Onbord and add an ATS later.` },
      { t: `h3`, x: `Does Onbord integrate with my ATS?` },
      { t: `p`, x: `Today, Onbord works alongside your ATS rather than inside it: you invite candidates to the simulation and bring your decision back into your ATS. Native ATS integrations are planned, and we will update this article as soon as they are available.` },
      { t: `h2`, x: `Bottom line` },
      { t: `p`, x: `An ATS and Onbord don't compete. Your ATS keeps your hiring organised. Onbord tells you who can actually do the job before you spend time in interviews. Together, they give you a process that is both tidy and well informed.` },
      { t: `p`, x: `Want to see it on one of your roles? [Book 20 minutes](demo) and we'll build your first simulation together, free.` },
    ],
    faq: [
      [`Is Onbord an ATS?`, `No. Onbord doesn't publish job offers, manage a pipeline or store your candidate database. It assesses candidates with a simulation of your role.`],
      [`Does Onbord replace my ATS?`, `No. Keep your ATS for tracking applications, and use Onbord to see what your shortlisted candidates can do.`],
      [`Can I use Onbord without an ATS?`, `Yes. Onbord works on its own, whatever tool you use to manage applications.`],
      [`Does Onbord connect to Teamtailor, Recruitee or Workable?`, `Not natively yet. Onbord works alongside any ATS today, and native integrations are planned.`],
      [`My ATS already ranks CVs with AI. Why add Onbord?`, `Ranking CVs sorts what candidates say about themselves. Onbord shows what they do when you give them the work, with evidence behind every score.`],
    ],
    related: [`onbord-vs-testgorilla`, `onbord-vs-assessfirst`],
    legal: `All trademarks mentioned belong to their respective owners and are used for identification purposes only, with no affiliation or endorsement implied.`,
  },

  // ── Comparaisons ──────────────────────────────────────────────────────────
  {
    slug: `onbord-vs-testgorilla`,
    category: `comparisons`,
    date: `2026-10-15`,
    reviewed: `October 2026`,
    seoTitle: `Onbord vs TestGorilla: In-Depth Review (2026)`,
    description: `TestGorilla screens with a library of 350+ standardised tests. Onbord generates a simulation of your role and scores every answer with evidence. An honest, sourced comparison.`,
    title: `Onbord vs TestGorilla`,
    subtitle: `In-depth review`,
    lede: `Choosing a candidate assessment tool? We compare both approaches head to head, with every claim about TestGorilla checked against its own website.`,
    excerpt: `A library of 350+ standardised tests, or a simulation of your own role. An honest, sourced comparison.`,
    cover: { kind: `vs`, logo: { src: `/logos/testgorilla.svg`, alt: `TestGorilla`, width: 224, height: 53 } },
    body: [
      { t: `p`, x: `Almost every team that wants to look beyond the CV ends up on TestGorilla's website. Based in Amsterdam, it made skills testing self-serve: a library of 350+ tests, free resume scoring and qualifying questions, and a free plan you can start in minutes. According to TestGorilla, more than 60,000 organisations have used it since 2020, and it assesses around 7 million candidates a year.` },
      { t: `p`, x: `The TestGorilla of 2026 is more than a test library. It now sells two products, Gorilla Sourcing and Gorilla Assessments, each with its own plans. AI interviews, ATS integrations and a new library of job simulations sit on the Plus plan.` },
      { t: `p`, x: `That is the honest difference between TestGorilla and Onbord. It is not tests against no tests. It is a library of standardised tests you pick from, against a simulation of your own role that AI builds for you.` },
      { t: `callout`, lead: `The short answer.`, x: `TestGorilla is the reference for fast, high-volume screening with standardised tests. Onbord generates a simulation of the role you're hiring for and scores every answer with the candidate's own words as evidence. Choose TestGorilla to filter many applicants on general skills. Choose Onbord to see who can actually do the job before you spend time in interviews.` },
      { t: `h2`, x: `Built from a test library vs built from your job description` },
      { t: `p`, x: `**TestGorilla's approach:** a catalogue of tests written by subject-matter experts, assembled into an assessment by you or by its AI job builder, which picks tests and questions to match your job description. Its job simulations follow the same model: a library of ready-made scenarios for customer service, sales, engineering and cross-functional roles, each with a rubric built by TestGorilla's science team. TestGorilla says custom simulations are on its roadmap.` },
      { t: `p`, x: `**Onbord's approach:** you start from your job description, and AI generates a simulation of that role: the email a client is waiting for, the conversation to handle on video, the situations the person will meet in their first weeks. You decide which skills are must-haves, and each one is scored on explicit checkpoints.` },
      { t: `p`, x: `The gap shows up in three places a hiring manager feels every week: how close the assessment is to the real job, what you can read behind a score, and what the candidate hears back.` },
      { t: `h2`, x: `At-a-glance comparison` },
      { t: `table`, head: [`Category`, `Onbord`, `TestGorilla`], rows: [
        [`Starting point`, `Your job description`, `A library of 350+ tests`],
        [`What the candidate does`, `Tasks from the role: client emails, video role-plays, open questions about real situations`, `Timed skills tests and video questions; job simulations and AI interviews on Plus`],
        [`Job simulations`, `Generated for your role, in every plan`, `Chosen from a ready-made library, on Plus only; custom simulations announced as on the roadmap`],
        [`Building the assessment`, `Generated by AI from your job description`, `Picked from the library, or assembled by the AI job builder`],
        [`Scoring`, `Checkpoints scored 0, 1 or 2, each with the candidate's own words as evidence`, `Score per test, candidate ranking and a PDF report per candidate`],
        [`AI during the assessment`, `Available; how the candidate uses it is part of the assessment`, `Monitored: webcam snapshots, copy-paste disabled, full-screen mode`],
        [`Candidate feedback`, `Written feedback generated for you, edited by you, sent in two clicks`, `A PDF report you can download and share with the candidate`],
        [`ATS`, `Works alongside your ATS; no native integration yet`, `Native ATS integrations and API on Plus`],
        [`Support`, `A direct line to the people building the product`, `Help center, 24/7 chat and email; personalised onboarding and Customer Success on Plus`],
        [`Pricing`, ONBORD_PRICE, `Free plan; Core from $215/month and Plus from $520/month, billed annually`],
      ], note: `TestGorilla information as published on testgorilla.com (pricing page, job simulations library and help center), checked on 15 October 2026. Prices shown are for Gorilla Assessments; Gorilla Sourcing is priced separately.` },
      { t: `h2`, x: `How much does TestGorilla cost in 2026?` },
      { t: `p`, x: `TestGorilla publishes three self-serve plans for Gorilla Assessments. The prices shown are for annual billing; paying monthly is possible but costs more, as the page shows a 25% saving for paying annually.` },
      { t: `list`, items: [
        [`Free:`, `10 credits a month, 5 essential tests with unlimited use, limited access to 180+ other tests, resume scoring and qualifying questions.`],
        [`Core:`, `from $215 a month. The full library of 350+ tests, video questions from TestGorilla's library and 2 premium user roles. A skills test costs 1 credit per candidate.`],
        [`Plus:`, `from $520 a month. Adds AI interviews, job simulations at 2 credits per candidate, custom tests and coding challenges, ID verification, ATS and API integrations, and unlimited premium user roles.`],
      ] },
      { t: `p`, x: `Gorilla Sourcing, the candidate search product, is a separate subscription priced per seat, from $74 a month.` },
      { t: `p`, x: `Read the Plus line closely. Job simulations, the closest thing TestGorilla offers to Onbord, start at $520 a month, billed annually, and come from a fixed library.` },
      { t: `p`, x: `Onbord publishes its prices on one page: Core at €100 a month and Pro at €300 a month, billed annually. The simulation generated for your role is the product itself, not an upgrade, and it is included in every plan. A Custom plan on quote covers larger volumes.` },
      { t: `bottom`, x: `TestGorilla's entry price buys a test library, and its simulations sit on the top self-serve plan. With Onbord, the simulation is what you pay for from the first plan.` },
      { t: `h2`, x: `Skills tests vs job simulation: what the candidate actually does` },
      { t: `p`, x: `TestGorilla measures skills one at a time: cognitive ability, personality, language, software or role knowledge, through timed tests drawn from large question pools. It is efficient, standardised and comparable across thousands of candidates.` },
      { t: `p`, x: `Onbord puts the candidate in the job. They write the email the client is waiting for, handle the conversation on video, and explain how they would deal with situations taken from the role. Soft and hard skills show up in the same task, the way they do on a real working day.` },
      { t: `bottom`, x: `a test tells you what someone knows about the job. A simulation shows you how they do it.` },
      { t: `h2`, x: `Scoring: a number vs evidence you can read` },
      { t: `p`, x: `TestGorilla scores each test automatically and ranks candidates. Results land in a PDF report per candidate and in the assessment summary, and simulation rubrics are built by its science team.` },
      { t: `p`, x: `Onbord breaks each skill into checkpoints. Each checkpoint is scored 0, 1 or 2 and quotes the passage of the candidate's answer that justifies it. Must-have skills are separated from nice-to-haves, so every must-have is tested and traceable.` },
      { t: `bottom`, x: `with TestGorilla you compare scores. With Onbord you can check why a score is what it is, in the candidate's own words, in seconds.` },
      { t: `h2`, x: `AI during the assessment: block it or measure it` },
      { t: `p`, x: `TestGorilla protects its tests with monitoring: webcam snapshots, disabled copy-paste, full-screen mode, location logging, hidden questions and timed tests.` },
      { t: `p`, x: `Onbord starts from a different premise: once hired, people work with AI. So the AI assistant stays available during the simulation, and how the candidate uses it is part of what you see.` },
      { t: `bottom`, x: `TestGorilla measures candidates without AI. Onbord measures them the way they will actually work.` },
      { t: `h2`, x: `Candidate experience and feedback` },
      { t: `p`, x: `TestGorilla produces a PDF report per candidate that you can download and share with them.` },
      { t: `p`, x: `Onbord generates written feedback for each candidate based on their answers. You review and adjust it, and Onbord sends it on your company's behalf in two clicks. Candidates who don't get the job still learn why, which matters for your employer brand.` },
      { t: `bottom`, x: `both let you share results. Onbord turns them into feedback a candidate can use, without you writing it.` },
      { t: `h2`, x: `Customer support and vendor experience` },
      { t: `p`, x: `TestGorilla offers a help center, 24/7 live chat and email on every plan, with personalised onboarding and access to Customer Success starting on Plus.` },
      { t: `p`, x: `Onbord gives every customer a direct line to the people building the product. If a task you need doesn't exist yet, we build it with you.` },
      { t: `bottom`, x: `at TestGorilla, the level of support follows the plan. At Onbord, you talk to the builders.` },
      { t: `h2`, x: `Adding Onbord: what it takes` },
      { t: `p`, x: `There is nothing to migrate. Send us one of your open job descriptions, and in a 20-minute call we build the first simulation with you, free. You can keep TestGorilla for general aptitude tests and use Onbord where you need to see the work.` },
      { t: `h2`, x: `Where TestGorilla is still a good choice` },
      { t: `list`, items: [
        [`You screen very large applicant pools.`, `A free plan, self-serve setup and standardised tests make it a fast first filter.`],
        [`You need breadth.`, `350+ tests covering cognitive ability, personality, languages, software and role knowledge.`],
        [`You hire technical profiles.`, `Coding tests run in a built-in IDE, with custom coding challenges on Plus.`],
        [`You need native ATS integrations today.`, `ATS and API integrations are available on Plus.`],
        [`You want to start for free.`, `10 credits a month, no credit card needed.`],
      ] },
      { t: `h2`, x: `Where Onbord wins` },
      { t: `list`, items: [
        [`A simulation of your role, not a library pick.`, `Generated from your job description, from the first plan.`],
        [`Evidence behind every score.`, `Every checkpoint quotes the candidate's own words.`],
        [`AI measured, not banned.`, `You see how candidates work with AI, as they will on the job.`],
        [`Feedback in two clicks.`, `Every candidate hears back, without you writing a word.`],
        [`A published price.`, `€100 or €300 a month, billed annually, simulation included, and a Custom plan on quote for larger volumes.`],
        [`Support from the people who build the product.`, `A direct line, and missing tasks built with you.`],
      ] },
      { t: `h2`, x: `What are the best TestGorilla alternatives?` },
      { t: `p`, x: `It depends on what you want to fix. If your goal is to see candidates do the work of the role rather than pass generic tests, that is the case this page makes for Onbord. If you want to predict potential from personality and motivation, read our [Onbord vs AssessFirst review](/resources/comparisons/onbord-vs-assessfirst).` },
      { t: `h2`, x: `Bottom line` },
      { t: `p`, x: `TestGorilla is the reference for screening many candidates quickly on general skills, and for that it remains a strong choice. But the question every hiring manager asks after a test is the same: can this person actually do the job? Onbord answers it directly, with a simulation of your role and evidence behind every score.` },
      { t: `p`, x: `Want to see it on one of your roles? [Book 20 minutes](demo) and we'll build your first simulation together.` },
    ],
    faq: [
      [`Is Onbord a good alternative to TestGorilla?`, `If you want to see candidates do the work of your role, yes: Onbord generates a simulation from your job description and scores every answer with evidence. If you need a broad library of standardised tests for very high volumes, TestGorilla is built for that, and the two can work side by side.`],
      [`How much does TestGorilla cost?`, `On its pricing page, checked on 15 October 2026, Gorilla Assessments Core starts at $215 a month and Plus at $520 a month, billed annually; monthly billing costs more. A free plan includes 10 credits a month. Onbord starts at €100 a month, billed annually.`],
      [`Does TestGorilla offer job simulations?`, `Yes, on its Plus plan, at 2 credits per candidate. They come from a library of ready-made scenarios, many of them conversations with an AI avatar playing a customer or a colleague, scored with rubrics built by TestGorilla's science team. TestGorilla says custom simulations are on its roadmap. Onbord generates the simulation from your own job description.`],
      [`What is the difference between a skills test and a job simulation?`, `A skills test measures one ability at a time, usually through timed questions. A job simulation puts the candidate in situations from the role and observes how they handle them, so several skills are assessed together, in context.`],
      [`Can candidates use ChatGPT during an Onbord simulation?`, `Yes. An AI assistant is available inside the simulation, and how the candidate uses it is part of the assessment. TestGorilla takes the opposite approach and monitors candidates to limit outside help.`],
      [`Can I use Onbord and TestGorilla together?`, `Yes. TestGorilla's standardised tests can measure general aptitudes, and Onbord shows how candidates handle the actual work of the role before you interview them.`],
    ],
    related: [`onbord-vs-assessfirst`, `onbord-and-your-ats`],
    legal: `Information about TestGorilla is compiled from testgorilla.com and other public sources and is accurate to the best of our knowledge as of 15 October 2026. Features and prices change: check with each vendor. Spotted something outdated? Tell us and we will correct it promptly. TestGorilla is a trademark of TestGorilla B.V. All third-party trademarks are the property of their respective owners, are used for identification purposes only, and do not imply affiliation or endorsement.`,
  },

  {
    slug: `onbord-vs-assessfirst`,
    category: `comparisons`,
    date: `2026-10-15`,
    reviewed: `October 2026`,
    seoTitle: `Onbord vs AssessFirst: In-Depth Review (2026)`,
    description: `AssessFirst predicts fit from personality, motivation and reasoning. Onbord has candidates do the work of your role and scores every answer with evidence. An honest, sourced comparison.`,
    title: `Onbord vs AssessFirst`,
    subtitle: `In-depth review`,
    lede: `Predicting who will fit, or seeing who can do the job? We compare both approaches head to head, with every claim about AssessFirst checked against its own website.`,
    excerpt: `Predicting fit from personality and motivation, or seeing the work of the role. An honest, sourced comparison.`,
    cover: { kind: `vs`, logo: { src: `/logos/assessfirst.png`, alt: `AssessFirst`, width: 1000, height: 263 } },
    body: [
      { t: `p`, x: `AssessFirst has built its name on predictive hiring. Founded in Paris in 2002, it says more than 3,500 companies trust it, with LVMH, SNCF, Airbus and Randstad among the logos on its website. Its core idea is simple: assess personality, motivation and reasoning, then predict how well a person will fit a role, a team and a manager.` },
      { t: `p`, x: `The AssessFirst of 2026 goes further than questionnaires. VOICE checks technical skills and spoken language level by voice in under three minutes, and SCAN runs AI-led screening calls before the rest of the assessment. The whole suite is sold as one subscription, calibrated with an AssessFirst expert.` },
      { t: `p`, x: `That is the honest difference between AssessFirst and Onbord. It is not soft skills against hard skills. It is a profile of the person and a prediction of fit, against a simulation of your role and evidence of how the person actually does the work.` },
      { t: `callout`, lead: `The short answer.`, x: `AssessFirst is built to understand who a candidate is, what drives them and how they reason, and to predict their fit with a role. Onbord generates a simulation of the role you're hiring for and scores every answer with the candidate's own words as evidence. Choose AssessFirst to assess potential and fit across your organisation. Choose Onbord to see who can actually do the job before you spend time in interviews.` },
      { t: `h2`, x: `Predicting fit vs observing the work` },
      { t: `p`, x: `**AssessFirst's approach:** short, validated questionnaires measure personality (SWIPE), motivation (DRIVE) and reasoning (BRAIN). A predictive model tuned to each role compares the results with what success looks like in that role. VOICE adds spoken checks of technical skills and languages, and SCAN adds an automated screening call. The output is a candidate profile and a predicted fit.` },
      { t: `p`, x: `**Onbord's approach:** you start from your job description, and AI generates a simulation of that role: the email a client is waiting for, the conversation to handle on video, the situations the person will meet in their first weeks. You decide which skills are must-haves, and each one is scored on explicit checkpoints, with the candidate's own words as evidence.` },
      { t: `p`, x: `The gap shows up in three places a hiring manager feels every week: whether you see the work or a prediction of it, what you can read behind a score, and what the candidate learns about this specific role.` },
      { t: `h2`, x: `At-a-glance comparison` },
      { t: `table`, head: [`Category`, `Onbord`, `AssessFirst`], rows: [
        [`Starting point`, `Your job description`, `Validated questionnaires and a predictive model per role`],
        [`What the candidate does`, `Tasks from the role: client emails, video role-plays, open questions about real situations`, `Questionnaires on personality (SWIPE, 5 minutes), motivation (DRIVE) and reasoning (BRAIN); spoken skills and language check (VOICE, under 3 minutes); AI screening call (SCAN, up to 15 minutes)`],
        [`What you learn`, `How the candidate handles the work of the role`, `Who the candidate is, what drives them, how they reason, and their predicted fit with the role`],
        [`Scoring`, `Checkpoints scored 0, 1 or 2, each with the candidate's own words as evidence; must-haves separated from nice-to-haves`, `Predictive score and reports; tools co-developed with universities and audited by Holistic AI`],
        [`AI during the assessment`, `Available; how the candidate uses it is visible in the results`, `VOICE presented as "AI-proof"`],
        [`Candidate feedback`, `Feedback on this assessment, for this role, edited by you and sent in two clicks`, `Immediate personal results and development advice in the candidate's own AssessFirst account`],
        [`Beyond hiring`, `Focused on assessing candidates`, `Internal mobility, development, manager–collaborator fit`],
        [`ATS`, `Works alongside your ATS; no native integration yet`, `35+ ATS integrations and an open API; ATS integration listed as an add-on`],
        [`Pricing`, ONBORD_PRICE, `One subscription from €499/month, unlimited licences, final price agreed with an expert`],
      ], note: `AssessFirst information as published on assessfirst.com (product pages, pricing page and help center), checked on 15 October 2026.` },
      { t: `h2`, x: `How much does AssessFirst cost in 2026?` },
      { t: `p`, x: `AssessFirst sells one subscription rather than a set of plans. Its pricing page shows a starting price of €499 a month, with unlimited licences for HR teams and managers, a single balance of tokens valid for up to 60 months, and lower prices per token at higher volumes. The final price is agreed with an AssessFirst expert, based on your yearly hiring volume and internal projects.` },
      { t: `p`, x: `The subscription covers the assessment platform, talent mapping and internal mobility, an AI assistant and a branded candidate interface. Add-ons are listed separately, including ATS integration and a competency framework.` },
      { t: `p`, x: `Onbord publishes its prices on one page: Core at €100 a month and Pro at €300 a month, billed annually, with a Custom plan on quote for larger volumes. The simulation generated for your role is included in every plan.` },
      { t: `bottom`, x: `AssessFirst starts at €499 a month, with the final number set in a conversation. Onbord starts at €100 a month, with the simulation included and the price on the page.` },
      { t: `h2`, x: `Questionnaires vs job simulation: what the candidate actually does` },
      { t: `p`, x: `AssessFirst asks candidates to complete questionnaires about themselves: how they behave, what motivates them, how they solve reasoning problems. SWIPE takes about five minutes and BRAIN uses a gamified format. VOICE then asks spoken questions to check a technical skill or a language level.` },
      { t: `p`, x: `Onbord puts the candidate in the job. They write the email the client is waiting for, handle the conversation on video, and explain how they would deal with situations taken from the role. Soft and hard skills show up in the same task, the way they do on a real working day.` },
      { t: `bottom`, x: `AssessFirst tells you what kind of professional someone is likely to be. Onbord shows you how they handle the work you're hiring for.` },
      { t: `h2`, x: `Scoring: a predictive model vs evidence you can read` },
      { t: `p`, x: `AssessFirst compares a candidate's results with a predictive model for the role and returns a profile and a fit score. Its tools are co-developed with universities including Pace University, the University of Minnesota, IESEG and the University of London, and audited by Holistic AI.` },
      { t: `p`, x: `Onbord breaks each skill into checkpoints. Each checkpoint is scored 0, 1 or 2 and quotes the passage of the candidate's answer that justifies it. Must-have skills are separated from nice-to-haves, so every must-have is tested and traceable.` },
      { t: `bottom`, x: `with AssessFirst, you rely on a validated model to predict fit. With Onbord, you read the evidence behind every score yourself, in the candidate's own words.` },
      { t: `h2`, x: `AI during the assessment: AI-proof vs AI-aware` },
      { t: `p`, x: `AssessFirst presents VOICE as "AI-proof": designed so candidates can't lean on ChatGPT-style help.` },
      { t: `p`, x: `Onbord starts from a different premise: once hired, people work with AI. So the AI assistant stays available during the simulation, and how the candidate uses it is visible in the results.` },
      { t: `bottom`, x: `AssessFirst keeps AI out of the assessment. Onbord measures candidates the way they will actually work.` },
      { t: `h2`, x: `Candidate experience and feedback` },
      { t: `p`, x: `AssessFirst gives candidates their own account. After the questionnaires, they see their results immediately, with development advice they can keep and share, and they decide which companies can see their profile.` },
      { t: `p`, x: `Onbord generates written feedback on the assessment the candidate just took, for the role they applied to. You review and adjust it, and Onbord sends it on your company's behalf in two clicks. Candidates who don't get the job learn why, for that job.` },
      { t: `bottom`, x: `AssessFirst gives candidates insight about themselves. Onbord gives them an answer about the role.` },
      { t: `h2`, x: `Beyond hiring: a talent suite vs a focused tool` },
      { t: `p`, x: `AssessFirst is a talent platform as much as a hiring tool: the same profiles feed internal mobility, development plans and manager–collaborator fit.` },
      { t: `p`, x: `Onbord does one thing: show you, before the interview, how a candidate handles the work of the role.` },
      { t: `bottom`, x: `if you want one platform for talent decisions across the employee lifecycle, AssessFirst covers more ground. If you want to know who can do the job, Onbord goes straight to it.` },
      { t: `h2`, x: `Customer support and vendor experience` },
      { t: `p`, x: `AssessFirst calibrates each subscription with an expert and lists a "Care programme" among its add-ons.` },
      { t: `p`, x: `Onbord gives every customer a direct line to the people building the product. If a task you need doesn't exist yet, we build it with you.` },
      { t: `bottom`, x: `AssessFirst offers a structured, expert-led relationship. At Onbord, you talk to the builders.` },
      { t: `h2`, x: `Adding Onbord: what it takes` },
      { t: `p`, x: `There is nothing to migrate. Send us one of your open job descriptions, and in a 20-minute call we build the first simulation with you, free. You can keep AssessFirst for personality and motivation, and use Onbord to see the work of the role before your final interviews.` },
      { t: `h2`, x: `Where AssessFirst is still a good choice` },
      { t: `list`, items: [
        [`You want to assess personality, motivation and reasoning.`, `SWIPE, DRIVE and BRAIN are built for exactly that.`],
        [`You need a validated, audited method.`, `Tools co-developed with universities and audited by Holistic AI.`],
        [`You manage more than hiring.`, `Internal mobility, development and manager–collaborator fit run on the same profiles.`],
        [`You check languages at scale.`, `VOICE scores spoken level in 40+ languages, aligned with the CEFR.`],
        [`You want automated screening calls.`, `SCAN runs structured AI calls of up to 15 minutes on criteria you define.`],
        [`You need native ATS integrations today.`, `35+ ATS are supported, with an open API.`],
      ] },
      { t: `h2`, x: `Where Onbord wins` },
      { t: `list`, items: [
        [`The work, not a prediction.`, `Candidates do tasks from your role, generated from your job description.`],
        [`Evidence behind every score.`, `Every checkpoint quotes the candidate's own words.`],
        [`AI measured, not banned.`, `You see how candidates work with AI, as they will on the job.`],
        [`Feedback about the role.`, `Every candidate hears back about this job, in two clicks.`],
        [`A published, lower entry price.`, `€100 or €300 a month, billed annually, simulation included, and a Custom plan on quote for larger volumes.`],
        [`Support from the people who build the product.`, `A direct line, and missing tasks built with you.`],
      ] },
      { t: `h2`, x: `What are the best AssessFirst alternatives?` },
      { t: `p`, x: `It depends on what you want to fix. If your goal is to see candidates do the work of the role rather than predict their fit from questionnaires, that is the case this page makes for Onbord. If you're also weighing a library of standardised skills tests, read our [Onbord vs TestGorilla review](/resources/comparisons/onbord-vs-testgorilla).` },
      { t: `h2`, x: `Bottom line` },
      { t: `p`, x: `AssessFirst is a strong choice for understanding people: their personality, their motivation, their reasoning, and how they might fit a role, a team or a manager. But a good profile is still a prediction. Onbord answers the question that comes after it: can this person actually do the job? It does so with a simulation of your role and evidence behind every score.` },
      { t: `p`, x: `Want to see it on one of your roles? [Book 20 minutes](demo) and we'll build your first simulation together.` },
    ],
    faq: [
      [`Is Onbord a good alternative to AssessFirst?`, `They answer different questions. AssessFirst predicts fit from personality, motivation and reasoning; Onbord shows how the candidate handles the work of your role. If what you need is evidence of the work, Onbord is the more direct route, and the two can be used together.`],
      [`How much does AssessFirst cost?`, `According to its pricing page, checked on 15 October 2026, a single subscription starts at €499 a month, with unlimited licences and tokens valid for up to 60 months. The final price is agreed with an expert based on your volume, and add-ons such as ATS integration are listed separately. Onbord starts at €100 a month, billed annually.`],
      [`Does AssessFirst assess hard skills?`, `Yes, with VOICE: a spoken assessment of under three minutes that checks technical skills and language level, in 40+ languages for languages. Onbord assesses skills through tasks from the role itself.`],
      [`What is AssessFirst SCAN?`, `An AI screening assistant. It analyses the CV, then runs a structured interview of up to 15 minutes on up to 10 criteria you choose, such as salary expectations or mobility, and lets qualified candidates book an interview.`],
      [`Do candidates get feedback?`, `In both, yes, but of a different kind. AssessFirst gives candidates their personal results and development advice in their own account. Onbord sends feedback on the assessment they took for your role, edited by you, in two clicks.`],
      [`What is the difference between predictive hiring and a job simulation?`, `Predictive hiring measures traits, motivations and aptitudes, then estimates how likely someone is to succeed in a role. A job simulation puts the candidate in situations from the role and observes how they handle them.`],
      [`Can I use Onbord and AssessFirst together?`, `Yes, and it makes sense: AssessFirst to understand profile and motivation, Onbord to see the work of the role before the final interview.`],
    ],
    related: [`onbord-vs-testgorilla`, `onbord-and-your-ats`],
    legal: `Information about AssessFirst is compiled from assessfirst.com and other public sources and is accurate to the best of our knowledge as of 15 October 2026. Features and prices change: check with each vendor. Spotted something outdated? Tell us and we will correct it promptly. AssessFirst is a trademark of its respective owner. All third-party trademarks are the property of their respective owners, are used for identification purposes only, and do not imply affiliation or endorsement.`,
  },
];

/** Les catégories, dans l'ordre des onglets. La documentation n'a pas encore
 *  de contenu : elle est déclarée « soon » et son onglet ne se clique pas. */
export const CATEGORIES = [
  { id: `blog` },
  { id: `comparisons` },
  { id: `docs`, soon: true },
];

/** Les articles, du plus récent au plus ancien (à date égale, l'ordre du
 *  fichier). */
export function articles(categorie) {
  return ARTICLES
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !categorie || a.category === categorie)
    .sort((x, y) => (y.a.date.localeCompare(x.a.date)) || (x.i - y.i))
    .map(({ a }) => a);
}

export function article(categorie, slug) {
  return ARTICLES.find((a) => a.category === categorie && a.slug === slug) || null;
}

/** Chemin canonique (sans langue) d'un article. */
export function cheminArticle(a) {
  return `/resources/${a.category}/${a.slug}`;
}
