import { redirect } from "next/navigation";
import DashboardShell from "./DashboardShell";
import { getOrgContext } from "@/lib/org";
import { localiserChemin } from "@/lib/i18n/routes";
import { alignerLangueProfil } from "@/lib/i18n/alignerLangue";

// Le chargement du dictionnaire et le provider vivent un cran au-dessus, dans
// app/[lang]/layout.js : c'est lui qui porte le segment de langue. Ce layout ne
// garde que l'enveloppe d'interface (session, sidebar, onboarding), restée
// composant client.
//
// Depuis la phase 0 de l'onboarding, il AIGUILLE aussi : un learner n'a rien
// à faire dans le tableau de bord du recrutement, il part vers son espace
// d'entraînement. La RLS lui refuse déjà toutes les données (migration 036) ;
// ce renvoi lui évite des écrans vides.
export default async function DashboardLayout({ children, params }) {
  const ctx = await getOrgContext();
  const { lang } = await params;
  if (ctx?.orgRole === "learner") redirect(`/${lang}${localiserChemin("/formation", lang)}`);
  // Les rapports se rédigent dans la langue du profil : elle suit celle de l'écran.
  if (ctx) await alignerLangueProfil(ctx.supabase, ctx.user.id, lang);
  return <DashboardShell>{children}</DashboardShell>;
}
