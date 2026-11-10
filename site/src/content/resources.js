// ─────────────────────────────────────────────────────────────────────────────
// Le CONTENU de la partie « Resources » : les articles de blog (15/10/2026).
//
// ⚠️ LES DEUX COMPARAISONS (Onbord vs TestGorilla, Onbord vs AssessFirst) ONT
// ÉTÉ RETIRÉES le 10/11/2026, sur demande directe (« pour l'instant ») : il
// ne reste que l'article sur l'ATS. Leur texte est dans l'historique Git ;
// leurs adresses redirigent vers /resources (next.config.mjs). La catégorie
// « comparisons » reste déclarée, en « Soon », comme la documentation.
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
    legal: `All trademarks mentioned belong to their respective owners and are used for identification purposes only, with no affiliation or endorsement implied.`,
  },
];

/** Les catégories, dans l'ordre des onglets. Une catégorie sans contenu est
 *  déclarée « soon » et son onglet ne se clique pas : la documentation, et
 *  les comparaisons depuis le 10/11/2026. */
export const CATEGORIES = [
  { id: `blog` },
  { id: `comparisons`, soon: true },
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
