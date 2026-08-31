"use client";

import { useState, useEffect } from "react";
import { Plus, X, ArrowRightLeft } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { useT } from "@/lib/i18n/I18nProvider";

import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "@/lib/constants/skills";
import { TAXONOMIE_COMPETENCES } from "@/lib/constants/taxonomie";

const DEFAULT_LANGUAGES = ["Français", "Anglais", "Néerlandais"];
// Les noms de langues sont stockés en français dans jobData.languages — c'est
// la valeur qui part au moteur de recommandation et au prompt de scoring. Seul
// l'affichage suit la langue du recruteur ; une langue saisie à la main
// (hors des trois par défaut) s'affiche telle qu'elle a été tapée.
const CLES_LANGUES = { "Français": "french", "Anglais": "english", "Néerlandais": "dutch" };

// Marqueur STOCKÉ en base sur la compétence : il ne se traduit pas, sinon les
// offres déjà créées ne correspondraient plus. C'est de la donnée, pas de
// l'interface — et il n'est pas affiché tel quel au recruteur.
const EVIDENCE_MANUELLE = "Sélectionné manuellement";

export default function JobFormStep2({ jobData, setJobData }) {
  const t = useT();
  const [customHardSkill, setCustomHardSkill] = useState("");
  const [customSoftSkill, setCustomSoftSkill] = useState("");
  const [customLanguage, setCustomLanguage] = useState("");

  useEffect(() => {
    if (jobData && jobData.clean_description && jobData.clean_description.includes('**')) {
      const clean = jobData.clean_description.replace(/\*\*/g, '').replace(/\*/g, '');
      setJobData(prev => ({ ...prev, clean_description: clean }));
    }
  }, [jobData?.clean_description]);

  const updateField = (field, value) => {
    setJobData(prev => {
      const newData = { ...prev, [field]: value };
      if (['hard_skills', 'soft_skills', 'languages'].includes(field)) {
        delete newData.saved_flow_nodes;
      }
      return newData;
    });
  };

  const handleAddSkill = (type, name, priority = "must_have") => {
    const current = jobData[type] || [];
    if (!current.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      // Find taxonomy ID for manually selected skills
      let taxonomyId = null;
      if (name) {
        // `tax` et non `t` : le nom court masquerait la fonction de traduction.
        const matchedTax = TAXONOMIE_COMPETENCES.find(tax =>
          tax['Compétence']?.toLowerCase() === name.toLowerCase() ||
          (tax['Compétences proches'] && tax['Compétences proches'].toLowerCase().includes(name.toLowerCase()))
        );
        if (matchedTax) {
          taxonomyId = matchedTax['ID'];
        }
      }
      
      updateField(type, [...current, { name, priority, taxonomy_id: taxonomyId, evidence: EVIDENCE_MANUELLE }]);
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
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button type="button" onClick={() => handleTogglePriority(type, skill.name)} style={{ color: priority === 'must_have' ? 'rgba(255,255,255,0.8)' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }} title={t("dashboard.jobForm.changePriority")}>
                    <ArrowRightLeft size={14} />
                  </button>
                  <button type="button" onClick={() => handleRemoveSkill(type, skill.name)} style={{ color: priority === 'must_have' ? 'white' : 'var(--primary)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', padding: '2px', cursor: 'pointer' }} title={t("dashboard.jobForm.remove")}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {skill.evidence && (
                <div style={{ marginTop: '6px', fontSize: '11px', opacity: priority === 'must_have' ? 0.8 : 0.6, fontStyle: 'italic', borderTop: `1px solid ${priority === 'must_have' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, paddingTop: '6px' }}>
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

  const renderAmbiguityZone = (type) => {
    const ambiguousSkills = (jobData[type] || []).filter(s => s.priority === 'ambiguous');
    if (ambiguousSkills.length === 0) return null;
    
    return (
      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1.5rem' }}>
        <h4 style={{ color: '#b45309', fontWeight: '600', fontSize: '14px', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '16px' }}>⚠️</span> Zone d'incertitude
        </h4>
        <p style={{ fontSize: '13px', color: '#92400e', marginBottom: '1rem' }}>{t("dashboard.jobForm.confirmPriority")}</p>
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
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'must_have' } : s));
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px', background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer' }}>
                  {t("dashboard.jobForm.mustHave")}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const current = jobData[type] || [];
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'nice_to_have' } : s));
                  }}
                  style={{ padding: '4px 8px', fontSize: '12px', background: 'white', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer' }}>
                  {t("dashboard.jobForm.niceToHave")}
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
      {/* Détails du poste */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>{t("dashboard.jobForm.section")}</h3>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '14px', marginBottom: '1.5rem' }}>{t("dashboard.jobForm.sectionHelp")}</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label className="form-label">{t("dashboard.jobForm.jobTitle")}</label>
            <input className="input-field" value={jobData.title || ""} onChange={e => updateField('title', e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t("dashboard.jobForm.shortDescription")}</label>
            <textarea className="input-field" style={{ minHeight: '120px' }} value={jobData.clean_description || ""} onChange={e => updateField('clean_description', e.target.value)} />
          </div>
          <div>
            <label className="form-label">{t("dashboard.jobForm.jobFamily")}</label>
            <input 
              className="input-field" 
              placeholder={t("dashboard.jobForm.categoryPlaceholder")} 
              value={jobData.category || ""}
              onChange={e => updateField('category', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t("dashboard.jobForm.subFamily")}</label>
            <input 
              className="input-field" 
              placeholder={t("dashboard.jobForm.subFamilyPlaceholder")} 
              value={jobData.sub_family || ""}
              onChange={e => updateField('sub_family', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t("dashboard.jobForm.roleType")}</label>
            <CustomSelect 
              value={jobData.role_type || ""}
              onChange={value => updateField('role_type', value)}
              options={[
                /* Les `value` sont les chaînes STOCKÉES en base : elles restent
                   en français quelle que soit la langue de l'interface, sinon
                   les offres déjà créées ne correspondraient plus à aucune
                   option. Seul le `label` affiché se traduit. */
                { value: "Contributeur individuel (IC) — Pas de responsabilité managériale, expert de son domaine", label: t("dashboard.jobForm.roleTypes.ic") },
                { value: "Manager — Gère une équipe, évalue, décide des ressources", label: t("dashboard.jobForm.roleTypes.manager") },
                { value: "Senior IC / Lead — Expert senior sans équipe directe mais avec influence", label: t("dashboard.jobForm.roleTypes.seniorIc") },
                { value: "Director / Executive — Management de managers, vision stratégique", label: t("dashboard.jobForm.roleTypes.director") }
              ]}
              placeholder={t("dashboard.jobForm.selectPlaceholder")}
            />
          </div>
        </div>
      </div>

      {/* Hard Skills */}
      <div>
        <label className="form-label">{t("dashboard.jobForm.hardSkills")}</label>
        {renderAmbiguityZone('hard_skills')}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            className="input-field" 
            placeholder={t("dashboard.jobForm.addCustomSkill")} 
            value={customHardSkill}
            onChange={e => setCustomHardSkill(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill('hard_skills', customHardSkill); setCustomHardSkill(''); } }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => { handleAddSkill('hard_skills', customHardSkill); setCustomHardSkill(''); }}><Plus size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {renderSkillBox('hard_skills', 'must_have', t("dashboard.jobForm.mustHave"))}
          {renderSkillBox('hard_skills', 'nice_to_have', t("dashboard.jobForm.niceToHave"))}
        </div>
      </div>

      {/* Soft Skills */}
      <div>
        <label className="form-label">{t("dashboard.jobForm.softSkills")}</label>
        {renderAmbiguityZone('soft_skills')}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', marginTop: '1rem' }}>
          <input 
            className="input-field" 
            placeholder={t("dashboard.jobForm.addSoftSkill")} 
            value={customSoftSkill}
            onChange={e => setCustomSoftSkill(e.target.value)}
            onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); handleAddSkill('soft_skills', customSoftSkill); setCustomSoftSkill(''); } }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => { handleAddSkill('soft_skills', customSoftSkill); setCustomSoftSkill(''); }}><Plus size={18} /></button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {renderSkillBox('soft_skills', 'must_have', t("dashboard.jobForm.mustHave"))}
          {renderSkillBox('soft_skills', 'nice_to_have', t("dashboard.jobForm.niceToHave"))}
        </div>
      </div>

      {/* Langues */}
      <div>
        <label className="form-label">{t("dashboard.jobForm.languages")}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {DEFAULT_LANGUAGES.map(lang => {
            const isSelected = (jobData.languages || []).find(l => l.name === lang);
            return (
              <span 
                key={lang} 
                onClick={() => isSelected ? handleRemoveLanguage(lang) : handleAddLanguage(lang)}
                style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '20px', border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--primary)' : 'white', color: isSelected ? 'white' : 'var(--muted-foreground)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {CLES_LANGUES[lang] ? t(`dashboard.jobForm.languageNames.${CLES_LANGUES[lang]}`) : lang}
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input 
            className="input-field" 
            placeholder={t("dashboard.jobForm.addLanguage")} 
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
                <span style={{ width: '100px', fontWeight: '500', fontSize: '14px' }}>{CLES_LANGUES[lang.name] ? t(`dashboard.jobForm.languageNames.${CLES_LANGUES[lang.name]}`) : lang.name}</span>
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
        <label className="form-label">{t("dashboard.jobForm.degree")}</label>
        <CustomSelect 
          value={jobData.education_level || ""}
          onChange={value => updateField('education_level', value)}
          options={[
            { value: "Master", label: t("dashboard.jobForm.degrees.master") },
            { value: "Bachelier", label: t("dashboard.jobForm.degrees.bachelor") },
            { value: "Indifférent", label: t("dashboard.jobForm.degrees.any") }
          ]}
          placeholder={t("dashboard.jobForm.selectPlaceholder")}
        />
      </div>

      {/* Expérience requise */}
      <div>
        <label className="form-label">{t("dashboard.jobForm.experienceRequired")}</label>
        <input 
          className="input-field" 
          placeholder={t("dashboard.jobForm.yearsPlaceholder")} 
          value={jobData.years_of_experience || ""} 
          onChange={e => updateField('years_of_experience', e.target.value)} 
        />
      </div>

    </div>
  );
}
