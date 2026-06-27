"use client";

import { useState } from "react";
import { Brain, FileText, MessageSquare, Star, Loader2, CheckCircle2, Video } from "lucide-react";
import { saveCandidateFeedback } from "@/lib/actions/assessment";

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534", label: "Excellent" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e", label: "Bien" };
  return { bg: "#fee2e2", color: "#991b1b", label: "À améliorer" };
}

export default function ResultsView({ candidate, job, recruiter, testSessions, showScores = false, feedback, status, showRating = true }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const modules = job?.assessment_config?.modules || {};
  const aiConfig = job?.ai_interview_config || {};

  const cvEnabled = modules.cv_scoring?.enabled ?? true;
  const testsEnabled = modules.skills_tests?.enabled ?? false;
  const interviewEnabled = modules.ai_interview?.enabled ?? aiConfig?.enabled ?? false;
  const videoEnabled = modules.video_interview?.enabled ?? false;

  const globalScore = candidate.score_global;
  const globalStyle = globalScore != null ? getScoreColor(globalScore) : null;

  const thankYouNode = job?.saved_flow_nodes?.find(n => n.type === 'thank_you' || n.type === 'remerciements');
  const thankYouMessage = thankYouNode?.config?.text || `Merci {first_name} ! Votre candidature a bien été reçue.\nL'équipe recrutement vous recontactera prochainement.`;

  const companyName = recruiter?.company_name || "L'entreprise";
  const primaryColor = recruiter?.brand_primary_color || "var(--primary)";
  const logoUrl = recruiter?.company_logo_url;

  const isShortlisted = status === 'shortlisted';
  const isRejected = status === 'rejected';

  // Hero content based on decision status
  let heroTitle, heroSubtitle, heroEmoji;
  if (isShortlisted) {
    heroTitle = `Bonne nouvelle, ${candidate.first_name} !`;
    heroSubtitle = `Votre candidature pour le poste de ${job?.title || 'ce poste'} chez ${companyName} a retenu notre attention.`;
    heroEmoji = "🎉";
  } else if (isRejected) {
    heroTitle = `Merci pour votre candidature, ${candidate.first_name}`;
    heroSubtitle = `Votre candidature pour le poste de ${job?.title || 'ce poste'} chez ${companyName} a bien été étudiée avec attention.`;
    heroEmoji = null;
  } else {
    heroTitle = `Félicitations, vous venez de soumettre votre candidature`;
    heroSubtitle = thankYouMessage.replace("{first_name}", candidate.first_name);
    heroEmoji = null;
  }

  // Modules the candidate completed (for checkmark display)
  const completedModules = [
    cvEnabled && candidate.cv_raw_text && { icon: <FileText size={16} />, label: "CV analysé" },
    testsEnabled && testSessions?.some(s => s.status === 'completed') && { icon: <Brain size={16} />, label: "Tests réalisés" },
    interviewEnabled && candidate.score_interview != null && { icon: <MessageSquare size={16} />, label: "Entretien complété" },
    videoEnabled && candidate.video_interview_score != null && { icon: <Video size={16} />, label: "Vidéo enregistrée" },
  ].filter(Boolean);

  const nextStepsShortlisted = [
    "Notre équipe prendra contact avec vous pour la suite du processus.",
    "Vous serez invité(e) à un entretien avec l'équipe.",
    "Préparez vos questions sur le poste et l'entreprise !",
  ];
  const nextStepsDefault = [
    "L'équipe analyse votre profil sur la base de vos réponses.",
    "Vous recevrez un retour par email dans les prochains jours.",
    "En cas de sélection, vous êtes invité(e) à un entretien.",
  ];

  async function handleFeedbackSubmit() {
    if (rating === 0 || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    await saveCandidateFeedback(candidate.id, rating, null);
    setIsFeedbackSubmitted(true);
    setIsSubmittingFeedback(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "2rem 1.5rem", position: "relative", paddingTop: "8rem" }}>
      {/* Header with Logo */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", padding: "2rem 2.5rem", zIndex: 10, boxSizing: "border-box"
      }}>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} style={{ height: "32px", objectFit: "contain" }} />
        ) : (
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", margin: 0, color: "var(--foreground)" }}>{companyName}</h1>
        )}
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          {heroEmoji && (
            <div style={{ fontSize: "48px", marginBottom: "1rem" }}>{heroEmoji}</div>
          )}
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
            {heroTitle}
          </h1>
          <p style={{ fontSize: "15px", color: "var(--muted-foreground)", lineHeight: "1.6", whiteSpace: "pre-wrap", maxWidth: "500px", margin: "0 auto" }}>
            {heroSubtitle}
          </p>
        </div>

        {/* Global score — recruiter view only */}
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

        {/* Module scores — recruiter view only */}
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

        {/* AI Feedback + modules complétés — candidate view, pour les candidats avec décision */}
        {!showScores && (isShortlisted || isRejected) && (
          <>
            {feedback && (
              <div style={{
                background: "white", border: "1px solid var(--border)",
                borderRadius: "16px", padding: "2rem", marginBottom: "2rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
              }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)", marginBottom: "1rem" }}>
                  Retour sur votre candidature
                </h3>
                <p style={{ fontSize: "14px", color: "var(--foreground)", lineHeight: "1.8", margin: 0, whiteSpace: "pre-wrap" }}>
                  {feedback}
                </p>
              </div>
            )}

            {completedModules.length > 0 && (
              <div style={{
                background: "white", border: "1px solid var(--border)",
                borderRadius: "16px", padding: "1.5rem 2rem", marginBottom: "2rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
              }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                  Étapes complétées
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {completedModules.map((mod, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <CheckCircle2 size={16} style={{ color: primaryColor, flexShrink: 0 }} />
                      <span style={{ fontSize: "14px", color: "var(--foreground)" }}>{mod.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* "Et maintenant ?" — uniquement pour les candidats sans décision encore */}
        {!isShortlisted && !isRejected && (
          <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "16px", padding: "2rem", marginBottom: "2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)", marginBottom: "1.5rem" }}>Et maintenant ?</h3>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "12px", bottom: "12px", left: "12px", width: "2px", background: "var(--border)", zIndex: 1 }} />

              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative", zIndex: 2 }}>
                {(isShortlisted ? nextStepsShortlisted : nextStepsDefault).map((step, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                    <div style={{
                      width: "26px", height: "26px", borderRadius: "50%", background: primaryColor, color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0
                    }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: "14px", color: "var(--foreground)", marginTop: "3px", lineHeight: "1.5" }}>
                      {step}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Experience rating — uniquement post-soumission immédiate */}
        {showRating && <div style={{ textAlign: "center" }}>
          {isFeedbackSubmitted ? (
            <div style={{ animation: "fadeIn 0.5s ease" }}>
              <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginTop: "2rem" }}>
                Merci pour votre retour.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "1rem" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)", marginBottom: "0.5rem" }}>
                Comment s&apos;est passée votre expérience ?
              </h3>

              <div style={{ display: "flex", gap: "8px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", transition: "transform 0.1s" }}
                    onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.9)"}
                    onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                  >
                    <Star
                      size={28}
                      style={{
                        color: (hoverRating || rating) >= star ? primaryColor : "var(--border)",
                        fill: (hoverRating || rating) >= star ? primaryColor : "none",
                        transition: "all 0.2s"
                      }}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={handleFeedbackSubmit}
                disabled={rating === 0 || isSubmittingFeedback}
                style={{
                  background: rating > 0 ? primaryColor : "var(--border)",
                  color: rating > 0 ? "white" : "var(--muted-foreground)",
                  border: "none", padding: "10px 24px", borderRadius: "100px",
                  fontSize: "14px", fontWeight: "600",
                  cursor: rating > 0 ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: "8px",
                  transition: "all 0.2s", marginTop: "0.5rem"
                }}
              >
                {isSubmittingFeedback ? (
                  <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Envoi...</>
                ) : (
                  "Envoyer"
                )}
              </button>
            </div>
          )}
        </div>
        }

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
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
