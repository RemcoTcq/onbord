"use client";

// Éditeurs du CONTENU d'une étape, un par type de mise en situation (scène
// écrite, CRM, tableur, boîte de réception, personnage, tableau de cartes,
// exercice de code). Sortis de la page de relecture de la simulation pour être
// rangés dans l'onglet « Scénario » de la page d'une étape. Chacun reçoit la
// donnée de son type et un onChange : aucun n'écrit en base lui-même.

import { useState } from "react";
import { Plus, Trash2, X, ChevronDown } from "lucide-react";
import { crmEstEspace, CRM_MISSIONS, CRM_ACTIVITY_TYPES } from "@/lib/crmScoring";
import { lireNombre } from "@/lib/tableur";
import { CANAUX } from "@/lib/boiteReception";
import { MODES_PERSONA, DEFAUT_TOURS, MAX_TOURS } from "@/lib/persona";
import { MODES as MODES_TABLEAU } from "@/lib/tableauCartes";
import { CODE_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants/codeLanguages";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { inputStyle, selectStyle, labelStyle } from "./ui";

// `chat` est la valeur stockée, `message` la clé de traduction : les deux
// diffèrent historiquement, on ne renomme pas la donnée pour autant.
const CRM_SOURCE_TYPE_VALUES = [
  { value: "email", key: "email" },
  { value: "call_transcript", key: "call_transcript" },
  { value: "chat", key: "message" },
  { value: "note", key: "note" },
];
const crmSourceTypes = (t) =>
  CRM_SOURCE_TYPE_VALUES.map(({ value, key }) => ({
    value,
    label: t(`dashboard.experienceEditor.crm.sourceTypes.${key}`),
  }));

const CRM_FIELD_TYPES = ["text", "number", "select", "textarea", "date"];

// Éditeur de l'exercice de code. Même enjeu que l'éditeur CRM, en plus sévère :
// la correction est faite par EXÉCUTION, donc une sortie attendue fausse fait
// échouer tout le monde, y compris les meilleurs candidats — et ça ne se voit
// qu'une fois l'expérience en ligne. C'est la partie à relire avant publication.
export function CodeExerciseEditor({ code, onChange }) {
  const { t } = useI18n();
  const c = code || { language: DEFAULT_LANGUAGE, starter_code: "", tests: [] };
  const tests = c.tests || [];
  const set = (patch) => onChange({ ...c, ...patch });
  const setTest = (i, patch) => set({ tests: tests.map((tst, j) => (j === i ? { ...tst, ...patch } : tst)) });

  const visibles = tests.filter((tst) => !tst.hidden).length;
  const caches = tests.length - visibles;

  const mono = { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12.5px" };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.code.language")}</label>
      <select value={c.language || DEFAULT_LANGUAGE} onChange={(e) => set({ language: e.target.value })} style={inputStyle}>
        {Object.entries(CODE_LANGUAGES).map(([cle, l]) => <option key={cle} value={cle}>{l.label}</option>)}
      </select>

      <label style={{ ...labelStyle, margin: "0.75rem 0 0.5rem" }}>{t("dashboard.experienceEditor.code.starter")}</label>
      <AutoTextarea
        value={c.starter_code || ""}
        onChange={(e) => set({ starter_code: e.target.value })}
        rows={6}
        placeholder={t("dashboard.experienceEditor.code.starterPlaceholder")}
        style={{ ...inputStyle, ...mono, resize: "vertical" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.code.tests")}</label>
        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {t("dashboard.experienceEditor.code.testCount", { visible: visibles, hidden: caches })}
        </span>
      </div>

      {/* Les deux façons de rendre l'exercice inexploitable, signalées sans bloquer. */}
      {!visibles && (
        <p style={{ fontSize: "11.5px", color: "#b45309", marginBottom: "0.5rem" }}>
          {t("dashboard.experienceEditor.code.warnNoVisible")}
        </p>
      )}
      {!caches && (
        <p style={{ fontSize: "11.5px", color: "#b45309", marginBottom: "0.5rem" }}>
          {t("dashboard.experienceEditor.code.warnNoHidden")}
        </p>
      )}

      {tests.map((tst, i) => (
        <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              value={tst.name || ""}
              onChange={(e) => setTest(i, { name: e.target.value })}
              placeholder={t("dashboard.experienceEditor.code.testNamePlaceholder")}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>
              <input type="checkbox" checked={!!tst.hidden} onChange={(e) => setTest(i, { hidden: e.target.checked })} />
              {t("dashboard.experienceEditor.code.hidden")}
            </label>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => set({ tests: tests.filter((_, j) => j !== i) })}
              style={{ padding: "4px", color: "#dc2626" }}
            ><Trash2 size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.code.stdin")}</label>
              <AutoTextarea value={tst.stdin || ""} onChange={(e) => setTest(i, { stdin: e.target.value })} rows={3}
                style={{ ...inputStyle, ...mono, marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.code.expected")}</label>
              <AutoTextarea value={tst.expected_output || ""} onChange={(e) => setTest(i, { expected_output: e.target.value })} rows={3}
                style={{ ...inputStyle, ...mono, marginBottom: 0 }} />
            </div>
          </div>
        </div>
      ))}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => set({ tests: [...tests, { name: "", stdin: "", expected_output: "", hidden: false }] })}
        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
      >
        <Plus size={13} /> {t("dashboard.experienceEditor.code.addTest")}
      </button>

      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
        {t("dashboard.experienceEditor.code.help")}
      </p>
    </div>
  );
}

// La scène d'une mise en situation écrite : le message de l'interlocuteur, la
// fiche du destinataire d'un e-mail, le contexte d'un document. Générée, montrée
// au candidat, lue par le correcteur — et jusqu'ici invisible ici même : le
// recruteur publiait une scène qu'il n'avait jamais lue. Elle compte d'autant
// plus quand elle est jouée dans une autre langue que le parcours.
// [clé de config, nombre de lignes] — une seule ligne : champ simple.
export const CHAMPS_SCENE = {
  client_reply: [["client_message", 4]],
  email: [["to", 1], ["subject", 1], ["context", 4]],
  document: [["document_context", 4]],
};

export function SceneEditor({ kind, config, onChange }) {
  const { t } = useI18n();
  return (
    <div style={{ marginTop: "0.75rem" }}>
      {CHAMPS_SCENE[kind].map(([cle, lignes]) => (
        <div key={cle}>
          <label style={labelStyle}>{t(`dashboard.experienceEditor.scene.${cle}`)}</label>
          {lignes > 1 ? (
            <AutoTextarea
              value={config?.[cle] || ""}
              onChange={(e) => onChange({ [cle]: e.target.value })}
              rows={lignes}
              style={{ ...inputStyle, lineHeight: 1.5 }}
            />
          ) : (
            <input value={config?.[cle] || ""} onChange={(e) => onChange({ [cle]: e.target.value })} style={inputStyle} />
          )}
        </div>
      ))}
    </div>
  );
}

// Éditeur du sandbox "crm" : ce que le candidat trouve (pipeline, fiches,
// historique) et la fiche qu'il remplit. Les valeurs attendues des champs
// factuels et le piège sont dans « Le corrigé » (Corrige.js, onglet Scoring).
export function CrmEditor({ crm, onChange }) {
  const { t } = useI18n();
  const c = crm || { sources: [], fields: [], traps: [], notes_field: true };
  const sources = c.sources || [];
  const fields = c.fields || [];
  const set = (patch) => onChange({ ...c, ...patch });

  const setSource = (i, patch) => set({ sources: sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setField = (i, patch) => set({ fields: fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  // En v2, les « sources » sont l'historique et les propriétés de chaque fiche.
  const espace = crmEstEspace(c);

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.crm.recordTitle")}</label>
      <input value={c.record_title || ""} onChange={(e) => set({ record_title: e.target.value })}
        placeholder={t("dashboard.experienceEditor.crm.recordTitlePlaceholder")} style={inputStyle} />

      {/* CRM v2 : le pipeline. Sinon (expériences publiées avant), les sources du brief. */}
      {espace && <PipelineEditor crm={c} set={set} />}
      {!espace && (<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>Sources du brief ({sources.length})</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ sources: [...sources, { id: `s${sources.length + 1}`, type: "email", body: "" }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.addSource")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sources.map((s, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <select value={s.type || "email"} onChange={(e) => setSource(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 200px" }}>
                {crmSourceTypes(t).map((src) => <option key={src.value} value={src.value}>{src.label}</option>)}
              </select>
              <input value={s.title || ""} onChange={(e) => setSource(i, { title: e.target.value })}
                placeholder={t("dashboard.experienceEditor.crm.tabLabelPlaceholder")} style={{ ...inputStyle, marginBottom: 0 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => set({ sources: sources.filter((_, j) => j !== i) })}
                style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
            </div>
            {s.type === "email" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <input value={s.from || ""} onChange={(e) => setSource(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceFrom")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={s.subject || ""} onChange={(e) => setSource(i, { subject: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceSubject")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={s.received_at || ""} onChange={(e) => setSource(i, { received_at: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceReceived")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 140px" }} />
              </div>
            )}
            <AutoTextarea value={s.body || ""} onChange={(e) => setSource(i, { body: e.target.value })} rows={6}
              placeholder={t("dashboard.experienceEditor.crm.sourceBodyPlaceholder")}
              style={{ ...inputStyle, marginBottom: 0, lineHeight: 1.5, fontSize: "13px" }} />
          </div>
        ))}
      </div>
      </>)}

      {/* Champs de la fiche */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>Champs de la fiche ({fields.length})</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ fields: [...fields, { key: `champ_${fields.length + 1}`, label: "", type: "text", nature: "judgment" }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.addField")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {fields.map((f, i) => {
          const isFactual = f.nature === "factual";
          return (
            <div key={i} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${isFactual ? "#0ea5e9" : "#a855f7"}`, borderRadius: "8px", padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <input value={f.label || ""} onChange={(e) => setField(i, { label: e.target.value })} placeholder={t("dashboard.experienceEditor.fieldLabel")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px", fontWeight: 600 }} />
                <input value={f.key || ""} onChange={(e) => setField(i, { key: e.target.value })} placeholder={t("dashboard.experienceEditor.fieldKey")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 130px", fontFamily: "monospace", fontSize: "12px" }} />
                <select value={f.type || "text"} onChange={(e) => setField(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 120px" }}>
                  {CRM_FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                </select>
                <select value={f.nature || "judgment"} onChange={(e) => setField(i, { nature: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px" }}>
                  <option value="factual">{t("dashboard.experienceEditor.crm.natureFactual")}</option>
                  <option value="judgment">{t("dashboard.experienceEditor.crm.natureJudgment")}</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => set({ fields: fields.filter((_, j) => j !== i) })}
                  style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>

              {f.type === "select" && (
                <input value={(f.options || []).join(", ")} onChange={(e) => setField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  placeholder={t("dashboard.experienceEditor.crm.optionsPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px" }} />
              )}
              {f.type === "number" && (
                <input value={f.unit || ""} onChange={(e) => setField(i, { unit: e.target.value })}
                  placeholder={t("dashboard.experienceEditor.crm.unitPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px", maxWidth: 160 }} />
              )}

            </div>
          );
        })}
      </div>

      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>
        {tNodes(t("dashboard.experienceEditor.crm.fieldsHelp"), {
          factual: <strong>{t("dashboard.experienceEditor.crm.fieldsHelpFactual")}</strong>,
          judgment: <strong>{t("dashboard.experienceEditor.crm.fieldsHelpJudgment")}</strong>,
        })}
      </p>
    </div>
  );
}

// ─── Éditeur du tableur ──────────────────────────────────────────────────────
// Le jeu de données s'édite comme on le colle depuis un tableur : une ligne par
// ligne, colonnes séparées par des tabulations (ou des points-virgules), en-têtes
// en première ligne. Ce qui compte le plus à relire n'est pas une cellule, c'est
// la note d'analyse : si le constat qu'elle décrit n'est pas dans les chiffres,
// la grille notera les candidats sur une illusion.
function donneesVersTexte(o) {
  return [o?.columns || [], ...(o?.rows || [])].map((l) => (l || []).map((v) => (v ?? "")).join("\t")).join("\n");
}

function texteVersDonnees(texte) {
  const lignes = String(texte || "").replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lignes.length) return { columns: [], rows: [] };
  const sep = lignes[0].includes("\t") ? "\t" : ";";
  const [entete, ...corps] = lignes.map((l) => l.split(sep).map((c) => c.trim()));
  return {
    columns: entete,
    rows: corps.map((l) => entete.map((_, i) => {
      const v = l[i] ?? "";
      const n = lireNombre(v);
      // Un code (« 0042 ») reste du texte, comme à la génération.
      return n !== null && !/^0\d/.test(v) ? n : v;
    })),
  };
}

function OngletEditor({ onglet, onChange, onRemove }) {
  const { t } = useI18n();
  const [brouillon, setBrouillon] = useState(donneesVersTexte(onglet));
  const inegales = (onglet?.rows || []).some((r) => (r || []).length !== (onglet?.columns || []).length);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input value={onglet?.name || ""} onChange={(e) => onChange({ ...onglet, name: e.target.value })}
          placeholder={t("dashboard.experienceEditor.sheet.tabName")} style={{ ...inputStyle, marginBottom: 0, fontWeight: 600 }} />
        {onRemove && (
          <button className="btn btn-ghost btn-sm" onClick={onRemove} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
        )}
      </div>
      <AutoTextarea
        value={brouillon}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={() => onChange({ ...onglet, ...texteVersDonnees(brouillon) })}
        rows={8}
        style={{ ...inputStyle, marginBottom: 0, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre", overflowX: "auto" }}
      />
      <p style={{ fontSize: "11px", color: inegales ? "#b45309" : "var(--muted-foreground)", marginTop: 4 }}>
        {inegales
          ? t("dashboard.experienceEditor.sheet.unevenRows")
          : t("dashboard.experienceEditor.sheet.dataSize", { rows: (onglet?.rows || []).length, cols: (onglet?.columns || []).length })}
      </p>
    </div>
  );
}

export function SheetEditor({ sheet, onChange }) {
  const { t } = useI18n();
  const s = sheet || { file_name: "", deliverable_label: "", sheets: [{ name: "Feuille1", columns: [], rows: [] }], analysis_notes: "" };
  const onglets = s.sheets || [];
  const set = (patch) => onChange({ ...s, ...patch });

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.sheet.fileName")}</label>
          <input value={s.file_name || ""} onChange={(e) => set({ file_name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "2 1 260px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.sheet.deliverableLabel")}</label>
          <input value={s.deliverable_label || ""} onChange={(e) => set({ deliverable_label: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.sheet.data")}</label>
        {onglets.length < 3 && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
            onClick={() => set({ sheets: [...onglets, { name: `Feuille${onglets.length + 1}`, columns: [], rows: [] }] })}>
            <Plus size={13} /> {t("dashboard.experienceEditor.sheet.addTab")}
          </button>
        )}
      </div>
      <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.sheet.dataHelp")}</p>
      {onglets.map((o, i) => (
        <OngletEditor
          key={`${i}-${onglets.length}`}
          onglet={o}
          onChange={(neuf) => set({ sheets: onglets.map((x, j) => (j === i ? neuf : x)) })}
          onRemove={onglets.length > 1 ? () => set({ sheets: onglets.filter((_, j) => j !== i) }) : null}
        />
      ))}

    </div>
  );
}

// ─── Éditeur de la boîte de réception ────────────────────────────────────────
// Les messages tels que le candidat les reçoit. Le tri attendu de chacun (la
// lecture du correcteur) est dans « Le corrigé », onglet Scoring.
export function InboxEditor({ inbox, onChange }) {
  const { t } = useI18n();
  const b = inbox || { owner: "", now: "", items: [], triage_notes: [] };
  const items = b.items || [];
  const notes = b.triage_notes || [];
  const set = (patch) => onChange({ ...b, ...patch });
  const setItem = (i, patch) => set({ items: items.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const ajouter = () => {
    const max = items.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0);
    set({ items: [...items, { id: `m${max + 1}`, channel: "email", from: "", from_role: "", subject: "", received_at: "", body: "" }] });
  };
  const retirer = (i) => {
    const id = items[i]?.id;
    set({ items: items.filter((_, j) => j !== i), triage_notes: notes.filter((n) => n.item !== id) });
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 240px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.owner")}</label>
          <input value={b.owner || ""} onChange={(e) => set({ owner: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.now")}</label>
          <input value={b.now || ""} onChange={(e) => set({ now: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.inbox.messages", { count: items.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={ajouter}>
          <Plus size={13} /> {t("dashboard.experienceEditor.inbox.addMessage")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((m, i) => {
          return (
            <div key={m.id || i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", fontFamily: "monospace" }}>{m.id}</span>
                <select value={m.channel || "email"} onChange={(e) => setItem(i, { channel: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px" }}>
                  {CANAUX.map((c) => <option key={c} value={c}>{t(`dashboard.experienceEditor.inbox.channels.${c}`)}</option>)}
                </select>
                <input value={m.from || ""} onChange={(e) => setItem(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.from")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px" }} />
                <input value={m.from_role || ""} onChange={(e) => setItem(i, { from_role: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.fromRole")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px" }} />
                <button className="btn btn-ghost btn-sm" onClick={() => retirer(i)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input value={m.subject || ""} onChange={(e) => setItem(i, { subject: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.subject")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={m.received_at || ""} onChange={(e) => setItem(i, { received_at: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.receivedAt")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 140px" }} />
              </div>
              <AutoTextarea value={m.body || ""} onChange={(e) => setItem(i, { body: e.target.value })} rows={3}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "13px", lineHeight: 1.5 }} />
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.inbox.help")}</p>
    </div>
  );
}

// ─── CRM v2 : le pipeline ────────────────────────────────────────────────────
// Les propriétés libres d'une fiche s'éditent en « Clé : valeur », une par
// ligne — la forme la plus rapide à relire et à corriger.
function proprietesVersTexte(p) {
  return Object.entries(p || {}).map(([k, v]) => `${k} : ${v}`).join("\n");
}
function texteVersProprietes(texte) {
  const out = {};
  for (const l of String(texte || "").split("\n")) {
    const i = l.indexOf(":");
    if (i <= 0) continue;
    const k = l.slice(0, i).trim();
    const v = l.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function FicheCrmEditor({ record, onChange, onRemove }) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);
  const [props, setProps] = useState(proprietesVersTexte(record.properties));
  const timeline = record.timeline || [];
  const set = (patch) => onChange({ ...record, ...patch });
  const setActivite = (i, patch) => set({ timeline: timeline.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOuvert((o) => !o)} style={{ padding: "2px" }}>
          <ChevronDown size={14} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        </button>
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted-foreground)" }}>{record.id}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.name || "—"}</span>
        <span style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>
          {[record.stage, t("dashboard.experienceEditor.crm.activityCount", { count: timeline.length })].filter(Boolean).join(" · ")}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onRemove} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
      </div>
      {ouvert && (
        <div style={{ marginTop: "0.6rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
            {[
              ["name", "recordName"], ["company", "recordCompany"], ["contact", "recordContact"], ["stage", "recordStage"],
              ["amount", "recordAmount"], ["currency", "recordCurrency"], ["close_date", "recordCloseDate"],
              ["owner", "recordOwner"], ["last_activity", "recordLastActivity"],
            ].map(([cle, libelle]) => (
              <input key={cle} value={record[cle] ?? ""} placeholder={t(`dashboard.experienceEditor.crm.${libelle}`)}
                onChange={(e) => set({ [cle]: cle === "amount" ? (lireNombre(e.target.value) ?? e.target.value) : e.target.value })}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "13px" }} />
            ))}
          </div>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.properties")}</label>
          <AutoTextarea value={props} onChange={(e) => setProps(e.target.value)} onBlur={() => set({ properties: texteVersProprietes(props) })}
            rows={2} placeholder={t("dashboard.experienceEditor.crm.propertiesPlaceholder")} style={{ ...inputStyle, fontSize: "13px", lineHeight: 1.5 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.6rem 0 0.4rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.crm.timeline")}</label>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => set({ timeline: [...timeline, { id: `${record.id}_a${timeline.length + 1}`, type: "note", date: "", body: "" }] })}>
              <Plus size={13} /> {t("dashboard.experienceEditor.crm.addActivity")}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {timeline.map((a, i) => (
              <div key={a.id || i} style={{ border: "1px dashed var(--border)", borderRadius: 6, padding: "0.5rem" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted-foreground)", alignSelf: "center" }}>{a.id}</span>
                  <select value={a.type || "note"} onChange={(e) => setActivite(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 180px", fontSize: "12.5px" }}>
                    {CRM_ACTIVITY_TYPES.map((ty) => <option key={ty} value={ty}>{t(`dashboard.experienceEditor.crm.activityTypes.${ty}`)}</option>)}
                  </select>
                  <input value={a.from || ""} onChange={(e) => setActivite(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceFrom")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px", fontSize: "12.5px" }} />
                  <input value={a.subject || a.title || ""} onChange={(e) => setActivite(i, a.type === "email" ? { subject: e.target.value } : { title: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceSubject")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px", fontSize: "12.5px" }} />
                  <input value={a.date || ""} onChange={(e) => setActivite(i, { date: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceReceived")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 120px", fontSize: "12.5px" }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => set({ timeline: timeline.filter((_, j) => j !== i) })} style={{ padding: "4px", color: "#dc2626" }}><X size={13} /></button>
                </div>
                <AutoTextarea value={a.body || ""} onChange={(e) => setActivite(i, { body: e.target.value })} rows={3}
                  style={{ ...inputStyle, marginBottom: 0, fontSize: "12.5px", lineHeight: 1.5 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineEditor({ crm, set }) {
  const { t } = useI18n();
  const records = crm.records || [];
  const setRecord = (i, r) => set({ records: records.map((x, j) => (j === i ? r : x)) });
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "0.75rem" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.mission")}</label>
          <select value={crm.mission || "update"} onChange={(e) => set({ mission: e.target.value, ...(e.target.value === "pipeline_review" ? { focus_record: null } : {}) })} style={selectStyle}>
            {CRM_MISSIONS.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.crm.missions.${m}`)}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.pipelineName")}</label>
          <input value={crm.pipeline_name || ""} onChange={(e) => set({ pipeline_name: e.target.value })} style={inputStyle} />
        </div>
        {crm.mission !== "pipeline_review" && (
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>{t("dashboard.experienceEditor.crm.focusRecord")}</label>
            <select value={crm.focus_record || ""} onChange={(e) => set({ focus_record: e.target.value || null })} style={selectStyle}>
              <option value="">—</option>
              {records.map((r) => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
            </select>
          </div>
        )}
      </div>
      <label style={labelStyle}>{t("dashboard.experienceEditor.crm.stages")}</label>
      <input value={(crm.stages || []).join(", ")} onChange={(e) => set({ stages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={inputStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.crm.records", { count: records.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ records: [...records, { id: `r${records.length + 1}`, name: "", stage: (crm.stages || [])[0] || "", properties: {}, timeline: [] }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.crm.addRecord")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {records.map((r, i) => (
          <FicheCrmEditor key={r.id || i} record={r} onChange={(neuf) => setRecord(i, neuf)}
            onRemove={() => set({ records: records.filter((_, j) => j !== i), ...(crm.focus_record === r.id ? { focus_record: null } : {}) })} />
        ))}
      </div>
    </>
  );
}

// ─── Personnage : les réglages techniques ─────────────────────────────────────
// Canal, langue, accent, genre, voix, nombre d'échanges : rarement à changer,
// donc dans « Réglages avancés ». Le personnage lui-même (qui il est, ce qu'il
// cache, ses objections) se lit et se modifie dans le récit de l'étape.
export function PersonaReglages({ persona, onChange }) {
  const { t } = useI18n();
  const p = persona || {};
  const set = (patch) => onChange({ ...p, ...patch });
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 160px" }}>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.mode")}</label>
        <select value={p.mode || "call"} onChange={(e) => set({ mode: e.target.value })} style={selectStyle}>
          {MODES_PERSONA.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.persona.modes.${m}`)}</option>)}
        </select>
      </div>
      <div style={{ flex: "0 0 90px" }}>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.language")}</label>
        <input value={p.language || ""} onChange={(e) => set({ language: e.target.value })} placeholder="fr" style={inputStyle} />
      </div>
      <div style={{ flex: "0 0 90px" }}>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.accent")}</label>
        <input value={p.accent || ""} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} placeholder="BE" style={inputStyle} />
      </div>
      <div style={{ flex: "0 0 110px" }}>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.gender")}</label>
        <select value={p.gender === "m" ? "m" : "f"} onChange={(e) => set({ gender: e.target.value })} style={selectStyle}>
          <option value="f">{t("dashboard.experienceEditor.persona.genders.f")}</option>
          <option value="m">{t("dashboard.experienceEditor.persona.genders.m")}</option>
        </select>
      </div>
      <div style={{ flex: "0 0 110px" }}>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.maxTurns")}</label>
        <input type="number" min={2} max={MAX_TOURS} value={p.max_turns ?? DEFAUT_TOURS}
          onChange={(e) => set({ max_turns: Math.max(2, Math.min(MAX_TOURS, parseInt(e.target.value, 10) || DEFAUT_TOURS)) })} style={inputStyle} />
      </div>
      {(p.mode || "call") === "call" && (
        <div style={{ flex: "1 1 100%" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.voiceId")}</label>
          <input value={p.voice_id || ""} onChange={(e) => set({ voice_id: e.target.value.trim() })}
            placeholder={t("dashboard.experienceEditor.persona.voiceIdPlaceholder")} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12.5px" }} />
        </div>
      )}
    </div>
  );
}

// ─── Éditeur du tableau de cartes ────────────────────────────────────────────
export function BoardEditor({ board, onChange }) {
  const { t } = useI18n();
  const b = board || { title: "", mode: "backlog", constraint: "", columns: [], cards: [], triage_notes: [] };
  const cards = b.cards || [];
  const notes = b.triage_notes || [];
  const set = (patch) => onChange({ ...b, ...patch });
  const setCard = (i, patch) => set({ cards: cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const ajouter = () => {
    const max = cards.reduce((m, c) => Math.max(m, Number(String(c.id).replace(/\D/g, "")) || 0), 0);
    set({ cards: [...cards, { id: `c${max + 1}`, title: "", body: "", meta: {} }] });
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 220px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.board.title")}</label>
          <input value={b.title || ""} onChange={(e) => set({ title: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.board.mode")}</label>
          <select value={b.mode || "backlog"} onChange={(e) => set({ mode: e.target.value })} style={selectStyle}>
            {MODES_TABLEAU.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.board.modes.${m}`)}</option>)}
          </select>
        </div>
      </div>
      <label style={labelStyle}>{t("dashboard.experienceEditor.board.constraint")}</label>
      <input value={b.constraint || ""} onChange={(e) => set({ constraint: e.target.value })} style={inputStyle} />
      <label style={labelStyle}>{t("dashboard.experienceEditor.board.columns")}</label>
      <input value={(b.columns || []).join(", ")} onChange={(e) => set({ columns: e.target.value.split(",").map((s) => s.trim()) })} style={inputStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.board.cards", { count: cards.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={ajouter}>
          <Plus size={13} /> {t("dashboard.experienceEditor.board.addCard")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cards.map((c, i) => {
          return (
            <div key={c.id || i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", fontFamily: "monospace" }}>{c.id}</span>
                <input value={c.title || ""} onChange={(e) => setCard(i, { title: e.target.value })} placeholder={t("dashboard.experienceEditor.board.cardTitle")} style={{ ...inputStyle, marginBottom: 0, fontWeight: 600 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => set({ cards: cards.filter((_, j) => j !== i), triage_notes: notes.filter((n) => n.card !== c.id) })} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>
              <AutoTextarea value={c.body || ""} onChange={(e) => setCard(i, { body: e.target.value })} rows={2} style={{ ...inputStyle, marginBottom: 6, fontSize: "13px", lineHeight: 1.5 }} />
              <MetaEditor meta={c.meta} onChange={(meta) => setCard(i, { meta })} />
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.board.help")}</p>
    </div>
  );
}

// Les repères d'une carte, en « Clé : valeur » une ligne chacun — même forme
// que les propriétés d'une fiche CRM.
function MetaEditor({ meta, onChange }) {
  const { t } = useI18n();
  const [brouillon, setBrouillon] = useState(proprietesVersTexte(meta));
  return (
    <AutoTextarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} onBlur={() => onChange(texteVersProprietes(brouillon))}
      rows={1} placeholder={t("dashboard.experienceEditor.board.metaPlaceholder")} style={{ ...inputStyle, marginBottom: 0, fontSize: "12.5px", lineHeight: 1.5 }} />
  );
}
