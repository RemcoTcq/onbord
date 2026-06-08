"use client";

import { useState } from "react";
import { FileText, Brain, MessageSquare, Video, Save, Loader2 } from "lucide-react";
import SkillsTestConfig from "./SkillsTestConfig";
import AiInterviewConfig from "./AiInterviewConfig";
import VideoInterviewConfig from "./VideoInterviewConfig";
import { saveAssessmentConfig, selectQuestionsForJob, saveVideoInterviewConfig } from "@/lib/actions/assessment";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_CONFIG = {
  modules: {
    cv_scoring:      { enabled: true },
    skills_tests:    { enabled: false, tests: [] },
    ai_interview:    { enabled: false },
    video_interview: { enabled: false, questions: [], max_duration_seconds: 120, max_retakes: 1 },
  },
};

export default function AssessmentModuleConfig({ job, onSave }) {
  const [config, setConfig] = useState(() => {
    const saved = job?.assessment_config;
    if (saved && Object.keys(saved).length > 0) return saved;
    return DEFAULT_CONFIG;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const modules = config.modules || DEFAULT_CONFIG.modules;

  function update(path, value) {
    setConfig((prev) => {
      const next = { ...prev, modules: { ...prev.modules } };
      next.modules[path] = { ...next.modules[path], ...value };
      return next;
    });
    setHasChanges(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let updatedConfig = { ...config };
      const testsModule = modules.skills_tests;
      
      if (testsModule?.enabled && testsModule.tests?.length > 0) {
        const testsWithQuestions = [];
        for (const testConfig of testsModule.tests) {
          if (!testConfig.test_id) continue;
          // Only re-select if no questions already selected
          if (!testConfig.selected_question_ids?.length) {
            const res = await selectQuestionsForJob(job.id, testConfig.test_id, 5);
            if (res.success) {
              testsWithQuestions.push({ ...testConfig, selected_question_ids: res.selectedIds });
            } else {
              testsWithQuestions.push(testConfig);
            }
          } else {
            testsWithQuestions.push(testConfig);
          }
        }
        
        updatedConfig = {
          ...updatedConfig,
          modules: {
            ...updatedConfig.modules,
            skills_tests: {
              ...updatedConfig.modules.skills_tests,
              tests: testsWithQuestions
            }
          }
        };
      }

      const res = await saveAssessmentConfig(job.id, updatedConfig);
      if (res.success) {
        setConfig(updatedConfig);
        toast("Configuration sauvegardée !");
        setHasChanges(false);
        if (onSave) onSave(updatedConfig);
      } else {
        toast("Erreur lors de la sauvegarde", "error");
      }
    } catch (err) {
      toast("Erreur : " + err.message, "error");
    }
    setSaving(false);
  }

  return (
    <div style={{ paddingBottom: "100px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "4px" }}>Modules d'évaluation</h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          Configurez les modules actifs pour cette offre. Le candidat verra uniquement les modules que vous activez.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* CV Scoring */}
        <ModuleCard
          icon={<FileText size={20} />}
          title="Scoring CV"
          description="Le candidat upload son CV (PDF). Notre IA l'analyse et génère un score de correspondance."
          duration="~2 min"
          enabled={modules.cv_scoring?.enabled ?? true}
          onToggle={(val) => update("cv_scoring", { enabled: val })}
        />

        {/* Skills Tests */}
        <ModuleCard
          icon={<Brain size={20} />}
          title="Tests de compétences"
          description="Sélectionnez des tests de votre bibliothèque. Les questions sont tirées aléatoirement mais identiques pour tous les candidats."
          duration="5–20 min"
          enabled={modules.skills_tests?.enabled ?? false}
          onToggle={(val) => update("skills_tests", { enabled: val })}
        >
          {(modules.skills_tests?.enabled) && (
            <SkillsTestConfig
              jobId={job.id}
              config={modules.skills_tests}
              onChange={(val) => {
                setConfig((prev) => ({
                  ...prev,
                  modules: { ...prev.modules, skills_tests: val },
                }));
                setHasChanges(true);
              }}
            />
          )}
        </ModuleCard>

        {/* AI Interview */}
        <ModuleCard
          icon={<MessageSquare size={20} />}
          title="Entretien IA"
          description="Leo, notre IA, mène un entretien textuel avec le candidat. Configurez la tonalité et les questions obligatoires ci-dessous."
          duration="~10-15 min"
          enabled={modules.ai_interview?.enabled ?? (job?.ai_interview_config?.enabled ?? false)}
          onToggle={(val) => update("ai_interview", { enabled: val })}
        >
          {modules.ai_interview?.enabled && (
            <div style={{ marginTop: "1rem" }}>
              <AiInterviewConfig job={job} hideSaveBar={true} embedded={true} onChange={(val) => {
                 // AiInterviewConfig still saves its own data to the DB, but we pass hideSaveBar so it doesn't show the sticky bar.
              }} />
            </div>
          )}
        </ModuleCard>

        {/* Video Interview */}
        <ModuleCard
          icon={<Video size={20} />}
          title="Entretien Vidéo (One-Way)"
          description="Le candidat répond à des questions en s'enregistrant à la webcam. L'IA transcrit et évalue chaque réponse."
          duration="~5-20 min"
          enabled={modules.video_interview?.enabled ?? false}
          onToggle={(val) => update("video_interview", { enabled: val })}
        >
          {modules.video_interview?.enabled && (
            <div style={{ marginTop: "1rem" }}>
              <VideoInterviewConfig
                jobId={job.id}
                config={modules.video_interview}
                onChange={(val) => {
                  setConfig(prev => ({
                    ...prev,
                    modules: { ...prev.modules, video_interview: { ...prev.modules.video_interview, ...val } },
                  }));
                  setHasChanges(true);
                }}
              />
            </div>
          )}
        </ModuleCard>

      </div>

      {/* Duration total */}
      {(() => {
        const totalMin =
          (modules.cv_scoring?.enabled ? 2 : 0) +
          (modules.skills_tests?.enabled
            ? (modules.skills_tests.tests?.length || 0) * 5
            : 0) +
          (modules.ai_interview?.enabled ? 12 : 0);
        return (
          <div style={{ marginTop: "1.5rem", padding: "1rem", borderRadius: "var(--radius)", background: "var(--secondary)", border: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "4px" }}>
              Durée estimée totale pour le candidat
            </p>
            <p style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--foreground)" }}>
              ~{totalMin} minutes
              <span style={{ fontSize: "13px", fontWeight: "400", color: "var(--muted-foreground)", marginLeft: "8px" }}>
                {totalMin <= 30 ? "✅ Optimal" : "⚠️ Dépasse 30 min recommandées"}
              </span>
            </p>
          </div>
        );
      })()}

      {/* Save bar */}
      {hasChanges && (
        <div className="fade-in" style={{
          position: "fixed", bottom: 0, left: "var(--sidebar-width)", right: 0,
          background: "var(--card)", borderTop: "1px solid var(--border)",
          padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center",
          boxShadow: "0 -4px 12px rgba(0,0,0,0.05)", zIndex: 40,
        }}>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            Les questions sont tirées aléatoirement et fixées à la sauvegarde pour que tous les candidats répondent aux mêmes questions.
          </p>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button className="btn btn-outline" onClick={() => { setConfig(job?.assessment_config || DEFAULT_CONFIG); setHasChanges(false); }}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={16} />}
              <span style={{ marginLeft: "8px" }}>Sauvegarder</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module toggle card ───────────────────────────────────────────────────────
function ModuleCard({ icon, title, description, duration, enabled, onToggle, children }) {
  return (
    <div style={{
      background: "var(--card)", borderRadius: "var(--radius)",
      border: `1px solid ${enabled ? "var(--primary)" : "var(--border)"}`,
      overflow: "hidden", transition: "border-color 200ms",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "8px",
            background: enabled ? "var(--primary)" : "var(--secondary)",
            color: enabled ? "white" : "var(--muted-foreground)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "all 200ms",
          }}>
            {icon}
          </div>
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)", marginBottom: "4px" }}>{title}</h3>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.5", maxWidth: "440px" }}>{description}</p>
            <span style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "4px", display: "inline-block" }}>⏱ {duration}</span>
          </div>
        </div>

        {/* Toggle */}
        <label style={{ position: "relative", display: "inline-block", width: "50px", height: "26px", cursor: "pointer", flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span style={{
            position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: enabled ? "var(--primary)" : "var(--border)",
            transition: ".3s", borderRadius: "34px",
          }}>
            <span style={{
              position: "absolute", height: "18px", width: "18px",
              left: enabled ? "28px" : "4px", bottom: "4px",
              backgroundColor: "white", transition: ".3s", borderRadius: "50%",
            }} />
          </span>
        </label>
      </div>

      {children && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "1.25rem", background: "#fafafa" }}>
          {children}
        </div>
      )}
    </div>
  );
}
