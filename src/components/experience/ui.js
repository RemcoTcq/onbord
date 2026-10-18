"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Styles et petits éléments partagés par les écrans de la simulation (vue
// d'ensemble, page d'une étape, éditeurs). Palette : app/recruteur.css.
export const inputStyle = {
  width: "100%", padding: "8px 12px", borderRadius: "9px", border: "1px solid var(--ds-line)",
  fontSize: "14px", fontFamily: "inherit", background: "#FFFFFF", color: "var(--ds-ink)", marginBottom: "2px",
  lineHeight: 1.5, outline: "none",
};
export const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A85A3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "32px",
  cursor: "pointer",
};
export const labelStyle = {
  display: "block", fontSize: "12px", fontWeight: 500, color: "var(--ds-ink-3)", margin: "0.5rem 0 5px",
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
    <span className={`ds-chip ${s.ton}`} style={{ height: 30, padding: "0 10px", borderRadius: 8, fontSize: 13 }}>
      <span className={`ds-dot ${s.dot}`} />
      {s.label}
    </span>
  );
}

// ─── Panneau repliable ───────────────────────────────────────────────────────
// La carte des maquettes « Étape – Scénario / Notation » : en-tête (icône,
// titre, sous-titre, actions, chevron), puis un encart gris-bleu. `pointilles`
// marque ce que le candidat ne voit jamais (« Dans la tête du personnage »).
export function Panneau({
  id, titre, sousTitre, icone, compte, actions, children,
  repliable = true, defautOuvert = true, pointilles = false, lignes = true, styleCorps,
}) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(defautOuvert);
  return (
    <section
      aria-labelledby={id}
      className="ds-panel"
      style={pointilles ? { border: "1px dashed #C9D3EA", background: "#FBFCFF", boxShadow: "none" } : undefined}
    >
      <div style={{ display: "flex", alignItems: icone ? "center" : "flex-start", justifyContent: "space-between", gap: 10, padding: icone ? "8px 5px 0 10px" : "8px 5px 0 10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          {icone && (
            <span className="ds-icon-tile ds-icon-tile-soft" style={{ width: 32, height: 32, borderRadius: 9, ...(pointilles ? { background: "#EEF2FA", color: "var(--ds-ink-2)" } : {}) }}>
              {icone}
            </span>
          )}
          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <h2 id={id} className="ds-h2">{titre}</h2>
            {sousTitre && <span className="ds-sub">{sousTitre}</span>}
          </span>
        </span>
        {compte != null && <span className="ds-chip" style={{ flex: "none" }}>{compte}</span>}
        {actions}
        {repliable && (
          <button
            type="button"
            className="ds-icon-btn"
            onClick={() => setOuvert((o) => !o)}
            aria-expanded={ouvert}
            aria-label={t("dashboard.experienceEditor.ui.toggle", { title: titre })}
            title={t("dashboard.experienceEditor.ui.toggleShort")}
            style={{ width: 30, height: 30 }}
          >
            <ChevronDown size={16} strokeWidth={2} style={{ transition: "transform .15s", transform: ouvert ? "none" : "rotate(-90deg)" }} />
          </button>
        )}
      </div>
      {ouvert && (
        <div className={lignes ? "ds-inset ds-rows" : "ds-inset"} style={styleCorps}>
          {children}
        </div>
      )}
    </section>
  );
}

// ─── Une ligne de réglage : libellé et aide à gauche, contrôle à droite ──────
export function LigneReglage({ titre, aide, children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px 16px", padding: 14 }}>
      <span style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 500 }}>{titre}</span>
        {aide && <span className="ds-sub">{aide}</span>}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{children}</span>
    </div>
  );
}

// ─── Choix exclusif en pastilles (Chat / Vidéo…) ─────────────────────────────
export function ChoixSegmente({ valeur, options, onChange, label }) {
  return (
    <span role="radiogroup" aria-label={label} style={{ display: "inline-flex", padding: 3, gap: 2, borderRadius: 9, background: "var(--ds-page)", border: "1px solid var(--ds-line)" }}>
      {options.map(([v, libelle]) => {
        const actif = v === valeur;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => onChange(v)}
            style={{
              height: 28, padding: "0 12px", border: 0, borderRadius: 7, font: "inherit", fontSize: 13, cursor: "pointer",
              background: actif ? "#FFFFFF" : "transparent", color: actif ? "var(--ds-ink)" : "var(--ds-ink-3)",
              fontWeight: actif ? 500 : 400, boxShadow: actif ? "0 1px 2px rgba(20,32,74,0.1)" : "none",
            }}
          >
            {libelle}
          </button>
        );
      })}
    </span>
  );
}

// ─── Interrupteur ────────────────────────────────────────────────────────────
export function Interrupteur({ actif, onChange, label, texte }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!actif}
      aria-label={label}
      onClick={() => onChange(!actif)}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: 0, border: 0, background: "transparent", font: "inherit", fontSize: 13, color: "var(--ds-ink-2)", cursor: "pointer" }}
    >
      {texte}
      <span style={{ position: "relative", width: 36, height: 20, borderRadius: 999, background: actif ? "var(--ds-blue)" : "#D5DBE8", transition: "background .15s" }}>
        <span style={{ position: "absolute", top: 2, left: actif ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 2px rgba(20,32,74,0.2)", transition: "left .15s" }} />
      </span>
    </button>
  );
}

// ─── Compteur − n + ──────────────────────────────────────────────────────────
export function Compteur({ valeur, min, max, onChange, moins, plus }) {
  const borne = (v) => Math.max(min, Math.min(max, v));
  return (
    <span style={{ display: "inline-flex", alignItems: "center", height: 36, borderRadius: 9, border: "1px solid var(--ds-line)", background: "#FFFFFF", overflow: "hidden" }}>
      <button type="button" onClick={() => onChange(borne(valeur - 1))} aria-label={moins} disabled={valeur <= min} className="ds-btn-ghost" style={{ width: 34, height: 34, border: 0, background: "transparent", font: "inherit", fontSize: 16, color: "var(--ds-ink-2)", cursor: "pointer" }}>−</button>
      <span aria-live="polite" className="ds-mono" style={{ minWidth: 28, textAlign: "center", fontWeight: 500 }}>{valeur}</span>
      <button type="button" onClick={() => onChange(borne(valeur + 1))} aria-label={plus} disabled={valeur >= max} className="ds-btn-ghost" style={{ width: 34, height: 34, border: 0, background: "transparent", font: "inherit", fontSize: 16, color: "var(--ds-ink-2)", cursor: "pointer" }}>+</button>
    </span>
  );
}

// ─── Bandeau éphémère ────────────────────────────────────────────────────────
// Les bandeaux d'état (publiée, version déjà commencée…) s'affichent quand la
// page s'ouvre ou qu'une modification vient d'avoir lieu, le temps d'être lus,
// puis s'effacent (12/10/2026). Couleur selon le ton : vert (c'est fait), jaune
// (attention), rouge (erreur). Pour le réafficher après une modification, le
// parent change sa `key`. `bande` : pleine largeur sous l'en-tête de page,
// comme dans la maquette « D · Simulation ».
const TONS = {
  succes: { background: "#F5FBF8", color: "#0F5C39", borderColor: "#D4EEE1" },
  alerte: { background: "var(--ds-amber-bg)", color: "var(--ds-amber-ink)", borderColor: "#F3DDB8" },
  erreur: { background: "var(--ds-red-bg)", color: "var(--ds-red)", borderColor: "var(--ds-red-inset)" },
};
const DUREE_BANDEAU_MS = 10000;

export function BandeauEphemere({ ton = "succes", children, style, bande = false }) {
  const [etat, setEtat] = useState("visible"); // visible → sortie → parti
  useEffect(() => {
    const a = setTimeout(() => setEtat("sortie"), DUREE_BANDEAU_MS);
    const b = setTimeout(() => setEtat("parti"), DUREE_BANDEAU_MS + 400);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);
  if (etat === "parti") return null;
  const { borderColor, ...couleurs } = TONS[ton];
  return (
    <div
      role="status"
      style={{
        ...couleurs,
        ...(bande
          ? { padding: "10px 20px", borderBottom: `1px solid ${borderColor}` }
          : { border: `1px solid ${borderColor}`, borderRadius: 10, padding: "10px 14px", marginBottom: "1rem" }),
        fontSize: "13px", display: "flex", alignItems: "center", gap: 8,
        transition: "opacity .4s ease", opacity: etat === "sortie" ? 0 : 1, ...style,
      }}
    >
      {children}
    </div>
  );
}
