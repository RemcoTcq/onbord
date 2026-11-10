// Traduction CÔTÉ SERVEUR — pour ce qui part sans passer par un composant :
// les e-mails de l'application (invitations, assignments, validations).
//
// Même dictionnaires, même règles que `t()` du provider (I18nProvider.js) :
// pluriel par `_one` / `_other` quand `count` est fourni, `{var}` interpolées,
// clé brute rendue si elle manque (un trou se voit en recette). La langue est
// celle du DESTINATAIRE (son `ui_locale`, ou celle choisie à l'invitation),
// pas celle de la requête.

import { buildDictionary } from "./dictionaries";
import { coerceUiLocale } from "./config";

function lookup(dict, path) {
  return path.split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), dict);
}

function interpolate(raw, vars) {
  if (typeof raw !== "string" || !vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}

/** Un `t(path, vars)` pour la locale d'interface donnée (fr | en). */
export async function traducteurServeur(locale, namespaces = ["common", "dashboard"]) {
  const loc = coerceUiLocale(locale);
  const dict = await buildDictionary(loc, namespaces);
  return (path, vars) => {
    let raw;
    if (vars && typeof vars.count === "number") {
      raw = lookup(dict, `${path}_${vars.count === 1 ? "one" : "other"}`);
    }
    if (raw === undefined) raw = lookup(dict, path);
    if (raw === undefined) return path;
    return interpolate(raw, vars);
  };
}
