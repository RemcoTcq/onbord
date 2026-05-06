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
import { Clock, Download, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
  const [downloading, setDownloading] = useState(false);

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

  async function downloadScorecard() {
    setDownloading(true);
    const element = document.getElementById("scorecard-template");
    const originalStyle = element.style.display;
    element.style.display = "block";

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = 35; // Initial Y after header
    let pageNum = 1;

    const addHeaderAndFooter = async (doc, page, headerImg, headerRatio) => {
      // Header from captured block
      if (headerImg) {
        const headerWidth = pageWidth - (margin * 2);
        const headerHeight = headerWidth * headerRatio;
        doc.addImage(headerImg, "PNG", margin, 4, headerWidth, headerHeight);
      }
      
      // Separator line (Moved up)
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 20, pageWidth - margin, 20);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Onbord - Rapport d'évaluation intelligent par IA", pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text(`Page ${page}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    };

    const addBlockToPdf = async (blockId) => {
      const block = document.getElementById(blockId);
      if (!block) return;

      const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if block fits on current page
      if (currentY + imgHeight > pageHeight - 20) {
        pdf.addPage();
        pageNum++;
        await addHeaderAndFooter(pdf, pageNum, headerImgData, headerImgRatio);
        currentY = 26;
      }

      pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10; // 10mm spacing between blocks
    };

    let headerImgData = null;
    let headerImgRatio = 0;
    try {
      // Capture header once
      const headerBlock = document.getElementById("sc-block-header");
      const headerCanvas = await html2canvas(headerBlock, { scale: 2, backgroundColor: "#ffffff" });
      headerImgData = headerCanvas.toDataURL("image/png");
      headerImgRatio = headerCanvas.height / headerCanvas.width;

      await addHeaderAndFooter(pdf, pageNum, headerImgData, headerImgRatio);
      
      currentY = 26; // Start content higher

      // Add blocks sequentially
      await addBlockToPdf("sc-block-profile");
      await addBlockToPdf("sc-block-scores");
      await addBlockToPdf("sc-block-summary");
      await addBlockToPdf("sc-block-interview");
      await addBlockToPdf("sc-block-flags");

      pdf.save(`Onbord_Scorecard_${candidate.first_name}_${candidate.last_name}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      element.style.display = originalStyle;
      setDownloading(false);
    }
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

  // Logo SVG in Base64 for PDF
  const logoSvg = `data:image/svg+xml;base64,${btoa(`<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg xmlns="http://www.w3.org/2000/svg" version="1.2" viewBox="0 0 370 617"><path fill="#07294b" d="m0 1h150c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150-82.84 0-150-67.16-150-150z"/><path fill="#07294b" d="m0 501c0-102.17 82.83-185 185-185h35c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150h-220z"/></svg>`)}`;

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
            className="btn btn-sm btn-outline"
            onClick={downloadScorecard}
            disabled={downloading || actionLoading}
            style={{ color: "var(--primary)" }}
          >
            {downloading ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
            Scorecard PDF
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
      
      {/* Hidden Scorecard Template for PDF Export */}
      <div 
        id="scorecard-template" 
        style={{ 
          display: "none", 
          width: "210mm",
          background: "white",
          color: "#0f172a",
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Header Block (Captured separately and added to every page) */}
        <div id="sc-block-header" style={{ padding: "3mm 25mm 2mm 25mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo-onbord.svg" alt="Onbord" style={{ height: "30px", width: "auto" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 4px 0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Scorecard Officielle</p>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", margin: 0 }}>Généré le {new Date().toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Profile Block */}
        <div id="sc-block-profile" style={{ padding: "10mm 25mm 15mm 25mm" }}>
          <div style={{ display: "flex", gap: "35px", alignItems: "center" }}>
            <div style={{ 
              width: "80px", height: "80px", borderRadius: "18px", 
              background: "#07294b", color: "white", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: "32px", fontWeight: "700", flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "0 0 6px 0", color: "#0f172a" }}>{candidate.first_name} {candidate.last_name}</h1>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 10px 0" }}>{candidate.email}</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ padding: "4px 10px", borderRadius: "4px", background: "#f1f5f9", fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                  Status: {statusBadge.label}
                </div>
                {candidate.jobs?.title && (
                  <div style={{ padding: "4px 10px", borderRadius: "4px", background: "#eff6ff", fontSize: "10px", fontWeight: "800", color: "#1d4ed8", textTransform: "uppercase" }}>
                    Poste: {candidate.jobs.title}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scores Block */}
        <div id="sc-block-scores" style={{ padding: "0 25mm 15mm 25mm" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            <div style={{ padding: "15px", borderRadius: "15px", background: "#ffffff", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Adéquation CV</p>
              <div style={{ fontSize: "30px", fontWeight: "900", color: scoreStyle?.color || "#07294b" }}>{candidate.score_cv || "—"}%</div>
            </div>
            <div style={{ padding: "15px", borderRadius: "15px", background: "#ffffff", textAlign: "center", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", marginBottom: "8px", textTransform: "uppercase" }}>Performance Entretien</p>
              <div style={{ fontSize: "30px", fontWeight: "900", color: interviewScoreStyle?.color || "#07294b" }}>{candidate.score_interview || "—"}%</div>
            </div>
            <div style={{ 
              padding: "15px", borderRadius: "15px", 
              background: globalScoreStyle?.bg || "#f8fafc", 
              textAlign: "center", 
              border: `2px solid ${globalScoreStyle?.color || "#07294b"}`
            }}>
              <p style={{ fontSize: "10px", fontWeight: "900", color: globalScoreStyle?.color || "#07294b", marginBottom: "8px", textTransform: "uppercase" }}>Score Global</p>
              <div style={{ fontSize: "34px", fontWeight: "900", color: globalScoreStyle?.color || "#07294b" }}>{candidate.score_global || "—"}%</div>
            </div>
          </div>
        </div>

        {/* Summary Block */}
        {candidate.ai_summary && (
          <div id="sc-block-summary" style={{ padding: "0 25mm 12mm 25mm" }}>
            <div style={{ padding: "22px", borderRadius: "15px", border: "1px solid #f1f5f9", background: "#fafafa" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#0f172a", marginBottom: "12px", textTransform: "uppercase" }}>
                Synthèse du profil
              </h3>
              <p style={{ fontSize: "14.5px", lineHeight: "1.7", color: "#334155", margin: 0, textAlign: "justify" }}>{candidate.ai_summary}</p>
            </div>
          </div>
        )}

        {/* Interview Block */}
        {candidate.interview_summary && (
          <div id="sc-block-interview" style={{ padding: "0 25mm 12mm 25mm" }}>
            <div style={{ padding: "22px", borderRadius: "15px", background: "#f0f9ff", border: "1px solid #e0f2fe" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#0369a1", margin: 0, textTransform: "uppercase" }}>Évaluation de l'entretien IA</h3>
                <div style={{ padding: "4px 10px", borderRadius: "6px", background: "#ffffff", fontSize: "10px", fontWeight: "800", color: "#0369a1", border: "1px solid #bae6fd" }}>
                  {candidate.interview_recommendation === "hire" ? "✓ Favorable" : candidate.interview_recommendation === "maybe" ? "⚡ À considérer" : "✕ Défavorable"}
                </div>
              </div>
              <p style={{ fontSize: "14.5px", lineHeight: "1.7", color: "#0c4a6e", margin: 0, textAlign: "justify" }}>{candidate.interview_summary}</p>
            </div>
          </div>
        )}

        {/* Flags Block */}
        <div id="sc-block-flags" style={{ padding: "0 25mm 15mm 25mm" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px" }}>
            {((candidate.interview_strengths && candidate.interview_strengths.length > 0) || (candidate.green_flags && candidate.green_flags.length > 0)) && (
              <div style={{ padding: "15px", borderRadius: "15px", border: "1px solid #f0fdf4", background: "#f0fdf4" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "900", color: "#166534", marginBottom: "12px", textTransform: "uppercase" }}>Points Forts</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[...(candidate.interview_strengths || []), ...(candidate.green_flags || [])].slice(0, 8).map((s, i) => (
                    <div key={i} style={{ fontSize: "13.5px", display: "flex", gap: "8px", color: "#14532d", lineHeight: "1.4" }}>
                      <span style={{ color: "#22c55e", fontWeight: "bold" }}>•</span> {s}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {((candidate.interview_weaknesses && candidate.interview_weaknesses.length > 0) || (candidate.red_flags && candidate.red_flags.length > 0)) && (
              <div style={{ padding: "15px", borderRadius: "15px", border: "1px solid #fef2f2", background: "#fef2f2" }}>
                <h3 style={{ fontSize: "11px", fontWeight: "900", color: "#991b1b", marginBottom: "12px", textTransform: "uppercase" }}>Points de Vigilance</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[...(candidate.interview_weaknesses || []), ...(candidate.red_flags || [])].slice(0, 8).map((w, i) => (
                    <div key={i} style={{ fontSize: "13.5px", display: "flex", gap: "8px", color: "#7f1d1d", lineHeight: "1.4" }}>
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>•</span> {w}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
