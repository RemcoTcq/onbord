"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Loader2, 
  Brain, 
  CheckCircle2, 
  X, 
  AlertCircle 
} from "lucide-react";

export default function TestPreview({ test, questions, onQuestionsUpdate, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (questions.length > 0) {
      startQuestion(0);
    }
    return () => clearTimeout(timerRef.current);
  }, [questions]);

  function startQuestion(index) {
    setCurrentIndex(index);
    setSelectedAnswer(null);
    const q = questions[index];
    setTimeLeft(q.time_limit_seconds || 45);
  }

  useEffect(() => {
    if (timeLeft === null || showResults) return;
    if (timeLeft <= 0) {
      handleAnswer(null);
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, showResults]);

  function handleAnswer(key) {
    clearTimeout(timerRef.current);
    setSelectedAnswer(key);

    // Track score for fun in preview
    if (key === questions[currentIndex].correct_answer) {
      setScore(s => s + 1);
    }

    setTimeout(() => {
      const next = currentIndex + 1;
      if (next < questions.length) {
        startQuestion(next);
      } else {
        setShowResults(true);
      }
    }, 1000);
  }

  if (questions.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p>Aucune question à prévisualiser.</p>
        <button onClick={onClose} className="btn btn-ghost mt-4">Fermer</button>
      </div>
    );
  }

  if (showResults) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }} className="fade-in">
        <CheckCircle2 size={64} style={{ color: "#22c55e", margin: "0 auto 24px" }} />
        <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>Aperçu terminé !</h2>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "32px" }}>
          Score de l'aperçu : {score} / {questions.length}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "16px" }}>
          <button onClick={() => { setShowResults(false); setScore(0); startQuestion(0); }} className="btn btn-outline">Recommencer</button>
          <button onClick={onClose} className="btn btn-primary">Quitter l'aperçu</button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const timePct = (timeLeft / (q.time_limit_seconds || 45)) * 100;
  const timerColor = timePct > 50 ? "#22c55e" : timePct > 25 ? "#f59e0b" : "#ef4444";

  const options = [
    { key: "A", text: q.option_a },
    { key: "B", text: q.option_b },
    { key: "C", text: q.option_c },
    { key: "D", text: q.option_d },
  ].filter(o => o.text);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--background)", zIndex: 1000, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "1rem 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ background: "var(--primary)", color: "white", padding: "4px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>APERÇU</div>
          <span style={{ fontSize: "14px", fontWeight: "600" }}>{test?.name} — Question {currentIndex + 1}/{questions.length}</span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {timeLeft !== null && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "80px", height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${timePct}%`, background: timerColor, transition: "width 1s linear" }} />
              </div>
              <span style={{ fontSize: "14px", fontWeight: "700", color: timerColor }}>{timeLeft}s</span>
            </div>
          )}
          <button onClick={onClose} style={{ padding: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: "4px", padding: "8px 1.5rem", background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
        {questions.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: "4px", borderRadius: "99px",
            background: i <= currentIndex ? "var(--primary)" : "var(--border)",
            opacity: i === currentIndex ? 1 : i < currentIndex ? 0.6 : 0.2,
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ maxWidth: "600px", width: "100%" }}>
          <p style={{ fontSize: "20px", fontWeight: "600", textAlign: "center", marginBottom: q.image_url ? "20px" : "40px", lineHeight: "1.5" }}>
            {q.statement}
          </p>

          {q.image_url && (
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "30px" }}>
              <div style={{ maxWidth: "350px", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }}>
                <img src={q.image_url} alt="Illustration de la question" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrect = opt.key === q.correct_answer;
              
              let borderColor = "var(--border)";
              let bgColor = "var(--card)";
              let textColor = "var(--foreground)";

              if (selectedAnswer) {
                if (isCorrect) {
                  borderColor = "#22c55e";
                  bgColor = "#f0fdf4";
                } else if (isSelected) {
                  borderColor = "#ef4444";
                  bgColor = "#fef2f2";
                }
              }

              return (
                <button
                  key={opt.key}
                  onClick={() => !selectedAnswer && handleAnswer(opt.key)}
                  style={{
                    width: "100%", padding: "16px 20px", borderRadius: "12px", textAlign: "left",
                    border: `2px solid ${borderColor}`, background: bgColor, color: textColor,
                    display: "flex", alignItems: "center", gap: "12px", transition: "all 0.2s",
                    cursor: selectedAnswer ? "default" : "pointer", fontSize: "15px", fontWeight: "500"
                  }}
                >
                  <span style={{ 
                    width: "30px", height: "30px", borderRadius: "8px", 
                    background: isSelected ? "var(--primary)" : "var(--secondary)",
                    color: isSelected ? "white" : "var(--muted-foreground)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800"
                  }}>
                    {opt.key}
                  </span>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      <div style={{ padding: "1.5rem", textAlign: "center", fontSize: "12px", color: "var(--muted-foreground)", background: "var(--card)", borderTop: "1px solid var(--border)" }}>
        Ceci est une prévisualisation. Aucune donnée n'est enregistrée.
      </div>
    </div>
  );
}
