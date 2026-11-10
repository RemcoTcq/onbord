import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { localiserChemin } from "@/lib/i18n/routes";
import EnTeteLearner from "@/components/learner/EnTeteLearner";
import { ToastProvider } from "@/components/ui/Toast";
import "../../globals.css";

// L'espace du LEARNER : ses modules, ses essais et leur retour, ses résultats
// (phase 3). Séparé du tableau de bord du recrutement, qui n'a rien à lui
// montrer. Un admin ou un manager qui arrive ici repart vers son tableau de
// bord.
export default async function LearnerLayout({ children, params }) {
  const { lang } = await params;
  const ctx = await getOrgContext();
  if (!ctx) redirect(`/${lang}${localiserChemin("/login", lang)}`);
  if (ctx.orgRole !== "learner") redirect(`/${lang}${localiserChemin("/accueil", lang)}`);
  return (
    <ToastProvider>
      <div className="ds" style={{ minHeight: "100vh", background: "var(--ds-page)" }}>
        <EnTeteLearner />
        <main style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px 64px", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
