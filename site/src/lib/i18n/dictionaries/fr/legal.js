// ─────────────────────────────────────────────────────────────────────────────
// Pages légales publiques : /legal/terms, /legal/privacy, /legal/ai-transparency
//
// Ces trois URL ne sont pas décoratives. L'APPLICATION les ouvre depuis l'écran
// de consentement du candidat (voir src/lib/constants/legal.js du projet
// applicatif, à la racine du dépôt) au moment précis où on lui demande
// d'accepter. Renommer un chemin ici casse ces liens là-bas.
//
// `todo:` devant un paragraphe le fait afficher comme un encart « à compléter »
// bien visible. C'est délibéré : une page légale à moitié inventée qui a l'air
// définitive est pire qu'une page qui dit franchement ce qui manque. Retirez le
// préfixe une fois l'information réelle mise à la place.
// ─────────────────────────────────────────────────────────────────────────────

const legal = {
  draftNotice:
    "Document de travail. Le texte ci-dessous décrit fidèlement le fonctionnement du service, mais il n'a pas encore été relu par un juriste et certaines mentions restent à compléter.",
  todoLabel: "À compléter",
  updatedLabel: "Dernière mise à jour",
  backToHome: "Retour à l'accueil",
  tocLabel: "Sur cette page",

  terms: {
    title: "Conditions générales d'utilisation",
    updated: "15 septembre 2026",
    intro:
      "Ces conditions encadrent l'utilisation d'Onbord, plateforme d'évaluation des candidats par simulation de travail. Elles s'appliquent au client qui souscrit un abonnement comme au candidat invité à passer une évaluation.",
    sections: [
      {
        h: "1. Qui édite le service",
        p: [
          "todo:Dénomination sociale, forme juridique, siège social, numéro d'entreprise (BCE) et numéro de TVA de la société éditrice.",
          "Pour toute question relative aux présentes conditions : hello@onbord.be.",
        ],
      },
      {
        h: "2. Ce que fait le service",
        p: [
          "Onbord transforme une offre d'emploi en évaluation : le service en extrait les compétences attendues, génère une simulation de travail correspondante, puis note les réponses des candidats sur des critères que le client a relus et validés.",
          "Le client reste seul responsable de sa décision d'embauche. Onbord fournit une évaluation et les éléments qui la justifient ; il ne recrute pas à la place du client et ne garantit aucun résultat de recrutement.",
        ],
      },
      {
        h: "3. Comptes",
        p: [
          "L'accès à l'application se fait par compte nominatif. Les comptes sont créés par Onbord à la demande du client ; il n'y a pas d'inscription libre en ligne.",
          "Le client est responsable de la confidentialité des identifiants de son équipe et des actions menées depuis ses comptes. Toute utilisation suspecte doit être signalée sans délai.",
        ],
      },
      {
        h: "4. Abonnement et crédits",
        p: [
          "L'abonnement donne droit à un nombre de crédits par période. Un crédit est consommé à quatre moments : la génération d'une simulation (la première comme chaque régénération complète), la régénération d'une étape de cette simulation, la participation d'un candidat à cette simulation, et la correction de celle-ci. Toutes les autres fonctions sont illimitées.",
          "todo:Durée de la période, règle de report ou d'expiration des crédits non consommés, modalités de renouvellement, de changement de plan et de résiliation, délai de préavis.",
          "todo:Conditions de facturation et de paiement : échéance, moyen de paiement, pénalités de retard, politique de remboursement.",
        ],
      },
      {
        h: "5. Usage acceptable",
        p: [
          "Le client s'engage à n'utiliser Onbord que pour évaluer des candidatures réelles, dans le cadre de recrutements réels, et à ne pas s'en servir pour discriminer un candidat sur un critère protégé par la loi.",
          "Sont interdits : la revente du service, l'extraction automatisée massive de son contenu, les tentatives de contournement des limites de l'abonnement, et le dépôt de contenus illicites dans les offres ou les profils d'entreprise.",
        ],
      },
      {
        h: "6. Propriété intellectuelle",
        p: [
          "La plateforme, son code, ses modèles d'évaluation et son interface restent la propriété d'Onbord. L'abonnement confère un droit d'usage, non une cession.",
          "Les offres d'emploi, contenus d'entreprise et données de candidats déposés par le client restent la propriété du client. Onbord ne les utilise que pour rendre le service, dans les limites fixées par la politique de confidentialité.",
        ],
      },
      {
        h: "7. Disponibilité et responsabilité",
        p: [
          "Onbord met en œuvre les moyens raisonnables pour assurer la disponibilité du service, sans garantie d'absence totale d'interruption. Des fenêtres de maintenance peuvent être nécessaires.",
          "todo:Plafond de responsabilité, exclusions (dommages indirects, perte de chance) et engagement de niveau de service éventuel.",
        ],
      },
      {
        h: "8. Droit applicable",
        p: [
          "Les présentes conditions sont soumises au droit belge.",
          "todo:Tribunal compétent en cas de litige, et mention du recours amiable préalable.",
        ],
      },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    updated: "15 septembre 2026",
    intro:
      "Cette page explique quelles données personnelles Onbord traite, pourquoi, pendant combien de temps, et ce que vous pouvez exiger. Elle concerne deux publics très différents : le recruteur qui utilise la plateforme, et le candidat qui passe une évaluation.",
    sections: [
      {
        h: "1. Responsable du traitement",
        p: [
          "todo:Identité et coordonnées complètes du responsable du traitement, et, le cas échéant, du délégué à la protection des données.",
          "Pour toute question ou pour exercer vos droits : hello@onbord.be.",
          "Une précision qui compte : lorsqu'une entreprise cliente évalue ses candidats avec Onbord, c'est elle le responsable du traitement de ces candidatures. Onbord agit alors comme sous-traitant, pour son compte et sur ses instructions.",
        ],
      },
      {
        h: "2. Données traitées",
        p: [
          "Côté recruteur : nom, adresse e-mail professionnelle, entreprise, préférences d'interface, journal d'utilisation du service et données de facturation.",
          "Côté candidat : nom, adresse e-mail, CV et pièces déposées, réponses rédigées pendant la simulation, enregistrements audio ou vidéo lorsqu'un exercice en prévoit, transcriptions de ces enregistrements, notes obtenues et justifications associées.",
          "Aucune donnée sensible au sens du RGPD n'est demandée. Un candidat qui en ferait spontanément figurer dans son CV nous la communique de son propre chef ; ces éléments n'entrent pas dans l'évaluation.",
        ],
      },
      {
        h: "3. Finalités et bases légales",
        p: [
          "Rendre le service — générer l'évaluation, la faire passer, la corriger, transmettre les résultats au recruteur : exécution du contrat conclu avec l'entreprise cliente, et intérêt légitime de celle-ci à évaluer ses candidatures.",
          "Envoyer les messages liés au parcours (invitation, rappel, retour au candidat) : exécution du contrat.",
          "Améliorer la qualité du service et prévenir les abus : intérêt légitime, sur des données réduites au strict nécessaire.",
        ],
      },
      {
        h: "4. Ce qui n'est pas fait de vos données",
        p: [
          "Les données de candidats ne sont ni vendues, ni louées, ni transmises à des tiers à des fins publicitaires.",
          "Elles ne servent pas à entraîner des modèles d'intelligence artificielle : les fournisseurs auxquels Onbord fait appel sont liés par des engagements contractuels qui excluent l'entraînement sur les contenus transmis via leur interface professionnelle.",
        ],
      },
      {
        h: "5. Sous-traitants",
        p: [
          "Onbord s'appuie sur un petit nombre de prestataires techniques, chacun sous contrat de sous-traitance : hébergement de l'application et du site (Vercel), base de données et authentification (Supabase), génération et correction assistées par IA (Anthropic), envoi des e-mails transactionnels (Resend).",
          "todo:Localisation des traitements et, pour les transferts hors Espace économique européen, mécanisme juridique retenu (clauses contractuelles types, décision d'adéquation).",
        ],
      },
      {
        h: "6. Durée de conservation",
        p: [
          "Les données d'un candidat sont conservées le temps du processus de recrutement concerné, puis supprimées ou anonymisées. Une purge automatique s'exécute chaque nuit sur les éléments arrivés à échéance.",
          "todo:Durée exacte de conservation après clôture d'un recrutement, et durée de conservation des comptes recruteurs inactifs.",
        ],
      },
      {
        h: "7. Vos droits",
        p: [
          "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données, ainsi que du droit de ne pas faire l'objet d'une décision fondée exclusivement sur un traitement automatisé (voir la page Transparence IA).",
          "Un candidat adresse sa demande à l'entreprise qui l'évalue, ou directement à hello@onbord.be : nous la relayons.",
          "Vous pouvez introduire une réclamation auprès de l'Autorité de protection des données (autoriteprotectiondonnees.be).",
        ],
      },
      {
        h: "8. Cookies",
        p: [
          "Le site public utilise un seul cookie, qui mémorise la langue choisie dans le sélecteur. Il est strictement nécessaire au fonctionnement du site et ne sert à aucun suivi publicitaire.",
          "todo:À compléter si des outils de mesure d'audience ou de marketing sont ajoutés au site — leur présence rendrait une bannière de consentement obligatoire.",
        ],
      },
    ],
  },

  ai: {
    title: "Transparence sur l'usage de l'IA",
    updated: "15 septembre 2026",
    intro:
      "Onbord utilise l'intelligence artificielle à plusieurs endroits de son fonctionnement. Cette page dit lesquels, ce que la machine décide, ce qu'elle ne décide pas, et ce que vous pouvez exiger si une évaluation vous semble injuste.",
    sections: [
      {
        h: "1. Où l'IA intervient",
        p: [
          "Lecture de l'offre d'emploi : un modèle de langage en extrait les compétences attendues, le niveau requis et le contexte du poste.",
          "Construction de l'évaluation : le même type de modèle rédige les scénarios, les consignes et les critères de notation qui en découlent.",
          "Correction : les réponses du candidat sont comparées à ces critères et donnent lieu à une note assortie d'une justification écrite, rattachée à des extraits précis de la réponse.",
        ],
      },
      {
        h: "2. Ce que l'IA ne décide pas",
        p: [
          "Aucun candidat n'est jamais rejeté automatiquement par Onbord. Onbord construit seulement une liste classée : le recruteur prend toujours la décision finale. L'évaluation ne produit rien de plus que la note et les éléments de preuve derrière cette décision.",
          "Les critères de notation sont relus et validés par le recruteur avant que le premier candidat ne passe l'évaluation. Une évaluation n'est jamais mise en ligne sur les seuls choix du modèle.",
        ],
      },
      {
        h: "3. L'usage de l'IA par le candidat",
        p: [
          "Les simulations autorisent l'usage d'outils d'IA, parce que le travail réel les autorise. Chercher à les interdire reviendrait à évaluer une situation qui n'existe plus.",
          "La qualité de cet usage fait partie de ce qui est évalué : savoir quoi demander, vérifier ce qui revient et corriger ce qui ne va pas est une compétence professionnelle, traitée comme telle.",
        ],
      },
      {
        h: "4. Limites connues",
        p: [
          "Un modèle de langage peut se tromper : mal comprendre une réponse rédigée dans un style inhabituel, mal transcrire un enregistrement audio, ou appliquer un critère de façon trop littérale.",
          "C'est précisément pourquoi chaque note est rendue avec sa justification et l'extrait qui la fonde : une note qu'on ne peut pas remonter jusqu'à sa source ne devrait jamais peser sur une décision.",
        ],
      },
      {
        h: "5. Demander une relecture humaine",
        p: [
          "Tout candidat peut demander qu'une personne réexamine son évaluation, obtenir les raisons de la note, et faire valoir son point de vue.",
          "La demande s'adresse à l'entreprise qui organise le recrutement, ou à hello@onbord.be, qui la transmettra.",
        ],
      },
      {
        h: "6. Fournisseurs de modèles",
        p: [
          "Les modèles utilisés sont ceux d'Anthropic (famille Claude), appelés via leur interface professionnelle.",
          "Les contenus transmis ne servent pas à entraîner ces modèles. Voir la politique de confidentialité pour la liste complète des sous-traitants.",
        ],
      },
    ],
  },
};

export default legal;
