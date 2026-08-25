"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, Play, Loader2, Check, X, EyeOff, AlertTriangle } from "lucide-react";
import { getContrastColor, DEFAULT_PRIMARY } from "./candidateUi";
import { useT } from "@/lib/i18n/I18nProvider";

// Éditeur de code + exécution réelle des tests.
//
// Ce qui arrive ici dans `config` est DÉJÀ filtré côté serveur
// (sanitizeStepForCandidate) : les cas de test cachés n'y figurent pas, seul
// leur nombre est connu. Rien de ce composant ne doit donc chercher à les
// afficher — il n'en a pas les données, et c'est voulu.
//
// L'exécution passe par `onRun`, une server action fournie par la page du run :
// la clé du fournisseur d'exécution ne quitte jamais le serveur.

const C = {
  bg: "#0f172a", bar: "#1e293b", border: "#334155",
  text: "#e2e8f0", muted: "#94a3b8", ok: "#22c55e", ko: "#f87171",
};

export default function CodeSandbox({ config, value, onChange, onRun, primary = DEFAULT_PRIMARY }) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(null);

  const tests = config?.tests || [];
  const hiddenCount = config?.hidden_count || 0;
  const hasTests = tests.length > 0 || hiddenCount > 0;

  // Le squelette de départ n'est posé qu'une fois : le candidat doit pouvoir
  // tout effacer sans le voir revenir à chaque rendu.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (!value && config?.starter_code) onChange(config.starter_code);
  }, [value, config, onChange]);

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const res = await onRun(value || "");
      if (!res?.success) {
        setError(res?.error || "generic");
        if (typeof res?.attemptsLeft === "number") setAttemptsLeft(res.attemptsLeft);
        return;
      }
      setResult(res);
      setAttemptsLeft(res.attemptsLeft);
    } catch (e) {
      console.error("runCode failed:", e);
      setError("generic");
    } finally {
      setRunning(false);
    }
  }

  // Tab indente au lieu de sortir du champ — sans ça l'éditeur est pénible.
  // Shift+Tab reste la sortie au clavier, pour ne pas piéger la navigation.
  function handleKeyDown(e) {
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const el = e.target;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onChange(`${el.value.slice(0, start)}  ${el.value.slice(end)}`);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
  }

  const outOfRuns = attemptsLeft === 0;
  const canRun = hasTests && !running && !outOfRuns;

  return (
    <div style={{ border: `1px solid ${C.border}`, borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: C.bg }}>
      <div style={{ background: C.bar, color: "#cbd5e1", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, fontSize: 12, borderBottom: `1px solid ${C.border}` }}>
        <Terminal size={14} />
        <span>{t("candidate.sandbox.codeTitle")}</span>
        {config?.language && (
          <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, color: C.muted }}>
            {config.language}
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        </div>
      </div>

      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("candidate.sandbox.codePlaceholder")}
        style={{ width: "100%", padding: "16px", minHeight: 300, maxHeight: 480, overflowY: "auto", boxSizing: "border-box", overflowWrap: "break-word", border: "none", resize: "vertical", fontSize: 14, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, outline: "none", background: C.bg, color: C.text }}
        spellCheck="false"
      />

      {hasTests ? (
        <div style={{ background: C.bar, borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={handleRun}
            disabled={!canRun}
            style={{
              background: primary, color: getContrastColor(primary), border: "none", borderRadius: 8,
              padding: "8px 16px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
              cursor: canRun ? "pointer" : "not-allowed", opacity: canRun ? 1 : 0.5,
            }}
          >
            {running
              ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              : <Play size={14} />}
            {running ? t("candidate.sandbox.code.running") : t("candidate.sandbox.code.run")}
          </button>

          {result && (
            <span style={{ fontSize: 13, fontWeight: 600, color: result.summary.passed === result.summary.total ? C.ok : C.ko }}>
              {t("candidate.sandbox.code.summary", { passed: result.summary.passed, total: result.summary.total })}
            </span>
          )}

          <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.muted }}>
            {attemptsLeft == null
              ? (hiddenCount > 0 ? t("candidate.sandbox.code.hiddenTests", { count: hiddenCount }) : "")
              : t("candidate.sandbox.code.attemptsLeft", { count: attemptsLeft })}
          </span>
        </div>
      ) : (
        <div style={{ background: C.bar, borderTop: `1px solid ${C.border}`, padding: "10px 16px", fontSize: 12, color: C.muted }}>
          {t("candidate.sandbox.code.noTests")}
        </div>
      )}

      {error && (
        <div style={{ background: "#450a0a", borderTop: `1px solid ${C.border}`, color: "#fecaca", padding: "12px 16px", fontSize: 13, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t(`candidate.sandbox.code.errors.${error}`)}</span>
        </div>
      )}

      {result && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {result.compileError && (
            <div style={{ background: "#450a0a", color: "#fecaca", borderRadius: 8, padding: "10px 12px", fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("candidate.sandbox.code.compileError")}</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{result.compileError}</pre>
            </div>
          )}

          {result.results.map((r, i) => <TestRow key={i} r={r} t={t} />)}

          {result.hiddenResults.map((r, i) => (
            <div key={`h${i}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.muted }}>
              {r.passed
                ? <Check size={14} style={{ color: C.ok }} />
                : <X size={14} style={{ color: C.ko }} />}
              <EyeOff size={13} />
              <span>{t("candidate.sandbox.code.hiddenTest", { n: i + 1 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Un cas visible : on montre l'entrée, l'attendu et l'obtenu. C'est le contrat
// d'un test visible — il sert à comprendre, pas à piéger.
function TestRow({ r, t }) {
  const empty = t("candidate.sandbox.code.empty");
  const show = (v) => (String(v ?? "").trim() === "" ? empty : v);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: C.bar, fontSize: 13, color: C.text }}>
        {r.passed
          ? <Check size={14} style={{ color: C.ok }} />
          : <X size={14} style={{ color: C.ko }} />}
        <span style={{ fontWeight: 600 }}>{r.name}</span>
        {!r.passed && r.verdict !== "ok" && (
          <span style={{ color: C.ko, fontSize: 11.5 }}>{t(`candidate.sandbox.code.verdicts.${r.verdict}`)}</span>
        )}
        {r.time != null && <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>{r.time}s</span>}
      </div>
      {!r.passed && (
        <div style={{ padding: "10px 12px", display: "grid", gap: 6, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: C.text }}>
          <Line label={t("candidate.sandbox.code.input")} value={show(r.stdin)} />
          <Line label={t("candidate.sandbox.code.expected")} value={show(r.expected)} />
          <Line label={t("candidate.sandbox.code.got")} value={show(r.stderr || r.stdout)} />
        </div>
      )}
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
      <span style={{ color: C.muted, flexShrink: 0, width: 64 }}>{label}</span>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", minWidth: 0 }}>{value}</pre>
    </div>
  );
}
