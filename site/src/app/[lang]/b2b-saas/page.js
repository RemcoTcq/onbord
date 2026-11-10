import { coerceLocale } from "@/lib/i18n/config";
import CasUsage, { metaCas } from "@/components/CasUsage";

// Page « Solutions » (10/11/2026, demande directe), gabarit CasUsage.js.
// Le secteur du SaaS B2B : le recrutement et l'onboarding, vus par ses équipes.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return metaCas(coerceLocale(lang), "saas", "/b2b-saas");
}

export default async function Saas({ params }) {
  const { lang } = await params;
  return <CasUsage locale={coerceLocale(lang)} cle="saas" />;
}
