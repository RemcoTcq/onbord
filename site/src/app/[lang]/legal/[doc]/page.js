import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL, coerceLocale } from "@/lib/i18n/config";
import { ArrowLeft, Alert } from "@/components/Icons";

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

// Passe à `false` quand un juriste a relu les trois textes : l'encart orange
// « document de travail » disparaît alors des trois pages, dans les trois
// langues, d'un seul endroit.
const BROUILLON = true;

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
    title: `${page.title} — Onbord`,
    description: page.intro,
    alternates: {
      canonical: `/${locale}/legal/${doc}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}/legal/${doc}`])),
        "x-default": `/${DEFAULT_LOCALE}/legal/${doc}`,
      },
    },
    // Une page de conditions n'a rien à faire dans les résultats de recherche
    // avant d'exister vraiment. À retirer en même temps que BROUILLON.
    robots: BROUILLON ? { index: false, follow: true } : undefined,
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
        <p className="legal__updated">{legal.updatedLabel} : {page.updated}</p>
        <p className="lede legal__intro">{page.intro}</p>

        {BROUILLON && (
          <p className="legal__draft">
            <Alert size={16} />
            <span>{legal.draftNotice}</span>
          </p>
        )}
      </header>

      <div className="legal__body">
        {page.sections.map((section) => (
          <section className="legal__section" key={section.h}>
            <h2>{section.h}</h2>
            {section.p.map((paragraphe, i) =>
              // Convention du dictionnaire : un paragraphe préfixé « todo: »
              // s'affiche comme un encart « à compléter » au lieu d'un texte
              // ordinaire. Voir l'en-tête de dictionaries/fr/legal.js.
              paragraphe.startsWith("todo:") ? (
                <p className="legal__todo" key={i}>
                  <b>{legal.todoLabel}</b>
                  <span>{paragraphe.slice(5)}</span>
                </p>
              ) : (
                <p key={i}>{paragraphe}</p>
              )
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
