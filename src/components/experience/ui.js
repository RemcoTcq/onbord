"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Styles et petits éléments partagés par les écrans de la simulation (vue
// d'ensemble, page d'une étape, éditeurs).
export const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)",
  fontSize: "14px", fontFamily: "inherit", background: "var(--background)", color: "var(--foreground)", marginBottom: "2px",
};
export const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "32px",
  cursor: "pointer",
};
export const labelStyle = {
  display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "var(--muted-foreground)", margin: "0.5rem 0 4px",
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  const map = {
    draft: { label: t("dashboard.experienceEditor.status.draft"), ton: "", dot: "ds-dot-grey" },
    pending_review: { label: t("dashboard.experienceEditor.status.pending_review"), ton: "ds-chip-amber", dot: "ds-dot-amber" },
    published: { label: t("dashboard.experienceEditor.status.published"), ton: "ds-chip-green", dot: "ds-dot-green" },
    archived: { label: t("dashboard.experienceEditor.status.archived"), ton: "", dot: "ds-dot-grey" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`ds-chip ${s.ton}`}>
      <span className={`ds-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Bandeau éphémère ────────────────────────────────────────────────────────
// Les bandeaux d'état (publiée, version déjà commencée…) s'affichent quand la
// page s'ouvre ou qu'une modification vient d'avoir lieu, le temps d'être lus,
// puis s'effacent (12/10/2026). Couleur selon le ton : vert (c'est fait), jaune
// (attention), rouge (erreur). Pour le réafficher après une modification, le
// parent change sa `key`.
const TONS = {
  succes: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" },
  alerte: { background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c" },
  erreur: { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" },
};
const DUREE_BANDEAU_MS = 10000;

export function BandeauEphemere({ ton = "succes", children, style }) {
  const [etat, setEtat] = useState("visible"); // visible → sortie → parti
  useEffect(() => {
    const a = setTimeout(() => setEtat("sortie"), DUREE_BANDEAU_MS);
    const b = setTimeout(() => setEtat("parti"), DUREE_BANDEAU_MS + 400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (etat === "parti") return null;
  return (
    <div
      role="status"
      style={{
        ...TONS[ton], borderRadius: 10, padding: "10px 14px", fontSize: "13px", marginBottom: "1rem",
        transition: "opacity .4s ease", opacity: etat === "sortie" ? 0 : 1, ...style,
      }}
    >
      {children}
    </div>
  );
}
