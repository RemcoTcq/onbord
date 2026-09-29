import { DEFAULT_LOCALE } from "./config";

// ─────────────────────────────────────────────────────────────────────────────
// Segments d'URL traduits.
//
// Le système de fichiers ne connaît qu'une orthographe : `app/[lang]/how-it-works`.
// Mais un visiteur francophone doit lire `/fr/comment-ca-marche` dans sa barre
// d'adresse, et un moteur de recherche doit indexer cette adresse-là — c'est le
// mot de l'URL qui porte une bonne part du référencement d'une page.
//
// D'où deux fonctions et un REWRITE dans le proxy (pas une redirection) : le
// navigateur garde /fr/comment-ca-marche, Next reçoit /fr/how-it-works.
//
// ⚠️ /legal/* N'EST PAS TRADUIT, et ne doit jamais l'être : l'application ouvre
// ces trois URL en dur (src/lib/constants/legal.js, à la racine du dépôt) et
// elles sont déjà parties par e-mail à des candidats.
// ─────────────────────────────────────────────────────────────────────────────

/** Chemin canonique (celui des dossiers) → sa traduction, par langue. */
// ⚠️ /how-it-works, /simulations et /scoring ont ete RETIREES : leur contenu
// part dans le blog. La nav pointe desormais sur les sections de l accueil
// (ancres), et ces trois chemins ne doivent pas revenir ici tant que les
// pages n existent pas — ils alimentent le sitemap, donc les remettre
// declarerait a Google des URL qui repondent 404.
const SEGMENTS = {
  // Meme chemin dans toutes les langues : c'est une page de formulaire, pas
  // une page a referencer, et un mot traduit n'y apporterait rien.
  "/demo": {
    en: "/demo",
    fr: "/demo",
    nl: "/demo",
  },
  "/pricing": {
    en: "/pricing",
    fr: "/tarifs",
    nl: "/tarieven",
  },
};

/** Index inverse, construit une fois : traduction → chemin canonique. */
const INVERSE = {};
for (const [canonique, trads] of Object.entries(SEGMENTS)) {
  for (const [locale, chemin] of Object.entries(trads)) {
    INVERSE[locale] ||= {};
    INVERSE[locale][chemin] = canonique;
  }
}

/** Chemin canonique → chemin affiché dans la barre d'adresse. */
export function localiserChemin(chemin, locale) {
  return SEGMENTS[chemin]?.[locale] || chemin;
}

/** Chemin affiché → chemin canonique, celui que Next sait faire correspondre. */
export function canoniserChemin(chemin, locale) {
  return INVERSE[locale]?.[chemin] || chemin;
}

/** URL complète d'une page, préfixe de langue compris. */
export function href(chemin, locale) {
  if (chemin === "/") return `/${locale}`;
  return `/${locale}${localiserChemin(chemin, locale)}`;
}

/** Tous les chemins canoniques, pour le sitemap et les hreflang. */
export const CHEMINS = ["/", ...Object.keys(SEGMENTS)];

/**
 * Les trois pages légales. Leurs slugs sont identiques dans les trois langues :
 * c'est un contrat avec l'application, pas un oubli de traduction.
 */
export const CHEMINS_LEGAUX = [
  "/legal/terms",
  "/legal/privacy",
  "/legal/ai-transparency",
];

export { DEFAULT_LOCALE };
