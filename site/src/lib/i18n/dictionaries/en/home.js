// Page d'accueil — anglais, la version de référence.
//
// ── Le plan, et ce que chaque section doit obtenir ───────────────────────────
//   hero    « qu'est-ce que c'est »       → et le bac à sable pour l'essayer
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
    title: "Onbord — Hire on real skills. Not CVs.",
    description:
      "Paste a job posting. Onbord turns it into a work simulation, sends it to your candidates, and ranks them on what they actually did, with the proof behind every number.",
  },

  hero: {
    titleA: "Hire on",
    titleEm: "real skills.",
    titleB: "Not CVs.",
    lede: "Paste a job posting. Onbord builds the simulation, sends it to your candidates, and ranks them on what they actually did.",
    primary: "Book a demo",

    // Le contenu lisible de l'aperçu de plateforme (AppPeek.js) : l'offre et
    // les étapes du pipeline. Le reste de la fenêtre est en barres grises.
    peek: {
      job: "Sales Development Rep",
      experience: "Candidate experience",
      duration: "~20 min",
      writing: "writing",
      steps: [
        { name: "Answer a price objection", format: "Email", min: "6 min" },
        { name: "Take the call on camera", format: "Live", min: "5 min" },
        { name: "File the record", format: "CRM", min: "4 min" },
        { name: "Clean a duplicate leads list", format: "Code", min: "" },
      ],
    },

    // Le bac à sable. Les étapes décrivent ce qui SE PASSERAIT : le site est
    // statique, il ne construit rien ici, et il ne doit pas le laisser croire.
    play: {
      label: "Describe the role you are hiring for",
      // Trois métiers très différents, pour montrer d'un coup d'œil que
      // n'importe quel poste peut être décrit ici — voir Playground.js pour
      // l'effet machine à écrire qui les fait défiler.
      placeholders: [
        "I want a simulation for a Sales Development Representative",
        "I want a simulation to test if someone can code in Python",
        "I want a simulation for an Office Manager",
      ],
      send: "Build the simulation",
    steps: [
        "Understanding the role",
        "Choosing the skills worth testing",
        "Building the simulation",
        "Writing the scoring grid",
        "Reviewing it",
      ],
      done: {
        title: "That is where the real one starts.",
        body: "Send us the posting and we build it for real, with its tasks and its scoring grid. You see the whole thing before any candidate does.",
        primary: "Send this to us",
        secondary: "Talk to someone",
        again: "Try another role",
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
    lede: "They answer the client who has a cheaper quote, take the call on camera, and fix the bug before it ships. The AI assistant is open beside them, exactly like at work, and how they use it is part of the result.",
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
