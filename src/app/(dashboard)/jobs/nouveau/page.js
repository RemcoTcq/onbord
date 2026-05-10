"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Wand2, Briefcase, FileCheck2, Loader2, AlertCircle, UploadCloud, FileText, Paperclip, Sparkles, ClipboardList, X, Users, Search } from "lucide-react";
import { analyzeJobDescription } from "@/lib/actions/job";
import { parseFile } from "@/lib/actions/parse-file";
import { scoreCandidate } from "@/lib/actions/candidate";
import { createClient } from "@/lib/supabase/client";
import { checkUserQuota, incrementUserUsage } from "@/lib/actions/usage";
import JobFormStep2 from "@/components/jobs/JobFormStep2";

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
  const [candidates, setCandidates] = useState([]);
  const [isDelegated, setIsDelegated] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const textRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

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
      
      const text = await parseFile(formData);
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

  const handleSave = async (goToStep4 = false) => {
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
            ...jobData,
            is_delegated: isDelegated,
            agency_status: isDelegated ? 'searching' : null
          },
          status: goToStep4 ? 'active' : 'draft',
        })
        .select()
        .single();

      if (jobError) throw jobError;
      
      setSavedJobId(job.id);

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

      // Incrémenter l'usage (uniquement si actif ?)
      // On le fait même pour un brouillon pour l'instant car l'analyse a été faite
      await incrementUserUsage('job');

      if (goToStep4) {
        if (isDelegated) {
          router.push(`/jobs/${job.id}`);
        } else {
          setCurrentStep(4);
        }
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

  const handleFieldChange = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleCVDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv'));
    handleCVFiles(files);
  };
  
  const handleCVChange = (e) => {
    const files = Array.from(e.target.files).filter(f => f.name.endsWith('.csv'));
    handleCVFiles(files);
  };
  
  const handleCVFiles = async (files) => {
    if (files.length === 0) return;
    const file = files[0];
    
    setIsImporting(true);
    const Papa = await import('papaparse');
    
    Papa.default.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async function(results) {
        const rows = results.data;
        if (rows.length === 0) {
          setIsImporting(false);
          return;
        }

        const quota = await checkUserQuota('candidate');
        if (!quota.allowed) {
          setError(quota.error);
          setIsImporting(false);
          return;
        }
        
        setImportProgress({ current: 0, total: rows.length });
        const processedCandidates = [];
        
        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          setImportProgress(prev => ({ ...prev, current: index + 1 }));
          
          const name = row['Name'] || row['Nom'] || row['First Name'] || row['Prénom'] || row['Candidate'] || `Candidat ${index + 1}`;
          const email = row['Email'] || row['E-mail'] || row['Courriel'] || '';
          
          let cvText = null;
          const cvKeywords = ['cv', 'resume', 'expérience', 'experience', 'description', 'profil', 'profile', 'parcours'];
          
          for (const [key, value] of Object.entries(row)) {
            if (!value || typeof value !== 'string') continue;
            const lowerKey = key.toLowerCase();
            if (cvKeywords.some(k => lowerKey.includes(k))) {
              if (value.length > 250 && !value.includes('http://') && !value.includes('https://')) {
                cvText = value;
                break;
              }
            }
          }

          if (!cvText) {
            const combined = Object.values(row)
              .filter(v => typeof v === 'string' && !v.includes('http://') && !v.includes('https://'))
              .join(' \n');
            if (combined.length > 400) cvText = combined;
          }

          if (cvText) {
            try {
              const enrichedCvText = `Nom du candidat: ${name}\nEmail: ${email}\n\nProfil/CV:\n${cvText}`;
              const result = await scoreCandidate(savedJobId, enrichedCvText, jobData, name);
              if (result.success) {
                processedCandidates.push(result.candidate);
                await incrementUserUsage('candidate');
              }
            } catch (err) {
              console.error(`Erreur pour ${name}:`, err);
            }
          }
        }
        
        setIsImporting(false);
        setCandidates(processedCandidates);
        // Redirection automatique vers la page de la demande
        router.push(`/jobs/${savedJobId}`);
      }
    });
  };

  const handleIndividualCVChange = async (e, candidateId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification quota
    const quota = await checkUserQuota('candidate');
    if (!quota.allowed) {
      setError(quota.error);
      return;
    }
    
    setCandidates(prev => prev.map(p => p.id === candidateId ? { ...p, status: 'analyzing' } : p));
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const cvText = await parseFile(formData);
      
      const cand = candidates.find(c => c.id === candidateId) || { name: 'Candidat' };
      const result = await scoreCandidate(savedJobId, cvText, jobData, cand.name);
      
      if (!result.success) throw new Error(result.error);
      
      setCandidates(prev => prev.map(p => p.id === candidateId ? { 
        ...p, 
        status: 'completed', 
        score: result.candidate.score_cv,
        dbId: result.candidate.id
      } : p));

      // Incrémenter l'usage
      await incrementUserUsage('candidate');
    } catch (err) {
      console.error("Erreur CV individuel:", err);
      setCandidates(prev => prev.map(p => p.id === candidateId ? { ...p, status: 'error' } : p));
    }
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
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--foreground)' }}>
          {currentStep === 1 ? "Recherche" : currentStep === 2 ? "Détails" : currentStep === 3 ? "Récapitulatif" : "Talents"}
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
          <div style={{ flex: 1 }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Récapitulatif de la demande</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
              Vérifiez toutes les informations avant de valider votre recherche.
            </p>
            
            <div style={{ padding: '2rem', backgroundColor: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                 <div>
                   <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--foreground)' }}>{jobData?.title || 'Poste sans titre'}</h3>
                   <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                     <span className="badge badge-outline">{jobData?.talent_type === 'etudiant' ? 'Étudiant' : 'Jeune diplômé'}</span>
                     <span className="badge badge-outline">{jobData?.category}</span>
                     <span>•</span>
                     <span>{jobData?.location || 'Localisation non précisée'}</span>
                   </p>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                   <p style={{ fontWeight: '500', color: 'var(--primary)' }}>{jobData?.work_mode === 'onsite' ? 'Présentiel' : jobData?.work_mode === 'hybrid' ? 'Hybride' : jobData?.work_mode === 'remote' ? 'Télétravail' : 'Mode non précisé'}</p>
                   <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>
                     {jobData?.contract_type} 
                     {jobData?.talent_type === 'etudiant' && jobData?.contract_type && !jobData.contract_type.toString().includes('jour') ? ' jours/semaine' : ''}
                   </p>
                 </div>
               </div>
               
               <hr className="divider" style={{ margin: '1.5rem 0' }} />
               
               <div style={{ marginBottom: '2rem' }}>
                 <h4 style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Description du poste</h4>
                 <p style={{ fontSize: '15px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: 'var(--foreground)' }}>{jobData?.clean_description}</p>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
                 <div>
                   <h4 style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Critères</h4>
                   <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                     <li style={{ fontSize: '14px' }}><strong>Diplôme:</strong> {jobData?.education_level || 'Indifférent'}</li>
                     <li style={{ fontSize: '14px' }}><strong>Nombre de talents:</strong> {jobData?.talents_needed || 1}</li>
                   </ul>
                 </div>

                 <div>
                   <h4 style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Langues</h4>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                     {jobData?.languages?.length > 0 ? jobData.languages.map(l => (
                       <span key={l.name} className="badge badge-outline" style={{ background: '#f8fafc' }}>
                         {l.name} (Niveau {l.level})
                       </span>
                     )) : <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Non spécifié</span>}
                   </div>
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                 <div>
                    <h4 style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Hard Skills</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {jobData?.hard_skills?.length > 0 ? jobData.hard_skills.map(s => (
                        <span key={s.name} className="badge" style={{ 
                          background: s.priority === 'must_have' ? 'var(--primary)' : 'white', 
                          color: s.priority === 'must_have' ? 'white' : 'var(--primary)',
                          border: '1px solid var(--primary)'
                        }}>
                          {s.name}
                        </span>
                      )) : <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Non spécifié</span>}
                    </div>
                  </div>

                 <div>
                   <h4 style={{ fontSize: '14px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Soft Skills</h4>
                   <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                     {jobData?.soft_skills?.length > 0 ? jobData.soft_skills.map(s => (
                       <span key={s.name} className="badge" style={{ 
                         background: s.priority === 'must_have' ? 'var(--primary)' : 'white', 
                         color: s.priority === 'must_have' ? 'white' : 'var(--primary)',
                         border: '1px solid var(--primary)'
                       }}>
                         {s.name}
                       </span>
                     )) : <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Non spécifié</span>}
                   </div>
                 </div>
               </div>

               {/* Option de délégation (Mode Agence) */}
               <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f8fafc', border: '1px solid var(--border)', borderRadius: '12px' }}>
                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                   <input 
                     type="checkbox" 
                     id="delegateCheckbox"
                     checked={isDelegated}
                     onChange={(e) => setIsDelegated(e.target.checked)}
                     style={{ marginTop: '0.25rem', width: '18px', height: '18px', cursor: 'pointer' }}
                   />
                   <div>
                     <label htmlFor="delegateCheckbox" style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--foreground)', cursor: 'pointer', display: 'block' }}>
                       Déléguer cette recherche à l'équipe Onbord
                     </label>
                     <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                       En cochant cette case, nos experts se chargent de sourcer, trier et qualifier les candidats pour vous. Vous n'aurez accès qu'à une shortlist des meilleurs profils sélectionnés.
                     </p>
                   </div>
                 </div>
               </div>

            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }} className="fade-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--foreground)' }}>Importer vos candidats (ATS)</h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem' }}>
              Importez l'export CSV contenant les candidats de votre ATS. Notre IA évaluera instantanément chaque profil face à vos critères.
            </p>

            {/* Dropzone */}
            <div 
              style={{ 
                border: '2px dashed var(--border)', 
                borderRadius: '12px', 
                padding: '4rem 2rem', 
                textAlign: 'center',
                backgroundColor: 'var(--background)',
                transition: 'all 0.2s',
                cursor: 'pointer',
                marginBottom: '2rem'
              }}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--background)'; }}
              onDrop={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.backgroundColor = 'var(--background)';
                handleCVDrop(e);
              }}
              onClick={() => cvInputRef.current?.click()}
            >
              <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)' }}>
                <UploadCloud size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem', color: 'var(--foreground)' }}>Cliquez ou glissez votre fichier CSV ici</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '14px' }}>Formats supportés : CSV.</p>
              
              <input 
                type="file" 
                ref={cvInputRef} 
                onChange={handleCVChange} 
                accept=".csv" 
                style={{ display: 'none' }} 
              />
            </div>

            {/* Liste des candidats uploadés */}
            {candidates.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--foreground)' }}>Candidats en cours d'analyse ({candidates.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {candidates.map(candidate => (
                    <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <p style={{ fontWeight: '500', fontSize: '14px', color: 'var(--foreground)' }}>{candidate.name}</p>
                          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
                            {candidate.status === 'pending' && 'En file d\'attente...'}
                            {candidate.status === 'analyzing' && 'Analyse IA en cours...'}
                            {candidate.status === 'completed' && 'Analyse terminée'}
                            {candidate.status === 'error' && 'Erreur d\'analyse'}
                            {candidate.status === 'needs_cv' && 'Fichier CV manquant'}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        {candidate.status === 'pending' || candidate.status === 'analyzing' ? (
                          <Loader2 size={18} className="spin" style={{ color: 'var(--primary)' }} />
                        ) : candidate.status === 'completed' ? (
                          <div style={{ background: '#f0fdf4', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> Score: {candidate.score}/100
                          </div>
                        ) : candidate.status === 'needs_cv' ? (
                          <div>
                            <input 
                              type="file" 
                              id={`cv-upload-${candidate.id}`}
                              accept=".pdf,.docx" 
                              style={{ display: 'none' }}
                              onChange={(e) => handleIndividualCVChange(e, candidate.id)}
                            />
                            <button 
                              className="btn btn-outline" 
                              style={{ fontSize: '12px', padding: '0.25rem 0.75rem', height: 'auto' }}
                              onClick={() => document.getElementById(`cv-upload-${candidate.id}`).click()}
                            >
                              <Paperclip size={14} style={{ marginRight: '4px' }} />
                              Importer CV
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '2rem' }}>
          {currentStep > 1 && currentStep < 4 ? (
            <button 
              className="btn btn-outline" 
              onClick={() => setCurrentStep(prev => prev - 1)}
            >
              Retour
            </button>
          ) : (
            <div></div> // empty div for space-between
          )}
          
          {currentStep === 1 ? (
             <button 
              className="btn btn-primary"
              onClick={() => handleAnalyze()}
              disabled={isAnalyzing || isParsingFile || rawDescription.trim().length === 0}
            >
              {isAnalyzing || isParsingFile ? (
                <>
                  <Loader2 size={18} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  Recherche en cours...
                </>
              ) : (
                <>
                  <Search size={18} />
                  Rechercher
                </>
              )}
            </button>
          ) : currentStep === 2 ? (
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentStep(3)}
            >
              Suivant
              <ChevronRight size={18} />
            </button>
          ) : currentStep === 3 ? (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn btn-outline"
                onClick={() => handleSave(false)}
                disabled={isSaving}
              >
                {isSaving && !savedJobId ? <Loader2 size={16} className="spin" /> : null}
                Enregistrer pour plus tard
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleSave(true)}
                disabled={isSaving}
              >
                {isSaving && !savedJobId ? <Loader2 size={16} className="spin" /> : null}
                {isDelegated ? "Confier la mission à Onbord" : "Créer l'offre et ajouter des candidats"}
              </button>
            </div>
          ) : currentStep === 4 ? (
            <button 
              className="btn btn-primary"
              onClick={() => router.push(`/jobs/${savedJobId}`)}
            >
              Voir les candidats
            </button>
          ) : null}
        </div>
      </div>

      {/* Overlay d'importation globale */}
      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{
              width: '80px', height: '80px', background: 'var(--primary-light)',
              color: 'var(--primary)', borderRadius: '24px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
              boxShadow: '0 10px 25px -5px rgba(var(--primary-rgb), 0.3)'
            }}>
              <Sparkles size={40} className="pulse" />
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--foreground)' }}>
              Analyse de vos candidats...
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              Chaque profil est comparé à votre offre d'emploi pour calculer un score de match précis.
            </p>

            <div style={{ background: 'var(--secondary)', borderRadius: '12px', height: '12px', width: '100%', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{
                height: '100%', background: 'var(--primary)',
                width: `${(importProgress.current / importProgress.total) * 100}%`,
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '600' }}>
              <span style={{ color: 'var(--primary)' }}>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
              <span style={{ color: 'var(--muted-foreground)' }}>{importProgress.current} / {importProgress.total}</span>
            </div>
            
            <p style={{ marginTop: '3rem', fontSize: '13px', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
              Vous allez être redirigé vers le tableau de bord dès que l'analyse est terminée.
            </p>
          </div>
        </div>
      )}

      {/* Overlay d'analyse de l'offre */}
      {(isAnalyzing || isParsingFile) && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{
              width: '80px', height: '80px', background: 'var(--primary-light)',
              color: 'var(--primary)', borderRadius: '24px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
              boxShadow: '0 10px 25px -5px rgba(var(--primary-rgb), 0.3)',
              animation: 'pulse 2s infinite ease-in-out'
            }}>
              <Search size={40} />
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--foreground)' }}>
              Recherche des critères...
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              Analyse de votre besoin pour structurer automatiquement la demande et définir les meilleurs critères de sélection.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
              <Loader2 className="spin" size={20} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: '600', color: 'var(--primary)' }}>Intelligence Artificielle en action</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
