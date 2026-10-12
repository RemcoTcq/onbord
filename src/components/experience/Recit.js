"use client";

// L'étape RACONTÉE : ce que le recruteur lit dans l'onglet Scénario.
//
// Chaque morceau se lit d'abord comme un texte (ou une liste), et se modifie
// sur place avec ✎. Pour faire réécrire par l'IA, le recruteur passe par le
// chat de l'étape (la retouche ✨ d'un seul élément a été retirée le
// 12/10/2026, à la demande de Remco). Le formulaire complet reste derrière ✎,
// et les réglages techniques sont repliés dans « Réglages avancés ».

import { useState } from "react";
import { Pencil, Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { inputStyle } from "./ui";

// ─── Une section du récit ────────────────────────────────────────────────────
// Lue par défaut ; ✎ ouvre le champ sur place.
// `liste` : la valeur est un tableau de textes, édité à une ligne par élément.
export function SectionRecit({
  titre, aide, valeur, liste = false, vide, onChange, lignes = 3, accent, premier = false,
}) {
  const { t } = useI18n();
  const [edition, setEdition] = useState(false);
  const elements = liste ? (valeur || []).filter((v) => String(v || "").trim()) : [];
  const estVide = liste ? !elements.length : !String(valeur || "").trim();
  // Un long texte s'ouvre sur trois lignes (trois éléments pour une liste) :
  // la page se lit d'un coup d'œil, le détail reste à un clic.
  const long = liste ? elements.length > 3 : String(valeur || "").length > 240;
  const [deplie, setDeplie] = useState(false);
  const replie = long && !deplie;

  return (
    <div style={{ padding: premier ? "0 0 0.7rem" : "0.7rem 0", borderTop: premier ? "none" : "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: "12px", fontWeight: 800, color: accent || "var(--muted-foreground)", flex: 1, minWidth: 0 }}>{titre}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setEdition((e) => !e)}
          title={t(edition ? "dashboard.experienceEditor.recit.done" : "dashboard.experienceEditor.recit.edit")}
          style={{ padding: 3, color: edition ? "var(--primary)" : "var(--muted-foreground)" }}
        >
          {edition ? <Check size={14} /> : <Pencil size={13} />}
        </button>
      </div>
      {aide && <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0 0 5px" }}>{aide}</p>}

      {edition ? (
        <AutoTextarea
          autoFocus
          value={liste ? (valeur || []).join("\n") : (valeur || "")}
          onChange={(e) => onChange(liste ? e.target.value.split("\n") : e.target.value)}
          rows={liste ? Math.max(2, (valeur || []).length) : lignes}
          placeholder={liste ? t("dashboard.experienceEditor.recit.onePerLine") : undefined}
          style={{ ...inputStyle, fontSize: "13.5px", lineHeight: 1.55 }}
        />
      ) : estVide ? (
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>{vide || "—"}</p>
      ) : liste ? (
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: 4, fontSize: "13.5px", lineHeight: 1.55 }}>
          {(replie ? elements.slice(0, 3) : elements).map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      ) : (
        <p style={{
          fontSize: "13.5px", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap",
          ...(replie ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
        }}>{valeur}</p>
      )}
      {!edition && long && (
        <button
          type="button"
          onClick={() => setDeplie((d) => !d)}
          style={{ background: "none", border: "none", padding: 0, marginTop: 3, cursor: "pointer", font: "inherit", fontSize: "12px", fontWeight: 600, color: "var(--primary)" }}
        >
          {deplie
            ? t("dashboard.experienceEditor.recit.showLess")
            : liste
              ? t("dashboard.experienceEditor.recit.showMoreCount", { count: elements.length - 3 })
              : t("dashboard.experienceEditor.recit.showMore")}
        </button>
      )}
    </div>
  );
}

// ─── Bloc replié ─────────────────────────────────────────────────────────────
export function Repli({ titre, aide, children, defaut = false }) {
  const [ouvert, setOuvert] = useState(defaut);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "var(--foreground)" }}
      >
        <ChevronDown size={15} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--muted-foreground)" }} />
        <span style={{ fontSize: "13px", fontWeight: 800 }}>{titre}</span>
      </button>
      {aide && !ouvert && <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "3px 0 0 21px" }}>{aide}</p>}
      {ouvert && <div style={{ marginTop: "0.6rem" }}>{children}</div>}
    </div>
  );
}
