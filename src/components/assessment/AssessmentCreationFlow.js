"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useState, useEffect, useRef } from "react";
import { Send, Plus, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AssessmentChatCreator from "./AssessmentChatCreator";

export default function AssessmentCreationFlow({ jobData, onTestCreated, onCancel }) {
  const t = useT();
  const [userName, setUserName] = useState("Loic");
  const [prompt, setPrompt] = useState("");
  const [isChatMode, setIsChatMode] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

  if (isChatMode) {
    return (
      <div style={{ height: "calc(100vh - 140px)", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px" }}>
          <button 
            onClick={onCancel}
            style={{
              background: "var(--card)", border: "1px solid var(--border)",
              cursor: "pointer", color: "var(--muted-foreground)",
              padding: "8px 12px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px",
              fontSize: "13px", fontWeight: "500"
            }}
          >
            <X size={16} /> Fermer l'assistant
          </button>
        </div>
        <AssessmentChatCreator 
          initialPrompt={prompt}
          onTestCreated={onTestCreated}
          standalone={true}
          context="job"
          jobId={jobData?.id}
          jobData={jobData}
        />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "60vh", position: "relative" }}>
      
      <button 
        onClick={onCancel}
        style={{
          position: "absolute", top: 0, right: 0,
          background: "transparent", border: "none",
          cursor: "pointer", color: "var(--muted-foreground)",
          display: "flex", alignItems: "center", gap: "8px",
          fontSize: "13px"
        }}
      >
        <X size={16} /> {t("common.actions.cancel")}
      </button>

      <div className="zoom-in" style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", color: "var(--foreground)", marginBottom: "24px", letterSpacing: "-0.02em" }}>
          {t("dashboard.assessmentCreation.hello", { name: userName })}
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
            placeholder={t("dashboard.assessmentCreation.whichType")}
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
                    {t("dashboard.assessmentCreation.addContext")}
                  </div>
                  {[
                    { icon: Paperclip, label: t("dashboard.assessmentCreation.jobAsPdf"), action: () => alert(t("dashboard.assessmentCreation.comingSoon")) },
                    { icon: Paperclip, label: t("dashboard.assessmentCreation.connectGithub"), action: () => alert(t("dashboard.assessmentCreation.comingSoon")) },
                    { icon: Paperclip, label: t("dashboard.assessmentCreation.uploadZip"), action: () => alert(t("dashboard.assessmentCreation.comingSoon")) },
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

        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "left" }}>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: 0 }}>
            Les évaluations créées seront automatiquement liées à cette offre ({jobData?.title || "ce poste"}) avec son contexte.
          </p>
        </div>
      </div>
    </div>
  );
}
