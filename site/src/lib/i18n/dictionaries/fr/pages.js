// Les quatre pages intérieures — français.
// Même structure que en/pages.js, la version de référence : un bloc = un
// paragraphe court, et rien qui ne soit vrai côté application.

const pages = {
  how: {
    meta: {
      title: "Comment fonctionne Onbord : de votre compte à la liste classée",
      description:
        "Huit étapes : le profil d'entreprise, l'offre d'emploi, les compétences, le pipeline, les questions de présélection, la simulation, votre validation, la liste classée.",
    },
    eyebrow: "Comment ça marche",
    titleA: "De votre compte à une",
    titleEm: "liste classée,",
    titleB: "en huit étapes.",
    lede: "Rien à installer, rien à paramétrer. La moitié des étapes sont les vôtres, et rien n'atteint un candidat avant que vous ne l'ayez validé.",

    steps: [
      {
        n: "01",
        visual: "profile",
        title: "Votre entreprise, lue depuis votre propre site.",
        body: "Vous créez votre compte et vous donnez l'adresse de votre site. Onbord le lit et remplit votre profil : ce que vous vendez, à qui, sur quel ton. Tout ce qui se construit ensuite s'appuie dessus, si bien que vous n'expliquez jamais deux fois votre métier.",
      },
      {
        n: "02",
        visual: "import",
        title: "Votre offre d'emploi, sous la forme que vous avez.",
        body: "Collez le texte, déposez le PDF, ou donnez le lien de l'annonce en ligne. Onbord la lit et prend le relais. Rien n'a besoin d'être réécrit pour lui plaire.",
      },
      {
        n: "03",
        visual: "skills",
        title: "Les compétences, chacune avec la phrase dont elle vient.",
        body: "Onbord extrait les compétences et cite la ligne exacte de l'offre derrière chacune, pour que vous puissiez vérifier plutôt que faire confiance. Il lit aussi la famille de métier et le niveau, parce qu'une simulation pour un manager n'est pas le même exercice que pour un contributeur individuel. Chaque compétence arrive marquée indispensable ou appréciée, et vous corrigez le tri : l'indispensable est ce que la simulation teste vraiment, l'apprécié passe plus légèrement.",
      },
      {
        n: "04",
        visual: "pipeline",
        title: "Un pipeline de recrutement, assemblé pour ce poste.",
        body: "Les questions de présélection d'abord, puis l'expérience candidat. Les entretiens que vous menez déjà y figurent aussi, pour que tout le parcours tienne au même endroit, y compris les étapes qu'Onbord ne prend pas en charge à votre place.",
      },
      {
        n: "05",
        visual: "questions",
        title: "Les questions de présélection sont déjà écrites.",
        body: "Un permis de conduire, un droit de travail, une langue : ce qui disqualifie avant que quiconque ne passe du temps sur qui que ce soit. Elles arrivent rédigées pour ce poste, et vous les modifiez, vous ajoutez les vôtres, ou vous supprimez celles dont vous n'avez pas besoin.",
      },
      {
        n: "06",
        visual: "chat",
        title: "Vous décrivez la simulation. Il l'écrit.",
        body: "Vous dites à l'assistant à quoi le métier ressemble vraiment, avec vos mots. Il pose deux ou trois questions, puis il écrit l'ensemble : les tâches, le scénario, et la grille de notation derrière. Tout ce qu'il a produit peut être réécrit, régénéré ou retiré.",
      },
      {
        n: "07",
        visual: "ready",
        title: "Vous validez, et c'est prêt pour les candidats.",
        body: "Rien n'est publié sur la seule décision du modèle. Vous lisez la simulation et la grille qui servira à noter, vous validez, et l'expérience est prête à partir vers les personnes que vous voulez évaluer.",
      },
      {
        n: "08",
        visual: "shortlist",
        title: "Ils la passent. Vous recevez une liste classée.",
        body: "Les candidats sont notés sur les critères que vous avez validés, et sur rien d'autre. Chaque note porte la phrase du candidat en dessous, vérifiée contre ce qu'il a soumis. Au bout, une liste que vous pouvez défendre ligne par ligne.",
        more: "Comment fonctionne la notation",
        moreTo: "/scoring",
      },
    ],

    viz: {
      profile: {
        tag: "Profil d'entreprise",
        url: "votre-entreprise.be",
        rows: [
          { k: "Secteur", v: "Distribution industrielle" },
          { k: "Vend à", v: "Services achats" },
          { k: "Ton", v: "Direct, factuel" },
        ],
      },
      import: {
        tag: "Nouvelle offre d'emploi",
        options: ["Coller le texte", "Fichier PDF ou Word", "Lien vers l'annonce"],
      },
      skills: {
        tag: "Compétences extraites",
        mustLabel: "Indispensable",
        niceLabel: "Apprécié",
        must: ["Traitement des objections", "Prospection"],
        nice: ["Tenue du CRM", "Appel à froid"],
        evidence: "« Vous traitez quotidiennement les objections de prix des responsables achats. »",
      },
      questions: {
        tag: "Questions de présélection",
        rows: [
          { q: "Avez-vous un permis de conduire valide ?", a: "Oui" },
          { q: "Avez-vous besoin d'un permis de travail ?", a: "Non" },
        ],
      },
      chat: {
        tag: "Cadrage de la simulation",
        msg: "Nos commerciaux vendent à des responsables achats, pas à des fondateurs.",
        result: "5 étapes écrites · environ 20 minutes",
      },
      ready: {
        tag: "Prêt",
        title: "Validé par vous",
        sub: "Tâches, scénario et grille de notation",
        invite: "Prêt pour vos candidats",
      },
    },

    closing: {
      title: "C'est tout.",
      body: "Pas de projet d'implémentation, pas d'atelier de paramétrage. Un compte, une offre, et une liste classée au bout.",
      cta: "Réserver une démo",
    },
  },

  sims: {
    meta: {
      title: "Les simulations : ce que fait vraiment un candidat dans Onbord",
      description:
        "Quatre capacités, façonnées comme votre poste l'exige : écrire, parler, exécuter du code, consigner une fiche. Pas un catalogue figé d'exercices.",
    },
    eyebrow: "Simulations",
    titleA: "Quatre choses qu'un candidat",
    titleEm: "produit vraiment.",
    titleB: "",
    lede: "Onbord n'a pas de catalogue d'exercices. Il a quatre façons de capter ce que quelqu'un a fait, façonnées comme votre poste l'exige.",

    // Les quatre GESTES. Chaque carte a une ICÔNE ABSTRAITE (GestureIcon,
    // par `id`), un nom, et UNE phrase — pas de maquette, pas de deuxième
    // paragraphe. Voir la règle 4 ter du guide : l'icône montre le geste, pas
    // un exemple précis, pour que la carte dise « on peut écrire » et non
    // « voici cet e-mail ».
    families: [
      { id: "write", name: "Écrit", measures: "Écrit, jugement, sens commercial, ton", body: "Une réponse, une note, un mémo : ce que le poste écrit, avec l'assistant IA à côté exactement comme au travail." },
      { id: "speak", name: "Oral", measures: "Oral, présence, réactivité", body: "Une objection, un point, une réponse sous pression : à voix haute, face caméra, en une prise." },
      { id: "run", name: "Code", measures: "Justesse, résolution de problème, débogage", body: "Du vrai code, de vrais tests : le candidat écrit, lance, corrige jusqu'à ce que ça passe. Jamais déployé où que ce soit." },
      { id: "file", name: "Fiches", measures: "Rigueur, souci du détail, prise de notes", body: "De l'information en vrac, la fiche juste au bout, dans le système que le poste utilise vraiment." },
    ],

    // Épilogue de la page, PAS un cinquième geste : aucune maquette ne l'illustre.
    // Voir la règle 4 ter du guide : une direction, jamais une date ou une
    // fonctionnalité livrée. `tag` vit sur CHAQUE item, pas sur le bloc entier.
    next: {
      kicker: "Ce qui s'ajoute",
      title: "Où l'on va ensuite.",
      lede: "Une partie est déjà en cours. Tout le reste est une direction, jamais une date.",
      items: [
        {
          tag: "En cours",
          title: "Une vraie conversation, pas une prise unique",
          body: "Nous construisons un agent qui répond en temps réel, tour par tour : un entretien ou un jeu de rôle en un contre un aujourd'hui, une mise en situation, un cas discuté en direct, ou un comité complet avec plusieurs personnes dans la salle, ensuite.",
        },
        {
          tag: "En construction",
          title: "Ce qui compte en premier",
          body: "Une file de tickets ou de leads en vrac, à trier par urgence, vérifiée contre l'ordre qu'elle mérite vraiment.",
        },
        {
          tag: "En construction",
          title: "Lire un chiffre",
          body: "Un petit jeu de données imparfait, et une décision ou une réponse remplie au bout.",
        },
      ],
    },

    rules: {
      kicker: "Les règles derrière tout ça",
      title: "Ce que le générateur n'a pas le droit de faire.",
      items: [
        {
          title: "Pas de récit rétrospectif",
          body: "« Parlez-moi d'une fois où… » est interdit. Ce qu'un candidat fait maintenant, pas ce qu'il dit avoir fait.",
        },
        {
          title: "Pas de version générique du métier",
          body: "Une étape qui conviendrait à n'importe quelle autre offre au même intitulé est réécrite.",
        },
        {
          title: "L'IA disponible sur au moins deux tâches",
          body: "Plus d'un point de mesure sur sa façon de travailler avec un modèle. Vous pouvez la couper partout.",
        },
        {
          title: "Des niveaux comportementaux, avec exemples",
          body: "Chaque niveau décrit un comportement observable et donne un exemple. « Bonne qualité » est refusé comme niveau.",
        },
      ],
    },

    closing: {
      title: "Lesquels vous obtenez dépend du poste.",
      body: "Un commercial terrain et un analyste back-office n'ont pas la même simulation. Envoyez-nous une offre et voyez.",
      cta: "Réserver une démo",
    },
  },

  scoring: {
    meta: {
      title: "Notation : comment Onbord transforme une réponse en chiffre défendable",
      description:
        "Sous-dimensions, échelles comportementales, citations vérifiées, correction déterministe quand c'est possible, et une mesure de l'usage de l'IA.",
    },
    eyebrow: "Notation",
    titleA: "Un chiffre que vous pouvez",
    titleEm: "défendre",
    titleB: "en réunion.",
    lede: "Quand on demande pourquoi ce candidat passe devant celui-là, la réponse est une phrase que le candidat a écrite.",

    blocks: [
      {
        index: "01",
        kicker: "Structure",
        title: "Une compétence est trop grosse pour être notée. Une sous-dimension, non.",
        body: [
          "« Travail d'équipe » ne se note pas sur cinq. Chaque compétence se décompose en deux ou trois sous-dimensions, et chacune reçoit une échelle à trois niveaux : 1 insuffisant, 3 attendu, 5 excellent, où chaque niveau décrit un comportement visible avec un exemple écrit. Les niveaux vagues sont refusés à la génération.",
        ],
      },
      {
        index: "02",
        kicker: "La preuve",
        title: "Rien n'est affirmé sans citation.",
        body: [
          "Chaque note s'accompagne d'une justification et d'un extrait littéral, et l'extrait est testé contre le texte réellement soumis. Ce qui n'en est pas un extrait authentique est écarté avant que vous ne voyiez le rapport.",
        ],
      },
      {
        index: "03",
        kicker: "Déterminisme",
        title: "Si ça peut être vérifié sans modèle, ça l'est.",
        body: [
          "Trois parties d'une simulation ne passent jamais par un modèle de langage : un QCM comparé au bon index, du code en exécutant les tests, un champ du CRM comparé chaîne par chaîne. Le jugement est réservé à ce qui en demande un : la prose, le raisonnement, le ton, la qualité d'une décision.",
        ],
      },
      {
        index: "04",
        kicker: "L'IA",
        title: "La façon dont ils ont utilisé le modèle fait partie du résultat.",
        body: [
          "Toute la conversation avec l'assistant est enregistrée et lue, et le candidat en est informé avant de commencer. L'utiliser n'est pas noté en soi : ce qui compte, c'est comment — cadrer le problème, itérer sur la réponse, regarder ce qui revient d'un œil critique.",
          "Séparément, quand un passage d'une réponse est reproduit mot pour mot depuis l'assistant, la note de CETTE réponse est plafonnée et le rapport dit dans quelle proportion. Ce qui est évalué reste ce que le candidat a produit.",
        ],
      },
      {
        index: "05",
        kicker: "La décision",
        title: "La machine classe. Une personne décide.",
        body: [
          "Aucun candidat n'est jamais rejeté automatiquement par Onbord. Onbord construit seulement une liste classée : le recruteur prend toujours la décision finale. Ce qui sort est un classement et ses preuves, et qui passe en entretien est une décision humaine, prise chez vous. Les critères étaient les vôtres avant que le premier candidat ne les voie, et tout candidat peut demander une relecture humaine.",
        ],
      },
      {
        index: "06",
        kicker: "Ensuite",
        title: "Le candidat refusé reçoit une vraie réponse.",
        body: [
          "Parce que la preuve existe, le retour ne coûte rien de plus : 120 à 180 mots qui nomment un ou deux points forts réels et ce qui a fait la différence pour ce poste. Si les données sont trop minces pour dire quelque chose de vrai, rien n'est inventé, le système le signale.",
        ],
      },
    ],

    closing: {
      title: "Demandez à voir un vrai rapport.",
      body: "Pas une diapositive sur les rapports : un vrai, sur une vraie offre. Le moyen le plus rapide de juger si tout ceci est exact.",
      cta: "Réserver une démo",
    },
  },

  pricing: {
    meta: {
      title: "Tarifs : Onbord",
      description:
        "Deux plans, des crédits dépensés sur quatre choses seulement, et l'arithmétique à découvert. Core à partir de 85 € par mois, facturé annuellement.",
    },
    eyebrow: "Tarifs",
    titleA: "Des tarifs sans détour",
    titleEm: "",
    titleB: "",
    lede: "Les crédits sont dépensés sur quatre choses. Tout le reste est illimité et gratuit.",

    annual: "Annuel",
    monthly: "Mensuel",
    perMonth: "/mois",
    billedAnnually: "facturé annuellement",
    billedMonthly: "facturé mensuellement",
    save: "15 % d'économie",
    popular: "Le plus choisi",
    creditsPerMonth: "crédits par mois",
    rollover: "Crédits non utilisés reportés",
    onQuote: "Sur devis",
    tailored: "Volume sur mesure",

    plans: {
      core: {
        name: "Core",
        for: "Pour une équipe qui recrute régulièrement.",
        features: [
          "Extraction automatique des compétences depuis n'importe quelle offre",
          "Simulations de travail générées par IA",
          "Notation fondée sur des preuves, avec citations vérifiées",
          "Votre logo, votre couleur et votre ton côté candidat",
          "Étapes vidéo et mises en situation",
          "Support par e-mail",
        ],
        cta: "Choisir Core",
      },
      pro: {
        name: "Pro",
        for: "Pour un recrutement continu sur plusieurs postes.",
        includes: "Tout Core, plus :",
        features: [
          "E-mails automatiques aux candidats",
          "Canal Slack dédié",
          "Support prioritaire",
        ],
        cta: "Choisir Pro",
      },
      custom: {
        name: "Sur mesure",
        for: "Pour un gros volume, ou des contraintes particulières.",
        includes: "Tout Pro, plus :",
        features: [
          "Volume tarifé sur vos chiffres",
          "Gestionnaire de compte dédié",
          "Prise en main avec votre équipe",
        ],
        cta: "Parler à un commercial",
      },
    },

    credits: {
      kicker: "Le barème",
      title: "Quatre choses coûtent des crédits.",
      lede: "C'est toute la liste. Modifier vous-même, publier, inviter, consulter un rapport et envoyer un retour ne coûtent rien.",
      rows: [
        {
          what: "Générer une simulation",
          cost: "6",
          when: "Débité quand l'agent a créé la simulation : la première fois, et à chaque régénération complète.",
          detail:
            "Une génération qui échoue ne coûte rien. L'analyse de l'offre, le choix des compétences, vos modifications et la publication sont compris.",
        },
        {
          what: "Régénérer une étape",
          cost: "1",
          when: "Débité pour chaque étape que l'agent réécrit.",
          detail:
            "Pour retoucher une étape sans refaire tout le parcours. La modifier vous-même ne coûte rien.",
        },
        {
          what: "Un candidat commence",
          cost: "1",
          when: "Débité quand il entre réellement dans la simulation.",
          detail:
            "Un candidat invité qui ne commence jamais ne coûte rien. Une fois par candidat, jamais deux.",
        },
        {
          what: "Un candidat est noté",
          cost: "2",
          when: "Débité à la soumission, quand la correction s'exécute.",
          detail:
            "Jamais redébité, même si vous rouvrez son rapport.",
        },
      ],
      totalLabel: "Un candidat, du début à la fin",
      totalValue: "3 crédits",
    },

    maths: {
      kicker: "Ce que ça achète",
      title: "Le même calcul que celui que vous feriez.",
      lede: "Pas de « jusqu'à X candidats » avec le calcul caché. Le voici.",
      jobsLabel: "simulations créées",
      resultLabel: "candidats évalués",
      note: "Le point, c'est que vous puissiez refaire ce tableau avant de signer, et le vérifier après.",
      assumption: "Ce tableau suppose que chaque candidat invité va jusqu'au bout. En pratique, certains s'arrêteront en route : vos crédits vont alors plus loin, jamais moins.",
    },

    faq: {
      kicker: "Avant que vous ne demandiez",
      items: [
        {
          q: "Les crédits non utilisés sont-ils perdus ?",
          a: "Non, sur un plan annuel. Ce que vous n'utilisez pas dans le mois s'ajoute au suivant : utilisez 200 des 500 crédits de Pro en juin, et juillet démarre à 800. Le solde repart à zéro au renouvellement de l'année.",
        },
        {
          q: "Y a-t-il un essai gratuit ?",
          a: "Mieux : envoyez-nous une vraie offre. Nous construisons la simulation et vous montrons l'ensemble, ce que traverse un candidat, et ce que vous liriez ensuite.",
        },
        {
          q: "Peut-on évaluer des candidats dans une autre langue que la nôtre ?",
          a: "Oui. Le parcours candidat suit la langue de l'offre, français, néerlandais ou anglais, quelle que soit la langue de votre équipe dans l'application.",
        },
        {
          q: "Facturez-vous par utilisateur ?",
          a: "Non. Les accès ne sont pas comptés, et les collègues qui relisent les candidats ne coûtent rien.",
        },
      ],
    },

    closing: {
      title: "Le plus rapide reste d'envoyer une offre.",
      body: "Vous voyez la simulation, la grille de notation et un vrai rapport avant qu'on parle d'argent.",
      cta: "Réserver une démo",
    },
  },

  // La page /demo : coordonnees d'abord, calendrier ensuite (DemoForm.js).
  demo: {
    meta: {
      title: "Réserver une démo : Onbord",
      description: "Laissez vos coordonnées et choisissez un créneau. Nous vous montrons une vraie simulation construite à partir de l'une de vos offres."
    },
    eyebrow: "30 secondes",
    title: "Réserver une démo.",
    lede: "Dites-nous qui vous êtes, puis choisissez le créneau qui vous convient.",
    firstName: "Prénom",
    lastName: "Nom",
    company: "Entreprise",
    email: "E-mail professionnel",
    firstNamePh: "Marie",
    lastNamePh: "Dubois",
    companyPh: "Acme SA",
    emailPh: "marie@acme.be",
    submit: "Choisir un créneau",
    sending: "Un instant",
    missing: "Merci de remplir tous les champs.",
    badEmail: "Merci d'indiquer une adresse e-mail valide.",
    privacy: "Ces informations servent uniquement à préparer votre démo.",
    pickEyebrow: "Étape 2 sur 2",
    pickTitle: "Choisissez un créneau.",
    pickLede: "Merci, {name}. Choisissez un créneau, la confirmation partira à {email}.",
    edit: "Modifier mes informations"
  },
};

export default pages;
