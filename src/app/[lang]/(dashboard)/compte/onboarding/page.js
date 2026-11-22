"use client";

// Paramètres → Onboarding (20/11/2026). La validation automatique vivait au
// bas de la vue d'ensemble de l'onboarding ; c'est un réglage d'organisation,
// pas une donnée à suivre : il a sa place ici (Remco). Un manager le voit, seul
// un admin le change (lib/actions/personnes.js, reglerAutoValidation).

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { Interrupteur } from "@/components/experience/ui";
import { getReglagesOnboarding, reglerAutoValidation } from "@/lib/actions/personnes";

export default function ReglagesOnboardingPage() {
  const t = useT();
  const k = (cle) => t(`dashboard.account.onboarding.${cle}`);
  const { toast } = useToast();
  const [reglages, setReglages] = useState(null);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    getReglagesOnboarding().then((r) => { if (!annule) setReglages(r.success ? r : { erreur: true }); });
    return () => { annule = true; };
  }, []);

  async function basculer(actif) {
    if (enCours) return;
    setEnCours(true);
    const res = await reglerAutoValidation(actif);
    setEnCours(false);
    if (!res.success) return toast(k("error"), "error");
    setReglages((r) => ({ ...r, autoValidate: actif }));
    toast(k("saved"), "success");
  }

  if (!reglages) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <section className="ds-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
        <h2 className="ds-h2">{k("title")}</h2>
      </div>

      <div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <span style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 4 }}>
          <b style={{ fontWeight: 600 }}>{k("autoValidate")}</b>
          <span className="ds-sub" style={{ fontSize: 13 }}>{k("autoValidateHint")}</span>
          {!reglages.erreur && !reglages.peutModifier && <span className="ds-muted" style={{ fontSize: 12 }}>{k("adminOnly")}</span>}
        </span>
        {reglages.erreur ? (
          <span className="ds-sub">{k("error")}</span>
        ) : reglages.peutModifier ? (
          <Interrupteur actif={reglages.autoValidate} onChange={basculer} label={k("autoValidate")} texte={reglages.autoValidate ? k("on") : k("off")} />
        ) : (
          <span className={`ds-chip ${reglages.autoValidate ? "ds-chip-blue" : ""}`}>{reglages.autoValidate ? k("on") : k("off")}</span>
        )}
      </div>
    </section>
  );
}
