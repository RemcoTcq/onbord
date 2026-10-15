import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { articles, CATEGORIES } from "@/content/resources";
import { Index } from "@/components/Resources";

// Une catégorie des ressources : /resources/blog, /resources/comparisons.
// Même rendu que l'index (`Index`), filtré, avec le titre de la catégorie.
// La documentation n'a pas encore de page : elle n'est pas dans les
// catégories servies, et son adresse répond 404.

const SERVIES = CATEGORIES.filter((c) => !c.soon).map((c) => c.id);

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => SERVIES.map((category) => ({ lang, category })));
}

export async function generateMetadata({ params }) {
  const { lang, category } = await params;
  if (!SERVIES.includes(category)) return {};
  const locale = coerceLocale(lang);
  const { resources: p } = await getDictionary(locale, "pages");
  const chemin = `/resources/${category}`;
  return {
    title: { absolute: `${p.cats[category].title} | Onbord` },
    description: p.cats[category].lede,
    alternates: {
      canonical: `/${locale}${chemin}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${chemin}`])),
        "x-default": `/${DEFAULT_LOCALE}${chemin}`,
      },
    },
  };
}

export default async function Categorie({ params }) {
  const { lang, category } = await params;
  if (!SERVIES.includes(category)) notFound();
  const locale = coerceLocale(lang);
  const { resources: p } = await getDictionary(locale, "pages");
  return (
    <Index
      locale={locale}
      p={p}
      titre={p.cats[category].title}
      lede={p.cats[category].lede}
      liste={articles(category)}
      actif={category}
    />
  );
}
