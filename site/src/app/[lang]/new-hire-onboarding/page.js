import { coerceLocale } from "@/lib/i18n/config";
import CasUsage, { metaCas } from "@/components/CasUsage";

// Page « Solutions » (10/11/2026, demande directe), gabarit CasUsage.js.
// L'onboarding des nouvelles recrues. ⚠️ Règle 2 : l'onboarding N'EXISTE PAS ENCORE dans
// l'application ; cette page décrit le produit à venir (voir site/AGENTS.md).

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return metaCas(coerceLocale(lang), "onboarding", "/new-hire-onboarding");
}

export default async function Onboarding({ params }) {
  const { lang } = await params;
  return <CasUsage locale={coerceLocale(lang)} cle="onboarding" />;
}
