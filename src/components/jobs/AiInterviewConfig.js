"use client";

import { useState, useEffect } from "react";
import { 
  ChevronDown, ChevronUp, Plus, Trash2, Wand2, 
  CheckCircle2, AlertCircle, ShieldAlert, Check, Loader2, Save
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { updateJobAiConfig, generateAiInterviewText } from "@/lib/actions/job";

const PRESETS = {
  Technique: { hard_skills: 60, soft_skills: 15, motivation: 10, culture: 10, potential: 5 },
  Commercial: { hard_skills: 20, soft_skills: 35, motivation: 25, culture: 15, potential: 5 },
  Créatif: { hard_skills: 30, soft_skills: 20, motivation: 20, culture: 20, potential: 10 },
  Junior: { hard_skills: 20, soft_skills: 20, motivation: 25, culture: 15, potential: 20 },
};

const INTRO_TEMPLATES = {
  Formel: "Bonjour. Je suis Leo, assistant IA pour [Nom de l'entreprise]. L'objectif de cet échange est de parcourir vos compétences pour le poste de {title}. Êtes-vous prêt à commencer ?",
  Neutre: "Bonjour ! Je suis Leo, l'assistant IA de [Nom de l'entreprise]. Je suis ravi d'échanger avec vous aujourd'hui pour le poste de {title}. L'objectif de cet échange est de mieux comprendre votre parcours. Êtes-vous prêt ?",
  Décontracté: "Salut ! Moi c'est Leo, l'assistant IA de [Nom de l'entreprise]. Super content d'échanger avec toi pour le poste de {title}. On va parler un peu de ton parcours. Prêt ?"
};

const OUTRO_TEMPLATES = {
  Formel: "Je vous remercie pour vos réponses détaillées. L'équipe recrutement va analyser votre profil et reviendra vers vous prochainement. Bonne journée.",
  Neutre: "Merci beaucoup pour cet échange ! L'équipe recrutement va analyser vos réponses et reviendra vers vous très prochainement. Excellente journée !",
  Décontracté: "Merci pour cette super discussion ! L'équipe recrutement va regarder tout ça et te tiendra au courant très vite. Passe une belle journée !"
};

const DEFAULT_CONFIG = {
  enabled: false,
  questions: [],
  decisive_criteria: [],
  tonality: "Neutre",
  intro_text: INTRO_TEMPLATES["Neutre"],
  outro_text: OUTRO_TEMPLATES["Neutre"],
  context_about: "",
  context_why: "",
  context_what_matters: "",
  evaluation_weights: PRESETS["Technique"]
};

export default function AiInterviewConfig({ job, onSave }) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [openAccordions, setOpenAccordions] = useState([1, 2, 3, 4]);
  const [activePreset, setActivePreset] = useState("Technique");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState({ intro: false, outro: false, context: false });
  const [newQuestion, setNewQuestion] = useState("");
  const [newCriterion, setNewCriterion] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (job?.ai_interview_config) {
      const loadedConfig = { ...DEFAULT_CONFIG, ...job.ai_interview_config };
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
  }, [job?.ai_interview_config]);

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
      toast("Configuration sauvegardée avec succès");
      setHasChanges(false);
      if (onSave) onSave(config);
    } else {
      toast("Erreur lors de la sauvegarde", "error");
    }
    setIsSaving(false);
  };

  const handleGenerate = async (fieldGroup) => {
    setIsGenerating(prev => ({ ...prev, [fieldGroup]: true }));
    try {
      if (fieldGroup === 'intro') {
        const res = await generateAiInterviewText('intro', job, config.tonality);
        if (res.success) updateConfig({ intro_text: res.text });
      } else if (fieldGroup === 'outro') {
        const res = await generateAiInterviewText('outro', job, config.tonality);
        if (res.success) updateConfig({ outro_text: res.text });
      } else if (fieldGroup === 'context') {
        const [res1, res2, res3] = await Promise.all([
          generateAiInterviewText('context_about', job),
          generateAiInterviewText('context_why', job),
          generateAiInterviewText('context_what_matters', job)
        ]);
        updateConfig({
          context_about: res1.success ? res1.text : config.context_about,
          context_why: res2.success ? res2.text : config.context_why,
          context_what_matters: res3.success ? res3.text : config.context_what_matters,
        });
        toast("Contexte généré avec succès ! Vous pouvez le modifier librement.");
      }
    } catch (err) {
      toast("Erreur de génération", "error");
    }
    setIsGenerating(prev => ({ ...prev, [fieldGroup]: false }));
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
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
        background: 'var(--card)', padding: '1.5rem', borderRadius: 'var(--radius)', 
        border: '1px solid var(--border)', marginBottom: '2rem' 
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Interview IA Automatisée</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginTop: '4px' }}>
            L'IA mènera un entretien avec les candidats pour évaluer leurs compétences et leur motivation.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: config.enabled ? 'var(--primary)' : 'var(--muted-foreground)' }}>
            {config.enabled ? 'Activée' : 'Désactivée'}
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

      {!config.enabled && (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px dashed var(--border)' }}>
          <Wand2 size={48} style={{ color: 'var(--muted-foreground)', opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Activez l'Interview IA</h3>
          <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
            L'interview IA vous permet de pré-qualifier automatiquement les candidats avant de les rencontrer.
          </p>
          <button className="btn btn-primary" onClick={() => updateConfig({ enabled: true })}>
            Activer l'Interview IA
          </button>
        </div>
      )}

      {config.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Bloc 1 : Questions imposées */}
          <div style={{ background: 'var(--card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <AccordionHeader 
              id={1} 
              title="Questions imposées" 
              description="Questions spécifiques que l'IA doit absolument poser." 
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
                    placeholder='Ex : "Décrivez votre expérience avec Next.js."'
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
              title="Intro & Clôture" 
              description="Message d'accueil, message de fin et ton de l'interview." 
              isValid={!!config.intro_text && !!config.outro_text} 
            />
            {openAccordions.includes(2) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                <div>
                  <label className="form-label">Ton de l'interview</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Formel', 'Neutre', 'Décontracté'].map(ton => (
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
                    <label className="form-label" style={{ margin: 0 }}>Message d'introduction</label>
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
                  <span><strong>Durée estimée :</strong> 10 à 15 minutes selon les réponses du candidat.</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Message de clôture</label>
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
              title="Contexte pour l'IA" 
              description="Informations invisibles pour le candidat pour orienter l'IA." 
              isValid={!!config.context_about || !!config.context_why || !!config.context_what_matters} 
            />
            {openAccordions.includes(3) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔒</span> Non visible par le candidat
                  </div>
                  <button 
                    className="btn btn-sm btn-outline" 
                    onClick={() => handleGenerate('context')}
                    disabled={isGenerating.context}
                    style={{ gap: '6px' }}
                  >
                    {isGenerating.context ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />}
                    Pré-remplir depuis l'offre d'emploi
                  </button>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Ces éléments servent de "brief" à l'IA pour personnaliser ses questions. Vous pouvez modifier manuellement les textes générés.</p>

                <div>
                  <label className="form-label">À propos de l'entreprise</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder="Ex : Startup de 20 personnes dans la fintech, ambiance collaborative..."
                    value={config.context_about || ""}
                    onChange={e => updateConfig({ context_about: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Pourquoi ce recrutement ?</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder="Ex : Croissance de l'équipe produit, lancement d'une nouvelle feature..."
                    value={config.context_why || ""}
                    onChange={e => updateConfig({ context_why: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Ce qui compte vraiment</label>
                  <textarea 
                    className="input-field" 
                    rows={3}
                    placeholder="Ex : Quelqu'un d'autonome, passionné, qui communique bien en async..."
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
              title="Critères d'évaluation" 
              description="Poids des critères et éléments éliminatoires." 
              isValid={totalWeights === 100} 
            />
            {openAccordions.includes(4) && (
              <div style={{ padding: '1.5rem', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                {/* Sliders */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '1rem' }}>Poids de l'évaluation globale</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(p => (
                      <button 
                        key={p} 
                        className={`btn btn-sm ${activePreset === p ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setPreset(p, PRESETS[p])}
                      >
                        {p}
                      </button>
                    ))}
                    <button className={`btn btn-sm ${activePreset === 'Personnalisé' ? 'btn-primary' : 'btn-outline'}`} disabled>
                      ✏️ Personnalisé
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { key: 'hard_skills', label: 'Hard skills (techniques)' },
                      { key: 'soft_skills', label: 'Communication & soft skills' },
                      { key: 'motivation', label: 'Motivation' },
                      { key: 'culture', label: 'Culture fit' },
                      { key: 'potential', label: 'Potentiel & adaptabilité' },
                    ].map(({ key, label }) => (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ width: '200px', fontSize: '14px', fontWeight: '500' }}>{label}</span>
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
                      <span style={{ fontWeight: '600' }}>Total</span>
                      <span style={{ fontSize: '11px', opacity: 0.8 }}>doit être égal à 100%</span>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalWeights}%</span>
                  </div>
                  {totalWeights !== 100 && (
                    <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                      <button className="btn btn-sm btn-ghost" onClick={() => setPreset("Technique", PRESETS["Technique"])}>
                        Réinitialiser par défaut
                      </button>
                    </div>
                  )}
                </div>

                <hr className="divider" />

                {/* Critères décisifs (Red flags) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                    <ShieldAlert size={18} style={{ color: 'var(--destructive)' }} />
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--destructive)' }}>Critères décisifs (Points bloquants)</h4>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    Si l'IA détecte ces conditions dans les réponses du candidat, elles seront signalées dans le rapport. 
                    <strong>L'IA ne rejette jamais un candidat automatiquement.</strong>
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
      {hasChanges && (
        <div className="fade-in" style={{
          position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0,
          background: 'var(--card)', borderTop: '1px solid var(--border)',
          padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', zIndex: 40
        }}>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>
            Les modifications s'appliqueront aux prochains entretiens envoyés.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={() => {
              setConfig({ ...DEFAULT_CONFIG, ...job.ai_interview_config });
              setHasChanges(false);
            }}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || (config.enabled && totalWeights !== 100)}>
              {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              <span style={{ marginLeft: '8px' }}>Sauvegarder la configuration</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
