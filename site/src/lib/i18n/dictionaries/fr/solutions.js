// Les trois pages « Solutions ». Voir en/solutions.js (langue de référence)
// pour les règles et ce qui n'existe pas encore dans l'application.

const solutions = {
  faqTitle: "Questions fréquentes",

  hiring: {
    meta: {
      title: "Recruter avec des simulations client | Onbord",
      description: "Recrutez vos équipes sales, customer success et support sur ce qu'elles font vraiment face à un client : des simulations réalistes, des grilles claires et un retour pour chaque candidat.",
    },
    tag: "Recrutement",
    title: "Recrutez mieux, plus vite.",
    lede: "Onbord s'appuie sur des simulations client réalistes et des grilles d'évaluation claires pour vous aider à trouver les bonnes personnes en sales, customer success et support, sans vous fier à votre instinct.",
    blocks: [
      {
        key: "simulations",
        title: "Des simulations client réalistes",
        body: "Voyez comment les candidats gèrent un client avant de les embaucher. Ils échangent par chat, par e-mail, au téléphone ou en visio avec un client simulé, construit à partir de votre offre et de votre entreprise.",
        visual: "conversation",
        alt: "Un candidat en chat avec Daniel Visser, un client simulé qui conteste le prix.",
      },
      {
        key: "scorecards",
        title: "Des grilles fiables",
        body: "Chaque candidat est évalué sur des points de contrôle clairs, que vous validez. Chaque note montre les mots exacts qui la justifient.",
        visual: "report",
        alt: "Un critère déplié : chaque point de contrôle atteint ou manqué, avec les mots du candidat dessous.",
      },
      {
        key: "ranking",
        title: "Trouvez vite vos meilleurs candidats",
        body: "Les candidats sont classés sur les mêmes situations : vous comparez ce qui est comparable. Présélectionnez les meilleurs en un clic.",
        visual: "cands",
        alt: "Les candidats d'une offre, classés par note globale.",
      },
      {
        key: "feedback",
        title: "Un retour pour chaque candidat",
        body: "Chaque candidat reçoit une réponse personnelle, fondée sur ce qu'il a réellement fait. Modifiez-la et envoyez-la en deux clics.",
        visual: "feedback",
        alt: "L'e-mail de retour envoyé à une candidate, qui cite ce qu'elle a fait pendant la simulation.",
      },
    ],
    faq: [
      { q: "La simulation peut-elle coller à nos postes et à nos processus ?", a: "Oui. Chaque simulation est construite à partir de votre offre et de votre entreprise : le client parle comme les vôtres et les situations suivent votre processus. Vous relisez chaque étape avant de l'envoyer." },
      { q: "Combien de temps dure une simulation pour un candidat ?", a: "Une vingtaine de minutes. Vous voyez la durée avant l'envoi, et les candidats la passent depuis un simple lien, quand cela leur convient." },
      { q: "Quelles langues Onbord prend-il en charge ?", a: "L'anglais, le français et le néerlandais. Chaque simulation se déroule dans une langue, choisie à sa création." },
      { q: "Les candidats savent-ils qu'ils parlent à une IA ?", a: "Oui. Avant de commencer, les candidats acceptent que l'IA analyse leurs réponses, et qu'une personne de votre entreprise prenne la décision finale." },
      { q: "Faut-il intégrer quelque chose ?", a: "Non. Vous partagez un lien. Rien à installer, rien à connecter à vos outils actuels." },
    ],
    cta: "Prêt à voir qui sait vraiment faire le travail ?",
  },

  onboarding: {
    meta: {
      title: "L'onboarding des nouvelles recrues par simulations client | Onbord",
      description: "Préparez plus vite vos nouvelles recrues sales, customer success et support : des modules d'entraînement construits à partir de votre entreprise, un retour clair, et un seul endroit pour voir qui est prêt.",
    },
    tag: "Onboarding des nouvelles recrues",
    title: "Préparez vos recrues plus vite.",
    lede: "Onbord transforme votre pitch deck et les connaissances de votre entreprise en entraînement réaliste : vos recrues mènent de vraies conversations client avant de rencontrer un vrai client.",
    blocks: [
      {
        key: "practice",
        title: "S'entraîner dès le premier jour",
        body: "Raccourcissez la courbe d'apprentissage. Vos recrues s'entraînent aux conversations de leur poste dès leur premier jour, au lieu d'apprendre sur de vrais clients.",
        visual: "modules",
        alt: "L'onboarding de Lucas Martens : cinq modules d'entraînement, deux terminés, un en cours.",
      },
      {
        key: "company",
        title: "Construit à partir de votre entreprise",
        body: "Importez votre pitch deck, les informations produit et les questions fréquentes de vos clients. Onbord en fait des modules d'entraînement pour chaque poste.",
        visual: "source",
        alt: "Un module d'entraînement, un appel de découverte, construit à partir du pitch deck et du guide produit.",
      },
      {
        key: "feedback",
        title: "Un retour clair sur chaque module",
        body: "Chaque module est évalué sur des points de contrôle clairs, avec les mots exacts derrière chaque note. Vos recrues savent quoi améliorer.",
        visual: "done",
        alt: "Un module terminé : chaque point de contrôle validé ou manqué, avec les mots de la recrue dessous.",
      },
      {
        key: "ready",
        title: "Voyez qui est prêt",
        body: "Suivez la progression de chaque recrue au même endroit. Sachez qui est prêt pour de vrais clients, et qui a besoin de s'entraîner encore.",
        visual: "ready",
        alt: "Trois nouvelles recrues et leur progression, Lucas Martens presque prêt pour son premier jour.",
      },
    ],
    faq: [
      { q: "Comment Onbord raccourcit-il la montée en compétence ?", a: "Vos recrues s'entraînent aux vraies conversations de leur poste avant de rencontrer un client, et chaque module leur dit quoi améliorer. À leur premier vrai appel, elles l'ont déjà mené plusieurs fois." },
      { q: "Que devons-nous fournir ?", a: "Votre pitch deck, vos informations produit et les questions que vos clients posent le plus souvent. Onbord en tire les modules, et vous relisez chacun avant sa mise en ligne." },
      { q: "Cela remplace-t-il nos formations ?", a: "Non. Cela y ajoute l'entraînement. Votre équipe continue de former, et vos recrues répètent ce qu'elles ont appris avec des clients simulés jusqu'à ce que ce soit acquis." },
      { q: "Pour quels postes ?", a: "Les postes en contact avec les clients dans le SaaS B2B : SDR, BDR, account executives, account managers, sales managers, customer success managers et équipes support." },
      { q: "Les managers peuvent-ils suivre la progression ?", a: "Oui. Les modules, les notes et la progression de chaque recrue sont au même endroit : les managers voient qui est prêt pour de vrais clients et qui a besoin de s'entraîner encore." },
    ],
    cta: "Prêt à faire monter votre prochaine recrue en compétence ?",
  },

  saas: {
    meta: {
      title: "Simulations client pour les équipes SaaS B2B | Onbord",
      description: "Recrutez et formez vos équipes sales, customer success et support SaaS sur des conversations client réalistes : démos, renouvellements et tickets urgents, par chat, e-mail, téléphone ou visio.",
    },
    tag: "SaaS B2B",
    title: "Le SaaS va vite.",
    lede: "Vos équipes sales, customer success et support doivent apprendre vite, suivre les évolutions du produit et gérer des clients exigeants dès le premier jour.",
    blocks: [
      {
        key: "hire",
        title: "Recrutez des personnes qui savent gérer vos clients",
        body: "Les équipes en croissance recrutent chaque trimestre. Onbord vous montre qui sait mener une démo, un renouvellement ou un ticket urgent avant de l'embaucher.",
        visual: "cands",
        alt: "Les candidats d'une offre, classés par note globale.",
      },
      {
        key: "onboarding",
        title: "Un onboarding plus rapide",
        body: "Rendez vos recrues opérationnelles des semaines plus tôt. Elles s'entraînent sur votre produit et vos clients avant leur première vraie conversation.",
        visual: "modules",
        alt: "L'onboarding d'une recrue : cinq modules d'entraînement, deux terminés, un en cours.",
      },
      {
        key: "product",
        title: "Suivez votre produit",
        body: "Nouvelles fonctionnalités, nouveaux tarifs, nouveaux processus. Votre équipe répète le nouveau message avant qu'il n'arrive chez un client.",
        visual: "updated",
        alt: "Un module d'entraînement marqué Mis à jour, reconstruit à partir des nouveaux tarifs et des notes de version.",
      },
      {
        key: "channels",
        title: "Toutes les conversations client",
        body: "Du premier e-mail de prospection à l'appel de renouvellement et au ticket support, Onbord les simule toutes, par chat, e-mail, téléphone ou visio.",
        visual: "channels",
        alt: "Les quatre canaux côte à côte : chat, e-mail, téléphone et visio.",
      },
    ],
    faq: [
      { q: "À quelles équipes SaaS s'adresse Onbord ?", a: "Aux équipes en contact avec les clients : SDR, BDR, account executives, account managers, sales managers, customer success managers et support." },
      { q: "Peut-il gérer un produit technique ?", a: "Oui. Les simulations sont construites à partir de ce que vous dites à Onbord de votre entreprise et de votre produit : le client pose des questions sur vos fonctionnalités, avec vos mots. Vous relisez chaque étape avant sa mise en ligne." },
      { q: "Quelles langues Onbord prend-il en charge ?", a: "L'anglais, le français et le néerlandais. Chaque simulation se déroule dans une langue, choisie à sa création." },
      { q: "Où sont stockées nos données ?", a: "Dans l'Union européenne, sur des serveurs à Paris. Rien de ce que dit votre équipe dans une simulation ne sert à entraîner un modèle d'IA." },
    ],
    cta: "Prêt à recruter et à former plus vite ?",
  },

  visuals: {
    report: { name: "Amine B.", pct: "88 %" },
    conversation: {
      initials: "DV",
      name: "Daniel Visser",
      status: "En ligne",
      step: "Étape 2 sur 3 · Chat",
      contextLabel: "Situation :",
      context: "Daniel dirige les sales ops de Brightline. Il a répondu à votre e-mail, mais il n'est pas encore convaincu.",
      messages: [
        { from: "them", text: "On paie déjà un CRM. Pourquoi ajouter un autre outil ?" },
        { from: "me", text: "Bonne question. Que se passe-t-il aujourd'hui quand un commercial oublie d'enregistrer un appel ?" },
        { from: "them", text: "On perd l'historique. Le trimestre dernier, ça nous a coûté deux renouvellements." },
      ],
      typing: "Daniel écrit…",
      placeholder: "Votre message à Daniel…",
    },
    feedback: {
      title: "Retour : Sarah D.",
      sent: "Envoyé le 12 nov.",
      toLabel: "À",
      to: "sarah.d@email.com",
      subjectLabel: "Objet",
      subject: "Votre candidature au poste d'Account Executive",
    },
    source: {
      kind: "call",
      title: "Appel de découverte",
      sub: "Avec un nouveau prospect",
      tag: "Module",
      rows: [
        { label: "Poste", value: "Account executive" },
        { label: "Canal", value: "Visio" },
        { label: "Durée", value: "15 min" },
      ],
      builtFrom: "Construit à partir de",
      sources: ["Pitch deck", "Guide produit"],
    },
    done: {
      name: "Appel de découverte · Lucas Martens",
      pct: "82 %",
      criterion: "Qualifie l'opportunité",
      critPct: 82,
      passed: "Validé",
      missed: "Manqué",
      checks: [
        { ok: true, text: "Interroge sur le processus actuel", said: "« Comment vos commerciaux enregistrent-ils leurs appels aujourd'hui ? »" },
        { ok: true, text: "Relie une fonctionnalité au problème", said: "« C'est exactement le rôle de la synchronisation des appels : plus rien à saisir à la main. »" },
        { ok: false, text: "Fixe une prochaine étape datée", said: "« Je vous envoie la présentation et on se reparle bientôt. »" },
      ],
    },
    ready: {
      title: "Nouvelles recrues",
      people: [
        { main: true, initials: "LM", name: "Lucas Martens", role: "Account executive", state: "Dans les temps", tone: "ok", label: "Prêt pour le premier jour", modules: "4 modules sur 5", pct: 80 },
        { initials: "EP", name: "Emma Peeters", role: "Customer success manager", state: "En cours", tone: "cur", label: "Prêt pour le premier jour", modules: "2 modules sur 5", pct: 40 },
        { initials: "NJ", name: "Noah Janssens", role: "Spécialiste support", state: "À entraîner", tone: "wait", label: "Prêt pour le premier jour", modules: "1 module sur 5", pct: 20 },
      ],
    },
    updated: {
      kind: "call",
      title: "Présenter les nouveaux tarifs",
      sub: "À un client existant",
      tag: "Mis à jour",
      updated: true,
      rows: [
        { label: "Poste", value: "Account manager" },
        { label: "Canal", value: "Téléphone" },
        { label: "Mis à jour", value: "3 nov." },
      ],
      builtFrom: "Construit à partir de",
      sources: ["Nouveaux tarifs", "Notes de version"],
    },
    channels: [
      { key: "chat", name: "Chat", use: "Support en direct" },
      { key: "email", name: "E-mail", use: "Premier contact" },
      { key: "phone", name: "Téléphone", use: "Renouvellement" },
      { key: "video", name: "Visio", use: "Démo produit" },
    ],
  },
};

export default solutions;
