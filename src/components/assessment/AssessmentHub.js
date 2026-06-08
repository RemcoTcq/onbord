"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, FileText, Brain, MessageSquare, Video, ChevronRight, Loader2, Clock } from "lucide-react";
import CvUploadModule from "./CvUploadModule";
import SkillsTestModule from "./SkillsTestModule";
import InterviewModule from "./InterviewModule";
import VideoInterviewModule from "./VideoInterviewModule";
import ResultsView from "./ResultsView";
import FullscreenGuard from "./FullscreenGuard";
import QualifyingQuestionsModule from "./QualifyingQuestionsModule";
import { getCandidateTestSessions, submitAssessment, passQualifyingQuestions } from "@/lib/actions/assessment";
import { createClient } from "@/lib/supabase/client";

function getModulesConfig(job, candidate) {
  const assessment = job?.assessment_config?.modules || {};
  const aiConfig = job?.ai_interview_config || {};

  const cvEnabled = assessment.cv_scoring?.enabled ?? true;
  const testsEnabled = assessment.skills_tests?.enabled ?? false;
  const interviewEnabled = assessment.ai_interview?.enabled ?? aiConfig?.enabled ?? false;
  const videoEnabled = assessment.video_interview?.enabled ?? false;

  return {
    qualifying: assessment.qualifying_questions?.enabled ?? false,
    qualifyingConfig: assessment.qualifying_questions || {},
    cv: cvEnabled,
    tests: testsEnabled,
    interview: interviewEnabled,
    video: videoEnabled,
    videoConfig: assessment.video_interview || {},
    testsConfig: assessment.skills_tests || {},
  };
}

export default function AssessmentHub({ candidate, job, recruiter, onCandidateUpdate }) {
  const [activeModule, setActiveModule] = useState(null); // null = hub view
  const [cvStatus, setCvStatus] = useState(candidate.cv_raw_text ? "completed" : "pending");
  const [testSessions, setTestSessions] = useState([]);
  const [interviewStatus, setInterviewStatus] = useState(
    candidate.status === "interview_completed" ? "completed" : "pending"
  );
  const [videoStatus, setVideoStatus] = useState(
    candidate.video_interview_status === "completed" ? "completed" : "pending"
  );
  const [submitted, setSubmitted] = useState(candidate.assessment_status === "submitted");
  const [submitting, setSubmitting] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const modules = getModulesConfig(job, candidate);

  const [qualifyingStatus, setQualifyingStatus] = useState(
    candidate.assessment_status === "disqualified" ? "disqualified" : 
    (modules.qualifying && candidate.assessment_status === "pending") ? "pending" : "passed"
  );

  useEffect(() => {
    if (modules.tests) loadTestSessions();
  }, []);

  async function loadTestSessions() {
    setLoadingSessions(true);
    const res = await getCandidateTestSessions(candidate.id);
    if (res.success) setTestSessions(res.sessions || []);
    setLoadingSessions(false);
  }

  async function handleCheat(event) {
    const supabase = createClient();
    
    // Get latest metrics from DB to avoid overwriting other events (e.g. from sub-modules)
    const { data: latest } = await supabase
      .from("candidates")
      .select("anti_cheat_metrics")
      .eq("id", candidate.id)
      .single();

    const currentMetrics = latest?.anti_cheat_metrics || [];
    const newMetrics = [...currentMetrics, event];
    
    await supabase
      .from("candidates")
      .update({ anti_cheat_metrics: newMetrics })
      .eq("id", candidate.id);
      
    console.log("Anti-cheat event recorded:", event);
  }

  // ─── Completion checks ────────────────────────────────────────────────────
  const testsConfig = modules.testsConfig;
  const selectedTests = testsConfig?.tests || [];
  const testsCompleted = selectedTests.length === 0
    ? true
    : selectedTests.every((t) =>
        testSessions.find((s) => s.test_id === t.test_id && s.status === "completed")
      );

  const allModulesComplete = (() => {
    if (modules.cv && cvStatus !== "completed") return false;
    if (modules.tests && !testsCompleted) return false;
    if (modules.interview && interviewStatus !== "completed") return false;
    if (modules.video && videoStatus !== "completed") return false;
    return true;
  })();

  async function handleSubmit() {
    if (!allModulesComplete || submitting) return;
    setSubmitting(true);
    const res = await submitAssessment(candidate.id);
    if (res.success) {
      setSubmitted(true);
      onCandidateUpdate({ assessment_status: "submitted", score_global: res.scoreGlobal, score_tests: res.scoreTests });
    }
    setSubmitting(false);
  }

  // ─── Submitted / Disqualified / Results view ─────────────────────────────────────────────
  if (submitted || qualifyingStatus === "disqualified" || candidate.assessment_status === "disqualified") {
    return <ResultsView candidate={{ ...candidate, assessment_status: "submitted" }} job={job} testSessions={testSessions} />;
  }

  // ─── Qualifying Questions ─────────────────────────────────────────────────
  if (modules.qualifying && qualifyingStatus === "pending") {
    return (
      <QualifyingQuestionsModule
        candidate={candidate}
        questions={modules.qualifyingConfig?.questions || []}
        onComplete={async () => {
          await passQualifyingQuestions(candidate.id);
          setQualifyingStatus("passed");
        }}
        onFail={() => {
          setQualifyingStatus("disqualified");
        }}
      />
    );
  }

  // ─── Active module view ───────────────────────────────────────────────────
  if (activeModule === "cv") {
    return (
      <CvUploadModule
        candidate={candidate}
        job={job}
        onComplete={() => { setCvStatus("completed"); setActiveModule(null); }}
        onBack={() => setActiveModule(null)}
      />
    );
  }
  if (activeModule === "tests") {
    return (
      <FullscreenGuard onCheat={handleCheat} candidateId={candidate.id}>
        <SkillsTestModule
          candidate={candidate}
          job={job}
          recruiter={recruiter}
          testsConfig={testsConfig}
          testSessions={testSessions}
          onComplete={() => { loadTestSessions(); setActiveModule(null); }}
          onBack={() => { loadTestSessions(); setActiveModule(null); }}
        />
      </FullscreenGuard>
    );
  }
  if (activeModule === "interview") {
    return (
      <FullscreenGuard onCheat={handleCheat} candidateId={candidate.id}>
        <InterviewModule
          candidate={candidate}
          job={job}
          onComplete={() => { setInterviewStatus("completed"); setActiveModule(null); }}
          onBack={() => setActiveModule(null)}
        />
      </FullscreenGuard>
    );
  }
  if (activeModule === "video") {
    return (
      <VideoInterviewModule
        candidate={candidate}
        job={job}
        onComplete={() => { setVideoStatus("completed"); setActiveModule(null); }}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  // ─── Hub view ─────────────────────────────────────────────────────────────
  const companyName = recruiter?.company_name || job?.extracted_criteria?.company_name || "L'entreprise";
  const jobTitle = job?.title || "ce poste";

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.5rem", letterSpacing: "-0.02em" }}>
            Votre assessment
          </h1>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
            <strong style={{ color: "var(--foreground)" }}>{jobTitle}</strong>
          </p>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "4px" }}>
            Bonjour {candidate.first_name} ! Complétez chaque module ci-dessous pour soumettre votre candidature.
          </p>
        </div>

        {/* Progress bar */}
        {(() => {
          const total = [modules.cv, modules.tests, modules.interview, modules.video].filter(Boolean).length;
          const done = [
            modules.cv && cvStatus === "completed",
            modules.tests && testsCompleted,
            modules.interview && interviewStatus === "completed",
            modules.video && videoStatus === "completed",
          ].filter(Boolean).length;
          const remaining = total - done;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div style={{ marginBottom: "2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--foreground)" }}>Progression</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--primary)" }}>
                  {remaining > 0 ? `Il vous reste ${remaining} activité${remaining > 1 ? "s" : ""} à compléter` : "Toutes les activités sont complétées"}
                </span>
              </div>
              <div style={{ height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "99px",
                  background: pct === 100 ? "#22c55e" : "var(--primary)",
                  width: `${pct}%`, transition: "width 0.5s ease"
                }} />
              </div>
            </div>
          );
        })()}

        {/* Module cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>

          {modules.cv && (
            <ModuleCard
              title="Curriculum Vitae"
              description="Importez votre CV au format PDF pour que nous puissions évaluer votre profil."
              duration="~2 min"
              status={cvStatus}
              onOpen={() => setActiveModule("cv")}
            />
          )}

          {modules.tests && (
            <ModuleCard
              title="Tests de compétences"
              description={`${selectedTests.length} test${selectedTests.length > 1 ? "s" : ""} à compléter. Questions chronométrées.`}
              duration={`~${selectedTests.length * 5} min`}
              status={loadingSessions ? "loading" : testsCompleted ? "completed" : testSessions.some(s => s.status === "in_progress") ? "in_progress" : "pending"}
              onOpen={() => setActiveModule("tests")}
            />
          )}

          {modules.interview && (
            <ModuleCard
              title="Entretien"
              description="Répondez aux questions de notre assistant IA pour partager votre expérience et motivation."
              duration="~10-15 min"
              status={interviewStatus}
              onOpen={() => setActiveModule("interview")}
            />
          )}

          {modules.video && (
            <ModuleCard
              title="Entretien Vidéo"
              description={`Répondez à ${modules.videoConfig?.questions?.length || 0} question${(modules.videoConfig?.questions?.length || 0) > 1 ? "s" : ""} en vous enregistrant à la webcam.`}
              duration={`~${(modules.videoConfig?.questions?.length || 3) * 3} min`}
              status={videoStatus}
              icon={<Video size={18} />}
              onOpen={() => setActiveModule("video")}
            />
          )}

        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!allModulesComplete || submitting}
          style={{
            width: "100%", padding: "1rem", borderRadius: "var(--radius)",
            background: allModulesComplete ? "#22c55e" : "var(--secondary)",
            color: allModulesComplete ? "white" : "var(--muted-foreground)",
            border: "none", cursor: allModulesComplete ? "pointer" : "not-allowed",
            fontSize: "15px", fontWeight: "700", display: "flex", alignItems: "center",
            justifyContent: "center", gap: "10px", transition: "all 200ms",
            boxShadow: allModulesComplete ? "0 4px 14px rgba(34,197,94,0.35)" : "none",
          }}
        >
          {submitting ? (
            <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Soumission en cours...</>
          ) : allModulesComplete ? (
            <><CheckCircle2 size={18} /> Soumettre mon assessment</>
          ) : (
            "Complétez tous les modules pour soumettre"
          )}
        </button>

        {!allModulesComplete && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "0.75rem" }}>
            Tous les modules doivent être complétés avant la soumission.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────────────
function ModuleCard({ title, description, duration, status, onOpen }) {
  const isCompleted = status === "completed";
  const isLoading = status === "loading";
  const isInProgress = status === "in_progress";

  const statusConfig = {
    pending:     { label: "À compléter",   bg: "var(--secondary)",  color: "var(--muted-foreground)", dot: "#94a3b8" },
    in_progress: { label: "En cours",      bg: "#fef3c7",           color: "#92400e",                 dot: "#f59e0b" },
    completed:   { label: "Complété",      bg: "#dcfce7",           color: "#166534",                 dot: "#22c55e" },
    loading:     { label: "Chargement...", bg: "var(--secondary)",  color: "var(--muted-foreground)", dot: "#94a3b8" },
  }[status] || { label: status, bg: "var(--secondary)", color: "var(--muted-foreground)", dot: "#94a3b8" };

  return (
    <div
      onClick={!isCompleted && !isLoading ? onOpen : undefined}
      style={{
        background: "var(--card)", border: `1px solid ${isCompleted ? "#bbf7d0" : "var(--border)"}`,
        borderRadius: "var(--radius)", padding: "1.25rem",
        cursor: isCompleted || isLoading ? "default" : "pointer",
        transition: "all 150ms", opacity: isLoading ? 0.6 : 1,
        display: "flex", alignItems: "center", gap: "1rem",
      }}
      onMouseEnter={(e) => { if (!isCompleted && !isLoading) e.currentTarget.style.borderColor = "var(--primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = isCompleted ? "#bbf7d0" : "var(--border)"; }}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)" }}>{title}</h3>
          <span style={{
            fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px",
            background: statusConfig.bg, color: statusConfig.color
          }}>
            {statusConfig.label}
          </span>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.5" }}>{description}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
          <Clock size={12} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "500" }}>{duration}</span>
        </div>
      </div>

      {/* Arrow */}
      {!isCompleted && !isLoading && (
        <ChevronRight size={18} style={{ color: "var(--muted-foreground)", flexShrink: 0 }} />
      )}
      {isCompleted && (
        <CheckCircle2 size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
      )}
    </div>
  );
}
