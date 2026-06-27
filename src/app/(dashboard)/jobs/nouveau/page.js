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
import JobFormStepRecommendation from "@/components/jobs/JobFormStepRecommendation";
import AiInterviewConfig from "@/components/jobs/AiInterviewConfig";
import SkillsTestConfig from "@/components/jobs/SkillsTestConfig";
import CvScoringCriteria from "@/components/jobs/CvScoringCriteria";
import QualifyingQuestionsConfig from "@/components/jobs/QualifyingQuestionsConfig";
import VideoInterviewConfig from "@/components/jobs/VideoInterviewConfig";
import { useToast } from "@/components/ui/Toast";
import { updateJobAiConfig, generateInterviewQuestions } from "@/lib/actions/job";
import { saveAssessmentConfig, saveVideoInterviewConfig, generateVideoQuestions } from "@/lib/actions/assessment";
import { generateRecommendation, generateQualifyingQuestions } from "@/lib/recommendationEngine";

export default function NouvelleDemandePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [rawDescription, setRawDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [savedJobId, setSavedJobId] = useState(null);
  const [savedJob, setSavedJob] = useState(null);

  
  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const textRef = useRef(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Load draft if specified in URL
    if (typeof window !== 'undefined') {
      const draftId = new URLSearchParams(window.location.search).get('draftId');
      if (draftId) {
        const loadDraft = async () => {
          const supabase = createClient();
          const { data: job } = await supabase.from('jobs').select('*').eq('id', draftId).single();
          if (job) {
            setSavedJobId(job.id);
            setSavedJob(job);
            setJobData(job.extracted_criteria || {});
            setRawDescription(job.description || "");
            setCurrentStep(2); // Resume at step 2
          }
        };
        loadDraft();
      }
    }
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
    
    try {
      const data = await analyzeJobDescription(targetContent);
      setJobData(data);
      setRawDescription(targetContent); // Keep the analyzed content in state

      // Create draft job immediately
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: job } = await supabase.from('jobs').insert({
          user_id: user.id,
          title: data.title || 'Poste sans titre',
          category: data.category,
          description: targetContent,
          experience_level: data.experience_level,
          work_mode: data.work_mode,
          contract_type: data.contract_type,
          location: data.location,
          extracted_criteria: { ...data },
          status: 'draft'
        }).select().single();
        if (job) {
          setSavedJobId(job.id);
          setSavedJob(job);
        }
      }

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

      // 1. Upsert Job
      if (savedJobId) {
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            title: jobData.title || 'Poste sans titre',
            category: jobData.category,
            experience_level: jobData.experience_level,
            work_mode: jobData.work_mode,
            contract_type: jobData.contract_type,
            location: jobData.location,
            extracted_criteria: { ...jobData },
            status: continueToModules ? 'active' : 'draft',
          })
          .eq('id', savedJobId);
        if (jobError) throw jobError;
      } else {
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
            extracted_criteria: { ...jobData },
            status: continueToModules ? 'active' : 'draft',
          })
          .select()
          .single();

        if (jobError) throw jobError;
        setSavedJobId(job.id);
        setSavedJob(job);
      }

      const targetJobId = savedJobId || savedJob?.id;

      // NOUVEAU : Logger la famille et sous-famille
      if ((jobData.category || jobData.sub_family) && targetJobId) {
        await supabase.from('job_family_logs').insert({
          job_id: targetJobId,
          user_id: user.id,
          family: jobData.category,
          sub_family: jobData.sub_family,
          role_type: jobData.role_type
        });
      }

      // 2. Insert Skills (Replace old ones)
      if (savedJobId) {
        await supabase.from('job_skills').delete().eq('job_id', savedJobId);
      }
      const skillsToInsert = [];
      if (jobData.hard_skills) {
        jobData.hard_skills.forEach(s => skillsToInsert.push({ job_id: targetJobId, name: s.name, type: 'hard_skill', priority: s.priority }));
      }
      if (jobData.soft_skills) {
        jobData.soft_skills.forEach(s => skillsToInsert.push({ job_id: targetJobId, name: s.name, type: 'soft_skill', priority: s.priority }));
      }

      if (skillsToInsert.length > 0 && targetJobId) {
        const { error: skillsError } = await supabase.from('job_skills').insert(skillsToInsert);
        if (skillsError) throw skillsError;
      }

      if (!savedJobId) {
        await incrementUserUsage('job');
      }

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



  const handleSaveFlow = async (flowNodes, updatedJobData) => {
    setIsSaving(true);
    try {
      const supabase = createClient();

      if (savedJobId) {
        await supabase.from('jobs').update({ status: 'active' }).eq('id', savedJobId);
      } else {
        await handleSave(true);
      }

      const currentJobId = savedJobId || savedJob?.id;

      const modules = {
        qualifying_questions: { enabled: false },
        cv_scoring: { enabled: false },
        ai_interview: { enabled: false },
        skills_tests: { enabled: false, tests: [] },
        video_interview: { enabled: false, questions: [], max_duration_seconds: 120, max_retakes: 1, evaluation_mode: "ai" },
      };

      const flowOrder = [];

      for (const node of flowNodes) {
        if (node.type === 'accueil' || node.type === 'remerciements') {
          flowOrder.push(node.type);
          // On pourrait sauvegarder les messages customisés ici plus tard si nécessaire
          continue;
        }

        if (node.type === 'qualifying_questions') {
          modules.qualifying_questions = { enabled: true, questions: node.config.questions || [] };
          flowOrder.push(node.type);
        }
        else if (node.type === 'cv_scoring') {
          modules.cv_scoring = { enabled: true };
          flowOrder.push(node.type);
          if (updatedJobData?.selection_criteria) {
             await supabase.from('jobs').update({ extracted_criteria: { ...jobData, selection_criteria: updatedJobData.selection_criteria } }).eq('id', currentJobId);
             setJobData(prev => ({ ...prev, selection_criteria: updatedJobData.selection_criteria }));
          }
        }
        else if (node.type === 'single_skill_test') {
          modules.skills_tests.enabled = true;
          if (node.config.tests && node.config.tests.length > 0) {
              modules.skills_tests.tests.push(node.config.tests[0]);
          }
          if (!flowOrder.includes('skills_tests')) {
              flowOrder.push('skills_tests');
          }
        }
        else if (node.type === 'ai_interview') {
          modules.ai_interview = { enabled: true };
          flowOrder.push(node.type);
          if (node.config) {
            await updateJobAiConfig(currentJobId, { ...node.config, enabled: true });
          }
        }
        else if (node.type === 'single_video_question') {
          modules.video_interview.enabled = true;
          if (node.config.questions && node.config.questions.length > 0) {
              modules.video_interview.questions.push(node.config.questions[0]);
              // On garde la durée max, le max retakes et le mode d'évaluation du dernier nœud configuré
              modules.video_interview.max_duration_seconds = node.config.max_duration_seconds || modules.video_interview.max_duration_seconds;
              modules.video_interview.max_retakes = node.config.max_retakes !== undefined ? node.config.max_retakes : modules.video_interview.max_retakes;
              modules.video_interview.evaluation_mode = node.config.evaluation_mode || modules.video_interview.evaluation_mode;
          }
          if (!flowOrder.includes('video_interview')) {
              flowOrder.push('video_interview');
          }
        }
      }

      if (modules.video_interview.enabled && modules.video_interview.questions.length > 0) {
        await saveVideoInterviewConfig(currentJobId, modules.video_interview);
      }

      await saveAssessmentConfig(currentJobId, {
        modules,
        flow_order: flowOrder
      });

      await supabase.from('jobs').update({ saved_flow_nodes: flowNodes }).eq('id', currentJobId);

      router.push(`/jobs/${currentJobId}`);
    } catch (err) {
      console.error(err);
      toast("Erreur lors de la sauvegarde du parcours", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={currentStep === 3 ? { 
      position: 'fixed', 
      top: 0, bottom: 0, right: 0, left: 'var(--sidebar-collapsed-width)', 
      zIndex: 40,
      background: '#f8fafc',
      display: 'flex', flexDirection: 'column'
    } : { maxWidth: '900px', margin: '0 auto' }}>
      
      <div style={{ padding: currentStep === 3 ? '1rem 1.5rem 0' : '0 0 1rem 0' }}>
        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {currentStep === 1 ? "1. Offre d'emploi" : 
           currentStep === 2 ? "2. Détails" : 
           "3. Parcours"}
        </span>
      </div>

      {/* Step Content */}
      <div className={currentStep === 3 ? "" : "card"} style={{ display: 'flex', flexDirection: 'column', minHeight: '350px', height: currentStep === 3 ? '100%' : 'auto' }}>
        {currentStep === 1 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Commençons par votre offre d'emploi</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Onbord lit votre offre d'emploi et en extrait automatiquement les compétences à évaluer. Vous validez, on construit le parcours de screening.
            </p>
            
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '14px' }}>{error}</span>
              </div>
            )}
            
            {/* Bouton Importer */}
            <div style={{ marginBottom: '0.75rem' }}>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingFile || isAnalyzing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)', fontSize: '14px', fontWeight: '600', background: 'transparent', border: 'none', cursor: (isParsingFile || isAnalyzing) ? 'default' : 'pointer', padding: '4px 0', opacity: (isParsingFile || isAnalyzing) ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                {isParsingFile ? <Loader2 size={16} className="spin" /> : <Paperclip size={16} />}
                Importer l'offre d'emploi
              </button>
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

            {/* Large Textarea */}
            <div style={{ 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius)', 
              backgroundColor: 'white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              marginBottom: '1.5rem',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <textarea 
                style={{ 
                  width: '100%',
                  minHeight: '300px',
                  border: 'none', 
                  outline: 'none', 
                  fontSize: '15px', 
                  color: 'var(--foreground)',
                  background: 'transparent',
                  padding: '1.25rem',
                  resize: 'vertical'
                }}
                placeholder="Collez ici votre offre d'emploi, ou décrivez le poste : intitulé, missions, compétences attendues, langues..."
                value={rawDescription}
                onChange={(e) => {
                  setRawDescription(e.target.value);
                  if (error) setError(null);
                }}
              />

              <div style={{ position: 'absolute', bottom: '1rem', right: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || rawDescription.trim().length === 0}
                  style={{ background: '#0f172a', border: 'none', color: 'white', cursor: rawDescription.trim().length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', opacity: rawDescription.trim().length > 0 ? 1 : 0.5, transition: 'opacity 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}
                >
                  {isAnalyzing ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                </button>
              </div>
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
            {/* On retire le padding global de la carte pour l'étape 3 afin que le Flow prenne toute la place */}
            <JobFormStepRecommendation 
              jobData={jobData} 
              savedJobId={savedJobId || savedJob?.id}
              onSave={handleSaveFlow}
              isSaving={isSaving}
              onBack={(currentFlow) => {
                setJobData(prev => ({ ...prev, saved_flow_nodes: currentFlow }));
                setCurrentStep(2);
              }}
            />
          </div>
        )}
        {/* Navigation - Seulement pour l'étape 1 et 2 */}
        {currentStep < 3 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '2rem' }}>
            {currentStep > 1 ? (
              <button 
                className="btn btn-ghost" 
                style={{ fontWeight: '600' }}
                onClick={() => setCurrentStep(prev => prev - 1)}
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
          </div>
        )}
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
