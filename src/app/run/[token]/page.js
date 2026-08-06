"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { startRun, saveStepResponse, submitRun } from "@/lib/actions/run";
import ResponseRecorder from "@/components/assessment/ResponseRecorder";
import AssistantPanel from "@/components/assessment/AssistantPanel";
import SandboxRenderer from "@/components/assessment/SandboxRenderer";

export default function RunPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [run, setRun] = useState(null);
  const [experience, setExperience] = useState(null);
  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [steps, setSteps] = useState([]);
  const [answers, setAnswers] = useState({}); // stepId -> { text, choice, selected_index }
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { load(); }, [token]);

  async function load() {
    setLoading(true);
    const res = await startRun(token);
    if (!res.success) { setError(res.error); setLoading(false); return; }
    setRun(res.run);
    setExperience(res.experience);
    setJob(res.job);
    setRecruiter(res.recruiter);
    setSteps(res.steps);
    setSubmitted(res.run.status === "submitted" || res.run.status === "scored");
    // Préremplir depuis les réponses existantes
    const a = {};
    for (const r of res.responses || []) {
      a[r.step_id] = { text: r.text_answer || "", choice: r.meta?.choice, selected_index: r.meta?.selected_index, videoSaved: !!r.video_url };
    }
    setAnswers(a);
    setLoading(false);
  }

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  function setAnswer(field, value) {
    setAnswers((p) => ({ ...p, [step.id]: { ...(p[step.id] || {}), [field]: value } }));
  }

  async function persistCurrent() {
    if (!step) return true;
    const ans = answers[step.id] || {};
    if (step.response_format === "video") return true; // géré par ResponseRecorder
    const payload = { text_answer: null, meta: {} };
    if (step.response_format === "text" || step.response_format === "code") {
      payload.text_answer = ans.text || "";
    } else if (step.response_format === "choice") {
      payload.meta = { choice: ans.choice || null };
    } else if (step.response_format === "qcm") {
      payload.meta = { selected_index: ans.selected_index ?? null };
    }
    const res = await saveStepResponse(token, step.id, payload);
    return res.success;
  }

  async function next() {
    setSaving(true);
    const ok = await persistCurrent();
    setSaving(false);
    if (!ok) { setError("Impossible d'enregistrer la réponse."); return; }
    if (isLast) {
      const res = await submitRun(token);
      if (res.success) setSubmitted(true);
      else setError(res.error || "Échec de la soumission");
    } else {
      setIdx((i) => i + 1);
    }
  }

  if (loading) return <Center><Loader2 size={30} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} /></Center>;
  if (error && !steps.length) return <Center><div className="card" style={{ padding: "2.5rem", textAlign: "center", maxWidth: 420 }}><div style={{ fontSize: 40, marginBottom: 12 }}>⛔</div><p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{error}</p></div></Center>;

  const pageStyle = recruiter?.brand_primary_color
    ? { "--primary": recruiter.brand_primary_color }
    : {};

  if (submitted) {
    return (
      <Center style={pageStyle}>
        <div className="card" style={{ padding: "3rem 2rem", textAlign: "center", maxWidth: 480, width: "100%" }}>
          {recruiter?.company_logo_url && (
            <div style={{ marginBottom: "2rem" }}>
              <img src={recruiter.company_logo_url} alt={recruiter?.company_name || "Logo"} style={{ height: 48, width: "auto", margin: "0 auto", borderRadius: 8, objectFit: "contain" }} />
            </div>
          )}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}><Check size={28} /></div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>Merci, c'est terminé !</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Vos réponses ont bien été soumises à {recruiter?.company_name || job?.company || "l'équipe recrutement"}. Vous pouvez maintenant fermer cet onglet.</p>
        </div>
      </Center>
    );
  }

  const pct = Math.round(((idx + 1) / steps.length) * 100);
  const ans = answers[step.id] || {};
  const isSidebarMode = step.ai_assistant_allowed;
  const containerMaxWidth = isSidebarMode ? 1040 : 720;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.5rem", ...pageStyle }}>
      {/* Header Brandé */}
      <div style={{ maxWidth: containerMaxWidth, margin: "0 auto 2rem", display: "flex", alignItems: "center", gap: "1rem", transition: "max-width 0.3s" }}>
        {recruiter?.company_logo_url ? (
          <img src={recruiter.company_logo_url} alt="Logo" style={{ height: 40, width: "auto", borderRadius: 6, objectFit: "contain", background: "white", padding: "4px" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 18 }}>
            {(recruiter?.company_name || job?.company || "O")[0].toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--foreground)" }}>{recruiter?.company_name || job?.company}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{job?.title}</div>
        </div>
      </div>

      <div style={{ maxWidth: containerMaxWidth, margin: "0 auto", transition: "max-width 0.3s" }}>
        {/* Progression */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>
            <span>Étape {idx + 1} / {steps.length}</span>
            {experience?.estimated_minutes ? <span>~{experience.estimated_minutes} min</span> : null}
          </div>
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", transition: "width .3s" }} />
          </div>
        </div>

        <div style={{ display: isSidebarMode ? "grid" : "block", gridTemplateColumns: isSidebarMode ? "1fr 340px" : "1fr", gap: "2rem", alignItems: "start" }}>
          {/* Main Column — minWidth:0 essentiel : sans ça, un enfant de grid ne
              rétrécit pas sous sa largeur de contenu et un texte long déborde du bloc. */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
            <div className="card" style={{ padding: "1.75rem", minWidth: 0, overflowWrap: "break-word" }}>
              {step.title && <h2 style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.75rem", overflowWrap: "break-word" }}>{step.title}</h2>}
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", marginBottom: "1.5rem" }}>{step.prompt}</p>

              {/* Renderer selon le format de réponse (paramètre du step) */}
              {["text", "email_reply", "client_reply", "technical_architecture", "code", "code_editor"].includes(step.response_format) && (
                <SandboxRenderer format={step.response_format} value={ans.text} onChange={(val) => setAnswer("text", val)} />
              )}

              {step.response_format === "choice" && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {["yes", "no"].map((v) => (
                    <button key={v} onClick={() => setAnswer("choice", v)}
                      className={`btn ${ans.choice === v ? "btn-primary" : "btn-outline"}`} style={{ flex: 1 }}>
                      {v === "yes" ? "Oui" : "Non"}
                    </button>
                  ))}
                </div>
              )}

              {step.response_format === "qcm" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(step.config?.options || []).map((opt, i) => (
                    <button key={i} onClick={() => setAnswer("selected_index", i)}
                      className={`btn ${ans.selected_index === i ? "btn-primary" : "btn-outline"}`}
                      style={{ justifyContent: "flex-start", textAlign: "left", whiteSpace: "normal", wordBreak: "break-word", height: "auto", minHeight: 40 }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {step.response_format === "video" && (
                <ResponseRecorder token={token} stepId={step.id} existingVideoUrl={ans.videoSaved}
                  onSaved={() => setAnswer("videoSaved", true)} />
              )}
            </div>
            
            {error && <p style={{ color: "#991b1b", fontSize: 13 }}>{error}</p>}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-ghost" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ArrowLeft size={16} /> Précédent
              </button>
              <button className="btn btn-primary" onClick={next} disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : isLast ? <Check size={16} /> : <ArrowRight size={16} />}
                {isLast ? "Terminer" : "Suivant"}
              </button>
            </div>
          </div>

          {/* Sidebar Column */}
          {isSidebarMode && (
            <div style={{ position: "sticky", top: "2rem" }}>
              <AssistantPanel token={token} stepId={step.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children, style }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8fafc", padding: "2rem", ...style }}>{children}</div>;
}

const taStyle = {
  width: "100%", padding: "12px", borderRadius: 10, border: "1px solid var(--border)",
  fontSize: 14, fontFamily: "inherit", lineHeight: 1.6, resize: "vertical",
  background: "var(--background)", color: "var(--foreground)",
};
