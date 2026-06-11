"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, Clock, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { getOrCreateTestSession, getQuestionsForSession, saveTestAnswer, completeTestSession, saveOpenAnswer, completeOpenTestSession } from "@/lib/actions/assessment";
import { createClient } from "@/lib/supabase/client";

const AI_PROFICIENCY_TEST_ID = "1dac9ae1-d8ae-4cc5-82f3-a010c6bf6f11";

// ─── Main module ─────────────────────────────────────────────────────────────
export default function SkillsTestModule({ candidate, job, recruiter, testsConfig, testSessions, onComplete, onBack }) {
  const [activeTestId, setActiveTestId] = useState(null); // null = list view
  const [sessions, setSessions] = useState(testSessions || []);

  const selectedTests = testsConfig?.tests || [];

  function getSession(testId) {
    return sessions.find((s) => s.test_id === testId);
  }

  function handleTestComplete(testId, score) {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.test_id === testId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], status: "completed", score };
        return updated;
      }
      return [...prev, { test_id: testId, status: "completed", score }];
    });
    setActiveTestId(null);
  }

  const allDone = selectedTests.every((t) => {
    const s = sessions.find((ss) => ss.test_id === t.test_id);
    return s?.status === "completed";
  });

  // ─── Active test ───────────────────────────────────────────────────────────
  if (activeTestId) {
    const testConfig = selectedTests.find((t) => t.test_id === activeTestId);
    const isOpenTest = activeTestId === AI_PROFICIENCY_TEST_ID;

    if (isOpenTest) {
      return (
        <OpenTestRunner
          candidate={candidate}
          testId={activeTestId}
          recruiter={recruiter}
          questionIds={testConfig?.selected_question_ids || []}
          existingSession={getSession(activeTestId)}
          onComplete={(score) => handleTestComplete(activeTestId, score)}
          onBack={() => setActiveTestId(null)}
        />
      );
    }

    return (
      <TestRunner
        candidate={candidate}
        testId={activeTestId}
        recruiter={recruiter}
        questionIds={testConfig?.selected_question_ids || []}
        existingSession={getSession(activeTestId)}
        onComplete={(score) => handleTestComplete(activeTestId, score)}
        onBack={() => setActiveTestId(null)}
      />
    );
  }

  // ─── Test list view ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "2rem", padding: 0 }}
        >
          <ArrowLeft size={16} /> Retour
        </button>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.5rem" }}>
            Tests de compétences
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            Complétez chaque test dans l'ordre. Vous pouvez faire une pause entre les tests. Une question par écran — impossible de revenir en arrière.
          </p>
        </div>

        {/* Warning */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "12px 16px", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "var(--radius)", marginBottom: "1.5rem" }}>
          <AlertCircle size={16} style={{ color: "#92400e", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "13px", color: "#92400e" }}>
            Chaque question est chronométrée. Restez sur cette page pendant le test — les sorties de page sont enregistrées.
          </p>
        </div>

        {/* Test cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
          {selectedTests.map((testConfig, index) => {
            const session = getSession(testConfig.test_id);
            const isCompleted = session?.status === "completed";
            const isInProgress = session?.status === "in_progress";
            const questionCount = testConfig.selected_question_ids?.length || 0;

            return (
              <div
                key={testConfig.test_id}
                onClick={() => !isCompleted && setActiveTestId(testConfig.test_id)}
                style={{
                  background: "var(--card)", border: `1px solid ${isCompleted ? "#bbf7d0" : "var(--border)"}`,
                  borderRadius: "var(--radius)", padding: "1.25rem",
                  cursor: isCompleted ? "default" : "pointer", display: "flex",
                  alignItems: "center", gap: "1rem", transition: "border-color 150ms",
                }}
                onMouseEnter={(e) => { if (!isCompleted) e.currentTarget.style.borderColor = "var(--primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = isCompleted ? "#bbf7d0" : "var(--border)"; }}
              >
                <div style={{
                  width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0,
                  background: isCompleted ? "#dcfce7" : "var(--secondary)",
                  color: isCompleted ? "#166534" : "var(--foreground)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", fontWeight: "700",
                }}>
                  {isCompleted ? <CheckCircle2 size={20} /> : index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)" }}>
                      {testConfig.test_name || `Test ${index + 1}`}
                    </span>
                    {isInProgress && (
                      <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: "#fef3c7", color: "#92400e" }}>
                        En cours
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Brain size={12} /> {questionCount} questions
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} /> ~5 min
                    </span>
                    {isCompleted && (
                      <span style={{ color: "#166534", fontWeight: "700" }}>Score: {session.score}/100</span>
                    )}
                  </div>
                </div>
                {!isCompleted && <ChevronRight size={16} style={{ color: "var(--muted-foreground)" }} />}
              </div>
            );
          })}
        </div>

        {allDone && (
          <button
            onClick={onComplete}
            style={{
              width: "100%", padding: "1rem", borderRadius: "var(--radius)",
              background: "#22c55e", color: "white", border: "none",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <CheckCircle2 size={18} /> Tests complétés — Retour à l'assessment
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Test Runner ─────────────────────────────────────────────────────────────
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
  const cheatEventsRef = useRef([]);
  const [paused, setPaused] = useState(false);

  // Already answered questions (resume)
  const answeredIds = (existingSession?.answers || []).map((a) => a.question_id);
  const firstUnanswered = questions.findIndex((q) => !answeredIds.includes(q.id));

  useEffect(() => {
    loadData();
    return () => {
      clearInterval(timerRef.current);
    };
  }, []);

  async function loadData() {
    setLoading(true);
    // Get or create session
    let currentSession = existingSession;
    if (!currentSession) {
      const res = await getOrCreateTestSession(candidate.id, testId);
      if (res.success) currentSession = res.session;
    }
    setSession(currentSession);

    // Get questions
    const res = await getQuestionsForSession(questionIds);
    if (res.success) {
      setQuestions(res.questions);
      // Resume from first unanswered
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

  // Timer
  useEffect(() => {
    if (timeLeft === null || loading || submitting) return;
    if (timeLeft <= 0) {
      handleAnswer(null); // auto-submit null = timeout
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, loading, submitting]);

  // Advance question
  useEffect(() => {
    if (!loading && questions.length > 0 && currentIndex < questions.length) {
      setTimeLeft(questions[currentIndex].time_limit_seconds);
      setQuestionStartTime(Date.now());
      setSelectedAnswer(null);
    }
  }, [currentIndex, loading]);

  async function handleAnswer(chosen) {
    if (submitting || !session) return;
    clearTimeout(timerRef.current);
    setSubmitting(true);

    const timeTaken = questionStartTime ? Math.round((Date.now() - questionStartTime) / 1000) : 0;
    const answer = { question_id: questions[currentIndex].id, chosen, time_seconds: timeTaken };

    await saveTestAnswer(session.id, answer);

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // All questions done → grade
      const allIds = questions.map((q) => q.id);
      const result = await completeTestSession(session.id, allIds);
      const score = result.success ? result.score : 0;
      setSubmitting(false);
      onComplete(score);
    } else {
      setCurrentIndex(nextIndex);
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

  // All questions answered already
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
  const timePct = (question && question.time_limit_seconds) ? (timeLeft / question.time_limit_seconds) * 100 : 100;
  const timerColor = timePct > 50 ? "#22c55e" : timePct > 25 ? "#f59e0b" : "#ef4444";

  const options = [
    { key: "A", text: question.option_a },
    { key: "B", text: question.option_b },
    { key: "C", text: question.option_c },
    { key: "D", text: question.option_d },
  ].filter(o => o.text && o.text.trim().length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {recruiter?.company_logo_url ? (
            <img src={recruiter.company_logo_url} alt="Logo" style={{ height: "20px", maxWidth: "100px", objectFit: "contain" }} />
          ) : (
            <Brain size={18} style={{ color: "var(--primary)" }} />
          )}
          <span style={{ fontSize: "14px", fontWeight: "600" }}>Question {currentIndex + 1}/{questions.length}</span>
        </div>
        {/* Timer */}
        {timeLeft !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "100px", height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${timePct}%`, background: timerColor, borderRadius: "99px", transition: "width 1s linear, background 0.5s" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "700", color: timerColor, minWidth: "28px", textAlign: "right" }}>{timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: "4px", padding: "0.75rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "99px",
            background: i < currentIndex ? "var(--primary)" : i === currentIndex ? "var(--primary)" : "var(--border)",
            opacity: i === currentIndex ? 1 : i < currentIndex ? 0.7 : 0.3,
          }} />
        ))}
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--foreground)", lineHeight: "1.6", marginBottom: question.image_url ? "1.25rem" : "2rem", textAlign: "center" }}>
            {question.statement}
          </p>

          {question.image_url && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.75rem" }}>
              <div style={{ maxWidth: "320px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
                <img src={question.image_url} alt="Illustration" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            </div>
          )}

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
