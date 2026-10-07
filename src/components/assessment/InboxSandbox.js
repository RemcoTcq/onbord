"use client";

import { useState } from "react";
import { Inbox, Mail, MessageSquare, LifeBuoy, CalendarDays, Voicemail, Check, ChevronLeft } from "lucide-react";
import { field, DEFAULT_PRIMARY, getContrastColor } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";
import { PRIORITES, ACTIONS, ACTIONS_AVEC_TEXTE, messageTraite } from "@/lib/boiteReception";

// Sandbox « inbox » — une matinée qui commence : six à huit messages arrivés en
// même temps, par plusieurs canaux. Le candidat les lit, les classe, décide quoi
// en faire, et répond à ceux qui l'exigent.
//
// Rien n'indique quel message compte : ni ordre suggéré, ni pastille d'urgence
// posée par nous. Le bruit (un message insistant mais secondaire) et le signal
// (une ligne décisive au fond d'un message banal) sont dans les textes, comme
// dans une vraie boîte. C'est ce que la grille mesure.

const ICONES = { email: Mail, chat: MessageSquare, ticket: LifeBuoy, calendar: CalendarDays, voicemail: Voicemail };

// Couleurs des priorités : du plus pressant au plus calme. Le candidat les pose
// lui-même — elles ne disent rien de ce qui est attendu.
const TEINTES = {
  urgent: { bg: "#fee2e2", fg: "#991b1b" },
  today: { bg: "#ffedd5", fg: "#9a3412" },
  week: { bg: "#e0f2fe", fg: "#075985" },
  none: { bg: "#f1f5f9", fg: "#475569" },
};

function Puce({ actif, onClick, children, teinte, primary }) {
  const style = actif
    ? teinte
      ? { background: teinte.bg, color: teinte.fg, border: `1px solid ${teinte.fg}55` }
      : { background: primary, color: getContrastColor(primary), border: `1px solid ${primary}` }
    : { background: "#ffffff", color: "var(--foreground)", border: "1px solid var(--border)" };
  return (
    <button type="button" onClick={onClick}
      style={{ ...style, fontSize: 12.5, fontWeight: 600, padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}>
      {children}
    </button>
  );
}

export default function InboxSandbox({ inbox, value, onChange, primary = DEFAULT_PRIMARY, compact = false }) {
  const t = useT();
  const items = inbox?.items || [];
  const traits = value?.items || {};
  const plan = value?.plan || "";
  const [ouvert, setOuvert] = useState(items[0]?.id || null);
  // Sur petit écran (ou à côté de l'assistant), liste et lecture se succèdent.
  const [vueLecture, setVueLecture] = useState(false);

  const message = items.find((m) => m.id === ouvert) || items[0];
  const traitement = message ? traits[message.id] || {} : {};
  const nbTraites = items.filter((m) => messageTraite(traits[m.id])).length;

  function majTraitement(patch) {
    if (!message) return;
    onChange({ items: { ...traits, [message.id]: { ...traitement, ...patch } }, plan });
  }

  if (!items.length) return <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{t("candidate.inbox.empty")}</p>;

  const liste = (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflowY: "auto", maxHeight: compact ? 300 : 560 }}>
      {items.map((m) => {
        const Icone = ICONES[m.channel] || Mail;
        const tr = traits[m.id] || {};
        const on = message?.id === m.id;
        const fait = messageTraite(tr);
        return (
          <button key={m.id} type="button"
            onClick={() => { setOuvert(m.id); setVueLecture(true); }}
            style={{
              display: "flex", gap: 10, textAlign: "left", padding: "11px 14px", border: "none",
              borderBottom: "1px solid var(--border)", borderLeft: `3px solid ${on ? primary : "transparent"}`,
              background: on ? `${primary}0D` : "#ffffff", cursor: "pointer", fontFamily: "inherit", width: "100%",
            }}>
            <Icone size={15} style={{ color: on ? primary : "var(--muted-foreground)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: fait ? 500 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                  {m.from || t(`candidate.inbox.channels.${m.channel}`)}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)", flexShrink: 0 }}>{m.received_at}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: fait ? 400 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--foreground)" }}>
                {m.subject || t(`candidate.inbox.channels.${m.channel}`)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                {tr.priority && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: TEINTES[tr.priority].bg, color: TEINTES[tr.priority].fg }}>
                    {t(`candidate.inbox.priorities.${tr.priority}`)}
                  </span>
                )}
                {tr.action && (
                  <span style={{ fontSize: 10.5, color: "var(--muted-foreground)" }}>{t(`candidate.inbox.actions.${tr.action}`)}</span>
                )}
                {fait && <Check size={12} style={{ color: "#166534", marginLeft: "auto" }} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const Icone = ICONES[message?.channel] || Mail;
  const lecture = message && (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      {compact && (
        <button type="button" onClick={() => setVueLecture(false)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "8px 14px", border: "none", borderBottom: "1px solid var(--border)", background: "#fafafa", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--muted-foreground)" }}>
          <ChevronLeft size={14} /> {t("candidate.inbox.backToList")}
        </button>
      )}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted-foreground)", marginBottom: 6 }}>
          <Icone size={13} /> {t(`candidate.inbox.channels.${message.channel}`)}
        </div>
        {message.subject && <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35, marginBottom: 6, overflowWrap: "break-word" }}>{message.subject}</div>}
        <div style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>
          <span style={{ color: "var(--foreground)", fontWeight: 600 }}>{message.from}</span>
          {message.from_role ? ` — ${message.from_role}` : ""}
          {message.received_at ? ` · ${message.received_at}` : ""}
        </div>
      </div>
      <div style={{ padding: "14px 18px", fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", overflowWrap: "break-word", overflowY: "auto", maxHeight: compact ? 260 : 300 }}>
        {message.body}
      </div>

      {/* Ce que le candidat décide pour CE message. */}
      <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", background: "#fcfcfd", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6 }}>{t("candidate.inbox.priorityLabel")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRIORITES.map((p) => (
              <Puce key={p} actif={traitement.priority === p} teinte={TEINTES[p]} primary={primary} onClick={() => majTraitement({ priority: p })}>
                {t(`candidate.inbox.priorities.${p}`)}
              </Puce>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6 }}>{t("candidate.inbox.actionLabel")}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ACTIONS.map((a) => (
              <Puce key={a} actif={traitement.action === a} primary={primary} onClick={() => majTraitement({ action: a })}>
                {t(`candidate.inbox.actions.${a}`)}
              </Puce>
            ))}
          </div>
        </div>
        {traitement.action && (
          <textarea
            className="nodal-input"
            value={traitement.text || ""}
            onChange={(e) => majTraitement({ text: e.target.value })}
            rows={traitement.action === "reply" ? 5 : 2}
            placeholder={t(`candidate.inbox.textPlaceholders.${traitement.action}`)}
            style={{ ...field, fontSize: 14, padding: "0.7rem 0.95rem", minHeight: traitement.action === "reply" ? 120 : 64, maxHeight: 320, resize: "vertical" }}
          />
        )}
        {traitement.action && ACTIONS_AVEC_TEXTE.has(traitement.action) && !String(traitement.text || "").trim() && (
          <p style={{ fontSize: 12, color: "#9a3412", margin: 0 }}>{t("candidate.inbox.textRequired")}</p>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        <style>{`
          .inbox-split { display: grid; grid-template-columns: 1fr; }
          .inbox-split > .inbox-list { border-bottom: 1px solid var(--border); }
          @media (min-width: 860px) {
            .inbox-split.wide { grid-template-columns: minmax(240px, 0.85fr) 1.5fr; }
            .inbox-split.wide > .inbox-list { border-bottom: none; border-right: 1px solid var(--border); }
          }
        `}</style>
        <div style={{ background: "#fafafa", padding: "11px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Inbox size={16} style={{ color: primary }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>
            {inbox?.owner ? t("candidate.inbox.titleOwner", { owner: inbox.owner }) : t("candidate.inbox.title")}
            {inbox?.now ? <span style={{ fontWeight: 400, color: "var(--muted-foreground)" }}> · {inbox.now}</span> : null}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: nbTraites === items.length ? "#166534" : "var(--muted-foreground)" }}>
            {t("candidate.inbox.progress", { done: nbTraites, total: items.length })}
          </span>
        </div>

        {compact ? (
          vueLecture ? lecture : liste
        ) : (
          <div className="inbox-split wide">
            <div className="inbox-list">{liste}</div>
            {lecture}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6 }}>
          {t("candidate.inbox.planLabel")}
        </label>
        <textarea
          className="nodal-input"
          value={plan}
          onChange={(e) => onChange({ items: traits, plan: e.target.value })}
          rows={3}
          placeholder={t("candidate.inbox.planPlaceholder")}
          style={{ ...field, minHeight: 84, maxHeight: 300, resize: "vertical" }}
        />
      </div>
    </div>
  );
}
