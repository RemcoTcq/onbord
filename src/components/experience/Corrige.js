"use client";

// « Le corrigé » — dans l'onglet Scoring, sous la grille.
//
// Ce que l'IA sait pour noter et que le candidat ne voit jamais : les signes
// d'une conversation réussie, le tri attendu d'une boîte de réception. Ils
// vivaient dans l'onglet Scénario, à côté de ce que vit le candidat — et
// ressemblaient à une seconde grille. Ils ne sont PAS
// notés à part : le correcteur les reçoit en contexte (briefingCorrecteur,
// runScoring.js) pour attribuer les points des checkpoints. Seul l'affichage a
// bougé ; la donnée et la notation sont inchangées.

import { useState } from "react";
import { ChevronDown, KeyRound } from "lucide-react";
import { PRIORITES } from "@/lib/boiteReception";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionRecit } from "./Recit";
import { inputStyle, selectStyle } from "./ui";

/** L'étape a-t-elle un corrigé à montrer ? */
export function aUnCorrige(step) {
  const c = step?.config || {};
  switch (step?.sandbox_kind) {
    case "persona": return true;
    case "inbox": return (c.inbox?.items || []).length > 0;
    default: return false;
  }
}

export default function Corrige({ step, setConfig, stepId, toast }) {
  const { t } = useI18n();
  const c = step.config || {};
  // Replié : ce n'est pas une seconde grille, on l'ouvre pour le relire.
  const [ouvert, setOuvert] = useState(false);

  return (
    <section className="ds-card" style={{ display: "flex", flexDirection: "column", gap: ouvert ? 12 : 0, padding: ouvert ? 5 : 0 }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="ds-critere-tete"
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: ouvert ? "9px 11px 0" : "14px 16px", border: 0, borderRadius: 14, background: "transparent", cursor: "pointer", font: "inherit", color: "var(--ds-ink)", textAlign: "left" }}
      >
        <span className="ds-icon-tile ds-icon-tile-soft" style={{ width: 32, height: 32, borderRadius: 9 }}><KeyRound size={15} strokeWidth={2} /></span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontWeight: 600 }}>{t("dashboard.experienceEditor.corrige.title")}</span>
          <span className="ds-sub">{t("dashboard.experienceEditor.corrige.help")}</span>
        </span>
        <ChevronDown size={16} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--ds-ink-3)", flexShrink: 0 }} />
      </button>
      {ouvert && (<div className="ds-inset ds-rows">

      {step.sandbox_kind === "persona" && (
        <SectionRecit
          titre={t("dashboard.experienceEditor.persona.successSignals")}
          valeur={c.persona?.success_signals || []}
          liste
          stepId={stepId}
          toast={toast}
          onChange={(v) => setConfig({ persona: { ...(c.persona || {}), success_signals: v } })}
        />
      )}

      {step.sandbox_kind === "inbox" && (
        <TriAttendu
          elements={(c.inbox?.items || []).map((m) => ({ id: m.id, titre: [m.from, m.subject].filter(Boolean).join(" — ") || m.id }))}
          notes={c.inbox?.triage_notes || []}
          cle="item"
          choix={{ champ: "priority", options: PRIORITES.map((p) => [p, t(`dashboard.experienceEditor.inbox.priorities.${p}`)]) }}
          onChange={(triage_notes) => setConfig({ inbox: { ...(c.inbox || {}), triage_notes } })}
        />
      )}

      </div>)}
    </section>
  );
}

// ─── Tri attendu (boîte de réception) ────────────────────────────────────────
// Une ligne par message : ce qu'un bon professionnel en ferait,
// pourquoi, et si c'est un piège.
function TriAttendu({ elements, notes, cle, choix, onChange }) {
  const { t } = useI18n();
  const noteDe = (id) => notes.find((n) => n[cle] === id) || { [cle]: id, [choix.champ]: null, trap: false, why: "" };
  const setNote = (id, patch) => {
    const existe = notes.some((n) => n[cle] === id);
    onChange(existe ? notes.map((n) => (n[cle] === id ? { ...n, ...patch } : n)) : [...notes, { ...noteDe(id), ...patch }]);
  };

  return (
    <div style={{ padding: "12px 14px" }}>
      <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--ds-ink-3)", marginBottom: 6 }}>
        {t("dashboard.experienceEditor.corrige.triage")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {elements.map((el) => {
          const note = noteDe(el.id);
          return (
            <div key={el.id} style={{ background: "#FFFFFF", border: "1px solid var(--ds-line)", borderLeft: `3px solid ${note.trap ? "var(--ds-amber)" : "var(--ds-line)"}`, borderRadius: 8, padding: "0.55rem 0.7rem" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 5 }}>{el.titre}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <select
                  value={note[choix.champ] || ""}
                  onChange={(e) => setNote(el.id, { [choix.champ]: e.target.value || null })}
                  style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px", fontSize: "12.5px", padding: "5px 28px 5px 8px" }}
                >
                  <option value="">—</option>
                  {choix.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "var(--ds-amber-ink)" }}>
                  <input type="checkbox" checked={!!note.trap} onChange={(e) => setNote(el.id, { trap: e.target.checked })} />
                  {t("dashboard.experienceEditor.inbox.trap")}
                </label>
                <input
                  value={note.why || ""}
                  onChange={(e) => setNote(el.id, { why: e.target.value })}
                  placeholder={t("dashboard.experienceEditor.inbox.why")}
                  style={{ ...inputStyle, marginBottom: 0, flex: "1 1 220px", fontSize: "12.5px" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
