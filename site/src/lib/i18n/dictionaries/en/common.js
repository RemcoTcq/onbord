// Chrome partagé par toutes les pages : navigation, pied de page, appels à
// l'action — et le CONTENU DES MAQUETTES d'interface.
//
// Pourquoi les maquettes sont traduites : ce sont elles qui montrent le
// produit. Un visiteur néerlandophone qui voit un e-mail de démonstration en
// anglais comprend qu'on lui montre le site de quelqu'un d'autre. Elles
// vivent ici, et non dans la page où elles apparaissent, parce que la même
// maquette sert sur l'accueil, sur Simulations et sur Scoring.
//
// L'anglais est la langue de référence : c'est ici qu'une phrase s'écrit
// d'abord, et les deux autres langues la suivent.

const common = {
  nav: {
    how: "How it works",
    simulations: "Simulations",
    scoring: "Scoring",
    pricing: "Pricing",
    demo: "Book a demo",
    login: "Log in",
    language: "Change language",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    skip: "Skip to content",
  },

  footer: {
    tagline: "Hire on what people can actually do.",
    product: "Product",
    company: "Company",
    legal: "Legal",
    ai: "AI transparency",
    terms: "Terms",
    privacy: "Privacy",
    contact: "Contact",
    rights: "All rights reserved.",
  },

    // La composition de l'accueil : la consigne, l'e-mail, l'appel. Les deux
  // ── Maquettes ────────────────────────────────────────────────────────────
  mocks: {
    // photos vivent dans public/people/ et sont des GABARITS à remplacer.
    scenes: {
      label: "A candidate answering an email and taking a call on camera",
      more: "…more",
      meName: "Sarah D.",
      themName: "David M.",
      testsLabel: "tests passed",
      signOff: "Kind regards,",
      codeFile: "leads.js",
      compose: "New message",
      to: "To",
      subject: "Subject",
      send: "Send",
      fromInitials: "MD",
      fromName: "Marie De Clercq",
      fromRole: "Purchasing manager, Vandelaer NV",
    },

    // Le CV. La seule maquette qui ne montre pas Onbord : elle montre ce sur
    // quoi on décide aujourd'hui. Les lignes sont des phrases de CV honnêtes ;
    // le reproche porte sur le fait que rien ne s'y vérifie, pas sur la
    // personne qui les écrit.
    cv: {
      window: "Application received 14 minutes ago",
      initials: "SD",
      name: "Sarah D.",
      role: "Sales Development Rep, 4 years",
      match: "92% keyword match",
      lines: [
        "Excellent communicator, at ease with demanding clients",
        "Consistently over target, three years running",
        "Expert in CRM hygiene and pipeline management",
        "Autonomous, rigorous, results-driven",
        "Fluent English, strong commercial instinct",
      ],
    },

    // La liste classée : ce que le recruteur récupère. La dernière ligne n'a
    // pas de note, parce qu'un candidat invité qui n'a pas commencé n'en a pas.
    shortlist: {
      window: "34 candidates",
      waiting: "Awaiting response",
      rows: [
        { n: "01", initials: "AB", name: "Amine B.", score: "88", state: "Scored", top: true },
        { n: "02", initials: "TV", name: "Tom V.", score: "70", state: "Scored", top: true },
        { n: "03", initials: "SD", name: "Sarah D.", score: "67", state: "Scored", top: false },
        { n: "04", initials: "JM", name: "Julie M.", score: "58", state: "Scored", top: false },
        { n: "05", initials: "KH", name: "Karim H.", score: "", state: "Invited", top: false },
      ],
    },

    // ── Le début du parcours, côté recruteur ────────────────────────────────
    // Libellés repris de l'application (dashboard.js) : « Hard skills »,
    // « Must have », « Screening questions », « Candidate experience ».
    skills: {
      window: "Skills pulled from your posting",
      familyLabel: "Job family",
      family: "Sales · Business development",
      hardLabel: "Hard skills",
      softLabel: "Soft skills",
      must: "Must have",
      nice: "Nice to have",
      hard: [
        { name: "Prospecting", must: true },
        { name: "Objection handling", must: true },
        { name: "Written English", must: true },
        { name: "CRM hygiene", must: false },
        { name: "Cold calling", must: false },
      ],
      soft: [
        { name: "Resilience", must: true },
        { name: "Listening", must: false },
        { name: "Rigour", must: false },
      ],
    },

    pipeline: {
      window: "Hiring pipeline",
      nodes: [
        { name: "Screening questions", meta: "3 questions · filters before anyone spends time", on: true },
        { name: "Candidate experience", meta: "5 steps · ~20 min", on: true },
        { name: "Video call interview", meta: "Run by your team", on: false },
        { name: "On-site interview", meta: "Run by your team", on: false },
      ],
    },

    chat: {
      window: "Designing the experience",
      msgMe: "Our reps sell to purchasing managers, not founders. And drop the cold call, everything happens by email here.",
      msgAi: "Done. Step 2 now has a purchasing manager pushing back on lead times, and the call is replaced by a follow-up email after a silent week.",
      changedLabel: "Changed",
      changed: "Step 2 rewritten · step 4 replaced · scoring grid updated",
    },


    // Fiche de notation : une note, et la phrase du candidat sous la note.
    score: {
      skill: "Handling a price objection",
      score: "67",
      outOf: "%",
      dims: [
        {
          name: "Names the gap",
          pct: 75,
          quote:
            "I understand, at that volume, an 8% gap against your current supplier is real money.",
          why: "States the objection in the client's own terms before answering it.",
        },
        {
          name: "Offering a way forward",
          pct: 50,
          quote: "Could we look at a twelve-month commitment? It changes the unit price.",
          why: "Proposes a concrete lever, but never checks whether it suits the client.",
        },
        {
          name: "Tone under pressure",
          pct: 75,
          quote: "You're right to push on this.",
          why: "Stays warm without conceding the point.",
        },
      ],
    },

    // Bloc « IA » de la page Notation : la note d'usage de l'IA, avec le
    // même dossier candidat que `score` ci-dessus.
    aiUsage: {
      window: "Candidate report · AI usage",
      msgMe: "How do I answer a price objection when I can't move on price?",
      msgAi:
        "Name the objection instead of stepping around it, then move the conversation to what the price is buying: lead times, stock guarantees, the cost of a missed delivery.",
      ai: {
        name: "AI usage",
        pct: 78,
        why: "78%, because the candidate asked a specific question instead of pasting the brief, reworded the suggestion in their own voice, and cut a line judged not relevant here.",
      },
    },

    // Composeur d'e-mail + assistant.
    email: {
      briefLabel: "Brief",
      brief:
        "Competing quote, 8% cheaper, answer expected today. You can move on payment terms, not on unit price.",
      subject: "Subject",
      subjectValue: "Re: Quotation 2291 · your feedback",
      body:
        "Hello Ms De Clercq,\n\nThank you for coming back so quickly, and for being straight with me about the other quote. At your volume, 8% is real money and I'm not going to pretend otherwise.",
      assistant: "AI assistant",
      msgMe: "How do I answer a price objection when I can't move on price?",
      msgAi:
        "Name the objection instead of stepping around it, then move the conversation to what the price is buying: lead times, stock guarantees, the cost of a missed delivery.",
    },

    // Fiche CRM, avec la contradiction glissée dans le brief.
    crm: {
      sourceLabel: "Source",
      source: "Voicemail, 48 seconds + forwarded email chain",
      rows: [
        { k: "Company", v: "Vandelaer NV", ok: true },
        { k: "Contact", v: "Marie De Clercq", ok: true },
        { k: "Budget", v: "€40–45k", ok: true },
        { k: "Deadline", v: "End of Q3", ok: false, expected: "Before 30 June" },
      ],
      flagLabel: "Contradiction in the brief",
      flag:
        "The email says Q3. The voicemail says “before the end of June”. Nobody told the candidate to look for it.",
      missed: "Missed",
    },

    // Exercice de code avec exécution réelle des tests.
    code: {
      task: "Remove duplicate leads by email, keeping the first one seen.",
      tests: [
        { name: "drops a repeated email", ok: true },
        { name: "keeps leads with different emails", ok: true },
        { name: "is case-insensitive on the email", ok: true },
        { name: "5 000 leads under 200 ms", ok: false, verdict: "timeout" },
      ],
    },

    // Mise en situation jouée en direct.
    live: {
      who: "David M. · on the call",
      line:
        "Honestly? We're happy with our current supplier. What would even make us take the meeting?",
      instruction: "Answer them now, out loud, as if you were on that call.",
      time: "00:34",
      recording: "Recording",
    },

    // Journal de génération, poussé ligne à ligne.
    gen: {
      window: "Generating the simulation",
      lines: [
        { text: "Reading the job posting", t: "0:04", state: "done" },
        { text: "Extracting skills · 9 found, 6 kept", t: "0:21", state: "done" },
        { text: "Building the CRM scenario", t: "1:48", state: "done" },
        {
          text: "Reviewing the draft against the posting",
          t: "2:15",
          state: "now",
          note: "Step 3 would fit any sales posting. Rewriting it around partner recruitment.",
        },
        { text: "Rewrite, pass 2 of 2", t: "", state: "todo" },
      ],
    },
    // Retour écrit envoyé à un candidat non retenu.
    feedback: {
      window: "Feedback sent to a candidate",
      tabs: [
        {
          id: "next",
          label: "Moving forward",
          tag: "Sent · invited to interview",
          body: [
            "Hello Amine,",
            "We would like to meet you. Here is what stood out, so you know what we will dig into.",
            "On the email to Ms De Clercq, you named the real number, the 8% gap, before you defended the quote. Most candidates lead with the apology.",
            "One thing we will come back to: the delivery date you promised her is not confirmed anywhere in writing yet.",
          ],
        },
        {
          id: "no",
          label: "Not selected",
          tag: "Sent · not selected",
          body: [
            "Hello Sarah,",
            "We will not be taking your application further, and here is why, rather than silence.",
            "Your reply to the price objection was among the clearest we received: you named the 8% gap instead of talking around it. What made the difference came next, you offered a twelve-month commitment without checking whether they could sign one.",
            "For this role, that check is most of the job.",
          ],
        },
      ],
    },

    // Petit encart d'exemple de grille de notation (page Scoring).
    grid: {
      dim: "Catching contradictory information",
      levels: [
        {
          n: "1",
          pct: 0,
          label: "Below expectations",
          text: "Files both values without noticing they disagree, e.g. writes “Q3” and leaves the note empty.",
        },
        {
          n: "3",
          pct: 50,
          label: "As expected",
          text: "Notices the conflict and records the more reliable source, e.g. “End of June (per voicemail).”",
        },
        {
          n: "5",
          pct: 100,
          label: "Excellent",
          text: "Notices it, records the safer date, and flags it for a human, e.g. “Dates conflict, confirm with Marie before quoting.”",
        },
      ],
    },
  },
};

export default common;
