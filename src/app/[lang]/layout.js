import { notFound } from "next/navigation";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { buildDictionary } from "@/lib/i18n/dictionaries";
import { UI_LOCALES } from "@/lib/i18n/config";

// Segment de langue de l'interface recruteur : /fr/jobs, /en/jobs.
//
// Il ne couvre QUE le dashboard et l'authentification. Le parcours candidat
// reste sur des URL sans préfixe (/run/[token], /apply/[job_id]) pour deux
// raisons qui n'ont rien à voir avec la commodité :
//
//   1. Ces liens sont déjà partis par e-mail chez des candidats. Les préfixer
//      les casserait tous, sans moyen de les prévenir.
//   2. La langue d'un parcours n'est pas un choix du candidat : les énoncés
//      sont STOCKÉS rédigés dans la langue de l'offre. Un /nl/run/xyz laisserait
//      croire qu'on peut basculer une évaluation en français — l'interface
//      changerait, les questions non.
//
// Ce n'est donc pas une exception au préfixe, c'est la même règle appliquée à
// une donnée qui, elle, n'est pas traduisible à la volée.

export function generateStaticParams() {
  return UI_LOCALES.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }) {
  const { lang } = await params;

  // Une locale inconnue rend 404 plutôt que de retomber en silence sur le
  // français : /de/jobs doit dire qu'il n'existe pas, pas afficher un dashboard
  // français sous une URL allemande.
  if (!UI_LOCALES.includes(lang)) notFound();

  // Le namespace "dashboard" est chargé ici, au rendu serveur. Le provider est
  // imbriqué dans celui de app/layout.js (qui sert "common") et fusionne les
  // deux dictionnaires — voir I18nProvider.
  const dictionary = await buildDictionary(lang, ["dashboard"]);

  return (
    <I18nProvider locale={lang} dictionary={dictionary}>
      {children}
    </I18nProvider>
  );
}
