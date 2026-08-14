"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, Sparkles, FileText, Building2, ListChecks, Target, Contact, AlertTriangle, Database } from "lucide-react";

// ─── Consommation du flux de génération ──────────────────────────────────────
// Partagé par les deux points d'entrée (chat de conception et génération
// directe) : un seul endroit qui sait lire le NDJSON de
// /api/experience/generate, donc un seul comportement à maintenir.
export async function streamExperienceGeneration(jobId, additionalContext, onEvent) {
  try {
    const resp = await fetch("/api/experience/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, additionalContext: additionalContext || "" }),
    });
    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || "La génération n'a pas pu démarrer.");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = { success: false, error: "La génération s'est interrompue." };

    // Une ligne = un événement. Le dernier fragment d'un chunk peut être
    // incomplet : on le garde pour la lecture suivante.
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
        if (msg.type === "event") onEvent(msg);
        else if (msg.type === "result") result = msg;
      }
    }
    return result;
  } catch (e) {
    return { success: false, error: e?.message || "Erreur inattendue" };
  }
}

// ─── Feed de génération ───────────────────────────────────────────────────────
// Chaque entrée correspond à un événement RÉEL du pipeline serveur, reçu en
// streaming. Rien n'est préparé à l'avance : les étapes et les critères BARS
// apparaissent au fur et à mesure que le modèle les écrit.
const STEP_KIND_LABEL = {
  qualifying: 'Question qualifiante',
  question: 'Question ciblée',
  task: 'Mise en situation',
  classic_qcm: 'QCM',
};

// Les entrées "enfant" sont indentées sous l'étape à laquelle elles se rattachent.
const NESTED = new Set(['skill', 'criterion', 'source', 'field', 'trap']);

// Renvoie l'élément, pas le composant : un composant créé pendant le rendu
// serait remonté à chaque passe (react-hooks/static-components).
function feedIcon(kind, size = 13) {
  switch (kind) {
    case 'job': return <FileText size={size} />;
    case 'context': return <Building2 size={size} />;
    case 'brief': return <Target size={size} />;
    case 'design_start': return <Sparkles size={size} />;
    case 'step': return <ListChecks size={size} />;
    case 'skill': return <Target size={size} />;
    case 'crm_start': return <Contact size={size} />;
    case 'trap': return <AlertTriangle size={size} />;
    case 'version':
    case 'saved': return <Database size={size} />;
    default: return <Check size={size} />;
  }
}

function feedText(e) {
  switch (e.kind) {
    case 'step': return `Étape ${e.n} — ${STEP_KIND_LABEL[e.stepKind] || e.stepKind || 'Étape'} : ${e.label}`;
    case 'skill': return `Compétence évaluée : ${e.label}`;
    case 'criterion': return `Sous-dimension : ${e.label}`;
    case 'source': return `Source du brief : ${{ email: 'email', call_transcript: "retranscription d'appel", chat: 'message entrant', note: 'note interne' }[e.label] || e.label}`;
    case 'field': return `Champ de la fiche : ${e.label}`;
    case 'trap': return `Incohérence volontaire : ${e.label}`;
    default: return e.label;
  }
}

export default function GenerationFeed({ events, active }) {
  return (
    <div style={{ padding: '4px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', marginBottom: 2 }}>
        {active ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
        {active ? "Génération de l'expérience…" : "Expérience générée"}
      </div>
      {events.map((e, i) => (
        <FeedLine
          key={i}
          event={e}
          isLast={i === events.length - 1}
          active={active}
        />
      ))}
    </div>
  );
}

function FeedLine({ event, isLast, active }) {
  const text = feedText(event);
  const nested = NESTED.has(event.kind);
  const running = active && isLast;

  // Révélation progressive : le libellé arrive d'un bloc du serveur (il est
  // court), c'est son AFFICHAGE qui se déroule. Le moment d'apparition de la
  // ligne, lui, est bien celui de l'événement réel.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let n = 0;
    const id = setInterval(() => {
      n += 2;
      setShown(n);
      if (n >= text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      paddingLeft: nested ? 22 : 0,
      animation: 'fadeIn .2s ease',
    }}>
      <div style={{
        width: 16, height: 16, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: running ? 'var(--primary)' : nested ? 'var(--muted-foreground)' : '#166534',
      }}>
        {running
          ? <Loader2 size={12} className="spin" />
          : nested
            ? <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor' }} />
            : feedIcon(event.kind)}
      </div>
      <span style={{
        fontSize: nested ? 12 : 12.5,
        lineHeight: 1.5,
        color: nested ? 'var(--muted-foreground)' : 'var(--foreground)',
        fontWeight: nested ? 400 : 500,
        overflowWrap: 'anywhere',
      }}>
        {text.slice(0, shown)}
      </span>
    </div>
  );
}
