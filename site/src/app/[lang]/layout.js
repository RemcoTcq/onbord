import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { LOCALES, LOCALE_TAGS, DEFAULT_LOCALE, SITE_URL, APP_URL, coerceLocale } from "@/lib/i18n/config";
import { demoHref } from "@/lib/contact";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

// ─────────────────────────────────────────────────────────────────────────────
// Le layout RACINE du site est ici, dans app/[lang]/ — app/layout.js n'existe
// pas.
//
// Next 16 autorise un segment dynamique AU-DESSUS du layout racine : le layout
// qui porte <html> et <body> peut donc vivre sous [lang] et lire la langue
// directement. Sans ça, il faudrait la faire transiter par un en-tête posé par
// le proxy, détour qu'a dû prendre l'application (voir LOCALE_HEADER dans
// src/lib/i18n/config.js, à la racine du dépôt).
// Voir node_modules/next/dist/docs/01-app/03-api-reference/04-functions/next-root-params.md
// ─────────────────────────────────────────────────────────────────────────────

const geist = Geist({ subsets: ["latin"], display: "swap", variable: "--font-sans" });

// Le monospace porte toutes les métadonnées du site : intitulés de section,
// chiffres, noms de champs des maquettes. Il fait beaucoup pour l'allure
// « logiciel » du site.
const mono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });

// ⚠️ IL N'Y A PLUS QUE DEUX POLICES, et c'est voulu : Geist et Geist Mono.
//
// Une Instrument Serif était chargée ici pour les grands titres, sous la
// variable `--font-display`. Elle a été retirée pour deux raisons qui se
// rejoignent : la variable n'était RÉFÉRENCÉE NULLE PART dans la feuille de
// style (les titres ont toujours été rendus en Geist, la sérif partait donc
// sur le réseau à chaque visite sans rien afficher), et la demande est
// désormais explicite, « utilise la typo Geist ». Ne la remettez pas pour
// « donner du caractère » aux titres : c'est leur TAILLE et leur crénage
// serré qui le font ici.

// Les trois langues sont générées à la construction : le site est entièrement
// statique, aucune page n'a besoin du serveur pour s'afficher.
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const home = await getDictionary(locale, "home");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: home.meta.title,
      // Les pages intérieures posent leur propre titre ; ce gabarit leur évite
      // de répéter la marque à la main, et de l'oublier une fois sur quatre.
      template: "%s — Onbord",
    },
    description: home.meta.description,
    openGraph: {
      type: "website",
      siteName: "Onbord",
      locale: LOCALE_TAGS[locale],
      url: `${SITE_URL}/${locale}`,
      title: home.meta.title,
      description: home.meta.description,
    },
    twitter: { card: "summary_large_image" },
  };
}

// Le site est clair : la barre d'adresse mobile prend le blanc du hero, et le
// navigateur sait qu'il ne doit pas inverser les contrôles natifs.
export const viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default async function RootLayout({ children, params }) {
  const { lang } = await params;
  const locale = coerceLocale(lang);
  const common = await getDictionary(locale, "common");

  return (
    <html
      lang={LOCALE_TAGS[locale] || LOCALE_TAGS[DEFAULT_LOCALE]}
      className={`${geist.variable} ${mono.variable}`}
    >
      <body className={geist.className}>
        {/* Premier arrêt du clavier : il saute la navigation. */}
        <a className="skip" href="#main">{common.nav.skip}</a>

        <Header
          locale={locale}
          nav={common.nav}
          demoHref={demoHref(locale)}
          appHref={APP_URL}
        />

        <main id="main">{children}</main>

        <Footer locale={locale} common={common} />
        <Reveal />
      </body>
    </html>
  );
}
