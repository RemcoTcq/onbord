import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { buildDictionary } from "@/lib/i18n/dictionaries";
import { resolveUiLocale } from "@/lib/i18n/server";

// Charge le namespace candidat pour ce segment public. La langue définitive
// vient de l'offre une fois celle-ci chargée (cf. setLocale dans la page).
export default async function CandidateLayout({ children }) {
  const locale = await resolveUiLocale();
  const dictionary = await buildDictionary(locale, ["candidate"]);

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      {children}
    </I18nProvider>
  );
}
