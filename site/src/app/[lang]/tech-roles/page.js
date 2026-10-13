import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localiserChemin, href } from "@/lib/i18n/routes";
import { demoHref, notifyTechHref } from "@/lib/contact";
import { TitleH1, Eyebrow, Cta, More } from "@/components/Bits";

// « Métiers tech — bientôt » (12/10/2026).
//
// Une DIRECTION, jamais une promesse (règle 4 quater) : l'exercice de code
// existe dans l'application mais y est en pause, en attendant un vrai
// environnement de développement. La page dit que c'est en préparation, renvoie
// vers ce qui marche aujourd'hui (les métiers business), et recueille les
// intéressés par un e-mail pré-rempli — le site n'a pas de base de données.

const CHEMIN = "/tech-roles";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { tech } = await getDictionary(locale, "pages");
  return {
    title: { absolute: tech.meta.title },
    description: tech.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin(CHEMIN, locale)}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin(CHEMIN, l)}`])),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin(CHEMIN, DEFAULT_LOCALE)}`,
      },
    },
  };
}

export default async function TechRoles({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { tech: p } = await getDictionary(locale, "pages");

  return (
    <>
      <section className="section hero" style={{ paddingBottom: 24 }}>
        <span className="glow glow--top" aria-hidden="true" />
        <div className="wrap center">
          <p className="eyebrow">{p.eyebrow}</p>
          <div style={{ marginTop: 22 }}>
            <TitleH1 a={p.titleA} em={p.titleEm} b={p.titleB} size="page" />
          </div>
          <p className="lede" style={{ marginTop: 24 }}>{p.lede}</p>
        </div>
      </section>

      {/* ── En attendant : ce qui marche aujourd'hui ───────────────────── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="card" data-reveal style={{ maxWidth: 720, marginInline: "auto" }}>
            <Eyebrow>{p.now.kicker}</Eyebrow>
            <h3 style={{ marginTop: 12 }}>{p.now.title}</h3>
            <p>{p.now.body}</p>
            <div style={{ marginTop: 16 }}>
              <More href={href("/business-roles", locale)}>{p.now.more}</More>
            </div>
          </div>
        </div>
      </section>

      <Cta
        title={p.closing.title}
        body={p.closing.body}
        primary={p.closing.cta}
        primaryHref={notifyTechHref(locale)}
        secondary={p.closing.secondary}
        secondaryHref={demoHref(locale)}
      />
    </>
  );
}
