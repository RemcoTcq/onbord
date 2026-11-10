import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { localiserChemin } from "@/lib/i18n/routes";
import "../../globals.css";

// L'espace du LEARNER (phase 0 : l'accueil ; phase 3 : ses modules, ses
// essais, ses résultats). Séparé du tableau de bord du recrutement, qui n'a
// rien à lui montrer. Un admin ou un manager qui arrive ici repart vers son
// tableau de bord.
export default async function LearnerLayout({ children, params }) {
  const { lang } = await params;
  const ctx = await getOrgContext();
  if (!ctx) redirect(`/${lang}${localiserChemin("/login", lang)}`);
  if (ctx.orgRole !== "learner") redirect(`/${lang}${localiserChemin("/accueil", lang)}`);
  return <div className="ds">{children}</div>;
}
