"use client";

import { useState } from "react";
import { Plus, X, ArrowRightLeft } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";

const DOMAIN_HARD_SKILLS = {
  "Finance": ["SAS", "Stata", "Gretl", "PowerBI", "Tableau", "QlikView", "Qualtrics", "Octopus", "Wolters Kluwer", "Yuki", "Exact Online", "ProAcc", "Winbooks", "Xero Accounting", "SPSS"],
  "IT & Software": ["HTML/CSS", "Docker", "PHP", "SQL", "C/C++", ".NET", "Java", "Ruby on Rails", "Swift", "React.js", "Ember.js", "CodeIgniter", "Scala", "Python", "NumPy", "Ubuntu", "Pandas", "JavaScript", "Angular.js", "Linux", "SAP", "Azure", "Django", "Node.js", "WordPress", "Shopify", "Vue.js"],
  "Business & Sales": ["CRM", "ERP", "Navision", "SAP", "Microsoft SharePoint", "Salesforce", "Oracle"],
  "Marketing": ["Email Marketing", "Social Media Advertising", "Google Analytics", "SEO", "SEA", "Google Tag Manager"],
  "Administratif": ["Microsoft Excel", "Microsoft Outlook", "Microsoft Word", "Google Workspace", "Gestion administrative", "Gestion d'emails", "Organisation & planning"],
  "Ingénierie": ["AutoCAD", "Autodesk", "SolidWorks", "Solid Edge", "Siemens PLC", "Siemens NX", "Matlab", "EPLAN", "R Studio", "Vectorworks", "Revit", "Archicad", "LaTeX", "Primavera", "Inventor", "Arduino", "Sony Vegas", "Raspberry Pi"]
};

const SOFT_SKILLS_LIST = [
  "Communication", "Travail en équipe", "Autonomie", "Proactivité", "Organisation", "Adaptabilité", 
  "Gestion du temps", "Esprit analytique", "Résolution de problèmes", "Créativité", "Leadership", 
  "Rigueur", "Sens du détail", "Esprit critique", "Orientation résultats"
];

const DEFAULT_LANGUAGES = ["Français", "Anglais", "Néerlandais"];

export default function JobFormStep2({ jobData, setJobData }) {
  const [customHardSkill, setCustomHardSkill] = useState("");
  const [customSoftSkill, setCustomSoftSkill] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");
  const [customQuestion, setCustomQuestion] = useState("");

  const updateField = (field, value) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (type, name, priority = "must_have") => {
    const current = jobData[type] || [];
    if (!current.find(s => s.name === name)) {
      updateField(type, [...current, { name, priority }]);
    }
  };

  const handleRemoveSkill = (type, name) => {
    const current = jobData[type] || [];
    updateField(type, current.filter(s => s.name !== name));
  };

  const handleTogglePriority = (type, name) => {
    const current = jobData[type] || [];
    updateField(type, current.map(s => {
      if (s.name === name) {
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
      <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', background: '#f8fafc', minHeight: '120px' }}>
        <h4 style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--muted-foreground)', marginBottom: '1rem', letterSpacing: '0.05em' }}>{title}</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {skills.map(skill => (
            <div key={skill.name} style={{ 
              display: 'inline-flex', alignItems: 'center', 
              background: priority === 'must_have' ? 'var(--primary)' : 'white', 
              color: priority === 'must_have' ? 'white' : 'var(--primary)',
              border: priority === 'must_have' ? '1px solid var(--primary)' : '1px solid var(--primary)',
              padding: '4px 10px', borderRadius: '4px', fontSize: '13px', gap: '6px' 
            }}>
              {skill.name}
              <button type="button" onClick={() => handleTogglePriority(type, skill.name)} style={{ color: priority === 'must_have' ? 'rgba(255,255,255,0.7)' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px' }} title="Changer de priorité">
                <ArrowRightLeft size={12} />
              </button>
              <button type="button" onClick={() => handleRemoveSkill(type, skill.name)} style={{ color: priority === 'must_have' ? 'white' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px', marginLeft: '4px' }}>
                <X size={14} />
              </button>
            </div>
          ))}
          {skills.length === 0 && <span style={{ color: 'var(--muted-foreground)', fontSize: '13px', fontStyle: 'italic' }}>Vide</span>}
        </div>
      </div>
    );
  };

  // Improved Category Matching
  const getDisplayCategory = () => {
    if (!jobData.category) return "";
    const lowerCat = jobData.category.toLowerCase();
    const exactMatch = Object.keys(DOMAIN_HARD_SKILLS).find(d => d.toLowerCase() === lowerCat);
    if (exactMatch) return exactMatch;
    
    // Fuzzy match (e.g. "IT" -> "IT & Software")
    const fuzzyMatch = Object.keys(DOMAIN_HARD_SKILLS).find(d => lowerCat.includes(d.toLowerCase()) || d.toLowerCase().includes(lowerCat));
    if (fuzzyMatch) return fuzzyMatch;
    
    return "Autre";
  };
  
  const displayCategory = getDisplayCategory();

  // Modern Select Wrapper
  const renderSelect = (value, onChange, options, placeholder) => (
    <CustomSelect 
      value={value} 
      onChange={onChange} 
      options={options} 
      placeholder={placeholder} 
    />
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* Type de talent */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Profil recherché</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '1.5rem' }}>Définissez le type de talent et ses compétences</p>
        
        <label className="form-label">Type de talent *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div 
            onClick={() => updateField('talent_type', 'etudiant')}
            style={{ border: `2px solid ${jobData.talent_type === 'etudiant' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: jobData.talent_type === 'etudiant' ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
          >
            <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Étudiant</h4>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>En cours d'études</p>
          </div>
          <div 
            onClick={() => updateField('talent_type', 'jeune_diplome')}
            style={{ border: `2px solid ${jobData.talent_type === 'jeune_diplome' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: jobData.talent_type === 'jeune_diplome' ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
          >
            <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Jeune diplômé</h4>
            <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Diplômé récent</p>
          </div>
        </div>
      </div>

      {/* Domaine */}
      <div>
        <label className="form-label">Domaine *</label>
        {renderSelect(
          displayCategory, 
          (value) => updateField('category', value), 
          [...Object.keys(DOMAIN_HARD_SKILLS).map(d => ({ value: d, label: d })), { value: "Autre", label: "Autre (préciser)" }], 
          "Sélectionnez un domaine"
        )}
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
        {jobData.category && DOMAIN_HARD_SKILLS[jobData.category] && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {DOMAIN_HARD_SKILLS[jobData.category].map(skill => {
              const isSelected = (jobData.hard_skills || []).find(s => s.name === skill);
              return (
                <span 
                  key={skill} 
                  onClick={() => isSelected ? handleRemoveSkill('hard_skills', skill) : handleAddSkill('hard_skills', skill)}
                  style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--accent)' : 'white', color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s' }}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {SOFT_SKILLS_LIST.map(skill => {
            const isSelected = (jobData.soft_skills || []).find(s => s.name === skill);
            return (
              <span 
                key={skill} 
                onClick={() => isSelected ? handleRemoveSkill('soft_skills', skill) : handleAddSkill('soft_skills', skill)}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--accent)' : 'white', color: isSelected ? 'var(--primary)' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s' }}
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
        {renderSelect(
          jobData.education_level || "",
          value => updateField('education_level', value),
          [
            { value: "Master", label: "Master" },
            { value: "Bachelier", label: "Bachelier" },
            { value: "Indifférent", label: "Indifférent" }
          ],
          "Sélectionnez..."
        )}
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
          
          {/* Nombre de talents */}
          <div>
            <label className="form-label">Nombre de talents</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {[1, 2, "3+"].map(num => {
                const currentVal = jobData.talents_needed || 1;
                const isActive = (num === "3+" && currentVal >= 3) || currentVal === num;
                return (
                  <button 
                    key={num} 
                    type="button"
                    onClick={() => updateField('talents_needed', num === "3+" ? 3 : num)}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`, background: isActive ? 'var(--primary)' : 'white', color: isActive ? 'white' : 'var(--foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}
                  >
                    {num}
                  </button>
                );
              })}
              {(jobData.talents_needed || 1) >= 3 && (
                <input 
                  type="number" 
                  min="3" 
                  className="input-field" 
                  style={{ width: '80px', marginLeft: '1rem' }} 
                  value={jobData.talents_needed || 3} 
                  onChange={e => updateField('talents_needed', parseInt(e.target.value) || 3)}
                />
              )}
            </div>
          </div>

          {/* Type de contrat dynamique */}
          <div>
            <label className="form-label">Type de contrat</label>
            {jobData.talent_type === 'etudiant' ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Jours par semaine (min 2, max 5) :</span>
                <input 
                  type="number" 
                  min="2" 
                  max="5" 
                  className="input-field" 
                  style={{ width: '100px' }} 
                  value={jobData.contract_type || 2} 
                  onChange={e => updateField('contract_type', e.target.value)}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div 
                  onClick={() => updateField('contract_type', 'Temps plein')}
                  style={{ border: `2px solid ${jobData.contract_type === 'Temps plein' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: jobData.contract_type === 'Temps plein' ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
                >
                  <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Temps plein</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>5 jours / semaine</p>
                </div>
                <div 
                  onClick={() => updateField('contract_type', 'Temps partiel')}
                  style={{ border: `2px solid ${jobData.contract_type === 'Temps partiel' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', background: jobData.contract_type === 'Temps partiel' ? 'var(--accent)' : 'white', transition: 'all 0.2s' }}
                >
                  <h4 style={{ fontWeight: '600', color: 'var(--foreground)' }}>Temps partiel</h4>
                  <p style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Min. 3 jours / semaine</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Mode de travail</label>
            {renderSelect(
              jobData.work_mode || "",
              value => updateField('work_mode', value),
              [
                { value: "onsite", label: "Présentiel" },
                { value: "hybrid", label: "Hybride" },
                { value: "remote", label: "Télétravail" }
              ],
              "Sélectionnez le mode..."
            )}
          </div>

          <div>
            <label className="form-label">Adresse du lieu de travail *</label>
            <input className="input-field" value={jobData.location || ""} onChange={e => updateField('location', e.target.value)} />
            <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', marginTop: '6px' }}>L'adresse exacte du bureau ou du site (utile même en remote partiel).</p>
          </div>
        </div>
      </div>

      <hr className="divider" style={{ margin: '1rem 0' }} />

      {/* Questions personnalisées pour l'entretien IA */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Questions pour l'entretien IA</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '1.5rem' }}>
          Définissez des questions spécifiques qu'Alex devra obligatoirement poser lors de l'entretien. Laissez vide pour utiliser uniquement les questions générées automatiquement.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="input-field"
            placeholder='Ex : "Décrivez votre expérience avec la gestion de projets en équipe."'
            value={customQuestion}
            onChange={e => setCustomQuestion(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (customQuestion.trim()) {
                  const current = jobData.custom_questions || [];
                  updateField('custom_questions', [...current, customQuestion.trim()]);
                  setCustomQuestion('');
                }
              }
            }}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (customQuestion.trim()) {
                const current = jobData.custom_questions || [];
                updateField('custom_questions', [...current, customQuestion.trim()]);
                setCustomQuestion('');
              }
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {(jobData.custom_questions || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(jobData.custom_questions || []).map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                padding: '0.75rem 1rem', background: '#f8fafc',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--primary)', minWidth: '20px', marginTop: '1px' }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: '14px', color: 'var(--foreground)', lineHeight: '1.5' }}>{q}</span>
                <button
                  type="button"
                  onClick={() => {
                    const current = jobData.custom_questions || [];
                    updateField('custom_questions', current.filter((_, idx) => idx !== i));
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: '2px', flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
