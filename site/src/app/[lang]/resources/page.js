import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { Index } from "@/components/Resources";
import { articles } from "@/content/resources";

// « Resources » (15/10/2026), sur le modèle de spott.io/resources : un titre
// court, les catégories en onglets, puis TOUTES les ressources en une grille
// de cartes, la plus récente d'abord. Le blog et les comparaisons ont aussi
// leur page à eux (`[category]/page.js`), qui réutilise exactement ce rendu.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { resources: p } = await getDictionary(locale, "pages");
  return {
    title: { absolute: p.meta.title },
    description: p.meta.description,
    alternates: {
      canonical: `/${locale}/resources`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}/resources`])),
        "x-default": `/${DEFAULT_LOCALE}/resources`,
      },
    },
  };
}

export default async function Resources({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { resources: p } = await getDictionary(locale, "pages");
  return <Index locale={locale} p={p} titre={p.title} lede={p.lede} liste={articles()} actif={null} />;
}
