"use client";

// « Le corrigé » — dans l'onglet Scoring, sous la grille.
//
// Ce que l'IA sait pour noter et que le candidat ne voit jamais : les signes
// d'une conversation réussie, ce que les données du tableur permettent de voir,
// le tri attendu d'une boîte de réception ou d'un tableau, les valeurs attendues
// et le piège d'une fiche CRM. Ils vivaient dans l'onglet Scénario, à côté de ce
// que vit le candidat — et ressemblaient à une seconde grille. Ils ne sont PAS
// notés à part : le correcteur les reçoit en contexte (briefingCorrecteur,
// runScoring.js) pour attribuer les points des checkpoints. Seul l'affichage a
// bougé ; la donnée et la notation sont inchangées.

import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { crmToutesSources } from "@/lib/crmScoring";
import { PRIORITES } from "@/lib/boiteReception";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { SectionRecit } from "./Recit";
import { inputStyle, selectStyle, labelStyle } from "./ui";

/** L'étape a-t-elle un corrigé à montrer ? */
export function aUnCorrige(step) {
  const c = step?.config || {};
  switch (step?.sandbox_kind) {
    case "persona": return true;
    case "sheet": return true;
    case "inbox": return (c.inbox?.items || []).length > 0;
    case "board": return (c.board?.cards || []).length > 0;
    case "crm": return true;
    default: return false;
  }
}

export default function Corrige({ step, setConfig, stepId, toast }) {
  const { t } = useI18n();
  const c = step.config || {};
  // Replié : ce n'est pas une seconde grille, on l'ouvre pour le relire.
  const [ouvert, setOuvert] = useState(false);

  return (
    <section className="card" style={{ padding: "0.9rem 1.2rem" }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit", color: "var(--foreground)", textAlign: "left" }}
      >
        <ChevronDown size={16} style={{ marginTop: 2, transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--muted-foreground)", flexShrink: 0 }} />
        <span>
          <span style={{ display: "block", fontSize: "13.5px", fontWeight: 800 }}>{t("dashboard.experienceEditor.corrige.title")}</span>
          <span style={{ display: "block", fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: 1.55, marginTop: 2 }}>
            {t("dashboard.experienceEditor.corrige.help")}
          </span>
        </span>
      </button>
      {ouvert && (<div style={{ marginTop: "0.5rem" }}>

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

      {step.sandbox_kind === "sheet" && (
        <SectionRecit
          titre={t("dashboard.experienceEditor.sheet.analysisNotes")}
          aide={t("dashboard.experienceEditor.sheet.analysisHelp")}
          valeur={c.sheet?.analysis_notes || ""}
          stepId={stepId}
          toast={toast}
          onChange={(v) => setConfig({ sheet: { ...(c.sheet || {}), analysis_notes: v } })}
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

      {step.sandbox_kind === "board" && (
        <TriAttendu
          elements={(c.board?.cards || []).map((k) => ({ id: k.id, titre: k.title || k.id }))}
          notes={c.board?.triage_notes || []}
          cle="card"
          choix={{ champ: "column", options: (c.board?.columns || []).filter(Boolean).map((col) => [col, col]) }}
          onChange={(triage_notes) => setConfig({ board: { ...(c.board || {}), triage_notes } })}
        />
      )}

      {step.sandbox_kind === "crm" && (
        <CorrigeCrm crm={c.crm} onChange={(crm) => setConfig({ crm })} />
      )}
      </div>)}
    </section>
  );
}

// ─── Tri attendu (boîte de réception, tableau de cartes) ─────────────────────
// Une ligne par message ou par carte : ce qu'un bon professionnel en ferait,
// pourquoi, et si c'est un piège.
function TriAttendu({ elements, notes, cle, choix, onChange }) {
  const { t } = useI18n();
  const noteDe = (id) => notes.find((n) => n[cle] === id) || { [cle]: id, [choix.champ]: null, trap: false, why: "" };
  const setNote = (id, patch) => {
    const existe = notes.some((n) => n[cle] === id);
    onChange(existe ? notes.map((n) => (n[cle] === id ? { ...n, ...patch } : n)) : [...notes, { ...noteDe(id), ...patch }]);
  };

  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.7rem" }}>
      <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 6 }}>
        {t("dashboard.experienceEditor.corrige.triage")}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {elements.map((el) => {
          const note = noteDe(el.id);
          return (
            <div key={el.id} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${note.trap ? "#f97316" : "var(--border)"}`, borderRadius: 8, padding: "0.55rem 0.7rem" }}>
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
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#92400e" }}>
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

// ─── CRM : valeurs attendues et piège ────────────────────────────────────────
// La correction des champs factuels est déterministe : une valeur attendue
// fausse pénalise injustement tous les candidats. C'est ce qu'il y a de plus
// important à relire sur ce type d'étape.
function CorrigeCrm({ crm, onChange }) {
  const { t } = useI18n();
  const c = crm || { fields: [], traps: [] };
  const fields = c.fields || [];
  const traps = c.traps || [];
  const set = (patch) => onChange({ ...c, ...patch });
  const setExpected = (i, patch) => set({ fields: fields.map((f, j) => (j === i ? { ...f, expected: { ...(f.expected || {}), ...patch } } : f)) });
  const setTrap = (i, patch) => set({ traps: traps.map((tr, j) => (j === i ? { ...tr, ...patch } : tr)) });
  const factualKeys = fields.filter((f) => f.nature === "factual").map((f) => f.key);

  // Un attendu introuvable dans les sources est incorrigible pour le candidat.
  // Signalé sans bloquer : le repérage textuel est approximatif (une date
  // reformatée, un montant écrit en toutes lettres). Comparaison aussi sans les
  // espaces : « 18000 » s'écrit « 18 000 € » dans la source.
  const sourcesText = crmToutesSources(c).map((s) => `${s.body || ""} ${s.subject || ""} ${s.from || ""} ${s.title || ""}`).join(" ").toLowerCase();
  const sourcesTight = sourcesText.replace(/[\s ]/g, "");
  const introuvable = (f) => {
    const value = String(f.expected?.value ?? "").trim().toLowerCase();
    if (!value) return false;
    const candidats = [value, ...(f.expected?.accept || []).map((a) => String(a).toLowerCase())];
    return !candidats.some((x) => x && (sourcesText.includes(x) || sourcesTight.includes(x.replace(/[\s ]/g, ""))));
  };

  return (
    <>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.7rem" }}>
        <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)", marginBottom: 6 }}>
          {t("dashboard.experienceEditor.corrige.crmExpected")}
        </div>
        {!fields.some((f) => f.nature === "factual") && (
          <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", fontStyle: "italic", margin: 0 }}>—</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fields.map((f, i) => f.nature !== "factual" ? null : (
            <div key={f.key || i} style={{ border: "1px solid #bae6fd", background: "#f0f9ff", borderRadius: 8, padding: "0.55rem 0.7rem" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: 5, color: "#0c4a6e" }}>{f.label || f.key}</div>
              {introuvable(f) && (
                <div style={{ fontSize: "11.5px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 5, padding: "5px 8px", marginBottom: 6, lineHeight: 1.45 }}>
                  {t("dashboard.experienceEditor.crm.expectedMissing")}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input value={f.expected?.value ?? ""} onChange={(e) => setExpected(i, { value: e.target.value })}
                  placeholder={t("dashboard.experienceEditor.crm.exactAnswer")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px", background: "#fff" }} />
                <input value={(f.expected?.accept || []).join(", ")} onChange={(e) => setExpected(i, { accept: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                  placeholder={t("dashboard.experienceEditor.crm.acceptedVariants")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px", background: "#fff" }} />
                {f.type === "number" && (
                  <input type="number" value={f.expected?.tolerance ?? 0} onChange={(e) => setExpected(i, { tolerance: Number(e.target.value) || 0 })}
                    placeholder={t("dashboard.experienceEditor.crm.tolerance")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 110px", background: "#fff" }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.7rem", marginTop: "0.7rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.corrige.crmTraps")}</span>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: 4 }}
            onClick={() => set({ traps: [...traps, { id: `trap_${traps.length + 1}`, kind: "contradiction", fields: [], description: "", resolution: "", expected_signal: "" }] })}>
            <Plus size={13} /> {t("dashboard.experienceEditor.addTrap")}
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {traps.map((trap, i) => (
            <div key={i} style={{ border: "1px solid #fed7aa", background: "#fffbeb", borderRadius: 8, padding: "0.65rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <select value={(trap.fields || [])[0] || ""} onChange={(e) => setTrap(i, { fields: e.target.value ? [e.target.value] : [] })}
                  style={{ ...selectStyle, marginBottom: 0, flex: "1 1 auto" }}>
                  <option value="">{t("dashboard.experienceEditor.crm.trapFieldPlaceholder")}</option>
                  {factualKeys.map((k) => <option key={k} value={k}>{fields.find((f) => f.key === k)?.label || k}</option>)}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => set({ traps: traps.filter((_, j) => j !== i) })}
                  style={{ padding: 4, color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>
              <label style={{ ...labelStyle, marginTop: 0 }}>{t("dashboard.experienceEditor.crm.trapSourcesPlaceholder")}</label>
              <AutoTextarea value={trap.description || ""} onChange={(e) => setTrap(i, { description: e.target.value })} rows={2}
                style={{ ...inputStyle, marginBottom: 6, fontSize: "13px", lineHeight: 1.5, background: "#fff" }} />
              <label style={labelStyle}>{t("dashboard.experienceEditor.crm.trapResolutionPlaceholder")}</label>
              <AutoTextarea value={trap.resolution || ""} onChange={(e) => setTrap(i, { resolution: e.target.value })} rows={1}
                style={{ ...inputStyle, marginBottom: 6, fontSize: "13px", lineHeight: 1.5, background: "#fff" }} />
              <label style={labelStyle}>{t("dashboard.experienceEditor.crm.trapBehaviourPlaceholder")}</label>
              <AutoTextarea value={trap.expected_signal || ""} onChange={(e) => setTrap(i, { expected_signal: e.target.value })} rows={1}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "13px", lineHeight: 1.5, background: "#fff" }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
