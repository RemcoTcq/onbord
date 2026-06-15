"use client";

import { useState } from "react";
import { Plus, X, ArrowRightLeft } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";

import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "@/lib/constants/skills";
import { TAXONOMIE_COMPETENCES } from "@/lib/constants/taxonomie";

const DEFAULT_LANGUAGES = ["Français", "Anglais", "Néerlandais"];

export default function JobFormStep2({ jobData, setJobData }) {
  const [customHardSkill, setCustomHardSkill] = useState("");
  const [customSoftSkill, setCustomSoftSkill] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");

  const updateField = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (type, name, priority = "must_have") => {
    const current = jobData[type] || [];
    if (!current.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      // Find taxonomy ID for manually selected skills
      let taxonomyId = null;
      const matchedTax = TAXONOMIE_COMPETENCES.find(t => 
        t['Compétence'].toLowerCase() === name.toLowerCase() || 
        (t['Compétences proches'] && t['Compétences proches'].toLowerCase().includes(name.toLowerCase()))
      );
      if (matchedTax) {
        taxonomyId = matchedTax['ID'];
      }
      
      updateField(type, [...current, { name, priority, taxonomy_id: taxonomyId, confidence: 5, evidence: "Sélectionné manuellement" }]);
    }
  };

  const handleRemoveSkill = (type, name) => {
    const current = jobData[type] || [];
    updateField(type, current.filter(s => s.name.toLowerCase() !== name.toLowerCase()));
  };

  const handleTogglePriority = (type, name) => {
    const current = jobData[type] || [];
    updateField(type, current.map(s => {
      if (s.name.toLowerCase() === name.toLowerCase()) {
        return { ...s, priority: s.priority === "must_have" ? "nice_to_have" : "must_have" };
      }
      return s;
    }));
  };

  const handleAddLanguage = (name) => {
    const current = jobData.languages || [];
    if (!current.find(l => l.name === name)) {
      updateField("languages", [...current, { name, level: 3 }]);
    }
  };

  const handleRemoveLanguage = (name) => {
    const current = jobData.languages || [];
    updateField("languages", current.filter(l => l.name !== name));
  };

  const handleUpdateLanguageLevel = (name, level) => {
    const current = jobData.languages || [];
    updateField("languages", current.map(l => l.name === name ? { ...l, level: parseInt(level) } : l));
  };

  const renderSkillBox = (type, priority, title) => {
    const skills = (jobData[type] || []).filter(s => s.priority === priority);
    return (
      <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: '#f8fafc', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', letterSpacing: '0.05em' }}>{title}</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {skills.map(skill => (
            <div key={skill.name} style={{
              display: 'flex', flexDirection: 'column',
              background: priority === 'must_have' ? 'var(--primary)' : 'white',
              color: priority === 'must_have' ? 'white' : 'var(--primary)',
              border: priority === 'must_have' ? '1px solid var(--primary)' : '1px solid var(--primary)',
              padding: '8px 12px', borderRadius: '6px', fontSize: '13px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {skill.name}
                  {skill.taxonomy_id && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)' }} title="ID Taxonomie">{skill.taxonomy_id}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {skill.confidence && (
                    <span style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: skill.confidence >= 4 ? '#4ade80' : skill.confidence === 3 ? '#facc15' : '#f87171' }}></span>
                      Conf: {skill.confidence}/5
                    </span>
                  )}
                  <button type="button" onClick={() => handleTogglePriority(type, skill.name)} style={{ color: priority === 'must_have' ? 'rgba(255,255,255,0.8)' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }} title="Changer de priorité">
                    <ArrowRightLeft size={14} />
                  </button>
                  <button type="button" onClick={() => handleRemoveSkill(type, skill.name)} style={{ color: priority === 'must_have' ? 'white' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }} title="Supprimer">
                    <X size={14} />
                  </button>
                </div>
              </div>
              {skill.evidence && (
                <div style={{ marginTop: '6px', fontSize: '11px', opacity: priority === 'must_have' ? 0.8 : 0.6, fontStyle: 'italic', borderTop: \`1px solid \${priority === 'must_have' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}\`, paddingTop: '6px' }}>
                  "{skill.evidence}"
                </div>
              )}
            </div>
          ))}
          {skills.length === 0 && <span style={{ color: 'var(--muted-foreground)', fontSize: '13px', fontStyle: 'italic' }}>Aucune compétence {priority.replace('_', ' ')}</span>}
        </div>
      </div>
    );
  };

  const getDisplayCategory = () => {
    if (!jobData.category) return "";
    const lowerCat = jobData.category.toLowerCase();
    const exactMatch = Object.keys(DOMAIN_HARD_SKILLS).find(d => d.toLowerCase() === lowerCat);
    if (exactMatch) return exactMatch;
    const fuzzyMatch = Object.keys(DOMAIN_HARD_SKILLS).find(d => lowerCat.includes(d.toLowerCase()) || d.toLowerCase().includes(lowerCat));
    if (fuzzyMatch) return fuzzyMatch;
    return "Autre";
  };
  
  const displayCategory = getDisplayCategory();

  const renderAmbiguityZone = (type) => {
    const ambiguousSkills = (jobData[type] || []).filter(s => s.confidence && s.confidence <= 3);
    if (ambiguousSkills.length === 0) return null;
    
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#b45309', fontWeight: '600', fontSize: '14px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span> Zone d'incertitude
        </h4>
        <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '1rem' }}>Certaines compétences sont ambiguës dans l'offre. Veuillez confirmer leur priorité :</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ambiguousSkills.map(skill => (
            <div key={skill.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
              <div>
                <span style={{ fontWeight: '500', fontSize: '13px' }}>{skill.name}</span>
                {skill.evidence && <div style={{ fontSize: '11px', color: '#92400e', opacity: 0.8 }}>"{skill.evidence}"</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    const current = jobData[type] || [];
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'must_have', confidence: 5 } : s));
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px', background: skill.priority === 'must_have' ? 'var(--primary)' : 'white', color: skill.priority === 'must_have' ? 'white' : 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer' }}>
                  Must Have
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const current = jobData[type] || [];
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'nice_to_have', confidence: 5 } : s));
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px', background: skill.priority === 'nice_to_have' ? 'var(--primary)' : 'white', color: skill.priority === 'nice_to_have' ? 'white' : 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer' }}>
                  Nice To Have
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Profil recherché */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Profil recherché</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '1.5rem' }}>Définissez les compétences et critères du profil idéal</p>
        
        <label className="form-label">Domaine *</label>
        <CustomSelect 
          value={displayCategory} 
          onChange={(value) => updateField('category', value)} 
          options={[...Object.keys(DOMAIN_HARD_SKILLS).map(d => ({ value: d, label: d })), { value: "Autre", label: "Autre (préciser)" }]} 
          placeholder="Sélectionnez un domaine" 
        />
        {displayCategory === 'Autre' && (
           <input 
             className="input-field fade-in" 
             style={{ marginTop: '0.5rem' }} 
             placeholder="Précisez votre domaine..." 
             value={jobData.category === 'Autre' ? '' : jobData.category}
             onChange={e => updateField('category', e.target.value)}
           />
        )}
      </div>

      {/* Hard Skills */}
      <div>
        <label className="form-label">Hard Skills *</label>
        {renderAmbiguityZone('hard_skills')}
        {jobData.category && DOMAIN_HARD_SKILLS[jobData.category] && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {DOMAIN_HARD_SKILLS[jobData.category].map(skill => {
              // Matching fuzzy : exact, puis contenu, pour gérer réponses IA légèrement différentes
              const skillNorm = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
              const isSelected = (jobData.hard_skills || []).find(s => {
                const sNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return sNorm === skillNorm || sNorm.includes(skillNorm) || skillNorm.includes(sNorm);
              });
              return (
                <span 
                  key={skill} 
                  onClick={() => isSelected ? handleRemoveSkill('hard_skills', isSelected.name) : handleAddSkill('hard_skills', skill)}
                  style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--accent)' : 'white', color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: isSelected ? '600' : '400' }}
                >
                  {skill}
                </span>
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            className="input-field" 
            placeholder="Ajouter un skill personnalisé" 
            value={customHardSkill}
            onChange={e => setCustomHardSkill(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill('hard_skills', customHardSkill); setCustomHardSkill(''); } }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => { handleAddSkill('hard_skills', customHardSkill); setCustomHardSkill(''); }}><Plus size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {renderSkillBox('hard_skills', 'must_have', 'MUST HAVE')}
          {renderSkillBox('hard_skills', 'nice_to_have', 'NICE TO HAVE')}
        </div>
      </div>

      {/* Soft Skills */}
      <div>
        <label className="form-label">Soft Skills</label>
        {renderAmbiguityZone('soft_skills')}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {SOFT_SKILLS_LIST.map(skill => {
            const skillNorm = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isSelected = (jobData.soft_skills || []).find(s => {
              const sNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return sNorm === skillNorm || sNorm.includes(skillNorm) || skillNorm.includes(sNorm);
            });
            return (
              <span 
                key={skill} 
                onClick={() => isSelected ? handleRemoveSkill('soft_skills', isSelected.name) : handleAddSkill('soft_skills', skill)}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--accent)' : 'white', color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: isSelected ? '600' : '400' }}
              >
                {skill}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            className="input-field" 
            placeholder="Ajouter un soft skill" 
            value={customSoftSkill}
            onChange={e => setCustomSoftSkill(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill('soft_skills', customSoftSkill); setCustomSoftSkill(''); } }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => { handleAddSkill('soft_skills', customSoftSkill); setCustomSoftSkill(''); }}><Plus size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {renderSkillBox('soft_skills', 'must_have', 'MUST HAVE')}
          {renderSkillBox('soft_skills', 'nice_to_have', 'NICE TO HAVE')}
        </div>
      </div>

      {/* Langues */}
      <div>
        <label className="form-label">Langues</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {DEFAULT_LANGUAGES.map(lang => {
            const isSelected = (jobData.languages || []).find(l => l.name === lang);
            return (
              <span 
                key={lang} 
                onClick={() => isSelected ? handleRemoveLanguage(lang) : handleAddLanguage(lang)}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--primary)' : 'white', color: isSelected ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {lang}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            className="input-field" 
            placeholder="Ajouter une langue" 
            value={customLanguage}
            onChange={e => setCustomLanguage(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddLanguage(customLanguage); setCustomLanguage(''); } }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => { handleAddLanguage(customLanguage); setCustomLanguage(''); }}><Plus size={18} /></button>
        </div>

        {(jobData.languages || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            {(jobData.languages || []).map(lang => (
              <div key={lang.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '100px', fontWeight: '500', fontSize: '14px' }}>{lang.name}</span>
                <input 
                  type="range" 
                  min="1" 
                  max="5" 
                  value={lang.level} 
                  onChange={(e) => handleUpdateLanguageLevel(lang.name, e.target.value)}
                  style={{ flex: 1, accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '600', width: '30px', textAlign: 'right' }}>{lang.level}/5</span>
                <button type="button" onClick={() => handleRemoveLanguage(lang.name)} style={{ background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diplôme */}
      <div>
        <label className="form-label">Diplôme</label>
        <CustomSelect 
          value={jobData.education_level || ""}
          onChange={value => updateField('education_level', value)}
          options={[
            { value: "Master", label: "Master" },
            { value: "Bachelier", label: "Bachelier" },
            { value: "Indifférent", label: "Indifférent" }
          ]}
          placeholder="Sélectionnez..."
        />
      </div>

      {/* Expérience requise */}
      <div>
        <label className="form-label">Expérience requise</label>
        <input 
          className="input-field" 
          placeholder="ex: 3 ans, 1-3 ans, 5+ ans" 
          value={jobData.years_of_experience || ""} 
          onChange={e => updateField('years_of_experience', e.target.value)} 
        />
      </div>

      <hr className="divider" style={{ margin: '1rem 0' }} />

      {/* Détails du poste */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Détails du poste</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '1.5rem' }}>Décrivez le poste et le planning</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label">Titre du poste *</label>
            <input className="input-field" value={jobData.title || ""} onChange={e => updateField('title', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Description courte *</label>
            <textarea className="input-field" style={{ minHeight: '120px' }} value={jobData.clean_description || ""} onChange={e => updateField('clean_description', e.target.value)} />
          </div>
          

          {/* Type de contrat */}
          <div>
            <label className="form-label">Type de contrat</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div 
                onClick={() => updateField('contract_type', 'Temps plein')}
                style={{ border: `2px solid ${jobData.contract_type === 'Temps plein' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: jobData.contract_type === 'Temps plein' ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
              >
                <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Temps plein</h4>
                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>5 jours / semaine</p>
              </div>
              <div 
                onClick={() => {
                  if (typeof jobData.contract_type === 'string' && jobData.contract_type.includes('jours')) return;
                  updateField('contract_type', '2 jours');
                }}
                style={{ border: `2px solid ${(typeof jobData.contract_type === 'string' && jobData.contract_type.includes('jours')) ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: (typeof jobData.contract_type === 'string' && jobData.contract_type.includes('jours')) ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
              >
                <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Temps partiel</h4>
                <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Moins de 5 jours / semaine</p>
              </div>
            </div>
            
            {(typeof jobData.contract_type === 'string' && jobData.contract_type.includes('jours')) && (
              <div className="fade-in" style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Nombre de jours par semaine :</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[2, 3, 4].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => updateField('contract_type', `${day} jours`)}
                      style={{
                        width: '36px', height: '36px', borderRadius: '4px',
                        border: `1px solid ${jobData.contract_type === `${day} jours` ? 'var(--primary)' : 'var(--border)'}`,
                        background: jobData.contract_type === `${day} jours` ? 'var(--primary)' : 'white',
                        color: jobData.contract_type === `${day} jours` ? 'white' : 'var(--foreground)',
                        fontWeight: '600', cursor: 'pointer'
                      }}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Mode de travail</label>
            <CustomSelect 
              value={jobData.work_mode || ""}
              onChange={value => updateField('work_mode', value)}
              options={[
                { value: "onsite", label: "Présentiel" },
                { value: "hybrid", label: "Hybride" },
                { value: "remote", label: "Télétravail" }
              ]}
              placeholder="Sélectionnez le mode..."
            />
          </div>

          <div>
            <label className="form-label">Adresse du lieu de travail *</label>
            <input className="input-field" value={jobData.location || ""} onChange={e => updateField('location', e.target.value)} />
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '6px' }}>L'adresse exacte du bureau ou du site (utile même en remote partiel).</p>
          </div>
        </div>
      </div>

    </div>
  );
}
