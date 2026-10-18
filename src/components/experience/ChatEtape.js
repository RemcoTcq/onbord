"use client";

// Le chat de la page d'une étape — un expert de la simulation (12/10/2026),
// présenté en « Simulation Copilot » (maquettes « D · Étape », octobre 2026).
//
// Il RÉPOND aux questions du recruteur (gratuit) à partir de l'étape entière,
// de ses voisines et de l'offre (route /api/chat/etape). Quand le recruteur
// demande un changement, il PROPOSE une réécriture : une carte « Modification
// proposée », et seul le clic « Appliquer » lance regenerateStep — 2 crédits,
// mêmes règles que toute réécriture (versionnage, grille conservée si la
// consigne n'y touche pas). Rien n'est débité sans décision explicite.
//
// L'historique vit le temps de la page, tenu par elle (messages/setMessages) :
// la page remonte l'éditeur à chaque réécriture, le fil doit y survivre. Il ne
// fait foi de rien ; l'étape enregistrée, si.

import { useRef, useState, useEffect } from "react";
import { Send, Loader2, Check, AlertTriangle, Sparkles, RotateCcw, PanelRightClose, Copy, RefreshCw } from "lucide-react";
import { regenerateStep } from "@/lib/actions/experience";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";

const SUGGESTIONS = ["scoring", "level", "harder"];

function Avatar() {
  return (
    <span style={{ width: 26, height: 26, flex: "none", borderRadius: 8, background: "var(--ds-blue)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Sparkles size={13} strokeWidth={2} />
    </span>
  );
}

export default function ChatEtape({ stepId, dirty, onRewritten, messages, setMessages, prenom, jobTitle, onReplier }) {
  const { t } = useI18n();
  const [saisie, setSaisie] = useState("");
  const [reflexion, setReflexion] = useState(false);   // le chat répond
  const [reecriture, setReecriture] = useState(false); // une réécriture tourne
  const [copie, setCopie] = useState(null);
  const finRef = useRef(null);
  const occupe = reflexion || reecriture;
  const k = (cle, vars) => t(`dashboard.experienceEditor.stepChat.${cle}`, vars);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [messages, occupe]);

  async function demander(fil) {
    setMessages(fil);
    setReflexion(true);
    try {
      const r = await fetch("/api/chat/etape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Seuls les mots échangés partent : pas les cartes ni les notes d'état.
        body: JSON.stringify({ stepId, messages: fil.filter((m) => !m.note).map((m) => ({ role: m.role, text: m.text })) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "");
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.reply || (data.proposition ? k("proposalIntro") : ""),
        proposition: data.proposition ? { ...data.proposition, statut: "ouverte" } : null,
      }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", note: true, ok: false, text: k("failedAnswer", { error: err.message || "" }) }]);
    }
    setReflexion(false);
  }

  function envoyer(texte) {
    const question = String(texte || "").trim();
    if (!question || occupe) return;
    setSaisie("");
    demander([...messages, { role: "user", text: question }]);
  }

  // Redemande la dernière réponse : le fil repart de la dernière question.
  function regenerer(index) {
    if (occupe) return;
    const fil = messages.slice(0, index);
    if (!fil.some((m) => m.role === "user")) return;
    demander(fil);
  }

  function copier(index, texte) {
    navigator.clipboard.writeText(texte || "");
    setCopie(index);
    setTimeout(() => setCopie(null), 2000);
  }

  // Le clic du recruteur sur « Appliquer » : c'est ici, et seulement ici,
  // qu'une réécriture part et que les 2 crédits sont débités.
  async function appliquer(index) {
    const proposition = messages[index]?.proposition;
    if (!proposition || occupe) return;
    if (dirty && !confirm(k("unsavedConfirm"))) return;
    const statut = (s) => setMessages((m) => m.map((x, i) => (i === index ? { ...x, proposition: { ...x.proposition, statut: s } } : x)));
    statut("en_cours");
    setReecriture(true);
    const res = await regenerateStep(stepId, proposition.consigne);
    setReecriture(false);
    if (res.success) {
      statut("appliquee");
      setMessages((m) => [...m, { role: "assistant", note: true, ok: true, text: res.resume || k("done") }]);
      await onRewritten?.(res);
    } else {
      statut("ouverte");
      setMessages((m) => [...m, { role: "assistant", note: true, ok: false, text: k("failed", { error: res.error || "" }) }]);
    }
  }

  const ecarter = (index) => setMessages((m) => m.map((x, i) => (i === index ? { ...x, proposition: { ...x.proposition, statut: "ecartee" } } : x)));
  const dernierAssistant = messages.map((m) => m.role).lastIndexOf("assistant");

  return (
    <div className="ds-card" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", boxShadow: "0 1px 2px rgba(20,32,74,0.04), 0 12px 32px rgba(20,32,74,0.06)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px 12px 14px", borderBottom: "1px solid var(--ds-line-2)" }}>
        <span style={{ width: 32, height: 32, flex: "none", borderRadius: 10, background: "var(--ds-blue)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 4px var(--ds-blue-10)" }}>
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{k("title")}</h2>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ds-ink-3)" }}>
            <span className="ds-dot ds-dot-green" />{k("knows")}
          </span>
        </span>
        <button type="button" className="ds-icon-btn" onClick={() => setMessages([])} disabled={occupe || !messages.length} aria-label={k("newConversation")} title={k("newConversation")}>
          <RotateCcw size={15} strokeWidth={2} />
        </button>
        {onReplier && (
          <button type="button" className="ds-icon-btn" onClick={onReplier} aria-label={k("collapse")} aria-expanded="true" title={k("collapse")}>
            <PanelRightClose size={16} strokeWidth={1.8} />
          </button>
        )}
      </header>

      <div role="log" aria-label={k("logLabel")} style={{ flex: 1, minHeight: 160, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "16px 14px", background: "#FBFCFE" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <Avatar />
          <p style={{ margin: 0, paddingTop: 3, fontSize: 13, lineHeight: 1.6 }}>
            {tNodes(k(prenom ? "greeting" : "greetingNoName", { name: prenom }), { job: <span key="j" style={{ fontWeight: 500 }}>{jobTitle || "—"}</span> })}
          </p>
        </div>

        {messages.map((m, i) => (
          m.role === "user" ? (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: "85%", padding: "9px 12px", borderRadius: "14px 14px 4px 14px", background: "var(--ds-blue)", color: "#FFFFFF", fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {m.text}
            </div>
          ) : (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <Avatar />
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10, paddingTop: 3 }}>
                {m.text && (
                  m.note ? (
                    <p style={{ margin: 0, display: "flex", gap: 6, alignItems: "flex-start", fontSize: 13, lineHeight: 1.55, padding: "8px 10px", borderRadius: 8, background: m.ok ? "#F2FAF6" : "var(--ds-red-bg)", color: m.ok ? "var(--ds-green-ink)" : "var(--ds-red)" }}>
                      {m.ok ? <Check size={14} style={{ flexShrink: 0, marginTop: 3 }} /> : <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 3 }} />}
                      <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.text}</p>
                  )
                )}

                {m.proposition && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 500, color: "var(--ds-blue)" }}>
                      <Sparkles size={12} /> {k("proposal")}
                    </span>
                    <p style={{ margin: 0, padding: "8px 10px", borderRadius: 8, background: "#F2FAF6", borderLeft: "3px solid var(--ds-green)", fontSize: 13, lineHeight: 1.55 }}>
                      {m.proposition.resume}
                    </p>
                    {m.proposition.statut === "ouverte" && (
                      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="ds-btn ds-btn-primary" onClick={() => appliquer(i)} disabled={occupe} style={{ height: 30, padding: "0 12px", borderRadius: 8, fontSize: 12 }}>
                          {k("apply")}
                        </button>
                        <button type="button" className="ds-btn" onClick={() => ecarter(i)} disabled={occupe} style={{ height: 30, padding: "0 12px", borderRadius: 8, fontSize: 12, color: "var(--ds-ink-2)" }}>
                          {k("dismiss")}
                        </button>
                      </span>
                    )}
                    {m.proposition.statut === "en_cours" && (
                      <span style={{ fontSize: 12, color: "var(--ds-ink-3)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {k("working")}
                      </span>
                    )}
                    {m.proposition.statut === "appliquee" && <span style={{ fontSize: 12, color: "var(--ds-green-ink)", fontWeight: 500 }}>{k("applied")}</span>}
                    {m.proposition.statut === "ecartee" && <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>{k("dismissed")}</span>}
                  </div>
                )}

                {!m.note && m.text && (
                  <span style={{ display: "flex", gap: 2 }}>
                    <button type="button" className={`ds-icon-btn ${copie === i ? "is-copied" : ""}`} style={{ width: 26, height: 26, borderRadius: 7 }} onClick={() => copier(i, m.text)} aria-label={k("copy")} title={k("copy")}>
                      {copie === i ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    {i === dernierAssistant && (
                      <button type="button" className="ds-icon-btn" style={{ width: 26, height: 26, borderRadius: 7 }} onClick={() => regenerer(i)} disabled={occupe} aria-label={k("regenerate")} title={k("regenerate")}>
                        <RefreshCw size={13} />
                      </button>
                    )}
                  </span>
                )}
              </div>
            </div>
          )
        ))}

        {reflexion && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--ds-ink-3)" }}>
            <Avatar /> <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {k("thinking")}
          </div>
        )}
        <div ref={finRef} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px 12px", borderTop: "1px solid var(--ds-line-2)" }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => envoyer(k(`suggestions.${s}`))}
              disabled={occupe}
              style={{ flex: "none", height: 30, padding: "0 10px", border: "1px solid var(--ds-line)", borderRadius: 999, background: "var(--ds-soft)", font: "inherit", fontSize: 12, color: "var(--ds-ink-2)", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {k(`suggestions.${s}`)}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}
          style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 8px 8px 12px", borderRadius: 12, border: "1px solid #D6DDEC", background: "#FFFFFF", boxShadow: "var(--ds-shadow-xs)" }}
        >
          <label htmlFor="ds-copilot-saisie" className="sr-only">{k("inputLabel")}</label>
          <textarea
            id="ds-copilot-saisie"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(saisie); } }}
            placeholder={k("placeholder")}
            rows={2}
            disabled={occupe}
            style={{ width: "100%", resize: "none", border: 0, padding: "2px 0 0", font: "inherit", fontSize: 13, lineHeight: 1.5, color: "var(--ds-ink)", background: "transparent", outline: 0 }}
          />
          <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 11, color: "var(--ds-ink-4)" }}>{k("cost")}</span>
            <button type="submit" disabled={occupe || !saisie.trim()} aria-label={k("send")} title={k("send")} className="ds-btn ds-btn-primary" style={{ width: 32, height: 32, padding: 0, borderRadius: 9 }}>
              <Send size={14} />
            </button>
          </span>
        </form>
      </div>
    </div>
  );
}
