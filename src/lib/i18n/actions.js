"use server";

import { buildDictionary, ALL_NAMESPACES } from "./dictionaries";
import { EXPERIENCE_LOCALES, DEFAULT_UI_LOCALE } from "./config";

/**
 * Récupère un dictionnaire depuis le client, pour les bascules de langue qui
 * ne peuvent pas être résolues au rendu serveur du layout :
 *   • le parcours candidat, dont la langue vient de l'offre chargée ;
 *   • le sélecteur de langue du dashboard.
 *
 * On valide la locale ici même : cette action est exposée publiquement, elle
 * ne doit pas servir à sonder le système de fichiers via un import dynamique.
 */
export async function loadDictionary(locale, namespaces = ALL_NAMESPACES) {
  const safeLocale = EXPERIENCE_LOCALES.includes(locale) ? locale : DEFAULT_UI_LOCALE;
  const safeNamespaces = Array.isArray(namespaces)
    ? namespaces.filter((ns) => ALL_NAMESPACES.includes(ns))
    : ALL_NAMESPACES;

  return buildDictionary(safeLocale, safeNamespaces.length ? safeNamespaces : ALL_NAMESPACES);
}
