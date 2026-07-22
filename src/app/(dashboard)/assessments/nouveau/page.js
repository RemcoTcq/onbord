"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Send, Paperclip, Loader2, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Import the actual chat logic/component from Brique 1 but we'll refactor it slightly to fit here if needed,
// OR we can just use AssessmentChatCreator but rendered differently.
import AssessmentChatCreator from "@/components/assessment/AssessmentChatCreator";
import JobSelectionModal from "@/components/jobs/JobSelectionModal";

export default function AssessmentCreatorPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Loic");
  const [prompt, setPrompt] = useState("");
  const [isChatMode, setIsChatMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const optionsRef = useRef(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.first_name) {
        setUserName(user.user_metadata.first_name);
      }
    }
    loadUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptions(false);
      }
    }
    if (showOptions) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showOptions]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsChatMode(true);
  };

  const handleTestCreated = (test) => {
    // Le chat recommence à zéro après la création (selon la demande de l'utilisateur)
    router.push(`/assessments`);
  };

  // If chat mode is active, we render the chat component instead of the hero
  if (isChatMode) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 'var(--sidebar-collapsed-width, 80px)',
        backgroundColor: 'var(--background)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <AssessmentChatCreator 
          initialPrompt={prompt}
          onTestCreated={handleTestCreated}
          standalone={true}
        />
      </div>
    );
  }

  // Initial Hero View
  return (
    <div style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto", minHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      
      <div className="zoom-in" style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--foreground)", marginBottom: "24px", letterSpacing: "-0.02em" }}>
          Bonjour {userName}
        </h1>

        <form 
          onSubmit={handleSubmit}
          style={{ 
            position: "relative",
            maxWidth: "600px",
            margin: "0 auto 16px auto",
            display: "flex",
            flexDirection: "column",
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
            padding: "16px",
            transition: "all 200ms ease",
            minHeight: "120px"
          }}
          className="focus-ring"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Quel type d'évaluation souhaitez-vous créer ?"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              fontSize: "15px", color: "var(--foreground)",
              minHeight: "40px", resize: "none", width: "100%", marginBottom: "16px"
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", width: "100%" }}>
            <div ref={optionsRef} style={{ position: "relative" }}>
              <button 
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                style={{
                  width: "36px", height: "36px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "var(--muted-foreground)",
                  borderRadius: "8px",
                  transition: "all 150ms ease"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <Plus size={20} />
              </button>

              {showOptions && (
                <div 
                  className="fade-in"
                  style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    background: "var(--card)", border: "1px solid var(--border)",
                    borderRadius: "12px", boxShadow: "0 12px 24px -4px rgba(0,0,0,0.12)",
                    zIndex: 50, width: "240px", padding: "8px",
                    textAlign: "left"
                  }}
                >
                  <div style={{ padding: "8px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", color: "var(--muted-foreground)", letterSpacing: "0.05em" }}>
                    Ajouter du contexte
                  </div>
                  {[
                    { icon: Paperclip, label: "Poste en PDF", action: () => alert("Bientôt disponible") },
                    { icon: Paperclip, label: "Connecter repo Github", action: () => alert("Bientôt disponible") },
                    { icon: Paperclip, label: "Upload un doc ZIP", action: () => alert("Bientôt disponible") },
                  ].map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { opt.action(); setShowOptions(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: "12px",
                        width: "100%", padding: "10px", border: "none",
                        background: "transparent", color: "var(--foreground)",
                        borderRadius: "8px", cursor: "pointer", fontSize: "13px",
                        transition: "background 150ms ease"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--secondary)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <opt.icon size={15} style={{ color: "var(--muted-foreground)" }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!prompt.trim()}
              style={{
                width: "36px", height: "36px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: prompt.trim() ? "var(--foreground)" : "var(--secondary)", 
                border: "none", cursor: prompt.trim() ? "pointer" : "default",
                color: prompt.trim() ? "white" : "var(--muted-foreground)",
                borderRadius: "8px",
                transition: "all 200ms ease"
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </form>

        <div style={{ maxWidth: "600px", margin: "0 auto 40px auto", textAlign: "left" }}>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
            Les évaluations associées à un poste sont automatiquement extraites des détails de l'offre d'emploi qui lui sont rattachés.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", maxWidth: "600px", margin: "0 auto" }}>
          {/* Offre existante */}
          <button
            onClick={() => setShowJobModal(true)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between",
              padding: "20px", background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "16px", cursor: "pointer", transition: "all 200ms ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)", minHeight: "120px"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Briefcase size={16} style={{ color: "var(--foreground)" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", textAlign: "left" }}>Offre d'emploi existante</span>
          </button>

          {/* Nouvelle offre */}
          <button
            onClick={() => router.push("/jobs/nouveau")}
            style={{
              display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between",
              padding: "20px", background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "16px", cursor: "pointer", transition: "all 200ms ease",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)", minHeight: "120px"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
            }}
          >
            <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Plus size={16} style={{ color: "var(--foreground)" }} />
            </div>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", textAlign: "left" }}>Nouvelle offre d'emploi</span>
          </button>
        </div>
      </div>

      <JobSelectionModal 
        isOpen={showJobModal} 
        onClose={() => setShowJobModal(false)}
        onSelect={(job) => {
          setShowJobModal(false);
          // Redirect to the jobs detail page on the evaluations tab
          // Note: we'd need to make sure the tab is selected. 
          // For now, we'll just redirect to the job and maybe update page.js to read ?tab=evaluations later.
          router.push(`/jobs/${job.id}`);
        }}
      />
    </div>
  );
}
