// Formatage sensible à la locale. Remplace les ~14 appels
// toLocaleDateString("fr-FR") qui étaient codés en dur dans les pages.
//
// Utilisable côté client (via useI18n().localeTag) comme côté serveur (en
// passant la locale explicitement) — aucune dépendance React ici.

import { LOCALE_TAGS, DEFAULT_UI_LOCALE } from "./config";

function tag(locale) {
  return LOCALE_TAGS[locale] || LOCALE_TAGS[DEFAULT_UI_LOCALE];
}

/** Date courte : « 14 août » / « 14 Aug » / « 14 aug ». */
export function formatDateShort(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(tag(locale), { day: "numeric", month: "short" });
}

/** Date longue : « 14 août 2026 ». */
export function formatDateLong(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(tag(locale), { day: "numeric", month: "long", year: "numeric" });
}

/** Date numérique compacte : « 14/08/2026 ». */
export function formatDateNumeric(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(tag(locale));
}

/** Date + heure, pour les journaux et les emails internes. */
export function formatDateTime(value, locale) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(tag(locale), {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Montant en euros. La clientèle est belge : euro dans les trois locales. */
export function formatCurrency(amount, locale, currency = "EUR") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(tag(locale), { style: "currency", currency }).format(n);
}

export function formatNumber(value, locale, options) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(tag(locale), options).format(n);
}

/** Tri alphabétique correct par langue (accents, digrammes). Remplace les
 *  localeCompare() sans argument, dont le résultat dépendait de la machine. */
export function compareStrings(a, b, locale) {
  return String(a || "").localeCompare(String(b || ""), tag(locale), { sensitivity: "base" });
}
