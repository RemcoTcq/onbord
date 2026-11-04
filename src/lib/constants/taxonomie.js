// Référentiel des compétences commerciales. Une compétence ajoutée à la main
// dans le formulaire d'offre y est rapprochée pour recevoir son `taxonomy_id`
// (JobFormStep2). Il ne conçoit rien : les simulations partent de l'offre et
// de ce que le recruteur valide, jamais d'un parcours tiré d'ici.
//
// Périmètre d'Onbord depuis le 04/11/2026 : sales et customer success /
// support. Les compétences propres au CS et au support n'y figurent pas encore.
export const TAXONOMIE_COMPETENCES = [
  {
    "ID": "C001",
    "Compétence": "Prospection téléphonique",
    "Catégorie": "Technique",
    "Définition courte": "Initier des appels à froid pour créer des opportunités commerciales.",
    "Compétences proches": "Cold calling, prise de contact"
  },
  {
    "ID": "C002",
    "Compétence": "Prospection email",
    "Catégorie": "Technique",
    "Définition courte": "Rédiger et envoyer des emails à froid qui génèrent des réponses.",
    "Compétences proches": "Cold emailing, séquençage"
  },
  {
    "ID": "C003",
    "Compétence": "Social selling (LinkedIn)",
    "Catégorie": "Technique",
    "Définition courte": "Utiliser les réseaux sociaux pro pour identifier et engager des prospects.",
    "Compétences proches": "Prospection LinkedIn, personal branding"
  },
  {
    "ID": "C004",
    "Compétence": "Génération de leads",
    "Catégorie": "Technique",
    "Définition courte": "Créer un flux régulier d'opportunités commerciales qualifiées.",
    "Compétences proches": "Lead gen, sourcing"
  },
  {
    "ID": "C005",
    "Compétence": "Conception de séquences d'outreach",
    "Catégorie": "Technique",
    "Définition courte": "Construire une séquence multi-canal de prise de contact structurée.",
    "Compétences proches": "Cadence, multi-touch"
  },
  {
    "ID": "C006",
    "Compétence": "Prise de rendez-vous",
    "Catégorie": "Technique",
    "Définition courte": "Transformer un premier contact en rendez-vous commercial.",
    "Compétences proches": "Booking, setting"
  },
  {
    "ID": "C007",
    "Compétence": "Détection de signaux d'achat",
    "Catégorie": "Technique",
    "Définition courte": "Repérer les indices qui révèlent une intention d'achat.",
    "Compétences proches": "Buying signals, intent"
  },
  {
    "ID": "C008",
    "Compétence": "Traitement des demandes entrantes",
    "Catégorie": "Technique",
    "Définition courte": "Qualifier et convertir les leads inbound efficacement.",
    "Compétences proches": "Inbound, réactivité"
  },
  {
    "ID": "C009",
    "Compétence": "Qualification de prospects",
    "Catégorie": "Technique",
    "Définition courte": "Évaluer si un prospect correspond au profil client idéal.",
    "Compétences proches": "BANT, MEDDIC, ICP"
  },
  {
    "ID": "C010",
    "Compétence": "Découverte des besoins",
    "Catégorie": "Technique",
    "Définition courte": "Mener un entretien pour comprendre les enjeux réels du client.",
    "Compétences proches": "Discovery, questionnement"
  },
  {
    "ID": "C011",
    "Compétence": "Analyse des besoins client",
    "Catégorie": "Technique",
    "Définition courte": "Structurer et hiérarchiser les besoins exprimés et latents.",
    "Compétences proches": "Needs analysis"
  },
  {
    "ID": "C012",
    "Compétence": "Qualification d'opportunités",
    "Catégorie": "Technique",
    "Définition courte": "Estimer la probabilité et la valeur d'une opportunité.",
    "Compétences proches": "Deal scoring, MEDDIC"
  },
  {
    "ID": "C013",
    "Compétence": "Conduite d'entretien de besoin",
    "Catégorie": "Technique",
    "Définition courte": "Structurer un échange pour faire émerger le besoin client.",
    "Compétences proches": "Discovery call"
  },
  {
    "ID": "C014",
    "Compétence": "Cadrage de réunion commerciale",
    "Catégorie": "Technique",
    "Définition courte": "Fixer objectif, agenda et étapes suivantes d'un rendez-vous.",
    "Compétences proches": "Agenda, next steps"
  },
  {
    "ID": "C015",
    "Compétence": "Vente consultative",
    "Catégorie": "Technique",
    "Définition courte": "Conseiller le client en se positionnant en partenaire de confiance.",
    "Compétences proches": "Consultative selling"
  },
  {
    "ID": "C016",
    "Compétence": "Vente de solution",
    "Catégorie": "Technique",
    "Définition courte": "Vendre une réponse à un problème plutôt qu'un produit.",
    "Compétences proches": "Solution selling"
  },
  {
    "ID": "C017",
    "Compétence": "Vente de valeur",
    "Catégorie": "Technique",
    "Définition courte": "Articuler la valeur économique de l'offre pour le client.",
    "Compétences proches": "Value selling, ROI"
  },
  {
    "ID": "C018",
    "Compétence": "Storytelling commercial",
    "Catégorie": "Technique",
    "Définition courte": "Utiliser le récit pour rendre une offre mémorable et convaincante.",
    "Compétences proches": "Pitch, narration"
  },
  {
    "ID": "C019",
    "Compétence": "Démonstration produit",
    "Catégorie": "Technique",
    "Définition courte": "Présenter le produit en le reliant aux besoins du client.",
    "Compétences proches": "Demo, présentation produit"
  },
  {
    "ID": "C020",
    "Compétence": "Présentation de proposition commerciale",
    "Catégorie": "Technique",
    "Définition courte": "Présenter une proposition de manière claire et persuasive.",
    "Compétences proches": "Pitch de proposition"
  },
  {
    "ID": "C021",
    "Compétence": "Construction de business case / ROI",
    "Catégorie": "Technique",
    "Définition courte": "Bâtir une justification chiffrée de l'investissement client.",
    "Compétences proches": "Business case, ROI"
  },
  {
    "ID": "C022",
    "Compétence": "Persuasion / influence",
    "Catégorie": "Technique",
    "Définition courte": "Amener l'interlocuteur à adhérer par des leviers d'influence.",
    "Compétences proches": "Influence, conviction"
  },
  {
    "ID": "C023",
    "Compétence": "Gestion des objections",
    "Catégorie": "Technique",
    "Définition courte": "Traiter les freins et réticences du prospect avec aisance.",
    "Compétences proches": "Objection handling"
  },
  {
    "ID": "C024",
    "Compétence": "Techniques de closing",
    "Catégorie": "Technique",
    "Définition courte": "Conclure une vente au bon moment avec la bonne approche.",
    "Compétences proches": "Closing, signature"
  },
  {
    "ID": "C025",
    "Compétence": "Négociation commerciale",
    "Catégorie": "Technique",
    "Définition courte": "Trouver un accord profitable tout en préservant la relation.",
    "Compétences proches": "Négociation, deal"
  },
  {
    "ID": "C026",
    "Compétence": "Négociation de contrats",
    "Catégorie": "Technique",
    "Définition courte": "Négocier les termes contractuels et conditions commerciales.",
    "Compétences proches": "Contract negotiation"
  },
  {
    "ID": "C027",
    "Compétence": "Contrôle et orientation de la discussion",
    "Catégorie": "Technique",
    "Définition courte": "Garder le fil et diriger l'échange vers l'objectif.",
    "Compétences proches": "Pilotage d'échange"
  },
  {
    "ID": "C028",
    "Compétence": "Exploitation de la psychologie de la contrepartie",
    "Catégorie": "Technique",
    "Définition courte": "Lire et utiliser les motivations de l'autre partie.",
    "Compétences proches": "Psychologie de la négo"
  },
  {
    "ID": "C029",
    "Compétence": "Gestion des appels d'offres (RFP)",
    "Catégorie": "Technique",
    "Définition courte": "Répondre de manière structurée et compétitive à un RFP.",
    "Compétences proches": "RFP, appels d'offres"
  },
  {
    "ID": "C030",
    "Compétence": "Rédaction de propositions / devis",
    "Catégorie": "Technique",
    "Définition courte": "Produire des propositions commerciales claires et complètes.",
    "Compétences proches": "Proposal writing, devis"
  },
  {
    "ID": "C031",
    "Compétence": "Gestion du cycle de vente",
    "Catégorie": "Technique",
    "Définition courte": "Piloter une opportunité de la prise de contact au closing.",
    "Compétences proches": "Sales cycle"
  },
  {
    "ID": "C032",
    "Compétence": "Gestion du pipeline",
    "Catégorie": "Technique",
    "Définition courte": "Maintenir et prioriser un portefeuille d'opportunités.",
    "Compétences proches": "Pipeline management"
  },
  {
    "ID": "C033",
    "Compétence": "Forecasting / prévision des ventes",
    "Catégorie": "Technique",
    "Définition courte": "Estimer les revenus futurs à partir du pipeline.",
    "Compétences proches": "Forecast, prévision"
  },
  {
    "ID": "C034",
    "Compétence": "Suivi commercial (follow-up)",
    "Catégorie": "Technique",
    "Définition courte": "Relancer au bon rythme pour faire avancer les deals.",
    "Compétences proches": "Follow-up, relance"
  },
  {
    "ID": "C035",
    "Compétence": "Gestion des parties prenantes",
    "Catégorie": "Technique",
    "Définition courte": "Identifier et gérer les différents décideurs d'un compte.",
    "Compétences proches": "Stakeholder management"
  },
  {
    "ID": "C036",
    "Compétence": "Vente multi-interlocuteurs",
    "Catégorie": "Technique",
    "Définition courte": "Coordonner plusieurs contacts dans un même compte.",
    "Compétences proches": "Multi-threading"
  },
  {
    "ID": "C037",
    "Compétence": "Account management",
    "Catégorie": "Technique",
    "Définition courte": "Développer et fidéliser un portefeuille de comptes existants.",
    "Compétences proches": "Gestion de comptes"
  },
  {
    "ID": "C038",
    "Compétence": "Gestion des comptes stratégiques",
    "Catégorie": "Technique",
    "Définition courte": "Piloter les comptes clés à fort potentiel de revenus.",
    "Compétences proches": "Key account management"
  },
  {
    "ID": "C039",
    "Compétence": "Upselling",
    "Catégorie": "Technique",
    "Définition courte": "Augmenter la valeur d'un compte par des offres supérieures.",
    "Compétences proches": "Montée en gamme"
  },
  {
    "ID": "C040",
    "Compétence": "Cross-selling",
    "Catégorie": "Technique",
    "Définition courte": "Vendre des produits complémentaires à un client existant.",
    "Compétences proches": "Vente croisée"
  },
  {
    "ID": "C041",
    "Compétence": "Rétention client",
    "Catégorie": "Technique",
    "Définition courte": "Limiter le churn et prolonger la relation client.",
    "Compétences proches": "Rétention, anti-churn"
  },
  {
    "ID": "C042",
    "Compétence": "Gestion des cycles de renouvellement",
    "Catégorie": "Technique",
    "Définition courte": "Anticiper et sécuriser les renouvellements de contrats.",
    "Compétences proches": "Renewals"
  },
  {
    "ID": "C043",
    "Compétence": "Techniques de référencement client",
    "Catégorie": "Technique",
    "Définition courte": "Obtenir des recommandations de clients satisfaits.",
    "Compétences proches": "Referral, recommandation"
  },
  {
    "ID": "C044",
    "Compétence": "Gestion de la relation post-vente",
    "Catégorie": "Technique",
    "Définition courte": "Assurer le suivi et la satisfaction après la signature.",
    "Compétences proches": "Onboarding, suivi client"
  },
  {
    "ID": "C045",
    "Compétence": "Élaboration de stratégie de vente",
    "Catégorie": "Technique",
    "Définition courte": "Définir l'approche et les priorités commerciales.",
    "Compétences proches": "Sales strategy"
  },
  {
    "ID": "C046",
    "Compétence": "Gestion de territoire",
    "Catégorie": "Technique",
    "Définition courte": "Organiser et optimiser un secteur commercial.",
    "Compétences proches": "Territory management"
  },
  {
    "ID": "C047",
    "Compétence": "Utilisation des indicateurs et gestion du temps",
    "Catégorie": "Technique",
    "Définition courte": "Piloter son activité via les bons KPIs et la priorisation.",
    "Compétences proches": "Métriques, time management"
  },
  {
    "ID": "C048",
    "Compétence": "Résilience face au rejet",
    "Catégorie": "Comportementale",
    "Définition courte": "Maintenir sa motivation malgré les refus répétés.",
    "Compétences proches": "Encaisser le non, ténacité"
  },
  {
    "ID": "C049",
    "Compétence": "Persévérance / ténacité",
    "Catégorie": "Comportementale",
    "Définition courte": "Poursuivre l'effort jusqu'à l'atteinte de l'objectif.",
    "Compétences proches": "Grit, persistance"
  },
  {
    "ID": "C050",
    "Compétence": "Orientation résultats",
    "Catégorie": "Comportementale",
    "Définition courte": "Concentrer son énergie sur l'atteinte des objectifs.",
    "Compétences proches": "Results-driven"
  },
  {
    "ID": "C051",
    "Compétence": "Orientation vers les objectifs / motivation",
    "Catégorie": "Comportementale",
    "Définition courte": "Se fixer des buts ambitieux et se motiver pour les atteindre.",
    "Compétences proches": "Goal orientation"
  },
  {
    "ID": "C052",
    "Compétence": "Esprit de compétition",
    "Catégorie": "Comportementale",
    "Définition courte": "Tirer de l'énergie de la performance et du dépassement.",
    "Compétences proches": "Competitiveness"
  },
  {
    "ID": "C053",
    "Compétence": "Motivation intrinsèque",
    "Catégorie": "Comportementale",
    "Définition courte": "Trouver son moteur en soi-même plus que dans la récompense.",
    "Compétences proches": "Drive interne"
  },
  {
    "ID": "C054",
    "Compétence": "Gestion du stress",
    "Catégorie": "Comportementale",
    "Définition courte": "Rester performant sous pression et en situation tendue.",
    "Compétences proches": "Stress management"
  },
  {
    "ID": "C055",
    "Compétence": "Capacité à encaisser la pression des objectifs",
    "Catégorie": "Comportementale",
    "Définition courte": "Tenir face à l'exigence de chiffres et de quotas.",
    "Compétences proches": "Pression quota"
  },
  {
    "ID": "C056",
    "Compétence": "Optimisme / état d'esprit positif",
    "Catégorie": "Comportementale",
    "Définition courte": "Aborder les situations avec une énergie constructive.",
    "Compétences proches": "Positivité, mindset"
  },
  {
    "ID": "C057",
    "Compétence": "Écoute active",
    "Catégorie": "Comportementale",
    "Définition courte": "Écouter pour comprendre réellement et reformuler.",
    "Compétences proches": "Active listening"
  },
  {
    "ID": "C058",
    "Compétence": "Empathie commerciale",
    "Catégorie": "Comportementale",
    "Définition courte": "Comprendre la perspective et les émotions du client.",
    "Compétences proches": "Empathie, rapport"
  },
  {
    "ID": "C059",
    "Compétence": "Intelligence émotionnelle",
    "Catégorie": "Comportementale",
    "Définition courte": "Percevoir et gérer ses émotions et celles des autres.",
    "Compétences proches": "EQ, self-awareness"
  },
  {
    "ID": "C060",
    "Compétence": "Communication verbale",
    "Catégorie": "Comportementale",
    "Définition courte": "S'exprimer clairement et avec impact à l'oral.",
    "Compétences proches": "Expression orale"
  },
  {
    "ID": "C061",
    "Compétence": "Communication écrite",
    "Catégorie": "Comportementale",
    "Définition courte": "Écrire de manière claire, structurée et professionnelle.",
    "Compétences proches": "Écrit pro"
  },
  {
    "ID": "C062",
    "Compétence": "Communication non verbale",
    "Catégorie": "Comportementale",
    "Définition courte": "Lire et utiliser le langage corporel et les signaux.",
    "Compétences proches": "Body language"
  },
  {
    "ID": "C063",
    "Compétence": "Étiquette de communication professionnelle",
    "Catégorie": "Comportementale",
    "Définition courte": "Respecter les codes de courtoisie en contexte pro.",
    "Compétences proches": "Professionalisme"
  },
  {
    "ID": "C064",
    "Compétence": "Capacité à construire des relations",
    "Catégorie": "Comportementale",
    "Définition courte": "Établir rapidement un lien de confiance.",
    "Compétences proches": "Rapport building"
  },
  {
    "ID": "C065",
    "Compétence": "Assertivité",
    "Catégorie": "Comportementale",
    "Définition courte": "S'affirmer avec respect sans agressivité ni passivité.",
    "Compétences proches": "Affirmation de soi"
  },
  {
    "ID": "C066",
    "Compétence": "Diplomatie",
    "Catégorie": "Comportementale",
    "Définition courte": "Gérer les désaccords avec tact et préserver la relation.",
    "Compétences proches": "Tact"
  },
  {
    "ID": "C067",
    "Compétence": "Confiance en soi",
    "Catégorie": "Comportementale",
    "Définition courte": "Aborder les échanges avec assurance et crédibilité.",
    "Compétences proches": "Self-confidence"
  },
  {
    "ID": "C068",
    "Compétence": "Patience",
    "Catégorie": "Comportementale",
    "Définition courte": "Gérer les cycles longs sans précipiter le client.",
    "Compétences proches": "Patience commerciale"
  },
  {
    "ID": "C069",
    "Compétence": "Adaptabilité",
    "Catégorie": "Comportementale",
    "Définition courte": "Ajuster son approche selon l'interlocuteur et le contexte.",
    "Compétences proches": "Flexibilité"
  },
  {
    "ID": "C070",
    "Compétence": "Résolution de problèmes",
    "Catégorie": "Comportementale",
    "Définition courte": "Trouver des solutions face aux obstacles commerciaux.",
    "Compétences proches": "Problem solving"
  },
  {
    "ID": "C071",
    "Compétence": "Pensée critique",
    "Catégorie": "Comportementale",
    "Définition courte": "Analyser une situation avec recul et discernement.",
    "Compétences proches": "Esprit critique"
  },
  {
    "ID": "C072",
    "Compétence": "Esprit analytique",
    "Catégorie": "Comportementale",
    "Définition courte": "Décomposer et interpréter les données et situations.",
    "Compétences proches": "Analyse"
  },
  {
    "ID": "C073",
    "Compétence": "Créativité commerciale",
    "Catégorie": "Comportementale",
    "Définition courte": "Imaginer des approches originales pour conclure.",
    "Compétences proches": "Innovation, créativité"
  },
  {
    "ID": "C074",
    "Compétence": "Curiosité",
    "Catégorie": "Comportementale",
    "Définition courte": "Chercher activement à comprendre le client et le marché.",
    "Compétences proches": "Curiosité"
  },
  {
    "ID": "C075",
    "Compétence": "Capacité d'apprentissage",
    "Catégorie": "Comportementale",
    "Définition courte": "Assimiler rapidement de nouvelles connaissances.",
    "Compétences proches": "Learning agility"
  },
  {
    "ID": "C076",
    "Compétence": "Coachabilité",
    "Catégorie": "Comportementale",
    "Définition courte": "Accueillir le feedback et progresser grâce à lui.",
    "Compétences proches": "Réceptivité au feedback"
  },
  {
    "ID": "C077",
    "Compétence": "Gestion de l'ambiguïté",
    "Catégorie": "Comportementale",
    "Définition courte": "Avancer malgré l'incertitude et le flou.",
    "Compétences proches": "Tolérance à l'incertitude"
  },
  {
    "ID": "C078",
    "Compétence": "Gestion du temps",
    "Catégorie": "Comportementale",
    "Définition courte": "Prioriser et organiser son activité pour être efficace.",
    "Compétences proches": "Time management"
  },
  {
    "ID": "C079",
    "Compétence": "Organisation",
    "Catégorie": "Comportementale",
    "Définition courte": "Structurer son travail et ses suivis avec rigueur.",
    "Compétences proches": "Rigueur, méthode"
  },
  {
    "ID": "C080",
    "Compétence": "Gestion des priorités",
    "Catégorie": "Comportementale",
    "Définition courte": "Distinguer l'urgent de l'important dans son pipeline.",
    "Compétences proches": "Prioritisation"
  },
  {
    "ID": "C081",
    "Compétence": "Autonomie",
    "Catégorie": "Comportementale",
    "Définition courte": "Avancer efficacement sans supervision constante.",
    "Compétences proches": "Indépendance"
  },
  {
    "ID": "C082",
    "Compétence": "Prise d'initiative",
    "Catégorie": "Comportementale",
    "Définition courte": "Agir de soi-même pour saisir les opportunités.",
    "Compétences proches": "Proactivité"
  },
  {
    "ID": "C083",
    "Compétence": "Discipline / rigueur",
    "Catégorie": "Comportementale",
    "Définition courte": "Maintenir des habitudes de travail constantes.",
    "Compétences proches": "Discipline"
  },
  {
    "ID": "C084",
    "Compétence": "Esprit d'équipe / collaboration",
    "Catégorie": "Comportementale",
    "Définition courte": "Travailler efficacement avec les autres fonctions.",
    "Compétences proches": "Collaboration"
  },
  {
    "ID": "C085",
    "Compétence": "Négociation interne",
    "Catégorie": "Comportementale",
    "Définition courte": "Obtenir ressources et arbitrages en interne.",
    "Compétences proches": "Influence interne"
  },
  {
    "ID": "C086",
    "Compétence": "Sens politique",
    "Catégorie": "Comportementale",
    "Définition courte": "Lire les dynamiques de pouvoir chez le client.",
    "Compétences proches": "Acumen politique"
  },
  {
    "ID": "C087",
    "Compétence": "Intégrité commerciale",
    "Catégorie": "Comportementale",
    "Définition courte": "Vendre de façon honnête et durable.",
    "Compétences proches": "Éthique, honnêteté"
  },
  {
    "ID": "C088",
    "Compétence": "Connaissance produit",
    "Catégorie": "Sectorielle",
    "Définition courte": "Maîtriser les caractéristiques et bénéfices de l'offre.",
    "Compétences proches": "Product knowledge"
  },
  {
    "ID": "C089",
    "Compétence": "Connaissance du marché / secteur",
    "Catégorie": "Sectorielle",
    "Définition courte": "Comprendre les dynamiques du secteur visé.",
    "Compétences proches": "Market knowledge"
  },
  {
    "ID": "C090",
    "Compétence": "Connaissance concurrentielle",
    "Catégorie": "Sectorielle",
    "Définition courte": "Se positionner face aux offres alternatives.",
    "Compétences proches": "Competitive intel"
  },
  {
    "ID": "C091",
    "Compétence": "Culture business / Acumen",
    "Catégorie": "Sectorielle",
    "Définition courte": "Comprendre comment les entreprises génèrent du profit.",
    "Compétences proches": "Business acumen"
  },
  {
    "ID": "C092",
    "Compétence": "Compréhension financière de base",
    "Catégorie": "Sectorielle",
    "Définition courte": "Savoir lire un bilan ou un P&L simplifié.",
    "Compétences proches": "Financial acumen"
  },
  {
    "ID": "C093",
    "Compétence": "Maîtrise d'un CRM (Salesforce, HubSpot)",
    "Catégorie": "Outil",
    "Définition courte": "Saisir et exploiter la donnée dans le CRM.",
    "Compétences proches": "CRM, Salesforce, HubSpot"
  },
  {
    "ID": "C094",
    "Compétence": "Maîtrise des outils d'outreach",
    "Catégorie": "Outil",
    "Définition courte": "Utiliser Lemlist, Outreach, SalesLoft, etc.",
    "Compétences proches": "Lemlist, SalesLoft, Outreach"
  },
  {
    "ID": "C095",
    "Compétence": "Maîtrise de LinkedIn Sales Navigator",
    "Catégorie": "Outil",
    "Définition courte": "Sourcer efficacement via la recherche avancée.",
    "Compétences proches": "Sales Nav"
  },
  {
    "ID": "C096",
    "Compétence": "Aisance technologique (outils digitaux)",
    "Catégorie": "Outil",
    "Définition courte": "Apprendre rapidement de nouveaux logiciels.",
    "Compétences proches": "Tech-savvy"
  }
];
