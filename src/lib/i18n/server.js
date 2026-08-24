// Résolution de la locale d'interface côté serveur, pour app/layout.js.
//
// Ordre de priorité, du plus explicite au plus deviné :
//   1. en-tête x-onbord-locale — la locale LUE DANS L'URL par le proxy. Elle
//      prime sur tout : /en/jobs doit s'afficher en anglais même si le cookie
//      du visiteur dit « fr ». C'est ce qui rend un lien partagé fiable, et
//      c'est tout l'intérêt d'avoir un préfixe ;
//   2. cookie onbord_ui_locale — le choix du recruteur, sur les chemins sans
//      préfixe (parcours candidat, /join) ;
//   3. en-tête Accept-Language — la préférence déclarée du navigateur ;
//   4. français — le défaut historique du produit.
//
// La colonne users.ui_locale n'est PAS lue ici : le layout racine s'exécute
// aussi sur les routes publiques (parcours candidat), où il n'y a pas de
// session. C'est le sélecteur de langue qui écrit à la fois la colonne et le
// cookie, ce dernier servant de cache sans requête.

import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALE_HEADER, UI_LOCALES, DEFAULT_UI_LOCALE, coerceUiLocale } from "./config";

/** Meilleure correspondance entre Accept-Language et nos locales d'interface. */
function fromAcceptLanguage(header) {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tagPart, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tagPart.trim().toLowerCase(), q: q ? parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (UI_LOCALES.includes(base)) return base;
  }
  return null;
}

export async function resolveUiLocale() {
  const headerStore = await headers();

  const fromUrl = headerStore.get(LOCALE_HEADER);
  if (fromUrl && UI_LOCALES.includes(fromUrl)) return fromUrl;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && UI_LOCALES.includes(fromCookie)) return fromCookie;

  const negotiated = fromAcceptLanguage(headerStore.get("accept-language"));
  return negotiated ? coerceUiLocale(negotiated) : DEFAULT_UI_LOCALE;
}
