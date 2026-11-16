"use client";

// La conversation avec l'agent de conception d'une simulation d'onboarding
// (16/11/2026, /api/chat/module). L'agent ouvre l'échange en demandant le
// scénario ; quand il a ce qu'il faut, il remet un RÉCAPITULATIF (scénario,
// objectif, objections, ce qu'il faut savoir, grille) affiché ici avec le
// bouton « Générer ». Le manager peut continuer à parler pour le corriger.
//
// Le fil vit ici le temps de la création : rien n'est écrit en base avant
// la génération.

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Le premier message, envoyé pour que l'agent ouvre l'échange : jamais affiché.
const OUVERTURE = "[Ouverture : présente-toi en une phrase et pose ta première question sur le scénario.]";

/** Les messages lisibles d'un fil : le texte du manager et celui de l'agent. */
function affichables(messages) {
  const out = [];
  for (const m of messages) {
    if (m.role === "user") {
      const texte = typeof m.content === "string" ? m.content : (m.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      if (texte && texte !== OUVERTURE) out.push({ role: "user", texte });
    } else {
      const texte = (m.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      if (texte) out.push({ role: "assistant", texte });
    }
  }
  return out;
}

export default function ChatConception({ cadre, onGenerer, generation = false }) {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.sims.agent.${cle}`, vars);
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState("");
  const [attente, setAttente] = useState(false);
  const [erreur, setErreur] = useState("");
  const [recap, setRecap] = useState(null);
  const bas = useRef(null);
  const ouvert = useRef(false);

  async function envoyer(fil) {
    setAttente(true);
    setErreur("");
    try {
      const resp = await fetch("/api/chat/module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: fil, cadre, locale }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || k("error"));
      setMessages(data.messages);
      if (data.recap) setRecap(data.recap);
    } catch (e) {
      setErreur(e.message || k("error"));
      setMessages(fil);
    } finally {
      setAttente(false);
    }
  }

  // L'agent ouvre l'échange, une fois.
  useEffect(() => {
    if (ouvert.current) return;
    ouvert.current = true;
    envoyer([{ role: "user", content: OUVERTURE }]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, recap, attente]);

  function soumettre(e) {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte || attente) return;
    setSaisie("");
    envoyer([...messages, { role: "user", content: texte }]);
  }

  const lignes = affichables(messages);
  const b = recap?.brief || {};
  const competences = recap?.criteres?.hard_skills || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 460, overflowY: "auto", padding: 2 }}>
        {lignes.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
            background: m.role === "user" ? "var(--ds-blue)" : "var(--ds-page)", color: m.role === "user" ? "#fff" : "var(--ds-ink)",
            border: m.role === "user" ? "none" : "1px solid var(--ds-line)", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {m.texte}
          </div>
        ))}
        {attente && (
          <div style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ds-ink-3)" }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> {k("thinking")}
          </div>
        )}
        {erreur && <p style={{ fontSize: 13, color: "var(--ds-red)" }}>{erreur}</p>}

        {recap && (
          <div style={{ border: "1px solid var(--ds-blue)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "#fff" }}>
            <span className="ds-eyebrow">{k("recapTitle")}</span>
            <b style={{ fontSize: 15, fontWeight: 600 }}>{recap.title}</b>
            {b.scenario && <p style={{ fontSize: 13, lineHeight: 1.55 }}><b style={{ fontWeight: 600 }}>{k("scenario")} : </b>{b.scenario}</p>}
            {b.objectif && <p style={{ fontSize: 13, lineHeight: 1.55 }}><b style={{ fontWeight: 600 }}>{k("goal")} : </b>{b.objectif}</p>}
            {[["objections", b.objections], ["toKnow", b.a_savoir], ["success", b.reussite]].filter(([, l]) => l?.length).map(([cle, l]) => (
              <div key={cle} style={{ fontSize: 13 }}>
                <b style={{ fontWeight: 600 }}>{k(cle)} :</b>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18, lineHeight: 1.5 }}>{l.map((x, i) => <li key={i}>{x}</li>)}</ul>
              </div>
            ))}
            {competences.length > 0 && (
              <div style={{ fontSize: 13, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <b style={{ fontWeight: 600 }}>{k("scorecard")} :</b>
                {competences.map((c) => <span key={c.name} className={`ds-chip ${c.priority === "must_have" ? "ds-chip-blue" : ""}`}>{c.name}</span>)}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="ds-help" style={{ flex: 1 }}>{k("recapHint")}</span>
              <button type="button" className="ds-btn ds-btn-primary" onClick={() => onGenerer(recap)} disabled={generation || attente}>
                {generation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />} {k("generate")}
              </button>
            </div>
          </div>
        )}
        <span ref={bas} />
      </div>

      <form onSubmit={soumettre} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
        <textarea className="ds-textarea" rows={2} value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder={k("placeholder")}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) soumettre(e); }} style={{ flex: 1, resize: "vertical" }} disabled={generation} />
        <button type="submit" className="ds-btn ds-btn-primary" disabled={attente || !saisie.trim() || generation} aria-label={k("send")}><Send size={14} /></button>
      </form>
    </div>
  );
}
