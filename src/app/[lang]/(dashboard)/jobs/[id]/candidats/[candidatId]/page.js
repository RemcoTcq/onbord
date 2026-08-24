"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import { formatDateLong, formatDateNumeric } from "@/lib/i18n/format";
import {
  ArrowLeft, CheckCircle2, XCircle, Trash2, Mail,
  Loader2, AlertTriangle, TrendingUp, Shield, Flag,
  User, MapPin, Briefcase, GraduationCap, MessageSquare, ChevronDown, ChevronUp, Star,
  FileText, Clock, Sparkles, Video, Bot
} from "lucide-react";

const AI_PROFICIENCY_TEST_ID = "1dac9ae1-d8ae-4cc5-82f3-a010c6bf6f11";

// Les identifiants C1…C5 viennent des données du test et ne bougent pas ; seul
// leur libellé se traduit, d'où la résolution au rendu.
const categoryLabel = (t, code) =>
  t(`dashboard.candidateDetail.aiCategories.${code}`);
import {
  getCandidateDetail, updateCandidateStatus, deleteCandidate, getMailLogs, generateConstructiveFeedback
} from "@/lib/actions/candidate";
import { submitManualVideoScore } from "@/lib/actions/assessment";
import EmailModal from "@/components/candidates/EmailModal";
import FeedbackModal from "@/components/candidates/FeedbackModal";
import { createClient } from "@/lib/supabase/client";
import { resolveEnabledModules } from "@/lib/scoring";

function getScoreColor(t, score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534", label: t("dashboard.candidateDetail.scoreLevel.excellent") };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e", label: t("dashboard.candidateDetail.scoreLevel.average") };
  return { bg: "#fee2e2", color: "#991b1b", label: t("dashboard.candidateDetail.scoreLevel.weak") };
}

// Réponse intégrale du candidat pour un step du rapport d'expérience.
//
// Attention à ce qui se traduit ici et à ce qui ne se traduit PAS : les mentions
// d'absence (« pas de réponse ») s'adressent au recruteur et suivent son
// interface, mais le CONTENU cité — texte libre, option de QCM choisie — reste
// tel que le candidat l'a produit, dans sa langue.
function expAnswerText(t, step) {
  const r = step.response;
  if (!r) return t("dashboard.candidateDetail.noAnswer");
  if (step.response_format === "video") return r.transcript || t("dashboard.candidateDetail.transcriptPending");
  if (step.response_format === "qcm") {
    const idx = r.meta?.selected_index;
    if (idx == null) return t("dashboard.candidateDetail.noAnswer");
    // Le libellé choisi, pas un numéro d'option : le recruteur ne doit pas
    // avoir à recompter les propositions pour savoir ce qui a été répondu.
    const opt = (step.config?.options || [])[idx];
    return opt ? `« ${opt} »` : t("dashboard.candidateDetail.optionSelected", { index: idx + 1 });
  }
  if (step.response_format === "choice") {
    if (!r.meta?.choice) return t("dashboard.candidateDetail.noAnswer");
    return r.meta.choice === "yes"
      ? t("dashboard.candidateDetail.yes")
      : t("dashboard.candidateDetail.no");
  }
  return r.text_answer || t("dashboard.candidateDetail.noAnswer");
}

// "qualifying" n'est plus généré (le filtre vit en amont du parcours) ; le
// libellé reste pour les expériences publiées avant ce changement.
const expKindLabel = (t, kind) =>
  t(`dashboard.candidateDetail.expKind.${kind}`);

// ─── Grille BARS : rendre la note lisible ────────────────────────────────────
// Une note « N4 » ne veut rien dire seule. On affiche l'échelle telle qu'elle a
// été définie à la génération, en marquant le niveau attribué. Les grilles sont
// ancrées sur 3 niveaux (1/3/5) alors que le modèle note de 1 à 5 : un niveau
// pair est donc un intermédiaire, et on le dit plutôt que de le faire coïncider
// de force avec une ancre.
function BarsScale({ levels, attributed }) {
  const { t, locale } = useI18n();
  const ancres = [...(levels || [])].sort((a, b) => a.level - b.level);
  if (ancres.length === 0) return null;
  const exacte = ancres.some((a) => a.level === attributed);
  const inf = [...ancres].reverse().find((a) => a.level < attributed);
  const sup = ancres.find((a) => a.level > attributed);

  return (
    <div style={{ marginTop: "8px" }}>
      <div style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted-foreground)", marginBottom: "5px" }}>
        {t("dashboard.candidateDetail.evaluationGrid")}
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
        {ancres.map((a, i) => {
          const atteinte = a.level === attributed;
          return (
            <div key={i} style={{
              display: "flex", gap: "8px", padding: "6px 10px", fontSize: "11.5px", lineHeight: 1.45,
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              background: atteinte ? "#eff6ff" : "transparent",
            }}>
              <span style={{ flexShrink: 0, fontWeight: 800, color: atteinte ? "#1d4ed8" : "var(--muted-foreground)", width: 62 }}>
                {atteinte ? "▶ " : ""}N{a.level} {a.label ? `· ${a.label}` : ""}
              </span>
              <span style={{ flex: 1, color: atteinte ? "var(--foreground)" : "var(--muted-foreground)" }}>{a.description}</span>
            </div>
          );
        })}
      </div>
      {!exacte && inf && sup && (
        <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px", fontStyle: "italic" }}>
          Niveau {attributed} : intermédiaire entre N{inf.level} ({inf.label}) et N{sup.level} ({sup.label}).
        </p>
      )}
    </div>
  );
}

// Corrigé QCM : les propositions telles que le candidat les a vues, avec son
// choix et la bonne réponse. Sans ça, un « 0% » sur un QCM est illisible.
function QcmCorrection({ step }) {
  const { t, locale } = useI18n();
  const options = step.config?.options || [];
  if (options.length === 0) return null;
  const choisi = step.response?.meta?.selected_index;
  const correct = step.config?.correct_index;

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>
        {t("dashboard.candidateDetail.proposalsAndKey")}
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
        {options.map((opt, i) => {
          const estCorrect = i === correct;
          const estChoisi = i === choisi;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: "8px", padding: "7px 10px", fontSize: "12px", lineHeight: 1.45,
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              background: estCorrect ? "#f0fdf4" : estChoisi ? "#fee2e2" : "transparent",
            }}>
              <span style={{ flexShrink: 0, fontWeight: 800, width: 14, color: estCorrect ? "#166534" : estChoisi ? "#991b1b" : "var(--muted-foreground)" }}>
                {estCorrect ? "✓" : estChoisi ? "✗" : "·"}
              </span>
              <span style={{ flex: 1, color: "var(--foreground)" }}>{opt}</span>
              {estChoisi && (
                <span style={{ flexShrink: 0, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", color: estCorrect ? "#166534" : "#991b1b", border: `1px solid ${estCorrect ? "#86efac" : "#fca5a5"}`, borderRadius: "99px", padding: "1px 6px" }}>
                  choix du candidat
                </span>
              )}
              {estCorrect && !estChoisi && (
                <span style={{ flexShrink: 0, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", color: "#166534", border: "1px solid #86efac", borderRadius: "99px", padding: "1px 6px" }}>
                  {t("dashboard.candidateDetail.correctAnswer")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Regroupe les scores d'une étape par compétence, dans l'ordre d'arrivée.
// AUCUNE agrégation : on n'additionne ni ne moyenne rien, chaque sous-dimension
// garde sa note. Les scores sans skill_name (runs antérieurs à la migration
// 016) tombent dans un groupe sans titre et s'affichent à plat, comme avant.
function groupScoresBySkill(scores) {
  const groups = [];
  const bySkill = new Map();
  for (const s of scores || []) {
    const skill = s.skill_name || "";
    let group = bySkill.get(skill);
    if (!group) { group = { skill, items: [] }; bySkill.set(skill, group); groups.push(group); }
    group.items.push(s);
  }
  return groups;
}

// Badge d'ÉTAT, pas d'action : « Validé », pas « Valider ». Les verbes vivent
// dans candidateDetail.actions, sur les boutons qui déclenchent le changement.
function getStatusBadge(t, status) {
  const classNames = {
    invited: "badge-primary",
    in_progress: "badge-warning",
    interview_completed: "badge-outline",
    termine: "badge-outline",
    soumis: "badge-success",
    shortlisted: "badge-success",
    rejected: "badge-destructive",
    disqualified: "badge-destructive",
  };
  if (!classNames[status]) return { label: status, className: "badge-muted" };
  return { label: t(`dashboard.candidateStatus.${status}`), className: classNames[status] };
}

export default function CandidateDetailPage() {
  const { t, locale } = useI18n();
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
  const [openAiFeedback, setOpenAiFeedback] = useState({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [manualScores, setManualScores] = useState({});
  const [submittingScore, setSubmittingScore] = useState(false);

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
      if (status === 'shortlisted' || status === 'rejected') {
        generateConstructiveFeedback(candidatId); // fire & forget
      }
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm(t("dashboard.candidateDetail.deleteConfirm"))) return;
    setActionLoading(true);
    const res = await deleteCandidate(candidatId);
    if (res.success) {
      router.push(`/jobs/${jobId}`);
    }
    setActionLoading(false);
  }

  async function handleManualVideoScore(responseId) {
    const data = manualScores[responseId];
    if (!data || !data.score) return;
    setSubmittingScore(true);
    const res = await submitManualVideoScore(candidatId, responseId, data.score, data.justification || "");
    if (res.success) {
      // Le composant sera rechargé pour refléter les nouveaux scores
      loadCandidate();
    } else {
      alert(t("dashboard.candidateDetail.manualScoreError") + " " + (res.error || ""));
    }
    setSubmittingScore(false);
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
        <h2>{t("dashboard.candidateDetail.notFound")}</h2>
        <button className="btn btn-primary" onClick={() => router.push(`/jobs/${jobId}`)}>{t("dashboard.candidateDetail.back")}</button>
      </div>
    );
  }

  const scoreStyle = candidate.score_cv != null ? getScoreColor(t, candidate.score_cv) : null;
  const interviewScoreStyle = candidate.score_interview != null ? getScoreColor(t, candidate.score_interview) : null;
  const globalScoreStyle = candidate.score_global != null ? getScoreColor(t, candidate.score_global) : null;
  const statusBadge = getStatusBadge(t, candidate.status);
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
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>{t("dashboard.candidateDetail.status")}</p>
                <span className={`badge ${statusBadge.className}`} style={{ fontSize: "11px" }}>{statusBadge.label}</span>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>{t("dashboard.candidateDetail.invitedOn")}</p>
                <p style={{ fontSize: "13px", fontWeight: "500" }}>{candidate.created_at ? formatDateLong(candidate.created_at, locale) : "—"}</p>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>{t("dashboard.candidateDetail.completedOn")}</p>
                <p style={{ fontSize: "13px", fontWeight: "500" }}>{candidate.assessment_submitted_at ? formatDateLong(candidate.assessment_submitted_at, locale) : t("dashboard.candidateDetail.pending")}</p>
              </div>
            </div>

            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange("shortlisted")} disabled={actionLoading} style={{ width: "100%" }}>
                {t("dashboard.candidateDetail.validateProfile")}
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange("rejected")} disabled={actionLoading} style={{ width: "100%" }}>
                {t("dashboard.candidateDetail.actions.reject")}
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
                <span style={{ fontWeight: "600", color: candidate.gdpr_consent_at ? "#166534" : "#991b1b" }}>{candidate.gdpr_consent_at ? t("dashboard.candidateDetail.granted") : t("dashboard.candidateDetail.no")}</span>
              </div>
              {Array.isArray(candidate.anti_cheat_metrics) && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ color: "var(--muted-foreground)" }}>{t("dashboard.candidateDetail.windowExits")}</span>
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
              <h3 style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "1rem" }}>{t("dashboard.candidateDetail.mailHistory")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {mailLogs.slice(0, 3).map(log => (
                  <div key={log.id} style={{ fontSize: "12px" }}>
                    <div style={{ fontWeight: "600" }}>{log.mail_type === 'interview_invitation' ? t("dashboard.candidateDetail.mail.invitation") : log.mail_type === 'selected' ? t("dashboard.candidateDetail.mail.validation") : t("dashboard.candidateDetail.mail.rejection")}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>{formatDateNumeric(log.sent_at, locale)}</div>
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
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>{t("dashboard.candidateDetail.globalScore")}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "3.5rem", fontWeight: "800", color: globalScoreStyle?.color || "var(--foreground)", letterSpacing: "-0.04em" }}>
                  {candidate.score_global != null ? candidate.score_global : "—"}
                </span>
                <span style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--muted-foreground)" }}>%</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
                {t("dashboard.candidateDetail.globalScoreHelp")}
              </p>
            </div>

            <div style={{ display: "flex", gap: "1.5rem" }}>
              {resolveEnabledModules(candidate.jobs).cv && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: scoreStyle?.color || "var(--muted-foreground)" }}>{candidate.score_cv != null ? candidate.score_cv : "—"}%</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>CV</div>
                </div>
              )}
              {(candidate.jobs?.assessment_config?.modules?.skills_tests?.enabled ?? false) && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: candidate.score_tests != null ? getScoreColor(t, candidate.score_tests).color : "var(--muted-foreground)" }}>{candidate.score_tests != null ? candidate.score_tests : "—"}%</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>{t("dashboard.candidateDetail.tests")}</div>
                </div>
              )}
              {((candidate.jobs?.assessment_config?.modules?.ai_interview?.enabled) || (candidate.jobs?.ai_interview_config?.enabled)) && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: interviewScoreStyle?.color || "var(--muted-foreground)" }}>{candidate.score_interview != null ? candidate.score_interview : "—"}%</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>Int. IA</div>
                </div>
              )}
              {((candidate.jobs?.assessment_config?.modules?.video_interview?.enabled) || (candidate.video_responses && candidate.video_responses.length > 0)) && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", fontWeight: "800", color: candidate.video_interview_score != null ? getScoreColor(t, candidate.video_interview_score).color : "var(--muted-foreground)" }}>{candidate.video_interview_score != null ? candidate.video_interview_score : "—"}%</div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase" }}>{t("dashboard.candidateDetail.videoInterviewShort")}</div>
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
                  <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>{t("dashboard.candidateDetail.perCriterion")}</h4>
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
                          <span style={{ fontSize: '14px', fontWeight: '800', color: getScoreColor(t, item.score).color }}>{item.score}%</span>
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
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "8px" }}>{t("dashboard.candidateDetail.strengths")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {candidate.green_flags.map((f, i) => <div key={i} style={{ fontSize: "12px", color: "#166534" }}>• {f}</div>)}
                    </div>
                  </div>
                )}
                {candidate.red_flags?.length > 0 && (
                  <div style={{ background: "#fef2f2", padding: "12px", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                    <p style={{ fontSize: "11px", fontWeight: "700", color: "#991b1b", textTransform: "uppercase", marginBottom: "8px" }}>{t("dashboard.candidateDetail.watchPoints")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      {candidate.red_flags.map((f, i) => <div key={i} style={{ fontSize: "12px", color: "#991b1b" }}>• {f}</div>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rapport de preuves complet — un bloc par step, dans l'ordre */}
          {candidate.experience_report && (() => {
            const rep = candidate.experience_report;
            return (
              <div className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={18} style={{ color: "var(--primary)" }} /> {t("dashboard.candidateDetail.evidenceReport")}
                  </h3>
                  <span className={`badge ${rep.scored ? 'badge-success' : 'badge-warning'}`}>{rep.scored ? t("dashboard.candidateDetail.scored") : t("dashboard.candidateDetail.inProgress")}</span>
                </div>

                {rep.summary && <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--foreground)", marginBottom: "1.25rem" }}>{rep.summary}</p>}

                {rep.ai_usage_used ? (
                  <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)", display: "flex", alignItems: "center", gap: "6px" }}><Bot size={14} /> {t("dashboard.candidateDetail.aiUsage")}</span>
                      {rep.ai_usage_score != null && <span style={{ fontSize: '14px', fontWeight: '800', color: getScoreColor(t, rep.ai_usage_score).color }}>{rep.ai_usage_score}%</span>}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px" }}>
                      {/* Le mot mis en italique est au milieu de la phrase et ne
                          tombe pas au même endroit en anglais : d'où tNodes()
                          plutôt qu'un découpage en trois morceaux. */}
                      {tNodes(t("dashboard.candidateDetail.aiUsageHelp"), {
                        em: <em>{t("dashboard.candidateDetail.aiUsageHelpEm")}</em>,
                      })}
                      {rep.ai_usage_prompts > 0 &&
                        t("dashboard.candidateDetail.aiPrompts", { count: rep.ai_usage_prompts })}.
                    </p>

                    {/* Les trois axes de jugement, énoncés au recruteur : ce sont
                        ceux imposés à l'évaluateur dans le prompt de scoring. */}
                    <div style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {["framing", "iteration", "criticalEye"].map((axe) => (
                        <span key={axe} style={{ background: "var(--secondary)", borderRadius: "99px", padding: "2px 8px", fontWeight: 600 }}>{t(`dashboard.candidateDetail.aiAxes.${axe}`)}</span>
                      ))}
                    </div>

                    {rep.ai_usage_justification ? (
                      <p style={{ fontSize: "12px", color: "var(--foreground)", lineHeight: "1.55", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                        🧠 {rep.ai_usage_justification}
                      </p>
                    ) : (
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                        {t("dashboard.candidateDetail.justificationUnavailable")}
                      </p>
                    )}
                  </div>
                ) : rep.scored && (
                  // Sans cette ligne, l'absence de note d'usage de l'IA ressemble
                  // à une donnée manquante alors que c'est un choix assumé.
                  <div style={{ marginBottom: "1.5rem", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "6px" }}><Bot size={14} /> {t("dashboard.candidateDetail.aiUsageNotScored")}</span>
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px" }}>
                      {tNodes(t("dashboard.candidateDetail.aiUsageNotScoredHelp"), {
                        em: <em>{t("dashboard.candidateDetail.aiUsageHelpEm")}</em>,
                      })}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {rep.steps.map((step, i) => (
                    <div key={step.id} style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                      {/* En-tête étape */}
                      <div style={{ padding: "10px 14px", background: "var(--background)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)" }}>#{i + 1}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700 }}>{step.title || expKindLabel(t, step.kind)}</span>
                        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted-foreground)", background: "var(--secondary)", padding: "2px 8px", borderRadius: "99px" }}>{expKindLabel(t, step.kind)}</span>
                      </div>

                      <div style={{ padding: "14px" }}>
                        {step.prompt && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "10px", whiteSpace: "pre-wrap" }}>{step.prompt}</p>}

                        {/* Réponse intégrale du candidat */}
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>{t("dashboard.candidateDetail.candidateAnswer")}</div>
                        <div style={{ background: "#f8fafc", border: "1px solid var(--border)", borderLeft: "3px solid var(--primary)", borderRadius: "6px", padding: "10px 12px", fontSize: "13px", lineHeight: "1.6", color: "var(--foreground)", whiteSpace: "pre-wrap", overflowWrap: "break-word", maxHeight: 360, overflowY: "auto" }}>
                          {expAnswerText(t, step)}
                        </div>
                        {step.response?.video_url && (
                          <video src={step.response.video_url} controls style={{ width: "100%", maxWidth: 400, marginTop: "10px", borderRadius: 8, border: "1px solid var(--border)", background: "black" }} />
                        )}

                        {/* QCM : propositions vues par le candidat + corrigé. */}
                        {step.response_format === "qcm" && <QcmCorrection step={step} />}

                        {/* Sous-dimensions notées, regroupées par compétence.
                            Pas de score agrégé par compétence : chaque sous-dimension
                            garde sa note et sa justification, le regroupement est
                            purement visuel. */}
                        {step.criteria.length > 0 && (
                          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
                            {groupScoresBySkill(step.criteria).map((group, gi) => (
                            <div key={gi} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {group.skill && (
                              <div style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted-foreground)" }}>
                                {group.skill}
                              </div>
                            )}
                            {group.items.map((cs, ci) => (
                              <div key={ci} style={{ background: "var(--background)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: 8 }}>
                                  <span style={{ fontSize: "13px", fontWeight: 700 }}>{cs.sub_dimension_name || cs.criterion_name}</span>
                                  <span style={{ fontSize: "12px", fontWeight: 800, color: getScoreColor(t, cs.score).color, whiteSpace: "nowrap" }}>N{cs.bars_level} · {cs.score}%</span>
                                </div>
                                {cs.justification && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: "1.5", marginBottom: cs.verbatim || cs.crm_details ? "6px" : 0 }}>🧠 {cs.justification}</p>}

                                {/* L'échelle sur laquelle cette note a été posée.
                                    Absente pour le QCM et les champs factuels CRM,
                                    qui sont corrigés sans grille (vrai/faux). */}
                                {(() => {
                                  const grille = (step.bars || []).find((b) => b.name === (cs.sub_dimension_name || cs.criterion_name));
                                  return grille ? <BarsScale levels={grille.bars_levels} attributed={cs.bars_level} /> : null;
                                })()}

                                {/* Sandbox CRM — correction déterministe, champ par champ.
                                    La ligne du piège est mise en évidence : c'est le
                                    signal qui distingue "a lu" de "a croisé les sources". */}
                                {cs.crm_details?.length > 0 && (
                                  <div style={{ border: "1px solid var(--border)", borderRadius: "6px", overflow: "hidden" }}>
                                    {cs.crm_details.map((d, di) => (
                                      <div key={di} style={{
                                        display: "flex", alignItems: "flex-start", gap: "8px", padding: "7px 10px", fontSize: "12px",
                                        borderTop: di === 0 ? "none" : "1px solid var(--border)",
                                        background: d.is_trap ? "#fffbeb" : "transparent",
                                      }}>
                                        <span style={{ flexShrink: 0, fontWeight: 800, color: d.correct ? "#166534" : "#991b1b" }}>{d.correct ? "✓" : "✗"}</span>
                                        <span style={{ flex: "0 0 34%", fontWeight: 600 }}>
                                          {d.label}
                                          {d.is_trap && <span style={{ marginLeft: 6, fontSize: "9.5px", fontWeight: 700, textTransform: "uppercase", color: "#b45309", border: "1px solid #fcd34d", borderRadius: "99px", padding: "1px 6px" }}>{t("dashboard.candidateDetail.trap")}</span>}
                                        </span>
                                        <span style={{ flex: 1, color: d.correct ? "var(--foreground)" : "#991b1b", overflowWrap: "anywhere" }}>
                                          {d.given ?? <em style={{ color: "var(--muted-foreground)" }}>{t("dashboard.candidateDetail.notFilled")}</em>}
                                        </span>
                                        {!d.correct && (
                                          <span style={{ flex: "0 0 28%", color: "var(--muted-foreground)", overflowWrap: "anywhere" }}>{t("dashboard.candidateDetail.expected")} {d.expected}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {cs.verbatim && (
                                  <div style={{ borderLeft: cs.verbatim_verified ? "3px solid #22c55e" : "3px solid #f59e0b", background: cs.verbatim_verified ? "#f0fdf4" : "#fffbeb", padding: "6px 10px", borderRadius: "0 6px 6px 0" }}>
                                    <div style={{ fontSize: "10px", fontWeight: 600, color: cs.verbatim_verified ? "#166534" : "#b45309", marginBottom: "2px" }}>
                                      {cs.verbatim_verified ? t("dashboard.candidateDetail.verbatimVerified") : t("dashboard.candidateDetail.verbatimNotFound")}
                                    </div>
                                    <p style={{ fontSize: "12px", fontStyle: "italic", color: "var(--foreground)" }}>« {cs.verbatim} »</p>
                                  </div>
                                )}
                              </div>
                            ))}
                            </div>
                            ))}
                          </div>
                        )}

                        {/* Log complet des échanges avec l'assistant IA sur CE step */}
                        {step.ai_messages.length > 0 && (
                          <div style={{ marginTop: "14px" }}>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                              <Bot size={13} /> Échanges avec l'assistant IA ({step.ai_messages.filter((m) => m.role === "user").length} message{step.ai_messages.filter((m) => m.role === "user").length > 1 ? "s" : ""})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 320, overflowY: "auto", padding: "4px" }}>
                              {step.ai_messages.map((m, mi) => (
                                <div key={mi} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                                  <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 10, fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "break-word", background: m.role === "user" ? "var(--primary)" : "white", color: m.role === "user" ? "white" : "var(--foreground)", border: m.role === "user" ? "none" : "1px solid var(--border)" }}>
                                    {m.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Tests de compétences (Legacy) */}
          {!candidate.experience_run && candidate.test_sessions && candidate.test_sessions.length > 0 && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.5rem" }}>
                <TrendingUp size={18} style={{ color: "var(--primary)" }} /> Tests de compétences
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {candidate.test_sessions.map((session) => {
                  const sStyle = session.score != null ? getScoreColor(t, session.score) : { bg: "#f3f4f6", color: "#64748b" };
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
                            {session.assessment_tests?.category} • {session.completed_at ? t("dashboard.candidateDetail.completedOn") + " " + formatDateNumeric(session.completed_at, locale) : t("dashboard.candidateDetail.pending")}
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
                              const scoreLabels = { 0: { label: t("dashboard.candidateDetail.scoreLevel.insufficient"), color: "#991b1b", bg: "#fee2e2" }, 1: { label: t("dashboard.candidateDetail.scoreLevel.average"), color: "#92400e", bg: "#fef3c7" }, 2: { label: t("dashboard.candidateDetail.scoreLevel.excellent"), color: "#166534", bg: "#dcfce7" } };
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

          {/* AI Interview Module (Legacy) */}
          {!candidate.experience_run && candidate.interview_summary && (
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
                  <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "4px" }}>{t("dashboard.candidateDetail.perQuestion")}</h4>
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
                            <span style={{ fontSize: '14px', fontWeight: '800', color: getScoreColor(t, item.score * 10).color }}>{item.score}/10</span>
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
                    {showTranscript ? t("dashboard.candidateDetail.hideTranscript") : t("dashboard.candidateDetail.showTranscript")}
                  </button>
                </div>
              )}
              {showTranscript && candidate.interview_messages?.length > 0 && (
                <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "#f8fafc", borderRadius: "8px", maxHeight: "400px", overflowY: "auto", border: "1px solid var(--border)" }}>
                   {candidate.interview_messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: "16px", fontSize: "13px", lineHeight: "1.5" }}>
                      <div style={{ fontWeight: "700", color: msg.role === 'assistant' ? 'var(--primary)' : 'var(--foreground)', marginBottom: "4px" }}>
                        {msg.role === 'assistant' ? t("dashboard.candidateDetail.aiRecruiter") : `${candidate.first_name} ${candidate.last_name}`}
                      </div>
                      <div style={{ color: "var(--foreground)" }}>{msg.content.replace("[INTERVIEW_TERMINÉE]", "").trim()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Entretien Vidéo (Legacy) */}
          {!candidate.experience_run && candidate.video_responses && candidate.video_responses.length > 0 && (
            <div className="card" style={{ padding: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Video size={18} style={{ color: "var(--primary)" }} /> Entretien Vidéo
                </h3>
                {candidate.video_interview_score != null && candidate.video_interview_score > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{
                      fontSize: "1.1rem", fontWeight: "800",
                      color: getScoreColor(t, candidate.video_interview_score).color
                    }}>
                      Score moyen : {candidate.video_interview_score}%
                      {candidate.video_score_completeness && !candidate.video_score_completeness.is_complete && "*"}
                    </span>
                    {candidate.video_score_completeness && !candidate.video_score_completeness.is_complete && (
                      <div style={{
                        marginTop: "8px", display: "flex", alignItems: "center", gap: "6px",
                        padding: "6px 12px", borderRadius: "8px",
                        background: "#fff7ed", border: "1px solid #ffedd5",
                        fontSize: "11px", color: "#c2410c", fontWeight: "600"
                      }}>
                        <AlertTriangle size={14} /> {candidate.video_score_completeness.evaluated}/{candidate.video_score_completeness.total} questions évaluées —
                        {t("dashboard.candidateDetail.partialScore")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {candidate.video_responses.map((resp, idx) => {
                  const statusLabels = {
                    pending:      { label: t("dashboard.candidateDetail.pending"),      color: "#64748b",  bg: "#f1f5f9" },
                    recorded:     { label: t("dashboard.candidateDetail.saved"),     color: "#1d4ed8",  bg: "#eff6ff" },
                    transcribing: { label: t("dashboard.candidateDetail.transcribing"), color: "#92400e", bg: "#fef3c7" },
                    evaluating:   { label: t("dashboard.candidateDetail.aiAnalyzing"),   color: "#6d28d9",  bg: "#ede9fe" },
                    evaluated:    { label: t("dashboard.candidateDetail.analyzed"),        color: "#166534",  bg: "#dcfce7" },
                    manual_review:{ label: t("dashboard.candidateDetail.manualReview"),   color: "#991b1b",  bg: "#fee2e2" },
                  }[resp.status] || { label: resp.status, color: "#64748b", bg: "#f1f5f9" };

                  const scoreStyle = resp.ai_score != null ? getScoreColor(t, resp.ai_score) : null;

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
                      {(resp.status === "evaluated" || resp.status === "manual_review") && (
                        <div style={{ padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

                          {/* Video Player */}
                          {resp.video_url && (
                            <div style={{ marginBottom: '1rem' }}>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>
                                {t("dashboard.candidateDetail.videoRecording")}
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
                                {t("dashboard.candidateDetail.candidateTranscript")}
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

                          {resp.status === "manual_review" && (
                            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "8px", padding: "1rem" }}>
                              <h4 style={{ fontSize: "13px", fontWeight: "700", color: "#991b1b", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <AlertTriangle size={16} /> À revoir manuellement
                              </h4>
                              <p style={{ fontSize: "13px", color: "#7f1d1d", lineHeight: "1.5" }}>
                                {resp.ai_feedback || t("dashboard.candidateDetail.transcriptTooShort")}
                              </p>
                            </div>
                          )}

                          {/* Détail par critère */}
                          {resp.status === "evaluated" && resp.ai_criteria_scores && resp.ai_criteria_scores.length > 0 && (
                            <div>
                              <p style={{ fontSize: "11px", fontWeight: "700", color: "#6d28d9", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "5px" }}>
                                <Sparkles size={12} /> Détail par critère
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                {resp.ai_criteria_scores.map((crit, cIdx) => (
                                  <div key={cIdx} style={{
                                    border: "1px solid var(--border)", borderRadius: "8px",
                                    padding: "1rem", background: "white"
                                  }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                      <span style={{ fontSize: "13px", fontWeight: "700" }}>{crit.criterion_name}</span>
                                      <span style={{ fontSize: "14px", fontWeight: "800", color: getScoreColor(t, crit.score).color }}>{crit.score}%</span>
                                    </div>
                                    
                                    {/* Justification IA */}
                                    <p style={{ fontSize: "13px", lineHeight: "1.5", color: "var(--foreground)", marginBottom: "10px" }}>
                                      <span style={{ marginRight: "6px" }}>🧠</span>
                                      {crit.justification}
                                    </p>

                                    {/* Verbatim avec validation */}
                                    <div style={{
                                      borderLeft: crit.verbatim_verified ? "3px solid #22c55e" : "3px solid #f59e0b",
                                      paddingLeft: "10px",
                                      background: crit.verbatim_verified ? "#f0fdf4" : "#fffbeb",
                                      padding: "8px 10px", borderRadius: "0 6px 6px 0"
                                    }}>
                                      {crit.verbatim_verified ? (
                                        <div style={{ fontSize: "10px", color: "#166534", fontWeight: "600", marginBottom: "4px" }}>{t("dashboard.candidateDetail.quoteVerified")}</div>
                                      ) : (
                                        <div style={{ fontSize: "10px", color: "#b45309", fontWeight: "600", marginBottom: "4px" }}>{t("dashboard.candidateDetail.quoteNotVerified")}</div>
                                      )}
                                      <p style={{ fontStyle: "italic", fontSize: "13px", opacity: crit.verbatim_verified ? 1 : 0.7, color: "var(--foreground)" }}>
                                        « {crit.verbatim || t("dashboard.candidateDetail.noQuote")} »
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Points forts / Améliorations */}
                          {resp.status === "evaluated" && ((resp.ai_strengths?.length > 0) || (resp.ai_improvements?.length > 0)) && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "10px" }}>
                              {resp.ai_strengths?.length > 0 && (
                                <div style={{ background: "#f0fdf4", border: "1px solid #dcfce7", borderRadius: "8px", padding: "0.875rem" }}>
                                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#166534", textTransform: "uppercase", marginBottom: "6px" }}>{t("dashboard.candidateDetail.strengths")}</p>
                                  {resp.ai_strengths.map((s, i) => (
                                    <div key={i} style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5" }}>• {s}</div>
                                  ))}
                                </div>
                              )}
                              {resp.ai_improvements?.length > 0 && (
                                <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "8px", padding: "0.875rem" }}>
                                  <p style={{ fontSize: "11px", fontWeight: "700", color: "#c2410c", textTransform: "uppercase", marginBottom: "6px" }}>{t("dashboard.candidateDetail.improvementAreas")}</p>
                                  {resp.ai_improvements.map((s, i) => (
                                    <div key={i} style={{ fontSize: "12px", color: "#c2410c", lineHeight: "1.5" }}>• {s}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notation Manuelle */}
                          {(candidate.jobs?.assessment_config?.modules?.video_interview?.evaluation_mode === "manual" || resp.status === "manual_review") && (
                            <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                              <h4 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>
                                {resp.status === "evaluated" ? t("dashboard.candidateDetail.editScore") : t("dashboard.candidateDetail.scoreThisAnswer")}
                              </h4>
                              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    {[1, 2, 3, 4, 5].map(star => {
                                      const currentScore = manualScores[resp.id]?.score || (resp.ai_score ? Math.round(resp.ai_score / 20) : 0);
                                      const isSelected = currentScore >= star;
                                      return (
                                        <button 
                                          key={star}
                                          onClick={() => setManualScores(prev => ({ ...prev, [resp.id]: { ...prev[resp.id], score: star } }))}
                                          style={{ background: "transparent", border: "none", cursor: "pointer", color: isSelected ? "#f59e0b" : "#e2e8f0", padding: 0 }}
                                        >
                                          <Star size={24} fill={isSelected ? "#f59e0b" : "transparent"} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)", textAlign: "center" }}>{t("dashboard.candidateDetail.scoreOutOf5")}</span>
                                </div>
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: "250px" }}>
                                  <textarea 
                                    placeholder={t("dashboard.candidateDetail.justificationPlaceholder")} 
                                    className="input-field" 
                                    rows={2}
                                    value={manualScores[resp.id]?.justification !== undefined ? manualScores[resp.id].justification : (resp.status === "evaluated" && !resp.ai_criteria_scores ? resp.ai_feedback : "")}
                                    onChange={e => setManualScores(prev => ({ ...prev, [resp.id]: { ...prev[resp.id], justification: e.target.value } }))}
                                    style={{ resize: "vertical", fontSize: "13px" }}
                                  />
                                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button 
                                      className="btn btn-primary btn-sm" 
                                      disabled={!manualScores[resp.id]?.score && !resp.ai_score || submittingScore}
                                      onClick={() => handleManualVideoScore(resp.id)}
                                      style={{ padding: "6px 12px", height: "auto" }}
                                    >
                                      {submittingScore ? <Loader2 size={14} className="spin" /> : t("dashboard.candidateDetail.confirmScore")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Statuts intermédiaires (pas encore analysé) */}
                      {resp.status !== "evaluated" && resp.status !== "pending" && (
                        <div style={{ padding: "1rem 1.25rem", fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          {t("dashboard.candidateDetail.analysisInProgress")}
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

      {feedbackModalOpen && candidate && (
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          candidateId={candidatId}
          candidateName={`${candidate.first_name} ${candidate.last_name}`}
        />
      )}
      
    </div>
  );
}
