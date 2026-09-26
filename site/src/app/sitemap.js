import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL } from "@/lib/i18n/config";
import { CHEMINS, localiserChemin } from "@/lib/i18n/routes";

// Sitemap XML, servi sur /sitemap.xml.
//
// Les trois langues d'une même page sont déclarées comme ALTERNATIVES les unes
// des autres (`alternates.languages`), pas comme trois pages distinctes. Sans
// ça, un moteur de recherche voit trois adresses au contenu équivalent, en
// choisit une et ignore les deux autres — exactement ce qu'on cherche à éviter
// en traduisant le site.
//
// Les URL sont TRADUITES (/fr/comment-ca-marche, pas /fr/how-it-works) : c'est
// l'adresse réellement servie, et c'est elle qui doit être indexée.
//
// Les pages légales n'y figurent pas tant qu'elles sont à l'état de brouillon :
// voir BROUILLON dans [lang]/legal/[doc]/page.js, qui pose aussi `noindex`.

export default function sitemap() {
  const maj = new Date();

  return LOCALES.flatMap((locale) =>
    CHEMINS.map((chemin) => {
      const url = (l) =>
        chemin === "/" ? `${SITE_URL}/${l}` : `${SITE_URL}/${l}${localiserChemin(chemin, l)}`;

      return {
        url: url(locale),
        lastModified: maj,
        changeFrequency: "monthly",
        priority: chemin === "/" ? (locale === DEFAULT_LOCALE ? 1 : 0.9) : 0.7,
        alternates: {
          languages: {
            ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], url(l)])),
            "x-default": url(DEFAULT_LOCALE),
          },
        },
      };
    })
  );
}
