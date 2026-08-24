// Segments d'URL traduits.
//
// ── Le principe ─────────────────────────────────────────────────────────────
// Le SYSTÈME DE FICHIERS reste en français : app/[lang]/(dashboard)/accueil/.
// C'est la forme CANONIQUE, la seule que Next sait faire correspondre à une
// route. L'URL anglaise /en/home en est une projection, produite à l'aller par
// les helpers de navigation et défaite au retour par le proxy (rewrite).
//
// L'alternative — dupliquer l'arborescence, un dossier par langue — double
// chaque page et chaque layout, et fait diverger les deux copies au premier
// correctif appliqué d'un seul côté. Ici il n'y a qu'une page, et une table.
//
// ── Ce qui n'est PAS traduit ────────────────────────────────────────────────
// Les segments déjà identiques dans les deux langues (jobs, admin, billing,
// branding, assessments, experience, login, register) n'ont rien à faire ici :
// la table ne contient que ce qui change réellement.
//
// Les routes du parcours candidat non plus — elles n'ont pas de préfixe de
// langue par conception (voir app/[lang]/layout.js), et leurs liens sont déjà
// partis par e-mail.

import { UI_LOCALES, DEFAULT_UI_LOCALE } from "./config";

// Clé = segment canonique (français, tel qu'il est sur le disque).
// Valeur = sa traduction par locale. Une locale absente garde le canonique.
const SEGMENTS = {
  accueil:   { en: "home" },
  compte:    { en: "account" },
  profil:    { en: "profile" },
  securite:  { en: "security" },
  couts:     { en: "costs" },
  nouveau:   { en: "new" },
  candidats: { en: "candidates" },
};

// Table inverse, construite une fois : "home" → "accueil" pour la locale en.
// Sans elle, le proxy devrait balayer SEGMENTS à chaque segment de chaque
// requête — il tourne sur le chemin critique de TOUTES les pages.
const INVERSE = {};
for (const locale of UI_LOCALES) {
  INVERSE[locale] = {};
  for (const [canonique, trads] of Object.entries(SEGMENTS)) {
    const traduit = trads[locale];
    if (traduit) INVERSE[locale][traduit] = canonique;
  }
}

/** Applique une table de correspondance à chaque segment d'un chemin. */
function mapper(chemin, table) {
  if (!chemin || !chemin.startsWith("/")) return chemin;
  // Le premier élément du split est vide (le chemin commence par "/"), les
  // suivants sont les segments. Une valeur dynamique (UUID d'offre, de
  // candidat) ne figure dans aucune table : elle traverse inchangée.
  const segments = chemin.split("/").map((s) => table[s] || s);
  return segments.join("/") || "/";
}

/**
 * Chemin canonique (français) → chemin affiché dans la langue demandée.
 * "/accueil" + "en" → "/home". Sans préfixe de langue : c'est l'affaire de
 * withLocale, qui appelle celle-ci.
 */
export function localiserChemin(chemin, locale) {
  if (!locale || locale === DEFAULT_UI_LOCALE) return chemin;
  const table = {};
  for (const [canonique, trads] of Object.entries(SEGMENTS)) {
    if (trads[locale]) table[canonique] = trads[locale];
  }
  return mapper(chemin, table);
}

/**
 * Chemin affiché → chemin canonique (français), celui du système de fichiers.
 * "/home" + "en" → "/accueil". C'est ce que le proxy donne à Next, et ce que
 * stripLocale renvoie pour que les comparaisons de lien actif restent écrites
 * une seule fois, en français.
 */
export function canoniserChemin(chemin, locale) {
  if (!locale || locale === DEFAULT_UI_LOCALE) return chemin;
  return mapper(chemin, INVERSE[locale] || {});
}

/** Le chemin change-t-il en passant en canonique ? (évite un rewrite inutile) */
export function aBesoinDeReecriture(chemin, locale) {
  return canoniserChemin(chemin, locale) !== chemin;
}
