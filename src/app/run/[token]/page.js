"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { startRun, saveStepResponse, submitRun, checkCrmAnswer, submitQualifyingAnswers } from "@/lib/actions/run";
import ResponseRecorder from "@/components/assessment/ResponseRecorder";
import AssistantPanel from "@/components/assessment/AssistantPanel";
import SandboxRenderer from "@/components/assessment/SandboxRenderer";
import CandidateNotice from "@/components/assessment/CandidateNotice";
import { primaryBtn, pillBtn, ghostBtn, optionBtn, container, heading, focusStyle, getContrastColor, PAGE_BG, DEFAULT_PRIMARY } from "@/components/assessment/candidateUi";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function RunPage() {
  const { token } = useParams();
  const { t, setLocale } = useI18n();
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
  const [qualifying, setQualifying] = useState(null);      // questions de la pipeline à passer
  const [qualAnswers, setQualAnswers] = useState({});
  const [qualSubmitting, setQualSubmitting] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [expired, setExpired] = useState(false); // lien de plus de 5 jours, parcours jamais commencé
  const [assistantCollapsed, setAssistantCollapsed] = useState(false); // le chat est ouvert par défaut

  useEffect(() => { load(); }, [token]);

  async function load() {
    setLoading(true);
    const res = await startRun(token);
    if (!res.success) { setError(res.error); setLoading(false); return; }

    // Le branding est renvoyé même quand l'expérience n'est pas accessible :
    // les écrans de porte et de refus restent aux couleurs de l'entreprise.
    setJob(res.job);
    setRecruiter(res.recruiter);

    // Bascule dans la langue de l'OFFRE, pas celle du navigateur du candidat.
    // C'est le seul endroit où la locale change en cours de page : jusqu'ici on
    // n'avait affiché qu'un écran de chargement. Awaité pour que les écrans de
    // refus et de lien périmé ci-dessous s'affichent déjà traduits.
    await setLocale(res.job?.experience_locale, ["common", "candidate"]);

    // Candidat déjà recalé : il ne verra jamais l'expérience.
    if (res.disqualified) { setDisqualified(true); setLoading(false); return; }

    // Lien périmé, et parcours jamais commencé (un parcours entamé reste ouvert).
    if (res.expired) { setExpired(true); setLoading(false); return; }

    // Questions qualificatives de la pipeline : à passer avant tout le reste.
    if (res.qualifying) { setQualifying(res.qualifying); setLoading(false); return; }

    setQualifying(null);
    setRun(res.run);
    setExperience(res.experience);
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

  // Soumet les questions qualificatives. La correction est serveur : on ne
  // connaît le verdict qu'au retour.
  async function submitQualifying() {
    setQualSubmitting(true);
    setError(null);
    const res = await submitQualifyingAnswers(token, qualAnswers);
    setQualSubmitting(false);
    if (!res.success) { setError(res.error || t("candidate.run.genericError")); return; }
    if (!res.passed) { setQualifying(null); setDisqualified(true); return; }
    // Qualifié : on relance le chargement, qui crée le run et ouvre l'expérience.
    setQualifying(null);
    await load();
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
      if (!ok) { setError(t("candidate.run.saveFailed")); return; }

      // Fiche CRM — filet UNIQUE et sans oracle : si des informations ne
      // correspondent pas aux sources, on invite à relire une seule fois, sans
      // jamais dire quel champ (sinon le candidat tâtonnerait jusqu'au ✓). Il
      // reste libre de continuer : un second clic passe à la suite.
      if (step.sandbox_kind === "crm" && !crmNotice) {
        const check = await checkCrmAnswer(token, step.id);
        if (check.success && check.hasMismatch) {
          setCrmNotice(t("candidate.run.crmMismatch"));
          return;
        }
      }

      if (isLast) {
        const res = await submitRun(token);
        if (res.success) setSubmitted(true);
        else setError(res.error || t("candidate.run.submitFailed"));
      } else {
        setCrmNotice(null);
        setIdx((i) => Math.min(i + 1, steps.length - 1));
      }
    } catch (e) {
      setError(t("candidate.run.retryError"));
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
  if (error && !steps.length && !qualifying && !disqualified && !expired) return <Center style={pageStyle}><div style={{ ...container, padding: "2.5rem", textAlign: "center", maxWidth: 420 }}><div style={{ fontSize: 40, marginBottom: 12 }}>⛔</div><p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{error}</p></div></Center>;

  // ── Lien périmé ───────────────────────────────────────────────────────────
  // Un lien d'évaluation vit 5 jours. Le candidat n'est pas en faute : on lui
  // dit quoi faire plutôt que de lui opposer une porte close.
  if (expired) {
    return (
      <CandidateNotice recruiter={recruiter} job={job} title={t("candidate.notice.expiredTitle")}>
        {t("candidate.notice.expiredBody", {
          company: recruiter?.company_name || t("candidate.notice.fallbackTeam"),
        })}
      </CandidateNotice>
    );
  }

  // ── Candidat recalé sur les questions qualificatives ──────────────────────
  // Il est remercié ici et n'accède jamais à l'expérience, même en revenant sur
  // son lien : startRun le renvoie dans cet état.
  if (disqualified) {
    return (
      <Center style={pageStyle}>
        <div style={{ ...container, padding: "3rem 2rem", textAlign: "center", maxWidth: 480, width: "100%" }}>
          {recruiter?.company_logo_url && (
            <div style={{ marginBottom: "2rem" }}>
              <img src={recruiter.company_logo_url} alt={recruiter?.company_name || t("candidate.notice.logoAlt")} style={{ height: 48, width: "auto", margin: "0 auto", borderRadius: 8, objectFit: "contain" }} />
            </div>
          )}
          <h1 style={{ ...heading, marginBottom: "0.75rem" }}>{t("candidate.disqualified.title")}</h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>
            {t("candidate.disqualified.body")}
          </p>
        </div>
      </Center>
    );
  }

  // ── Questions qualificatives (pipeline), avant toute chose ────────────────
  if (qualifying) {
    const questions = qualifying.questions || [];
    const allAnswered = questions.every((q) => qualAnswers[q.id]);
    return (
      <Center style={pageStyle}>
        <style>{focusStyle(primary)}</style>
        <div style={{ ...container, padding: "2.5rem 2rem", maxWidth: 560, width: "100%" }}>
          {recruiter?.company_logo_url ? (
            <img src={recruiter.company_logo_url} alt={recruiter?.company_name || t("candidate.notice.logoAlt")} style={{ height: 44, width: "auto", margin: "0 auto 1.5rem", borderRadius: 8, objectFit: "contain", display: "block" }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: primary, color: getContrastColor(primary), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, margin: "0 auto 1.5rem" }}>
              {(recruiter?.company_name || job?.title || "O")[0].toUpperCase()}
            </div>
          )}
          <h1 style={{ ...heading, marginBottom: "0.5rem", textAlign: "center" }}>{t("candidate.qualifying.title")}</h1>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--muted-foreground)", textAlign: "center", marginBottom: "2rem" }}>
            {t("candidate.qualifying.subtitle")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {questions.map((q, i) => (
              <div key={q.id}>
                <p style={{ fontSize: "1rem", lineHeight: 1.5, color: "var(--foreground)", marginBottom: "0.75rem" }}>
                  <span style={{ color: "var(--muted-foreground)", marginRight: 6 }}>{i + 1}.</span>{q.text}
                </p>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {["yes", "no"].map((v) => (
                    <button key={v} onClick={() => setQualAnswers((p) => ({ ...p, [q.id]: v }))}
                      style={{ ...optionBtn(primary, qualAnswers[q.id] === v), flex: 1, justifyContent: "center" }}>
                      {v === "yes" ? t("candidate.qualifying.yes") : t("candidate.qualifying.no")}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && <p style={{ color: "#991b1b", fontSize: 13, marginTop: "1rem" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}>
            <button onClick={submitQualifying} disabled={!allAnswered || qualSubmitting}
              title={!allAnswered ? t("candidate.qualifying.answerAll") : undefined}
              style={pillBtn(primary, !allAnswered || qualSubmitting)}>
              {qualSubmitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {t("candidate.qualifying.continue")} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </Center>
    );
  }

  if (submitted) {
    return (
      <Center style={pageStyle}>
        <div style={{ ...container, padding: "3rem 2rem", textAlign: "center", maxWidth: 480, width: "100%" }}>
          {recruiter?.company_logo_url && (
            <div style={{ marginBottom: "2rem" }}>
              <img src={recruiter.company_logo_url} alt={recruiter?.company_name || t("candidate.notice.logoAlt")} style={{ height: 48, width: "auto", margin: "0 auto", borderRadius: 8, objectFit: "contain" }} />
            </div>
          )}
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}><Check size={28} /></div>
          <h1 style={{ ...heading, marginBottom: "0.5rem" }}>{t("candidate.done.title")}</h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            {/* Le message de remerciement paramétré par le recruteur prime : il
                l'a écrit dans la langue de son offre, on ne le traduit pas. */}
            {experience?.thank_you_message
              || t("candidate.done.body", {
                company: recruiter?.company_name || job?.company || t("candidate.notice.fallbackTeam"),
              })}
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
            <img src={recruiter.company_logo_url} alt={recruiter?.company_name || t("candidate.notice.logoAlt")} style={{ height: 48, width: "auto", margin: "0 auto 1.5rem", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 10, background: primary, color: getContrastColor(primary), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, margin: "0 auto 1.5rem" }}>
              {(recruiter?.company_name || job?.company || "O")[0].toUpperCase()}
            </div>
          )}
          <h1 style={{ ...heading, marginBottom: "0.75rem" }}>{job?.title || t("candidate.intro.fallbackTitle")}</h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word", marginBottom: "1.75rem" }}>
            {/* Même règle que le message de fin : le texte d'accueil écrit par le
                recruteur passe avant le nôtre, tel qu'il l'a rédigé. */}
            {experience?.welcome_message
              || t("candidate.intro.welcome", {
                company: recruiter?.company_name || job?.company || t("candidate.intro.fallbackTeam"),
                // Le parenthésage fait partie du fragment : en néerlandais comme
                // en anglais il se place au même endroit, mais l'espace insécable
                // qui le précède en français, non.
                duration: experience?.estimated_minutes
                  ? ` (${t("candidate.run.minutes", { count: experience.estimated_minutes })})`
                  : "",
              })}
          </p>
          <button onClick={() => setShowIntro(false)} style={pillBtn(primary)}>
            {t("candidate.intro.start")} <ArrowRight size={16} />
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
  // Le chat prend 400px pour être un vrai espace de conversation ; replié, il se
  // réduit à son onglet vertical et rend la place à la tâche.
  const assistantWidth = assistantCollapsed ? 56 : 400;
  // La fiche CRM est à deux colonnes (sources | fiche) : il lui faut de la place.
  const containerMaxWidth = isSidebarMode ? (isCrm ? 1260 : 1100) : (isCrm ? 980 : 720);

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: "2rem 1.5rem", ...pageStyle }}>
      <style>{focusStyle(primary)}</style>
      {/* Sous 900px, une colonne de conversation à côté de la tâche rendrait les
          deux inutilisables : le chat passe en tiroir ancré en bas, et son onglet
          replié devient un bouton flottant. */}
      <style>{`
        @media (max-width: 900px) {
          .run-with-assistant { grid-template-columns: 1fr !important; }
          .assistant-panel {
            position: fixed !important; top: auto !important; left: 0; right: 0; bottom: 0;
            height: 72vh !important; border-radius: 16px 16px 0 0 !important;
            z-index: 60; box-shadow: 0 -8px 30px rgba(0,0,0,.16);
          }
          .assistant-tab {
            position: fixed !important; top: auto !important; right: 16px; bottom: 16px;
            flex-direction: row !important; border-radius: 999px !important;
            padding: 10px 16px !important; z-index: 60; box-shadow: 0 4px 16px rgba(0,0,0,.16);
          }
          .assistant-tab span { writing-mode: horizontal-tb !important; }
        }
      `}</style>
      {/* Header Brandé */}
      <div style={{ maxWidth: containerMaxWidth, margin: "0 auto 2rem", display: "flex", alignItems: "center", gap: "1rem", transition: "max-width 0.3s" }}>
        {recruiter?.company_logo_url ? (
          <img src={recruiter.company_logo_url} alt={t("candidate.notice.logoAlt")} style={{ height: 40, width: "auto", borderRadius: 6, objectFit: "contain", background: "white", padding: "4px" }} />
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
            <span>{t("candidate.run.stepCounter", { current: idx + 1, total: steps.length })}</span>
            {experience?.estimated_minutes
              ? <span>{t("candidate.run.minutes", { count: experience.estimated_minutes })}</span>
              : null}
          </div>
          <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", transition: "width .3s" }} />
          </div>
        </div>

        <div className={isSidebarMode ? "run-with-assistant" : undefined}
          style={{
            display: isSidebarMode ? "grid" : "block",
            gridTemplateColumns: isSidebarMode ? `1fr ${assistantWidth}px` : "1fr",
            gap: "2rem", alignItems: "start", transition: "grid-template-columns .25s ease",
          }}>
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
                      {v === "yes" ? t("candidate.run.yes") : t("candidate.run.no")}
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
                <ArrowLeft size={16} /> {t("candidate.run.previous")}
              </button>
              <button onClick={next} disabled={saving || !stepHasAnswer(step, ans)}
                title={!stepHasAnswer(step, ans) ? t("candidate.run.answerToContinue") : undefined}
                style={primaryBtn(primary, saving || !stepHasAnswer(step, ans))}>
                {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : isLast ? <Check size={16} /> : <ArrowRight size={16} />}
                {isLast ? t("candidate.run.finish") : t("candidate.run.next")}
              </button>
            </div>
          </div>

          {/* Colonne de conversation — le panneau gère lui-même son ancrage et
              sa hauteur (il est sticky sur toute la hauteur du viewport). */}
          {isSidebarMode && (
            <div style={{ minWidth: 0 }}>
              {/* key : une étape = une conversation. Le remontage repart d'un
                  état neuf, sans réinitialisation manuelle dans un effet. */}
              <AssistantPanel key={step.id} token={token} stepId={step.id} primary={primary}
                onCollapsedChange={setAssistantCollapsed} />
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
