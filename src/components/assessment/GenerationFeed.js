"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, Sparkles, FileText, Building2, ListChecks, Target, Contact, AlertTriangle, Database, Terminal, Brain, Eye, PencilLine } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { LOCALE_LABELS } from "@/lib/i18n/config";

// ─── Consommation du flux de génération ──────────────────────────────────────
// Partagé par les deux points d'entrée (chat de conception et génération
// directe) : un seul endroit qui sait lire le NDJSON de
// /api/experience/generate, donc un seul comportement à maintenir.
// Les échecs de cette fonction remontent dans un toast. Comme elle n'est pas un
// composant, elle renvoie des CLÉS de traduction plutôt que des phrases : c'est
// l'appelant, qui a t() en portée, qui les résout via translateFeedError().
const KEY_COULD_NOT_START = "dashboard.generationFeed.couldNotStart";
const KEY_INTERRUPTED = "dashboard.generationFeed.interrupted";
const KEY_UNEXPECTED = "dashboard.generationFeed.unexpectedError";

/** Traduit une erreur remontée par le flux, ou la relaie si elle vient du serveur. */
export function translateFeedError(t, error) {
  if (!error) return null;
  return error.startsWith("dashboard.generationFeed.") ? t(error) : error;
}

export async function streamExperienceGeneration(jobId, additionalContext, onEvent) {
  try {
    const resp = await fetch("/api/experience/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, additionalContext: additionalContext || "" }),
    });
    if (!resp.ok || !resp.body) {
      const err = await resp.json().catch(() => ({}));
      // Une clé, pas un texte : cette fonction n'est pas un composant et n'a
      // pas accès à t(). C'est l'appelant qui traduit — voir plus bas.
      throw new Error(err.error || KEY_COULD_NOT_START);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = { success: false, error: KEY_INTERRUPTED };

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
    return { success: false, error: e?.message || KEY_UNEXPECTED };
  }
}

// ─── Feed de génération ───────────────────────────────────────────────────────
// Chaque entrée correspond à un événement RÉEL du pipeline serveur, reçu en
// streaming. Rien n'est préparé à l'avance : les étapes et les critères BARS
// apparaissent au fur et à mesure que le modèle les écrit.
// Clés de traduction, pas libellés : ces constantes sont évaluées au
// chargement du module, avant que le provider i18n existe.
const STEP_KIND_KEY = {
  qualifying: 'dashboard.generationFeed.kinds.qualifying',
  question: 'dashboard.generationFeed.kinds.question',
  task: 'dashboard.generationFeed.kinds.task',
  classic_qcm: 'dashboard.generationFeed.kinds.classic_qcm',
};

// Les entrées "enfant" sont indentées sous l'étape à laquelle elles se rattachent.
const NESTED = new Set(['skill', 'criterion', 'source', 'field', 'trap', 'code_test']);

// Renvoie l'élément, pas le composant : un composant créé pendant le rendu
// serait remonté à chaque passe (react-hooks/static-components).
function feedIcon(kind, size = 13) {
  switch (kind) {
    case 'job': return <FileText size={size} />;
    case 'context': return <Building2 size={size} />;
    case 'brief': return <Target size={size} />;
    case 'design_start': return <Sparkles size={size} />;
    case 'reflexion': return <Brain size={size} />;
    case 'critique_start':
    case 'critique_ok': return <Eye size={size} />;
    case 'critique_fix': return <PencilLine size={size} />;
    case 'step': return <ListChecks size={size} />;
    case 'skill': return <Target size={size} />;
    case 'crm_start': return <Contact size={size} />;
    case 'code_start':
    case 'code_test': return <Terminal size={size} />;
    case 'trap': return <AlertTriangle size={size} />;
    case 'version':
    case 'saved': return <Database size={size} />;
    default: return <Check size={size} />;
  }
}

// `t` en paramètre : cette fonction est appelée depuis FeedLine, qui l'a en
// portée. La sortir du composant garde le rendu lisible.
//
// Les `e.label` NE SONT PAS traduits : ce sont les titres d'étapes, noms de
// compétences et libellés de champs que le modèle vient d'écrire, dans la
// langue de l'offre. Seul le cadre autour se traduit.
function feedText(t, e) {
  switch (e.kind) {
    case 'step': {
      const kindKey = STEP_KIND_KEY[e.stepKind];
      const kind = kindKey ? t(kindKey) : (e.stepKind || t('dashboard.generationFeed.step'));
      return t('dashboard.generationFeed.stepLine', { n: e.n, kind, label: e.label });
    }
    case 'skill': return t('dashboard.generationFeed.skillLine', { label: e.label });
    case 'criterion': return t('dashboard.generationFeed.criterionLine', { label: e.label });
    case 'source': {
      const connu = ['email', 'call_transcript', 'chat', 'note'].includes(e.label);
      const label = connu ? t(`dashboard.generationFeed.sourceKinds.${e.label}`) : e.label;
      return t('dashboard.generationFeed.sourceLine', { label });
    }
    case 'field': return t('dashboard.generationFeed.fieldLine', { label: e.label });
    case 'trap': return t('dashboard.generationFeed.trapLine', { label: e.label });

    // Les événements de progression ne portent QUE des données : le serveur ne
    // fabrique plus de phrase. Sans ça, la moitié du flux restait en français
    // pour un recruteur anglophone — le contenu généré, lui, était bien dans la
    // langue de l'offre.
    case 'job':
      return t(e.nbSkills ? 'dashboard.generationFeed.jobLine' : 'dashboard.generationFeed.jobLineNoSkill',
        { title: e.title || t('dashboard.generationFeed.untitledJob'), count: e.nbSkills });
    case 'context':
      if (!e.charge) return t('dashboard.generationFeed.contextNone');
      return e.industry
        ? t('dashboard.generationFeed.contextLine', { industry: e.industry })
        : t('dashboard.generationFeed.contextLoaded');
    case 'brief': return t('dashboard.generationFeed.brief');
    case 'locale':
      return t('dashboard.generationFeed.localeLine', { label: LOCALE_LABELS[e.locale] || e.locale });
    case 'reflexion': return t('dashboard.generationFeed.reflexion');
    case 'design_start': return t('dashboard.generationFeed.designStart');
    case 'critique_start': return t('dashboard.generationFeed.critiqueStart');
    case 'critique_ok': return t('dashboard.generationFeed.critiqueOk');
    case 'critique_fix':
      return t('dashboard.generationFeed.critiqueFix', { n: e.n, label: e.label || t('dashboard.generationFeed.thisStep') });
    case 'design_done':
      return t('dashboard.generationFeed.designDone', { count: e.nbEtapes })
        + (e.minutes ? t('dashboard.generationFeed.designMinutes', { minutes: e.minutes }) : '');
    case 'code_start':
      return t('dashboard.generationFeed.codeStart', { label: e.label || t('dashboard.generationFeed.thisStep') });
    case 'crm_start':
      return t('dashboard.generationFeed.crmStart', { label: e.label || t('dashboard.generationFeed.thisStep') });
    case 'code_test':
      return t('dashboard.generationFeed.codeTest', { count: e.nbTests, hidden: e.nbCaches });
    case 'retry': return t('dashboard.generationFeed.retry');
    case 'version':
      return t(e.version > 1 ? 'dashboard.generationFeed.newVersion' : 'dashboard.generationFeed.firstVersion',
        { version: e.version });
    case 'saved':
      return t('dashboard.generationFeed.saved', { steps: e.nbEtapes, subDims: e.nbSubDims });
    case 'done': return t('dashboard.generationFeed.done');

    default: return e.label || '';
  }
}

export default function GenerationFeed({ events, active }) {
  const t = useT();
  return (
    <div style={{ padding: '4px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary)', marginBottom: 2 }}>
        {active ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
        {active
          ? t("dashboard.generationFeed.generating")
          : t("dashboard.generationFeed.generated")}
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
  const t = useT();
  const text = feedText(t, event);
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
