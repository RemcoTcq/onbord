// Chargement des dictionnaires, par (locale, espace de noms).
//
// Le découpage en espaces de noms n'est pas de la coquetterie : sans lui, un
// visiteur qui ouvre la page d'accueil télécharge aussi le texte des quatre
// pages intérieures et des trois pages légales, soit plusieurs fois le poids de
// ce qu'il lit. L'accueil est la vitrine — il doit arriver vite.
//
//   common  navigation, pied de page, et le contenu des maquettes. Partout.
//   home    la page d'accueil.
//   pages   les quatre pages intérieures (comment ça marche, simulations,
//           notation, tarifs). Groupées : elles se lisent à la suite et
//           partagent leur vocabulaire.
//   legal   les trois pages légales.
//
// Module SERVEUR uniquement. Ne l'importez pas depuis un composant client : les
// trois langues partiraient dans le bundle du navigateur.

import { coerceLocale, DEFAULT_LOCALE } from "../config";

const LOADERS = {
  en: {
    common: () => import("./en/common"),
    home: () => import("./en/home"),
    pages: () => import("./en/pages"),
    legal: () => import("./en/legal"),
  },
  fr: {
    common: () => import("./fr/common"),
    home: () => import("./fr/home"),
    pages: () => import("./fr/pages"),
    legal: () => import("./fr/legal"),
  },
  nl: {
    common: () => import("./nl/common"),
    home: () => import("./nl/home"),
    pages: () => import("./nl/pages"),
    legal: () => import("./nl/legal"),
  },
};

/**
 * Renvoie le dictionnaire d'un espace de noms pour une locale.
 * Une locale inconnue retombe sur l'anglais — la langue de référence — plutôt
 * que de renvoyer `undefined` : mieux vaut une page en anglais qu'une page
 * blanche.
 */
export async function getDictionary(locale, namespace = "home") {
  const loc = LOADERS[locale] ? locale : coerceLocale(locale);
  const loader = LOADERS[loc]?.[namespace] || LOADERS[DEFAULT_LOCALE][namespace];
  const mod = await loader();
  return mod.default;
}
