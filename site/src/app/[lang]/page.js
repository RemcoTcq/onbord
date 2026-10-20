import { getDictionary } from "@/lib/i18n/dictionaries";
import { coerceLocale, LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL } from "@/lib/i18n/config";
import { demoHref, simulationHref } from "@/lib/contact";
import { Hr, Eyebrow, Title, TitleH1, Cta } from "@/components/Bits";
import AppPeek from "@/components/AppPeek";
import { ShortlistMock, ScoreCard } from "@/components/Mocks";
import Steps from "@/components/Steps";
import WorkScenes from "@/components/WorkScenes";
import FeedbackTabs from "@/components/FeedbackTabs";
import { IMAGE_PARTAGE } from "@/lib/seo";
import { ArrowRight, Check, Close } from "@/components/Icons";

// ─────────────────────────────────────────────────────────────────────────────
// La page d'accueil.
//
// ── Ce qu'elle doit faire, dans cet ordre ────────────────────────────────────
//   hero    ce que c'est, et la plateforme telle qu'elle est, en quatre écrans
//   truth   pourquoi ça vaut la peine : le problème SE COMPREND, sans être nommé
//   work    ce que c'est concrètement : trente minutes du métier
//   how     comment ça se passe pour vous, en trois gestes
//   proof   pourquoi on peut croire la note
//
// ⚠️ Ces trois sections N'ONT PLUS DE PAGE DE DÉTAIL : /how-it-works,
// /simulations et /scoring ont été retirées, leur contenu part dans le blog.
// Elles portent donc un `id` et servent de cibles à la navigation. Leurs
// liens « suite » ont été retirés faute de destination.
//   answer  ce que le candidat reçoit, même refusé
//   next    les trois pages de détail, dont les tarifs              → /pricing
//   cta     l'action : une offre à envoyer
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
      {/* ── Hero, plein écran ──────────────────────────────────────────── */}
      <section className="section hero hero--full">
        <span className="glow glow--top" aria-hidden="true" />
        {/* Les verticales de la trame, limitees a la bande entre les deux
            filets. Voir .colonnes dans globals.css. */}
        <span className="colonnes colonnes--hero" aria-hidden="true" />

        <div className="wrap hero__in">
          <TitleH1 a={h.hero.titleA} em={h.hero.titleEm} b={h.hero.titleB} coupe />
          <p className="lede">{h.hero.lede}</p>

          {/* Deux boutons (20/10/2026) : la simulation gratuite d'abord,
              l'appel principal du site, puis la démo pour qui veut parler. */}
          <div className="hero__actions">
            <a className="btn btn--primary" href={simulationHref(locale)}>
              {c.nav.simulation}
              <ArrowRight size={15} />
            </a>
            <a className="btn btn--ghost" href={demoHref(locale)}>{c.nav.demo}</a>
          </div>
        </div>

        {/* La scène : les onglets POSÉS SUR la fenêtre de la plateforme, les
            deux sur la même plaque de verre. La barre de saisie qui était
            là (le bac à sable) a été retirée le 19/10/2026, sur demande
            directe. Voir AppPeek.js et `.stage` dans globals.css. */}
        <div className="wrap stage">
          <AppPeek a={h.hero.app} shortlist={m.shortlist} score={m.score} />
        </div>
      </section>

      <Hr />

      {/* ── Le problème, énuméré ───────────────────────────────────────── */}
      {/* Deux colonnes barrées, une cochée.
          ⚠️ Il y avait AVANT cette section un bloc `truth` qui disait la même
          chose autrement : trois constats en gros, puis la maquette CvProof
          (le CV éteint contre la preuve en couleur). Deux critiques du CV à
          quarante lignes d'écart, c'était la même idée servie deux fois, et
          la seconde affaiblissait la première. Celle-ci reste parce qu'elle
          se parcourt en trois secondes. `CvProof` et le contenu `truth` du
          dictionnaire ne sont donc plus appelés nulle part : voir la règle
          4 decies avant de les supprimer ou de les replacer ailleurs. */}
      <section className="section">
        <div className="wrap center">
          <Eyebrow>{h.compare.eyebrow}</Eyebrow>
          <div style={{ marginTop: 20 }}>
            <Title a={h.compare.titleA} em={h.compare.titleEm} b={h.compare.titleB} />
          </div>
          <p className="lede" style={{ marginTop: 18 }}>{h.compare.lede}</p>

          <div className="vs" style={{ marginTop: 52 }}>
            {h.compare.cards.map((c) => (
              <article className={`vs__card${c.ok ? " vs__card--ok" : ""}`} key={c.title} data-reveal>
                <span className="vs__mark" aria-hidden="true">
                  {c.ok ? <Check size={14} /> : <Close size={14} />}
                </span>
                <h3 className="vs__title">{c.title}</h3>
                <ul className="vs__list">
                  {c.items.map((it) => (
                    <li key={it}>
                      <i aria-hidden="true" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {/* Ou Onbord se place dans le recrutement : avant l'entretien, pas a
              sa place. Sans cette ligne, la carte cochee pouvait se lire comme
              « remplacez vos entretiens ». */}
          <p className="small" style={{ marginTop: 28, textAlign: "center" }}>{h.compare.note}</p>

        </div>
      </section>

      {/* ── Ce que le candidat fait ────────────────────────────────────── */}
      {/* Trois SCÈNES, pas trois fenêtres de logiciel : un e-mail qui s'écrit,
          un appel en face à face, des tests qui passent. Chacune porte sa durée,
          et la somme retombe sur les vingt minutes annoncées.
          Maquette à GAUCHE : la section précédente avait la sienne à droite, et
          deux sections de suite du même côté donnent une page en colonne. */}
      <section className="section" id="work">
        <div className="wrap center">
          <Eyebrow>{h.work.eyebrow}</Eyebrow>
          <div style={{ marginTop: 20 }}>
            <Title a={h.work.titleA} em={h.work.titleEm} b={h.work.titleB} />
          </div>
          <p className="lede" style={{ marginTop: 18 }}>{h.work.lede}</p>

          <div className="figure" data-reveal>
            <WorkScenes m={m} s={m.scenes} />
          </div>

        </div>
      </section>

      <Hr />

      {/* ── Comment ça se passe, en trois gestes ───────────────────────── */}
      {/* Les trois gestes, puis CE QU'ON RÉCUPÈRE : la liste classée. Le site
          montrait par le menu comment la simulation se fabrique et jamais le
          résultat, alors que c'est la seule image qu'un recruteur pressé
          cherche. Le détail des huit étapes est sur /how-it-works. */}
      <section className="section" id="how">
        {/* En-tête CENTRÉ au-dessus de colonnes, comme la section « le
            problème » plus haut : c'est le motif qui revient sur tout le
            site, un titre au milieu et ce qu'il annonce en dessous. Les
            sections en `.duo` (texte à côté d'une maquette) gardent leur
            fer à gauche : ce n'est pas le même geste de lecture. */}
        <div className="wrap center">
          <Eyebrow>{h.how.eyebrow}</Eyebrow>
          <div style={{ marginTop: 20 }}>
            <Title a={h.how.titleA} em={h.how.titleEm} b={h.how.titleB} />
          </div>
          <p className="lede" style={{ marginTop: 18 }}>{h.how.lede}</p>

          {/* Les trois étapes sont CLIQUABLES, et la maquette de droite suit
              (voir Steps.js). Trois maquettes empilées auraient allongé la
              page de trois écrans pour trois idées. */}
          <div style={{ marginTop: 56 }} data-reveal>
            <Steps
              steps={h.how.steps}
              label={h.how.stepLabel}
              viz={h.how.viz}
              chat={m.chat}
            />
          </div>

          {/* Ce qu'on récupère au bout. Le titre est au même niveau que celui
              d'une étape, pas au niveau d'un titre de section : c'est le
              RÉSULTAT de la séquence au-dessus, pas un nouveau chapitre. */}
          <div style={{ marginTop: 84 }}>
            <p className="steps__title" style={{ fontSize: "1.0625rem" }}>{h.how.resultTitle}</p>
            <p className="lede" style={{ marginTop: 10, marginInline: "auto" }}>{h.how.resultBody}</p>

            <div className="figure figure--sm" data-reveal>
              <ShortlistMock m={m.shortlist} app={h.hero.app} />
            </div>

          </div>
        </div>
      </section>

      <Hr />

      {/* ── La note, et ce qui la tient ────────────────────────────────── */}
      <section className="section section--tight" id="proof">
        <div className="wrap center">
          <Eyebrow>{h.proof.eyebrow}</Eyebrow>
          <div style={{ marginTop: 20 }}>
            <Title a={h.proof.titleA} em={h.proof.titleEm} b={h.proof.titleB} />
          </div>
          <p className="lede" style={{ marginTop: 18 }}>{h.proof.lede}</p>

          <div className="figure figure--xs" data-reveal>
            <ScoreCard m={m.score} app={h.hero.app} />
          </div>

        </div>
      </section>

      {/* ── Ce que reçoit le candidat, retenu comme refusé ─────────────── */}
      {/* Deux onglets, deux e-mails. Avec un seul, celui du refus, on pouvait
          comprendre que le retour est la politesse qu'on réserve au « non ».
          Les deux disent l'inverse, et les deux citent des faits de la
          simulation : ce n'est pas une réponse, c'est un retour. */}
      {/* La SEULE section de l'accueil en deux colonnes : titre et texte à
          gauche, les deux e-mails à droite. Toutes les autres posent leur
          titre au centre et leur maquette dessous ; celle-ci casse le rythme
          juste avant l'appel final, et cette rupture est le but — une page
          qui empile huit fois la même mise en page s'éteint sur la fin. */}
      <section className="section section--tight">
        <div className="wrap">
          <div className="duo" style={{ alignItems: "center" }}>
            <div>
              <Title a={h.answer.titleA} em={h.answer.titleEm} b={h.answer.titleB} />
              <p className="lede" style={{ marginTop: 18 }}>{h.answer.body}</p>
            </div>

            <div data-reveal>
              <FeedbackTabs m={m.feedback} />
            </div>
          </div>
        </div>
      </section>

      {/* Il y avait ici une rangée de trois cartes vers /how-it-works,
          /simulations et /pricing. Elle a sauté : chaque section de la page
          sort déjà par sa flèche vers la page qui la prolonge, et une dernière
          rangée de liens juste avant l appel à l action mettait trois portes de
          sortie devant la seule qu on veut faire pousser. Les tarifs restent
          dans la navigation et le pied de page. */}

      {/* Les deux boutons de toutes les bandes finales : la simulation
          gratuite, puis la démo (voir Cta dans Bits.js). */}
      <Cta
        title={h.cta.titleA}
        em={h.cta.titleEm}
        titleB={h.cta.titleB}
        body={h.cta.body}
        locale={locale}
      />
    </div>
  );
}
