"use client";

import { useState } from "react";
import { Mail, Phone, MessageSquare, FileText, Contact, ChevronDown } from "lucide-react";
import { field, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Sandbox "crm" — un vrai outil de travail, pas un formulaire de test.
// À gauche les SOURCES du brief (email, retranscription d'appel, message) que le
// candidat garde sous les yeux ; à droite la FICHE à structurer. Les deux
// colonnes scrollent indépendamment : c'est ce qui rend le croisement des
// sources possible — et donc le piège d'incohérence honnête.
//
// Le candidat ne voit aucune différence entre un champ factuel (corrigé
// automatiquement) et un champ de jugement (noté par les critères BARS) : la
// sanitisation serveur retire `nature` et `expected` avant l'envoi.

const SOURCE_ICONS = {
  email: Mail,
  call_transcript: Phone,
  chat: MessageSquare,
  message: MessageSquare,
  note: FileText,
};

// Les libellés ne peuvent plus être une constante de module : ils dépendent de
// la langue de l'offre, connue seulement au rendu. On garde la table de
// correspondance (plusieurs kinds pointent vers le même libellé) et on résout
// le texte à l'appel.
const SOURCE_LABEL_KEYS = {
  email: "email",
  call_transcript: "call",
  chat: "message",
  message: "message",
  note: "note",
};

const sourceLabel = (t, kind) =>
  t(`candidate.crm.sourceKinds.${SOURCE_LABEL_KEYS[kind] || "note"}`);

function SourceBody({ source, t }) {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--foreground)" }}>
      {(source.from || source.subject || source.received_at) && (
        <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          {source.from && <div style={{ fontSize: 12.5 }}><span style={{ color: "var(--muted-foreground)" }}>{t("candidate.crm.from")} </span>{source.from}</div>}
          {source.subject && <div style={{ fontSize: 12.5, fontWeight: 600 }}>{source.subject}</div>}
          {source.received_at && <div style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>{source.received_at}</div>}
        </div>
      )}
      <div style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{source.body}</div>
    </div>
  );
}

function FieldInput({ f, value, onChange, primary }) {
  const common = {
    className: "nodal-input",
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
  };

  if (f.type === "textarea") {
    return <textarea {...common} rows={3} placeholder={f.placeholder || ""} style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14, minHeight: 74, maxHeight: 200, resize: "vertical" }} />;
  }

  if (f.type === "select") {
    return (
      <select {...common} className="nodal-input crm-select" style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14, cursor: "pointer", appearance: "none", WebkitAppearance: "none" }}>
        <option value="">—</option>
        {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (f.type === "number") {
    return (
      <div style={{ position: "relative" }}>
        <input {...common} inputMode="decimal" placeholder={f.placeholder || ""}
          style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14, paddingRight: f.unit ? 38 : undefined }} />
        {f.unit && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--muted-foreground)", pointerEvents: "none" }}>{f.unit}</span>}
      </div>
    );
  }

  return <input {...common} type={f.type === "date" ? "date" : "text"} placeholder={f.placeholder || ""}
    style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14 }} />;
}

export default function CrmSandbox({ crm, value, onChange, primary = DEFAULT_PRIMARY, compact = false }) {
  const t = useT();
  const sources = crm?.sources || [];
  const fields = crm?.fields || [];
  const [tab, setTab] = useState(0);
  const [sourcesOpen, setSourcesOpen] = useState(true);

  const answer = { fields: value?.fields || {}, notes: value?.notes || "" };
  const setField = (key, v) => onChange({ ...answer, fields: { ...answer.fields, [key]: v } });
  const active = sources[Math.min(tab, Math.max(sources.length - 1, 0))];

  const sourcesPanel = (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
      {sources.length > 1 && (
        <div style={{ display: "flex", gap: 4, padding: "8px 10px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
          {sources.map((s, i) => {
            const Icon = SOURCE_ICONS[s.type] || FileText;
            const on = i === Math.min(tab, sources.length - 1);
            return (
              <button key={s.id || i} onClick={() => setTab(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", fontSize: 12.5,
                  fontWeight: on ? 700 : 500, fontFamily: "inherit", cursor: "pointer",
                  color: on ? primary : "var(--muted-foreground)", background: "transparent",
                  border: "none", borderBottom: `2px solid ${on ? primary : "transparent"}`, marginBottom: -1,
                }}>
                <Icon size={14} /> {s.title || sourceLabel(t, s.type)}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ padding: "14px 16px", overflowY: "auto", flex: 1, maxHeight: compact ? 260 : 520 }}>
        {active ? <SourceBody source={active} t={t} /> : <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("candidate.crm.noSources")}</p>}
      </div>
    </div>
  );

  const form = (
    <div style={{ padding: "14px 16px", overflowY: "auto", maxHeight: compact ? undefined : 520 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.02em", color: "var(--muted-foreground)", marginBottom: 5 }}>
              {f.label || f.key}
            </label>
            <FieldInput f={f} value={answer.fields[f.key]} onChange={(v) => setField(f.key, v)} primary={primary} />
            {f.hint && <p style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginTop: 4 }}>{f.hint}</p>}
          </div>
        ))}

        {crm?.notes_field !== false && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.02em", color: "var(--muted-foreground)", marginBottom: 5 }}>
              {t("candidate.crm.internalNotes")}
            </label>
            <textarea
              className="nodal-input"
              value={answer.notes}
              onChange={(e) => onChange({ ...answer, notes: e.target.value })}
              rows={3}
              placeholder={t("candidate.crm.notesPlaceholder")}
              style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14, minHeight: 74, maxHeight: 200, resize: "vertical" }}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
      <style>{`
        .crm-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px !important; }
        .crm-split { display: grid; grid-template-columns: 1fr; }
        .crm-split > :first-child { border-bottom: 1px solid var(--border); }
        @media (min-width: 860px) {
          .crm-split { grid-template-columns: 1.05fr 1fr; }
          .crm-split > :first-child { border-bottom: none; border-right: 1px solid var(--border); }
        }
      `}</style>

      <div style={{ background: "#fafafa", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Contact size={16} style={{ color: primary }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{crm?.record_title || t("candidate.crm.cardTitle")}</span>
      </div>

      {compact ? (
        // Assistant IA affiché à côté : trois colonnes seraient illisibles, les
        // sources passent en bandeau repliable au-dessus de la fiche.
        <>
          <div style={{ borderBottom: "1px solid var(--border)" }}>
            <button onClick={() => setSourcesOpen((o) => !o)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 700, color: "var(--foreground)" }}>
              <ChevronDown size={15} style={{ transform: sourcesOpen ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--muted-foreground)" }} />
              Sources ({sources.length})
            </button>
            {sourcesOpen && sourcesPanel}
          </div>
          {form}
        </>
      ) : (
        <div className="crm-split">
          {sourcesPanel}
          {form}
        </div>
      )}
    </div>
  );
}
