"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { startRun, saveStepResponse, submitRun, checkCrmAnswer } from "@/lib/actions/run";
import ResponseRecorder from "@/components/assessment/ResponseRecorder";
import AssistantPanel from "@/components/assessment/AssistantPanel";
import SandboxRenderer from "@/components/assessment/SandboxRenderer";
import { primaryBtn, pillBtn, ghostBtn, optionBtn, container, heading, focusStyle, getContrastColor, PAGE_BG, DEFAULT_PRIMARY } from "@/components/assessment/candidateUi";

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
  const [showIntro, setShowIntro] = useState(false); // écran d'accueil avant la 1re étape
  const [crmNotice, setCrmNotice] = useState(null);  // avertissement CRM (une fois par étape)

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
    const stepList = res.steps || [];
    const responses = res.responses || [];
    // Reprend l'étape après la plus loin déjà répondue (déduit des réponses
    // enregistrées — le pointeur n'est plus purement client, il survit au
    // rechargement / à la redirection /assessment -> /run).
    const orderById = Object.fromEntries(stepList.map((s, i) => [s.id, i]));
    let furthest = -1;
    for (const r of responses) {
      const i = orderById[r.step_id];
      if (i != null && i > furthest) furthest = i;
    }
    const resumeIdx = Math.min(furthest + 1, Math.max(stepList.length - 1, 0));
    setIdx(resumeIdx);
    // Écran d'accueil : seulement au tout début (aucune progression, run actif)
    setShowIntro(resumeIdx === 0 && responses.length === 0 && res.run.status === "in_progress");
    // Préremplir depuis les réponses existantes
    const a = {};
    for (const r of responses) {
      a[r.step_id] = {
        text: r.text_answer || "",
        choice: r.meta?.choice,
        selected_index: r.meta?.selected_index,
        videoSaved: !!r.video_url,
        // Fiche CRM : on repeuple depuis la donnée structurée, pas depuis
        // text_answer (qui n'est qu'un rendu lisible dérivé côté serveur).
        crm: r.meta?.crm ? { fields: r.meta.crm.fields || {}, notes: r.meta.crm.notes || "" } : undefined,
      };
    }
    setAnswers(a);
    setLoading(false);
  }

  const step = steps[idx];
  const isLast = idx === steps.length - 1;

  // Aucune étape ne peut être validée sans réponse (tous les formats).
  function stepHasAnswer(s, a) {
    if (!s) return false;
    const fmt = s.response_format;
    if (fmt === "video") return !!a.videoSaved;
    if (fmt === "qcm") return a.selected_index != null;
    if (fmt === "choice") return !!a.choice;
    // Fiche CRM : on ne valide pas une fiche à moitié vide. Si aucun champ n'est
    // configuré (étape mal paramétrée côté recruteur), on ne bloque pas le
    // candidat pour autant.
    if (s.sandbox_kind === "crm") {
      const crmFields = s.config?.crm?.fields || [];
      const filled = a.crm?.fields || {};
      return crmFields.every((f) => String(filled[f.key] ?? "").trim() !== "");
    }
    // text + formats sandbox texte (email_reply, client_reply, ...) + code
    return !!(a.text && a.text.trim());
  }

  function setAnswer(field, value) {
    setAnswers((p) => ({ ...p, [step.id]: { ...(p[step.id] || {}), [field]: value } }));
  }

  async function persistCurrent() {
    if (!step) return true;
    const ans = answers[step.id] || {};
    if (step.response_format === "video") return true; // géré par ResponseRecorder
    const payload = { text_answer: null, meta: {} };
    if (step.sandbox_kind === "crm") {
      // text_answer est dérivé côté serveur depuis meta.crm (source de vérité).
      payload.meta = { crm: { fields: ans.crm?.fields || {}, notes: ans.crm?.notes || "" } };
    } else if (step.response_format === "text" || step.response_format === "code") {
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
    setError(null);
    try {
      const ok = await persistCurrent();
      if (!ok) { setError("Impossible d'enregistrer la réponse."); return; }

      // Fiche CRM — filet UNIQUE et sans oracle : si des informations ne
      // correspondent pas aux sources, on invite à relire une seule fois, sans
      // jamais dire quel champ (sinon le candidat tâtonnerait jusqu'au ✓). Il
      // reste libre de continuer : un second clic passe à la suite.
      if (step.sandbox_kind === "crm" && !crmNotice) {
        const check = await checkCrmAnswer(token, step.id);
        if (check.success && check.hasMismatch) {
          setCrmNotice("Certaines informations de la fiche ne correspondent pas à ce que disent les sources. Prenez le temps de relire — ou continuez si vous êtes sûr de vous.");
          return;
        }
      }

      if (isLast) {
        const res = await submitRun(token);
        if (res.success) setSubmitted(true);
        else setError(res.error || "Échec de la soumission");
      } else {
        setCrmNotice(null);
        setIdx((i) => Math.min(i + 1, steps.length - 1));
      }
    } catch (e) {
      setError("Une erreur est survenue. Réessayez.");
      console.error("next() error:", e);
    } finally {
      setSaving(false);
    }
  }

  // Branding client : couleur de marque explicite (texte à contraste sur les
  // boutons) + surcharge de --primary pour ce qui cascade (barre de progression).
  const primary = recruiter?.brand_primary_color || DEFAULT_PRIMARY;
  const pageStyle = { "--primary": primary, "--primary-hover": primary };

  if (loading) return <Center><Loader2 size={30} style={{ color: primary, animation: "spin 1s linear infinite" }} /></Center>;
  if (error && !steps.length) return <Center style={pageStyle}><div style={{ ...container, padding: "2.5rem", textAlign: "center", maxWidth: 420 }}><div style={{ fontSize: 40, marginBottom: 12 }}>⛔</div><p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{error}</p></div></Center>;

  if (submitted) {
    return (
      <Center style={pageStyle}>
        <div style={{ ...container, padding: "3rem 2rem", textAlign: "center", maxWidth: 480, width: "100%" }}>
          {recruiter?.company_logo_url && (
            <div style={{ marginBottom: "2rem" }}>
              <img src={recruiter.company_logo_url} alt={recruiter?.company_name || "Logo"} style={{ height: 48, width: "auto", margin: "0 auto", borderRadius: 8, objectFit: "contain" }} />
            </div>
          )}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}><Check size={28} /></div>
          <h1 style={{ ...heading, marginBottom: "0.5rem" }}>Merci, c'est terminé !</h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {experience?.thank_you_message
              || `Vos réponses ont bien été soumises à ${recruiter?.company_name || job?.company || "l'équipe recrutement"}. Vous pouvez maintenant fermer cet onglet.`}
          </p>
        </div>
      </Center>
    );
  }

  // Écran d'accueil : invite le candidat à démarrer l'expérience (message
  // paramétrable par le recruteur, cf. experiences.welcome_message).
  if (showIntro) {
    return (
      <Center style={pageStyle}>
        <div style={{ ...container, padding: "2.5rem 2rem", maxWidth: 520, width: "100%", textAlign: "center" }}>
          {recruiter?.company_logo_url ? (
            <img src={recruiter.company_logo_url} alt={recruiter?.company_name || "Logo"} style={{ height: 48, width: "auto", margin: "0 auto 1.5rem", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 10, background: primary, color: getContrastColor(primary), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, margin: "0 auto 1.5rem" }}>
              {(recruiter?.company_name || job?.company || "O")[0].toUpperCase()}
            </div>
          )}
          <h1 style={{ ...heading, marginBottom: "0.75rem" }}>{job?.title || "Votre évaluation"}</h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word", marginBottom: "1.75rem" }}>
            {experience?.welcome_message
              || `Bienvenue ! ${recruiter?.company_name || job?.company || "L'équipe recrutement"} vous invite à réaliser une courte mise en situation${experience?.estimated_minutes ? ` (~${experience.estimated_minutes} min)` : ""}. Prenez votre temps, il n'y a pas de piège : montrez comment vous travaillez.`}
          </p>
          <button onClick={() => setShowIntro(false)} style={pillBtn(primary)}>
            Commencer <ArrowRight size={16} />
          </button>
        </div>
      </Center>
    );
  }

  const pct = Math.round(((idx + 1) / steps.length) * 100);
  const ans = answers[step.id] || {};
  // Le type de sandbox (mise en situation) vient de sandbox_kind, pas de
  // response_format. On dérive le format de rendu à passer à SandboxRenderer.
  const SANDBOX_FORMAT = { email: "email_reply", client_reply: "client_reply", document: "technical_architecture", code: "code", crm: "crm" };
  const sandboxFormat = step.sandbox_kind && step.sandbox_kind !== "none"
    ? (SANDBOX_FORMAT[step.sandbox_kind] || step.response_format)
    : step.response_format;
  const isCrm = sandboxFormat === "crm";
  const isSidebarMode = step.ai_assistant_allowed;
  // La fiche CRM est à deux colonnes (sources | fiche) : il lui faut de la place.
  const containerMaxWidth = isSidebarMode ? (isCrm ? 1200 : 1040) : (isCrm ? 980 : 720);

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "2rem 1.5rem", ...pageStyle }}>
      <style>{focusStyle(primary)}</style>
      {/* Header Brandé */}
      <div style={{ maxWidth: containerMaxWidth, margin: "0 auto 2rem", display: "flex", alignItems: "center", gap: "1rem", transition: "max-width 0.3s" }}>
        {recruiter?.company_logo_url ? (
          <img src={recruiter.company_logo_url} alt="Logo" style={{ height: 40, width: "auto", borderRadius: 6, objectFit: "contain", background: "white", padding: "4px" }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 6, background: primary, display: "flex", alignItems: "center", justifyContent: "center", color: getContrastColor(primary), fontWeight: 800, fontSize: 18 }}>
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
            <div style={{ ...container, minWidth: 0, overflowWrap: "break-word" }}>
              {step.title && <h2 style={{ ...heading, marginBottom: "0.75rem", overflowWrap: "break-word" }}>{step.title}</h2>}
              <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "break-word", marginBottom: "1.5rem" }}>{step.prompt}</p>

              {/* Renderer texte/sandbox/code : le format vient de sandbox_kind si présent */}
              {["text", "code"].includes(step.response_format) && (
                <SandboxRenderer
                  format={sandboxFormat}
                  config={step.config}
                  compact={isCrm && isSidebarMode}
                  value={isCrm ? (ans.crm || { fields: {}, notes: "" }) : ans.text}
                  onChange={(val) => setAnswer(isCrm ? "crm" : "text", val)}
                  primary={primary}
                />
              )}

              {crmNotice && (
                <div style={{ marginTop: "1rem", background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 12, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.55 }}>
                  {crmNotice}
                </div>
              )}

              {step.response_format === "choice" && (
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {["yes", "no"].map((v) => (
                    <button key={v} onClick={() => setAnswer("choice", v)}
                      style={{ ...optionBtn(primary, ans.choice === v), flex: 1, justifyContent: "center" }}>
                      {v === "yes" ? "Oui" : "Non"}
                    </button>
                  ))}
                </div>
              )}

              {step.response_format === "qcm" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(step.config?.options || []).map((opt, i) => (
                    <button key={i} onClick={() => setAnswer("selected_index", i)}
                      style={optionBtn(primary, ans.selected_index === i)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {step.response_format === "video" && (
                <ResponseRecorder token={token} stepId={step.id} existingVideoUrl={ans.videoSaved}
                  onSaved={() => setAnswer("videoSaved", true)} primary={primary} />
              )}
            </div>
            
            {error && <p style={{ color: "#991b1b", fontSize: 13 }}>{error}</p>}

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setCrmNotice(null); setIdx((i) => Math.max(0, i - 1)); }} disabled={idx === 0}
                style={{ ...ghostBtn, opacity: idx === 0 ? 0.4 : 1, cursor: idx === 0 ? "not-allowed" : "pointer" }}>
                <ArrowLeft size={16} /> Précédent
              </button>
              <button onClick={next} disabled={saving || !stepHasAnswer(step, ans)}
                title={!stepHasAnswer(step, ans) ? "Répondez à cette étape pour continuer" : undefined}
                style={primaryBtn(primary, saving || !stepHasAnswer(step, ans))}>
                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : isLast ? <Check size={16} /> : <ArrowRight size={16} />}
                {isLast ? "Terminer" : "Suivant"}
              </button>
            </div>
          </div>

          {/* Sidebar Column */}
          {isSidebarMode && (
            <div style={{ position: "sticky", top: "2rem" }}>
              <AssistantPanel token={token} stepId={step.id} primary={primary} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Center({ children, style }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: PAGE_BG, padding: "2rem", ...style }}>{children}</div>;
}
