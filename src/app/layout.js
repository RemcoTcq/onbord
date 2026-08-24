import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { buildDictionary } from "@/lib/i18n/dictionaries";
import { resolveUiLocale } from "@/lib/i18n/server";
import { LOCALE_TAGS } from "@/lib/i18n/config";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

// Métadonnées résolues par langue. Elles servent aussi aux aperçus de lien
// partagés par le recruteur, d'où la traduction plutôt qu'un titre figé.
const META = {
  fr: {
    title: "Onbord — Recrutement intelligent",
    description: "Plateforme de qualification automatique des candidatures par IA",
  },
  en: {
    title: "Onbord — Smarter hiring",
    description: "AI-powered platform for automatic candidate screening",
  },
};

export async function generateMetadata() {
  const locale = await resolveUiLocale();
  return META[locale] || META.fr;
}

export default async function RootLayout({ children }) {
  // Le layout racine couvre AUSSI les routes publiques du parcours candidat.
  // On y sert la locale d'interface (cookie / Accept-Language) ; le parcours
  // candidat la remplacera par celle de l'offre une fois celle-ci chargée,
  // via setLocale() côté client.
  const locale = await resolveUiLocale();
  // Seul "common" est servi ici : le layout racine couvre aussi bien le
  // dashboard que le parcours candidat. Chaque zone ajoute son namespace via
  // son propre layout serveur (voir (dashboard)/layout.js et run/[token]/layout.js).
  const dictionary = await buildDictionary(locale, ["common"]);

  return (
    <html lang={LOCALE_TAGS[locale] || LOCALE_TAGS.fr} className={geist.variable}>
      <body className={geist.className}>
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
