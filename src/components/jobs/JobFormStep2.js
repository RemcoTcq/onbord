"use client";

import { useState, useEffect } from "react";
import { Plus, X, ArrowRightLeft, AlertTriangle } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";
import { useT } from "@/lib/i18n/I18nProvider";

import { DOMAIN_HARD_SKILLS, SOFT_SKILLS_LIST } from "@/lib/constants/skills";
import { TAXONOMIE_COMPETENCES } from "@/lib/constants/taxonomie";
import { niveauCecr } from "@/lib/i18n/languages";

const NIVEAUX_LANGUE = [1, 2, 3, 4, 5];

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
    const must = priority === 'must_have';
    return (
      <div className="ds-inset" style={{ flex: 1, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 500, color: 'var(--ds-ink-2)' }}>
          <span className={`ds-dot ${must ? 'ds-dot-blue' : 'ds-dot-grey'}`} />
          {title}
          <span className="ds-muted" style={{ fontWeight: 400 }}>{skills.length}</span>
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {skills.map(skill => (
            <div key={skill.name} className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 8px 8px 12px', borderRadius: 10, borderColor: must ? 'var(--ds-blue-30)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{skill.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 'none' }}>
                  <button type="button" className="ds-icon-btn" style={{ width: 28, height: 28 }} onClick={() => handleTogglePriority(type, skill.name)} title={t("dashboard.jobForm.changePriority")} aria-label={t("dashboard.jobForm.changePriority")}>
                    <ArrowRightLeft size={14} />
                  </button>
                  <button type="button" className="ds-icon-btn is-danger" style={{ width: 28, height: 28 }} onClick={() => handleRemoveSkill(type, skill.name)} title={t("dashboard.jobForm.remove")} aria-label={t("dashboard.jobForm.remove")}>
                    <X size={14} />
                  </button>
                </span>
              </div>
              {skill.evidence && (
                <div style={{ fontSize: 12, color: 'var(--ds-ink-4)', fontStyle: 'italic', lineHeight: 1.45 }}>
                  « {skill.evidence} »
                </div>
              )}
            </div>
          ))}
          {skills.length === 0 && <span className="ds-muted" style={{ fontSize: 13 }}>{t("dashboard.jobForm.noSkillsIn", { label: title })}</span>}
        </div>
      </div>
    );
  };

  const renderAmbiguityZone = (type) => {
    const ambiguousSkills = (jobData[type] || []).filter(s => s.priority === 'ambiguous');
    if (ambiguousSkills.length === 0) return null;

    return (
      <div className="ds-inset" style={{ background: 'var(--ds-amber-bg)', borderColor: '#F3DDB8', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: 'var(--ds-amber-ink)' }}>
            <AlertTriangle size={15} /> {t("dashboard.jobForm.uncertaintyZone")}
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ds-amber-ink)' }}>{t("dashboard.jobForm.confirmPriority")}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ambiguousSkills.map(skill => (
            <div key={skill.name} className="ds-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 8px 8px 12px', borderRadius: 10 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{skill.name}</span>
                {skill.evidence && <div style={{ fontSize: 12, color: 'var(--ds-ink-4)', fontStyle: 'italic' }}>« {skill.evidence} »</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
                <button
                  type="button"
                  className="ds-btn ds-btn-sm"
                  onClick={() => {
                    const current = jobData[type] || [];
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'must_have' } : s));
                  }}>
                  {t("dashboard.jobForm.mustHave")}
                </button>
                <button
                  type="button"
                  className="ds-btn ds-btn-sm"
                  onClick={() => {
                    const current = jobData[type] || [];
                    updateField(type, current.map(s => s.name === skill.name ? { ...s, priority: 'nice_to_have' } : s));
                  }}>
                  {t("dashboard.jobForm.niceToHave")}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Champ « ajouter » + bouton, commun aux compétences et aux langues.
  const champAjout = (valeur, setValeur, placeholder, ajouter) => (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        className="ds-input"
        placeholder={placeholder}
        value={valeur}
        onChange={e => setValeur(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (valeur.trim()) { ajouter(valeur.trim()); setValeur(''); } } }}
      />
      <button type="button" className="ds-btn" style={{ height: 40, width: 40, padding: 0, flex: 'none' }} aria-label={placeholder} onClick={() => { if (valeur.trim()) { ajouter(valeur.trim()); setValeur(''); } }}>
        <Plus size={16} />
      </button>
    </div>
  );

  const titrePanneau = (titre, aide) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 10px 0' }}>
      <h3 className="ds-h2">{titre}</h3>
      {aide && <p className="ds-sub">{aide}</p>}
    </div>
  );

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Détails du poste */}
      <section className="ds-panel">
        {titrePanneau(t("dashboard.jobForm.section"), t("dashboard.jobForm.sectionHelp"))}
        <div className="ds-inset" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <label className="ds-field" style={{ gridColumn: '1 / -1' }}>
            <span className="ds-label">{t("dashboard.jobForm.jobTitle")}</span>
            <input className="ds-input" value={jobData.title || ""} onChange={e => updateField('title', e.target.value)} />
          </label>
          <label className="ds-field" style={{ gridColumn: '1 / -1' }}>
            <span className="ds-label">{t("dashboard.jobForm.shortDescription")}</span>
            <textarea className="ds-textarea" style={{ minHeight: 120 }} value={jobData.clean_description || ""} onChange={e => updateField('clean_description', e.target.value)} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobForm.jobFamily")}</span>
            <input className="ds-input" placeholder={t("dashboard.jobForm.categoryPlaceholder")} value={jobData.category || ""} onChange={e => updateField('category', e.target.value)} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobForm.subFamily")}</span>
            <input className="ds-input" placeholder={t("dashboard.jobForm.subFamilyPlaceholder")} value={jobData.sub_family || ""} onChange={e => updateField('sub_family', e.target.value)} />
          </label>
          <div className="ds-field" style={{ gridColumn: '1 / -1' }}>
            <span className="ds-label">{t("dashboard.jobForm.roleType")}</span>
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
      </section>

      {/* Hard Skills */}
      <section className="ds-panel">
        {titrePanneau(t("dashboard.jobForm.hardSkills"))}
        <div className="ds-inset" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFFFF' }}>
          {renderAmbiguityZone('hard_skills')}
          {champAjout(customHardSkill, setCustomHardSkill, t("dashboard.jobForm.addCustomSkill"), (nom) => handleAddSkill('hard_skills', nom))}
          <div style={{ display: 'flex', gap: 12 }}>
            {renderSkillBox('hard_skills', 'must_have', t("dashboard.jobForm.mustHave"))}
            {renderSkillBox('hard_skills', 'nice_to_have', t("dashboard.jobForm.niceToHave"))}
          </div>
        </div>
      </section>

      {/* Soft Skills */}
      <section className="ds-panel">
        {titrePanneau(t("dashboard.jobForm.softSkills"))}
        <div className="ds-inset" style={{ display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFFFF' }}>
          {renderAmbiguityZone('soft_skills')}
          {champAjout(customSoftSkill, setCustomSoftSkill, t("dashboard.jobForm.addSoftSkill"), (nom) => handleAddSkill('soft_skills', nom))}
          <div style={{ display: 'flex', gap: 12 }}>
            {renderSkillBox('soft_skills', 'must_have', t("dashboard.jobForm.mustHave"))}
            {renderSkillBox('soft_skills', 'nice_to_have', t("dashboard.jobForm.niceToHave"))}
          </div>
        </div>
      </section>

      {/* Langues */}
      <section className="ds-panel">
        {titrePanneau(t("dashboard.jobForm.languages"))}
        <div className="ds-inset" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DEFAULT_LANGUAGES.map(lang => {
              const isSelected = (jobData.languages || []).find(l => l.name === lang);
              return (
                <button
                  key={lang}
                  type="button"
                  aria-pressed={!!isSelected}
                  onClick={() => isSelected ? handleRemoveLanguage(lang) : handleAddLanguage(lang)}
                  className="ds-btn ds-btn-sm"
                  style={isSelected ? { background: 'var(--ds-blue)', borderColor: 'var(--ds-blue)', color: '#FFFFFF' } : undefined}
                >
                  {CLES_LANGUES[lang] ? t(`dashboard.jobForm.languageNames.${CLES_LANGUES[lang]}`) : lang}
                </button>
              );
            })}
          </div>
          {champAjout(customLanguage, setCustomLanguage, t("dashboard.jobForm.addLanguage"), handleAddLanguage)}

          {(jobData.languages || []).length > 0 && (
            <div className="ds-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 16, borderRadius: 10 }}>
              {(jobData.languages || []).map(lang => (
                <div key={lang.name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ width: 100, fontWeight: 500 }}>{CLES_LANGUES[lang.name] ? t(`dashboard.jobForm.languageNames.${CLES_LANGUES[lang.name]}`) : lang.name}</span>
                  {/* Le curseur reste sur 1-5 (c'est ce qui est stocké) ; l'échelle
                      CECR en dessous dit au recruteur ce que chaque cran veut dire. */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={lang.level}
                      onChange={(e) => handleUpdateLanguageLevel(lang.name, e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--ds-blue)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      {NIVEAUX_LANGUE.map(n => (
                        <span
                          key={n}
                          className="ds-mono"
                          onClick={() => handleUpdateLanguageLevel(lang.name, n)}
                          style={{ cursor: 'pointer', color: n === Number(lang.level) ? 'var(--ds-blue)' : 'var(--ds-ink-5)', fontWeight: n === Number(lang.level) ? 500 : 400 }}
                        >
                          {niveauCecr(n)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ width: 130, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
                    <span className="ds-mono" style={{ fontWeight: 500 }}>{niveauCecr(lang.level)}</span>
                    <span style={{ fontSize: 12, color: 'var(--ds-ink-4)', textAlign: 'right' }}>{t(`dashboard.jobForm.languageLevels.${lang.level}`)}</span>
                  </div>
                  <button type="button" className="ds-icon-btn is-danger" onClick={() => handleRemoveLanguage(lang.name)} aria-label={t("dashboard.jobForm.remove")} title={t("dashboard.jobForm.remove")}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Diplôme et expérience */}
      <section className="ds-panel">
        <div className="ds-inset" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <div className="ds-field">
            <span className="ds-label">{t("dashboard.jobForm.degree")}</span>
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
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobForm.experienceRequired")}</span>
            <input
              className="ds-input"
              placeholder={t("dashboard.jobForm.yearsPlaceholder")}
              value={jobData.years_of_experience || ""}
              onChange={e => updateField('years_of_experience', e.target.value)}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
