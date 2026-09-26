// ─────────────────────────────────────────────────────────────────────────────
// Les langues du SITE PUBLIC. Rien à voir avec les deux axes de langue de
// l'application (voir docs/i18n.md du projet applicatif) : ici il n'y a pas de
// recruteur connecté, pas d'offre d'emploi, pas de préférence stockée en base.
// Une seule question : dans quelle langue ce visiteur-ci lit la page.
//
// L'ANGLAIS est la langue de référence. C'est celle dans laquelle la copie est
// écrite d'abord, celle vers laquelle retombe tout ce qui manque ailleurs, et
// celle que voit un visiteur dont le navigateur ne demande rien qu'on
// reconnaisse. Le français et le néerlandais sont des traductions de plein
// exercice — clientèle belge — mais ce sont des traductions.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ LE SITE EST PUBLIE EN ANGLAIS SEULEMENT, pour l'instant (septembre
// 2026, demande directe). Le francais et le neerlandais ne sont PAS
// supprimes : leurs dictionnaires restent a jour et complets, et leurs
// traductions d'URL restent dans routes.js. Ils sont simplement en
// sommeil, dans LOCALES_EN_SOMMEIL.
//
// Tout le reste se deduit de LOCALES : pages generees, sitemap, balises
// hreflang, selecteur de langue (masque quand il n'y a qu'une langue). Les
// adresses /fr/... et /nl/... deja publiees redirigent vers leur equivalent
// anglais (voir proxy.js).
//
// POUR LES RALLUMER : remettre "fr" et "nl" dans LOCALES, et vider
// LOCALES_EN_SOMMEIL. Rien d'autre a toucher.
export const LOCALES = ["en"];
export const LOCALES_EN_SOMMEIL = ["fr", "nl"];
export const DEFAULT_LOCALE = "en";

// Choix explicite du visiteur via le sélecteur de langue. Sans ce cookie, un
// visiteur néerlandophone qui bascule en anglais serait renvoyé en néerlandais
// au prochain passage par la racine — son clic serait sans effet.
export const LOCALE_COOKIE = "onbord_site_locale";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // un an

// Étiquette BCP-47 pour <html lang> et les balises hreflang.
export const LOCALE_TAGS = {
  en: "en-GB", // clientèle belge : orthographe et dates britanniques, pas US
  fr: "fr-BE",
  nl: "nl-BE",
};

// Nom affiché dans le sélecteur : toujours dans SA PROPRE langue (un
// néerlandophone cherche « Nederlands », pas « Néerlandais »).
export const LOCALE_LABELS = {
  en: "English",
  fr: "Français",
  nl: "Nederlands",
};

export const LOCALE_SHORT = { en: "EN", fr: "FR", nl: "NL" };

export function isLocale(value) {
  return LOCALES.includes(value);
}

/** Ramène n'importe quelle entrée (cookie trafiqué, segment d'URL inventé,
 *  en-tête Accept-Language) sur une locale valide. */
export function coerceLocale(value) {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const base = value.toLowerCase().split("-")[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

// L'URL publique du site, pour les métadonnées, le sitemap et les hreflang.
// Surchargeable par variable d'environnement : sans quoi une préproduction
// annoncerait aux moteurs de recherche les URL de la production.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://onbord.be"
).replace(/\/$/, "");

// L'application vit sur un AUTRE domaine. Toute la raison d'être de cette
// constante : les liens « Log in » du site ne sont pas des liens internes, et
// un chemin relatif enverrait le visiteur sur onbord.be/login, qui n'existe pas.
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://app.onbord.be"
).replace(/\/$/, "");

// Adresse de contact commercial. Toutes les demandes de démo y aboutissent :
// l'inscription publique est FERMÉE côté application (les comptes sont créés à
// la main depuis /admin), donc aucun bouton du site ne doit mener à un
// formulaire d'inscription — il ne marcherait pas.
export const CONTACT_EMAIL = "hello@onbord.be";
