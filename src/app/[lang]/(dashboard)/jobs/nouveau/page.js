"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { ArrowRight, Loader2, AlertCircle, UploadCloud, FileText, Paperclip, AlignLeft, Globe, Info } from "lucide-react";
import { analyzeJobDescription } from "@/lib/actions/job";
import { parseFile } from "@/lib/actions/parse-file";
import { fetchJobFromUrl } from "@/lib/actions/fetch-url";
import { createClient } from "@/lib/supabase/client";
import JobFormStep2 from "@/components/jobs/JobFormStep2";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import { coerceExperienceLocale, EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { saveAssessmentConfig } from "@/lib/actions/assessment";
import { questionsParDefaut, questionsDuJob, noeudsAvecQuestions } from "@/lib/questionsPreselection";

export default function NouvelleDemandePage() {
  const { t, locale: uiLocale } = useI18n();
  // Défaut : la langue de l'interface du recruteur. C'est le pari le plus
  // souvent juste (un recruteur francophone publie surtout en français), et il
  // reste modifiable d'un clic tant que l'expérience n'est pas générée.
  const [experienceLocale, setExperienceLocale] = useState(() => coerceExperienceLocale(uiLocale));

  const [currentStep, setCurrentStep] = useState(1);
  const [rawDescription, setRawDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [jobData, setJobData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [savedJobId, setSavedJobId] = useState(null);
  const [savedJob, setSavedJob] = useState(null);
  // Input mode: 'text' | 'file' | 'url'
  const [inputMode, setInputMode] = useState('text');
  const [jobUrl, setJobUrl] = useState("");
  const [survolDepot, setSurvolDepot] = useState(false);

  
  const fileInputRef = useRef(null);
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
            // Un brouillon repris garde SA langue, pas celle de l'interface :
            // sans ça, un recruteur qui a basculé son dashboard en anglais
            // verrait son brouillon néerlandais repasser en anglais au premier
            // enregistrement.
            setExperienceLocale(coerceExperienceLocale(job.experience_locale));
            setCurrentStep(2); // Resume at step 2
          }
        };
        loadDraft();
      }
    }
  }, []);


  const handleFileUpload = (e) => handleFile(e.target.files?.[0]);

  // Fichier choisi au clic ou déposé sur la zone : même traitement.
  const handleFile = async (file) => {
    if (!file) return;

    setIsParsingFile(true);
    setError(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const parseResult = await parseFile(formData);
      
      if (!parseResult.success) {
        throw new Error(parseResult.error || t("dashboard.jobCreate.parseError"));
      }

      const text = parseResult.text;
      // Immédiatement analyser après le parsing pour un flow fluide
      await handleAnalyze(text);
      setIsParsingFile(false);
    } catch (err) {
      console.error(err);
      setError(err.message || t("dashboard.jobCreate.readError"));
      setFileName("");
      setIsParsingFile(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFetchUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsFetchingUrl(true);
    setError(null);
    try {
      const result = await fetchJobFromUrl(jobUrl.trim());
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Chain directly into analysis
      await handleAnalyze(result.text);
    } catch (err) {
      setError(err.message || t("dashboard.jobCreate.urlError"));
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleAnalyze = async (content = rawDescription) => {
    const targetContent = typeof content === 'string' ? content : rawDescription;
    if (!targetContent || targetContent.trim().length < 50) {
      setError(t("dashboard.jobCreate.tooShort"));
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // La langue du poste est choisie AVANT l'analyse, et c'est elle qui doit
      // commander le titre et le résumé produits — pas la langue du dashboard.
      const data = await analyzeJobDescription(targetContent, experienceLocale);
      setJobData(data);
      setRawDescription(targetContent); // Keep the analyzed content in state

      // Create draft job immediately
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: job } = await supabase.from('jobs').insert({
          user_id: user.id,
          title: data.title || t("dashboard.jobCreate.untitledJob"),
          category: data.category,
          description: targetContent,
          experience_level: data.experience_level,
          work_mode: data.work_mode,
          contract_type: data.contract_type,
          location: data.location,
          extracted_criteria: { ...data },
          status: 'draft',
          experience_locale: experienceLocale
        }).select().single();
        if (job) {
          setSavedJobId(job.id);
          setSavedJob(job);
        }
      }

      setCurrentStep(2);
    } catch (err) {
      setError(err.message || t("dashboard.jobCreate.analysisError"));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Enregistre l'offre et ses compétences avec le statut demandé. Renvoie
  // l'identifiant du job, ou null en cas d'échec (l'erreur est affichée).
  const handleSave = async (status) => {
    setIsSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error(t("dashboard.jobCreate.mustBeLoggedIn"));

      let targetJobId = savedJobId || savedJob?.id;

      // Une ancienne pipeline en cours a pu laisser `saved_flow_nodes` dans les
      // critères d'un brouillon : elle a sa propre colonne, pas sa place ici.
      const { saved_flow_nodes: _ancienne, ...criteria } = jobData;

      // 1. Upsert Job
      if (savedJobId) {
        const { error: jobError } = await supabase
          .from('jobs')
          .update({
            title: jobData.title || t("dashboard.jobCreate.untitledJob"),
            category: jobData.category,
            experience_level: jobData.experience_level,
            work_mode: jobData.work_mode,
            contract_type: jobData.contract_type,
            location: jobData.location,
            extracted_criteria: criteria,
            status,
          })
          .eq('id', savedJobId);
        if (jobError) throw jobError;
      } else {
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert({
            user_id: user.id,
            title: jobData.title || t("dashboard.jobCreate.untitledJob"),
            category: jobData.category,
            description: rawDescription,
            experience_level: jobData.experience_level,
            work_mode: jobData.work_mode,
            contract_type: jobData.contract_type,
            location: jobData.location,
            extracted_criteria: criteria,
            status,
          })
          .select()
          .single();

        if (jobError) throw jobError;
        setSavedJobId(job.id);
        setSavedJob(job);
        targetJobId = job.id;
      }

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

      return targetJobId;
    } catch (err) {
      console.error(err);
      setError(err.message || t("dashboard.jobCreate.saveError"));
      return null;
    } finally {
      setIsSaving(false);
    }
  };



  // Validation des compétences : l'offre passe en « ouverte », ses questions de
  // présélection sont créées (modifiables ensuite depuis sa fiche), puis le
  // recruteur arrive sur la conception de la simulation. Plus de pipeline à
  // composer entre les deux (octobre 2026).
  const valider = async () => {
    const jobId = await handleSave('active');
    if (!jobId) return;
    setIsSaving(true);
    try {
      const questions = questionsParDefaut(jobData, experienceLocale);
      const supabase = createClient();
      const { data: job } = await supabase.from('jobs').select('saved_flow_nodes').eq('id', jobId).single();
      // On ne remplace pas des questions déjà présentes (brouillon repris).
      const existantes = questionsDuJob(job);
      const noeuds = noeudsAvecQuestions(job?.saved_flow_nodes, existantes.length ? existantes : questions);
      await supabase.from('jobs').update({ saved_flow_nodes: noeuds }).eq('id', jobId);
      // L'ancienne configuration du parcours, toujours lue en repli par
      // quelques écrans hérités : questions de présélection, puis la simulation.
      const retenues = questionsDuJob({ saved_flow_nodes: noeuds });
      await saveAssessmentConfig(jobId, {
        modules: {
          qualifying_questions: { enabled: retenues.length > 0, questions: retenues },
          cv_scoring: { enabled: false },
          ai_interview: { enabled: false },
          skills_tests: { enabled: false, tests: [] },
          video_interview: { enabled: false, questions: [], max_duration_seconds: 120, max_retakes: 1, evaluation_mode: "ai" },
        },
        flow_order: [...(retenues.length ? ['qualifying_questions'] : []), 'experience'],
      });
      router.push(`/jobs/${jobId}/experience`);
    } catch (err) {
      console.error(err);
      toast(t("dashboard.jobCreate.saveError"), "error");
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const occupe = isAnalyzing || isParsingFile || isFetchingUrl;
  const etapes = [
    { n: 1, label: t("dashboard.jobCreate.steps.job") },
    { n: 2, label: t("dashboard.jobCreate.steps.details") },
  ];

  // Le bouton principal suit la source choisie : analyser le texte, ouvrir le
  // sélecteur de fichier, ou récupérer la page de l'offre.
  const extraire = () => {
    if (inputMode === "file") fileInputRef.current?.click();
    else if (inputMode === "url") handleFetchUrl();
    else handleAnalyze();
  };
  const extractionImpossible = occupe
    || (inputMode === "text" && rawDescription.trim().length === 0)
    || (inputMode === "url" && !jobUrl.trim());

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("dashboard.nav.jobs"), href: "/jobs" }]}
        title={t("dashboard.nav.newJob")}
        actions={
          <ol aria-label={t("dashboard.jobCreate.stepsLabel")} className="ds-seg" style={{ listStyle: "none", margin: 0, fontSize: 13 }}>
            {etapes.map((e) => (
              <li key={e.n} aria-current={currentStep === e.n ? "step" : undefined} className="ds-seg-item" aria-selected={currentStep === e.n} style={{ cursor: "default", gap: 6 }}>
                <span className="ds-mono" style={{ fontSize: 11, color: currentStep === e.n ? "var(--ds-blue)" : "var(--ds-ink-5)" }}>{e.n}</span>
                {e.label}
              </li>
            ))}
          </ol>
        }
      />

      {/* ── Étape 1 : l'offre ── */}
      {currentStep === 1 && (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "48px 20px 40px" }}>
          <div style={{ width: "100%", maxWidth: 780, display: "flex", flexDirection: "column", gap: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <h2 style={{ margin: 0, fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.15 }}>{t("dashboard.jobCreate.heading")}</h2>
              <p style={{ margin: 0, color: "var(--ds-ink-3)", fontSize: 15 }}>{t("dashboard.jobCreate.intro")}</p>
            </div>

            {error && (
              <div className="ds-inset" role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ds-red-bg)", borderColor: "var(--ds-red-inset)", color: "var(--ds-red)", fontSize: 13, padding: 12 }}>
                <AlertCircle size={16} style={{ flex: "none" }} /> {error}
              </div>
            )}

            <section aria-label={t("dashboard.jobCreate.jobOffer")} className="ds-panel" style={{ gap: 0, borderRadius: 16, boxShadow: "0 1px 2px rgba(20,32,74,0.04), 0 12px 32px rgba(20,32,74,0.05)" }}>
              <div role="tablist" aria-label={t("dashboard.jobCreate.sourceLabel")} style={{ display: "flex", gap: 2, padding: "4px 4px 0" }}>
                {[
                  { key: "text", icon: AlignLeft, label: t("dashboard.jobCreate.modePaste") },
                  { key: "file", icon: Paperclip, label: t("dashboard.jobCreate.modeFile") },
                  { key: "url", icon: Globe, label: t("dashboard.jobCreate.modeUrl") },
                ].map(({ key, icon: Icon, label }) => {
                  const actif = inputMode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={actif}
                      onClick={() => { setInputMode(key); setError(null); }}
                      disabled={occupe}
                      style={{
                        display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 12px", border: 0, borderRadius: 9,
                        background: actif ? "var(--ds-soft-2)" : "transparent", font: "inherit", fontWeight: actif ? 500 : 400,
                        color: actif ? "var(--ds-ink)" : "var(--ds-ink-3)", cursor: "pointer",
                      }}
                    >
                      <Icon size={15} strokeWidth={1.8} /> {label}
                    </button>
                  );
                })}
              </div>

              {inputMode === "text" && (
                <div>
                  <label htmlFor="ds-offre" className="sr-only">{t("dashboard.jobCreate.textLabel")}</label>
                  <textarea
                    id="ds-offre"
                    rows={11}
                    placeholder={t("dashboard.jobCreate.descriptionPlaceholder")}
                    value={rawDescription}
                    onChange={(e) => { setRawDescription(e.target.value); if (error) setError(null); }}
                    style={{ width: "100%", display: "block", resize: "vertical", border: 0, padding: "14px 16px", font: "inherit", fontSize: 15, lineHeight: 1.6, color: "var(--ds-ink)", background: "transparent", outline: 0 }}
                  />
                </div>
              )}

              {inputMode === "file" && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => !occupe && fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" && !occupe) fileInputRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setSurvolDepot(true); }}
                  onDragLeave={() => setSurvolDepot(false)}
                  onDrop={(e) => { e.preventDefault(); setSurvolDepot(false); if (!occupe) handleFile(e.dataTransfer.files?.[0]); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, height: 262, margin: 8,
                    border: `1.5px dashed ${survolDepot ? "var(--ds-blue)" : "#CCD5E8"}`, borderRadius: 12,
                    background: survolDepot ? "var(--ds-blue-06)" : "var(--ds-soft)", textAlign: "center", cursor: occupe ? "default" : "pointer",
                  }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: 11, background: "#FFFFFF", border: "1px solid var(--ds-line)", color: "var(--ds-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {isParsingFile ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : fileName ? <FileText size={18} /> : <UploadCloud size={18} />}
                  </span>
                  <span style={{ fontWeight: 500 }}>
                    {isParsingFile ? t("dashboard.jobCreate.readingFile") : fileName || t("dashboard.jobCreate.dropFile")}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>
                    {fileName && !isParsingFile
                      ? t("dashboard.jobCreate.changeFile")
                      : tNodes(t("dashboard.jobCreate.fileFormats"), { browse: <span key="b" style={{ color: "var(--ds-blue)", fontWeight: 500 }}>{t("dashboard.jobCreate.browse")}</span> })}
                  </span>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.docx,.txt" style={{ display: "none" }} />
                </div>
              )}

              {inputMode === "url" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 16px 40px" }}>
                  <label htmlFor="ds-lien" style={{ fontWeight: 500 }}>{t("dashboard.jobCreate.urlLabel")}</label>
                  <input
                    id="ds-lien"
                    type="url"
                    className="ds-input"
                    value={jobUrl}
                    onChange={(e) => { setJobUrl(e.target.value); if (error) setError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleFetchUrl(); }}
                    placeholder="https://…"
                    disabled={occupe}
                    style={{ height: 42, borderRadius: 10, fontSize: 15, background: "var(--ds-soft)" }}
                  />
                  <span style={{ display: "flex", gap: 8, fontSize: 13, color: "var(--ds-ink-3)", lineHeight: 1.55 }}>
                    <Info size={14} style={{ flex: "none", marginTop: 3 }} />
                    <span>
                      {tNodes(t("dashboard.jobCreate.urlHint"), {
                        tip: <strong key="t" style={{ fontWeight: 500, color: "var(--ds-ink-2)" }}>{t("dashboard.jobCreate.tipLabel")}</strong>,
                        sites: <strong key="s" style={{ fontWeight: 500, color: "var(--ds-ink-2)" }}>{t("dashboard.jobCreate.protectedSites")}</strong>,
                      })}
                    </span>
                  </span>
                </div>
              )}

              {/* Langue de l'offre — posée AVANT l'analyse, pas après.
                  Elle conditionne tout l'aval : extraction des compétences,
                  génération de l'expérience, e-mails au candidat. Et elle se
                  verrouille dès la première génération (migration 026), donc
                  mieux vaut la choisir sciemment maintenant. */}
              <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 10px 10px 14px", borderRadius: 11 }}>
                <div role="radiogroup" aria-label={t("dashboard.jobCreate.languageLabel")} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--ds-ink-2)" }}>{t("dashboard.jobCreate.languageShort")}</span>
                  <span style={{ display: "inline-flex", padding: 3, gap: 2, borderRadius: 9, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
                    {EXPERIENCE_LOCALES.map((code) => {
                      const actif = code === experienceLocale;
                      return (
                        <button
                          key={code}
                          type="button"
                          role="radio"
                          aria-checked={actif}
                          aria-label={LOCALE_LABELS[code]}
                          title={LOCALE_LABELS[code]}
                          onClick={() => setExperienceLocale(code)}
                          disabled={occupe}
                          style={{
                            minWidth: 40, height: 28, padding: "0 8px", border: 0, borderRadius: 7, font: "inherit", fontSize: 12, cursor: "pointer",
                            background: actif ? "var(--ds-blue)" : "transparent", color: actif ? "#FFFFFF" : "var(--ds-ink-2)", fontWeight: actif ? 500 : 400,
                          }}
                        >
                          {code.toUpperCase()}
                        </button>
                      );
                    })}
                  </span>
                </div>
                <button type="button" className="ds-btn ds-btn-primary" style={{ height: 38, padding: "0 16px" }} onClick={extraire} disabled={extractionImpossible}>
                  {occupe ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  {t("dashboard.jobCreate.extract")}
                  {!occupe && <ArrowRight size={15} strokeWidth={2} />}
                </button>
              </div>
            </section>

            <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ds-ink-3)" }}>
              <Info size={14} style={{ flex: "none" }} />
              {t("dashboard.jobCreate.languageNote")}
            </p>
          </div>
        </div>
      )}

      {/* ── Étape 2 : les compétences ── */}
      {currentStep === 2 && jobData && (
        <div style={{ flex: 1, display: "flex", justifyContent: "center", padding: "32px 20px 40px" }}>
          <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 16 }}>
            {error && (
              <div className="ds-inset" role="alert" style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--ds-red-bg)", borderColor: "var(--ds-red-inset)", color: "var(--ds-red)", fontSize: 13, padding: 12 }}>
                <AlertCircle size={16} style={{ flex: "none" }} /> {error}
              </div>
            )}
            <JobFormStep2 jobData={jobData} setJobData={setJobData} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="ds-btn ds-btn-ghost" onClick={() => setCurrentStep(1)}>
                {t("dashboard.jobCreate.back")}
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-primary"
                disabled={isSaving}
                onClick={valider}
              >
                {isSaving ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {isSaving ? t("common.states.saving") : t("dashboard.jobCreate.validate")}
                {!isSaving && <ArrowRight size={15} strokeWidth={2} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Écran d'attente pendant l'analyse de l'offre */}
      {occupe && (
        <div className="ds-overlay" style={{ background: "rgba(238, 241, 247, 0.92)", backdropFilter: "blur(8px)", flexDirection: "column", textAlign: "center" }}>
          <div className="ds-card" style={{ maxWidth: 460, width: "100%", padding: "32px 28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <span className="ds-icon-tile ds-icon-tile-soft" style={{ width: 44, height: 44, borderRadius: 12 }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            </span>
            <h2 className="ds-h1" style={{ whiteSpace: "normal" }}>
              {isFetchingUrl ? t("dashboard.jobCreate.fetchingTitle") : t("dashboard.jobCreate.analyzingTitle")}
            </h2>
            <p className="ds-sub" style={{ fontSize: 14, lineHeight: 1.6 }}>
              {isFetchingUrl ? t("dashboard.jobCreate.fetchingHelp") : t("dashboard.jobCreate.analyzingHelp")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
