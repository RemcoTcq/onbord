"use client";

import { Check, Lock, Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";

// Langue de L'OFFRE — donc de tout ce que le candidat voit et lit.
//
// `locked` reflète le verrou posé en base (trigger trg_jobs_langue_figee,
// migration 026) : une fois l'expérience générée, ses énoncés sont STOCKÉS
// rédigés dans cette langue. Changer la colonne ne les réécrirait pas ; on
// obtiendrait un parcours dont l'interface est en néerlandais et les questions
// en français.
//
// L'interface interdit donc ce que la base refuse déjà, mais en l'expliquant :
// un bouton grisé sans raison est un bug pour l'utilisateur, un bouton grisé
// avec sa raison est une règle.

export default function JobLocaleSelector({ value, onChange, locked = false, disabled = false }) {
  const { t } = useI18n();
  const courante = value || "fr";

  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
        <Languages size={15} style={{ color: "var(--muted-foreground)" }} />
        {t("dashboard.jobLocale.label")}
        {locked && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 4,
            padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: "var(--accent)", color: "var(--muted-foreground)",
          }}>
            <Lock size={11} /> {t("dashboard.jobLocale.lockedTitle")}
          </span>
        )}
      </label>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {EXPERIENCE_LOCALES.map((code) => {
          const actif = code === courante;
          const inerte = locked || disabled;
          return (
            <button
              key={code}
              type="button"
              onClick={() => !inerte && onChange(code)}
              disabled={inerte}
              aria-pressed={actif}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "0.6rem 1rem", borderRadius: 10, fontSize: 14,
                fontFamily: "inherit", fontWeight: actif ? 700 : 500,
                cursor: inerte ? "not-allowed" : "pointer",
                opacity: inerte && !actif ? 0.45 : 1,
                border: `1px solid ${actif ? "var(--primary)" : "var(--border)"}`,
                background: actif ? "var(--accent)" : "transparent",
                color: actif ? "var(--primary)" : "var(--foreground)",
              }}
            >
              {actif ? <Check size={15} /> : null}
              {LOCALE_LABELS[code]}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
        {locked
          ? t("dashboard.jobLocale.lockedHelp", { locale: LOCALE_LABELS[courante] })
          : t("dashboard.jobLocale.help")}
      </p>
    </div>
  );
}
