"use client";

import { useState, useEffect } from "react";
import { 
  ChevronDown, ChevronUp, Plus, Trash2, Wand2, 
  CheckCircle2, AlertCircle, ShieldAlert, Check, Loader2, Save
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n/I18nProvider";
import { coerceExperienceLocale } from "@/lib/i18n/config";
import { introTemplates, outroTemplates, TONALITIES } from "@/lib/interview/defaults";
import { updateJobAiConfig } from "@/lib/actions/job";

const PRESETS = {
  Technique: { hard_skills: 60, soft_skills: 15, motivation: 10, culture: 10, potential: 5 },
  Commercial: { hard_skills: 20, soft_skills: 35, motivation: 25, culture: 15, potential: 5 },
  Créatif: { hard_skills: 30, soft_skills: 20, motivation: 20, culture: 20, potential: 10 },
  Junior: { hard_skills: 20, soft_skills: 20, motivation: 25, culture: 15, potential: 20 },
};

// Les messages d'ouverture et de clôture vivent dans lib/interview/defaults.js :
// ils sont DITS AU CANDIDAT et suivent donc la langue de l'offre, pas celle du
// dashboard. Ici on ne garde que la config par défaut, sans les textes.
const BASE_CONFIG = {
  enabled: false,
  questions: [],
  decisive_criteria: [],
  tonality: "Neutre",
  context_about: "",
  context_why: "",
  context_what_matters: "",
  evaluation_weights: PRESETS["Technique"]
};

export default function AiInterviewConfig({ job, onSave, hideSaveBar, embedded, onChange, prefilledConfig }) {
  const t = useT();

  // Langue de l'OFFRE : elle décide des textes proposés au recruteur, qui
  // seront lus par le candidat. Un dashboard en anglais sur une offre
  // néerlandaise doit proposer un message d'accueil en néerlandais.
  const jobLocale = coerceExperienceLocale(job?.experience_locale);
  const INTRO_TEMPLATES = introTemplates(jobLocale);
  const OUTRO_TEMPLATES = outroTemplates(jobLocale);

  const DEFAULT_CONFIG = {
    ...BASE_CONFIG,
    intro_text: INTRO_TEMPLATES["Neutre"],
    outro_text: OUTRO_TEMPLATES["Neutre"],
  };

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [openAccordions, setOpenAccordions] = useState([1, 2, 3, 4]);
  const [activePreset, setActivePreset] = useState("Technique");
  const [isSaving, setIsSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCriterion, setNewCriterion] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Notify parent of changes
  useEffect(() => {
    if (onChange && hasChanges) {
      onChange(config);
    }
  }, [config, onChange, hasChanges]);

  useEffect(() => {
    let sourceConfig = job?.ai_interview_config;
    // If we have a prefilledConfig (e.g. LLM generated during creation), use it over empty default
    if (prefilledConfig && !job?.ai_interview_config) {
      sourceConfig = prefilledConfig;
    }

    if (sourceConfig) {
      const loadedConfig = { ...DEFAULT_CONFIG, ...sourceConfig };
      setConfig(loadedConfig);
      
      let matchedPreset = "Personnalisé";
      for (const [key, weights] of Object.entries(PRESETS)) {
        if (JSON.stringify(weights) === JSON.stringify(loadedConfig.evaluation_weights)) {
          matchedPreset = key;
          break;
        }
      }
      setActivePreset(matchedPreset);
    } else {
      setConfig(prev => ({
        ...prev,
        intro_text: prev.intro_text.replace("{title}", job?.title || "ce poste"),
        outro_text: prev.outro_text.replace("{title}", job?.title || "ce poste")
      }));
    }
  }, [job?.ai_interview_config, prefilledConfig]);

  const toggleAccordion = (id) => {
    setOpenAccordions(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleTonalityChange = (ton) => {
    updateConfig({ 
      tonality: ton,
      intro_text: INTRO_TEMPLATES[ton].replace("{title}", job?.title || "ce poste"),
      outro_text: OUTRO_TEMPLATES[ton].replace("{title}", job?.title || "ce poste")
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const res = await updateJobAiConfig(job.id, config);
    if (res.success) {
      toast(t("dashboard.aiInterview.saved"));
      setHasChanges(false);
      if (onSave) onSave(config);
    } else {
      toast(t("dashboard.aiInterview.saveError"), "error");
    }
    setIsSaving(false);
  };

  const updateWeight = (key, value) => {
    const num = parseInt(value) || 0;
    const newWeights = { ...config.evaluation_weights, [key]: num };
    updateConfig({ evaluation_weights: newWeights });
    setActivePreset("Personnalisé");
  };

  const setPreset = (name, weights) => {
    updateConfig({ evaluation_weights: weights });
    setActivePreset(name);
  };

  const totalWeights = Object.values(config.evaluation_weights || {}).reduce((a, b) => a + b, 0);

  const AccordionHeader = ({ id, title, description, isValid = true }) => (
    <div 
      onClick={() => toggleAccordion(id)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem', cursor: 'pointer', background: 'var(--card)',
        borderBottom: openAccordions.includes(id) ? '1px solid var(--border)' : 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: 'var(--secondary)',
          color: 'var(--foreground)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', fontWeight: 'bold'
        }}>
          {id}
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{title}</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginTop: '2px' }}>{description}</p>
        </div>
      </div>
      {openAccordions.includes(id) ? <ChevronUp size={20} color="var(--muted-foreground)" /> : <ChevronDown size={20} color="var(--muted-foreground)" />}
    </div>
  );

  return (
    <div className="fade-in" style={{ paddingBottom: '100px' }}>
      {!embedded && (
        <div style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
          background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)', marginBottom: '2rem' 
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{t("dashboard.aiInterview.heading")}</h2>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
              {t("dashboard.aiInterview.intro")}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: config.enabled ? 'var(--primary)' : 'var(--muted-foreground)' }}>
              {config.enabled ? t("dashboard.aiInterview.enabled") : t("dashboard.aiInterview.disabled")}
            </span>
            <label style={{
              position: 'relative', display: 'inline-block', width: '50px', height: '26px', cursor: 'pointer'
            }}>
              <input 
                type="checkbox" 
                checked={config.enabled} 
                onChange={e => updateConfig({ enabled: e.target.checked })} 
                style={{ opacity: 0, width: 0, height: 0 }} 
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: config.enabled ? 'var(--primary)' : 'var(--border)',
                transition: '.4s', borderRadius: '34px'
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: '18px', width: '18px',
                  left: config.enabled ? '28px' : '4px', bottom: '4px',
                  backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
                }}/>
              </span>
            </label>
          </div>
        </div>
      )}

      {!embedded && !config.enabled && (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <Wand2 size={48} style={{ color: 'var(--muted-foreground)', opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t("dashboard.aiInterview.enableTitle")}</h3>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            {t("dashboard.aiInterview.enableHelp")}
          </p>
          <button className="btn btn-primary" onClick={() => updateConfig({ enabled: true })}>
            {t("dashboard.aiInterview.enableAction")}
          </button>
        </div>
      )}

      {(config.enabled || embedded) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Bloc 1 : Questions imposées */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader 
              id={1} 
              title={t("dashboard.aiInterview.requiredQuestions")}
              description={t("dashboard.aiInterview.requiredQuestionsHelp")}

              isValid={config.questions?.length > 0} 
            />
            {openAccordions.includes(1) && (
              <div style={{ padding: '1.5rem', background: '#fafafa' }}>
                <p style={{ fontSize: '14px', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                  L'IA choisira le meilleur moment pour poser ces questions naturellement dans la conversation.
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    className="input-field"
                    placeholder={t("dashboard.aiInterview.questionPlaceholder")}
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    disabled={config.questions?.length >= 15}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newQuestion.trim() && config.questions?.length < 15) {
                        e.preventDefault();
                        updateConfig({ questions: [...(config.questions || []), newQuestion.trim()] });
                        setNewQuestion('');
                      }
                    }}
                  />
                  <button
                    className="btn btn-secondary"
                    disabled={!newQuestion.trim() || config.questions?.length >= 15}
                    onClick={() => {
                      updateConfig({ questions: [...(config.questions || []), newQuestion.trim()] });
                      setNewQuestion('');
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted-foreground)', textAlign: 'right', marginBottom: '1rem' }}>
                  {(config.questions || []).length} / 15 questions
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(config.questions || []).map((q, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'white', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', marginTop: '2px' }}>{i + 1}.</span>
                      <span style={{ flex: 1, fontSize: '14px' }}>{q}</span>
                      <button onClick={() => updateConfig({ questions: config.questions.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bloc 2 : Intro & Clôture */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader 
              id={2} 
              title={t("dashboard.aiInterview.introSection")}
              description={t("dashboard.aiInterview.introSectionHelp")}

              isValid={!!config.intro_text && !!config.outro_text} 
            />
            {openAccordions.includes(2) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div>
                  <label className="form-label">{t("dashboard.aiInterview.tone")}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {TONALITIES.map(ton => (
                      <button 
                        key={ton}
                        className={`btn btn-sm ${config.tonality === ton ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleTonalityChange(ton)}
                      >
                        {ton}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>{t("dashboard.aiInterview.introMessage")}</label>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{(config.intro_text || '').length} / 400</span>
                  </div>
                  <textarea 
                    className="input-field" 
                    rows={4}
                    maxLength={400}
                    value={config.intro_text || ""}
                    onChange={e => updateConfig({ intro_text: e.target.value })}
                  />
                </div>

                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '12px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span><strong>{t("dashboard.aiInterview.estimatedDuration")}</strong> {t("dashboard.aiInterview.estimatedDurationValue")}</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>{t("dashboard.aiInterview.outroMessage")}</label>
                    <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>{(config.outro_text || '').length} / 300</span>
                  </div>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    maxLength={300}
                    value={config.outro_text || ""}
                    onChange={e => updateConfig({ outro_text: e.target.value })}
                  />
                </div>

              </div>
            )}
          </div>

          {/* Bloc 3 : Contexte */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader 
              id={3} 
              title={t("dashboard.aiInterview.contextSection")}
              description={t("dashboard.aiInterview.contextSectionHelp")}

              isValid={!!config.context_about || !!config.context_why || !!config.context_what_matters} 
            />
            {openAccordions.includes(3) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}>
                  <span>🔒</span> {t("dashboard.aiInterview.hiddenFromCandidate")}
                </div>

                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{t("dashboard.aiInterview.contextHelp")}</p>

                <div>
                  <label className="form-label">{t("dashboard.aiInterview.aboutCompany")}</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder="Ex : Startup de 20 personnes dans la fintech, ambiance collaborative..."
                    value={config.context_about || ""}
                    onChange={e => updateConfig({ context_about: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">{t("dashboard.aiInterview.whyHiring")}</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder={t("dashboard.aiInterview.whyHiringPlaceholder")}
                    value={config.context_why || ""}
                    onChange={e => updateConfig({ context_why: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">{t("dashboard.aiInterview.whatMatters")}</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder={t("dashboard.aiInterview.whatMattersPlaceholder")}
                    value={config.context_what_matters || ""}
                    onChange={e => updateConfig({ context_what_matters: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bloc 4 : Critères & Red flags */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader 
              id={4} 
              title={t("dashboard.aiInterview.criteriaSection")}
              description={t("dashboard.aiInterview.criteriaSectionHelp")}

              isValid={totalWeights === 100} 
            />
            {openAccordions.includes(4) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                {/* Sliders */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem' }}>{t("dashboard.aiInterview.globalWeight")}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(p => (
                      <button 
                        key={p} 
                        className={`btn btn-sm ${activePreset === p ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPreset(p, PRESETS[p])}
                      >
                        {t(`dashboard.aiInterview.presets.${p}`)}
                      </button>
                    ))}
                    <button className={`btn btn-sm ${activePreset === 'Personnalisé' ? 'btn-primary' : 'btn-outline'}`} disabled>
                      {t("dashboard.aiInterview.customPreset")}
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'hard_skills' },
                      { key: 'soft_skills' },
                      { key: 'motivation' },
                      { key: 'culture' },
                      { key: 'potential' },
                    ].map(({ key }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ width: '200px', fontSize: '14px', fontWeight: '500' }}>{t(`dashboard.aiInterview.weights.${key}`)}</span>
                        <input 
                          type="range" 
                          min="0" max="100" step="5"
                          value={config.evaluation_weights?.[key] || 0}
                          onChange={e => updateWeight(key, e.target.value)}
                          style={{ flex: 1, accentColor: 'var(--primary)' }}
                        />
                        <span style={{ width: '40px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                          {config.evaluation_weights?.[key] || 0}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ 
                    marginTop: '1.5rem', padding: '1rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: totalWeights === 100 ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${totalWeights === 100 ? '#bbf7d0' : '#fecaca'}`,
                    color: totalWeights === 100 ? '#166534' : '#991b1b'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '600' }}>{t("dashboard.aiInterview.total")}</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>{t("dashboard.aiInterview.mustEqual100")}</span>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalWeights}%</span>
                  </div>
                  {totalWeights !== 100 && (
                    <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setPreset("Technique", PRESETS["Technique"])}>
                        {t("dashboard.aiInterview.resetDefaults")}
                      </button>
                    </div>
                  )}
                </div>

                <hr className="divider" />

                {/* Critères décisifs (Red flags) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--destructive)' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--destructive)' }}>{t("dashboard.aiInterview.decisiveCriteria")}</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    {t("dashboard.aiInterview.decisiveCriteriaHelp")}{" "}
                    <strong>{t("dashboard.aiInterview.neverAutoRejects")}</strong>
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      className="input-field"
                      placeholder='Ex : "Indisponible avant 3 mois", "Pas de permis B"'
                      value={newCriterion}
                      onChange={e => setNewCriterion(e.target.value)}
                      style={{ borderColor: '#fca5a5' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newCriterion.trim()) {
                          e.preventDefault();
                          updateConfig({ decisive_criteria: [...(config.decisive_criteria || []), newCriterion.trim()] });
                          setNewCriterion('');
                        }
                      }}
                    />
                    <button
                      className="btn"
                      disabled={!newCriterion.trim()}
                      onClick={() => {
                        updateConfig({ decisive_criteria: [...(config.decisive_criteria || []), newCriterion.trim()] });
                        setNewCriterion('');
                      }}
                      style={{ background: '#fef2f2', color: 'var(--destructive)', border: '1px solid #fca5a5' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {(config.decisive_criteria || []).map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-sm)' }}>
                        <ShieldAlert size={16} style={{ color: 'var(--destructive)', marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '14px', color: '#7f1d1d' }}>{c}</span>
                        <button onClick={() => updateConfig({ decisive_criteria: config.decisive_criteria.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* Barre de sauvegarde sticky */}
      {!hideSaveBar && hasChanges && (
        <div className="fade-in" style={{
          position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0,
          background: 'var(--card)', borderTop: '1px solid var(--border)',
          padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 40
        }}>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
            {t("dashboard.aiInterview.appliesToNext")}
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => {
              setConfig({ ...DEFAULT_CONFIG, ...job.ai_interview_config });
              setHasChanges(false);
            }}>
              {t("common.actions.cancel")}
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || (config.enabled && totalWeights !== 100)}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              <span style={{ marginLeft: '8px' }}>{t("dashboard.aiInterview.saveConfig")}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
