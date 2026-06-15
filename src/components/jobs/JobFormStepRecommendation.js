"use client";

import { useEffect, useState } from "react";
import { generateRecommendation } from "@/lib/recommendationEngine";
import { Check, Clock, BrainCircuit, FileCheck2, Video, MessageSquare, AlertTriangle, ShieldCheck } from "lucide-react";

export default function JobFormStepRecommendation({ jobData, assessmentModules, setAssessmentModules }) {
  const [recommendation, setRecommendation] = useState(null);

  useEffect(() => {
    if (jobData) {
      // By default, prefer video interview over text interview for new recommendations
      const rec = generateRecommendation(jobData, true);
      setRecommendation(rec);
      
      // Update assessment modules state based on recommendation
      setAssessmentModules({
        qualifying_questions: rec.steps.some(s => s.type === 'qualifying_questions'),
        cv_scoring: rec.steps.some(s => s.type === 'cv_scoring'),
        skills_test: rec.steps.some(s => s.type === 'skills_test'),
        ai_interview: rec.steps.some(s => s.type === 'ai_interview'),
        video_interview: rec.steps.some(s => s.type === 'video_interview'),
      });
    }
  }, [jobData, setAssessmentModules]);

  if (!recommendation) return null;

  const getIconForType = (type) => {
    switch (type) {
      case 'qualifying_questions': return <ShieldCheck size={20} className="text-primary" />;
      case 'cv_scoring': return <FileCheck2 size={20} className="text-primary" />;
      case 'skills_test': return <BrainCircuit size={20} className="text-primary" />;
      case 'ai_interview': return <MessageSquare size={20} className="text-primary" />;
      case 'video_interview': return <Video size={20} className="text-primary" />;
      default: return <Check size={20} className="text-primary" />;
    }
  };

  const handleToggleModule = (moduleKey) => {
    setAssessmentModules(prev => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Parcours Recommandé</h2>
        <p style={{ color: 'var(--muted-foreground)' }}>
          L'IA a généré un parcours d'évaluation optimal basé sur vos critères must-have et le temps candidat. Vous pouvez l'ajuster.
        </p>
      </div>

      {recommendation.warning && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)' }}>
          <AlertTriangle size={20} color="#ef4444" />
          <span style={{ fontSize: '14px', color: '#b91c1c', fontWeight: '500' }}>{recommendation.warning}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--primary)" />
          <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--foreground)' }}>Temps estimé pour le candidat :</span>
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '18px', color: recommendation.totalTime > 30 ? '#ef4444' : 'var(--primary)' }}>
          {recommendation.totalTime} min
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Render all possible modules, but style them differently if they are recommended vs manual */}
        
        {/* Qualifying Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label onClick={() => handleToggleModule('qualifying_questions')} style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
            background: assessmentModules.qualifying_questions ? 'var(--accent)' : 'var(--card)', 
            border: \`1.5px solid \${assessmentModules.qualifying_questions ? 'var(--primary)' : 'var(--border)'}\`,
            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              border: \`2px solid \${assessmentModules.qualifying_questions ? 'var(--primary)' : 'var(--border)'}\`,
              background: assessmentModules.qualifying_questions ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {assessmentModules.qualifying_questions && <Check size={13} style={{ color: 'white' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                {getIconForType('qualifying_questions')}
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Questions qualificatives (Filtre)</h3>
                {recommendation.steps.some(s => s.type === 'qualifying_questions') && (
                  <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>RECOMMANDÉ</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Bloque les candidats ne respectant pas les critères stricts.</p>
              
              {assessmentModules.qualifying_questions && recommendation.steps.find(s => s.type === 'qualifying_questions')?.covered_skills && (
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.25rem' }}>Critères ciblés :</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {recommendation.steps.find(s => s.type === 'qualifying_questions').covered_skills.map((skill, idx) => (
                      <li key={idx}><span style={{ fontWeight: '500', color: 'var(--foreground)' }}>{skill.name}</span> <span style={{ opacity: 0.7 }}>({skill.evidence})</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* CV Scoring */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label onClick={() => handleToggleModule('cv_scoring')} style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
            background: assessmentModules.cv_scoring ? 'var(--accent)' : 'var(--card)', 
            border: \`1.5px solid \${assessmentModules.cv_scoring ? 'var(--primary)' : 'var(--border)'}\`,
            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              border: \`2px solid \${assessmentModules.cv_scoring ? 'var(--primary)' : 'var(--border)'}\`,
              background: assessmentModules.cv_scoring ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {assessmentModules.cv_scoring && <Check size={13} style={{ color: 'white' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                {getIconForType('cv_scoring')}
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Scoring CV par IA</h3>
                {recommendation.steps.some(s => s.type === 'cv_scoring') && (
                  <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>RECOMMANDÉ</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Évalue la pertinence globale et les nice-to-have sans rallonger le parcours.</p>
              
              {assessmentModules.cv_scoring && recommendation.steps.find(s => s.type === 'cv_scoring')?.covered_skills && (
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.25rem' }}>Compétences évaluées ("Nice to have") :</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {recommendation.steps.find(s => s.type === 'cv_scoring').covered_skills.map((skill, idx) => (
                      <li key={idx}><span style={{ fontWeight: '500', color: 'var(--foreground)' }}>{skill.name}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Skills Test */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label onClick={() => handleToggleModule('skills_test')} style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
            background: assessmentModules.skills_test ? 'var(--accent)' : 'var(--card)', 
            border: \`1.5px solid \${assessmentModules.skills_test ? 'var(--primary)' : 'var(--border)'}\`,
            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              border: \`2px solid \${assessmentModules.skills_test ? 'var(--primary)' : 'var(--border)'}\`,
              background: assessmentModules.skills_test ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {assessmentModules.skills_test && <Check size={13} style={{ color: 'white' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                {getIconForType('skills_test')}
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Tests de Compétences Objectives</h3>
                {recommendation.steps.some(s => s.type === 'skills_test') && (
                  <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>RECOMMANDÉ</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Vérifie concrètement les hard skills critiques identifiés dans l'offre.</p>
              
              {assessmentModules.skills_test && recommendation.steps.find(s => s.type === 'skills_test')?.covered_skills && (
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.25rem' }}>Compétences ciblées (Must-Have) :</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {recommendation.steps.find(s => s.type === 'skills_test').covered_skills.map((skill, idx) => (
                      <li key={idx}><span style={{ fontWeight: '500', color: 'var(--foreground)' }}>{skill.name}</span> <span style={{ opacity: 0.7 }}>({skill.suggested_test})</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* Video Interview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label onClick={() => handleToggleModule('video_interview')} style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
            background: assessmentModules.video_interview ? 'var(--accent)' : 'var(--card)', 
            border: \`1.5px solid \${assessmentModules.video_interview ? 'var(--primary)' : 'var(--border)'}\`,
            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              border: \`2px solid \${assessmentModules.video_interview ? 'var(--primary)' : 'var(--border)'}\`,
              background: assessmentModules.video_interview ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {assessmentModules.video_interview && <Check size={13} style={{ color: 'white' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                {getIconForType('video_interview')}
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Entretien Vidéo IA (One-Way)</h3>
                {recommendation.steps.some(s => s.type === 'video_interview') && (
                  <span style={{ fontSize: '10px', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>RECOMMANDÉ</span>
                )}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Évalue la communication verbale et les soft skills non testables de manière asynchrone.</p>
              
              {assessmentModules.video_interview && recommendation.steps.find(s => s.type === 'video_interview' || s.type === 'ai_interview')?.covered_skills && (
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '0.25rem' }}>Compétences évaluées :</p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '12px', color: 'var(--muted-foreground)' }}>
                    {recommendation.steps.find(s => s.type === 'video_interview' || s.type === 'ai_interview').covered_skills.map((skill, idx) => (
                      <li key={idx}><span style={{ fontWeight: '500', color: 'var(--foreground)' }}>{skill.name}</span> <span style={{ opacity: 0.7 }}>("{skill.evidence}")</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </label>
        </div>
        
        {/* Text Interview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label onClick={() => handleToggleModule('ai_interview')} style={{
            display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
            background: assessmentModules.ai_interview ? 'var(--accent)' : 'var(--card)', 
            border: \`1.5px solid \${assessmentModules.ai_interview ? 'var(--primary)' : 'var(--border)'}\`,
            borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms', opacity: assessmentModules.video_interview ? 0.5 : 1
          }}>
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              border: \`2px solid \${assessmentModules.ai_interview ? 'var(--primary)' : 'var(--border)'}\`,
              background: assessmentModules.ai_interview ? 'var(--primary)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {assessmentModules.ai_interview && <Check size={13} style={{ color: 'white' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px' }}>
                {getIconForType('ai_interview')}
                <h3 style={{ fontSize: '15px', fontWeight: '600' }}>Interview IA par Texte (Alternative)</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Alternative à l'entretien vidéo si vous préférez une évaluation textuelle interactive.</p>
            </div>
          </label>
        </div>

      </div>
    </div>
  );
}
