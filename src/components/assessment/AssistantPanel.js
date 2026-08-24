"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, ArrowUp, Loader2, PanelRightClose, PanelRightOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getContrastColor, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Claude complet, ouvert à côté de la tâche — pas un widget replié dans un coin.
// La conversation est chargée depuis le serveur (run_ai_messages) : elle survit
// à un rechargement, exactement comme le modèle s'en souvient déjà de son côté.
// Réponses en streaming, plafond d'échanges appliqué serveur, tout est loggé :
// on mesure COMMENT le candidat s'en sert.

export default function AssistantPanel({ token, stepId, primary = DEFAULT_PRIMARY, onCollapsedChange }) {
  const t = useT();

  // Cadrage posé comme un vrai premier message de la conversation : le candidat
  // doit savoir que l'échange est lu, c'est la règle du jeu.
  //
  // Lu dans le rendu et non dans une constante de module : la langue du
  // parcours vient de l'offre, elle n'est connue qu'une fois le run chargé.
  const WELCOME = t("candidate.assistant.greeting");

  const [open, setOpen] = useState(true); // ouvert par défaut : l'usage de l'IA fait partie de l'exercice
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");   // réponse en cours de réception
  const [remaining, setRemaining] = useState(null);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const scrollRef = useRef(null);
  const stickToBottom = useRef(true); // false dès que le candidat remonte lui-même
  const taRef = useRef(null);

  useEffect(() => { onCollapsedChange?.(!open); }, [open, onCollapsedChange]);

  // Charge la conversation du step depuis le serveur (source de vérité).
  // Pas de remise à zéro ici : le parent remonte le composant à chaque étape
  // (key={step.id}), donc l'état repart neuf sans cascade de rendus.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/run/assistant?token=${encodeURIComponent(token)}&stepId=${encodeURIComponent(stepId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (typeof data.remaining === "number") {
          setRemaining(data.remaining);
          if (data.remaining <= 0) setLimitReached(true);
        }
      } catch {
        /* pas d'historique : la conversation démarre à vide, ce n'est pas bloquant */
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, stepId]);

  // Suit le flux, sauf si le candidat a remonté pour relire.
  const scrollToBottom = useCallback(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, streaming, scrollToBottom]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || limitReached) return;

    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", content: text }]);
    stickToBottom.current = true;
    setSending(true);
    setStreaming("");

    let acc = "";
    try {
      const res = await fetch("/api/run/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, stepId, message: text }),
      });

      // Plafond atteint / erreur : la route répond en JSON, pas en flux.
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !res.body || contentType.includes("application/json")) {
        const data = await res.json().catch(() => ({}));
        if (data.limitReached) {
          setLimitReached(true);
          setRemaining(0);
          setMessages((m) => [...m, { role: "assistant", content: t("candidate.assistant.limitReached") }]);
        } else {
          setMessages((m) => [...m, { role: "assistant", content: t("candidate.assistant.error") }]);
        }
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let msg;
          try { msg = JSON.parse(line); } catch { continue; }
          if (msg.type === "delta") { acc += msg.text; setStreaming(acc); }
          else if (msg.type === "done") {
            if (typeof msg.remaining === "number") {
              setRemaining(msg.remaining);
              if (msg.remaining <= 0) setLimitReached(true);
            }
          } else if (msg.type === "error") {
            acc += acc ? t("candidate.assistant.interrupted") : t("candidate.assistant.error");
          }
        }
      }
    } catch {
      if (!acc) acc = t("candidate.assistant.error");
    } finally {
      // Le texte streamé devient un message normal de la conversation.
      if (acc) setMessages((m) => [...m, { role: "assistant", content: acc }]);
      setStreaming("");
      setSending(false);
    }
  }

  // Replié : un onglet vertical, toujours visible — jamais un bouton perdu.
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title={t("candidate.assistant.open")}
        className="assistant-tab"
        style={{
          position: "sticky", top: "2rem", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 10, padding: "16px 10px", cursor: "pointer",
          background: "#ffffff", border: "1px solid var(--border)", borderTop: `3px solid ${primary}`,
          borderRadius: 14, color: primary, fontFamily: "inherit",
        }}
      >
        <PanelRightOpen size={18} />
        <span style={{ writingMode: "vertical-rl", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.03em" }}>
          Claude
        </span>
        <Bot size={16} />
      </button>
    );
  }

  const shown = [{ role: "assistant", content: WELCOME }, ...messages];

  return (
    <div className="assistant-panel" style={{
      position: "sticky", top: "2rem",
      height: "calc(100vh - 4rem)", display: "flex", flexDirection: "column",
      background: "#ffffff", border: "1px solid var(--border)", borderTop: `3px solid ${primary}`,
      borderRadius: 16, overflow: "hidden",
    }}>
      <style>{`
        @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .assistant-md > :first-child { margin-top: 0; }
        .assistant-md > :last-child { margin-bottom: 0; }
        .assistant-md p { margin: 0 0 0.6em; }
        .assistant-md ul, .assistant-md ol { margin: 0 0 0.6em; padding-left: 1.2em; }
        .assistant-md li { margin-bottom: 0.2em; }
        .assistant-md code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
        .assistant-md pre { background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 0.6em; }
        .assistant-md pre code { background: none; padding: 0; color: inherit; }
        .assistant-md table { border-collapse: collapse; font-size: 0.95em; margin-bottom: 0.6em; }
        .assistant-md th, .assistant-md td { border: 1px solid var(--border); padding: 4px 8px; }
        .assistant-md h1, .assistant-md h2, .assistant-md h3 { font-size: 1em; font-weight: 700; margin: 0.8em 0 0.4em; }
      `}</style>

      {/* En-tête */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        padding: "12px 14px", background: "#fafafa", borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 700, color: primary }}>
          <Bot size={16} /> Claude
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {remaining != null && (
            <span style={{ fontSize: 11.5, color: "var(--muted-foreground)" }}>
              {/* Accord géré par le dictionnaire (clés _one / _other) : le
                  néerlandais ne met pas la marque du pluriel au même endroit
                  que le français, et l'anglais n'accorde pas l'adjectif. */}
              {t("candidate.assistant.remainingMessages", { count: remaining })}
            </span>
          )}
          <button onClick={() => setOpen(false)} title={t("candidate.assistant.collapse")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 2 }}>
            <PanelRightClose size={16} />
          </button>
        </span>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loadingHistory ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
            <Loader2 size={18} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : (
          shown.map((m, i) => <Bubble key={i} role={m.role} content={m.content} primary={primary} />)
        )}

        {streaming && <Bubble role="assistant" content={streaming} primary={primary} cursor />}

        {sending && !streaming && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: "var(--muted-foreground)" }}>
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Claude écrit…
          </div>
        )}
      </div>

      {/* Composeur */}
      <div style={{ borderTop: "1px solid var(--border)", padding: "10px 12px", flexShrink: 0, background: "#ffffff" }}>
        {limitReached ? (
          <p style={{ fontSize: 12.5, color: "var(--muted-foreground)", textAlign: "center", margin: "6px 0" }}>
            {t("candidate.assistant.limitReached")}
          </p>
        ) : (
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8, background: "#fafafa",
            border: "1px solid var(--border)", borderRadius: 14, padding: "8px 8px 8px 14px",
          }}>
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoGrow(e.target); }}
              onKeyDown={(e) => {
                // Entrée envoie, Maj+Entrée saute une ligne — convention des chats.
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              rows={1}
              placeholder={t("candidate.assistant.placeholder")}
              disabled={sending}
              style={{
                flex: 1, border: "none", outline: "none", background: "transparent", resize: "none",
                fontSize: 14, lineHeight: 1.5, fontFamily: "inherit", color: "var(--foreground)",
                maxHeight: 160, padding: "4px 0",
              }}
            />
            <button onClick={send} disabled={sending || !input.trim()} title={t("candidate.assistant.send")}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                width: 32, height: 32, borderRadius: "50%", border: "none",
                background: primary, color: getContrastColor(primary),
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
                opacity: sending || !input.trim() ? 0.4 : 1, transition: "opacity .15s",
              }}>
              {sending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowUp size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, content, primary, cursor = false }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
      <div
        className={isUser ? undefined : "assistant-md"}
        style={{
          maxWidth: isUser ? "88%" : "100%",
          padding: isUser ? "9px 13px" : 0,
          borderRadius: 14,
          fontSize: 13.5, lineHeight: 1.6,
          overflowWrap: "break-word",
          background: isUser ? primary : "transparent",
          color: isUser ? getContrastColor(primary) : "var(--foreground)",
          whiteSpace: isUser ? "pre-wrap" : undefined,
        }}
      >
        {isUser ? content : (
          <>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {cursor && (
              <span style={{
                display: "inline-block", width: 7, height: 14, marginLeft: 2, borderRadius: 1,
                background: primary, animation: "blink 1s steps(2, start) infinite", verticalAlign: "text-bottom",
              }} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
