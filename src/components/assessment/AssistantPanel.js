"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2 } from "lucide-react";
import { getContrastColor, DEFAULT_PRIMARY } from "./candidateUi";

// Accès à Claude complet (Sonnet) pendant un step. Chat plafonné (50 échanges
// par défaut, configurable par step) et intégralement loggé côté serveur
// (/api/run/assistant → run_ai_messages). On mesure COMMENT le candidat l'utilise.
export default function AssistantPanel({ token, stepId, primary = DEFAULT_PRIMARY }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const endRef = useRef(null);

  // Réinitialise la conversation quand on change de step
  useEffect(() => { setMessages([]); setRemaining(null); setLimitReached(false); setInput(""); }, [stepId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending || limitReached) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const res = await fetch("/api/run/assistant", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stepId, message: text }),
      });
      const data = await res.json();
      if (data.limitReached) {
        setLimitReached(true);
        setMessages((m) => [...m, { role: "assistant", content: "Vous avez atteint le nombre maximum d'échanges avec l'assistant pour cette évaluation." }]);
      } else if (data.reply) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (typeof data.remaining === "number") { setRemaining(data.remaining); if (data.remaining <= 0) setLimitReached(true); }
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
    }
    setSending(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-outline btn-sm"
        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "1.25rem" }}>
        <Bot size={15} /> Ouvrir Claude
      </button>
    );
  }

  return (
    <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, background: "white", borderRadius: 16, marginBottom: "1.25rem", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fafafa", color: primary, fontSize: 13, fontWeight: 700, borderBottom: "1px solid var(--border)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Bot size={15} /> Claude</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {remaining != null && <span style={{ fontWeight: 500, opacity: 0.7, color: "var(--muted-foreground)" }}>{remaining} échange{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</span>}
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 2, color: "var(--muted-foreground)" }}>×</button>
        </span>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto", padding: "12px" }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Vous avez accès à Claude comme au travail : posez vos questions, demandez un brouillon, un angle, une vérification. Tout l'échange est enregistré et fait partie de l'évaluation — c'est votre <em>façon</em> d'utiliser l'IA qui compte.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "break-word",
              background: m.role === "user" ? primary : "#fafafa",
              color: m.role === "user" ? getContrastColor(primary) : "var(--foreground)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
            }}>{m.content}</div>
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> L'assistant réfléchit…</div>}
        <div ref={endRef} />
      </div>

      {!limitReached && (
        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
          <input className="nodal-input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Posez votre question…" disabled={sending}
            style={{ flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", fontSize: 14, background: "#fafafa", outline: "none", fontFamily: "inherit" }} />
          <button onClick={send} disabled={sending || !input.trim()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, background: primary, color: getContrastColor(primary), border: "none", borderRadius: 10, padding: "0 14px", cursor: sending || !input.trim() ? "not-allowed" : "pointer", opacity: sending || !input.trim() ? 0.5 : 1 }}>
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
