"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, XCircle, Trash2, Mail,
  Loader2, AlertTriangle, TrendingUp, Shield, Flag,
  User, MapPin, Briefcase, GraduationCap, MessageSquare, ChevronDown, ChevronUp, Star,
  Download, FileDown, FileText, Clock, Sparkles, Video
} from "lucide-react";

const AI_PROFICIENCY_TEST_ID = "1dac9ae1-d8ae-4cc5-82f3-a010c6bf6f11";
const CATEGORY_LABELS = { C1: "Stratégie IA", C2: "Prompting", C3: "Esprit critique", C4: "Éthique", C5: "Workflow" };
import {
  getCandidateDetail, updateCandidateStatus, deleteCandidate, getMailLogs
} from "@/lib/actions/candidate";
import EmailModal from "@/components/candidates/EmailModal";
import { createClient } from "@/lib/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534", label: "Excellent" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e", label: "Moyen" };
  return { bg: "#fee2e2", color: "#991b1b", label: "Faible" };
}

function getStatusBadge(status) {
  const map = {
    invited:       { label: "Invité",       className: "badge-primary" },
    in_progress:   { label: "En cours",     className: "badge-warning" },
    termine:       { label: "Terminé",      className: "badge-outline" },
    soumis:        { label: "Soumis",       className: "badge-success" },
    shortlisted:   { label: "Valider",      className: "badge-success" },
    rejected:      { label: "Rejeter",      className: "badge-destructive" },
    disqualified:  { label: "Disqualifier", className: "badge-destructive" },
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
  const [openAiFeedback, setOpenAiFeedback] = useState({});


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
      router.push(`/jobs/${jobId}`);
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
    let currentY = 35;
    let pageNum = 1;

    const addHeaderAndFooter = async (doc, page, headerImg, headerRatio) => {
      if (headerImg) {
        const headerWidth = pageWidth - (margin * 2);
        const headerHeight = headerWidth * headerRatio;
        doc.addImage(headerImg, "PNG", margin, 4, headerWidth, headerHeight);
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 20, pageWidth - margin, 20);
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

      if (currentY + imgHeight > pageHeight - 20) {
        pdf.addPage();
        pageNum++;
        await addHeaderAndFooter(pdf, pageNum, headerImgData, headerImgRatio);
        currentY = 26;
      }
      pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 10;
    };

    let headerImgData = null;
    let headerImgRatio = 0;
    try {
      const headerBlock = document.getElementById("sc-block-header");
      const headerCanvas = await html2canvas(headerBlock, { scale: 2, backgroundColor: "#ffffff" });
      headerImgData = headerCanvas.toDataURL("image/png");
      headerImgRatio = headerCanvas.height / headerCanvas.width;
      await addHeaderAndFooter(pdf, pageNum, headerImgData, headerImgRatio);
      currentY = 26;
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
        <button className="btn btn-primary" onClick={() => router.push(`/jobs/${jobId}`)}>Retour</button>
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
    <div className="fade-in" style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Header / Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <button
          className="btn btn-ghost"
          onClick={() => router.push(`/jobs/${jobId}`)}
          style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "600" }}
        >
          <ArrowLeft size={18} /> Retour aux candidats
        </button>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline btn-sm" onClick={downloadScorecard} disabled={downloading}>
            {downloading ? <Loader2 size={16} className="spin" /> : <Download size={16} />} Scorecard PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEmailModalOpen(true)}>
            <Mail size={16} /> Contacter
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "2rem", alignItems: "start" }}>
        
        {/* Sidebar */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: "48px", height: "48px", borderRadius: "8px",
                background: "var(--foreground)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", fontWeight: "700"
              }}>
                {initials}
              </div>
              <div style={{ overflow: "hidden" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {candidate.first_name} {candidate.last_name}
                </h2>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {candidate.email}
                </p>
              </div>
            </div>
            {candidate.cv_url && (
              <a 
                href={candidate.cv_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
                style={{ width: "100%", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <FileText size={14} /> Voir le CV original
              </a>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>Statut</p>
                <span className={`badge ${statusBadge.className}`} style={{ fontSize: "11px" }}>{statusBadge.label}</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>Invité le</p>
                <p style={{ fontSize: "13px", fontWeight: "500" }}>{candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' }) : "—"}</p>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>Complété le</p>
                <p style={{ fontSize: "13px", fontWeight: "500" }}>{candidate.assessment_submitted_at ? new Date(candidate.assessment_submitted_at).toLocaleDateString("fr-FR", { day: 'numeric', month: 'long', year: 'numeric' }) : "En attente"}</p>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange("shortlisted")} disabled={actionLoading} style={{ width: "100%" }}>
                Valider le profil
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange("rejected")} disabled={actionLoading} style={{ width: "100%" }}>
                Rejeter
              </button>

              <button className="btn btn-ghost btn-sm" onClick={handleDelete} disabled={actionLoading} style={{ width: "100%", color: "#991b1b" }}>
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Shield size={14} /> Suivi de l'intégrité
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                <span style={{ color: "var(--muted-foreground)" }}>RGPD</span>
                <span style={{ fontWeight: "600", color: candidate.gdpr_consent_at ? "#166534" : "#991b1b" }}>{candidate.gdpr_consent_at ? "Accordé" : "Non"}</span>
              </div>
              {Array.isArray(candidate.anti_cheat_metrics) && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Sorties de fenêtre</span>
                    <span style={{ fontWeight: "600" }}>{candidate.anti_cheat_metrics.filter(e => e.type === 'window_blur' || e.type === 'tab_switch').length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>Copier-coller</span>
                    <span style={{ fontWeight: "600" }}>{candidate.anti_cheat_metrics.filter(e => e.type === 'paste').length}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {mailLogs.length > 0 && (
            <div className="card" style={{ padding: "1.25rem" }}>
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "1rem" }}>Historique mails</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {mailLogs.slice(0, 3).map(log => (
                  <div key={log.id} style={{ fontSize: "12px" }}>
                    <div style={{ fontWeight: "600" }}>{log.mail_type === 'interview_invitation' ? 'Invitation' : log.mail_type === 'selected' ? 'Validation' : 'Refus'}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>{new Date(log.sent_at).toLocaleDateString('fr-FR')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Overall Score Card */}
          <div className="card" style={{ padding: "2rem", display: "flex", alignItems: "center", gap: "3rem" }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>Score global de l'assessment</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "3.5rem", fontWeight: "800", color: globalScoreStyle?.color || "var(--foreground)", letterSpacing: "-0.04em" }}>
                  {candidate.score_global || "—"}
                </span>
                <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--muted-foreground)" }}>%</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                Moyenne pondérée basée sur les critères de sélection.
              </p>
            </div>

            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: scoreStyle?.color || "var(--muted-foreground)" }}>{candidate.score_cv || "—"}%</div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>CV</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: candidate.score_tests ? getScoreColor(candidate.score_tests).color : "var(--muted-foreground)" }}>{candidate.score_tests || "—"}%</div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Tests</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: "800", color: interviewScoreStyle?.color || "var(--muted-foreground)" }}>{candidate.score_interview || "—"}%</div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Int. Texte</div>
              </div>
              {candidate.video_responses && candidate.video_responses.length > 0 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: candidate.video_interview_score != null ? getScoreColor(candidate.video_interview_score).color : "var(--muted-foreground)" }}>{candidate.video_interview_score || "—"}%</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Int. Vidéo</div>
                </div>
              )}
            </div>
          </div>

          {/* CV Analysis Module */}
          {candidate.ai_summary && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FileText size={18} style={{ color: "var(--primary)" }} /> Analyse du CV
                </h3>
              </div>
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--foreground)", marginBottom: "1.5rem" }}>{candidate.ai_summary}</p>
              
              {/* Score Breakdown per Criterion */}
              {candidate.cv_score_breakdown && candidate.cv_score_breakdown.length > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>Détail par critère</h4>
                  {candidate.cv_score_breakdown.map((item, idx) => {
                    const skillFromJob = [...(jobCriteria.hard_skills || []), ...(jobCriteria.soft_skills || [])].find(s => s.name === item.name);
                    return (
                      <div key={idx} style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600' }}>
                            {item.name}
                            {skillFromJob && skillFromJob.taxonomy_id && (
                              <span style={{ fontSize: '10px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }} title="ID Taxonomie">
                                {skillFromJob.taxonomy_id}
                              </span>
                            )}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: getScoreColor(item.score).color }}>{item.score}%</span>
                        </div>
                        {skillFromJob && skillFromJob.evidence && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, fontStyle: 'italic', marginBottom: '6px' }}>
                            Attente : "{skillFromJob.evidence}"
                          </div>
                        )}
                        {item.reason && <p style={{ fontSize: '12px', color: 'var(--muted-foreground)', lineHeight: '1.4' }}>{item.reason}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                {candidate.green_flags?.length > 0 && (
                  <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #dcfce7" }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>Points forts</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {candidate.green_flags.map((f, i) => <div key={i} style={{ fontSize: "12px", color: "#166534" }}>• {f}</div>)}
                    </div>
                  </div>
                )}
                {candidate.red_flags?.length > 0 && (
                  <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", marginBottom: "8px" }}>Points d'attention</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {candidate.red_flags.map((f, i) => <div key={i} style={{ fontSize: "12px", color: "#991b1b" }}>• {f}</div>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tests de compétences */}
          {candidate.test_sessions && candidate.test_sessions.length > 0 && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
                <TrendingUp size={18} style={{ color: "var(--primary)" }} /> Tests de compétences
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {candidate.test_sessions.map((session) => {
                  const sStyle = session.score != null ? getScoreColor(session.score) : { bg: "#f3f4f6", color: "#64748b" };
                  const isAiTest = session.test_id === AI_PROFICIENCY_TEST_ID;
                  const hasFeedback = isAiTest && session.ai_feedback?.evaluations?.length > 0;
                  const feedbackOpen = openAiFeedback[session.id];
                  return (
                    <div key={session.id}>
                      <div style={{
                        padding: "1rem", background: "white", border: `1px solid ${isAiTest ? "#e0e7ff" : "var(--border)"}`,
                        borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between",
                        background: isAiTest ? "#fafafe" : "white",
                      }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                            {isAiTest && <Sparkles size={14} style={{ color: "#6366f1" }} />}
                            {session.assessment_tests?.name}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--muted-foreground)", textTransform: "capitalize" }}>
                            {session.assessment_tests?.category} • {session.completed_at ? `Fini le ${new Date(session.completed_at).toLocaleDateString()}` : 'En attente'}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          {hasFeedback && (
                            <button
                              onClick={() => setOpenAiFeedback(prev => ({ ...prev, [session.id]: !feedbackOpen }))}
                              style={{
                                fontSize: "11px", fontWeight: "700", padding: "5px 12px", borderRadius: "99px",
                                background: feedbackOpen ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#ede9fe",
                                color: feedbackOpen ? "white" : "#6366f1",
                                border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px",
                              }}
                            >
                              <Sparkles size={11} /> Analyse IA
                            </button>
                          )}
                          {!isAiTest && session.cheat_flags?.slow_candidate && (
                            <div style={{ background: "#fff7ed", color: "#c2410c", fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "4px", border: "1px solid #ffedd5", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} /> Plus lent que la moyenne
                            </div>
                          )}
                          {!isAiTest && session.cheat_flags?.top_performer && (
                            <div style={{ background: "#f5f5f5", color: "#0a0a0a", fontSize: "10px", fontWeight: "700", padding: "4px 8px", borderRadius: "4px", border: "1px solid #e5e5e5", display: "flex", alignItems: "center", gap: "4px" }}>
                              <Star size={12} fill="currentColor" /> Top Performer
                            </div>
                          )}
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1.25rem", fontWeight: "800", color: sStyle.color }}>{session.score != null ? `${session.score}%` : "—"}</div>
                            <div style={{ width: "100px", height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden", marginTop: "4px" }}>
                              <div style={{ width: `${session.score || 0}%`, height: "100%", background: isAiTest ? "#6366f1" : sStyle.color }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Feedback panel */}
                      {hasFeedback && feedbackOpen && (
                        <div style={{
                          marginTop: "4px", padding: "1.25rem",
                          background: "#fafafe", border: "1px solid #e0e7ff",
                          borderRadius: "10px",
                        }}>
                          <p style={{ fontSize: "11px", fontWeight: "700", color: "#6366f1", textTransform: "uppercase", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                            Analyse IA — {session.ai_feedback.evaluations.length} questions évaluées
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {session.ai_feedback.evaluations.map((ev, idx) => {
                              const scoreLabels = { 0: { label: "Insuffisant", color: "#991b1b", bg: "#fee2e2" }, 1: { label: "Moyen", color: "#92400e", bg: "#fef3c7" }, 2: { label: "Excellent", color: "#166534", bg: "#dcfce7" } };
                              const sl = scoreLabels[ev.score] || scoreLabels[0];
                              // Find the question statement from the session
                              const qIdx = session.answers?.findIndex(a => a.question_id === ev.question_id);
                              const answer = qIdx >= 0 ? session.answers[qIdx]?.text_answer : null;
                              return (
                                <div key={idx} style={{ padding: "0.875rem", background: "white", borderRadius: "8px", border: "1px solid #e0e7ff" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                    <span style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "600" }}>Question {idx + 1}</span>
                                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: sl.bg, color: sl.color }}>
                                      {sl.label} ({ev.score}/2)
                                    </span>
                                  </div>
                                  {answer && (
                                    <p style={{ fontSize: "12px", color: "var(--foreground)", fontStyle: "italic", marginBottom: "6px", lineHeight: "1.5", borderLeft: "2px solid #c7d2fe", paddingLeft: "8px" }}>
                                      « {answer} »
                                    </p>
                                  )}
                                  {ev.justification && (
                                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5" }}>
                                      🧠 {ev.justification}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Interview Module */}
          {candidate.interview_summary && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <MessageSquare size={18} style={{ color: "var(--primary)" }} /> Interview IA
                </h3>

              </div>
              <p style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "1.5rem" }}>{candidate.interview_summary}</p>
              
              {/* Interview Score Breakdown */}
              {candidate.interview_score_breakdown && candidate.interview_score_breakdown.length > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>Détail par question</h4>
                  {candidate.interview_score_breakdown.map((item, idx) => {
                    const skillFromJob = [...(jobCriteria.hard_skills || []), ...(jobCriteria.soft_skills || [])].find(s => 
                      s.name.toLowerCase() === (item.skill || '').toLowerCase() || 
                      item.question.toLowerCase().includes(s.name.toLowerCase())
                    );
                    return (
                      <div key={idx} style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', marginBottom: '4px', color: 'var(--primary)' }}>Q: {item.question}</p>
                            <p style={{ fontSize: '13px', color: 'var(--foreground)', fontStyle: 'italic' }}>R: {item.answer}</p>
                          </div>
                          <div style={{ textAlign: 'right', minWidth: '45px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '800', color: getScoreColor(item.score * 10).color }}>{item.score}/10</span>
                          </div>
                        </div>
                        {skillFromJob && skillFromJob.evidence && (
                          <div style={{ fontSize: '11px', color: 'var(--primary)', opacity: 0.8, fontStyle: 'italic', marginBottom: '4px' }}>
                            Attente : "{skillFromJob.evidence}"
                          </div>
                        )}
                        {item.explanation && (
                          <p style={{ 
                            fontSize: '12px', 
                            color: 'var(--muted-foreground)', 
                            lineHeight: '1.4', 
                            paddingTop: '8px', 
                            borderTop: '1px dashed var(--border)',
                            marginTop: '4px'
                          }}>
                            {item.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {candidate.interview_messages?.length > 0 && (
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowTranscript(!showTranscript)}>
                    {showTranscript ? 'Cacher la transcription' : 'Voir la transcription'}
                  </button>
                </div>
              )}
              {showTranscript && candidate.interview_messages?.length > 0 && (
                <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border)" }}>
                   {candidate.interview_messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: "16px", fontSize: "13px", lineHeight: "1.5" }}>
                      <div style={{ fontWeight: "700", color: msg.role === 'assistant' ? 'var(--primary)' : 'var(--foreground)', marginBottom: "4px" }}>
                        {msg.role === 'assistant' ? 'Leo (IA Recruteur)' : `${candidate.first_name} ${candidate.last_name}`}
                      </div>
                      <div style={{ color: "var(--foreground)" }}>{msg.content.replace("[INTERVIEW_TERMINÉE]", "").trim()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Entretien Vidéo */}
          {candidate.video_responses && candidate.video_responses.length > 0 && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Video size={18} style={{ color: "var(--primary)" }} /> Entretien Vidéo
                </h3>
                {candidate.video_interview_score != null && candidate.video_interview_score > 0 && (
                  <span style={{
                    fontSize: "1.1rem", fontWeight: "800",
                    color: getScoreColor(candidate.video_interview_score).color
                  }}>
                    Score moyen : {candidate.video_interview_score}%
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {candidate.video_responses.map((resp, idx) => {
                  const statusLabels = {
                    pending:      { label: "En attente",      color: "#64748b",  bg: "#f1f5f9" },
                    recorded:     { label: "Enregistré",     color: "#1d4ed8",  bg: "#eff6ff" },
                    transcribing: { label: "Transcription...", color: "#92400e", bg: "#fef3c7" },
                    evaluating:   { label: "Analyse IA...",   color: "#6d28d9",  bg: "#ede9fe" },
                    evaluated:    { label: "Analysé ✓",        color: "#166534",  bg: "#dcfce7" },
                  }[resp.status] || { label: resp.status, color: "#64748b", bg: "#f1f5f9" };

                  const scoreStyle = resp.ai_score != null ? getScoreColor(resp.ai_score) : null;

                  return (
                    <div key={resp.id} style={{
                      border: "1px solid var(--border)", borderRadius: "10px",
                      overflow: "hidden", background: "var(--background)"
                    }}>
                      {/* En-tête question */}
                      <div style={{
                        padding: "1rem 1.25rem",
                        background: "var(--card)",
                        borderBottom: "1px solid var(--border)",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem"
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{
                            fontSize: "11px", fontWeight: "700", color: "#1d4ed8",
                            background: "#eff6ff", padding: "2px 8px", borderRadius: "99px", marginRight: "8px"
                          }}>Question {idx + 1}</span>
                          <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)" }}>
                            {resp.question_text}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{
                            fontSize: "11px", fontWeight: "700",
                            color: statusLabels.color, background: statusLabels.bg,
                            padding: "3px 10px", borderRadius: "99px"
                          }}>{statusLabels.label}</span>
                          {scoreStyle && (
                            <span style={{
                              fontSize: "1rem", fontWeight: "800",
                              color: scoreStyle.color
                            }}>{resp.ai_score}%</span>
                          )}
                        </div>
                      </div>

                      {/* Corps : transcription + analyse IA */}
                      {resp.status === "evaluated" && (
                        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                          {/* Video Player */}
                          {resp.video_url && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>
                                Enregistrement vidéo
                              </p>
                              <video 
                                src={resp.video_url} 
                                controls 
                                style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'black' }}
                              />
                            </div>
                          )}

                          {/* Transcription */}
                          {resp.transcript && (
                            <div>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>
                                Transcription du candidat
                              </p>
                              <div style={{
                                background: "#f8fafc", border: "1px solid var(--border)",
                                borderLeft: "3px solid var(--primary)",
                                borderRadius: "6px", padding: "0.875rem",
                                fontSize: "13px", lineHeight: "1.6", color: "var(--foreground)",
                                fontStyle: "italic"
                              }}>
                                « {resp.transcript} »
                              </div>
                            </div>
                          )}

                          {/* Résumé IA */}
                          {resp.ai_feedback && (
                            <div>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "#6d28d9", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Sparkles size={12} /> Analyse IA
                              </p>
                              <p style={{
                                fontSize: "13px", lineHeight: "1.6", color: "var(--foreground)",
                                background: "#fafafe", border: "1px solid #e0e7ff",
                                borderRadius: "6px", padding: "0.875rem"
                              }}>{resp.ai_feedback}</p>
                            </div>
                          )}

                          {/* Points forts / Améliorations */}
                          {((resp.ai_strengths?.length > 0) || (resp.ai_improvements?.length > 0)) && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                              {resp.ai_strengths?.length > 0 && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "8px", padding: "0.875rem" }}>
                                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "6px" }}>Points forts</p>
                                  {resp.ai_strengths.map((s, i) => (
                                    <div key={i} style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5" }}>• {s}</div>
                                  ))}
                                </div>
                              )}
                              {resp.ai_improvements?.length > 0 && (
                                <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "8px", padding: "0.875rem" }}>
                                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#c2410c", textTransform: "uppercase", marginBottom: "6px" }}>Axes d'amélioration</p>
                                  {resp.ai_improvements.map((s, i) => (
                                    <div key={i} style={{ fontSize: "12px", color: "#c2410c", lineHeight: "1.5" }}>• {s}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Statuts intermédiaires (pas encore analysé) */}
                      {resp.status !== "evaluated" && resp.status !== "pending" && (
                        <div style={{ padding: "1rem 1.25rem", fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          Analyse en cours, rechargez la page dans quelques instants.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

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
          fontFamily: "var(--font-geist), sans-serif"
        }}
      >
        {/* Header Block */}
        <div id="sc-block-header" style={{ padding: "3mm 25mm 2mm 25mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Onbord" style={{ height: "24px", width: "auto" }} />
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "10px", color: "#64748b", margin: "0 0 4px 0", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Scorecard Officielle</p>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a", margin: 0 }}>Généré le {new Date().toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        {/* Profile Block */}
        <div id="sc-block-profile" style={{ padding: "10mm 25mm 15mm 25mm" }}>
          <div style={{ display: "flex", gap: "35px", alignItems: "center" }}>
            <div style={{ 
              width: "80px", height: "80px", borderRadius: "18px", 
              background: "#07294b", color: "white", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontSize: "32px", fontWeight: "700"
            }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "28px", fontWeight: "900", margin: "0 0 6px 0", color: "#0f172a" }}>{candidate.first_name} {candidate.last_name}</h1>
              <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 10px 0" }}>{candidate.email}</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ padding: "4px 10px", borderRadius: "4px", background: "#f1f5f9", fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
                  Statut: {statusBadge.label}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scores Block */}
        <div id="sc-block-scores" style={{ padding: "0 25mm 15mm 25mm" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
            <div style={{ padding: "15px", borderRadius: "15px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>CV</p>
              <div style={{ fontSize: "30px", fontWeight: "900", color: scoreStyle?.color || "#07294b" }}>{candidate.score_cv || "—"}%</div>
            </div>
            <div style={{ padding: "15px", borderRadius: "15px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <p style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Interview</p>
              <div style={{ fontSize: "30px", fontWeight: "900", color: interviewScoreStyle?.color || "#07294b" }}>{candidate.score_interview || "—"}%</div>
            </div>
            <div style={{ padding: "15px", borderRadius: "15px", border: "2px solid #07294b", background: "#f8fafc", textAlign: "center" }}>
              <p style={{ fontSize: "10px", fontWeight: "900", color: "#07294b", textTransform: "uppercase" }}>Score Global</p>
              <div style={{ fontSize: "34px", fontWeight: "900", color: "#07294b" }}>{candidate.score_global || "—"}%</div>
            </div>
          </div>
        </div>

        {/* Summary Block */}
        <div id="sc-block-summary" style={{ padding: "0 25mm 10mm 25mm" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "10px", borderBottom: "1px solid #e2e8f0", paddingBottom: "5px" }}>Analyse IA du profil</h3>
          <p style={{ fontSize: "12px", lineHeight: "1.6", color: "#334155" }}>{candidate.ai_summary || candidate.interview_summary}</p>
        </div>

        {/* Interview Block */}
        <div id="sc-block-interview" style={{ padding: "0 25mm 10mm 25mm" }}>
          <h3 style={{ fontSize: "12px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "15px", borderBottom: "1px solid #e2e8f0", paddingBottom: "5px" }}>Détails de l'Interview</h3>
          {candidate.interview_score_breakdown && candidate.interview_score_breakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {candidate.interview_score_breakdown.map((item, idx) => (
                <div key={idx} style={{ padding: "10px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#07294b" }}>Question : {item.question}</span>
                    <span style={{ fontSize: "11px", fontWeight: "800", color: getScoreColor(item.score * 10).color }}>{item.score}/10</span>
                  </div>
                  <p style={{ fontSize: "11px", color: "#475569", fontStyle: "italic", marginBottom: "4px" }}>Réponse : {item.answer}</p>
                  <p style={{ fontSize: "10px", color: "#64748b", borderTop: "1px dashed #e2e8f0", paddingTop: "4px", marginTop: "4px" }}>{item.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "11px", color: "#64748b" }}>Aucun détail d'entretien disponible.</p>
          )}
        </div>

        {/* Flags Block */}
        <div id="sc-block-flags" style={{ padding: "0 25mm 20mm 25mm" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
            <div style={{ padding: "12px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #dcfce7" }}>
              <h4 style={{ fontSize: "10px", fontWeight: "800", color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>Points Forts</h4>
              <ul style={{ margin: 0, paddingLeft: "15px", fontSize: "11px", color: "#166534" }}>
                {(candidate.green_flags || candidate.interview_strengths || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", background: "#fef2f2", border: "1px solid #fee2e2" }}>
              <h4 style={{ fontSize: "10px", fontWeight: "800", color: "#991b1b", textTransform: "uppercase", marginBottom: "8px" }}>Points d'attention</h4>
              <ul style={{ margin: 0, paddingLeft: "15px", fontSize: "11px", color: "#991b1b" }}>
                {(candidate.red_flags || candidate.interview_weaknesses || []).map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
