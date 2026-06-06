"use client";

import { useState } from "react";
import { Loader2, ArrowRight, XCircle } from "lucide-react";
import { disqualifyCandidate } from "@/lib/actions/assessment";

export default function QualifyingQuestionsModule({ candidate, questions, onComplete, onFail }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    // Check if all answers match expected answers
    const failed = questions.some(q => answers[q.id] !== q.expectedAnswer);

    if (failed) {
      // Disqualify candidate
      const res = await disqualifyCandidate(candidate.id);
      if (res.success) {
        onFail();
      } else {
        setError(res.error || "Une erreur est survenue.");
      }
    } else {
      // Pass
      onComplete();
    }
    setSubmitting(false);
  };

  const allAnswered = questions.every(q => answers[q.id]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: "600px", width: "100%", background: "var(--card)", padding: "2rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}>
        
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.5rem" }}>
            Questions préliminaires
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            Veuillez répondre à ces quelques questions pour confirmer que votre profil correspond aux pré-requis du poste.
          </p>
        </div>

        {error && (
          <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "var(--radius)", marginBottom: "1.5rem", fontSize: "14px", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <XCircle size={18} />
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {questions.map((q, index) => (
            <div key={q.id}>
              <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginBottom: "0.75rem" }}>
                {index + 1}. {q.text}
              </p>
              <div style={{ display: "flex", gap: "1rem" }}>
                <label style={{
                  flex: 1, padding: "1rem", textAlign: "center", borderRadius: "var(--radius)", cursor: "pointer",
                  border: `1.5px solid ${answers[q.id] === 'yes' ? 'var(--primary)' : 'var(--border)'}`,
                  background: answers[q.id] === 'yes' ? 'var(--accent)' : 'transparent',
                  fontWeight: answers[q.id] === 'yes' ? '600' : '400',
                  color: answers[q.id] === 'yes' ? 'var(--primary)' : 'var(--foreground)',
                  transition: "all 0.2s"
                }}>
                  <input 
                    type="radio" 
                    name={`q-${q.id}`} 
                    value="yes" 
                    checked={answers[q.id] === 'yes'}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: 'yes' }))}
                    style={{ display: "none" }}
                  />
                  Oui
                </label>
                <label style={{
                  flex: 1, padding: "1rem", textAlign: "center", borderRadius: "var(--radius)", cursor: "pointer",
                  border: `1.5px solid ${answers[q.id] === 'no' ? 'var(--primary)' : 'var(--border)'}`,
                  background: answers[q.id] === 'no' ? 'var(--accent)' : 'transparent',
                  fontWeight: answers[q.id] === 'no' ? '600' : '400',
                  color: answers[q.id] === 'no' ? 'var(--primary)' : 'var(--foreground)',
                  transition: "all 0.2s"
                }}>
                  <input 
                    type="radio" 
                    name={`q-${q.id}`} 
                    value="no" 
                    checked={answers[q.id] === 'no'}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: 'no' }))}
                    style={{ display: "none" }}
                  />
                  Non
                </label>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="btn btn-primary"
          style={{ width: "100%", marginTop: "2rem", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          disabled={!allAnswered || submitting}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 size={18} className="spin" /> : "Continuer"}
          {!submitting && <ArrowRight size={18} />}
        </button>

      </div>
    </div>
  );
}
