import { coerceLocale } from "@/lib/i18n/config";
import CasUsage, { metaCas } from "@/components/CasUsage";

// Page « Solutions » (10/11/2026, demande directe), gabarit CasUsage.js.
// Le recrutement : voir qui sait gérer vos clients avant d'embaucher.

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return metaCas(coerceLocale(lang), "hiring", "/hiring");
}

export default async function Hiring({ params }) {
  const { lang } = await params;
  return <CasUsage locale={coerceLocale(lang)} cle="hiring" />;
}
