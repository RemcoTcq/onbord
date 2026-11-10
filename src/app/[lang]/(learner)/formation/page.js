"use client";

// L'accueil du learner. Phase 0 : il existe, il dit que les modules arrivent.
// La phase 3 y pose ses modules assignés, le prochain à faire et sa
// progression.

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { useRouter } from "@/lib/i18n/navigation";

export default function FormationPage() {
  const t = useT();
  const router = useRouter();
  const [prenom, setPrenom] = useState("");

  useEffect(() => {
    let annule = false;
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!annule) setPrenom(user?.user_metadata?.first_name || "");
    });
    return () => { annule = true; };
  }, []);

  async function deconnecter() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Onbord" style={{ height: 26, width: "auto" }} />
        <button type="button" className="ds-btn" onClick={deconnecter}>
          <LogOut size={15} strokeWidth={1.8} /> {t("dashboard.learner.signOut")}
        </button>
      </div>
      <section className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
          <h1 className="ds-h1">{t("dashboard.learner.title")}</h1>
          {prenom && <p className="ds-sub">{t("dashboard.learner.welcome", { name: prenom })}</p>}
        </div>
        <div className="ds-inset">
          <p className="ds-sub">{t("dashboard.learner.soon")}</p>
        </div>
      </section>
    </div>
  );
}
