import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { demoHref } from "@/lib/contact";
import { TitleH1, Eyebrow, Cta } from "@/components/Bits";

// « Métiers business » (12/10/2026) : ce qu'Onbord fait passer AUJOURD'HUI.
//
// Deux blocs, et pas plus (règle 0 bis) : les familles de métiers, chacune en
// une phrase qui dit ce que le candidat y fait ; puis les outils dans lesquels
// il travaille. Chaque outil cité existe dans l'application (règle 2) : le CRM
// et le code, en pause là-bas, n'apparaissent pas ici.

const CHEMIN = "/business-roles";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { business } = await getDictionary(locale, "pages");
  return {
    title: { absolute: business.meta.title },
    description: business.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin(CHEMIN, locale)}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin(CHEMIN, l)}`])),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin(CHEMIN, DEFAULT_LOCALE)}`,
      },
    },
  };
}

export default async function BusinessRoles({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { business: p } = await getDictionary(locale, "pages");

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

      {/* ── Les métiers ────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <Eyebrow>{p.roles.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "20ch" }}>{p.roles.title}</h2>
          <div className="grid3" style={{ marginTop: 36 }}>
            {p.roles.cards.map((c) => (
              <div className="card" key={c.title} data-reveal>
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Les outils ─────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Eyebrow>{p.tools.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "18ch" }}>{p.tools.title}</h2>
          <div className="faq" style={{ marginTop: 24 }}>
            {p.tools.items.map((it) => (
              <div className="faq__item" key={it.q} data-reveal>
                <p className="faq__q">{it.q}</p>
                <p className="faq__a">{it.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Cta
        title={p.closing.title}
        body={p.closing.body}
        primary={p.closing.cta}
        primaryHref={demoHref(locale)}
      />
    </>
  );
}
