import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL, coerceLocale } from "@/lib/i18n/config";
import { ArrowLeft } from "@/components/Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Les trois pages légales, servies par une seule route.
//
// ⚠️ Les slugs ci-dessous sont un CONTRAT avec l'application. Elle ouvre
// https://onbord.be/legal/terms, /legal/privacy et /legal/ai-transparency en dur
// depuis l'écran de consentement du candidat (src/lib/constants/legal.js, à la
// racine du dépôt), et ces liens sont déjà partis par e-mail. Les renommer ou
// les traduire (« /fr/legal/conditions ») casse le consentement en production,
// au moment précis où on demande au candidat d'accepter ce qu'il ne pourrait
// plus lire.
//
// Le proxy se charge du préfixe de langue : /legal/terms redirige vers
// /fr/legal/terms (ou /nl, /en) selon le visiteur.
// ─────────────────────────────────────────────────────────────────────────────

const DOCS = {
  terms: "terms",
  privacy: "privacy",
  "ai-transparency": "ai",
};

// Les textes definitifs ont ete fournis en septembre 2026 : plus de bandeau
// « document de travail », et les pages sont indexables. Le mecanisme de
// brouillon (encart orange, paragraphes « todo: ») a ete retire avec eux.

/** Rend cliquables les adresses e-mail et les liens http d'un texte. */
function avecLiens(texte) {
  return texte.split(/(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[a-z]{2,})/gi).map((bout, i) => {
    if (/^https?:\/\//i.test(bout)) return <a key={i} href={bout}>{bout}</a>;
    if (/^[\w.+-]+@[\w-]+\.[a-z]{2,}$/i.test(bout)) return <a key={i} href={`mailto:${bout}`}>{bout}</a>;
    return bout;
  });
}

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => Object.keys(DOCS).map((doc) => ({ lang, doc })));
}

export async function generateMetadata({ params }) {
  const { lang, doc } = await params;
  const cle = DOCS[doc];
  if (!cle) return {};

  const locale = coerceLocale(lang);
  const legal = await getDictionary(locale, "legal");
  const page = legal[cle];

  return {
    metadataBase: new URL(SITE_URL),
    title: `${page.title}: Onbord`,
    description: page.description,
    alternates: {
      canonical: `/${locale}/legal/${doc}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}/legal/${doc}`])),
        "x-default": `/${DEFAULT_LOCALE}/legal/${doc}`,
      },
    },
  };
}

export default async function PageLegale({ params }) {
  const { lang, doc } = await params;
  const cle = DOCS[doc];
  if (!cle) notFound();

  const locale = coerceLocale(lang);
  const legal = await getDictionary(locale, "legal");
  const page = legal[cle];

  return (
    <article className="wrap legal">
      <Link href={`/${locale}`} className="legal__back">
        <ArrowLeft size={15} />
        {legal.backToHome}
      </Link>

      <header className="legal__head">
        <h1>{page.title}</h1>
        <p className="legal__updated">{legal.updatedLabel}: {page.updated}</p>
      </header>

      <div className="legal__body">
        {page.sections.map((section) => (
          <section className="legal__section" key={section.h}>
            <h2>{section.h}</h2>
            {/* Convention du dictionnaire : une chaine est un paragraphe, un
                TABLEAU de chaines est une liste a puces. */}
            {section.p.map((bloc, i) =>
              Array.isArray(bloc) ? (
                <ul key={i}>
                  {bloc.map((item) => <li key={item}>{avecLiens(item)}</li>)}
                </ul>
              ) : (
                <p key={i}>{avecLiens(bloc)}</p>
              )
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
