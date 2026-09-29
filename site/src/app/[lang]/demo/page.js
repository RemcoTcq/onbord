import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import DemoForm from "@/components/DemoForm";

// « Book a demo ». La page est statique ; tout ce qui bouge (le formulaire,
// l'envoi, le calendrier) vit dans DemoForm, composant client.
//
// Le fond est le ciel du hero RETOURNÉ, sans la trame : blanc en haut, bleu en
// bas. Voir .demo dans globals.css.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { demo } = await getDictionary(locale, "pages");
  return {
    title: { absolute: demo.meta.title },
    description: demo.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin("/demo", locale)}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin("/demo", l)}`])),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin("/demo", DEFAULT_LOCALE)}`,
      },
    },
  };
}

export default async function Demo({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { demo } = await getDictionary(locale, "pages");

  return (
    <section className="demo">
      <div className="wrap">
        <DemoForm t={demo} locale={locale} />
      </div>
    </section>
  );
}
