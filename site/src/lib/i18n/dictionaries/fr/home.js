// Page d'accueil — français.
// Même structure que en/home.js, la version de référence. Lire l'en-tête de ce
// fichier-là : c'est une page d'accueil et pas un mode d'emploi, le problème ne
// se nomme jamais, le texte est court, on dit « simulation », pas de tiret
// cadratin, et aucun prix ni crédit sur cette page.

const home = {
  meta: {
    title: "Onbord | Des simulations de poste pour recruter et intégrer vos équipes clients",
    description:
      "Onbord construit des simulations de vos postes sales, customer success et support. Recrutez sur une évaluation des compétences, preuve à l'appui pour chaque note, puis préparez vos nouvelles recrues avant leur premier client.",
  },

  hero: {
    // La bulle au-dessus du titre (voir la version anglaise).
    badge: "Conçu pour les métiers en contact client",
    // Le titre du 05/11/2026, traduit de l'anglais (« You hire better. They
    // ramp faster. ») : le recrutement, puis l'onboarding.
    titleA: "Vous recrutez mieux.",
    titleEm: "",
    titleB: "Ils sont opérationnels plus vite.",
    lede: "Les candidats prouvent leurs compétences sur le vrai métier, les nouvelles recrues s'y entraînent avant leur premier jour.",

    // La fenêtre de la plateforme (AppPeek.js). Libellés de l'interface
    // recruteur (dashboard.js de l'application), voir la version anglaise.
    // Le choix au-dessus de la fenêtre (Vitrine.js). Voir la version anglaise.
    tabs: { label: "Ce que montre la plateforme", recruitment: "Recrutement", onboarding: "Onboarding" },
    // Le pop-up « Try it now » (TryModal.js), second bouton du hero. TEXTE
    // PROVISOIRE, à reprendre au copywriting. La promesse des 24 heures est
    // tenue À LA MAIN par l'équipe : ne la raccourcissez pas sans elle.
    try: {
      button: "Testez-le sur votre propre poste",
      eyebrow: "Simulation test",
      title: "Essayez maintenant",
      lede: "Envoyez-nous une fiche de poste. Nous construisons la simulation de ce poste et ouvrons votre environnement privé.",
      firstName: "Prénom",
      firstNamePh: "Emma",
      lastName: "Nom",
      lastNamePh: "Peeters",
      email: "E-mail professionnel",
      emailPh: "emma@entreprise.be",
      file: "Fiche de poste",
      filePick: "Importer votre fiche de poste",
      fileHint: "PDF, Word ou texte, 4 Mo maximum",
      fileChange: "Cliquez pour choisir un autre fichier",
      submit: "Envoyer",
      sending: "Envoi…",
      privacy: "Vos coordonnées servent uniquement à préparer votre environnement.",
      missing: "Indiquez votre prénom, votre nom et votre e-mail.",
      badEmail: "Cette adresse e-mail ne semble pas valide.",
      noFile: "Importez votre fiche de poste.",
      tooBig: "Ce fichier dépasse 4 Mo. Importez un fichier plus léger.",
      badType: "Importez un fichier PDF, Word ou texte.",
      failed: "Votre demande n'a pas pu partir. Envoyez votre fiche de poste à",
      close: "Fermer",
      doneTitle: "Merci, {name}.",
      doneLede: "Sous 24 heures, vous aurez accès à votre environnement privé, avec une simulation construite sur votre fiche de poste. Nous vous écrirons à {email}.",
      doneClose: "Fermer",
    },
    app: {
      // Ce que la fenêtre montre, pour un lecteur d'écran (elle y est une image).
      alt: "L'interface recruteur d'Onbord : la vue d'ensemble du recrutement, les candidats classés par score global, et le rapport d'un candidat.",
      pct: "{n} %",
      me: "LV",
      nav: {
        search: "Rechercher…",
        menu: "Menu",
        home: "Accueil",
        simulations: "Simulations",
        hiring: "Recrutement",
        overview: "Vue d'ensemble",
        jobs: "Jobs",
        candidates: "Candidats",
        onboarding: "Onboarding",
        people: "Personnes",
        modules: "Modules",
        programs: "Programmes",
        company: "Entreprise",
        settings: "Paramètres",
      },
      jobs: [
        { title: "Business developer", meta: "Gand · Hybride", invited: 34, done: 21, date: "7 oct." },
        { title: "Customer Success Manager", meta: "Bruxelles · CDI", invited: 18, done: 11, date: "2 oct." },
        { title: "Chargé de support client", meta: "Louvain · Sur site", invited: 12, done: 12, date: "24 sept." },
        { title: "Account executive", meta: "Anvers · Hybride", invited: 22, done: 10, date: "19 sept." },
      ],
      job: {
        tabs: ["Parcours candidat", "Candidats", "Contexte", "Paramètres"],
        chips: ["Gand", "Hybride"],
        open: "Candidatures ouvertes",
        copy: "Copier le lien public",
      },
      cands: {
        search: "Rechercher un candidat",
        sort: "Trier",
        sortBy: "Score décroissant",
        colCandidate: "Candidat",
        colScore: "Score global",
        colStatus: "Statut",
        view: "Voir le rapport",
        subs: ["Terminé le 14 oct.", "Terminé le 14 oct.", "Terminé le 13 oct.", "Terminé le 12 oct.", "Invité le 15 oct."],
      },
      report: {
        candidates: "Candidats",
        expand: "Tout déplier",
        feedback: "Feedback",
        status: "Statut",
        invited: "Invitée le",
        invitedOn: "9 oct. 2026",
        completed: "Terminé le",
        completedOn: "13 oct. 2026",
        gdpr: "RGPD",
        granted: "Accordé",
        shortlist: "Présélectionner",
        next: "Passer à l'étape suivante",
        reject: "Refuser",
        score: "Score global",
        scoreSub: "Moyenne pondérée selon vos critères de sélection.",
        scoreLine: "4 étapes notées",
        scoreNote: "Le détail par critère est dans chaque étape ci-dessous.",
        stepType: "E-mail",
        criteria: "Critères",
        must: "Must-have",
        quote: "« {q} »",
      },
      home: {
        title: "Vue d'ensemble du recrutement",
        newJob: "Nouveau job",
        hello: "Bonjour Laura",
        figures: [
          { label: "Jobs", n: "4", unit: "ouverts" },
          { label: "Candidats", n: "86", unit: "au total" },
          { label: "Terminées", n: "54", unit: "simulations" },
        ],
        yourJobs: "Vos jobs",
        status: "Statut",
        open: "Ouvert",
        candidates: "Candidats",
        candidatesN: "{n} candidats",
        completed: "Ont terminé",
        created: "Créé le",
        latest: "Derniers candidats",
        activity: "Activité de la semaine",
        week: "Semaine",
        range: "12 – 18 oct. 2026",
        doneN: "9",
        doneLabel: "simulations terminées cette semaine",
        legendInvited: "Invités",
        legendDone: "Terminées",
        days: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      },
    },
  },

  truth: {
    lines: [
      "Un CV, c'est ce que quelqu'un a écrit sur lui-même.",
      "Un entretien, c'est ce qu'il en dit sous pression.",
      "Ni l'un ni l'autre n'est le travail.",
    ],
    lede: "Alors Onbord met chaque candidat vingt minutes dans le métier, avec des outils qui se comportent comme les vrais, et vous montre exactement ce qu'il en a fait.",
    cvLabel: "CV",
    proofLabel: "Ce qu'Onbord montre",
  },

  // Sous le hero (05/11/2026). Texte PROVISOIRE, voir la version anglaise.
  figures: {
    statement: "Choisissez les bons profils et aidez-les à maîtriser leur poste plus vite, grâce à des simulations de poste réalistes.",
  },

  // « Two moments that matter » (05/11/2026). Voir la version anglaise.
  moments: {
    title: "Deux moments qui comptent",
    items: [
      {
        key: "hiring",
        tag: "Recrutement",
        title: "Voyez qui sait faire le travail avant de recruter.",
        lede: "Les candidats font vingt minutes du vrai métier. Vous les recevez classés sur vos critères, avec la preuve derrière chaque note.",
        link: "Découvrir le recrutement",
        alt: "L'interface recruteur d'Onbord : les candidats d'un poste, classés par score global.",
      },
      {
        key: "onboarding",
        tag: "Onboarding des nouvelles recrues",
        title: "Des recrues prêtes avant leur premier jour.",
        lede: "Elles traversent les vraies situations du poste, module par module, et vous voyez où chacune en est avant son premier client.",
        link: "Découvrir l'onboarding",
        alt: "La fiche d'une nouvelle recrue dans Onbord : les modules assignés à Lucas Martens, trois validés, et son dernier essai avec chaque point attendu et les mots qui le prouvent.",
      },
    ],
    // Les écrans d'onboarding, recopiés de l'application le 23/11/2026 :
    // même forme que l'anglais, libellés du dictionnaire français de
    // l'application (dashboard.js, `onb`).
    onboardingApp: {
      alt: "L'onboarding d'Onbord : les nouvelles recrues en route vers de vrais clients, la liste des personnes et leur avancée, et les modules et essais d'une recrue.",
      team: [
        { initials: "EP", name: "Emma Peeters", email: "emma.peeters@brightline.io", col: "onboarding", valides: 2, assignes: 5, avg: 64, since: "5 nov." },
        { initials: "LM", name: "Lucas Martens", email: "lucas.martens@brightline.io", col: "almost", valides: 3, assignes: 5, avg: 77, since: "3 nov.", toValidate: true },
        { initials: "NJ", name: "Noah Janssens", email: "noah.janssens@brightline.io", col: "onboarding", valides: 1, assignes: 4, avg: 48, since: "10 nov." },
        { initials: "SC", name: "Sofia Claes", email: "sofia.claes@brightline.io", col: "almost", valides: 4, assignes: 4, avg: 81, since: "27 oct.", toDeclare: true },
        { initials: "RD", name: "Ruben De Smet", email: "ruben.desmet@brightline.io", col: "ready", valides: 5, assignes: 5, avg: 84, since: "13 oct." },
        { initials: "HW", name: "Hanna Wouters", email: "hanna.wouters@brightline.io", col: "ready", valides: 4, assignes: 4, avg: 79, since: "20 oct." },
      ],
      overview: {
        title: "Vue d'ensemble de l'onboarding",
        create: "Créer une simulation",
        tiles: [["Nouvelles recrues", "6"], ["Prêtes", "2"], ["Score moyen", "72 %"], ["Simulations validées", "19 / 27"]],
        path: "Vers de vrais clients",
        cols: { onboarding: "En onboarding", almost: "Presque prêtes", ready: "Prêtes" },
        average: "{n} % de moyenne",
        validatedOf: "{v} / {a} validés",
        toDeclare: "À déclarer prête",
        toValidate: "1 essai à valider",
        stuckTitle: "Qui bloque",
        stuck: [
          { kind: "struggling", name: "Noah Janssens", why: "2 essais sous le seuil — Calmer un client mécontent par chat" },
          { kind: "overdue", name: "Emma Peeters", why: "Échéance dépassée le 20 nov. — Appel de renouvellement avec un client hésitant" },
        ],
        skillsTitle: "Compétences à travailler",
        workedBy: "Travaillée par",
        skills: [
          { name: "Traiter les objections", n: 58, sim: "Répondre à une objection sur le prix" },
          { name: "Convenir d'une prochaine étape", n: 63, sim: "Appel de découverte avec un prospect" },
          { name: "Apaiser un client mécontent", n: 66, sim: "Calmer un client mécontent par chat" },
        ],
      },
      people: {
        title: "Personnes",
        invite: "Inviter une personne",
        tabs: { onboarding: "En onboarding", ready: "Prêtes" },
        search: "Rechercher une personne",
        colPerson: "Personne",
        colStage: "Étape",
        colProgress: "Modules validés",
        colAverage: "Note moyenne",
        colSince: "Arrivée le",
      },
      person: {
        name: "Lucas Martens",
        sub: "lucas.martens@brightline.io · En onboarding",
        markReady: "Marquer comme prête",
        assign: "Assigner",
        assignments: "Modules assignés",
        attemptsTitle: "Essais",
        validate: "Valider",
        unvalidate: "Annuler la validation",
        status: { validated: "Validé", passed: "Seuil atteint", in_progress: "En cours", assigned: "Assigné" },
        modules: [
          { title: "Appel de découverte avec un prospect", meta: "2 essais · meilleur score 82 % (seuil 70 %)", status: "validated" },
          { title: "Répondre à une objection sur le prix", meta: "1 essai · meilleur score 74 % (seuil 70 %)", status: "validated" },
          { title: "Appel de renouvellement avec un client hésitant", meta: "2 essais · meilleur score 75 % (seuil 70 %)", status: "validated" },
          { title: "Calmer un client mécontent par chat", meta: "1 essai · meilleur score 75 % (seuil 70 %)", status: "passed" },
          { title: "Présenter les nouveaux tarifs", meta: "0 essai · seuil 70 % · échéance le 5 déc.", status: "assigned" },
        ],
        attempts: [
          { title: "Calmer un client mécontent par chat", meta: "essai 1 · 21 nov.", score: "75 %" },
          { title: "Appel de renouvellement avec un client hésitant", meta: "essai 2 · 18 nov.", score: "75 %" },
          { title: "Appel de renouvellement avec un client hésitant", meta: "essai 1 · 14 nov.", score: "58 %" },
          { title: "Répondre à une objection sur le prix", meta: "essai 1 · 10 nov.", score: "74 %" },
        ],
        open: {
          summary: "Lucas a reconnu tout de suite le double prélèvement et donné une date pour le remboursement. Il a expliqué la cause en termes techniques dont le client n'avait pas besoin.",
          criterion: "Apaiser un client mécontent · 75 %",
          points: [
            { s: 2, d: "Reconnaît le problème avant de l'expliquer", v: "« Je suis désolé, être prélevé deux fois, c'est bien la dernière chose dont vous avez besoin. »" },
            { s: 1, d: "Explique ce qui s'est passé avec des mots simples", v: "« C'est un webhook rejoué sur notre synchro de facturation. »" },
            { s: 2, d: "S'engage sur une correction datée", v: "« Vous verrez le remboursement sur votre carte d'ici jeudi. »" },
            { s: 1, d: "Vérifie que le client est satisfait avant de conclure", v: "« Je peux vous aider pour autre chose ? »" },
          ],
        },
      },
    },
  },

  flow: {
    title: "Comment ça marche",
    lede: "Quel que soit l'usage, chaque simulation suit les trois mêmes étapes.",
    steps: [
      {
        key: "build",
        title: "Construisez la simulation",
        body: "Des scénarios client réalistes, construits à partir de votre entreprise, de votre produit et de vos clients. Choisissez les personnages, les canaux, la difficulté et la langue.",
        alt: "Un personnage IA, Daniel Visser, prévu pour un appel vidéo en anglais, difficulté moyenne, construit à partir du contexte de l'entreprise et de l'offre d'emploi.",
      },
      {
        key: "channels",
        title: "Ils mènent la conversation",
        body: "Vos collaborateurs parlent à des clients simulés par chat, e-mail, téléphone ou appel vidéo, comme votre équipe le fait chaque jour, avec les mêmes objections, les mêmes questions et la même pression.",
        alt: "Les quatre canaux au choix, avec l'appel vidéo et l'e-mail sélectionnés tous les deux pour la même simulation.",
      },
      {
        key: "evaluate",
        title: "Voyez exactement comment ils s'en sont sortis",
        body: "Chaque conversation est notée sur des points de contrôle clairs, avec la preuve derrière chacun. Chaque décision repose ainsi sur ce qu'ils ont vraiment fait.",
        alt: "Un appel vidéo noté : 74 %, avec les points de contrôle atteints et manqués, chacun avec les mots de l'appel qui le prouvent.",
      },
    ],
    persona: {
      tag: "Personnage IA",
      name: "Daniel Visser",
      rows: [
        { label: "Canal", value: "Appel vidéo" },
        { label: "Langue", value: "Anglais" },
        { label: "Difficulté", value: "Moyenne", level: 2 },
      ],
      builtFrom: "Construit à partir de",
      sources: ["Contexte de l'entreprise", "Offre d'emploi"],
    },
    channels: [
      { key: "video", name: "Appel vidéo", on: true },
      { key: "phone", name: "Appel téléphonique" },
      { key: "chat", name: "Chat" },
      { key: "email", name: "E-mail", on: true },
    ],
    report: {
      name: "Lucas Martens",
      pct: "74 %",
      criterion: "Fait émerger le vrai besoin",
      critPct: 80,
      checks: [
        { ok: true, text: "Demande qui tient le budget", said: "« Qui valide ce genre d'outil chez vous ? »" },
        { ok: true, text: "Reformule le problème avec les mots du client", said: "« Donc le problème, ce n'est pas l'outil, c'est que vos commerciaux n'enregistrent plus leurs appels ? »" },
        { ok: false, text: "Fixe une prochaine étape datée", said: "« Parfait, je vous envoie de la documentation et on se recontacte. »" },
      ],
    },
  },

  compare: {
    eyebrow: "La différence",
    titleA: "Deux façons de se",
    titleEm: "tromper",
    titleB: "sur quelqu'un.",
    lede: "Ce qui décide d'habitude qui passe en entretien, et ce qui devrait.",
    cards: [
      {
        ok: false,
        title: "Le CV",
        items: [
          "Des affirmations invérifiées",
          "Des mots-clés, pas des compétences",
          "Écrit pour passer un filtre",
        ],
      },
      {
        ok: false,
        title: "L'intuition",
        items: [
          "Un survol, pas une lecture",
          "L'aisance confondue avec la compétence",
          "Une barre différente pour chaque candidat",
        ],
      },
      {
        ok: true,
        title: "La simulation",
        items: [
          "Vingt minutes du métier",
          "Chaque note, avec sa preuve",
          "Les mêmes critères pour tout le monde, validés d'avance",
        ],
      },
    ],
    note: "Onbord intervient avant l'entretien. La conversation commence sur des preuves, pas sur des suppositions.",
  },

  work: {
    eyebrow: "Ce que font les candidats",
    titleA: "Vingt minutes",
    titleEm: "du métier.",
    titleB: "Pas un questionnaire.",
    lede: "Ils répondent au client qui a un devis moins cher, passent l'appel face caméra, et lisent les chiffres avant la réunion du lundi. L'assistant IA reste ouvert à côté d'eux, comme au travail, et la façon dont ils s'en servent fait partie du résultat.",
  },

  how: {
    eyebrow: "Comment ça marche",
    titleA: "Vous collez.",
    titleEm: "Il construit.",
    titleB: "Vous décidez.",
    lede: "Rien à paramétrer, rien à intégrer, rien à réécrire. Ce qui compte reste entre vos mains.",
    steps: [
      {
        n: "01",
        title: "Collez l'offre",
        body: "Onbord en tire les compétences qui comptent. Vous corrigez, vous validez, et tout se construit sur votre version.",
      },
      {
        n: "02",
        title: "Discutez-en",
        body: "Vous parlez à l'assistant avec vos mots. Il écrit les tâches, le scénario et la grille de notation, modifiables à tout moment.",
      },
      {
        n: "03",
        title: "Envoyez un lien",
        body: "Les candidats font le travail. Vous les recevez classés, avec la phrase derrière chaque chiffre.",
      },
    ],
    viz: {
      drop: { file: "Business-developer.pdf", size: "142 Ko", hint: "Collez le texte, déposez le fichier, ou donnez le lien." },
      talk: { made: "5 étapes écrites · environ 20 min" },
      link: { label: "Prêt à envoyer", url: "onbord.be/s/bd-gand", copied: "Copié" },
    },
    // Le mot qui précède le numéro d'étape sur l'accueil (« Step 1 »).
    stepLabel: "Étape",
    resultTitle: "Voici ce que vous récupérez.",
    resultBody: "Tous les candidats qui ont commencé, classés sur vos critères, avec la preuve à un clic sous chaque chiffre. Onbord construit une liste. Le recruteur décide.",
  },

  proof: {
    eyebrow: "Chaque note, et sa preuve",
    titleA: "Un chiffre que vous pouvez",
    titleEm: "défendre",
    titleB: "en réunion.",
    lede: "Chaque compétence se décompose en sous-dimensions. Chaque niveau décrit un comportement observable. Chaque note renvoie à ce que le candidat a vraiment écrit. Pas un résumé. Pas une supposition.",
  },

  answer: {
    titleA: "Tout le monde reçoit",
    titleEm: "une réponse.",
    titleB: "",
    body: "Y compris ceux que vous écartez, en cent cinquante mots construits sur ce qu'ils ont fait. Le silence est ce qu'un candidat retient d'une entreprise, et il coûte la candidature suivante.",
  },

  // La confiance, à notre façon (09/11/2026, Confiance.js) : quatre
  // engagements, pas de sceau. ⚠️ Règle 2 : chacun est écrit dans les pages
  // légales (données à Paris, pas d'entraînement, décision humaine) ou vrai
  // dans l'application (citations vérifiées, runScoring.js).
  trust: {
    title: "Conçu pour mériter votre confiance",
    lede: "Quatre engagements, écrits dans nos conditions et intégrés au produit, pour utiliser l'IA dans le recrutement et l'onboarding en toute confiance.",
    link: "Comment fonctionne notre IA",
    items: [
      { key: "eu", title: "Vos données restent dans l'UE", body: "Toutes les données sont stockées dans l'Union européenne, sur des serveurs à Paris." },
      { key: "training", title: "Jamais utilisées pour entraîner une IA", body: "Rien de ce que disent vos candidats ou votre équipe dans une simulation ne sert à entraîner un modèle d'IA." },
      { key: "human", title: "Une personne prend chaque décision", body: "Onbord note et explique. Embaucher, juger quelqu'un prêt : la décision reste toujours à votre équipe." },
      { key: "proof", title: "Chaque note montre sa preuve", body: "Chaque point de contrôle montre les mots exacts qui l'ont validé, tirés de la conversation." },
    ],
  },
  // La FAQ (Faq.js). ⚠️ Le lien de la dernière réponse n'est pas encore
  // branché : voir l'en-tête de Faq.js. Langues : EXPERIENCE_LOCALES de
  // l'application (fr, en, nl).
  faq: {
    title: "Questions fréquentes",
    items: [
      { q: "Pour quels postes ?", a: "Les postes en contact avec les clients dans le SaaS B2B : SDR, BDR, account executives, account managers, sales managers, customer success managers et équipes support." },
      { q: "Combien de temps prend la mise en place ?", a: "Onbord construit une première version de la simulation en quelques minutes, à partir du contexte de votre entreprise et du poste. Vous ajustez ce que vous voulez, puis vous l'envoyez. Votre environnement privé est prêt sous 24 heures." },
      { q: "Quelles langues sont disponibles ?", a: "L'anglais, le français et le néerlandais. Chaque simulation se déroule dans une langue, choisie à sa création." },
      { q: "Faut-il intégrer quelque chose ?", a: "Non. Vous partagez un lien. Rien à installer, rien à connecter à vos outils actuels." },
      { q: "Peut-on essayer avant de réserver une démo ?", a: "Oui. Essayez Onbord en 30 secondes, sans carte bancaire ni appel commercial. ", link: "Essayez un jeu de rôle" },
    ],
  },
  // L'appel final (Cta, Bits.js) : les boutons sont ceux du hero.
  cta: {
    title: "Entendez votre équipe à l'œuvre, avant vos clients.",
    body: "Réservez une démo, ou envoyez-nous une fiche de poste et recevez votre environnement privé sous 24 heures.",
  },
};

export default home;
