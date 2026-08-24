// ─────────────────────────────────────────────────────────────────────────────
// Deux axes de langue INDÉPENDANTS. Les confondre est l'erreur qui coûte cher
// à défaire, parce qu'elle se propage dans le schéma DB et dans les prompts.
//
//  • UI_LOCALES         → langue du recruteur dans le dashboard. Préférence
//                          utilisateur, stockée sur users.ui_locale + cookie.
//  • EXPERIENCE_LOCALES → langue de l'offre et du parcours candidat. Propriété
//                          de l'OFFRE (jobs.experience_locale), choisie à la
//                          création et figée ensuite : l'expérience générée est
//                          stockée rédigée dans cette langue.
//
// Un client néerlandophone qui travaille en anglais a ui_locale="en" et publie
// des offres en experience_locale="nl". Les deux ne se déduisent pas l'un de
// l'autre.
// ─────────────────────────────────────────────────────────────────────────────

export const UI_LOCALES = ["fr", "en"];
export const EXPERIENCE_LOCALES = ["fr", "en", "nl"];

export const DEFAULT_UI_LOCALE = "fr";
export const DEFAULT_EXPERIENCE_LOCALE = "fr";

export const LOCALE_COOKIE = "onbord_ui_locale";

// En-tête posé par le proxy à partir du préfixe d'URL, et lu par app/layout.js.
// Ce layout est AU-DESSUS du segment [lang] : il ne peut pas lire params.lang,
// et sans cet en-tête son <html lang> divergerait de l'URL dès qu'un lien
// préfixé est ouvert dans un navigateur dont le cookie dit autre chose.
export const LOCALE_HEADER = "x-onbord-locale";

// Nom affiché dans les sélecteurs : toujours dans SA PROPRE langue (un
// néerlandophone cherche "Nederlands", pas "Néerlandais").
export const LOCALE_LABELS = {
  fr: "Français",
  en: "English",
  nl: "Nederlands",
};

// Nom en toutes lettres injecté dans les prompts IA. Le modèle reçoit des
// instructions en français mais doit écrire dans cette langue-là.
export const LOCALE_NAMES_FR = {
  fr: "français",
  en: "anglais",
  nl: "néerlandais",
};

// Étiquette BCP-47 pour <html lang>, Intl.DateTimeFormat et localeCompare.
export const LOCALE_TAGS = {
  fr: "fr-FR",
  en: "en-GB",   // clientèle belge : dates jour/mois, pas le format US
  nl: "nl-BE",
};

export function isUiLocale(v) {
  return UI_LOCALES.includes(v);
}

export function isExperienceLocale(v) {
  return EXPERIENCE_LOCALES.includes(v);
}

/** Ramène n'importe quelle entrée (cookie corrompu, colonne vide, en-tête
 *  Accept-Language) sur une locale d'interface valide. */
export function coerceUiLocale(v) {
  if (typeof v !== "string") return DEFAULT_UI_LOCALE;
  const base = v.toLowerCase().split("-")[0];
  return isUiLocale(base) ? base : DEFAULT_UI_LOCALE;
}

export function coerceExperienceLocale(v) {
  if (typeof v !== "string") return DEFAULT_EXPERIENCE_LOCALE;
  const base = v.toLowerCase().split("-")[0];
  return isExperienceLocale(base) ? base : DEFAULT_EXPERIENCE_LOCALE;
}
