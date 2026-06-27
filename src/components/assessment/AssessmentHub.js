"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, FileText, Brain, MessageSquare, Video, ChevronRight, ArrowRight, Loader2, Clock, Target, Megaphone, Lightbulb, UserCheck, Languages, Code } from "lucide-react";
import CvUploadModule from "./CvUploadModule";
import SkillsTestModule from "./SkillsTestModule";
import InterviewModule from "./InterviewModule";
import VideoInterviewModule from "./VideoInterviewModule";
import ResultsView from "./ResultsView";
import FullscreenGuard from "./FullscreenGuard";
import QualifyingQuestionsModule from "./QualifyingQuestionsModule";
import { getCandidateTestSessions, submitAssessment, passQualifyingQuestions } from "@/lib/actions/assessment";
import { createClient } from "@/lib/supabase/client";

// Statuts qui ne doivent plus être rétrogradés
const STATUS_RANK = { invited: 0, in_progress: 1, termine: 2, soumis: 3 };
function shouldUpgradeStatus(currentStatus, newStatus) {
  return (STATUS_RANK[newStatus] ?? -1) > (STATUS_RANK[currentStatus] ?? -1);
}

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

// Fonction pour choisir une icône dynamique selon le nom du test
function getTestIcon(testName = "") {
  const name = testName.toLowerCase();
  if (name.includes("dev") || name.includes("code") || name.includes("tech") || name.includes("react") || name.includes("python")) return Code;
  if (name.includes("vente") || name.includes("commercial") || name.includes("sales") || name.includes("business")) return Target;
  if (name.includes("marketing") || name.includes("communication") || name.includes("seo")) return Megaphone;
  if (name.includes("logique") || name.includes("raisonnement") || name.includes("analyse")) return Lightbulb;
  if (name.includes("langue") || name.includes("anglais") || name.includes("espagnol") || name.includes("orthographe")) return Languages;
  if (name.includes("personnalité") || name.includes("comportement") || name.includes("management") || name.includes("rh")) return UserCheck;
  return Brain;
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
    if (modules.interview && interviewStatus !== "completed") return false;
    if (modules.video && videoStatus !== "completed") return false;
    if (!testsCompleted) return false;
    return true;
  })();


  useEffect(() => {
    if (modules.tests) loadTestSessions();
  }, []);

  // ── Passer status → 'termine' automatiquement quand tous les modules sont finis ──
  useEffect(() => {
    if (allModulesComplete && !submitted) {
      const currentStatus = candidate.status;
      if (shouldUpgradeStatus(currentStatus, 'termine')) {
        const supabase = createClient();
        supabase
          .from('candidates')
          .update({ status: 'termine' })
          .eq('id', candidate.id)
          .then(() => onCandidateUpdate({ status: 'termine' }));
      }
    }
  }, [allModulesComplete, submitted]);

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

    const currentMetrics = Array.isArray(latest?.anti_cheat_metrics) ? latest.anti_cheat_metrics : [];
    const newMetrics = [...currentMetrics, event];
    
    await supabase
      .from("candidates")
      .update({ anti_cheat_metrics: newMetrics })
      .eq("id", candidate.id);
      
    console.log("Anti-cheat event recorded:", event);
  }

  const [finalScores, setFinalScores] = useState(null);

  async function handleSubmit() {
    if (!allModulesComplete || submitting) return;
    setSubmitting(true);
    const res = await submitAssessment(candidate.id);
    if (res.success) {
      setFinalScores({ score_global: res.scoreGlobal, score_tests: res.scoreTests, score_interview: res.scoreVideo }); // wait, what if it's text interview? 
      // let's just pass all scores from res if we fetch them properly
      setSubmitted(true);
      onCandidateUpdate({ assessment_status: "submitted", score_global: res.scoreGlobal, score_tests: res.scoreTests });
    }
    setSubmitting(false);
  }

  // ─── Submitted / Disqualified / Results view ─────────────────────────────────────────────
  if (submitted || qualifyingStatus === "disqualified" || candidate.assessment_status === "disqualified") {
    const finalCandidate = finalScores ? { ...candidate, ...finalScores, assessment_status: "submitted" } : { ...candidate, assessment_status: "submitted" };
    return <ResultsView candidate={finalCandidate} job={job} recruiter={recruiter} testSessions={testSessions} />;
  }

  // ─── Qualifying Questions ─────────────────────────────────────────────────
  if (modules.qualifying && qualifyingStatus === "pending") {
    return (
      <QualifyingQuestionsModule
        candidate={candidate}
        job={job}
        recruiter={recruiter}
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
  if (activeModule === "cv" && cvStatus !== "completed") {
    return (
      <CvUploadModule
        candidate={candidate}
        job={job}
        recruiter={recruiter}
        onComplete={() => { setCvStatus("completed"); setActiveModule(null); }}
        onBack={() => setActiveModule(null)}
      />
    );
  }
  // ─── Active module view (Tests) ──────────────────────────────────────────
  const activeTestConfig = selectedTests.find(t => t.test_id === activeModule);
  if (activeTestConfig) {
    return (
      <FullscreenGuard onCheat={handleCheat} candidateId={candidate.id}>
        <SkillsTestModule
          candidate={candidate}
          job={job}
          recruiter={recruiter}
          testId={activeTestConfig.test_id}
          testConfig={activeTestConfig}
          testSessions={testSessions}
          onComplete={() => { loadTestSessions(); setActiveModule(null); }}
          onBack={() => { loadTestSessions(); setActiveModule(null); }}
        />
      </FullscreenGuard>
    );
  }
  if (activeModule === "interview" && interviewStatus !== "completed") {
    return (
      <FullscreenGuard onCheat={handleCheat} candidateId={candidate.id}>
        <InterviewModule
          candidate={candidate}
          job={job}
          recruiter={recruiter}
          onComplete={() => { setInterviewStatus("completed"); setActiveModule(null); }}
          onBack={() => setActiveModule(null)}
        />
      </FullscreenGuard>
    );
  }
  if (activeModule === "video" && videoStatus !== "completed") {
    return (
      <VideoInterviewModule
        candidate={candidate}
        job={job}
        recruiter={recruiter}
        onComplete={() => { setVideoStatus("completed"); setActiveModule(null); }}
        onBack={() => setActiveModule(null)}
      />
    );
  }

  // ─── Hub view ─────────────────────────────────────────────────────────────
  const companyName = recruiter?.company_name || job?.extracted_criteria?.company_name || "L'entreprise";
  const jobTitle = job?.title || "ce poste";
  
  const welcomeNode = job?.saved_flow_nodes?.find(n => n.type === 'accueil');
  const welcomeMessage = welcomeNode?.config?.text || `Bonjour ${candidate.first_name} !\nComplétez chaque module ci-dessous pour nous permettre d'évaluer votre candidature.`;
  
  const primaryColor = recruiter?.brand_primary_color || "var(--primary)";

  // Calculate Progress
  const total = (modules.cv ? 1 : 0) + (modules.interview ? 1 : 0) + (modules.video ? 1 : 0) + selectedTests.length;
  
  let done = 0;
  if (modules.cv && cvStatus === "completed") done++;
  if (modules.interview && interviewStatus === "completed") done++;
  if (modules.video && videoStatus === "completed") done++;
  done += selectedTests.filter(t => testSessions.find(s => s.test_id === t.test_id && s.status === "completed")).length;
  
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.5rem", position: "relative", paddingTop: "8rem" }}>
      {/* Top Header: Logo + Progress (Mobile: Stacked, Desktop: Flex-between) */}
      <div style={{ 
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex", 
        flexWrap: "wrap", 
        gap: "1.5rem", 
        justifyContent: "space-between", 
        alignItems: "flex-start", 
        padding: "2rem 2.5rem",
        zIndex: 10,
        boxSizing: "border-box"
      }}>
        {recruiter?.company_logo_url ? (
          <img src={recruiter.company_logo_url} alt={companyName} style={{ height: "32px", objectFit: "contain" }} />
        ) : (
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--foreground)" }}>{companyName}</h1>
        )}

        <div style={{ 
          background: "white", 
          border: "1px solid var(--border)", 
          borderRadius: "20px", 
          padding: "0.5rem 1.25rem", 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          gap: "0.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Progression</span>
          <div style={{ width: "64px", height: "6px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: primaryColor, transition: "width 0.5s ease" }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1300px", margin: "0 auto" }}>

        {/* Welcome Section */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "1rem" }}>
            {jobTitle}
          </h2>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.6", whiteSpace: "pre-wrap", maxWidth: "600px", margin: "0 auto" }}>
            {welcomeMessage.replace("{first_name}", candidate.first_name)}
          </p>
        </div>

        {/* Module Cards Grid */}
        <div style={{ 
          display: "flex", 
          flexWrap: "wrap", 
          gap: "1.5rem", 
          marginBottom: "4rem",
          justifyContent: "center"
        }}>
          {modules.cv && (
            <ModuleCard
              title="Curriculum Vitae"
              description="Import de CV PDF"
              duration="~2 min"
              status={cvStatus}
              primaryColor={primaryColor}
              onOpen={() => setActiveModule("cv")}
            />
          )}

          {selectedTests.map((test, index) => {
            const session = testSessions.find(s => s.test_id === test.test_id);
            const isCompleted = session?.status === "completed";
            const isInProgress = session?.status === "in_progress";
            const statusStr = isCompleted ? "completed" : isInProgress ? "in_progress" : "pending";
            const Icon = getTestIcon(test.test_name);
            const questionCount = test.selected_question_ids?.length || 0;

            return (
              <ModuleCard
                key={test.test_id}
                title={test.test_name || `Test ${index + 1}`}
                description="Test de compétences"
                duration={`~${questionCount} min`}
                status={loadingSessions ? "loading" : statusStr}
                primaryColor={primaryColor}
                onOpen={() => setActiveModule(test.test_id)}
                Icon={Icon}
              />
            );
          })}

          {modules.interview && (
            <ModuleCard
              title="Entretien IA"
              description="Échange avec l'IA"
              duration="~10-15 min"
              status={interviewStatus}
              primaryColor={primaryColor}
              onOpen={() => setActiveModule("interview")}
            />
          )}

          {modules.video && (
            <ModuleCard
              title="Entretien Vidéo"
              description="Réponses enregistrées"
              duration={`~${(modules.videoConfig?.questions?.length || 3) * 3} min`}
              status={videoStatus}
              primaryColor={primaryColor}
              onOpen={() => setActiveModule("video")}
            />
          )}
        </div>

        {/* Submit button */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <button
            onClick={handleSubmit}
            disabled={!allModulesComplete || submitting}
            className="btn-hover-effect"
            style={{
              padding: "1rem 3rem", 
              borderRadius: "100px",
              background: allModulesComplete ? primaryColor : "var(--secondary)",
              color: allModulesComplete ? "white" : "var(--muted-foreground)",
              border: "none", 
              cursor: allModulesComplete ? "pointer" : "not-allowed",
              fontSize: "15px", 
              fontWeight: "700", 
              display: "flex", 
              alignItems: "center",
              justifyContent: "center", 
              gap: "10px", 
              transition: "all 200ms",
              boxShadow: allModulesComplete ? `0 4px 14px ${primaryColor}40` : "none",
            }}
          >
            {submitting ? (
              <><Loader2 size={18} className="spin" /> Soumission...</>
            ) : (
              "Soumettre"
            )}
          </button>
        </div>
        
        {!allModulesComplete && (
          <p style={{ textAlign: "center", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "1rem" }}>
            Tous les modules doivent être complétés avant la soumission.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Module Card ─────────────────────────────────────────────────────────────
function ModuleCard({ title, description, duration, status, primaryColor, onOpen, Icon }) {
  const isCompleted = status === "completed";
  const isLoading = status === "loading";
  
  const statusConfig = {
    pending:     { label: "À compléter",   bg: "var(--secondary)",  color: "var(--muted-foreground)" },
    in_progress: { label: "En cours",      bg: `${primaryColor}20`, color: primaryColor },
    completed:   { label: "Complété",      bg: "#dcfce7",           color: "#166534" },
    loading:     { label: "Chargement...", bg: "var(--secondary)",  color: "var(--muted-foreground)" },
  }[status] || { label: status, bg: "var(--secondary)", color: "var(--muted-foreground)" };

  return (
    <div
      onClick={!isCompleted && !isLoading ? onOpen : undefined}
      style={{
        width: "300px",
        background: "white", 
        border: `2px solid ${status === "in_progress" ? primaryColor : "var(--border)"}`,
        borderRadius: "16px", 
        overflow: "hidden",
        cursor: isCompleted || isLoading ? "default" : "pointer",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)", 
        opacity: isLoading ? 0.6 : 1,
        display: "flex", 
        flexDirection: "column",
        boxShadow: "0 2px 10px rgba(0,0,0,0.02)",
        position: "relative"
      }}
      onMouseEnter={(e) => { 
        if (!isCompleted && !isLoading) {
          e.currentTarget.style.borderColor = primaryColor;
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
        }
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.borderColor = status === "in_progress" ? primaryColor : "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.02)";
      }}
    >
      {/* Top Gradient Visual */}
      <div style={{ height: "160px", background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}60)`, margin: "8px 8px 0 8px", borderRadius: "8px", width: "calc(100% - 16px)" }} />

      {/* Content */}
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "4px" }}>{title}</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>{description}</p>
        
        <span style={{
          fontSize: "10px", fontWeight: "700", padding: "4px 10px", borderRadius: "99px",
          background: statusConfig.bg, color: statusConfig.color, marginBottom: "0.75rem",
          textTransform: "uppercase", letterSpacing: "0.05em"
        }}>
          {statusConfig.label}
        </span>
        
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1.5rem" }}>
          <Clock size={14} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", fontWeight: "500" }}>{duration}</span>
        </div>
        
        {/* Action Button */}
        {isCompleted ? (
          <div style={{ 
            width: "40px", height: "40px", borderRadius: "50%", background: primaryColor, 
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s"
          }}>
            <CheckCircle2 size={20} style={{ color: "white" }} />
          </div>
        ) : (
          <div style={{ 
            width: "80px", height: "40px", borderRadius: "100px", background: primaryColor, 
            display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s"
          }}>
            <ArrowRight size={20} style={{ color: "white" }} />
          </div>
        )}
      </div>
    </div>
  );
}
