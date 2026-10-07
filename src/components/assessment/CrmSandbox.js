"use client";

import { useState } from "react";
import { Mail, Phone, MessageSquare, FileText, Contact, ChevronDown, CalendarDays, Building2, KanbanSquare } from "lucide-react";
import { field, DEFAULT_PRIMARY, getContrastColor } from "./candidateUi";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { crmEstEspace, TYPES_PROCHAINE_ACTION } from "@/lib/crmScoring";

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
  meeting: CalendarDays,
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
  meeting: "meeting",
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

// ─── CRM v2 : le pipeline et ses fiches ──────────────────────────────────────
// Ce que le candidat a sous les yeux dans un vrai CRM : une liste de deals
// filtrable par étape, et pour chacun ses propriétés et son historique. Rien
// n'y signale l'information décisive — elle est dans les fiches, comme au
// travail. La fiche concernée par la mission (mise à jour, préparation de
// rendez-vous) est ouverte d'office et marquée comme telle ; une revue de
// pipeline n'en désigne aucune.

function montant(r, localeTag) {
  if (r.amount === undefined || r.amount === null || r.amount === "") return "";
  const n = typeof r.amount === "number" ? r.amount : Number(String(r.amount).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return String(r.amount);
  try {
    return `${new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 }).format(n)}${r.currency ? ` ${r.currency}` : ""}`;
  } catch {
    return `${n}${r.currency ? ` ${r.currency}` : ""}`;
  }
}

function Activite({ a, t }) {
  const Icon = SOURCE_ICONS[a.type] || FileText;
  const meta = [a.from && `${t("candidate.crm.from")} ${a.from}`, a.date || a.received_at].filter(Boolean).join(" · ");
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={13} style={{ color: "var(--muted-foreground)" }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>
          {a.subject || a.title || sourceLabel(t, a.type)}
        </div>
        {meta && <div style={{ fontSize: 11.5, color: "var(--muted-foreground)", marginBottom: 4 }}>{sourceLabel(t, a.type)} · {meta}</div>}
        <div style={{ fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{a.body}</div>
      </div>
    </div>
  );
}

function EspaceCrm({ crm, primary, compact }) {
  const { t, localeTag } = useI18n();
  const records = crm.records || [];
  const [ouvert, setOuvert] = useState(crm.focus_record || records[0]?.id);
  const [etape, setEtape] = useState(null);
  const [listeOuverte, setListeOuverte] = useState(true);

  const etapes = [...new Set([...(crm.stages || []), ...records.map((r) => r.stage).filter(Boolean)])];
  const visibles = etape ? records.filter((r) => r.stage === etape) : records;
  const fiche = records.find((r) => r.id === ouvert) || records[0];
  const total = records.reduce((s, r) => s + (typeof r.amount === "number" ? r.amount : 0), 0);
  const devise = records.find((r) => r.currency)?.currency;

  const proprietes = fiche ? [
    [t("candidate.crm.stage"), fiche.stage],
    [t("candidate.crm.amount"), montant(fiche, localeTag)],
    [t("candidate.crm.closeDate"), fiche.close_date],
    [t("candidate.crm.contact"), fiche.contact],
    [t("candidate.crm.owner"), fiche.owner],
    [t("candidate.crm.lastActivity"), fiche.last_activity],
    ...Object.entries(fiche.properties || {}),
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "") : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      {/* Pipeline : résumé, filtres d'étape, liste des fiches */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <button type="button" onClick={() => setListeOuverte((o) => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
          <KanbanSquare size={15} style={{ color: primary }} />
          <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>
            {crm.pipeline_name || t("candidate.crm.pipeline")}
          </span>
          <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
            {t("candidate.crm.recordCount", { count: records.length })}
            {total > 0 ? ` · ${montant({ amount: total, currency: devise }, localeTag)}` : ""}
          </span>
          <ChevronDown size={15} style={{ transform: listeOuverte ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--muted-foreground)" }} />
        </button>
        {listeOuverte && (
          <>
            {etapes.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "0 14px 8px", flexWrap: "wrap" }}>
                {[null, ...etapes].map((e) => {
                  const on = etape === e;
                  const n = e ? records.filter((r) => r.stage === e).length : records.length;
                  return (
                    <button key={e || "_all"} type="button" onClick={() => setEtape(e)}
                      style={{ fontSize: 11.5, fontWeight: on ? 700 : 500, padding: "3px 10px", borderRadius: 99, border: `1px solid ${on ? primary : "var(--border)"}`, background: on ? `${primary}12` : "#ffffff", color: on ? primary : "var(--muted-foreground)", cursor: "pointer", fontFamily: "inherit" }}>
                      {e || t("candidate.crm.allStages")} · {n}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ maxHeight: compact ? 180 : 220, overflowY: "auto", borderTop: "1px solid var(--border)" }}>
              {visibles.map((r) => {
                const on = fiche?.id === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setOuvert(r.id)}
                    style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, width: "100%", textAlign: "left", padding: "8px 14px", border: "none", borderBottom: "1px solid #f1f5f9", borderLeft: `3px solid ${on ? primary : "transparent"}`, background: on ? `${primary}0D` : "#ffffff", cursor: "pointer", fontFamily: "inherit" }}>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.name}
                        {r.id === crm.focus_record && (
                          <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: primary, color: getContrastColor(primary), verticalAlign: "middle" }}>
                            {t("candidate.crm.focus")}
                          </span>
                        )}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[r.company, r.stage, r.last_activity].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", alignSelf: "center" }}>{montant(r, localeTag)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Fiche ouverte : propriétés, puis historique */}
      {fiche && (
        <div style={{ padding: "14px 16px", overflowY: "auto", maxHeight: compact ? 360 : 520 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Building2 size={15} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: 15, fontWeight: 700, overflowWrap: "break-word" }}>{fiche.name}</span>
          </div>
          {fiche.company && fiche.company !== fiche.name && (
            <div style={{ fontSize: 12.5, color: "var(--muted-foreground)", marginBottom: 10 }}>{fiche.company}</div>
          )}
          {proprietes.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "8px 14px", padding: "10px 12px", background: "#fafafa", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 14 }}>
              {proprietes.map(([k, v]) => (
                <div key={k} style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)" }}>{k}</div>
                  <div style={{ fontSize: 13, overflowWrap: "break-word" }}>{String(v)}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: 10 }}>
            {t("candidate.crm.activity")}
          </div>
          {(fiche.timeline || []).length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {fiche.timeline.map((a) => <Activite key={a.id} a={a} t={t} />)}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{t("candidate.crm.noActivity")}</p>
          )}
        </div>
      )}
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

  const answer = { fields: value?.fields || {}, notes: value?.notes || "", ...(value?.next_step ? { next_step: value.next_step } : {}) };
  const setField = (key, v) => onChange({ ...answer, fields: { ...answer.fields, [key]: v } });
  const setSuite = (patch) => onChange({ ...answer, next_step: { ...(answer.next_step || {}), ...patch } });
  const suite = answer.next_step || {};
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

        {/* CRM v2 : l'échange se clôt par une tâche datée, comme dans un vrai CRM. */}
        {crmEstEspace(crm) && (
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.02em", color: "var(--muted-foreground)", marginBottom: 5 }}>
              {t("candidate.crm.nextStep.title")}
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <select className="nodal-input crm-select" value={suite.type || ""} onChange={(e) => setSuite({ type: e.target.value || null })}
                style={{ ...field, padding: "0.55rem 0.85rem", fontSize: 14, cursor: "pointer", appearance: "none", WebkitAppearance: "none", flex: "1 1 140px" }}>
                <option value="">{t("candidate.crm.nextStep.typePlaceholder")}</option>
                {TYPES_PROCHAINE_ACTION.map((ty) => <option key={ty} value={ty}>{t(`candidate.crm.nextStep.types.${ty}`)}</option>)}
              </select>
              <input type="date" className="nodal-input" value={suite.date || ""} onChange={(e) => setSuite({ date: e.target.value })}
                aria-label={t("candidate.crm.nextStep.date")}
                style={{ ...field, padding: "0.55rem 0.85rem", fontSize: 14, flex: "1 1 140px" }} />
            </div>
            <input className="nodal-input" value={suite.text || ""} onChange={(e) => setSuite({ text: e.target.value })}
              placeholder={t("candidate.crm.nextStep.textPlaceholder")}
              style={{ ...field, padding: "0.6rem 0.85rem", fontSize: 14 }} />
          </div>
        )}

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
          .crm-split.espace { grid-template-columns: 1.4fr 1fr; }
          .crm-split > :first-child { border-bottom: none; border-right: 1px solid var(--border); }
        }
      `}</style>

      <div style={{ background: "#fafafa", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Contact size={16} style={{ color: primary }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>{crm?.record_title || t("candidate.crm.cardTitle")}</span>
      </div>

      {crmEstEspace(crm) ? (
        // CRM v2 : le pipeline à gauche (au-dessus quand l'assistant prend la
        // place), la fiche de la mission à droite. Le pipeline a déjà sa propre
        // liste repliable : pas de second bandeau.
        compact ? (
          <>
            <div style={{ borderBottom: "1px solid var(--border)" }}><EspaceCrm crm={crm} primary={primary} compact /></div>
            {form}
          </>
        ) : (
          <div className="crm-split espace">
            <EspaceCrm crm={crm} primary={primary} />
            {form}
          </div>
        )
      ) : compact ? (
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
