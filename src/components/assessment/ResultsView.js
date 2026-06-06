"use client";

import { CheckCircle2, Trophy, Brain, FileText, MessageSquare, Star } from "lucide-react";

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534", label: "Excellent" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e", label: "Bien" };
  return { bg: "#fee2e2", color: "#991b1b", label: "À améliorer" };
}

export default function ResultsView({ candidate, job, testSessions, showScores = false }) {
  const modules = job?.assessment_config?.modules || {};
  const aiConfig = job?.ai_interview_config || {};

  const cvEnabled = modules.cv_scoring?.enabled ?? true;
  const testsEnabled = modules.skills_tests?.enabled ?? false;
  const interviewEnabled = modules.ai_interview?.enabled ?? aiConfig?.enabled ?? false;

  const globalScore = candidate.score_global;
  const globalStyle = globalScore != null ? getScoreColor(globalScore) : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--foreground)", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
            Assessment soumis !
          </h1>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
            Merci {candidate.first_name} ! Votre candidature a bien été reçue.<br />
            L'équipe recrutement vous recontactera prochainement.
          </p>
        </div>

        {/* Global score */}
        {showScores && globalStyle && (
          <div style={{
            background: globalStyle.bg, border: `1px solid ${globalStyle.color}30`,
            borderRadius: "var(--radius)", padding: "1.5rem", textAlign: "center", marginBottom: "1.5rem"
          }}>
            <p style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: globalStyle.color, marginBottom: "0.5rem" }}>
              Score global
            </p>
            <div style={{ fontSize: "3.5rem", fontWeight: "900", color: globalStyle.color, lineHeight: 1, marginBottom: "0.5rem" }}>
              {globalScore}
              <span style={{ fontSize: "1.5rem", fontWeight: "600" }}>/100</span>
            </div>
            <span style={{ fontSize: "14px", fontWeight: "700", color: globalStyle.color }}>{globalStyle.label}</span>
          </div>
        )}

        {/* Module scores */}
        {showScores && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "0.25rem" }}>
              Résultats par module
            </h2>

            {cvEnabled && candidate.score_cv != null && (
              <ScoreRow
                icon={<FileText size={16} />}
                label="Scoring CV"
                score={candidate.score_cv}
                feedback={candidate.cv_feedback}
              />
            )}

            {testsEnabled && candidate.score_tests != null && (
              <ScoreRow
                icon={<Brain size={16} />}
                label="Tests de compétences"
                score={candidate.score_tests}
                detail={testSessions?.filter((s) => s.status === "completed").map((s) => ({
                  label: s.assessment_tests?.name || "Test",
                  score: s.score,
                }))}
              />
            )}

            {interviewEnabled && candidate.score_interview != null && (
              <ScoreRow
                icon={<MessageSquare size={16} />}
                label="Entretien"
                score={candidate.score_interview}
                feedback={candidate.interview_summary}
              />
            )}
          </div>
        )}

        {/* What's next */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
            <Star size={16} style={{ color: "var(--primary)" }} />
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" }}>Et maintenant ?</h3>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[
              "L'équipe recrutement analyse votre profil.",
              "Vous recevrez un retour par email dans les prochains jours.",
              "En cas de sélection, vous serez invité(e) à un entretien.",
            ].map((step, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", color: "var(--foreground)" }}>
                <span style={{
                  width: "20px", height: "20px", borderRadius: "50%", background: "var(--primary)", color: "white",
                  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0, marginTop: "1px"
                }}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}

function ScoreRow({ icon, label, score, feedback, detail }) {
  const s = getScoreColor(score);
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem 1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: feedback || detail ? "0.75rem" : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "var(--primary)" }}>{icon}</span>
          <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)" }}>{label}</span>
        </div>
        <span style={{
          fontSize: "15px", fontWeight: "800", padding: "3px 12px", borderRadius: "99px",
          background: s.bg, color: s.color,
        }}>
          {score}/100
        </span>
      </div>
      {detail && detail.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {detail.map((d, i) => (
            <span key={i} style={{
              fontSize: "12px", padding: "2px 10px", borderRadius: "99px",
              background: "var(--secondary)", color: "var(--muted-foreground)"
            }}>
              {d.label} : {d.score}/100
            </span>
          ))}
        </div>
      )}
      {feedback && (
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6", fontStyle: "italic" }}>
          "{feedback}"
        </p>
      )}
    </div>
  );
}
