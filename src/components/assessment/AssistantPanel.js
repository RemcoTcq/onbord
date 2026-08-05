"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2 } from "lucide-react";

// Assistant IA optionnel pour un step. Chat plafonné + loggé côté serveur
// (/api/run/assistant). Pas de partage d'écran, pas d'outils externes.
export default function AssistantPanel({ token, stepId }) {
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
        <Bot size={15} /> Ouvrir l'assistant IA
      </button>
    );
  }

  return (
    <div style={{ border: "1px solid #dbeafe", background: "#f8fbff", borderRadius: 10, marginBottom: "1.25rem", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 700 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Bot size={15} /> Assistant IA</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {remaining != null && <span style={{ fontWeight: 500, opacity: 0.8 }}>{remaining} échange{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</span>}
          <button onClick={() => setOpen(false)} className="btn btn-ghost btn-sm" style={{ padding: 2, color: "#1d4ed8" }}>×</button>
        </span>
      </div>

      <div style={{ maxHeight: 260, overflowY: "auto", padding: "12px" }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
            Utilisez l'assistant comme au travail : demandez une clarification, un angle, un retour. Il vous aide, il ne fait pas la tâche à votre place. Tout est enregistré.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
            <div style={{
              maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
              background: m.role === "user" ? "var(--primary)" : "white",
              color: m.role === "user" ? "white" : "var(--foreground)",
              border: m.role === "user" ? "none" : "1px solid var(--border)",
            }}>{m.content}</div>
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 6 }}><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> L'assistant réfléchit…</div>}
        <div ref={endRef} />
      </div>

      {!limitReached && (
        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #dbeafe" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Posez votre question…" disabled={sending}
            style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", fontSize: 13.5, background: "white" }} />
          <button onClick={send} disabled={sending || !input.trim()} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
