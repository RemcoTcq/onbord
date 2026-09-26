import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { demoHref, talkHref } from "@/lib/contact";
import { CREDIT_COSTS, COST_PER_CANDIDATE, PLANS, candidatesFor } from "@/lib/pricing";
import { TitleH1, Eyebrow, Cta } from "@/components/Bits";
import PlanTable from "@/components/PlanTable";

// « Tarifs ».
//
// Le parti pris de la page : montrer l'ARITHMÉTIQUE. Les concurrents écrivent
// « jusqu'à 75 candidats » sans dire d'où sort le chiffre ; ici, le barème est
// donné, et le tableau d'exemples se refait de tête. C'est cohérent avec ce que
// vend le produit — une note qu'on peut remonter jusqu'à sa source.
//
// Le tableau d'exemples est calculé à la construction à partir du même barème
// que celui affiché juste au-dessus : impossible qu'ils se contredisent.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { pricing } = await getDictionary(locale, "pages");

  return {
    title: { absolute: pricing.meta.title },
    description: pricing.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin("/pricing", locale)}`,
      languages: {
        ...Object.fromEntries(
          LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin("/pricing", l)}`])
        ),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin("/pricing", DEFAULT_LOCALE)}`,
      },
    },
  };
}

export default async function Pricing({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const { pricing: p } = await getDictionary(locale, "pages");

  // Les lignes du tableau d'exemples, calculées ici plutôt qu'écrites à la
  // main : un barème qui change ne doit pas laisser derrière lui un tableau
  // faux que personne ne pense à corriger.
  const exemples = PLANS.filter((pl) => pl.credits).flatMap((pl) =>
    [1, 3, 5].map((simulations) => ({
      plan: p.plans[pl.id].name,
      credits: pl.credits,
      simulations,
      candidates: candidatesFor(pl.credits, simulations),
    }))
  );

  return (
    <>
      <section className="section hero" style={{ paddingBottom: 24 }}>
        <span className="glow glow--top" aria-hidden="true" />
        {/* Centre, comme les en-tetes de section de l'accueil : titre,
            intitule et chapeau ensemble. Un titre centre au-dessus d'un
            chapeau ferre a gauche se lirait comme une erreur de mise en page. */}
        <div className="wrap center">
          <p className="eyebrow">{p.eyebrow}</p>
          <div style={{ marginTop: 22 }}>
            <TitleH1 a={p.titleA} em={p.titleEm} b={p.titleB} size="page" />
          </div>
          <p className="lede" style={{ marginTop: 24 }}>{p.lede}</p>
        </div>
      </section>

      {/* La grille des plans est un composant client : elle porte la bascule
          annuel / mensuel, et c'est la seule interaction de la page. */}
      <section className="section" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <PlanTable dict={p} locale={locale} demoHref={demoHref(locale)} talkHref={talkHref(locale)} />
        </div>
      </section>

      {/* ── Le barème ──────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Eyebrow>{p.credits.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "16ch" }}>{p.credits.title}</h2>
          <p className="lede" style={{ marginTop: 16 }}>{p.credits.lede}</p>

          <table className="tbl" style={{ marginTop: 36 }}>
            <tbody>
              {p.credits.rows.map((r, i) => (
                <tr key={r.what} data-reveal>
                  <td>{r.what}</td>
                  <td className="cost">
                    {[CREDIT_COSTS.job, CREDIT_COSTS.stepRegeneration, CREDIT_COSTS.candidateStart, CREDIT_COSTS.candidateScoring][i]}
                  </td>
                  <td>
                    {r.when}
                    <p>{r.detail}</p>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{p.credits.totalLabel}</td>
                <td className="cost">{COST_PER_CANDIDATE}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── L'arithmétique ─────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Eyebrow>{p.maths.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "18ch" }}>{p.maths.title}</h2>
          <p className="body" style={{ marginTop: 16 }}>{p.maths.lede}</p>

          <div style={{ overflowX: "auto", marginTop: 30 }}>
            <table className="maths">
              <thead>
                <tr>
                  <th>{p.plans.core.name} / {p.plans.pro.name}</th>
                  <th>{p.creditsPerMonth}</th>
                  <th>{p.maths.jobsLabel}</th>
                  <th>{p.maths.resultLabel}</th>
                </tr>
              </thead>
              <tbody>
                {exemples.map((e) => (
                  <tr key={`${e.plan}-${e.simulations}`}>
                    <td>{e.plan}</td>
                    <td>{e.credits}</td>
                    <td>{e.simulations}</td>
                    <td className="res">{e.candidates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* L'hypothese du tableau, dite tout de suite sous lui : chaque
              candidat invite est compte comme allant jusqu'au bout (3
              credits). Un abandon n'en coute qu'1, donc le tableau est un
              PLANCHER. Sans cette ligne, on pouvait le lire comme une promesse
              au plus juste, ou pire comme un plafond. */}
          <p className="small" style={{ marginTop: 16 }}>{p.maths.assumption}</p>
          <p className="small" style={{ marginTop: 8 }}>{p.maths.note}</p>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Eyebrow>{p.faq.kicker}</Eyebrow>
          <div className="faq" style={{ marginTop: 24 }}>
            {p.faq.items.map((it) => (
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
