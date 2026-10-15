import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, SITE_URL } from "@/lib/i18n/config";
import { demoHref } from "@/lib/contact";
import { Cta } from "@/components/Bits";
import { Couverture, Carte, Corps, Auteur, Faq, Retour, dateCourte } from "@/components/Resources";
import { IMAGE_PARTAGE } from "@/lib/seo";
import { ARTICLES, AUTHOR, article, cheminArticle } from "@/content/resources";

// ─────────────────────────────────────────────────────────────────────────────
// Un article des ressources : blog ou comparaison (15/10/2026).
//
// Le plan des comparaisons est celui de spott.io : catégorie et date, le
// titre et « In-depth review », la date de dernière revue, la couverture aux
// deux logos, la réponse courte, le tableau « At a glance », les sections
// fermées chacune par « Bottom line », puis la signature, la FAQ, les
// articles liés et l'appel final. Un article de blog suit le même plan, sans
// ce qui n'a de sens que pour une comparaison.
//
// La colonne de lecture est ÉTROITE (68ch) : un texte long sur 1000px de
// large ne se lit pas. La couverture et le tableau, eux, débordent un peu
// plus large que le texte.
//
// Les articles sont en anglais seulement : pas d'alternatives de langue.
// ─────────────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => ARTICLES.map((a) => ({ lang, category: a.category, slug: a.slug })));
}

export async function generateMetadata({ params }) {
  const { lang, category, slug } = await params;
  const a = article(category, slug);
  if (!a) return {};
  const locale = coerceLocale(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { absolute: a.seoTitle },
    description: a.description,
    alternates: { canonical: `/${locale}${cheminArticle(a)}` },
    openGraph: { type: "article", title: a.seoTitle, description: a.description, publishedTime: a.date, images: [IMAGE_PARTAGE] },
  };
}

export default async function Article({ params }) {
  const { lang, category, slug } = await params;
  const a = article(category, slug);
  if (!a) notFound();
  const locale = coerceLocale(lang);
  const { resources: p } = await getDictionary(locale, "pages");
  const lies = (a.related || []).map((s) => ARTICLES.find((x) => x.slug === s)).filter(Boolean);

  // Les données structurées (15/10/2026) : l'article lui-même, et le fil
  // d'Ariane Resources > catégorie > article, que Google affiche à la place
  // de l'URL dans ses résultats.
  const url = `${SITE_URL}/${locale}${cheminArticle(a)}`;
  const donnees = [
    {
      "@context": "https://schema.org",
      "@type": a.category === "blog" ? "BlogPosting" : "Article",
      headline: a.seoTitle,
      description: a.description,
      image: `${SITE_URL}${IMAGE_PARTAGE.url}`,
      datePublished: a.date,
      dateModified: a.date,
      author: { "@type": "Person", name: AUTHOR.name, jobTitle: AUTHOR.role },
      publisher: { "@type": "Organization", name: "Onbord", logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-onbord.svg` } },
      mainEntityOfPage: url,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: p.title, item: `${SITE_URL}/${locale}/resources` },
        { "@type": "ListItem", position: 2, name: p.cats[a.category].title, item: `${SITE_URL}/${locale}/resources/${a.category}` },
        { "@type": "ListItem", position: 3, name: a.title, item: url },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }}
      />
      <article className="art">
        <header className="section hero art__head">
          <span className="glow glow--top" aria-hidden="true" />
          <div className="wrap art__col">
            <Retour locale={locale} p={p} />
            <p className="art__meta">
              <span className="rcard__cat">{p.cats[a.category].name}</span>
              <time dateTime={a.date}>{dateCourte(a.date, locale)}</time>
            </p>
            <h1 className="art__title">{a.title}</h1>
            {a.subtitle && <p className="art__sub">{a.subtitle}</p>}
            {a.lede && <p className="art__lede">{a.lede}</p>}
            {a.reviewed && <p className="art__reviewed">{p.article.reviewed} {a.reviewed}</p>}
          </div>
          <div className="wrap art__wide">
            <Couverture a={a} vs={p.article.vs} grande />
          </div>
        </header>

        <div className="wrap art__col art__body">
          <Corps blocs={a.body} locale={locale} p={p} />
          <Auteur auteur={AUTHOR} p={p} />
          {a.faq?.length ? <Faq faq={a.faq} p={p} /> : null}
          {a.legal && <p className="art__legal">{a.legal}</p>}
        </div>
      </article>

      {lies.length ? (
        <section className="section rrelated">
          <div className="wrap">
            <h2 className="h3">{p.article.related}</h2>
            <div className="rgrid">
              {lies.map((x) => <Carte key={x.slug} a={x} locale={locale} p={p} />)}
            </div>
          </div>
        </section>
      ) : null}

      <Cta title={p.closing.title} body={p.closing.body} primary={p.closing.cta} primaryHref={demoHref(locale)} />
    </>
  );
}
