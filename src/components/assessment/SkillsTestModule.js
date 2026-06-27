"use client";

import { useState, useEffect, useRef } from "react";
import { Brain, CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getOrCreateTestSession, getQuestionsForSession, saveTestAnswer, saveOpenAnswer, completeTestSession } from "@/lib/actions/assessment";

// ─── Main module ──────────────────────────────────────────────────────────────
export default function SkillsTestModule({ candidate, job, recruiter, testId, testConfig, testSessions, onComplete, onBack }) {
  const session = testSessions?.find((s) => s.test_id === testId);

  return (
    <TestRunner
      candidate={candidate}
      testId={testId}
      recruiter={recruiter}
      questionIds={testConfig?.selected_question_ids || []}
      existingSession={session}
      onComplete={onComplete}
      onBack={onBack}
    />
  );
}

// ─── Test Runner (handles all question types) ────────────────────────────────
function TestRunner({ candidate, testId, recruiter, questionIds, existingSession, onComplete, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(existingSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    loadData();
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    let currentSession = existingSession;
    if (!currentSession) {
      const res = await getOrCreateTestSession(candidate.id, testId);
      if (res.success) currentSession = res.session;
    }
    setSession(currentSession);

    const res = await getQuestionsForSession(questionIds);
    if (res.success) {
      setQuestions(res.questions);
      const answered = (currentSession?.answers || []).map((a) => a.question_id);
      const idx = res.questions.findIndex((q) => !answered.includes(q.id));
      const startIdx = idx >= 0 ? idx : res.questions.length;
      setCurrentIndex(startIdx);
      if (startIdx < res.questions.length) {
        setTimeLeft(res.questions[startIdx].time_limit_seconds);
        setQuestionStartTime(Date.now());
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    if (timeLeft === null || loading || submitting) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, loading, submitting]);

  useEffect(() => {
    if (!loading && questions.length > 0 && currentIndex < questions.length) {
      setTimeLeft(questions[currentIndex].time_limit_seconds);
      setQuestionStartTime(Date.now());
      setSelectedAnswer(null);
    }
  }, [currentIndex, loading]);

  async function handleAnswer(chosen) {
    if (submitting || !session) return;
    const question = questions[currentIndex];
    const qType = question?.question_type || "qcm_single";

    clearTimeout(timerRef.current);
    setSubmitting(true);

    const timeTaken = questionStartTime ? Math.round((Date.now() - questionStartTime) / 1000) : 0;

    if (qType === "open_bars") {
      await saveOpenAnswer(session.id, question.id, chosen || "", timeTaken);
    } else {
      const answer = { question_id: question.id, chosen, time_seconds: timeTaken };
      await saveTestAnswer(session.id, answer);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      const allIds = questions.map((q) => q.id);
      const result = await completeTestSession(session.id, allIds);
      const score = result.success ? result.score : 0;
      setSubmitting(false);
      onComplete(score);
    } else {
      setCurrentIndex(nextIndex);
      setSelectedAnswer(null);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (currentIndex >= questions.length) {
    if (questions.length === 0 && !loading) {
      return (
        <div style={{ padding: "4rem 1rem", textAlign: "center" }} className="fade-in">
          <div style={{ width: "64px", height: "64px", background: "#fee2e2", color: "#991b1b", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "800", marginBottom: "1rem" }}>Configuration manquante</h2>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
            Désolé, ce test n'a pas encore été configuré correctement par le recruteur (aucune question sélectionnée). 
            Veuillez contacter l'entreprise ou réessayer plus tard.
          </p>
          <button className="btn btn-outline" onClick={onBack}>
            Retour au hub
          </button>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <CheckCircle2 size={56} style={{ color: "#22c55e", margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>Test terminé !</h2>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>Toutes les questions ont été répondues.</p>
          <button
            onClick={() => onComplete(null)}
            style={{ padding: "0.75rem 2rem", borderRadius: "var(--radius)", background: "var(--primary)", color: "white", border: "none", fontWeight: "700", cursor: "pointer" }}
          >
            Retour aux tests
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const qType = question?.question_type || "qcm_single";
  const isBars = qType === "open_bars";
  const isNumeric = qType === "numeric";
  const isMultiple = qType === "qcm_multiple";
  const effectiveTimeLeft = isBars ? null : timeLeft;
  const timePct = (question && question.time_limit_seconds && !isBars) ? (timeLeft / question.time_limit_seconds) * 100 : 100;
  const timerColor = timePct > 50 ? "#22c55e" : timePct > 25 ? "#f59e0b" : "#ef4444";

  const options = question?.options
    ? question.options
    : [
        { key: "A", text: question?.option_a },
        { key: "B", text: question?.option_b },
        { key: "C", text: question?.option_c },
        { key: "D", text: question?.option_d },
      ].filter(o => o.text && o.text.trim().length > 0);

  const selectedArr = isMultiple ? (Array.isArray(selectedAnswer) ? selectedAnswer : []) : null;

  function toggleMultiple(key) {
    const current = Array.isArray(selectedAnswer) ? selectedAnswer : [];
    if (current.includes(key)) {
      setSelectedAnswer(current.filter(k => k !== key));
    } else {
      setSelectedAnswer([...current, key]);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "1rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {recruiter?.company_logo_url ? (
            <img src={recruiter.company_logo_url} alt="Logo" style={{ height: "20px", maxWidth: "100px", objectFit: "contain" }} />
          ) : (
            <Brain size={18} style={{ color: "var(--primary)" }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: "600" }}>Question {currentIndex + 1}/{questions.length}</span>
          {question?.skill_dimension && (
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)", background: "var(--secondary)", padding: "2px 8px", borderRadius: "99px" }}>
              {question.skill_dimension}
            </span>
          )}
        </div>
        {effectiveTimeLeft !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "100px", height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${timePct}%`, background: timerColor, borderRadius: "99px", transition: "width 1s linear, background 0.5s" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "700", color: timerColor, minWidth: "28px", textAlign: "right" }}>{effectiveTimeLeft}s</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "4px", padding: "0.75rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "99px",
            background: i < currentIndex ? "var(--primary)" : i === currentIndex ? "var(--primary)" : "var(--border)",
            opacity: i === currentIndex ? 1 : i < currentIndex ? 0.7 : 0.3,
          }} />
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "700px", width: "100%" }}>
          <style dangerouslySetInnerHTML={{__html: `
            .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; font-size: 14px; }
            .markdown-content th, .markdown-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
            .markdown-content th { background-color: var(--secondary); font-weight: 700; }
            .markdown-content p { margin-bottom: 1rem; }
            .markdown-content p:last-child { margin-bottom: 0; }
          `}} />
          <div className="markdown-content" style={{ fontSize: "1.05rem", fontWeight: "600", color: "var(--foreground)", lineHeight: "1.65", marginBottom: "2rem", width: "100%" }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {question.statement}
            </ReactMarkdown>
          </div>

          {isBars && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <textarea
                value={typeof selectedAnswer === "string" ? selectedAnswer : ""}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Rédigez votre réponse ici..."
                disabled={submitting}
                style={{
                  width: "100%",
                  minHeight: "160px",
                  padding: "1rem",
                  borderRadius: "var(--radius)",
                  border: "1.5px solid var(--border)",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  lineHeight: "1.6",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={() => handleAnswer(selectedAnswer)}
                disabled={submitting || !selectedAnswer || selectedAnswer.trim().length < 20}
                style={{
                  background: (!selectedAnswer || selectedAnswer.trim().length < 20) ? "var(--border)" : "var(--primary)",
                  color: (!selectedAnswer || selectedAnswer.trim().length < 20) ? "var(--muted-foreground)" : "white",
                  border: "none",
                  padding: "0.875rem 2rem",
                  borderRadius: "var(--radius)",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: (!selectedAnswer || selectedAnswer.trim().length < 20 || submitting) ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  alignSelf: "flex-end",
                }}
              >
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
                Soumettre ma réponse
              </button>
            </div>
          )}

          {isNumeric && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input
                type="number"
                value={selectedAnswer || ""}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                placeholder="Entrez votre réponse numérique..."
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "var(--radius)",
                  border: "1.5px solid var(--border)",
                  fontSize: "16px",
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleAnswer(selectedAnswer)}
                disabled={submitting || !selectedAnswer}
                style={{
                  background: (!selectedAnswer) ? "var(--border)" : "var(--primary)",
                  color: (!selectedAnswer) ? "var(--muted-foreground)" : "white",
                  border: "none",
                  padding: "0.875rem 2rem",
                  borderRadius: "var(--radius)",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: (!selectedAnswer || submitting) ? "default" : "pointer",
                  alignSelf: "flex-end",
                }}
              >
                Valider
              </button>
            </div>
          )}

          {isMultiple && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {options.map(({ key, text }) => {
                const isChecked = selectedArr.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => !submitting && toggleMultiple(key)}
                    disabled={submitting}
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "var(--radius)",
                      background: isChecked ? "var(--accent)" : "var(--card)",
                      border: `2px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                      cursor: submitting ? "default" : "pointer",
                      textAlign: "left",
                      fontSize: "14px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 150ms",
                      color: "var(--foreground)",
                    }}
                  >
                    <span style={{
                      width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                      border: `2px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                      background: isChecked ? "var(--primary)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isChecked && <CheckCircle2 size={12} style={{ color: "white" }} />}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "700", marginRight: "4px", color: "var(--muted-foreground)" }}>{key}.</span>
                    {text}
                  </button>
                );
              })}
              <button
                onClick={() => handleAnswer(selectedArr)}
                disabled={submitting || selectedArr.length === 0}
                style={{
                  marginTop: "0.5rem",
                  background: selectedArr.length === 0 ? "var(--border)" : "var(--primary)",
                  color: selectedArr.length === 0 ? "var(--muted-foreground)" : "white",
                  border: "none",
                  padding: "0.875rem 2rem",
                  borderRadius: "var(--radius)",
                  fontSize: "15px",
                  fontWeight: "700",
                  cursor: selectedArr.length === 0 || submitting ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  alignSelf: "flex-end",
                }}
              >
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
                Valider
              </button>
            </div>
          )}

          {!isBars && !isMultiple && !isNumeric && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {options.map(({ key, text }) => {
                const isSelected = selectedAnswer === key;
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedAnswer(key); handleAnswer(key); }}
                    disabled={submitting || selectedAnswer !== null}
                    style={{
                      padding: "1rem 1.25rem", borderRadius: "var(--radius)",
                      background: isSelected ? "var(--primary)" : "var(--card)",
                      color: isSelected ? "white" : "var(--foreground)",
                      border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      cursor: submitting ? "default" : "pointer", textAlign: "left",
                      fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "12px",
                      transition: "all 150ms",
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting && !selectedAnswer) {
                        e.currentTarget.style.borderColor = "var(--primary)";
                        e.currentTarget.style.background = "var(--accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--card)";
                      }
                    }}
                  >
                    <span style={{
                      width: "28px", height: "28px", borderRadius: "6px", flexShrink: 0,
                      background: isSelected ? "rgba(255,255,255,0.25)" : "var(--secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: "700",
                    }}>
                      {key}
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
          )}

          {submitting && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <Loader2 size={20} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Open Test Runner (AI Proficiency Test) ───────────────────────────────────
function OpenTestRunner({ candidate, testId, recruiter, questionIds, existingSession, onComplete, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [session, setSession] = useState(existingSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [textAnswer, setTextAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const questionStartRef = useRef(Date.now());

  const CATEGORIES = { C1: "Stratégie IA", C2: "Prompting", C3: "Esprit critique", C4: "Éthique", C5: "Workflow" };

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    let currentSession = existingSession;
    if (!currentSession) {
      const res = await getOrCreateTestSession(candidate.id, testId);
      if (res.success) currentSession = res.session;
    }
    setSession(currentSession);

    const res = await getQuestionsForSession(questionIds);
    if (res.success) {
      setQuestions(res.questions);
      // Resume from first unanswered
      const answered = (currentSession?.answers || []).map((a) => a.question_id);
      const idx = res.questions.findIndex((q) => !answered.includes(q.id));
      const startIdx = idx >= 0 ? idx : res.questions.length;
      setCurrentIndex(startIdx);
    }
    setLoading(false);
    questionStartRef.current = Date.now();
  }

  async function handleNext() {
    if (submitting || !session) return;
    setSubmitting(true);

    const timeTaken = Math.round((Date.now() - questionStartRef.current) / 1000);
    const question = questions[currentIndex];

    await saveOpenAnswer(session.id, question.id, textAnswer.trim(), timeTaken);

    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      // All done — trigger AI evaluation
      setSubmitting(false);
      setAnalyzing(true);
      const allIds = questions.map((q) => q.id);
      const result = await completeOpenTestSession(session.id, allIds);
      setAnalyzing(false);
      onComplete(result.score || 0);
    } else {
      setCurrentIndex(nextIndex);
      setTextAnswer("");
      setSubmitting(false);
      questionStartRef.current = Date.now();
    }
  }

  // Loading screen
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // AI analysis screen
  if (analyzing) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.5rem", animation: "pulse 2s ease-in-out infinite",
          }}>
            <Sparkles size={32} style={{ color: "white" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.75rem", color: "var(--foreground)" }}>
            Analyse en cours…
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", lineHeight: "1.6" }}>
            Notre IA analyse vos réponses selon les critères du test. Cela prend généralement 15 à 30 secondes.
          </p>
          <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "6px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: "var(--primary)",
                animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.85; } }
          @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        `}</style>
      </div>
    );
  }

  // All done (already answered)
  if (currentIndex >= questions.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <CheckCircle2 size={56} style={{ color: "#22c55e", margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>Test terminé !</h2>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
            Toutes vos réponses ont été enregistrées.
          </p>
          <button
            onClick={() => onComplete(null)}
            style={{ padding: "0.75rem 2rem", borderRadius: "var(--radius)", background: "var(--primary)", color: "white", border: "none", fontWeight: "700", cursor: "pointer" }}
          >
            Retour aux tests
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const category = question?.scoring_criteria?.category;
  const categoryLabel = CATEGORIES[category] || category || "";
  const charCount = textAnswer.length;
  const isReady = charCount >= 30;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {recruiter?.company_logo_url ? (
            <img src={recruiter.company_logo_url} alt="Logo" style={{ height: "20px", maxWidth: "100px", objectFit: "contain" }} />
          ) : (
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: "600" }}>Question {currentIndex + 1}/{questions.length}</span>
        </div>
        {categoryLabel && (
          <span style={{
            fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
          }}>
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", gap: "3px", padding: "0.5rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "99px",
            background: i < currentIndex ? "#6366f1" : i === currentIndex ? "#6366f1" : "var(--border)",
            opacity: i < currentIndex ? 0.7 : i === currentIndex ? 1 : 0.3,
          }} />
        ))}
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "2.5rem 1rem" }}>
        <div style={{ maxWidth: "680px", width: "100%" }}>
          {/* Category badge */}
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{
              fontSize: "1.1rem", fontWeight: "700", color: "var(--foreground)",
              lineHeight: "1.65", marginBottom: "0",
            }}>
              {question.statement}
            </p>
          </div>

          {/* Textarea */}
          <div style={{ position: "relative" }}>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Décrivez votre approche en détail…"
              disabled={submitting}
              rows={7}
              style={{
                width: "100%", padding: "1rem 1rem 2.5rem",
                borderRadius: "var(--radius)", border: `2px solid ${isReady ? "var(--primary)" : "var(--border)"}`,
                background: "var(--card)", color: "var(--foreground)",
                fontSize: "14px", lineHeight: "1.65", resize: "vertical",
                outline: "none", transition: "border-color 200ms",
                fontFamily: "inherit", boxSizing: "border-box",
              }}
              onFocus={(e) => { if (!isReady) e.target.style.borderColor = "var(--primary)"; }}
              onBlur={(e) => { if (!isReady) e.target.style.borderColor = "var(--border)"; }}
            />
            <div style={{
              position: "absolute", bottom: "10px", right: "12px",
              fontSize: "12px", color: isReady ? "var(--primary)" : "var(--muted-foreground)",
              fontWeight: isReady ? "600" : "400",
            }}>
              {charCount} caractères {!isReady && `(minimum 30)`}
            </div>
          </div>

          {/* Hint */}
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "0.5rem", lineHeight: "1.5" }}>
            💡 Soyez précis et concret — illustrez avec des exemples si possible. Il n&apos;y a pas de limite de temps.
          </p>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={!isReady || submitting}
            style={{
              marginTop: "1.5rem", width: "100%", padding: "1rem",
              borderRadius: "var(--radius)",
              background: isReady && !submitting
                ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                : "var(--secondary)",
              color: isReady && !submitting ? "white" : "var(--muted-foreground)",
              border: "none", cursor: isReady && !submitting ? "pointer" : "not-allowed",
              fontSize: "15px", fontWeight: "700",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "all 200ms",
              boxShadow: isReady && !submitting ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {submitting ? (
              <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Enregistrement…</>
            ) : currentIndex + 1 === questions.length ? (
              <><Sparkles size={18} /> Terminer le test</>
            ) : (
              <>Question suivante →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
