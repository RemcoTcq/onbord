"use client";

import { useState } from "react";
import { KanbanSquare, ChevronUp, ChevronDown, Gauge, GripVertical } from "lucide-react";
import { field, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";
import { colonneDe } from "@/lib/tableauCartes";

// Sandbox « board » — des cartes à arbitrer : backlog produit, roadmap, plan de
// projet ou file de tickets, selon le scénario. Le candidat range chaque carte
// dans une colonne, ordonne chaque colonne, annote ce qui le mérite, puis
// justifie l'ensemble au regard de la contrainte (capacité, budget, délai).
//
// Glisser-déposer pour la souris ; les mêmes gestes en boutons pour le clavier
// et le mobile, où le glisser natif n'existe pas.

const VIDE = { order: [], notes: {}, justification: "" };

export default function BoardSandbox({ board, value, onChange, primary = DEFAULT_PRIMARY, compact = false }) {
  const t = useT();
  const cards = board?.cards || [];
  const columns = board?.columns || [];
  const v = value || VIDE;
  const order = columns.map((_, i) => v.order?.[i] || []);
  const [ouverte, setOuverte] = useState(null);
  const [survol, setSurvol] = useState(null);

  const parId = new Map(cards.map((c) => [c.id, c]));
  const aClasser = cards.filter((c) => colonneDe({ order }, c.id) < 0);

  function publier(patch) {
    onChange({ order, notes: v.notes || {}, justification: v.justification || "", ...patch });
  }

  // Déplace une carte vers une colonne (-1 : la réserve « à classer »), en fin
  // de colonne ou à une position donnée.
  function deplacer(id, col, position = null) {
    const neuf = order.map((ids) => ids.filter((x) => x !== id));
    if (col >= 0) {
      const cible = [...neuf[col]];
      cible.splice(position === null ? cible.length : position, 0, id);
      neuf[col] = cible;
    }
    publier({ order: neuf });
  }

  function decaler(id, sens) {
    const col = colonneDe({ order }, id);
    if (col < 0) return;
    const ids = [...order[col]];
    const i = ids.indexOf(id);
    const j = i + sens;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const neuf = [...order];
    neuf[col] = ids;
    publier({ order: neuf });
  }

  const zoneDepot = (col) => ({
    onDragOver: (e) => { e.preventDefault(); setSurvol(col); },
    onDragLeave: () => setSurvol((s) => (s === col ? null : s)),
    onDrop: (e) => {
      e.preventDefault();
      setSurvol(null);
      const id = e.dataTransfer.getData("text/plain");
      if (parId.has(id)) deplacer(id, col);
    },
  });

  // Une fonction de rendu, pas un composant : déclaré ici, un composant serait
  // recréé à chaque frappe, et la note perdrait le focus à chaque caractère.
  function carte(c, col, rang, total) {
    const ouvert = ouverte === c.id;
    const note = v.notes?.[c.id] || "";
    return (
      <div
        key={c.id}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", c.id); e.dataTransfer.effectAllowed = "move"; }}
        style={{ background: "#ffffff", border: `1px solid ${ouvert ? primary : "var(--border)"}`, borderRadius: 10, padding: "9px 10px", boxShadow: "0 1px 2px rgba(15,23,42,.04)", cursor: "grab" }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
          <GripVertical size={14} style={{ color: "#cbd5e1", flexShrink: 0, marginTop: 2 }} />
          <button type="button" onClick={() => setOuverte(ouvert ? null : c.id)}
            style={{ flex: 1, minWidth: 0, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4, overflowWrap: "break-word" }}>
            {col >= 0 && <span style={{ color: "var(--muted-foreground)", fontWeight: 700, marginRight: 4 }}>{rang + 1}.</span>}
            {c.title}
          </button>
          {note && <span title={t("candidate.board.hasNote")} style={{ width: 6, height: 6, borderRadius: "50%", background: primary, flexShrink: 0, marginTop: 6 }} />}
        </div>
        {Object.keys(c.meta || {}).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, paddingLeft: 20 }}>
            {Object.entries(c.meta).map(([k, val]) => (
              <span key={k} style={{ fontSize: 10.5, padding: "1px 7px", borderRadius: 99, background: "#f1f5f9", color: "#475569", whiteSpace: "nowrap" }}>
                {k} : <strong>{val}</strong>
              </span>
            ))}
          </div>
        )}
        {ouvert && (
          <div style={{ marginTop: 8, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {c.body && <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{c.body}</p>}
            <textarea
              className="nodal-input"
              value={note}
              onChange={(e) => publier({ notes: { ...(v.notes || {}), [c.id]: e.target.value } })}
              rows={2}
              placeholder={t("candidate.board.notePlaceholder")}
              style={{ ...field, fontSize: 13, padding: "0.5rem 0.75rem", minHeight: 56, resize: "vertical" }}
            />
          </div>
        )}
        {/* Les mêmes gestes sans glisser : clavier, mobile. */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, paddingLeft: 20 }}>
          <select
            value={col}
            onChange={(e) => deplacer(c.id, Number(e.target.value))}
            aria-label={t("candidate.board.moveTo")}
            style={{ flex: 1, minWidth: 0, fontSize: 11.5, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "#fafafa", fontFamily: "inherit", color: "var(--foreground)" }}
          >
            <option value={-1}>{t("candidate.board.unsorted")}</option>
            {columns.map((nom, i) => <option key={i} value={i}>{nom}</option>)}
          </select>
          {col >= 0 && (
            <>
              <button type="button" onClick={() => decaler(c.id, -1)} disabled={rang === 0} aria-label={t("candidate.board.up")}
                style={{ padding: 2, border: "1px solid var(--border)", borderRadius: 6, background: "#ffffff", cursor: rang === 0 ? "default" : "pointer", opacity: rang === 0 ? 0.35 : 1, display: "flex" }}><ChevronUp size={13} /></button>
              <button type="button" onClick={() => decaler(c.id, 1)} disabled={rang === total - 1} aria-label={t("candidate.board.down")}
                style={{ padding: 2, border: "1px solid var(--border)", borderRadius: 6, background: "#ffffff", cursor: rang === total - 1 ? "default" : "pointer", opacity: rang === total - 1 ? 0.35 : 1, display: "flex" }}><ChevronDown size={13} /></button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!cards.length) return <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{t("candidate.board.empty")}</p>;

  const colonne = (titre, ids, col) => (
    <div {...zoneDepot(col)}
      style={{ background: survol === col ? `${primary}10` : "#f8fafc", border: `1px ${survol === col ? "dashed" : "solid"} ${survol === col ? primary : "var(--border)"}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 120, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--foreground)", overflowWrap: "break-word" }}>{titre}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)" }}>{ids.length}</span>
      </div>
      {ids.map((id, k) => {
        const c = parId.get(id);
        return c ? carte(c, col, k, ids.length) : null;
      })}
      {!ids.length && <p style={{ fontSize: 11.5, color: "#94a3b8", textAlign: "center", margin: "auto 0" }}>{t("candidate.board.dropHere")}</p>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <div style={{ background: "#fafafa", padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <KanbanSquare size={16} style={{ color: primary }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{board?.title || t("candidate.board.title")}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: aClasser.length ? "var(--muted-foreground)" : "#166534" }}>
            {t("candidate.board.progress", { done: cards.length - aClasser.length, total: cards.length })}
          </span>
        </div>
        {board?.constraint && (
          <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--border)", background: "#fffbeb", fontSize: 13, color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Gauge size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ overflowWrap: "break-word" }}>{board.constraint}</span>
          </div>
        )}
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {aClasser.length > 0 && colonne(t("candidate.board.unsorted"), aClasser.map((c) => c.id), -1)}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${compact ? 200 : 210}px, 1fr))`, gap: 10 }}>
            {columns.map((nom, i) => <div key={i} style={{ minWidth: 0, display: "flex" }}><div style={{ flex: 1, minWidth: 0 }}>{colonne(nom, order[i], i)}</div></div>)}
          </div>
        </div>
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6 }}>
          {t("candidate.board.justification")}
        </label>
        <textarea
          className="nodal-input"
          value={v.justification || ""}
          onChange={(e) => publier({ justification: e.target.value })}
          rows={4}
          placeholder={t("candidate.board.justificationPlaceholder")}
          style={{ ...field, minHeight: 110, maxHeight: 360, resize: "vertical" }}
        />
      </div>
    </div>
  );
}
