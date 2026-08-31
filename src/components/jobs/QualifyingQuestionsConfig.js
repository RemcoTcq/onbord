"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";

export default function QualifyingQuestionsConfig({ config, onChange }) {
  const t = useT();
  const [questions, setQuestions] = useState(config?.questions || []);

  const addQuestion = () => {
    const newQuestions = [
      ...questions, 
      { id: Date.now().toString(), text: "", expectedAnswer: "yes" }
    ];
    setQuestions(newQuestions);
    onChange({ enabled: true, questions: newQuestions });
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
    onChange({ enabled: true, questions: newQuestions });
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    onChange({ enabled: newQuestions.length > 0, questions: newQuestions });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {questions.length === 0 ? (
        <div style={{
          padding: '2rem', textAlign: 'center', background: 'var(--secondary)', 
          borderRadius: 'var(--radius)', border: '1px dashed var(--border)'
        }}>
          <HelpCircle size={32} style={{ color: 'var(--muted-foreground)', marginBottom: '0.5rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.25rem' }}>{t("dashboard.qualifyingConfig.none")}</h3>
          <p style={{ fontSize: '13px', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            {t("dashboard.qualifyingConfig.noneHelp")}
          </p>
          <button className="btn btn-outline btn-sm" onClick={addQuestion}>
            <Plus size={16} /> {t("dashboard.qualifyingConfig.addQuestion")}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {questions.map((q, i) => (
            <div key={q.id} style={{
              display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1rem',
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)'
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  {t("dashboard.qualifyingConfig.questionNumber", { n: i + 1 })}
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ex: Avez-vous le permis B ?"
                  value={q.text}
                  onChange={(e) => updateQuestion(i, "text", e.target.value)}
                />
              </div>
              <div style={{ width: '120px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  {t("dashboard.qualifyingConfig.expectedAnswer")}
                </label>
                <select 
                  className="input-field" 
                  value={q.expectedAnswer}
                  onChange={(e) => updateQuestion(i, "expectedAnswer", e.target.value)}
                >
                  <option value="yes">{t("dashboard.qualifyingConfig.yes")}</option>
                  <option value="no">{t("dashboard.qualifyingConfig.no")}</option>
                </select>
              </div>
              <button 
                className="btn btn-ghost btn-icon" 
                style={{ marginTop: '22px', color: 'var(--destructive)' }}
                onClick={() => removeQuestion(i)}
                title={t("dashboard.qualifyingConfig.deleteQuestion")}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          
          <button className="btn btn-outline" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }} onClick={addQuestion}>
            <Plus size={16} /> {t("dashboard.qualifyingConfig.addAnother")}
          </button>
        </div>
      )}
    </div>
  );
}
