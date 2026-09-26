// Chrome partagé et contenu des maquettes — français.
// Même structure que en/common.js, qui est la version de référence.

const common = {
  nav: {
    how: "Comment ça marche",
    simulations: "Simulations",
    scoring: "Notation",
    pricing: "Tarifs",
    demo: "Réserver une démo",
    login: "Se connecter",
    language: "Changer de langue",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    skip: "Aller au contenu",
  },

  footer: {
    tagline: "Recrutez sur ce que les gens savent vraiment faire.",
    product: "Produit",
    company: "Entreprise",
    legal: "Légal",
    ai: "Transparence IA",
    terms: "Conditions",
    privacy: "Confidentialité",
    contact: "Contact",
    rights: "Tous droits réservés.",
  },

  mocks: {
    scenes: {
      label: "Un candidat qui répond à un e-mail et passe un appel face caméra",
      more: "…suite",
      meName: "Sarah D.",
      themName: "David M.",
      testsLabel: "tests réussis",
      signOff: "Bien à vous,",
      codeFile: "leads.js",
      compose: "Nouveau message",
      to: "À",
      subject: "Objet",
      send: "Envoyer",
      fromInitials: "MD",
      fromName: "Marie De Clercq",
      fromRole: "Responsable achats, Vandelaer NV",
    },

    cv: {
      window: "Candidature reçue il y a 14 minutes",
      initials: "SD",
      name: "Sarah D.",
      role: "Business developer, 4 ans",
      match: "92 % de correspondance",
      lines: [
        "Excellente communicante, à l'aise avec les clients exigeants",
        "Objectifs dépassés trois années de suite",
        "Maîtrise de la tenue du CRM et du suivi de pipeline",
        "Autonome, rigoureuse, orientée résultats",
        "Anglais courant, vrai sens commercial",
      ],
    },

    shortlist: {
      window: "34 candidats",
      waiting: "En attente de réponse",
      rows: [
        { n: "01", initials: "AB", name: "Amine B.", score: "88", state: "Noté", top: true },
        { n: "02", initials: "TV", name: "Tom V.", score: "70", state: "Noté", top: true },
        { n: "03", initials: "SD", name: "Sarah D.", score: "67", state: "Noté", top: false },
        { n: "04", initials: "JM", name: "Julie M.", score: "58", state: "Noté", top: false },
        { n: "05", initials: "KH", name: "Karim H.", score: "", state: "Invité", top: false },
      ],
    },

    // ── Le début du parcours, côté recruteur ────────────────────────────────
    skills: {
      window: "Compétences tirées de votre offre",
      familyLabel: "Famille de métier",
      family: "Vente · Développement commercial",
      hardLabel: "Compétences techniques",
      softLabel: "Savoir-être",
      must: "Indispensable",
      nice: "Apprécié",
      hard: [
        { name: "Prospection", must: true },
        { name: "Traitement des objections", must: true },
        { name: "Écrit professionnel", must: true },
        { name: "Tenue du CRM", must: false },
        { name: "Appel à froid", must: false },
      ],
      soft: [
        { name: "Résilience", must: true },
        { name: "Écoute", must: false },
        { name: "Rigueur", must: false },
      ],
    },

    pipeline: {
      window: "Pipeline de recrutement",
      nodes: [
        { name: "Questions de présélection", meta: "3 questions · filtrent avant que quiconque y passe du temps", on: true },
        { name: "Expérience candidat", meta: "5 étapes · ~20 min", on: true },
        { name: "Entretien en visio", meta: "Mené par votre équipe", on: false },
        { name: "Entretien sur site", meta: "Mené par votre équipe", on: false },
      ],
    },

    chat: {
      window: "Cadrage de l'expérience",
      msgMe: "Nos commerciaux vendent à des responsables achats, pas à des fondateurs. Et retire l'appel à froid, ici tout se passe par e-mail.",
      msgAi: "C'est fait. L'étape 2 met maintenant un responsable achats qui résiste sur les délais, et l'appel est remplacé par une relance écrite après une semaine de silence.",
      changedLabel: "Modifié",
      changed: "Étape 2 réécrite · étape 4 remplacée · grille de notation mise à jour",
    },


    score: {
      skill: "Traiter une objection sur le prix",
      score: "3,7",
      outOf: "/5",
      dims: [
        {
          name: "Nommer l'écart",
          pct: 75,
          quote:
            "Je comprends, sur ces volumes, 8 % d'écart avec votre fournisseur actuel, ce n'est pas rien.",
          why: "Reformule l'objection dans les termes du client avant d'y répondre.",
        },
        {
          name: "Proposer une issue",
          pct: 50,
          quote: "Pourrait-on regarder un engagement sur douze mois ? Cela change le prix unitaire.",
          why: "Avance un levier concret, mais ne vérifie jamais qu'il convient au client.",
        },
        {
          name: "Tenue sous pression",
          pct: 75,
          quote: "Vous avez raison d'insister là-dessus.",
          why: "Reste chaleureux sans céder sur le fond.",
        },
      ],
    },

    aiUsage: {
      window: "Rapport candidat · usage de l'IA",
      msgMe: "Comment répondre à une objection sur le prix quand je ne peux pas baisser le prix ?",
      msgAi:
        "Nommez l'objection au lieu de la contourner, puis déplacez la conversation sur ce que le prix achète : les délais, la garantie de stock, le coût d'une livraison manquée.",
      ai: {
        name: "Usage de l'IA",
        pct: 78,
        why: "78 %, parce que le candidat pose une question précise plutôt que de coller le contexte, reformule la suggestion avec ses propres mots, et retire une ligne jugée hors sujet ici.",
      },
    },

    email: {
      briefLabel: "Contexte",
      brief:
        "Devis concurrent 8 % moins cher, réponse attendue aujourd'hui. Vous pouvez bouger sur les délais de paiement, pas sur le prix unitaire.",
      subject: "Objet",
      subjectValue: "Re : Devis 2291 · votre retour",
      body:
        "Bonjour Madame De Clercq,\n\nMerci d'être revenue vers moi aussi vite, et d'avoir été directe sur l'autre devis. Sur vos volumes, 8 %, ce n'est pas rien, et je ne vais pas prétendre le contraire.",
      assistant: "Assistant IA",
      msgMe: "Comment répondre à une objection sur le prix quand je ne peux pas baisser le prix ?",
      msgAi:
        "Nommez l'objection au lieu de la contourner, puis déplacez la conversation sur ce que le prix achète : les délais, la garantie de stock, le coût d'une livraison manquée.",
    },

    crm: {
      sourceLabel: "Source",
      source: "Message vocal, 48 secondes + chaîne d'e-mails transférée",
      rows: [
        { k: "Société", v: "Vandelaer NV", ok: true },
        { k: "Contact", v: "Marie De Clercq", ok: true },
        { k: "Budget", v: "40–45 k€", ok: true },
        { k: "Échéance", v: "Fin T3", ok: false, expected: "Avant le 30 juin" },
      ],
      flagLabel: "Contradiction dans le brief",
      flag:
        "L'e-mail dit T3. Le message vocal dit « avant fin juin ». Personne n'a dit au candidat de la chercher.",
      missed: "Manquée",
    },

    code: {
      task: "Retirer les leads en double par e-mail, en gardant le premier vu.",
      tests: [
        { name: "retire un e-mail répété", ok: true },
        { name: "garde les leads aux e-mails différents", ok: true },
        { name: "ignore la casse de l'e-mail", ok: true },
        { name: "5 000 leads en moins de 200 ms", ok: false, verdict: "temps dépassé" },
      ],
    },

    live: {
      who: "David M. · au téléphone",
      line:
        "Honnêtement ? On est très bien avec notre fournisseur actuel. Qu'est-ce qui nous ferait ne serait-ce qu'accepter le rendez-vous ?",
      instruction: "Répondez-lui maintenant, à voix haute, comme si vous y étiez.",
      time: "00:34",
      recording: "Enregistrement",
    },

    gen: {
      window: "Génération de la simulation",
      lines: [
        { text: "Lecture de l'offre d'emploi", t: "0:04", state: "done" },
        { text: "Extraction des compétences · 9 trouvées, 6 retenues", t: "0:21", state: "done" },
        { text: "Construction du scénario CRM", t: "1:48", state: "done" },
        {
          text: "Relecture du brouillon face à l'offre",
          t: "2:15",
          state: "now",
          note: "L'étape 3 conviendrait à n'importe quelle offre commerciale. Réécriture autour du recrutement de partenaires.",
        },
        { text: "Réécriture, passe 2 sur 2", t: "", state: "todo" },
      ],
    },
    // Retour écrit envoyé à un candidat non retenu.
    feedback: {
      window: "Retour envoyé à un candidat",
      tabs: [
        {
          id: "next",
          label: "Retenu",
          tag: "Envoyé · invité en entretien",
          body: [
            "Bonjour Amine,",
            "Nous aimerions vous rencontrer. Voici ce qui nous a marqués, pour que vous sachiez ce que nous allons creuser.",
            "Sur l'e-mail à Madame De Clercq, vous avez nommé le vrai chiffre, les 8 % d'écart, avant de défendre le devis. La plupart des candidats commencent par s'excuser.",
            "Un point sur lequel nous reviendrons : la date de livraison que vous lui avez promise n'est confirmée nulle part par écrit.",
          ],
        },
        {
          id: "no",
          label: "Non retenu",
          tag: "Envoyé · non retenu",
          body: [
            "Bonjour Sarah,",
            "Nous n'irons pas plus loin avec votre candidature, et voici pourquoi, plutôt que du silence.",
            "Votre réponse à l'objection sur le prix était parmi les plus claires reçues : vous avez nommé les 8 % au lieu de tourner autour. L'écart s'est fait ensuite, vous avez proposé un engagement de douze mois sans vérifier qu'ils pouvaient le signer.",
            "Pour ce poste, cette vérification est l'essentiel du métier.",
          ],
        },
      ],
    },

    grid: {
      dim: "Repérer une information contradictoire",
      levels: [
        {
          n: "1",
          pct: 0,
          label: "Insuffisant",
          text: "Consigne les deux valeurs sans voir qu'elles se contredisent, ex. : écrit « T3 » et laisse la note vide.",
        },
        {
          n: "3",
          pct: 50,
          label: "Attendu",
          text: "Repère le conflit et retient la source la plus fiable, ex. : « Fin juin (d'après le vocal). »",
        },
        {
          n: "5",
          pct: 100,
          label: "Excellent",
          text: "Le repère, retient la date la plus prudente et la signale, ex. : « Dates contradictoires, confirmer avec Marie avant de chiffrer. »",
        },
      ],
    },
  },
};

export default common;
