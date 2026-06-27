"use client";

import { useState } from "react";
import { Loader2, ArrowRight, ChevronRight } from "lucide-react";
import { disqualifyCandidate } from "@/lib/actions/assessment";
import { getContrastColor } from "./CandidateOnboardingFlow";

export default function QualifyingQuestionsModule({ candidate, job, recruiter, questions, onComplete, onFail }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const primaryColor = recruiter?.brand_primary_color || "#0f172a";
  const primaryText = getContrastColor(primaryColor);
  const logoUrl = recruiter?.company_logo_url || null;
  const companyName = recruiter?.company_name || job?.company || "l'entreprise";

  const handleAnswer = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleNext = async () => {
    // If it's not the last question, just go to the next screen
    if (step < questions.length - 1) {
      setStep(prev => prev + 1);
      return;
    }

    // It's the last question, we submit
    setSubmitting(true);
    const failed = questions.some(q => answers[q.id] !== q.expectedAnswer);

    if (failed) {
      const res = await disqualifyCandidate(candidate.id);
      if (res.success) {
        onFail();
      } else {
        alert(res.error || "Une erreur est survenue.");
      }
    } else {
      onComplete();
    }
    setSubmitting(false);
  };

  const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    color: "var(--foreground)",
    fontFamily: "var(--font-sans)",
    position: "relative",
  };

  const headerStyle = {
    padding: "2rem 2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    boxSizing: "border-box"
  };

  const contentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    maxWidth: "600px",
    margin: "0 auto",
    marginTop: "-8vh",
    width: "100%",
    textAlign: "center"
  };

  const buttonStyle = {
    backgroundColor: primaryColor,
    color: primaryText,
    border: "none",
    borderRadius: "8px",
    padding: "0.875rem 2rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "opacity 0.2s",
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed"
  };

  const currentQ = questions[step];
  const hasAnsweredCurrent = answers[currentQ.id] !== undefined;

  return (
    <div style={pageStyle} className="fade-in">
      <div style={headerStyle}>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} style={{ height: "32px", objectFit: "contain" }} />
        ) : (
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>{companyName}</h2>
        )}
      </div>

      <div style={contentStyle} className="slide-up" key={currentQ.id}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "3rem", lineHeight: "1.4" }}>
          {currentQ.text}
        </h2>
        
        <div style={{ display: "flex", gap: "1rem", width: "100%", maxWidth: "320px", marginBottom: "2.5rem" }}>
          <button 
            onClick={() => handleAnswer(currentQ.id, 'yes')}
            style={{
              flex: 1,
              padding: "0.875rem",
              borderRadius: "10px",
              border: `2px solid ${answers[currentQ.id] === 'yes' ? primaryColor : 'var(--border)'}`,
              backgroundColor: answers[currentQ.id] === 'yes' ? `${primaryColor}1a` : 'transparent',
              color: answers[currentQ.id] === 'yes' ? primaryColor : 'var(--foreground)',
              fontWeight: answers[currentQ.id] === 'yes' ? '700' : '500',
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Oui
          </button>
          
          <button 
            onClick={() => handleAnswer(currentQ.id, 'no')}
            style={{
              flex: 1,
              padding: "0.875rem",
              borderRadius: "10px",
              border: `2px solid ${answers[currentQ.id] === 'no' ? primaryColor : 'var(--border)'}`,
              backgroundColor: answers[currentQ.id] === 'no' ? `${primaryColor}1a` : 'transparent',
              color: answers[currentQ.id] === 'no' ? primaryColor : 'var(--foreground)',
              fontWeight: answers[currentQ.id] === 'no' ? '700' : '500',
              fontSize: "1rem",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Non
          </button>
        </div>

        <button 
          onClick={handleNext} 
          disabled={!hasAnsweredCurrent || submitting} 
          style={(!hasAnsweredCurrent || submitting) ? disabledButtonStyle : buttonStyle}
        >
          {submitting ? <><Loader2 size={18} className="spin" /> Validation...</> : (
            <>
              {step === questions.length - 1 ? "Terminer" : "Continuer"} 
              <ChevronRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
