// Messages d'ouverture et de clôture de l'entretien mené par l'IA.
//
// ── Même règle que lib/emails/templates.js ─────────────────────────────────
// Ces textes sont DITS AU CANDIDAT. Ils suivent donc jobs.experience_locale et
// non la langue du dashboard — d'où leur présence ici plutôt que dans les
// dictionnaires i18n, qui rendent dans la langue de l'interface.
//
// Ce ne sont que des VALEURS PAR DÉFAUT : le recruteur les réécrit dans
// l'éditeur, et c'est sa version qui est stockée dans
// jobs.ai_interview_config. Changer la langue d'une offre ne réécrit donc pas
// un texte déjà personnalisé — c'est voulu, on ne touche pas à ce qu'il a écrit.
//
// Les clés de tonalité ("Formel", "Neutre", "Décontracté") sont les valeurs
// STOCKÉES en base : elles ne changent pas. Seuls les libellés affichés se
// traduisent, via dashboard.aiInterview.tone.

export const TONALITIES = ["Formel", "Neutre", "Décontracté"];

// {title} est remplacé par l'intitulé du poste au moment de l'entretien.
const INTRO = {
  fr: {
    Formel:
      "Bonjour. Je suis Leo, assistant IA pour [Nom de l'entreprise]. L'objectif de cet échange est de parcourir vos compétences pour le poste de {title}. Êtes-vous prêt à commencer ?",
    Neutre:
      "Bonjour ! Je suis Leo, l'assistant IA de [Nom de l'entreprise]. Je suis ravi d'échanger avec vous aujourd'hui pour le poste de {title}. L'objectif de cet échange est de mieux comprendre votre parcours. Êtes-vous prêt ?",
    Décontracté:
      "Salut ! Moi c'est Leo, l'assistant IA de [Nom de l'entreprise]. Super content d'échanger avec toi pour le poste de {title}. On va parler un peu de ton parcours. Prêt ?",
  },
  en: {
    Formel:
      "Hello. I'm Leo, AI assistant for [Company name]. The purpose of this conversation is to go through your skills for the {title} role. Are you ready to begin?",
    Neutre:
      "Hello! I'm Leo, the AI assistant at [Company name]. I'm glad to be speaking with you today about the {title} role. The aim of this conversation is to understand your background better. Ready when you are?",
    Décontracté:
      "Hi! I'm Leo, the AI assistant at [Company name]. Really glad to chat with you about the {title} role. We'll talk a bit about your background. Ready?",
  },
  nl: {
    Formel:
      "Goedendag. Ik ben Leo, AI-assistent voor [Bedrijfsnaam]. Het doel van dit gesprek is om je vaardigheden voor de functie {title} door te nemen. Bent u klaar om te beginnen?",
    Neutre:
      "Hallo! Ik ben Leo, de AI-assistent van [Bedrijfsnaam]. Fijn om je vandaag te spreken over de functie {title}. Het doel van dit gesprek is om je achtergrond beter te leren kennen. Ben je er klaar voor?",
    Décontracté:
      "Hey! Ik ben Leo, de AI-assistent van [Bedrijfsnaam]. Leuk om met je te praten over de functie {title}. We gaan het even over je achtergrond hebben. Klaar?",
  },
};

const OUTRO = {
  fr: {
    Formel:
      "Je vous remercie pour vos réponses détaillées. L'équipe recrutement va analyser votre profil et reviendra vers vous prochainement. Bonne journée.",
    Neutre:
      "Merci beaucoup pour cet échange ! L'équipe recrutement va analyser vos réponses et reviendra vers vous très prochainement. Excellente journée !",
    Décontracté:
      "Merci pour cette super discussion ! L'équipe recrutement va regarder tout ça et te tiendra au courant très vite. Passe une belle journée !",
  },
  en: {
    Formel:
      "Thank you for your detailed answers. The hiring team will review your profile and get back to you shortly. Have a good day.",
    Neutre:
      "Thank you very much for this conversation! The hiring team will review your answers and get back to you very soon. Have a great day!",
    Décontracté:
      "Thanks for the great chat! The hiring team will look at everything and let you know very soon. Have a lovely day!",
  },
  nl: {
    Formel:
      "Dank u voor uw uitgebreide antwoorden. Het recruitmentteam bekijkt uw profiel en neemt binnenkort contact met u op. Nog een fijne dag.",
    Neutre:
      "Heel erg bedankt voor dit gesprek! Het recruitmentteam bekijkt je antwoorden en neemt snel contact met je op. Een fijne dag verder!",
    Décontracté:
      "Bedankt voor het leuke gesprek! Het recruitmentteam bekijkt alles en laat het je snel weten. Fijne dag nog!",
  },
};

const fallback = (table, locale) => table[locale] || table.fr;

export const introTemplates = (locale) => fallback(INTRO, locale);
export const outroTemplates = (locale) => fallback(OUTRO, locale);
