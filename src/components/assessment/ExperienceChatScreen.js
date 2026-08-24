"use client";

import { useEffect } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import AssessmentChatCreator from "./AssessmentChatCreator";

// Enveloppe plein écran du chat de conception d'expérience.
//
// Le conteneur est fixé au viewport pour échapper au padding et au maxWidth
// 1200 du layout dashboard : le chat n'est enfermé dans aucune carte, comme un
// vrai assistant. Il démarre après la sidebar, qui reste accessible (elle est
// au-dessus, z-index 50).
//
// Un seul composant pour tous les points d'entrée (hub Expériences, conception
// et ajustement depuis une offre) : c'est ce qui garantit que le chat est le
// même écran partout.
export default function ExperienceChatScreen({
  jobId,
  jobData,
  title,
  backLabel,
  onBack,
  actions = null,
  initialPrompt = "",
  onGenerated,
  onStepRegenerated,
  onUserMessage,
}) {
  // La page dessous ne doit pas défiler derrière l'overlay — sinon la molette
  // fait bouger la relecture pendant qu'on lit la conversation.
  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = precedent; };
  }, []);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, left: "var(--sidebar-collapsed-width)",
      display: "flex", flexDirection: "column", background: "var(--background)", zIndex: 30,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 24px",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <button onClick={onBack} className="btn btn-ghost btn-sm"
          style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--muted-foreground)", minWidth: 0 }}>
          <Briefcase size={15} style={{ flexShrink: 0 }} />
          <strong style={{ color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</strong>
        </div>
        {actions && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>

      {/* minHeight:0 : sans ça, l'enfant flex ne rétrécit pas et la zone de
          messages déborde au lieu de scroller. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <AssessmentChatCreator
          standalone context="job"
          jobId={jobId}
          jobData={jobData}
          initialPrompt={initialPrompt}
          onGenerated={onGenerated}
          onStepRegenerated={onStepRegenerated}
          onUserMessage={onUserMessage}
        />
      </div>
    </div>
  );
}
