import Link from "next/link";
import { href } from "@/lib/i18n/routes";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { demoHref } from "@/lib/contact";
import { cheminArticle, CATEGORIES } from "@/content/resources";
import { Logo, ArrowLeft, Plus } from "./Icons";
import { Cta } from "./Bits";

// ─────────────────────────────────────────────────────────────────────────────
// Les briques de la partie « Resources » (15/10/2026) : la couverture, la
// carte, les onglets de catégorie et le corps d'un article. Composants
// serveur, aucun état : tout est rendu à la construction.
//
// Le modèle est spott.io/resources : une grille de cartes (couverture,
// catégorie, date, titre, résumé), des catégories en onglets, et des pages
// de comparaison qui suivent toutes le même plan.
// ─────────────────────────────────────────────────────────────────────────────

/** La date d'un article, à la façon du pays : « 15 Oct 2026 ». */
export function dateCourte(iso, locale) {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale] || "en", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${iso}T12:00:00Z`));
}

/** Le logo Onbord tel qu'il est dans la barre : le glyphe et le mot. */
function MarqueOnbord() {
  return (
    <span className="rcov__onbord">
      <Logo height={22} />
      <span>onbord</span>
    </span>
  );
}

// ── La couverture ───────────────────────────────────────────────────────────
// PAS DE PHOTO. Une comparaison montre les deux logos sur deux tuiles
// blanches, « vs » entre les deux, sur une trame légère : c'est le gabarit
// fourni par Remco. Un article de blog suit le même geste avec « + » : Onbord
// ET votre ATS, pas l'un contre l'autre.
// La trame est ici une partie de l'IMAGE (un visuel de couverture), pas le
// décor du site : la règle « pas de trame sous les visuels » vise les
// maquettes posées sur la page, pas une couverture qui se lit comme une image.
export function Couverture({ a, vs = "vs", grande = false }) {
  const c = a.cover;
  return (
    <div className={`rcov${grande ? " rcov--hero" : ""}`} role="img" aria-label={a.title}>
      {/* ⚠️ Un élément INTÉRIEUR porte la mise en page : les unités `cqw` se
          mesurent sur le conteneur le plus proche AU-DESSUS de l'élément.
          Posées sur `.rcov` lui-même, elles se mesuraient sur la fenêtre, et
          sur une carte de 320px les tuiles tombaient à quelques pixels. */}
      <span className="rcov__in">
      <span className="rcov__tile"><MarqueOnbord /></span>
      {c.kind === "vs"
        ? <span className="rcov__vs">{vs}</span>
        : <span className="rcov__vs rcov__vs--plus" aria-hidden="true"><Plus size={grande ? 20 : 16} /></span>}
      <span className="rcov__tile">
        {c.kind === "vs" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="rcov__logo" src={c.logo.src} alt="" width={c.logo.width} height={c.logo.height} />
        ) : (
          <span className="rcov__ats">
            {/* Un pipeline en trois colonnes : ce qu'un ATS évoque d'un coup
                d'œil, sans le logo d'aucun éditeur. */}
            <span className="rcov__cols" aria-hidden="true"><i /><i /><i /></span>
            {c.label}
          </span>
        )}
      </span>
      </span>
    </div>
  );
}

// ── La carte ────────────────────────────────────────────────────────────────
export function Carte({ a, locale, p }) {
  return (
    <Link className="rcard" href={href(cheminArticle(a), locale)}>
      <Couverture a={a} vs={p.article.vs} />
      <span className="rcard__meta">
        <span className="rcard__cat">{p.cats[a.category].name}</span>
        <time dateTime={a.date}>{dateCourte(a.date, locale)}</time>
      </span>
      <span className="rcard__title">{a.title}</span>
      <span className="rcard__excerpt">{a.excerpt}</span>
    </Link>
  );
}

// ── Les onglets de catégorie ────────────────────────────────────────────────
// Des LIENS, pas des boutons qui filtrent : chaque catégorie a sa page, donc
// son adresse et son référencement. « Documentation » n'a pas encore de page :
// l'onglet est inerte et porte « Soon ».
export function Onglets({ actif, locale, p }) {
  const tous = [{ id: null }, ...CATEGORIES];
  return (
    <nav className="rtabs" aria-label={p.tabsLabel}>
      {tous.map((c) => {
        const nom = c.id ? p.cats[c.id].name : p.all;
        if (c.soon) {
          return (
            <span key={c.id} className="rtab rtab--off" aria-disabled="true">
              {nom}
              <span className="soon">{p.soon}</span>
            </span>
          );
        }
        const chemin = c.id ? `/resources/${c.id}` : "/resources";
        return (
          <Link key={c.id || "all"} className="rtab" href={href(chemin, locale)} aria-current={actif === c.id ? "page" : undefined}>
            {nom}
          </Link>
        );
      })}
    </nav>
  );
}

// ── Le corps d'un article ───────────────────────────────────────────────────

/** Le texte d'un bloc : `**gras**`, `[lien](/chemin)` et `[lien](demo)`. */
function Texte({ x, locale }) {
  const morceaux = x.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return morceaux.map((m, i) => {
    const gras = m.match(/^\*\*([^*]+)\*\*$/);
    if (gras) return <strong key={i}>{gras[1]}</strong>;
    const lien = m.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lien) {
      const [, libelle, cible] = lien;
      if (cible === "demo") return <a key={i} href={demoHref(locale)}>{libelle}</a>;
      return <Link key={i} href={href(cible, locale)}>{libelle}</Link>;
    }
    return m;
  });
}

export function Corps({ blocs, locale, p }) {
  return blocs.map((b, i) => {
    switch (b.t) {
      case "h2": return <h2 key={i}>{b.x}</h2>;
      case "h3": return <h3 key={i}>{b.x}</h3>;
      case "p": return <p key={i}><Texte x={b.x} locale={locale} /></p>;
      case "callout":
        return (
          <div key={i} className="art__callout">
            <p><strong>{b.lead}</strong> <Texte x={b.x} locale={locale} /></p>
          </div>
        );
      // « Bottom line: » referme chaque section des comparaisons. Un filet à
      // gauche plutôt qu'une boîte : il y en a sept par page, sept boîtes
      // feraient un damier.
      case "bottom":
        return <p key={i} className="art__bottom"><strong>{p.article.bottomLine}</strong> <Texte x={b.x} locale={locale} /></p>;
      case "list":
        return (
          <ul key={i} className="art__list">
            {b.items.map(([lead, suite]) => <li key={lead}><strong>{lead}</strong> <Texte x={suite} locale={locale} /></li>)}
          </ul>
        );
      case "steps":
        return (
          <ol key={i} className="art__steps">
            {b.items.map(([lead, suite], j) => (
              <li key={lead}>
                <span className="art__n" aria-hidden="true">{String(j + 1).padStart(2, "0")}</span>
                <span><strong>{lead}</strong> <Texte x={suite} locale={locale} /></span>
              </li>
            ))}
          </ol>
        );
      // Le tableau défile de côté sur téléphone plutôt que de s'écraser :
      // trois colonnes de phrases ne tiennent pas dans 350px.
      case "table":
        return (
          <figure key={i} className="art__table">
            <div className="art__scroll">
              <table>
                <thead><tr>{b.head.map((h, j) => <th key={j} scope="col">{h}</th>)}</tr></thead>
                <tbody>
                  {b.rows.map((r) => (
                    <tr key={r[0]}>
                      <th scope="row">{r[0]}</th>
                      {r.slice(1).map((c, j) => <td key={j}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {b.note && <figcaption>{b.note}</figcaption>}
          </figure>
        );
      default: return null;
    }
  });
}

/** La signature, en fin d'article. */
export function Auteur({ auteur, p }) {
  const initiales = auteur.name.split(" ").map((m) => m[0]).join("");
  return (
    <div className="art__author">
      <span className="art__avatar" aria-hidden="true">{initiales}</span>
      <span>
        <span className="art__by">{p.article.by}</span>
        <b>{auteur.name}</b>
        <span className="art__role">{auteur.role}</span>
      </span>
    </div>
  );
}

/** La FAQ : des `<details>`, qui s'ouvrent sans une ligne de JavaScript. */
export function Faq({ faq, p }) {
  return (
    <section className="art__faq" aria-labelledby="faq">
      <h2 id="faq">{p.article.faq}</h2>
      {faq.map(([q, r]) => (
        <details key={q}>
          <summary>{q}<Plus size={16} /></summary>
          <p>{r}</p>
        </details>
      ))}
    </section>
  );
}

/** Le lien de retour vers l'index. */
export function Retour({ locale, p }) {
  return (
    <Link className="art__back" href={href("/resources", locale)}>
      <ArrowLeft size={14} />
      {p.article.back}
    </Link>
  );
}

/** L'index, commun à « toutes les ressources » et à chaque catégorie. */
export function Index({ locale, p, titre, lede, liste, actif }) {
  return (
    <>
      <section className="section hero rhero">
        <span className="glow glow--top" aria-hidden="true" />
        <div className="wrap center">
          <p className="eyebrow">{p.eyebrow}</p>
          <h1 className="display display--page" style={{ marginTop: 20 }}>{titre}</h1>
          <p className="lede" style={{ marginTop: 20 }}>{lede}</p>
        </div>
      </section>

      <section className="section rlist">
        <div className="wrap">
          <Onglets actif={actif} locale={locale} p={p} />
          {liste.length ? (
            <div className="rgrid">
              {liste.map((a) => <Carte key={a.slug} a={a} locale={locale} p={p} />)}
            </div>
          ) : (
            <p className="rempty">{p.empty}</p>
          )}
        </div>
      </section>

      <Cta title={p.closing.title} body={p.closing.body} primary={p.closing.cta} primaryHref={demoHref(locale)} />
    </>
  );
}
