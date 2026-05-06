"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, Loader2, PartyPopper, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingChecklist({ user }) {
  const [status, setStatus] = useState({
    jobCreated: false,
    candidateImported: false,
    scoringLaunched: false,
  });
  const [loading, setLoading] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (user?.onboarding_completed_at) {
      setCompleted(true);
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      const supabase = createClient();
      
      // 1. Check jobs
      const { count: jobCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // 2. Check candidates
      const { count: candidateCount } = await supabase
        .from('candidates')
        .select('*, jobs!inner(*)', { count: 'exact', head: true })
        .eq('jobs.user_id', user.id);

      // 3. Check scoring
      const { count: scoringCount } = await supabase
        .from('candidates')
        .select('*, jobs!inner(*)', { count: 'exact', head: true })
        .eq('jobs.user_id', user.id)
        .not('score_cv', 'is', null);

      const newStatus = {
        jobCreated: jobCount > 0,
        candidateImported: candidateCount > 0,
        scoringLaunched: scoringCount > 0,
      };

      setStatus(newStatus);

      // If all done, mark as completed in DB after a short delay
      if (newStatus.jobCreated && newStatus.candidateImported && newStatus.scoringLaunched) {
        setTimeout(async () => {
          await supabase.from('users').update({ 
            onboarding_completed_at: new Date().toISOString() 
          }).eq('id', user.id);
          setCompleted(true);
        }, 2000);
      }

      setLoading(false);
    };

    checkStatus();
    // Re-check every 10 seconds while on dashboard
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  if (completed || loading) return null;

  const steps = [
    { id: "account", label: "Compte créé", done: true },
    { id: "job", label: "Première demande créée", done: status.jobCreated },
    { id: "candidate", label: "Premier candidat importé", done: status.candidateImported },
    { id: "scoring", label: "Premier scoring lancé", done: status.scoringLaunched },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const progress = (doneCount / steps.length) * 100;

  if (minimized) {
    return (
      <button 
        onClick={() => setMinimized(false)}
        style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
          background: "var(--primary)", color: "white", padding: "12px 20px",
          borderRadius: "30px", border: "none", cursor: "pointer", fontWeight: "700",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "8px"
        }}
      >
        <Loader2 size={16} className="spin" />
        {doneCount}/4 Étapes complétées
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 100,
      width: "320px", background: "var(--card)", border: "1px solid var(--border)",
      borderRadius: "16px", boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
      overflow: "hidden", animation: "slideUp 0.4s ease"
    }}>
      <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h4 style={{ fontSize: "15px", fontWeight: "700" }}>Guide d'activation</h4>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Prêt à recruter ?</p>
        </div>
        <button onClick={() => setMinimized(true)} style={{ background: "transparent", border: "none", color: "var(--muted-foreground)", cursor: "pointer" }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ height: "4px", background: "var(--secondary)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "var(--primary)", transition: "width 0.6s ease" }} />
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", gap: "12px", opacity: step.done ? 1 : 0.6 }}>
            {step.done ? (
              <CheckCircle2 size={20} style={{ color: "#22c55e" }} />
            ) : (
              <Circle size={20} style={{ color: "var(--muted-foreground)" }} />
            )}
            <span style={{ 
              fontSize: "13px", fontWeight: step.done ? "600" : "500",
              textDecoration: step.done ? "line-through" : "none",
              color: step.done ? "var(--muted-foreground)" : "var(--foreground)"
            }}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {doneCount === 4 && (
        <div style={{ 
          padding: "16px", background: "#f0fdf4", display: "flex", 
          alignItems: "center", gap: "12px", borderTop: "1px solid #bbf7d0" 
        }}>
          <PartyPopper size={20} style={{ color: "#22c55e" }} />
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>Bravo ! Vous êtes opérationnel.</p>
        </div>
      )}
    </div>
  );
}
