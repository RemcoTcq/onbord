import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { TitleH1, Eyebrow, Cta } from "@/components/Bits";
import Copilot from "@/components/Copilot";
import { Cast, Feed } from "@/components/RolesVisuals";

// « Métiers business » : ce qu'Onbord fait passer AUJOURD'HUI.
// Refaite le 14/10/2026, sur demande directe, en trois blocs :
//
//   1. les FAMILLES de rôles, et sous chacune les seuls INTITULÉS des postes.
//      Pas d'onglets, pas de description : une première version cachait les
//      rôles derrière des onglets avec une ligne par poste, et c'était trop
//      à lire (« le temps qu'ils cliquent, ils lisent tout »). Et JAMAIS
//      l'exercice : la façon dont on met un commercial à l'épreuve se montre
//      en démo, pas à un concurrent qui lit la vitrine ;
//   2. les quatre FAÇONS DE TRAVAILLER (appel, chat et e-mail, documents,
//      boîte de réception et priorités), SANS icônes, et l'IA là où elle a sa
//      place. Pas « dans toutes » : elle n'est pas dans l'appel en direct ;
//   3. le FONCTIONNEMENT : des personnages qui répondent, une simulation
//      construite sur les données de l'entreprise, un copilote pour l'ajuster.
//
// Chaque format cité existe dans l'application (règle 2) : sandboxes
// `persona` (appel ou chat), `email`, `client_reply`, `document`, `sheet`,
// `inbox`, `board`, et l'assistant IA par étape. Le CRM et le code, en pause
// là-bas, n'apparaissent pas ici.

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
  const { how } = p;

  return (
    <>
      {/* Le paddingBottom de `.section`, que `.hero` réduit : l'écart entre le titre et la première
          section est celui qu'il y a ENTRE les sections. Il était de 64px
          contre ~140 ailleurs, et la page paraissait commencer serrée. */}
      <section className="section hero" style={{ paddingBottom: "clamp(72px, 10vw, 140px)" }}>
        <span className="glow glow--top" aria-hidden="true" />
        <div className="wrap center">
          {/* Pas d'intitulé au-dessus du titre (« Available today »), retiré
              sur demande directe : le menu dit déjà ce qui est disponible. */}
          <TitleH1 a={p.titleA} em={p.titleEm} b={p.titleB} size="page" />
          <p className="lede" style={{ marginTop: 24 }}>{p.lede}</p>
        </div>
      </section>

      {/* ── 1. Les familles de rôles ───────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap center">
          <Eyebrow>{p.families.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "18ch" }}>{p.families.title}</h2>
          <ul className="fam" aria-label={p.families.label}>
            {p.families.items.map((it) => (
              <li className="fam__col" key={it.id} data-reveal>
                <h3 className="fam__name">{it.name}</h3>
                <ul className="fam__roles">
                  {it.roles.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </li>
            ))}
          </ul>
          <p className="fam__note">{p.families.note}</p>
        </div>
      </section>

      {/* ── 2. Les quatre façons de travailler, et l'IA ────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap center">
          <Eyebrow>{p.ways.kicker}</Eyebrow>
          <h2 className="h2" style={{ marginTop: 16, maxWidth: "18ch" }}>{p.ways.title}</h2>
          <p className="lede" style={{ marginTop: 20 }}>{p.ways.lede}</p>
          <div className="ways">
            <div className="grid4">
              {p.ways.items.map((w) => (
                <div className="card" key={w.id} data-reveal>
                  <h3>{w.title}</h3>
                  <p>{w.body}</p>
                </div>
              ))}
            </div>
            <div className="card card--feature ways__ai" data-reveal>
              <h3>{p.ways.ai.title}</h3>
              <p>{p.ways.ai.body}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Comment ça marche ───────────────────────────────────────── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="center">
            <Eyebrow>{how.kicker}</Eyebrow>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "20ch" }}>{how.title}</h2>
            <p className="lede" style={{ marginTop: 20 }}>{how.lede}</p>
          </div>

          <div className="how">
            <div className="duo" data-reveal>
              <div>
                <h3 className="how__h">{how.cast.title}</h3>
                <p className="body how__p">{how.cast.body}</p>
              </div>
              <Cast c={how.cast} />
            </div>

            <div className="duo" data-reveal>
              <div>
                <h3 className="how__h">{how.custom.title}</h3>
                <p className="body how__p">{how.custom.body}</p>
              </div>
              <Feed c={how.custom} />
            </div>

            <div className="duo" data-reveal>
              <div>
                <h3 className="how__h">{how.copilot.title}</h3>
                <p className="body how__p">{how.copilot.body}</p>
              </div>
              <Copilot c={how.copilot} />
            </div>
          </div>
        </div>
      </section>

      <Cta
        title={p.closing.title}
        body={p.closing.body}
        locale={locale}
      />
    </>
  );
}
