import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { buildDictionary } from "@/lib/i18n/dictionaries";
import { resolveUiLocale } from "@/lib/i18n/server";

// La page du parcours est un composant client : elle ne peut pas porter de
// config de segment. Ce layout existe pour poser `maxDuration`, qui s'applique
// aux Server Actions du segment — dont submitRun et le scoreRun qu'elle
// planifie via `after`. Sans ça, le scoring détaché (~30 s) serait coupé par le
// timeout par défaut de la plateforme.
export const maxDuration = 300;

export default async function RunLayout({ children }) {
  // Locale d'amorçage seulement. La vraie langue du parcours est celle de
  // l'offre (jobs.experience_locale) : elle n'est connue qu'une fois le run
  // chargé par son token, et la page bascule dessus via setLocale(). Ce qu'on
  // sert ici ne couvre que l'écran de chargement et les erreurs de lien.
  const locale = await resolveUiLocale();
  const dictionary = await buildDictionary(locale, ["candidate"]);

  return (
    <I18nProvider locale={locale} dictionary={dictionary}>
      {children}
    </I18nProvider>
  );
}
