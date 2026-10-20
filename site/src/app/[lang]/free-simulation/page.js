import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, CONTACT_EMAIL } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { demoHref, postingHref } from "@/lib/contact";
import SimulationForm from "@/components/SimulationForm";

// « Get a free simulation » (20/10/2026) : l'appel principal du site. La page
// est statique ; le formulaire et son envoi vivent dans SimulationForm. Même
// fond et même gabarit que /demo (classes `.demo`), dont elle est la sœur.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { simulation } = await getDictionary(locale, "pages");
  return {
    title: { absolute: simulation.meta.title },
    description: simulation.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin("/free-simulation", locale)}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin("/free-simulation", l)}`])),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin("/free-simulation", DEFAULT_LOCALE)}`,
      },
    },
  };
}

export default async function FreeSimulation({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { simulation } = await getDictionary(locale, "pages");

  return (
    <section className="demo">
      <div className="wrap">
        <SimulationForm
          t={simulation}
          locale={locale}
          demoHref={demoHref(locale)}
          fallbackHref={postingHref(locale)}
          fallbackEmail={CONTACT_EMAIL}
        />
      </div>
    </section>
  );
}
