import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL, CONTACT_EMAIL } from "@/lib/i18n/config";
import { demoHref, postingHref } from "@/lib/contact";
import { TitleH1, Cta } from "@/components/Bits";
import Vitrine from "@/components/Vitrine";
import TryModal from "@/components/TryModal";
import Encre from "@/components/Encre";
import { AppFenetre } from "@/components/AppPeek";
import Moments from "@/components/Moments";
import Etapes from "@/components/Etapes";
import Confiance from "@/components/Confiance";
import Faq from "@/components/Faq";
import { IMAGE_PARTAGE } from "@/lib/seo";
import { ChevronRight, Logo } from "@/components/Icons";
import Link from "next/link";
import { href } from "@/lib/i18n/routes";

// ─────────────────────────────────────────────────────────────────────────────
// La page d'accueil.
//
// ── Ce qu'elle fait, dans cet ordre (refonte du 05 au 09/11/2026) ───────────
//   hero     ce que c'est, et la plateforme (recrutement / onboarding)
//   phrase   une phrase seule, qui se peint au défilement
//   moments  les deux moments : recruter, puis intégrer
//   how      trois étapes en trois grands blocs (#work et #proof : étapes 2 et 3)
//   trust    la confiance, à notre façon : quatre engagements, pas de sceau
//   faq      quatre questions simples
//   cta      la démo, ou l'essai sur son propre poste
//
// ⚠️ /how-it-works, /simulations et /scoring n'existent plus : les ancres
// #how, #work et #proof servent de cibles à la navigation.
//
// Ce qui suit décrit la version d'AVANT la refonte, gardé pour l'historique.
//
// ── La règle qui a produit cette version ─────────────────────────────────────
// C'est une PAGE D'ACCUEIL, pas un mode d'emploi. La version précédente
// déroulait les huit étapes du produit, numérotées, avec une maquette chacune :
// c'était juste, complet, et c'était `/how-it-works`, où ce contenu vit
// désormais. Une page d'accueil nomme vite, montre bien, et sort vers les pages
// qui portent le détail. Chaque section ici a sa flèche.
//
// ── Le problème ne se nomme pas ──────────────────────────────────────────────
// Pas de section « Le problème », pas de cartes qui énumèrent ce qui ne va pas
// dans le recrutement. La section `truth` pose trois constats que le visiteur
// reconnaît tout seul, la maquette à côté montre autre chose, et l'écart fait
// l'argument. Nommer le problème, c'est l'expliquer ; le montrer, c'est le
// faire ressentir.
//
// ── Rappels du guide ─────────────────────────────────────────────────────────
// On dit SIMULATION, jamais « assessment ». Pas de tiret cadratin dans la copie.
// Aucun prix ni crédit ici : `next` sort vers /pricing, et c'est tout.
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const h = await getDictionary(locale, "home");

  return {
    // `absolute` : l'accueil ne veut pas du gabarit « %s | Onbord », son titre
    // porte déjà la marque.
    title: { absolute: h.meta.title },
    description: h.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [LOCALE_TAGS[l], `/${l}`])),
        "x-default": `/${DEFAULT_LOCALE}`,
      },
    },
    openGraph: { url: `${SITE_URL}/${locale}`, title: h.meta.title, description: h.meta.description, images: [IMAGE_PARTAGE] },
  };
}

// ── Le NOM DU SITE dans Google (15/10/2026) ─────────────────────────────────
// Au-dessus de chaque résultat, Google affiche un nom de site. Sans
// indication, il prenait le domaine, « onbord.be ». Ce nom ne vient PAS du
// <title> : Google le lit dans une donnée structurée `WebSite` posée sur la
// page d'accueil (son `name`). L'`Organization` donne en plus le logo et
// le site, pour la fiche de la marque.
// Google met à jour ce nom au prochain passage de son robot, pas tout de
// suite : on peut l'accélérer en demandant une réindexation de l'accueil
// dans la Search Console.
const DONNEES_STRUCTUREES = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Onbord",
    alternateName: ["onbord.be"],
    url: `${SITE_URL}/`,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Onbord",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/logo-onbord.svg`,
  },
];

export default async function Home({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const [h, c] = await Promise.all([
    getDictionary(locale, "home"),
    getDictionary(locale, "common"),
  ]);
  const m = c.mocks;

  return (
    <div className="home">
      <script
        type="application/ld+json"
        // Le remplacement de « < » empêche une balise de fermer le script
        // (recommandation de la doc Next, guide JSON-LD).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(DONNEES_STRUCTUREES).replace(/</g, "\\u003c") }}
      />
      {/* ── Hero, en blanc (05/11/2026) ────────────────────────────────── */}
      {/* Le titre, le sous-titre, les deux boutons, puis la plateforme dans
          son cadre avec le choix Recrutement / Onboarding. Le ciel, le halo
          et le titre qui passait sous la fenêtre ont été retirés (demande
          directe). Voir Vitrine.js et `.vitrine` dans globals.css. */}
      <section className="section hero hero--accueil">
        <div className="wrap hero__in">
          {/* La bulle au-dessus du titre (05/11/2026, demande directe, sur un
              modèle donné) : pour QUI est Onbord. Vrai dans l'application
              (règle 2) : elle ne couvre plus que la vente et le support /
              customer success. Elle mène à la page des métiers, d'où la
              flèche à droite. */}
          <Link className="bulle" href={href("/business-roles", locale)}>
            <span className="bulle__mark"><Logo height={16} /></span>
            <span className="bulle__text">{h.hero.badge}</span>
            <span className="bulle__go" aria-hidden="true"><ChevronRight size={14} /></span>
          </Link>
          <TitleH1 a={h.hero.titleA} em={h.hero.titleEm} b={h.hero.titleB} coupe />
          <p className="lede">{h.hero.lede}</p>

          {/* Deux boutons, DANS CET ORDRE depuis le 05/11/2026 (demande
              directe) : la démo d'abord, en bleu, comme dans la barre ; puis
              « Try it now », qui ouvre un pop-up où l'on envoie sa fiche de
              poste (TryModal.js). Avant, la simulation gratuite passait
              devant et menait à /free-simulation. */}
          <div className="hero__actions">
            <a className="btn btn--primary" href={demoHref(locale)}>{c.nav.demo}</a>
            <TryModal t={h.hero.try} locale={locale} fallbackHref={postingHref(locale)} fallbackEmail={CONTACT_EMAIL} />
          </div>
        </div>

        <div className="wrap vitrine">
          <Vitrine tabs={h.hero.tabs} a={h.hero.app} shortlist={m.shortlist} score={m.score} />
        </div>
      </section>

      {/* ── Une phrase, seule sous le hero ──────────────────────────────── */}
      <section className="section">
        <div className="wrap">
          {/* Grise, elle se peint en noir mot après mot au défilement. */}
          <Encre className="chiffres__texte" texte={h.figures.statement} />
        </div>
      </section>

      {/* ── Deux moments : le recrutement, puis l'onboarding ─────────────── */}
      {/* Titre fixe à gauche, texte et visuel qui passent de l'un à l'autre
          au défilement (Moments.js). Depuis le 10/11/2026, les deux liens
          mènent aux pages « Solutions » du recrutement et de l'onboarding.
          (Avant : « How it works » de l'accueil, et la démo.) */}
      <Moments
        title={h.moments.title}
        items={h.moments.items}
        links={[href("/hiring", locale), href("/new-hire-onboarding", locale)]}
        visuals={[
          <AppFenetre key="hiring" ecran="cands" a={h.hero.app} shortlist={m.shortlist} o={h.moments.onboardingApp} label={h.moments.items[0].alt} />,
          <AppFenetre key="onboarding" ecran="onboarding" a={h.hero.app} shortlist={m.shortlist} o={h.moments.onboardingApp} label={h.moments.items[1].alt} />,
        ]}
      />

      {/* ── Comment fonctionne Onbord, en trois cadres (09/11/2026) ───────── */}
      {/* Construire la simulation, la jouer sur les canaux de l'équipe,
          évaluer : les mêmes trois étapes pour le recrutement et
          l'onboarding, chacune dans un grand cadre avec son visuel
          (Etapes.js). Retenue le 09/11/2026 contre une section des quatre
          canaux (« Every conversation of the job, simulated »), supprimée.
          Elle porte l'`id="how"` : le pied de page (« How it works ») et le
          lien « Explore hiring » y mènent. */}
      <section className="section" id="how" aria-labelledby="flow-titre">
        <Etapes f={h.flow} />
      </section>

      {/* ── Le bas de la page refait (09/11/2026, demande directe) ──────── */}
      {/* Sous « How it works » : la confiance, la FAQ, l'appel final.
          ⚠️ Quatre sections de l'ANCIEN site vivaient ici, toutes écrites
          pour le seul recrutement : « Two ways to be wrong about someone »
          (compare), « Twenty minutes of the job » (work), « A number you can
          defend in the room » (proof) et « Everyone gets an answer »
          (answer). Retirées de la page, mais leurs composants (WorkScenes,
          ScoreCard, FeedbackTabs) et leurs textes (`home.compare`,
          `home.work`, `home.proof`, `home.answer`) restent, en sommeil.
          Les ancres #work et #proof mènent aux étapes 2 et 3 (Etapes.js). */}
      <Confiance t={h.trust} locale={locale} />
      <Faq t={h.faq} />

      {/* L'appel final : la démo, puis « Test it on your own role », comme
          dans le hero (voir Cta dans Bits.js). */}
      <Cta title={h.cta.title} body={h.cta.body} locale={locale} />
    </div>
  );
}
