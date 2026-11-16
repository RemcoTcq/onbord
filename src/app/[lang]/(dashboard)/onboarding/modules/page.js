import { redirect } from "next/navigation";
import { localiserChemin } from "@/lib/i18n/routes";

// La liste des modules a rejoint « Simulations » (16/11/2026) : recrutement et
// onboarding au même endroit, et une seule entrée pour en créer. L'ancienne
// adresse y mène, filtre « onboarding » posé. Les pages d'un module
// (/onboarding/modules/<id>) ne bougent pas.
export default async function ModulesPage({ params }) {
  const { lang } = await params;
  redirect(`/${lang}${localiserChemin("/simulations", lang)}?usage=onboarding`);
}
