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
// Une ligne d'encart (maquette « Étape – Scénario ») : titre, texte, ✎ à droite.
// Lue par défaut ; ✎ ouvre le champ sur place.
// `liste` : la valeur est un tableau de textes, édité à une ligne par élément.
// `fort` : titre en gras (les lignes de « Dans la tête du personnage ») plutôt
// qu'en petit libellé. `citation` : le texte s'affiche comme une réplique.
export function SectionRecit({
  titre, aide, valeur, liste = false, vide, onChange, lignes = 3, fort = false, citation = false,
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
  const libelle = edition ? t("dashboard.experienceEditor.recit.done") : t("dashboard.experienceEditor.recit.edit");

  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 10px 12px 14px" }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: fort ? 8 : 4 }}>
        <span style={fort ? { fontWeight: 500 } : { fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>
          {titre}
          {aide && <span style={{ fontWeight: 400, color: "var(--ds-ink-4)", fontSize: fort ? 13 : 12 }}> · {aide}</span>}
        </span>

        {edition ? (
          <AutoTextarea
            autoFocus
            value={liste ? (valeur || []).join("\n") : (valeur || "")}
            onChange={(e) => onChange(liste ? e.target.value.split("\n") : e.target.value)}
            rows={liste ? Math.max(2, (valeur || []).length) : lignes}
            placeholder={liste ? t("dashboard.experienceEditor.recit.onePerLine") : undefined}
            style={{ ...inputStyle, lineHeight: 1.6 }}
          />
        ) : estVide ? (
          <span style={{ fontStyle: "italic", color: "var(--ds-ink-4)" }}>{vide || "—"}</span>
        ) : liste ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {(replie ? elements.slice(0, 3) : elements).map((e, i) => (
              <li key={i} style={{ display: "flex", gap: 10, lineHeight: 1.55, color: "var(--ds-ink-2)" }}>
                <span style={{ width: 5, height: 5, flex: "none", marginTop: 8, borderRadius: 2, background: "var(--ds-blue)" }} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        ) : citation ? (
          <blockquote style={{ margin: "4px 0 0", padding: "12px 14px", borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            « {valeur} »
          </blockquote>
        ) : (
          <span style={{
            lineHeight: 1.6, color: "var(--ds-ink-2)", whiteSpace: "pre-wrap",
            ...(replie ? { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } : {}),
          }}>{valeur}</span>
        )}
        {!edition && long && (
          <button type="button" className="ds-link" onClick={() => setDeplie((d) => !d)}>
            {deplie
              ? t("dashboard.experienceEditor.recit.showLess")
              : liste
                ? t("dashboard.experienceEditor.recit.showMoreCount", { count: elements.length - 3 })
                : t("dashboard.experienceEditor.recit.showMore")}
          </button>
        )}
      </span>
      <button
        type="button"
        className="ds-icon-btn"
        onClick={() => setEdition((e) => !e)}
        aria-label={`${libelle} : ${titre}`}
        title={libelle}
        style={{ width: 30, height: 30, ...(edition ? { background: "var(--ds-blue-10)", color: "var(--ds-blue)" } : {}) }}
      >
        {edition ? <Check size={15} strokeWidth={2.2} /> : <Pencil size={14} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

// ─── Bloc replié ─────────────────────────────────────────────────────────────
// Une ligne d'encart qu'on déplie (« Voir et modifier les données »…).
export function Repli({ titre, aide, children, defaut = false }) {
  const [ouvert, setOuvert] = useState(defaut);
  return (
    <div style={{ padding: "12px 14px" }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", fontWeight: 500, color: "var(--ds-blue)" }}
      >
        <ChevronDown size={15} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        {titre}
      </button>
      {aide && !ouvert && <p className="ds-sub" style={{ margin: "3px 0 0 21px" }}>{aide}</p>}
      {ouvert && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
