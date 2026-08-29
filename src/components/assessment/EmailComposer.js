"use client";

import { useRef, useState, useEffect } from "react";
import { Send, Bold, Italic, List, Maximize2, Minimize2 } from "lucide-react";
import { getContrastColor, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Composeur d'email réaliste (type Gmail) : champs À / Cc / Objet + corps avec
// mise en forme basique (gras, italique, liste). La valeur est sérialisée en une
// seule chaîne (compatible text_answer / scoring) ; corps vide => valeur vide
// (la validation "réponse obligatoire" reste correcte).
//
// Les en-têtes n'ont plus de libellé dans une colonne à gauche : le nom du champ
// EST son placeholder, comme dans les clients mail récents. Il passe donc par le
// dictionnaire — « À » était écrit en dur et s'affichait en français au milieu
// d'un sandbox anglais.

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
  // Plein écran : pour écrire un long email sans rester à l'étroit dans la colonne.
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef(null);

  // Initialise le corps une seule fois (contentEditable non contrôlé par React).
  useEffect(() => { if (bodyRef.current) bodyRef.current.innerText = init.current.body; }, []);

  // Échap referme le plein écran, et la page dessous ne défile pas pendant ce
  // temps — sinon on perd sa position dans l'énoncé en refermant.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e) => { if (e.key === "Escape") setExpanded(false); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [expanded]);

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

  const headerRow = { display: "flex", alignItems: "center", gap: 8, padding: "13px 18px", borderBottom: "1px solid var(--border)", fontSize: 14, flexShrink: 0 };
  const headerInput = { flex: 1, border: "none", outline: "none", fontSize: 14, background: "transparent", color: "var(--foreground)", fontFamily: "inherit" };
  const toolBtn = { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 32, border: "1px solid var(--border)", borderRadius: 8, background: "white", cursor: "pointer", color: "var(--foreground)" };

  return (
    <>
      {/* Voile du plein écran — rendu AVANT le bloc pour rester derrière lui.
          Slot conditionnel stable : le bloc garde sa place dans l'arbre, donc le
          contentEditable n'est pas remonté et le brouillon en cours ne se perd pas. */}
      {expanded && (
        <div onClick={() => setExpanded(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", zIndex: 90 }} />
      )}

      <div style={{
        border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", background: "white",
        display: "flex", flexDirection: "column",
        ...(expanded
          ? { position: "fixed", inset: "clamp(12px, 4vh, 48px)", zIndex: 100, boxShadow: "0 24px 60px rgba(15,23,42,.25)" }
          : {}),
      }}>
        <style>{`[data-placeholder]:empty:before{content:attr(data-placeholder);color:var(--muted-foreground);pointer-events:none;}`}</style>

        {/* Barre de titre façon fenêtre de composition */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", padding: "12px 14px 12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--foreground)" }}>{t("candidate.emailComposer.newMessage")}</span>
          <button onClick={() => setExpanded((v) => !v)}
            title={expanded ? t("candidate.emailComposer.collapse") : t("candidate.emailComposer.expand")}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", borderRadius: 6, background: "transparent", cursor: "pointer", color: "var(--muted-foreground)" }}>
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Destinataire + bascule Cc */}
        <div style={headerRow}>
          <input value={to} onChange={(e) => { setTo(e.target.value); push({ to: e.target.value }); }}
            placeholder={t("candidate.emailComposer.to")} style={headerInput} />
          {!showCc && (
            <button onClick={() => setShowCc(true)} style={{ border: "none", background: "transparent", color: "var(--muted-foreground)", fontSize: 13, cursor: "pointer", flexShrink: 0 }}>Cc</button>
          )}
        </div>

        {/* Cc (optionnel) — « Cc » s'écrit pareil dans les trois langues. */}
        {showCc && (
          <div style={headerRow}>
            <input value={cc} onChange={(e) => { setCc(e.target.value); push({ cc: e.target.value }); }}
              placeholder="Cc" style={headerInput} />
          </div>
        )}

        {/* Objet */}
        <div style={headerRow}>
          <input value={subject} onChange={(e) => { setSubject(e.target.value); push({ subject: e.target.value }); }}
            placeholder={t("candidate.emailComposer.subject")} style={headerInput} />
        </div>

        {/* Corps éditable — en plein écran il prend toute la hauteur restante. */}
        <div
          ref={bodyRef}
          contentEditable
          suppressContentEditableWarning
          onInput={() => push()}
          data-placeholder={t("candidate.emailComposer.bodyPlaceholder")}
          style={{
            flex: expanded ? 1 : "none",
            minHeight: expanded ? 0 : 260,
            maxHeight: expanded ? "none" : 480,
            overflowY: "auto", padding: "18px", fontSize: 14.5, lineHeight: 1.65, outline: "none",
            overflowWrap: "break-word", whiteSpace: "pre-wrap",
          }}
        />

        {/* Barre d'outils + envoyer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderTop: "1px solid var(--border)", background: "#f8fafc", flexShrink: 0 }}>
          <button title={t("candidate.emailComposer.bold")} onMouseDown={(e) => { e.preventDefault(); fmt("bold"); }} style={toolBtn}><Bold size={15} /></button>
          <button title={t("candidate.emailComposer.italic")} onMouseDown={(e) => { e.preventDefault(); fmt("italic"); }} style={toolBtn}><Italic size={15} /></button>
          <button title={t("candidate.emailComposer.bulletList")} onMouseDown={(e) => { e.preventDefault(); fmt("insertUnorderedList"); }} style={toolBtn}><List size={15} /></button>
          {/* Décoratif : la réponse est enregistrée en continu et validée par
              « Suivant ». Le bouton reste donc visiblement inactif — un Send
              franc laisserait croire que l'email part pour de vrai. */}
          <button disabled style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, opacity: 0.5, cursor: "not-allowed", background: primary, color: getContrastColor(primary), border: "none", borderRadius: 10, padding: "0.55rem 1.15rem", fontSize: 13.5, fontWeight: 600 }}>
            <Send size={15} /> {t("candidate.emailComposer.send")}
          </button>
        </div>
      </div>
    </>
  );
}
