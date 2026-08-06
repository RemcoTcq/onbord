"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import QualifyingQuestionsConfig from "./QualifyingQuestionsConfig";

import VideoInterviewConfig from "./VideoInterviewConfig";
import AiInterviewConfig from "./AiInterviewConfig";
import CvScoringCriteria from "./CvScoringCriteria";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";

// Extracted from JobFormStepRecommendation
export function MessageBrandingTabs({ type, text, onChangeText }) {
  const [tab, setTab] = useState("message");
  
  return (
    <div style={{ margin: "-1.5rem", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", background: "#fafafa", padding: "0 1.5rem" }}>
        <button 
          onClick={() => setTab("message")}
          style={{ 
            padding: "1rem 1.5rem", border: "none", background: "transparent", cursor: "pointer",
            fontWeight: tab === "message" ? "700" : "500",
            color: tab === "message" ? "var(--primary)" : "var(--muted-foreground)",
            borderBottom: tab === "message" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          Message
        </button>
        <button 
          onClick={() => setTab("branding")}
          style={{ 
            padding: "1rem 1.5rem", border: "none", background: "transparent", cursor: "pointer",
            fontWeight: tab === "branding" ? "700" : "500",
            color: tab === "branding" ? "var(--primary)" : "var(--muted-foreground)",
            borderBottom: tab === "branding" ? "2px solid var(--primary)" : "2px solid transparent",
            transition: "all 0.2s"
          }}
        >
          Marque Employeur
        </button>
      </div>
      
      <div style={{ padding: "1.5rem", flex: 1, overflowY: "auto" }}>
        {tab === "message" && (
          <div>
            <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>
              {type === 'accueil' ? "Message d'accueil candidat" : "Message de fin de parcours"}
            </label>
            <textarea 
              className="input-field" 
              rows={6}
              value={text || ""}
              onChange={(e) => onChangeText(e.target.value)}
              placeholder="Saisissez votre message ici..."
            />
          </div>
        )}
        {tab === "branding" && (
          <EmployerBrandingForm />
        )}
      </div>
    </div>
  );
}

export default function PipelineNodeConfigPanel({ selectedNode, nodeTypeInfo, jobData, onClose, onUpdateConfig, onLinkAssessmentClick, onAIAssessmentClick }) {
  if (!selectedNode || !nodeTypeInfo) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fade-in" 
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 90 }} 
      />
      {/* Side Panel */}
      <div className="no-pan" style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: 'max(60vw, 650px)',
        background: 'white',
        borderLeft: '1px solid var(--border)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 30px rgba(0,0,0,0.1)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--border)', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${nodeTypeInfo.color || "var(--primary)"}15`, color: nodeTypeInfo.color || "var(--primary)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {nodeTypeInfo.icon && React.createElement(nodeTypeInfo.icon, { size: 20 })}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--foreground)', margin: 0 }}>
              {nodeTypeInfo.label}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '8px', borderRadius: '50%', background: 'var(--secondary)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', paddingBottom: '6rem' }}>
          {selectedNode.type === 'accueil' && (
            <MessageBrandingTabs 
              type="accueil"
              text={selectedNode.config?.text}
              onChangeText={(val) => onUpdateConfig(selectedNode.id, { text: val })}
            />
          )}
          {selectedNode.type === 'remerciements' && (
            <MessageBrandingTabs 
              type="remerciements"
              text={selectedNode.config?.text}
              onChangeText={(val) => onUpdateConfig(selectedNode.id, { text: val })}
            />
          )}
          {selectedNode.type === 'qualifying_questions' && (
            <div style={{ margin: '-1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <QualifyingQuestionsConfig 
                  config={{ enabled: true, questions: selectedNode.config?.questions || [] }}
                  onChange={(newConfig) => onUpdateConfig(selectedNode.id, { questions: newConfig.questions })}
                />
              </div>
            </div>
          )}
          {selectedNode.type === 'cv_scoring' && (
            <div style={{ margin: '-1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <CvScoringCriteria 
                  criteria={selectedNode.config?.criteria || jobData?.selection_criteria || []}
                  onChange={(newCriteria) => onUpdateConfig(selectedNode.id, { criteria: newCriteria })}
                />
              </div>
            </div>
          )}
          {selectedNode.type === 'experience' && (
            <div style={{ margin: '-1.5rem' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light, #e0e7ff)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
                  </div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    {selectedNode.config?.title || "Évaluation IA (Expérience)"}
                  </h4>
                  {selectedNode.config?.configured ? (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ color: 'var(--success, #16a34a)', fontSize: '14px', fontWeight: '500', marginBottom: '16px' }}>
                        ✅ Expérience IA configurée avec succès.
                      </p>
                      <button 
                        className="btn btn-outline"
                        onClick={() => onAIAssessmentClick && onAIAssessmentClick(selectedNode.id)}
                      >
                        Modifier avec l'IA
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', maxWidth: '300px', margin: '0 auto 16px' }}>
                        Générez une expérience de mise en situation complète et ultra-réaliste grâce au Tchat IA.
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => onAIAssessmentClick && onAIAssessmentClick(selectedNode.id)}
                          style={{ width: '250px' }}
                        >
                          Créer l'expérience avec l'IA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
