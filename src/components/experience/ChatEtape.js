"use client";

// Le chat de la page d'une étape — un expert de la simulation (12/10/2026).
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
import { Send, Loader2, Check, AlertTriangle, Sparkles } from "lucide-react";
import { regenerateStep } from "@/lib/actions/experience";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SUGGESTIONS = ["scoring", "level", "harder"];

export default function ChatEtape({ stepId, dirty, onRewritten, messages, setMessages }) {
  const { t } = useI18n();
  const [saisie, setSaisie] = useState("");
  const [reflexion, setReflexion] = useState(false);   // le chat répond
  const [reecriture, setReecriture] = useState(false); // une réécriture tourne
  const finRef = useRef(null);
  const occupe = reflexion || reecriture;
  const k = (cle, vars) => t(`dashboard.experienceEditor.stepChat.${cle}`, vars);

  useEffect(() => { finRef.current?.scrollIntoView({ block: "end" }); }, [messages, occupe]);

  async function envoyer(texte) {
    const question = String(texte || "").trim();
    if (!question || occupe) return;
    setSaisie("");
    const fil = [...messages, { role: "user", text: question }];
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

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", height: "100%" }}>
      <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "13.5px", fontWeight: 800, margin: 0 }}>{k("title")}</h3>
        <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>{k("cost")}</p>
      </div>

      <div style={{ flex: 1, minHeight: 160, overflowY: "auto", padding: "0.9rem 1.1rem", display: "flex", flexDirection: "column", gap: 10 }}>
        {!messages.length && (
          <>
            <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: 1.55, margin: 0 }}>{k("intro")}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => envoyer(k(`suggestions.${s}`))}
                  disabled={occupe}
                  className="btn btn-ghost btn-sm"
                  style={{ justifyContent: "flex-start", textAlign: "left", fontSize: "12.5px", border: "1px dashed var(--border)", whiteSpace: "normal", height: "auto", padding: "6px 10px" }}
                >
                  {k(`suggestions.${s}`)}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.text && (
              <div style={{
                maxWidth: "92%", fontSize: "13px", lineHeight: 1.55, padding: "8px 11px", borderRadius: 10,
                background: m.role === "user" ? "var(--primary)" : (m.ok === false ? "#fef2f2" : "var(--secondary)"),
                color: m.role === "user" ? "var(--primary-foreground, #fff)" : (m.ok === false ? "#991b1b" : "var(--foreground)"),
                display: "flex", gap: 6, alignItems: "flex-start",
              }}>
                {m.note && (m.ok
                  ? <Check size={14} style={{ color: "#166534", flexShrink: 0, marginTop: 3 }} />
                  : <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 3 }} />)}
                <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>
              </div>
            )}

            {m.proposition && (
              <div style={{ maxWidth: "92%", width: "100%", border: "1px solid var(--primary)", borderRadius: 10, padding: "9px 11px", background: "var(--background)" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: ".04em", display: "flex", alignItems: "center", gap: 5 }}>
                  <Sparkles size={12} /> {k("proposal")}
                </div>
                <p style={{ fontSize: "13px", lineHeight: 1.5, margin: "4px 0 8px" }}>{m.proposition.resume}</p>
                {m.proposition.statut === "ouverte" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => appliquer(i)} disabled={occupe} style={{ fontSize: "12px" }}>
                      {k("apply")}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => ecarter(i)} disabled={occupe} style={{ fontSize: "12px" }}>
                      {k("dismiss")}
                    </button>
                  </div>
                )}
                {m.proposition.statut === "en_cours" && (
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {k("working")}
                  </div>
                )}
                {m.proposition.statut === "appliquee" && <div style={{ fontSize: "12px", color: "#166534", fontWeight: 600 }}>{k("applied")}</div>}
                {m.proposition.statut === "ecartee" && <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{k("dismissed")}</div>}
              </div>
            )}
          </div>
        ))}

        {reflexion && (
          <div style={{ alignSelf: "flex-start", fontSize: "12.5px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 8 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {k("thinking")}
          </div>
        )}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); envoyer(saisie); }}
        style={{ display: "flex", gap: 8, padding: "0.75rem", borderTop: "1px solid var(--border)" }}
      >
        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(saisie); } }}
          placeholder={k("placeholder")}
          rows={2}
          disabled={occupe}
          style={{
            flex: 1, resize: "none", fontSize: "13px", fontFamily: "inherit", padding: "8px 10px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)",
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={occupe || !saisie.trim()} title={k("send")} style={{ alignSelf: "flex-end", padding: "8px 10px" }}>
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
