"use client";

import { MessageSquare, Terminal, Layout } from "lucide-react";
import EmailComposer from "./EmailComposer";

export default function SandboxRenderer({ format, value, onChange }) {
  if (format === "email_reply") {
    return <EmailComposer value={value} onChange={onChange} />;
  }

  if (format === "client_reply") {
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: "3px solid var(--primary)", borderRadius: 10, overflow: "hidden", background: "#f8fafc" }}>
        <div style={{ background: "white", padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={16} style={{ color: "var(--primary)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Chat Interne / Client</span>
        </div>
        <div style={{ padding: "16px", minHeight: 100, display: "flex", flexDirection: "column", gap: 12 }}>
           <div style={{ display: "flex", gap: 8 }}>
             <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>C</div>
             <div style={{ background: "white", padding: "8px 12px", borderRadius: 12, borderTopLeftRadius: 0, fontSize: 13, border: "1px solid var(--border)", maxWidth: "80%" }}>
               Pouvez-vous m'expliquer pourquoi cette solution est préférable ?
             </div>
           </div>
           <div style={{ display: "flex", gap: 8, flexDirection: "row-reverse" }}>
             <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>Moi</div>
             <textarea
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Votre réponse dans le chat..."
                style={{ width: "100%", maxWidth: "80%", padding: "8px 12px", borderRadius: 12, borderTopRightRadius: 0, fontSize: 13, border: "1px solid var(--primary)", minHeight: 80, maxHeight: 320, overflowY: "auto", boxSizing: "border-box", overflowWrap: "break-word", resize: "vertical", outline: "none" }}
             />
           </div>
        </div>
      </div>
    );
  }

  if (format === "technical_architecture") {
    return (
      <div style={{ border: "1px solid var(--border)", borderTop: "3px solid var(--primary)", borderRadius: 10, overflow: "hidden", background: "white" }}>
        <div style={{ background: "#1e293b", color: "white", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Layout size={16} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Architecture / Conception Document</span>
        </div>
        <div style={{ padding: "16px", background: "#f8fafc", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--muted-foreground)" }}>
          Rédigez votre proposition d'architecture (Markdown supporté).
        </div>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="# Architecture proposée..."
          style={{ width: "100%", padding: "16px", minHeight: 300, maxHeight: 480, overflowY: "auto", boxSizing: "border-box", overflowWrap: "break-word", border: "none", resize: "vertical", fontSize: 14, fontFamily: "monospace", lineHeight: 1.6, outline: "none", background: "var(--background)" }}
        />
      </div>
    );
  }

  if (format === "code" || format === "code_editor") {
    return (
      <div style={{ border: "1px solid #334155", borderTop: "3px solid var(--primary)", borderRadius: 10, overflow: "hidden", background: "#0f172a" }}>
        <div style={{ background: "#1e293b", color: "#cbd5e1", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, borderBottom: "1px solid #334155" }}>
          <Terminal size={14} />
          <span>Éditeur de code (Mode Sandbox)</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }}/>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }}/>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }}/>
          </div>
        </div>
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="// Écrivez votre code ici..."
          style={{ width: "100%", padding: "16px", minHeight: 300, maxHeight: 480, overflowY: "auto", boxSizing: "border-box", overflowWrap: "break-word", border: "none", resize: "vertical", fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, outline: "none", background: "#0f172a", color: "#e2e8f0" }}
          spellCheck="false"
        />
      </div>
    );
  }

  // Fallback / standard text
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      placeholder="Votre réponse…"
      style={{ width: "100%", padding: "12px", maxHeight: 420, overflowY: "auto", boxSizing: "border-box", overflowWrap: "break-word", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical", background: "var(--background)", color: "var(--foreground)" }}
    />
  );
}
