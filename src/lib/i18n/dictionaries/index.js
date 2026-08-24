// Module SERVEUR uniquement : importé par app/layout.js et par la server action
// loadDictionary(). Ne jamais l'importer depuis un composant client — cela
// embarquerait les trois locales dans le bundle, ce que le découpage en
// namespaces cherche justement à éviter.
import { coerceUiLocale, DEFAULT_UI_LOCALE } from "../config";

// Chargement par (locale, namespace). Le découpage en namespaces existe pour
// une raison précise : sans lui, un candidat qui ouvre /run/[token] télécharge
// aussi les ~1 100 chaînes du dashboard recruteur, qu'il ne verra jamais.
//
//   common    → boutons, erreurs, états vides. Partagé.
//   dashboard → interface recruteur. fr/en seulement (pas de dashboard NL).
//   candidate → parcours candidat. fr/en/nl.
const LOADERS = {
  fr: {
    common:    () => import("./fr/common"),
    dashboard: () => import("./fr/dashboard"),
    candidate: () => import("./fr/candidate"),
  },
  en: {
    common:    () => import("./en/common"),
    dashboard: () => import("./en/dashboard"),
    candidate: () => import("./en/candidate"),
  },
  nl: {
    common:    () => import("./nl/common"),
    candidate: () => import("./nl/candidate"),
    // Pas de dashboard NL : l'interface recruteur est FR/EN (cf. config.js).
    // Une demande de "dashboard" en nl retombe sur le français plus bas.
  },
};

export const ALL_NAMESPACES = ["common", "dashboard", "candidate"];

/**
 * Assemble le dictionnaire d'une locale pour les namespaces demandés.
 * Un namespace absent dans la locale demandée retombe sur le français plutôt
 * que de disparaître : mieux vaut une phrase en français qu'une clé brute.
 */
export async function buildDictionary(locale, namespaces = ALL_NAMESPACES) {
  const loc = LOADERS[locale] ? locale : coerceUiLocale(locale);
  const out = {};

  for (const ns of namespaces) {
    const loader = LOADERS[loc]?.[ns] || LOADERS[DEFAULT_UI_LOCALE]?.[ns];
    if (!loader) continue;
    const mod = await loader();
    out[ns] = mod.default;
  }
  return out;
}
