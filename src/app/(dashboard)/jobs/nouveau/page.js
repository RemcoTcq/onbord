"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Wand2, Briefcase, FileCheck2, Loader2, AlertCircle, UploadCloud, FileText, Paperclip, Sparkles, ClipboardList, X, Users, Search, Link as LinkIcon, Copy, CheckCircle2 } from "lucide-react";
import { analyzeJobDescription } from "@/lib/actions/job";
import { parseFile } from "@/lib/actions/parse-file";
import { scoreCandidate } from "@/lib/actions/candidate";
import { createClient } from "@/lib/supabase/client";
import { checkUserQuota, incrementUserUsage } from "@/lib/actions/usage";
import JobFormStep2 from "@/components/jobs/JobFormStep2";
import AiInterviewConfig from "@/components/jobs/AiInterviewConfig";
import SkillsTestConfig from "@/components/jobs/SkillsTestConfig";
import CvScoringCriteria from "@/components/jobs/CvScoringCriteria";
import QualifyingQuestionsConfig from "@/components/jobs/QualifyingQuestionsConfig";
import { useToast } from "@/components/ui/Toast";
import { updateJobAiConfig } from "@/lib/actions/job";
import { saveAssessmentConfig } from "@/lib/actions/assessment";

export default function NouvelleDemandePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [rawDescription, setRawDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isOfferMenuOpen, setIsOfferMenuOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [savedJobId, setSavedJobId] = useState(null);
  const [savedJob, setSavedJob] = useState(null);
  const [assessmentModules, setAssessmentModules] = useState({
    qualifying_questions: false,
    cv_scoring: true,
    ai_interview: false,
    skills_test: false,
  });
  const [qualifyingConfigPayload, setQualifyingConfigPayload] = useState(null);
  const [aiConfigPayload, setAiConfigPayload] = useState(null);
  const [skillsConfigPayload, setSkillsConfigPayload] = useState(null);
  
  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const textRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOfferMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const parseResult = await parseFile(formData);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || "Erreur lors de l'analyse du document.");
      }

      const text = parseResult.text;
      // Immédiatement analyser après le parsing pour un flow fluide
      await handleAnalyze(text);
      setIsParsingFile(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erreur lors de la lecture du fichier.");
      setFileName("");
      setIsParsingFile(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyze = async (content = rawDescription) => {
    const targetContent = typeof content === 'string' ? content : rawDescription;
    if (!targetContent || targetContent.trim().length < 50) {
      setError("La description est trop courte. Veuillez fournir plus de détails.");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    if (isPasteModalOpen) setIsPasteModalOpen(false);
    
    try {
      const data = await analyzeJobDescription(targetContent);
      setJobData(data);
      setRawDescription(targetContent); // Keep the analyzed content in state
      setCurrentStep(2);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'analyse.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async (continueToModules = false) => {
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Vous devez être connecté pour sauvegarder.");

      // Vérification du quota
      const quota = await checkUserQuota('job');
      if (!quota.allowed) {
        throw new Error(quota.error);
      }

      // 1. Insert Job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          user_id: user.id,
          title: jobData.title || 'Poste sans titre',
          category: jobData.category,
          description: rawDescription,
          experience_level: jobData.experience_level,
          work_mode: jobData.work_mode,
          contract_type: jobData.contract_type,
          location: jobData.location,
          extracted_criteria: {
            ...jobData
          },
          status: continueToModules ? 'active' : 'draft',
        })
        .select()
        .single();

      if (jobError) throw jobError;
      
      setSavedJobId(job.id);
      setSavedJob(job);

      // 2. Insert Skills
      const skillsToInsert = [];
      if (jobData.hard_skills) {
        jobData.hard_skills.forEach(s => skillsToInsert.push({ job_id: job.id, name: s.name, type: 'hard_skill', priority: s.priority }));
      }
      if (jobData.soft_skills) {
        jobData.soft_skills.forEach(s => skillsToInsert.push({ job_id: job.id, name: s.name, type: 'soft_skill', priority: s.priority }));
      }

      if (skillsToInsert.length > 0) {
        const { error: skillsError } = await supabase.from('job_skills').insert(skillsToInsert);
        if (skillsError) throw skillsError;
      }

      await incrementUserUsage('job');

      if (continueToModules) {
        setCurrentStep(3); // Go to module selection
      } else {
        router.push('/jobs');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCriteriaNext = async () => {
    setIsSaving(true);
    try {
      if (assessmentModules.ai_interview) {
        setCurrentStep(5);
      } else if (assessmentModules.skills_test) {
        setCurrentStep(6);
      } else {
        setCurrentStep(7);
      }
    } catch (err) {
      toast("Erreur", "error");
    }
    setIsSaving(false);
  };

  const handleModulesSelectionNext = async () => {
    setIsSaving(true);
    try {
      // Save job (first time)
      if (!savedJobId) {
        await handleSave(true);
      }

      // Initialize basic config in DB for the selected modules
      await saveAssessmentConfig(savedJobId, {
        modules: {
          qualifying_questions: { enabled: assessmentModules.qualifying_questions, questions: [] },
          cv_scoring: { enabled: assessmentModules.cv_scoring },
          ai_interview: { enabled: assessmentModules.ai_interview },
          skills_tests: { enabled: assessmentModules.skills_test, tests: [] },
        }
      });
      // Move to next step dynamically based on selection
      if (assessmentModules.qualifying_questions) {
        setCurrentStep(4);
      } else if (assessmentModules.cv_scoring) {
        setCurrentStep(5);
      } else if (assessmentModules.ai_interview) {
        setCurrentStep(6);
      } else if (assessmentModules.skills_test) {
        setCurrentStep(7);
      } else {
        setCurrentStep(8); // Recap
      }
    } catch (err) {
      toast("Erreur de mise à jour", "error");
    }
    setIsSaving(false);
  };

  const handleQualifyingNext = async () => {
    setIsSaving(true);
    try {
      if (qualifyingConfigPayload) {
        await saveAssessmentConfig(savedJobId, {
          modules: {
            qualifying_questions: qualifyingConfigPayload,
            cv_scoring: { enabled: assessmentModules.cv_scoring },
            ai_interview: { enabled: assessmentModules.ai_interview },
            skills_tests: { enabled: assessmentModules.skills_test, tests: skillsConfigPayload?.tests || [] },
          }
        });
      }
      if (assessmentModules.cv_scoring) {
        setCurrentStep(5);
      } else if (assessmentModules.ai_interview) {
        setCurrentStep(6);
      } else if (assessmentModules.skills_test) {
        setCurrentStep(7);
      } else {
        setCurrentStep(8);
      }
    } catch (err) {
      toast("Erreur de sauvegarde", "error");
    }
    setIsSaving(false);
  };

  const handleCriteriaNext = async () => {
    setIsSaving(true);
    try {
      if (assessmentModules.ai_interview) {
        setCurrentStep(6);
      } else if (assessmentModules.skills_test) {
        setCurrentStep(7);
      } else {
        setCurrentStep(8);
      }
    } catch (err) {
      toast("Erreur", "error");
    }
    setIsSaving(false);
  };

  const handleAiConfigNext = async () => {
    setIsSaving(true);
    try {
      if (aiConfigPayload) {
        await updateJobAiConfig(savedJobId, { ...aiConfigPayload, enabled: true });
      }
      if (assessmentModules.skills_test) {
        setCurrentStep(7);
      } else {
        setCurrentStep(8); // Recap
      }
    } catch (err) {
      toast("Erreur de sauvegarde", "error");
    }
    setIsSaving(false);
  };

  const handleSkillsConfigNext = async () => {
    setIsSaving(true);
    try {
      if (skillsConfigPayload) {
        await saveAssessmentConfig(savedJobId, {
          modules: {
            qualifying_questions: qualifyingConfigPayload,
            cv_scoring: { enabled: assessmentModules.cv_scoring },
            ai_interview: { enabled: assessmentModules.ai_interview },
            skills_tests: { enabled: assessmentModules.skills_test, tests: skillsConfigPayload.tests || [] },
          }
        });
      }
      setCurrentStep(8); // Recap
    } catch (err) {
      toast("Erreur de sauvegarde", "error");
    }
    setIsSaving(false);
  };

  const handleRecapNext = () => {
    setCurrentStep(9);
  };

  const calculateCost = () => {
    let cost = 0;
    const details = [];
    if (assessmentModules.qualifying_questions) {
      details.push({ name: "Questions Qualificatives", cost: 0, reason: "Inclus gratuitement" });
    }
    if (assessmentModules.cv_scoring) {
      cost += 1;
      details.push({ name: "Scoring de CV par IA", cost: 1, reason: "Analyse et extraction" });
    }
    if (assessmentModules.skills_test) {
      cost += 2;
      details.push({ name: "Tests de compétences", cost: 2, reason: "Accès aux tests et correction" });
    }
    if (assessmentModules.ai_interview) {
      cost += 3;
      details.push({ name: "Interview IA par Texte", cost: 3, reason: "Conversation interactive et résumé" });
    }
    return { total: cost, details };
  };

  const handleFieldChange = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Modal pour coller l'offre */}
      {isPasteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="fade-in" style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '700px', padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)', margin: 0 }}>Coller votre offre d'emploi</h2>
              <button onClick={() => setIsPasteModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>Collez le texte de l'offre. L'IA va l'analyser et pré-remplir le formulaire.</p>
            
            <textarea 
              className="input-field"
              style={{ minHeight: '300px', resize: 'vertical', marginBottom: '1.5rem' }}
              placeholder="Collez ici le contenu complet de l'offre d'emploi..."
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                className="btn btn-outline"
                style={{ fontWeight: '600' }}
                onClick={() => setIsPasteModalOpen(false)}
              >
                Annuler
              </button>
              <button 
                className="btn btn-primary"
                style={{ background: '#8ca3b8', color: 'white', border: 'none' }}
                onClick={() => handleAnalyze(pasteContent)}
                disabled={isAnalyzing || pasteContent.trim().length === 0}
              >
                {isAnalyzing ? <Loader2 size={16} className="spin" /> : null}
                Rechercher
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(step => (
            <div key={step} style={{
              flex: 1, height: '4px', borderRadius: '4px',
              background: currentStep >= step ? 'var(--primary)' : 'var(--secondary)'
            }} />
          ))}
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--foreground)' }}>
          {currentStep === 1 ? "1. Offre d'emploi" : 
           currentStep === 2 ? "2. Détails" : 
           currentStep === 3 ? "3. Choix des évaluations" :
           currentStep === 4 ? "4. Questions Qualificatives" : 
           currentStep === 5 ? "5. Critères de Scoring" : 
           currentStep === 6 ? "6. Paramètres de l'Assessment" : 
           currentStep === 7 ? "7. Paramètres des Tests Techniques" : 
           currentStep === 8 ? "8. Récapitulatif" : 
           "9. Finalisation"}
        </h3>
      </div>

      {/* Step Content */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
        {currentStep === 1 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Décrivez votre besoin</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Notre IA analyse votre description en temps réel et structure le formulaire pour vous.
            </p>
            
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '14px' }}>{error}</span>
              </div>
            )}
            
            {/* Menu Offre d'emploi au-dessus */}
            <div style={{ marginBottom: '0.75rem', position: 'relative' }} ref={menuRef}>
              <button 
                type="button"
                onClick={() => setIsOfferMenuOpen(!isOfferMenuOpen)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', fontSize: '14px', fontWeight: '600', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', transition: 'opacity 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <Paperclip size={16} />
                Offre d'emploi
              </button>

              {isOfferMenuOpen && (
                <div style={{ 
                  position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                  background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius)', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', 
                  zIndex: 10, minWidth: '220px', padding: '4px'
                }}>
                  <button 
                    type="button"
                    onClick={() => { fileInputRef.current?.click(); setIsOfferMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '14px', color: 'var(--foreground)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {isParsingFile ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} style={{ color: '#0f172a' }} />}
                    Importer un fichier
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsPasteModalOpen(true); setIsOfferMenuOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '10px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '14px', color: 'var(--foreground)' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <ClipboardList size={16} style={{ color: '#0f172a' }} />
                    Coller le texte
                  </button>
                </div>
              )}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf,.docx,.txt" 
              style={{ display: 'none' }} 
            />

            {/* Fichier chargé indicator */}
            {fileName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--accent)', borderRadius: 'var(--radius)', marginBottom: '1rem', width: 'fit-content' }}>
                <FileText size={14} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>{fileName} importé</span>
              </div>
            )}

            {/* Search Bar Style Input */}
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              padding: '0.75rem 1rem'
            }}>
              <input 
                type="text"
                style={{ 
                  flex: 1, 
                  border: 'none', 
                  outline: 'none', 
                  fontSize: '15px', 
                  color: 'var(--foreground)',
                  background: 'transparent'
                }}
                placeholder="Décrivez le profil recherché en quelques mots..."
                value={rawDescription}
                onChange={(e) => {
                  setRawDescription(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
              />

              <button 
                type="button"
                onClick={() => handleAnalyze()}
                disabled={isAnalyzing || rawDescription.trim().length === 0}
                style={{ background: 'var(--primary)', border: 'none', color: 'white', cursor: rawDescription.trim().length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', opacity: rawDescription.trim().length > 0 ? 1 : 0.5, transition: 'opacity 0.2s' }}
              >
                {isAnalyzing ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              </button>
            </div>

            {/* Real-time pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {[
                { label: 'Titre du job', active: rawDescription.length > 15 },
                { label: 'Skills', active: /python|react\.js|java[^S]|sql|excel|seo|sea|docker|php|c\+\+|javascript|adobe/i.test(rawDescription) },
                { label: 'Localisation', active: /bruxelles|paris|remote|télétravail|hybride|gand|anvers|sur site|liège/i.test(rawDescription) },
                { label: 'Langues', active: /francophone|français|anglais|english|néerlandais|bilingue|nederlands/i.test(rawDescription) }
              ].map(pill => (
                <div key={pill.label} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '500',
                  background: pill.active ? '#dcfce7' : 'white',
                  color: pill.active ? '#166534' : 'var(--muted-foreground)',
                  border: `1px solid ${pill.active ? '#bbf7d0' : 'var(--border)'}`,
                  transition: 'all 0.3s'
                }}>
                  {pill.active && <Check size={14} />}
                  {!pill.active && <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--muted-foreground)', opacity: 0.4 }}></span>}
                  {pill.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && jobData && (
          <div style={{ flex: 1 }}>
            <JobFormStep2 jobData={jobData} setJobData={setJobData} />
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Choix des évaluations</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
              Sélectionnez les modules que les candidats devront compléter lorsqu'ils postuleront.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Qualifying Questions */}
              <label onClick={() => setAssessmentModules(prev => ({ ...prev, qualifying_questions: !prev.qualifying_questions }))} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
                background: assessmentModules.qualifying_questions ? 'var(--accent)' : 'var(--card)', 
                border: `1.5px solid ${assessmentModules.qualifying_questions ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                  border: `2px solid ${assessmentModules.qualifying_questions ? 'var(--primary)' : 'var(--border)'}`,
                  background: assessmentModules.qualifying_questions ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assessmentModules.qualifying_questions && <Check size={13} style={{ color: 'white' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Questions qualificatives</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Filtrez les candidats avant l'assessment avec des questions éliminatoires (ex: Avez-vous le permis B ?).</p>
                </div>
              </label>

              {/* CV Scoring */}
              <label onClick={() => setAssessmentModules(prev => ({ ...prev, cv_scoring: !prev.cv_scoring }))} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
                background: assessmentModules.cv_scoring ? 'var(--accent)' : 'var(--card)', 
                border: `1.5px solid ${assessmentModules.cv_scoring ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                  border: `2px solid ${assessmentModules.cv_scoring ? 'var(--primary)' : 'var(--border)'}`,
                  background: assessmentModules.cv_scoring ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assessmentModules.cv_scoring && <Check size={13} style={{ color: 'white' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Scoring de CV par IA</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>L'IA analyse le CV du candidat et le compare automatiquement aux critères que vous définissez.</p>
                </div>
              </label>

              {/* AI Interview */}
              <label onClick={() => setAssessmentModules(prev => ({ ...prev, ai_interview: !prev.ai_interview }))} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
                background: assessmentModules.ai_interview ? 'var(--accent)' : 'var(--card)', 
                border: `1.5px solid ${assessmentModules.ai_interview ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                  border: `2px solid ${assessmentModules.ai_interview ? 'var(--primary)' : 'var(--border)'}`,
                  background: assessmentModules.ai_interview ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assessmentModules.ai_interview && <Check size={13} style={{ color: 'white' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Interview IA par Texte</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>L'assistant mène un entretien personnalisé pour valider les motivations et l'expertise du candidat.</p>
                </div>
              </label>

              {/* Skills Tests */}
              <label onClick={() => setAssessmentModules(prev => ({ ...prev, skills_test: !prev.skills_test }))} style={{
                display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.25rem', 
                background: assessmentModules.skills_test ? 'var(--accent)' : 'var(--card)', 
                border: `1.5px solid ${assessmentModules.skills_test ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 150ms'
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                  border: `2px solid ${assessmentModules.skills_test ? 'var(--primary)' : 'var(--border)'}`,
                  background: assessmentModules.skills_test ? 'var(--primary)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {assessmentModules.skills_test && <Check size={13} style={{ color: 'white' }} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Tests de compétences</h3>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Proposez des tests certifiés pour valider des compétences pointues de manière neutre.</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {currentStep === 4 && savedJob && assessmentModules.qualifying_questions && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Questions Qualificatives</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Ajoutez des questions éliminatoires pour filtrer automatiquement les candidats.
            </p>
            <QualifyingQuestionsConfig 
              config={{ enabled: true, questions: [] }} 
              onChange={setQualifyingConfigPayload} 
            />
          </div>
        )}

        {currentStep === 5 && jobData && assessmentModules.cv_scoring && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Critères de Scoring CV</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Définissez les éléments clés que l'IA doit rechercher dans les CV pour calculer le score de correspondance.
            </p>
            <CvScoringCriteria 
              criteria={jobData.selection_criteria} 
              onChange={(newCriteria) => setJobData(prev => ({ ...prev, selection_criteria: newCriteria }))} 
            />
          </div>
        )}

        {currentStep === 6 && savedJob && assessmentModules.ai_interview && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Paramètres de l'Assessment</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Personnalisez les questions et le comportement de votre assistant recruteur.
            </p>
            <AiInterviewConfig 
              job={savedJob} 
              embedded={true} 
              hideSaveBar={true} 
              onChange={setAiConfigPayload} 
            />
          </div>
        )}

        {currentStep === 7 && savedJob && assessmentModules.skills_test && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Choix des Tests Techniques</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Sélectionnez les évaluations pertinentes pour vérifier le socle de compétences.
            </p>
            <SkillsTestConfig 
              jobId={savedJob.id}
              config={{ enabled: true, tests: [] }}
              onChange={setSkillsConfigPayload}
            />
          </div>
        )}

        {currentStep === 8 && savedJob && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Récapitulatif de l'assessment</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Voici les modules que les candidats devront passer et leur coût en crédits. Les crédits sont déduits par candidat uniquement s'ils complètent le module.
            </p>

            <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', background: 'var(--secondary)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Module sélectionné</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Coût par candidat</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {calculateCost().details.map((detail, idx) => (
                  <div key={idx} style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < calculateCost().details.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--foreground)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--primary)' }} /> {detail.name}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{detail.reason}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: detail.cost > 0 ? 'var(--foreground)' : '#166534', background: detail.cost === 0 ? '#dcfce7' : 'transparent', padding: detail.cost === 0 ? '2px 8px' : '0', borderRadius: '4px' }}>
                        {detail.cost > 0 ? `${detail.cost} crédit${detail.cost > 1 ? 's' : ''}` : 'Gratuit'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '1.25rem 1.5rem', background: 'var(--accent)', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--foreground)' }}>Total par candidat complété</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary)' }}>
                  {calculateCost().total} crédit{calculateCost().total > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {currentStep === 9 && savedJob && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 0' }} className="fade-in">
            <div style={{ width: '80px', height: '80px', background: '#dcfce7', color: '#166534', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--foreground)' }}>Offre créée avec succès !</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2.5rem', maxWidth: '500px' }}>
              Votre offre <strong>{savedJob.title}</strong> est prête. Les candidats peuvent maintenant s'inscrire et passer les évaluations (CV, tests et interview IA) de manière autonome.
            </p>
            
            <div style={{ width: '100%', maxWidth: '600px', background: 'var(--secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <LinkIcon size={16} /> Lien public pour postuler
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={(() => {
                    if (typeof window === 'undefined') return '';
                    const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
                    return isLocal ? `${window.location.origin}/apply/${savedJob.id}` : `https://app.onbord.be/apply/${savedJob.id}`;
                  })()}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'white', fontSize: '14px', color: 'var(--foreground)' }}
                />
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    const isLocal = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1');
                    const link = isLocal ? `${window.location.origin}/apply/${savedJob.id}` : `https://app.onbord.be/apply/${savedJob.id}`;
                    navigator.clipboard.writeText(link);
                    toast("Lien copié dans le presse-papier !");
                  }}
                >
                  <Copy size={16} /> Copier
                </button>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
                Partagez ce lien sur LinkedIn, votre site carrière ou dans vos emails de prospection.
              </p>
            </div>

            <button 
              className="btn btn-outline" 
              onClick={() => router.push(`/jobs/${savedJob.id}`)}
              style={{ padding: '12px 24px' }}
            >
              Aller au tableau de bord de l'offre
            </button>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '2rem' }}>
          {currentStep > 1 && currentStep < 9 ? (
            <button 
              className="btn btn-ghost" 
              style={{ fontWeight: '600' }}
              onClick={() => {
                if (currentStep === 4) setCurrentStep(3);
                else if (currentStep === 5) setCurrentStep(assessmentModules.qualifying_questions ? 4 : 3);
                else if (currentStep === 6) setCurrentStep(assessmentModules.cv_scoring ? 5 : assessmentModules.qualifying_questions ? 4 : 3);
                else if (currentStep === 7) setCurrentStep(assessmentModules.ai_interview ? 6 : assessmentModules.cv_scoring ? 5 : assessmentModules.qualifying_questions ? 4 : 3);
                else if (currentStep === 8) setCurrentStep(assessmentModules.skills_test ? 7 : assessmentModules.ai_interview ? 6 : assessmentModules.cv_scoring ? 5 : assessmentModules.qualifying_questions ? 4 : 3);
                else setCurrentStep(prev => prev - 1);
              }}
            >
              Retour
            </button>
          ) : (
            <div></div>
          )}
          
          {currentStep === 1 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || rawDescription.trim().length === 0}
            >
              {isAnalyzing ? <Loader2 size={18} className="spin" /> : <ChevronRight size={18} />}
              Suivant
            </button>
          )}

          {currentStep === 2 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={() => setCurrentStep(3)}
            >
              Suivant
            </button>
          )}

          {currentStep === 3 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleModulesSelectionNext}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={18} className="spin" /> : null}
              Valider et continuer
            </button>
          )}

          {currentStep === 4 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleQualifyingNext}
              disabled={isSaving}
            >
              Suivant
            </button>
          )}

          {currentStep === 5 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleCriteriaNext}
              disabled={isSaving}
            >
              Suivant
            </button>
          )}

          {currentStep === 6 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleAiConfigNext}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={18} className="spin" /> : null}
              Suivant
            </button>
          )}

          {currentStep === 7 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleSkillsConfigNext}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={18} className="spin" /> : null}
              Continuer
            </button>
          )}

          {currentStep === 8 && (
            <button 
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontWeight: '600' }}
              onClick={handleRecapNext}
            >
              Finaliser la création
            </button>
          )}
        </div>
      </div>

      {/* Overlay d'analyse de l'offre */}
      {(isAnalyzing || isParsingFile) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ maxWidth: '480px', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--foreground)', letterSpacing: '-0.02em' }}>
              Analyse de l'offre en cours…
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2.5rem', lineHeight: '1.7', fontSize: '15px' }}>
              Notre IA lit et structure votre offre d'emploi pour définir automatiquement les critères d'évaluation des candidats.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
              <Loader2 className="spin" size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--foreground)' }}>Intelligence artificielle en action</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
