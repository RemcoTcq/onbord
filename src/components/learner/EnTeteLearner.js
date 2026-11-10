"use client";

// La barre du haut de l'espace learner : le logo, ses deux pages (son
// entraînement, ses résultats) et la déconnexion. Pas de barre latérale : il
// n'a que deux endroits où aller.

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { LocaleLink as Link, useRouter, stripLocale } from "@/lib/i18n/navigation";

export default function EnTeteLearner() {
  const t = useT();
  const router = useRouter();
  const chemin = stripLocale(usePathname());

  async function deconnecter() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const liens = [
    { href: "/formation", label: t("dashboard.learner.title"), actif: chemin === "/formation" || chemin.startsWith("/formation/essais") },
    { href: "/formation/resultats", label: t("dashboard.learner.results"), actif: chemin.startsWith("/formation/resultats") },
  ];

  return (
    <header style={{ borderBottom: "1px solid var(--ds-line)", background: "var(--ds-surface)" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Onbord" style={{ height: 24, width: "auto" }} />
        <nav className="ds-tabs" style={{ flex: 1 }}>
          {liens.map((l) => (
            <Link key={l.href} href={l.href} className="ds-tab" aria-current={l.actif ? "page" : undefined}>{l.label}</Link>
          ))}
        </nav>
        <button type="button" className="ds-btn" onClick={deconnecter}>
          <LogOut size={15} strokeWidth={1.8} /> {t("dashboard.learner.signOut")}
        </button>
      </div>
    </header>
  );
}
