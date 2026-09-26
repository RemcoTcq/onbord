// Page d'accueil — français.
// Même structure que en/home.js, la version de référence. Lire l'en-tête de ce
// fichier-là : c'est une page d'accueil et pas un mode d'emploi, le problème ne
// se nomme jamais, le texte est court, on dit « simulation », pas de tiret
// cadratin, et aucun prix ni crédit sur cette page.

const home = {
  meta: {
    title: "Onbord — Recrutez sur les compétences. Pas sur le CV.",
    description:
      "Collez une offre d'emploi. Onbord la transforme en simulation de travail, l'envoie à vos candidats et les classe sur ce qu'ils ont réellement fait, avec la preuve derrière chaque chiffre.",
  },

  hero: {
    // Formulation de l'auteur, a garder telle quelle. Mesuree, la premiere
    // ligne est plus longue que la place disponible (1056px pour 1004 sur
    // ordinateur) : le titre fait trois lignes la ou l'anglais en fait deux.
    // Une version courte (« Jugez sur pieces. ») a ete proposee pour tenir
    // sur deux lignes partout, et refusee.
    titleA: "Recrutez sur",
    titleEm: "les compétences.",
    titleB: "Pas sur le CV.",
    lede: "Collez une offre. Onbord construit la simulation, l'envoie, et classe vos candidats sur ce qu'ils ont vraiment fait.",
    primary: "Réserver une démo",

    peek: {
      job: "Business developer",
      experience: "Expérience candidat",
      duration: "~20 min",
      writing: "écriture",
      steps: [
        { name: "Répondre à une objection sur le prix", format: "E-mail", min: "6 min" },
        { name: "Passer l'appel face caméra", format: "Direct", min: "5 min" },
        { name: "Remplir la fiche", format: "CRM", min: "4 min" },
        { name: "Nettoyer une liste de leads en double", format: "Code", min: "" },
      ],
    },

    play: {
      label: "Décrivez le poste que vous cherchez à pourvoir",
      placeholders: [
        "Je veux une simulation pour un business developer",
        "Je veux une simulation pour tester si quelqu'un sait coder en Python",
        "Je veux une simulation pour un office manager",
      ],
      send: "Construire la simulation",
    steps: [
        "Compréhension du poste",
        "Choix des compétences à tester",
        "Construction de la simulation",
        "Écriture de la grille de notation",
        "Relecture",
      ],
      done: {
        title: "C'est là que la vraie commence.",
        body: "Envoyez-nous l'offre et nous la construisons pour de bon, avec ses tâches et sa grille de notation. Vous la voyez en entier avant le premier candidat.",
        primary: "Nous l'envoyer",
        secondary: "Parler à quelqu'un",
        again: "Essayer un autre poste",
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
    lede: "Ils répondent au client qui a un devis moins cher, passent l'appel face caméra, et corrigent le bug avant la mise en production. L'assistant IA reste ouvert à côté d'eux, comme au travail, et la façon dont ils s'en servent fait partie du résultat.",
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

  cta: {
    titleA: "Envoyez une offre.",
    titleEm: "Onbord construit",
    titleB: "la simulation.",
    body: "Une vraie offre, et vous voyez tout : les tâches, la grille de notation, et le rapport que vous liriez ensuite.",
    primary: "Réserver une démo",
  },
};

export default home;
