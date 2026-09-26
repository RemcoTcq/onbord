// Nom d'une langue, et d'un niveau de diplôme, dans une autre langue.
//
// Ces valeurs sont STOCKÉES en français : `extracted_criteria.languages[].name`
// et `extracted_criteria.education_level` alimentent le moteur de
// recommandation, le prompt de scoring et les `value=` du formulaire. Le prompt
// d'extraction les épingle au français exprès (voir consigneLangueExtraction).
//
// Ce module ne sert qu'à les AFFICHER. Il existe parce que les questions
// qualifiantes générées sont lues par le CANDIDAT : sur une offre en anglais,
// « Maîtrisez-vous le Anglais » doit devenir « Do you speak English ». Une
// valeur inconnue (langue saisie à la main) traverse inchangée.

const LANGUES = {
  "Français":    { fr: "français",    en: "French",  nl: "Frans" },
  "Anglais":     { fr: "anglais",     en: "English", nl: "Engels" },
  "Néerlandais": { fr: "néerlandais", en: "Dutch",   nl: "Nederlands" },
  "Allemand":    { fr: "allemand",    en: "German",  nl: "Duits" },
  "Espagnol":    { fr: "espagnol",    en: "Spanish", nl: "Spaans" },
  "Italien":     { fr: "italien",     en: "Italian", nl: "Italiaans" },
};

const DIPLOMES = {
  "Master":      { fr: "Master",     en: "Master's",   nl: "master" },
  "Bachelier":   { fr: "Bachelier",  en: "Bachelor's", nl: "bachelor" },
  "Indifférent": { fr: "Indifférent", en: "Any",       nl: "Onbelangrijk" },
};

// ── Le niveau de langue : un curseur de 1 à 5, lu en CECR ─────────────────────
// `languages[].level` est stocké de 1 à 5, et le reste (formulaire, extraction,
// scoring de CV) raisonne sur cette échelle. Mais un recruteur pense en A1–C2 :
// « 3/5 » ne lui dit rien, « B2 » lui dit tout. D'où cette table, seule
// traduction entre les deux.
//
// Cinq crans pour six niveaux : c'est le bas qui fusionne. A1 et A2 ne
// départagent presque jamais deux candidats, alors que B2 → C1 est LE seuil
// d'un poste où l'on travaille dans la langue. Le défaut du formulaire (3)
// tombe ainsi sur B2, le minimum usuel en contexte professionnel.
const CECR = { 1: "A1–A2", 2: "B1", 3: "B2", 4: "C1", 5: "C2" };

/** Niveau CECR d'un niveau stocké (1-5). Hors échelle : chaîne vide. */
export function niveauCecr(level) {
  return CECR[Math.round(Number(level))] || "";
}

/** « B2 (3/5) » — la forme à donner aux prompts, qui lisent les deux échelles. */
export function niveauLangueLisible(level) {
  const cecr = niveauCecr(level);
  return cecr ? `${cecr} (${level}/5)` : `${level}/5`;
}

export function nomLangue(valeurStockee, locale) {
  return LANGUES[valeurStockee]?.[locale] || valeurStockee;
}

export function nomDiplome(valeurStockee, locale) {
  return DIPLOMES[valeurStockee]?.[locale] || valeurStockee;
}
