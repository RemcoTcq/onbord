"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, Trash2, Mail,
  Loader2, AlertTriangle, TrendingUp, Shield, Flag,
  User, MapPin, Briefcase, GraduationCap, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import {
  getCandidateDetail, updateCandidateStatus, deleteCandidate, getMailLogs
} from "@/lib/actions/candidate";
import EmailModal from "@/components/candidates/EmailModal";
import { createClient } from "@/lib/supabase/client";
import { Clock } from "lucide-react";

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534", label: "Excellent" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e", label: "Moyen" };
  return { bg: "#fee2e2", color: "#991b1b", label: "Faible" };
}

function getStatusBadge(status) {
  const map = {
    imported: { label: "Importé", className: "badge-muted" },
    scored: { label: "CV évalué", className: "badge-outline" },
    shortlisted: { label: "Validé", className: "badge-success" },
    rejected: { label: "Rejeté", className: "badge-destructive" },
    invited: { label: "Invité", className: "badge-primary" },
    interview_started: { label: "Entretien en cours", className: "badge-warning" },
    interview_completed: { label: "Entretien terminé", className: "badge-success" },
  };
  return map[status] || { label: status, className: "badge-muted" };
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id: jobId, candidatId } = params;

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [mailLogs, setMailLogs] = useState([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadCandidate();
  }, [candidatId]);

  async function loadCandidate() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);

    const [candRes, logsRes] = await Promise.all([
      getCandidateDetail(candidatId),
      getMailLogs(jobId)
    ]);

    if (candRes.success) {
      setCandidate(candRes.candidate);
    }
    if (logsRes.success) {
      setMailLogs(logsRes.logs.filter(l => l.candidate_id === candidatId));
    }
    setLoading(false);
  }

  async function handleStatusChange(status) {
    setActionLoading(true);
    const res = await updateCandidateStatus(candidatId, status);
    if (res.success) {
      setCandidate(prev => ({ ...prev, status }));
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce candidat ?")) return;
    setActionLoading(true);
    const res = await deleteCandidate(candidatId);
    if (res.success) {
      router.push(`/demandes/${jobId}`);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} className="spin" style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2>Candidat introuvable</h2>
        <button className="btn btn-primary" onClick={() => router.push(`/demandes/${jobId}`)}>Retour</button>
      </div>
    );
  }

  const scoreStyle = candidate.score_cv ? getScoreColor(candidate.score_cv) : null;
  const interviewScoreStyle = candidate.score_interview ? getScoreColor(candidate.score_interview) : null;
  const globalScoreStyle = candidate.score_global ? getScoreColor(candidate.score_global) : null;
  const statusBadge = getStatusBadge(candidate.status);
  const initials = `${(candidate.first_name || "?")[0]}${(candidate.last_name || "?")[0]}`.toUpperCase();
  const jobCriteria = candidate.jobs?.extracted_criteria || {};

  return (
    <div className="fade-in" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Back button */}
      <button
        className="btn btn-ghost"
        onClick={() => router.push(`/demandes/${jobId}`)}
        style={{ marginBottom: "1.5rem" }}
      >
        <ArrowLeft size={18} /> Retour à la liste
      </button>

      {/* Header Card */}
      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: "var(--primary)", color: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", fontWeight: "700", flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--foreground)", marginBottom: "4px" }}>
                {candidate.first_name} {candidate.last_name}
              </h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "8px" }}>
                {candidate.email || "Pas d'email renseigné"}
              </p>
              <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
            </div>
          </div>

          {/* Score Circles */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            {scoreStyle && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: scoreStyle.bg, color: scoreStyle.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: "800", flexShrink: 0
                }}>
                  {candidate.score_cv}
                </div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted-foreground)", marginTop: "4px" }}>CV</p>
              </div>
            )}
            {interviewScoreStyle && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: interviewScoreStyle.bg, color: interviewScoreStyle.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px", fontWeight: "800", flexShrink: 0
                }}>
                  {candidate.score_interview}
                </div>
                <p style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted-foreground)", marginTop: "4px" }}>Interview</p>
              </div>
            )}
            {globalScoreStyle && (
              <div style={{ textAlign: "center" }}>
                <div style={{
                  width: "80px", height: "80px", borderRadius: "50%",
                  background: globalScoreStyle.bg, color: globalScoreStyle.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "24px", fontWeight: "800", flexShrink: 0,
                  border: `3px solid ${globalScoreStyle.color}`
                }}>
                  {candidate.score_global}
                </div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: globalScoreStyle.color, marginTop: "4px" }}>Global</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
          {candidate.status === "shortlisted" && !candidate.score_interview && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleStatusChange("invited")}
              disabled={actionLoading}
            >
              <Mail size={16} /> Inviter à l'entretien IA
            </button>
          )}
          {candidate.status === "interview_completed" && (
            <button
              className="btn btn-sm"
              style={{ background: "#dcfce7", color: "#166534", border: "none" }}
              onClick={() => handleStatusChange("shortlisted")}
              disabled={actionLoading}
            >
              <CheckCircle2 size={16} /> Valider définitivement
            </button>
          )}
          {candidate.status !== "shortlisted" && candidate.status !== "interview_completed" && candidate.status !== "rejected" && (
            <button
              className="btn btn-sm"
              style={{ background: "#dcfce7", color: "#166534", border: "none" }}
              onClick={() => handleStatusChange("shortlisted")}
              disabled={actionLoading}
            >
              <CheckCircle2 size={16} /> Valider ce candidat
            </button>
          )}
          {candidate.status !== "rejected" && (
            <button
              className="btn btn-sm"
              style={{ background: "#fef3c7", color: "#92400e", border: "none" }}
              onClick={() => handleStatusChange("rejected")}
              disabled={actionLoading}
            >
              <XCircle size={16} /> Rejeter
            </button>
          )}
          <button
            className="btn btn-sm btn-outline"
            onClick={() => setEmailModalOpen(true)}
            disabled={actionLoading}
            style={{ color: "var(--primary)" }}
          >
            <Mail size={16} /> Générer un mail
          </button>
          <button
            className="btn btn-sm"
            style={{ background: "#fee2e2", color: "#991b1b", border: "none", marginLeft: "auto" }}
            onClick={handleDelete}
            disabled={actionLoading}
          >
            <Trash2 size={16} /> Supprimer
          </button>
          {actionLoading && <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />}
        </div>
      </div>

      {/* CV Analysis Summary */}
      {candidate.ai_summary && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={18} /> Analyse du CV
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--foreground)" }}>
            {candidate.ai_summary}
          </p>
        </div>
      )}

      {/* Interview Results */}
      {candidate.interview_summary && (
        <div className="card" style={{ marginBottom: "1.5rem", borderLeft: "4px solid var(--primary)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <MessageSquare size={18} /> Résultat de l'entretien IA
            {candidate.interview_recommendation && (
              <span className={`badge ${
                candidate.interview_recommendation === "hire" ? "badge-success" :
                candidate.interview_recommendation === "maybe" ? "badge-warning" : "badge-destructive"
              }`} style={{ marginLeft: "auto" }}>
                {candidate.interview_recommendation === "hire" ? "À recruter" :
                 candidate.interview_recommendation === "maybe" ? "À considérer" : "Pas recommandé"}
              </span>
            )}
          </h2>
          <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--foreground)", marginBottom: "1.5rem" }}>
            {candidate.interview_summary}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
            {candidate.interview_strengths && candidate.interview_strengths.length > 0 && (
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#166534", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckCircle2 size={14} /> Points forts en entretien
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {candidate.interview_strengths.map((s, i) => (
                    <div key={i} className="flag flag-green">
                      <CheckCircle2 size={14} style={{ color: "#166534", marginTop: "2px", flexShrink: 0 }} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {candidate.interview_weaknesses && candidate.interview_weaknesses.length > 0 && (
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#991b1b", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <XCircle size={14} /> Points faibles en entretien
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {candidate.interview_weaknesses.map((w, i) => (
                    <div key={i} className="flag flag-red">
                      <XCircle size={14} style={{ color: "#991b1b", marginTop: "2px", flexShrink: 0 }} />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {candidate.interview_messages && candidate.interview_messages.length > 0 && (
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <button 
                className="btn btn-ghost" 
                style={{ width: "100%", justifyContent: "space-between", fontSize: "14px", fontWeight: "600" }}
                onClick={() => setShowTranscript(!showTranscript)}
              >
                <span>Afficher la transcription complète</span>
                {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showTranscript && (
                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "1rem", borderRadius: "var(--radius)", maxHeight: "400px", overflowY: "auto" }}>
                  {candidate.interview_messages.map((msg, i) => (
                    <div key={i} style={{ 
                      alignSelf: msg.role === "assistant" ? "flex-start" : "flex-end",
                      background: msg.role === "assistant" ? "white" : "var(--primary)",
                      color: msg.role === "assistant" ? "var(--foreground)" : "white",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                      maxWidth: "85%",
                      fontSize: "13px",
                      lineHeight: "1.5"
                    }}>
                      <div style={{ fontSize: "11px", fontWeight: "600", marginBottom: "4px", opacity: 0.8 }}>
                        {msg.role === "assistant" ? "Alex (IA)" : candidate.first_name}
                      </div>
                      {msg.content.replace("[INTERVIEW_TERMINÉE]", "").trim()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Flags Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Green Flags */}
        {candidate.green_flags && candidate.green_flags.length > 0 && (
          <div className="card" style={{ borderLeft: "4px solid var(--success)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#166534", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} /> Points forts ({candidate.green_flags.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {candidate.green_flags.map((flag, i) => (
                <div key={i} className="flag flag-green">
                  <CheckCircle2 size={14} style={{ color: "#166534", marginTop: "2px", flexShrink: 0 }} />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yellow Flags */}
        {candidate.yellow_flags && candidate.yellow_flags.length > 0 && (
          <div className="card" style={{ borderLeft: "4px solid var(--warning)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#92400e", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertTriangle size={16} /> Points d'attention ({candidate.yellow_flags.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {candidate.yellow_flags.map((flag, i) => (
                <div key={i} className="flag flag-yellow">
                  <AlertTriangle size={14} style={{ color: "#92400e", marginTop: "2px", flexShrink: 0 }} />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags */}
        {candidate.red_flags && candidate.red_flags.length > 0 && (
          <div className="card" style={{ borderLeft: "4px solid var(--destructive)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#991b1b", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <XCircle size={16} /> Critères éliminatoires ({candidate.red_flags.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {candidate.red_flags.map((flag, i) => (
                <div key={i} className="flag flag-red">
                  <XCircle size={14} style={{ color: "#991b1b", marginTop: "2px", flexShrink: 0 }} />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mail History */}
      {mailLogs.length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} /> Historique des communications
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {mailLogs.map(log => {
              const config = {
                interview_invitation: { label: "Invitation interview IA", bg: "#e0e7ff", color: "#4338ca" },
                selected: { label: "Candidat sélectionné", bg: "#dcfce7", color: "#166534" },
                rejected: { label: "Candidat refusé", bg: "#fee2e2", color: "#991b1b" }
              }[log.mail_type] || { label: log.mail_type, bg: "#f3f4f6", color: "#374151" };
              
              return (
                <div key={log.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ padding: "6px", borderRadius: "8px", background: config.bg, color: config.color, display: "flex" }}>
                      <Mail size={14} />
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: "600" }}>{config.label}</span>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    le {new Date(log.sent_at).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job Criteria Comparison */}
      {jobCriteria && Object.keys(jobCriteria).length > 0 && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--foreground)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
            <Shield size={18} /> Critères de l'offre
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <h4 style={{ fontSize: "13px", textTransform: "uppercase", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                <Briefcase size={14} style={{ marginRight: "6px" }} />Poste
              </h4>
              <p style={{ fontSize: "14px", fontWeight: "500" }}>{jobCriteria.title || "—"}</p>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{jobCriteria.category || ""}</p>
            </div>
            <div>
              <h4 style={{ fontSize: "13px", textTransform: "uppercase", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                <MapPin size={14} style={{ marginRight: "6px" }} />Localisation
              </h4>
              <p style={{ fontSize: "14px", fontWeight: "500" }}>{jobCriteria.location || "—"}</p>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{jobCriteria.work_mode || ""}</p>
            </div>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <h4 style={{ fontSize: "13px", textTransform: "uppercase", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
              Compétences requises
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {jobCriteria.hard_skills?.map(s => (
                <span key={s.name} className={`badge ${s.priority === "must_have" ? "badge-primary" : "badge-outline"}`}>
                  {s.name}
                </span>
              ))}
              {jobCriteria.soft_skills?.map(s => (
                <span key={s.name} className={`badge ${s.priority === "must_have" ? "badge-primary" : "badge-outline"}`}>
                  {s.name}
                </span>
              ))}
              {(!jobCriteria.hard_skills?.length && !jobCriteria.soft_skills?.length) && (
                <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Non spécifié</span>
              )}
            </div>
          </div>
        </div>
      )}
      {emailModalOpen && candidate && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          candidate={candidate}
          job={candidate.jobs}
          currentUser={currentUser}
          existingLogs={mailLogs}
          onLogged={() => getMailLogs(jobId).then(res => res.success && setMailLogs(res.logs.filter(l => l.candidate_id === candidatId)))}
        />
      )}
    </div>
  );
}
