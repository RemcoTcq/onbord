"use client";

import { useRef, useState, useEffect } from "react";
import { Mail, Send, Bold, Italic, List } from "lucide-react";
import { getContrastColor, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Composeur d'email réaliste (type Gmail) : champs À / Cc / Objet + corps avec
// mise en forme basique (gras, italique, liste). La valeur est sérialisée en une
// seule chaîne (compatible text_answer / scoring) ; corps vide => valeur vide
// (la validation "réponse obligatoire" reste correcte).

function parse(value) {
  if (!value) return { to: "", cc: "", subject: "", body: "" };
  const m = value.match(/^À\s*:\s*(.*)\nCc\s*:\s*(.*)\nObjet\s*:\s*(.*)\n\n([\s\S]*)$/);
  if (m) return { to: m[1], cc: m[2], subject: m[3], body: m[4] };
  return { to: "", cc: "", subject: "", body: value };
}
function serialize({ to, cc, subject, body }) {
  return `À : ${to}\nCc : ${cc}\nObjet : ${subject}\n\n${body}`;
}

export default function EmailComposer({ value, onChange, primary = DEFAULT_PRIMARY }) {
  const t = useT();
  const init = useRef(parse(value));
  const [to, setTo] = useState(init.current.to);
  const [cc, setCc] = useState(init.current.cc);
  const [subject, setSubject] = useState(init.current.subject);
  const [showCc, setShowCc] = useState(!!init.current.cc);
  const bodyRef = useRef(null);

  // Initialise le corps une seule fois (contentEditable non contrôlé par React).
  useEffect(() => { if (bodyRef.current) bodyRef.current.innerText = init.current.body; }, []);

  function push(over = {}) {
    const cur = { to, cc, subject, body: bodyRef.current?.innerText || "" };
    const next = { ...cur, ...over };
    // Corps vide => réponse vide (gate de validation), même si des en-têtes sont saisis.
    onChange(next.body.trim() ? serialize(next) : "");
  }

  function fmt(cmd) {
    bodyRef.current?.focus();
    try { document.execCommand(cmd, false, null); } catch { /* execCommand indispo : non bloquant */ }
    push();
  }

  const headerRow = { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderBottom: "1px solid var(--border)", fontSize: 13 };
  const headerLabel = { width: 44, color: "var(--muted-foreground)", flexShrink: 0 };
  const headerInput = { flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "var(--foreground)", fontFamily: "inherit" };
  const toolBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 28, border: "1px solid var(--border)", borderRadius: 6, background: "white", cursor: "pointer", color: "var(--foreground)" };

  return (
    <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "white" }}>
      <style>{`[data-placeholder]:empty:before{content:attr(data-placeholder);color:var(--muted-foreground);pointer-events:none;}`}</style>
      {/* Barre de titre façon fenêtre de composition */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f2f4f7", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <Mail size={15} style={{ color: "var(--muted-foreground)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>{t("candidate.emailComposer.newMessage")}</span>
      </div>

      {/* À + bascule Cc */}
      <div style={headerRow}>
        <span style={headerLabel}>À</span>
        <input value={to} onChange={(e) => { setTo(e.target.value); push({ to: e.target.value }); }}
          placeholder={t("candidate.emailComposer.toPlaceholder")} style={headerInput} />
        {!showCc && (
          <button onClick={() => setShowCc(true)} style={{ border: "none", background: "transparent", color: "var(--muted-foreground)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Cc</button>
        )}
      </div>

      {/* Cc (optionnel) */}
      {showCc && (
        <div style={headerRow}>
          <span style={headerLabel}>Cc</span>
          <input value={cc} onChange={(e) => { setCc(e.target.value); push({ cc: e.target.value }); }}
            placeholder={t("candidate.emailComposer.ccPlaceholder")} style={headerInput} />
        </div>
      )}

      {/* Objet */}
      <div style={headerRow}>
        <span style={headerLabel}>{t("candidate.emailComposer.subject")}</span>
        <input value={subject} onChange={(e) => { setSubject(e.target.value); push({ subject: e.target.value }); }}
          placeholder={t("candidate.emailComposer.subjectPlaceholder")} style={headerInput} />
      </div>

      {/* Corps éditable */}
      <div
        ref={bodyRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => push()}
        data-placeholder={t("candidate.emailComposer.bodyPlaceholder")}
        style={{ minHeight: 200, maxHeight: 420, overflowY: "auto", padding: "16px", fontSize: 14, lineHeight: 1.6, outline: "none", overflowWrap: "break-word", whiteSpace: "pre-wrap" }}
      />

      {/* Barre d'outils + envoyer (cosmétique) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border)", background: "#f8fafc" }}>
        <button title={t("candidate.emailComposer.bold")} onMouseDown={(e) => { e.preventDefault(); fmt("bold"); }} style={toolBtn}><Bold size={14} /></button>
        <button title={t("candidate.emailComposer.italic")} onMouseDown={(e) => { e.preventDefault(); fmt("italic"); }} style={toolBtn}><Italic size={14} /></button>
        <button title={t("candidate.emailComposer.bulletList")} onMouseDown={(e) => { e.preventDefault(); fmt("insertUnorderedList"); }} style={toolBtn}><List size={14} /></button>
        <button disabled style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, opacity: 0.5, cursor: "not-allowed", background: primary, color: getContrastColor(primary), border: "none", borderRadius: 8, padding: "0.5rem 1rem", fontSize: 13, fontWeight: 600 }}>
          <Send size={14} /> {t("candidate.emailComposer.send")}
        </button>
      </div>
    </div>
  );
}
