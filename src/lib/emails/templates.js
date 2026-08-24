// Modèles d'e-mails envoyés AUX CANDIDATS.
//
// ── Pourquoi ils ne passent PAS par les dictionnaires i18n ──────────────────
// `t()` rend dans la langue de l'INTERFACE. Or ces messages sont lus par le
// candidat : ils doivent suivre jobs.experience_locale. Un recruteur en
// interface anglaise qui écrit à un candidat néerlandophone doit obtenir un
// brouillon en néerlandais.
//
// Les trois langues sont donc embarquées ensemble et choisies par la locale de
// l'offre, pas par celle du provider. Le volume le permet : une dizaine de
// chaînes.
//
// ── Jetons ──────────────────────────────────────────────────────────────────
// Les marqueurs {{…}} sont en ANGLAIS NEUTRE et identiques dans les trois
// langues. Auparavant ils étaient en français accentué ({{prénom_candidat}}),
// ce qui donnait des jetons français au milieu d'un e-mail néerlandais — que le
// recruteur ne savait pas relire. Ils ne sont jamais persistés (le modèle est
// recalculé à l'ouverture de la fenêtre), le changement ne casse donc rien.

export const EMAIL_TOKENS = {
  candidateFirstName: "{{candidate_first_name}}",
  jobTitle: "{{job_title}}",
  companyName: "{{company_name}}",
  interviewLink: "{{interview_link}}",
  recruiterFirstName: "{{recruiter_first_name}}",
};

const T = EMAIL_TOKENS;

export const EMAIL_TEMPLATES = {
  fr: {
    selected: {
      label: "Candidat sélectionné",
      subject: `Votre candidature chez ${T.companyName}`,
      body: `Bonjour ${T.candidateFirstName},

Nous avons le plaisir de vous informer que votre candidature pour le poste de ${T.jobTitle} a retenu toute notre attention.

Nous allons revenir vers vous très prochainement pour convenir d'un entretien avec notre équipe.

Merci pour l'intérêt que vous portez à ${T.companyName}.

À bientôt,

${T.recruiterFirstName} — ${T.companyName}`,
    },
    rejected: {
      label: "Candidat refusé",
      subject: `Votre candidature pour le poste de ${T.jobTitle}`,
      body: `Bonjour ${T.candidateFirstName},

Nous vous remercions d'avoir postulé pour le poste de ${T.jobTitle} chez ${T.companyName} et du temps que vous y avez consacré.

Après examen de votre candidature, nous ne sommes malheureusement pas en mesure de donner une suite favorable à votre dossier pour ce poste.

Nous vous souhaitons plein succès dans votre recherche.

Cordialement,

${T.recruiterFirstName} — ${T.companyName}`,
    },
  },

  en: {
    selected: {
      label: "Candidate shortlisted",
      subject: `Your application at ${T.companyName}`,
      body: `Hello ${T.candidateFirstName},

We're pleased to let you know that your application for the ${T.jobTitle} role has caught our attention.

We'll be in touch very shortly to arrange an interview with our team.

Thank you for your interest in ${T.companyName}.

Speak soon,

${T.recruiterFirstName} — ${T.companyName}`,
    },
    rejected: {
      label: "Candidate rejected",
      subject: `Your application for the ${T.jobTitle} role`,
      body: `Hello ${T.candidateFirstName},

Thank you for applying for the ${T.jobTitle} role at ${T.companyName}, and for the time you put into it.

Having reviewed your application, we're unfortunately not able to take it further for this role.

We wish you every success in your search.

Best regards,

${T.recruiterFirstName} — ${T.companyName}`,
    },
  },

  nl: {
    selected: {
      label: "Kandidaat geselecteerd",
      subject: `Je sollicitatie bij ${T.companyName}`,
      body: `Hallo ${T.candidateFirstName},

We laten je graag weten dat je sollicitatie voor de functie ${T.jobTitle} onze aandacht heeft getrokken.

We nemen binnenkort contact met je op om een gesprek met ons team in te plannen.

Bedankt voor je interesse in ${T.companyName}.

Tot binnenkort,

${T.recruiterFirstName} — ${T.companyName}`,
    },
    rejected: {
      label: "Kandidaat afgewezen",
      subject: `Je sollicitatie voor de functie ${T.jobTitle}`,
      body: `Hallo ${T.candidateFirstName},

Bedankt voor je sollicitatie voor de functie ${T.jobTitle} bij ${T.companyName} en voor de tijd die je erin hebt gestoken.

Na het bekijken van je sollicitatie kunnen we helaas niet verder met je kandidatuur voor deze functie.

We wensen je veel succes met je zoektocht.

Met vriendelijke groet,

${T.recruiterFirstName} — ${T.companyName}`,
    },
  },
};

/** Modèles dans la langue de l'offre, avec repli sur le français. */
export function templatesFor(locale) {
  return EMAIL_TEMPLATES[locale] || EMAIL_TEMPLATES.fr;
}
