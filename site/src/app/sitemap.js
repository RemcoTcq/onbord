import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL } from "@/lib/i18n/config";
import { CHEMINS, localiserChemin } from "@/lib/i18n/routes";
import { ARTICLES, cheminArticle } from "@/content/resources";

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

  // Les articles des ressources : en anglais seulement, donc une seule URL
  // chacun, sans alternatives de langue. Leur date est celle de l'article.
  const articles = ARTICLES.map((a) => ({
    url: `${SITE_URL}/en${cheminArticle(a)}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...articles, ...LOCALES.flatMap((locale) =>
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
  )];
}
