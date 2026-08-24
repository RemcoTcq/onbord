"use client";

// Provider d'interface. Le dictionnaire n'est PAS importé ici : il arrive en
// prop, résolu côté serveur dans app/layout.js. Conséquences voulues :
//   • aucun flash de clés brutes au premier rendu ;
//   • une seule langue dans le bundle client, pas les trois.
//
// Le parcours candidat, lui, ne connaît sa langue qu'après avoir chargé l'offre
// (jobs.experience_locale). Il appelle donc setLocale(), qui va rechercher le
// dictionnaire par server action. C'est le seul cas où la locale change en
// cours de vie de la page.

import { createContext, Fragment, useCallback, useContext, useMemo, useState } from "react";
import { DEFAULT_UI_LOCALE, LOCALE_TAGS } from "./config";
import { loadDictionary } from "./actions";

const I18nContext = createContext(null);

/** Résout "jobs.list.empty" dans un dictionnaire imbriqué. */
function lookup(dict, path) {
  let node = dict;
  for (const key of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[key];
  }
  return typeof node === "string" ? node : undefined;
}

/** Remplace {name} par vars.name. Une variable absente laisse le marqueur en
 *  place plutôt que d'afficher "undefined" au milieu d'une phrase. */
function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (marker, key) =>
    vars[key] === undefined || vars[key] === null ? marker : String(vars[key])
  );
}

export function I18nProvider({ locale: initialLocale, dictionary: initialDictionary, children }) {
  // Un provider imbriqué hérite du dictionnaire de son parent et lui ajoute ses
  // namespaces. C'est ce qui permet au layout racine de ne servir que "common"
  // — le layout du dashboard ajoute "dashboard", ceux du parcours candidat
  // ajoutent "candidate". Résultat : un candidat sur mobile ne télécharge pas
  // les ~1 100 chaînes de l'interface recruteur.
  const parent = useContext(I18nContext);

  const [locale, setLocaleState] = useState(initialLocale || parent?.locale || DEFAULT_UI_LOCALE);
  const [ownDictionary, setOwnDictionary] = useState(initialDictionary || {});

  // Les namespaces chargés jusqu'ici, pour qu'une bascule de langue recharge
  // exactement le même périmètre plutôt que de repartir du strict minimum.
  const namespacesLoaded = useMemo(
    () => [...new Set([...(parent?.namespaces || []), ...Object.keys(ownDictionary)])],
    [parent?.namespaces, ownDictionary]
  );

  const dictionary = useMemo(
    () => ({ ...(parent?.dictionary || {}), ...ownDictionary }),
    [parent?.dictionary, ownDictionary]
  );

  // Bascule de langue en cours de page. Utilisé par le parcours candidat une
  // fois l'offre chargée, et par le sélecteur de langue du dashboard.
  const setLocale = useCallback(async (next, namespaces) => {
    if (!next || next === locale) return;
    const dict = await loadDictionary(next, namespaces || namespacesLoaded);
    setOwnDictionary(dict);
    setLocaleState(next);
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, [locale, namespacesLoaded]);

  const t = useCallback((path, vars) => {
    // Pluriel : t("candidates.count", { count: 3 }) cherche d'abord
    // "candidates.count_other". Les trois langues visées (fr/en/nl) ont la même
    // opposition singulier/pluriel, deux formes suffisent.
    let raw;
    if (vars && typeof vars.count === "number") {
      raw = lookup(dictionary, `${path}_${vars.count === 1 ? "one" : "other"}`);
    }
    if (raw === undefined) raw = lookup(dictionary, path);

    if (raw === undefined) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[i18n] clé manquante en "${locale}" : ${path}`);
      }
      // On rend la clé plutôt qu'une chaîne vide : un trou dans l'interface se
      // repère à l'œil en recette, une chaîne vide passe inaperçue.
      return path;
    }
    return interpolate(raw, vars);
  }, [dictionary, locale]);

  const value = useMemo(
    () => ({
      t,
      locale,
      setLocale,
      localeTag: LOCALE_TAGS[locale] || LOCALE_TAGS.fr,
      // Exposés pour l'imbrication de providers, pas pour l'usage courant.
      dictionary,
      namespaces: namespacesLoaded,
    }),
    [t, locale, setLocale, dictionary, namespacesLoaded]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Interpole des ÉLÉMENTS REACT dans une chaîne traduite, là où `t()` n'insère
 * que du texte.
 *
 * Le cas qui l'impose : « J'ai lu et j'accepte les [conditions] et la
 * [politique] ». Découper la phrase en trois morceaux traduits séparément
 * (« J'ai lu et j'accepte les » / « et la ») marche en français et casse en
 * néerlandais, où l'ordre des groupes n'est pas le même. On traduit donc la
 * phrase ENTIÈRE, marqueurs compris, et le traducteur place {terms} et
 * {privacy} là où sa langue les veut.
 *
 *   const parts = tNodes(t("candidate.onboarding.consentTerms"), {
 *     terms:   <a href="/cgu">{t("candidate.onboarding.termsLink")}</a>,
 *     privacy: <a href="/privacy">{t("candidate.onboarding.privacyLink")}</a>,
 *   });
 */
export function tNodes(translated, nodes) {
  const keys = Object.keys(nodes || {});
  if (!keys.length) return [translated];

  const parts = String(translated).split(new RegExp(`\\{(${keys.join("|")})\\}`, "g"));
  // split() avec un groupe capturant alterne texte / nom de marqueur : les
  // index impairs sont les marqueurs.
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Fragment key={i}>{nodes[part]}</Fragment>
      : <Fragment key={i}>{part}</Fragment>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n() hors de <I18nProvider> — vérifier que la route est bien sous app/layout.js");
  }
  return ctx;
}

/** Raccourci pour le cas courant : `const t = useT();` */
export function useT() {
  return useI18n().t;
}
