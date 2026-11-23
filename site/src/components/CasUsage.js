import { getDictionary } from "@/lib/i18n/dictionaries";
import { CONTACT_EMAIL, DEFAULT_LOCALE, LOCALES, LOCALE_TAGS, SITE_URL } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { demoHref, postingHref } from "@/lib/contact";
import { IMAGE_PARTAGE } from "@/lib/seo";
import { Cta, TitleH1 } from "./Bits";
import TryModal from "./TryModal";
import Faq from "./Faq";
import { AppFenetre } from "./AppPeek";
import { Rapport } from "./Etapes";
import { Conversation, Documents, Essai, Module, QuatreCanaux, Retour } from "./CasVisuels";

// ─────────────────────────────────────────────────────────────────────────────
// Le gabarit des trois pages « Solutions » (10/11/2026, demande directe) :
// /hiring et /new-hire-onboarding (les cas d'usage), /b2b-saas (le secteur).
// Textes fournis par Remco, dans `solutions.js` (une clé par page).
//
//   1. le hero, centré : le titre, l'intro, et les
//      deux boutons de l'accueil (« Book a demo », puis le pop-up) ;
//   2. quatre blocs, texte et visuel côte à côte, qui ALTERNENT de côté ;
//      le titre a la typographie de « Two moments that matter » ;
//   3. la FAQ de l'accueil (Faq.js), avec les questions de la page ;
//   4. l'appel final, au titre propre à la page (Cta, Bits.js).
//
// Les visuels se choisissent par une clé (`visual`) dans le dictionnaire. Les
// écrans de la plateforme sont la fenêtre de Moments (`AppFenetre`) ; les
// autres, des cartes dans le cadre clair des étapes (CasVisuels.js).
// ─────────────────────────────────────────────────────────────────────────────

/** Les métadonnées d'une page Solutions : titre, description, langues. */
export async function metaCas(locale, cle, chemin) {
  const s = await getDictionary(locale, "solutions");
  const p = s[cle];
  return {
    title: { absolute: p.meta.title },
    description: p.meta.description,
    alternates: {
      canonical: `/${locale}${localiserChemin(chemin, locale)}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}${localiserChemin(chemin, l)}`])),
        "x-default": `/${DEFAULT_LOCALE}${localiserChemin(chemin, DEFAULT_LOCALE)}`,
      },
    },
    openGraph: {
      url: `${SITE_URL}/${locale}${localiserChemin(chemin, locale)}`,
      title: p.meta.title,
      description: p.meta.description,
      images: [IMAGE_PARTAGE],
    },
  };
}

export default async function CasUsage({ locale, cle }) {
  const [s, h, c] = await Promise.all([
    getDictionary(locale, "solutions"),
    getDictionary(locale, "home"),
    getDictionary(locale, "common"),
  ]);
  const p = s[cle];
  const v = s.visuals;

  const fenetre = (ecran, label) => (
    <AppFenetre ecran={ecran} a={h.hero.app} shortlist={c.mocks.shortlist} o={h.moments.onboardingApp} label={label} />
  );
  const carte = (contenu, label) => (
    <div className="cas__cadre app-ui" role="img" aria-label={label}>{contenu}</div>
  );
  const VISUELS = {
    conversation: (l) => carte(<Conversation t={v.conversation} />, l),
    // La carte de score de « How it works », au nom du premier candidat du
    // classement : Lucas Martens est la recrue des pages d'onboarding.
    report: (l) => carte(<Rapport t={{ ...h.flow.report, ...v.report }} />, l),
    cands: (l) => fenetre("cands", l),
    feedback: (l) => carte(<Retour t={v.feedback} body={c.mocks.feedback.tabs[1].body} />, l),
    // L'onboarding (23/11/2026) : des copies de l'application, plus des
    // projections. La fiche d'une recrue, ses documents d'entreprise, ce
    // qu'elle voit après un essai, le tableau des personnes, un module.
    modules: (l) => fenetre("onboarding", l),
    source: (l) => carte(<Documents t={v.source} />, l),
    done: (l) => carte(<Essai t={v.done} />, l),
    ready: (l) => fenetre("people", l),
    updated: (l) => carte(<Module t={v.updated} />, l),
    channels: (l) => carte(<QuatreCanaux t={v.channels} />, l),
  };

  return (
    <div className="cas">
      <section className="section hero cas__hero">
        <div className="wrap hero__in">
          <TitleH1 a={p.title} size="page" />
          <p className="lede">{p.lede}</p>
          <div className="hero__actions">
            <a className="btn btn--primary" href={demoHref(locale)}>{c.nav.demo}</a>
            <TryModal t={h.hero.try} locale={locale} fallbackHref={postingHref(locale)} fallbackEmail={CONTACT_EMAIL} />
          </div>
        </div>
      </section>

      {p.blocks.map((b, i) => (
        <section className={`section cas__bloc${i % 2 ? " cas__bloc--inverse" : ""}`} key={b.key} aria-labelledby={`cas-${b.key}`}>
          <div className="wrap cas__grid">
            <div className="cas__texte">
              <h2 className="h2" id={`cas-${b.key}`}>{b.title}</h2>
              <p className="lede">{b.body}</p>
            </div>
            <div className="cas__visuel">{VISUELS[b.visual](b.alt)}</div>
          </div>
        </section>
      ))}

      <Faq t={{ title: s.faqTitle, items: p.faq }} />
      <Cta title={p.cta} locale={locale} />
    </div>
  );
}
