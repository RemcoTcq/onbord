// Le titre d'onglet d'une page (20/11/2026) — module SERVEUR.
//
// Les pages de l'app sont des composants clients : elles ne peuvent pas
// exporter de métadonnées. Chaque route a donc un petit layout serveur qui
// ne fait que ça :
//
//   export const generateMetadata = titrePage("login");
//
// Le texte vient de common.pageTitles, dans la langue de l'URL (/fr, /en) ou,
// hors des routes préfixées (parcours candidat), dans la langue d'interface.
// Le gabarit de app/layout.js ajoute « · Onbord ».
import { buildDictionary } from "./dictionaries";
import { resolveUiLocale } from "./server";
import { UI_LOCALES } from "./config";

export function titrePage(cle) {
  return async function generateMetadata({ params }) {
    const p = (await params) || {};
    const langue = UI_LOCALES.includes(p.lang) ? p.lang : await resolveUiLocale();
    const dictionnaire = await buildDictionary(langue, ["common"]);
    const titre = dictionnaire.common?.pageTitles?.[cle];
    // Le gabarit est reposé à chaque niveau : un titre en simple chaîne
    // l'effacerait pour les routes enfants (Simulations → Créer une simulation
    // s'affichait sans « · Onbord »).
    return titre ? { title: { default: titre, template: "%s · Onbord" } } : {};
  };
}
