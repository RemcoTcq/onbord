// La langue de l'ÉCRAN du manager — module SERVEUR, sans "use server".
//
// Ce que l'IA écrit pour le manager (fiche d'un personnage, grille de notation,
// brouillons des connaissances, suggestions) suit la langue de la plateforme
// qu'il a sous les yeux. Le navigateur la donne (le préfixe /fr ou /en de la
// page) ; à défaut, celle de la requête, puis celle du compte. users.ui_locale
// seule ne suffit pas : elle peut dater d'avant un changement de langue fait
// sur un autre appareil, et l'IA écrivait alors en anglais sous un écran en
// français (constaté le 16/11/2026).
//
// Ce que lit le TALENT (candidat ou personne qui s'entraîne) ne suit jamais
// cette langue : il suit celle de la simulation.

import { coerceUiLocale, UI_LOCALES } from "@/lib/i18n/config";
import { resolveUiLocale } from "@/lib/i18n/server";

/**
 * @param {object} admin client service_role
 * @param {string} userId
 * @param {string|null} locale la langue passée par le navigateur
 * @returns {Promise<string>} fr | en
 */
export async function langueEcran(admin, userId, locale) {
  if (UI_LOCALES.includes(locale)) return locale;
  try {
    const requete = await resolveUiLocale();
    if (UI_LOCALES.includes(requete)) return requete;
  } catch {
    // Hors requête HTTP : on retombe sur le compte.
  }
  const { data } = await admin.from("users").select("ui_locale").eq("id", userId).maybeSingle();
  return coerceUiLocale(data?.ui_locale);
}
