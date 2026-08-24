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

export function nomLangue(valeurStockee, locale) {
  return LANGUES[valeurStockee]?.[locale] || valeurStockee;
}

export function nomDiplome(valeurStockee, locale) {
  return DIPLOMES[valeurStockee]?.[locale] || valeurStockee;
}
