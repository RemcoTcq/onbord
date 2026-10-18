"use client";

// Rapport d'un candidat — maquette « D · Rapport » (octobre 2026).
//
// À gauche, la fiche du candidat et les décisions ; à droite, le score global,
// le rapport d'évidence, puis une carte par étape : sa réponse (conversation,
// vidéo, échanges avec l'assistant IA) et ses critères, chacun dépliable sur ses
// points de contrôle. « Tout déplier » ouvre ou ferme tout d'un coup.
//
// Les sections héritées (analyse de CV, tests, entretien IA, entretien vidéo)
// ne s'affichent que pour les candidats d'avant les simulations.

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import { formatDateLong, formatDateNumeric } from "@/lib/i18n/format";
import {
  CheckCircle2, Trash2, Mail, Loader2, AlertTriangle, TrendingUp, MessageSquare, ChevronDown, ChevronRight, Star,
  FileText, Clock, Sparkles, Video, Bot, ChevronsDownUp, ChevronsUpDown, Phone, Info,
} from "lucide-react";
import {
  getCandidateDetail, updateCandidateStatus, deleteCandidate, getMailLogs
} from "@/lib/actions/candidate";
import { getFeedbackSentAt } from "@/lib/actions/candidateFeedback";
import { submitManualVideoScore } from "@/lib/actions/assessment";
import FeedbackModal from "@/components/candidates/FeedbackModal";
import PageHeader from "@/components/layout/PageHeader";
import { natureEtape } from "@/components/experience/BlocEtape";
import { resolveEnabledModules } from "@/lib/scoring";
import { repliques } from "@/lib/persona";
import { scoreTone, initials as initialesDe, candidateStatusLabel } from "@/components/ui/ds";

const AI_PROFICIENCY_TEST_ID = "1dac9ae1-d8ae-4cc5-82f3-a010c6bf6f11";

// Couleurs d'un score selon son ton (scoreTone : 75 / 50).
const TONS = {
  high: { encre: "var(--ds-green-ink)", barre: "var(--ds-green)", piste: "#DCEFE6", fond: "var(--ds-green-bg)" },
  mid: { encre: "var(--ds-amber-ink)", barre: "var(--ds-amber)", piste: "#F6E8D2", fond: "var(--ds-amber-bg)" },
  low: { encre: "var(--ds-red)", barre: "#D9573F", piste: "#F4E1DD", fond: "var(--ds-red-bg)" },
  wait: { encre: "var(--ds-ink-3)", barre: "var(--ds-ink-6)", piste: "var(--ds-line-2)", fond: "var(--ds-soft-2)" },
};
const ton = (score) => TONS[scoreTone(score)];

function getScoreColor(t, score) {
  const tn = scoreTone(score);
  const label = tn === "high"
    ? t("dashboard.candidateDetail.scoreLevel.excellent")
    : tn === "mid" ? t("dashboard.candidateDetail.scoreLevel.average") : t("dashboard.candidateDetail.scoreLevel.weak");
  return { bg: TONS[tn].fond, color: TONS[tn].encre, label };
}

// Statut candidat → ton de la pastille.
const TON_STATUT = {
  invited: "blue", in_progress: "amber",
  soumis: "green", scored: "green", shortlisted: "green", next_step: "green",
  rejected: "red", disqualified: "red",
};

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

/** Points obtenus et maximum d'un critère à checkpoints (0/1/2 chacun). */
function pointsCritere(cs) {
  if (cs.format !== "checkpoints") return null;
  return { pts: cs.checkpoints.reduce((s, cp) => s + (cp.score || 0), 0), max: cs.checkpoints.length * 2 };
}

/** Points d'une liste de critères : somme des points, ou null sans checkpoints. */
function pointsDe(criteres) {
  const parts = criteres.map(pointsCritere).filter(Boolean);
  if (!parts.length) return null;
  return { pts: parts.reduce((s, p) => s + p.pts, 0), max: parts.reduce((s, p) => s + p.max, 0) };
}

// ─── Grille BARS : rendre la note lisible ────────────────────────────────────
// Une note « N4 » ne veut rien dire seule. On affiche l'échelle telle qu'elle a
// été définie à la génération, en marquant le niveau attribué. Les grilles sont
// ancrées sur 3 niveaux (1/3/5) alors que le modèle note de 1 à 5 : un niveau
// pair est donc un intermédiaire, et on le dit plutôt que de le faire coïncider
// de force avec une ancre.
function BarsScale({ levels, attributed }) {
  const { t } = useI18n();
  const ancres = [...(levels || [])].sort((a, b) => a.level - b.level);
  if (ancres.length === 0) return null;
  const exacte = ancres.some((a) => a.level === attributed);
  const inf = [...ancres].reverse().find((a) => a.level < attributed);
  const sup = ancres.find((a) => a.level > attributed);

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)", marginBottom: 5 }}>
        {t("dashboard.candidateDetail.evaluationGrid")}
      </div>
      <div style={{ border: "1px solid var(--ds-line-inset)", borderRadius: 9, overflow: "hidden" }}>
        {ancres.map((a, i) => {
          const atteinte = a.level === attributed;
          return (
            <div key={i} style={{
              display: "flex", gap: 8, padding: "7px 10px", fontSize: 12, lineHeight: 1.45,
              borderTop: i === 0 ? "none" : "1px solid var(--ds-line-inset)",
              background: atteinte ? "var(--ds-blue-06)" : "#FFFFFF",
            }}>
              <span className="ds-mono" style={{ flexShrink: 0, fontWeight: 500, color: atteinte ? "var(--ds-blue)" : "var(--ds-ink-4)", width: 70 }}>
                {atteinte ? "▶ " : ""}N{a.level} {a.label ? `· ${a.label}` : ""}
              </span>
              <span style={{ flex: 1, color: atteinte ? "var(--ds-ink)" : "var(--ds-ink-3)" }}>{a.description}</span>
            </div>
          );
        })}
      </div>
      {!exacte && inf && sup && (
        <p className="ds-sub" style={{ fontSize: 12, marginTop: 4, fontStyle: "italic" }}>
          {t("dashboard.candidateDetail.levelBetween", { level: attributed, low: inf.level, lowLabel: inf.label, high: sup.level, highLabel: sup.label })}
        </p>
      )}
    </div>
  );
}

// Détail d'un critère à checkpoints : ce qui est réussi, esquissé ou manqué,
// chacun avec sa justification et l'extrait qui le prouve. C'est la matière
// même du feedback — un score seul ne dit pas quoi retravailler.
const CHECKPOINT_MARQUES = {
  2: { mark: "✓", icone: { background: "var(--ds-green-bg)", color: "var(--ds-green-ink)" }, fond: "#FFFFFF" },
  1: { mark: "◐", icone: { background: "#FDEBCB", color: "#8A5300" }, fond: "#FFFCF5" },
  0: { mark: "✗", icone: { background: "var(--ds-red-bg)", color: "var(--ds-red)" }, fond: "#FFFFFF" },
};

function CheckpointList({ checkpoints }) {
  const { t } = useI18n();
  if (!checkpoints?.length) return null;
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", borderRadius: 9, border: "1px solid var(--ds-line-inset)", overflow: "hidden" }}>
      {checkpoints.map((cp, i) => {
        const m = CHECKPOINT_MARQUES[cp.score] || CHECKPOINT_MARQUES[0];
        const niveau = t(`dashboard.candidateDetail.checkpointLevel.${cp.score ?? 0}`);
        return (
          <li key={cp.id || i} style={{ display: "flex", gap: 10, padding: "11px 12px", borderTop: i ? "1px solid var(--ds-line-inset)" : 0, background: m.fond }}>
            <span className="ds-mono" title={niveau} style={{ width: 20, height: 20, flex: "none", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, ...m.icone }}>{m.mark}</span>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
              <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 500 }}>{cp.description}</span>
                <span style={{ fontSize: 11, fontWeight: 500, height: 20, display: "inline-flex", alignItems: "center", padding: "0 6px", borderRadius: 6, ...m.icone }}>{niveau}</span>
              </span>
              {cp.justification && <span className="ds-sub">{cp.justification}</span>}
              {cp.verbatim && (
                <span style={{ alignSelf: "flex-start", padding: "5px 9px", borderRadius: 7, background: "#F3F6FC", fontSize: 13, fontStyle: "italic", color: "var(--ds-ink-2)" }}>
                  « {cp.verbatim} »
                  {!cp.verbatim_verified && (
                    <span style={{ fontStyle: "normal", fontSize: 11, color: "var(--ds-amber-ink)", marginLeft: 6 }}>{t("dashboard.candidateDetail.verbatimNotFound")}</span>
                  )}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Corrigé QCM : les propositions telles que le candidat les a vues, avec son
// choix et la bonne réponse. Sans ça, un « 0% » sur un QCM est illisible.
function QcmCorrection({ step }) {
  const { t } = useI18n();
  const options = step.config?.options || [];
  if (options.length === 0) return null;
  const choisi = step.response?.meta?.selected_index;
  const correct = step.config?.correct_index;

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)", marginBottom: 6 }}>
        {t("dashboard.candidateDetail.proposalsAndKey")}
      </div>
      <div style={{ border: "1px solid var(--ds-line)", borderRadius: 9, overflow: "hidden", background: "#FFFFFF" }}>
        {options.map((opt, i) => {
          const estCorrect = i === correct;
          const estChoisi = i === choisi;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", fontSize: 13, lineHeight: 1.45,
              borderTop: i === 0 ? "none" : "1px solid var(--ds-line-3)",
              background: estCorrect ? "var(--ds-green-bg)" : estChoisi ? "var(--ds-red-bg)" : "transparent",
            }}>
              <span style={{ flexShrink: 0, fontWeight: 600, width: 14, color: estCorrect ? "var(--ds-green-ink)" : estChoisi ? "var(--ds-red)" : "var(--ds-ink-5)" }}>
                {estCorrect ? "✓" : estChoisi ? "✗" : "·"}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
              {estChoisi && (
                <span className={`ds-tag ${estCorrect ? "ds-tag-high" : "ds-tag-low"}`} style={{ fontFamily: "inherit", fontSize: 11 }}>
                  {t("dashboard.candidateDetail.candidateChoice")}
                </span>
              )}
              {estCorrect && !estChoisi && (
                <span className="ds-tag ds-tag-high" style={{ fontFamily: "inherit", fontSize: 11 }}>
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

// Libellé de l'historique des mails, par type enregistré dans mail_logs.
// `selected` / `rejected` restent lisibles : ce sont les envois de l'ancien
// système de modèles, déjà en base.
const MAIL_LABEL = {
  interview_invitation: "invitation",
  selected: "validation",
  rejected: "rejection",
  feedback: "feedback",
};

// ─── Petits éléments de mise en page ─────────────────────────────────────────

/** Bouton chevron « réduire / agrandir » d'une carte. */
function Chevron({ ouvert, onClick, label }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="ds-icon-btn"
      onClick={onClick}
      aria-expanded={ouvert}
      aria-label={t("dashboard.experienceEditor.ui.toggle", { title: label })}
      title={t("dashboard.experienceEditor.ui.toggleShort")}
      style={{ width: 30, height: 30 }}
    >
      <ChevronDown size={16} strokeWidth={2} style={{ transition: "transform .15s", transform: ouvert ? "none" : "rotate(-90deg)" }} />
    </button>
  );
}

/** Jauge circulaire du score global. */
function Jauge({ score }) {
  const c = ton(score);
  const r = 36;
  const tour = 2 * Math.PI * r;
  const part = Math.max(0, Math.min(100, score || 0)) / 100;
  return (
    <span style={{ position: "relative", width: 84, height: 84, flex: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx="42" cy="42" r={r} fill="none" stroke={c.piste} strokeWidth="8" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={c.barre} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${tour * part} ${tour}`} />
      </svg>
      <span className="ds-mono" style={{ fontSize: 20, fontWeight: 500, color: c.encre }}>{score != null ? `${score}%` : "—"}</span>
    </span>
  );
}

/** Étiquette de score « 3/26 pts · 11% ». */
function TagScore({ score, points }) {
  const c = ton(score);
  return (
    <span className="ds-mono" style={{ height: 24, display: "inline-flex", alignItems: "center", padding: "0 8px", borderRadius: 7, background: c.fond, fontSize: 12, fontWeight: 500, color: c.encre, whiteSpace: "nowrap" }}>
      {points ? `${points.pts}/${points.max} pts · ` : ""}{score != null ? `${score}%` : "—"}
    </span>
  );
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
  const [openAiFeedback, setOpenAiFeedback] = useState({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSentAt, setFeedbackSentAt] = useState(null);
  const [manualScores, setManualScores] = useState({});
  const [submittingScore, setSubmittingScore] = useState(false);
  // Sections dépliées : clé → booléen. Une clé absente prend sa valeur par
  // défaut (les cartes ouvertes, les détails fermés).
  const [ouverts, setOuverts] = useState({});

  async function loadCandidate() {
    setLoading(true);

    const [candRes, logsRes, fbRes] = await Promise.all([
      getCandidateDetail(candidatId),
      getMailLogs(jobId),
      getFeedbackSentAt(candidatId),
    ]);

    if (candRes.success) {
      setCandidate(candRes.candidate);
    }
    if (logsRes.success) {
      setMailLogs(logsRes.logs.filter(l => l.candidate_id === candidatId));
    }
    if (fbRes.success) setFeedbackSentAt(fbRes.sentAt);
    setLoading(false);
  }

  useEffect(() => {
    loadCandidate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatId]);

  // La décision ne déclenche AUCUN envoi : elle choisit seulement quelle
  // version du brouillon de feedback la fenêtre affichera.
  async function handleStatusChange(status) {
    setActionLoading(true);
    const res = await updateCandidateStatus(candidatId, status);
    if (res.success) {
      setCandidate(prev => ({ ...prev, status }));
    }
    setActionLoading(false);
  }

  function handleFeedbackSent(sentAt) {
    setFeedbackSentAt(sentAt);
    getMailLogs(jobId).then(res => res.success && setMailLogs(res.logs.filter(l => l.candidate_id === candidatId)));
  }

  async function handleDelete() {
    if (!confirm(t("dashboard.candidateDetail.deleteConfirm"))) return;
    setActionLoading(true);
    const res = await deleteCandidate(candidatId);
    if (res.success) {
      router.push(`/jobs/${jobId}?tab=candidats`);
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

  const crumbs = [
    { label: candidate?.jobs?.title || t("dashboard.nav.jobs"), href: `/jobs/${jobId}` },
    { label: t("dashboard.jobDetail.tabs.candidats"), href: `/jobs/${jobId}?tab=candidats` },
  ];

  if (loading) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="…" />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  if (!candidate) {
    return (
      <>
        <PageHeader crumbs={crumbs} title="—" />
        <div className="ds-empty" style={{ padding: "64px 20px" }}>
          <span className="ds-empty-title">{t("dashboard.candidateDetail.notFound")}</span>
          <button type="button" className="ds-btn ds-btn-md" onClick={() => router.push(`/jobs/${jobId}?tab=candidats`)} style={{ marginTop: 10 }}>{t("dashboard.candidateDetail.back")}</button>
        </div>
      </>
    );
  }

  const nom = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email;
  const tonStatut = TON_STATUT[candidate.status];
  const jobCriteria = candidate.jobs?.extracted_criteria || {};
  const rep = candidate.experience_report;

  // Points de la simulation : la somme des points de contrôle de toutes les étapes.
  const etapesNotees = (rep?.steps || []).filter((s) => s.criteria.length > 0);
  const pointsTotaux = pointsDe(etapesNotees.flatMap((s) => s.criteria));

  // ─── Dépliage ───
  const cles = rep ? [
    "score", "evidence",
    ...rep.steps.flatMap((s) => [`step-${s.id}`, `reponse-${s.id}`, ...s.criteria.map((_, ci) => `crit-${s.id}-${ci}`)]),
  ] : ["score"];
  const defaut = (k) => k === "score" || k === "evidence" || k.startsWith("step-");
  const estOuvert = (k) => (k in ouverts ? ouverts[k] : defaut(k));
  const basculer = (k) => setOuverts((o) => ({ ...o, [k]: !estOuvert(k) }));
  const toutOuvert = cles.every(estOuvert);
  const toutBasculer = () => setOuverts(Object.fromEntries(cles.map((k) => [k, !toutOuvert])));

  const modules = resolveEnabledModules(candidate.jobs);
  const sousScores = [
    modules.cv && { label: "CV", score: candidate.score_cv },
    (candidate.jobs?.assessment_config?.modules?.skills_tests?.enabled ?? false) && { label: t("dashboard.candidateDetail.tests"), score: candidate.score_tests },
    ((candidate.jobs?.assessment_config?.modules?.ai_interview?.enabled) || (candidate.jobs?.ai_interview_config?.enabled)) && { label: t("dashboard.candidateDetail.aiInterviewShort"), score: candidate.score_interview },
    ((candidate.jobs?.assessment_config?.modules?.video_interview?.enabled) || (candidate.video_responses && candidate.video_responses.length > 0)) && { label: t("dashboard.candidateDetail.videoInterviewShort"), score: candidate.video_interview_score },
  ].filter(Boolean);

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={nom}
        actions={
          <>
            <button type="button" className="ds-btn" onClick={toutBasculer}>
              {toutOuvert ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
              {toutOuvert ? t("dashboard.candidateDetail.collapseAll") : t("dashboard.candidateDetail.expandAll")}
            </button>
            <button type="button" className={feedbackSentAt ? "ds-btn ds-btn-success" : "ds-btn"} onClick={() => setFeedbackModalOpen(true)}>
              {feedbackSentAt ? <CheckCircle2 size={15} /> : <Mail size={15} />}
              {feedbackSentAt
                ? t("dashboard.candidateDetail.feedbackSentOn", { date: formatDateNumeric(feedbackSentAt, locale) })
                : t("dashboard.candidateDetail.feedback")}
            </button>
          </>
        }
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start", padding: "18px 20px 24px" }}>

        {/* ── Fiche du candidat ── */}
        <div style={{ flex: "1 1 250px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 10 }}>
          <section aria-label={t("dashboard.candidateDetail.candidateCard")} className="ds-panel">
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 0" }}>
              <span className="ds-avatar" style={{ width: 42, height: 42, borderRadius: 12, fontSize: 14 }}>{initialesDe(candidate.first_name, candidate.last_name, candidate.email)}</span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.01em" }}>{nom}</span>
                <span className="ds-sub" style={{ overflowWrap: "anywhere" }}>{candidate.email}</span>
              </span>
            </div>
            <dl className="ds-inset ds-kv" style={{ padding: 12 }}>
              <div>
                <dt>{t("dashboard.candidateDetail.status")}</dt>
                <dd className={`ds-chip ${tonStatut ? `ds-chip-${tonStatut}` : ""}`}><span className={`ds-dot ds-dot-${tonStatut || "grey"}`} />{candidateStatusLabel(t, candidate.status)}</dd>
              </div>
              <div>
                <dt>{t("dashboard.candidateDetail.invitedOn")}</dt>
                <dd className="ds-chip">{candidate.created_at ? formatDateLong(candidate.created_at, locale) : "—"}</dd>
              </div>
              <div>
                <dt>{t("dashboard.candidateDetail.completedOn")}</dt>
                <dd className="ds-chip">{candidate.assessment_submitted_at ? formatDateLong(candidate.assessment_submitted_at, locale) : t("dashboard.candidateDetail.pending")}</dd>
              </div>
              <div>
                <dt>{t("dashboard.candidateDetail.gdpr")}</dt>
                <dd className={`ds-chip ${candidate.gdpr_consent_at ? "ds-chip-green" : "ds-chip-red"}`}>{candidate.gdpr_consent_at ? t("dashboard.candidateDetail.granted") : t("dashboard.candidateDetail.no")}</dd>
              </div>
              {Array.isArray(candidate.anti_cheat_metrics) && (
                <>
                  <div>
                    <dt>{t("dashboard.candidateDetail.windowExits")}</dt>
                    <dd className="ds-chip ds-mono">{candidate.anti_cheat_metrics.filter(e => e.type === 'window_blur' || e.type === 'tab_switch').length}</dd>
                  </div>
                  <div>
                    <dt>{t("dashboard.candidateDetail.pastes")}</dt>
                    <dd className="ds-chip ds-mono">{candidate.anti_cheat_metrics.filter(e => e.type === 'paste').length}</dd>
                  </div>
                </>
              )}
              {mailLogs.length > 0 && (
                <div>
                  <dt>{t("dashboard.candidateDetail.lastMail")}</dt>
                  <dd className="ds-chip">{t(`dashboard.candidateDetail.mail.${MAIL_LABEL[mailLogs[0].mail_type] || "rejection"}`)} · {formatDateNumeric(mailLogs[0].sent_at, locale)}</dd>
                </div>
              )}
            </dl>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 5px 5px" }}>
              {candidate.cv_url && (
                <a href={candidate.cv_url} target="_blank" rel="noopener noreferrer" className="ds-btn ds-btn-soft" style={{ height: 38 }}>
                  <FileText size={15} /> {t("dashboard.candidateDetail.viewOriginalCv")}
                </a>
              )}
              <button type="button" className="ds-btn ds-btn-primary" style={{ height: 38 }} onClick={() => handleStatusChange("shortlisted")} disabled={actionLoading}>
                {t("dashboard.candidateDetail.validateProfile")}
              </button>
              <button type="button" className="ds-btn" style={{ height: 38 }} onClick={() => handleStatusChange("next_step")} disabled={actionLoading}>
                {t("dashboard.candidateDetail.actions.nextStep")}
              </button>
              <button type="button" className="ds-btn" style={{ height: 38 }} onClick={() => handleStatusChange("rejected")} disabled={actionLoading}>
                {t("dashboard.candidateDetail.actions.reject")}
              </button>
              <button type="button" className="ds-btn ds-btn-ghost" onClick={handleDelete} disabled={actionLoading} style={{ height: 34, fontSize: 13, color: "var(--ds-red)" }}>
                <Trash2 size={14} /> {t("dashboard.candidateDetail.deleteCandidate")}
              </button>
            </div>
          </section>
        </div>

        {/* ── Le rapport ── */}
        <div style={{ flex: "3 1 600px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Score global */}
          <section aria-labelledby="ds-score" className="ds-panel">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "5px 5px 0 10px" }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <h2 id="ds-score" className="ds-h2">{t("dashboard.candidateDetail.globalScore")}</h2>
                <span className="ds-sub">{t("dashboard.candidateDetail.globalScoreHelp")}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!estOuvert("score") && <TagScore score={candidate.score_global} />}
                <Chevron ouvert={estOuvert("score")} onClick={() => basculer("score")} label={t("dashboard.candidateDetail.globalScore")} />
              </span>
            </div>
            {estOuvert("score") && (
              <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18 }}>
                <Jauge score={candidate.score_global} />
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 200 }}>
                  {pointsTotaux ? (
                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                      {tNodes(t("dashboard.candidateDetail.pointsOutOf"), {
                        pts: <span key="p" className="ds-mono" style={{ fontWeight: 500 }}>{pointsTotaux.pts}</span>,
                        max: <span key="m" className="ds-mono" style={{ fontWeight: 500 }}>{pointsTotaux.max}</span>,
                      })}
                    </span>
                  ) : (
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{candidate.score_global != null ? getScoreColor(t, candidate.score_global).label : t("dashboard.candidateDetail.pending")}</span>
                  )}
                  {rep && <span className="ds-sub">{t("dashboard.candidateDetail.stepsScored", { count: etapesNotees.length })}</span>}
                </span>
                {sousScores.length > 0 && (
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {sousScores.map((s) => (
                      <span key={s.label} className="ds-chip ds-chip-lg" style={{ gap: 8 }}>
                        {s.label}
                        <span className="ds-mono" style={{ fontWeight: 500, color: s.score != null ? ton(s.score).encre : "var(--ds-ink-5)" }}>{s.score != null ? `${s.score}%` : "—"}</span>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}
          </section>

          {/* CV Analysis Module (hérité) */}
          {candidate.ai_summary && (
            <section className="ds-panel">
              <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
                <FileText size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.candidateDetail.cvAnalysis")}
              </h2>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, lineHeight: 1.65, color: "var(--ds-ink-2)" }}>{candidate.ai_summary}</p>

                {/* Score Breakdown per Criterion */}
                {candidate.cv_score_breakdown && candidate.cv_score_breakdown.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>{t("dashboard.candidateDetail.perCriterion")}</span>
                    {candidate.cv_score_breakdown.map((item, idx) => {
                      const skillFromJob = [...(jobCriteria.hard_skills || []), ...(jobCriteria.soft_skills || [])].find(s => s.name === item.name);
                      return (
                        <div key={idx} className="ds-card" style={{ padding: 12, borderRadius: 10, boxShadow: "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, gap: 8 }}>
                            <span style={{ fontWeight: 500 }}>
                              {item.name}
                              {skillFromJob && skillFromJob.taxonomy_id && (
                                <span className="ds-chip ds-mono" style={{ height: 20, marginLeft: 6, fontSize: 11 }} title={t("dashboard.candidateDetail.taxonomyId")}>
                                  {skillFromJob.taxonomy_id}
                                </span>
                              )}
                            </span>
                            <TagScore score={item.score} />
                          </div>
                          {skillFromJob && skillFromJob.evidence && (
                            <div style={{ fontSize: 12, color: "var(--ds-blue)", fontStyle: "italic", marginBottom: 6 }}>
                              {t("dashboard.candidateDetail.expectation", { text: skillFromJob.evidence })}
                            </div>
                          )}
                          {item.reason && <p className="ds-sub" style={{ lineHeight: 1.45 }}>{item.reason}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {(candidate.green_flags?.length > 0 || candidate.red_flags?.length > 0) && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {candidate.green_flags?.length > 0 && (
                      <div style={{ background: "var(--ds-green-bg)", padding: 12, borderRadius: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-green-ink)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.strengths")}</p>
                        {candidate.green_flags.map((f, i) => <div key={i} style={{ fontSize: 13, color: "var(--ds-green-ink)" }}>• {f}</div>)}
                      </div>
                    )}
                    {candidate.red_flags?.length > 0 && (
                      <div style={{ background: "var(--ds-red-bg)", padding: 12, borderRadius: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-red)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.watchPoints")}</p>
                        {candidate.red_flags.map((f, i) => <div key={i} style={{ fontSize: 13, color: "var(--ds-red)" }}>• {f}</div>)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Rapport d'évidence : synthèse et usage de l'assistant IA */}
          {rep && (
            <section aria-labelledby="ds-evidence" className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "5px 5px 0 10px" }}>
                <h2 id="ds-evidence" className="ds-h2">{t("dashboard.candidateDetail.evidenceReport")}</h2>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={`ds-chip ${rep.scored ? "ds-chip-green" : "ds-chip-amber"}`}>
                    <span className={`ds-dot ${rep.scored ? "ds-dot-green" : "ds-dot-amber"}`} />
                    {rep.scored ? t("dashboard.candidateDetail.scored") : t("dashboard.candidateDetail.inProgress")}
                  </span>
                  <Chevron ouvert={estOuvert("evidence")} onClick={() => basculer("evidence")} label={t("dashboard.candidateDetail.evidenceReport")} />
                </span>
              </div>
              {estOuvert("evidence") && (
                <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {rep.summary && <p style={{ margin: 0, lineHeight: 1.65, color: "var(--ds-ink-2)" }}>{rep.summary}</p>}

                  {rep.ai_usage_used ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#FFFFFF", border: "1px solid var(--ds-line)", fontSize: 13, color: "var(--ds-ink-2)" }}>
                      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ds-ink)" }}><Bot size={15} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.candidateDetail.aiUsage")}</span>
                        {rep.ai_usage_score != null && <TagScore score={rep.ai_usage_score} />}
                      </span>
                      <span>
                        {/* Le mot mis en italique est au milieu de la phrase et ne
                            tombe pas au même endroit en anglais : d'où tNodes()
                            plutôt qu'un découpage en trois morceaux. */}
                        {tNodes(t("dashboard.candidateDetail.aiUsageHelp"), {
                          em: <em key="e">{t("dashboard.candidateDetail.aiUsageHelpEm")}</em>,
                        })}
                        {rep.ai_usage_prompts > 0 &&
                          t("dashboard.candidateDetail.aiPrompts", { count: rep.ai_usage_prompts })}.
                      </span>
                      {/* Les trois axes de jugement, énoncés au recruteur : ce sont
                          ceux imposés à l'évaluateur dans le prompt de scoring. */}
                      <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {["framing", "iteration", "criticalEye"].map((axe) => (
                          <span key={axe} className="ds-chip" style={{ background: "var(--ds-soft)" }}>{t(`dashboard.candidateDetail.aiAxes.${axe}`)}</span>
                        ))}
                      </span>
                      {rep.ai_usage_justification ? (
                        <p style={{ margin: 0, padding: "9px 11px", borderRadius: 9, background: "var(--ds-blue-10)", color: "#1E2D5E", fontWeight: 500 }}>{rep.ai_usage_justification}</p>
                      ) : (
                        <span className="ds-sub" style={{ fontStyle: "italic", fontSize: 12 }}>{t("dashboard.candidateDetail.justificationUnavailable")}</span>
                      )}
                    </div>
                  ) : rep.scored && (
                    // Sans cette ligne, l'absence de note d'usage de l'IA ressemble
                    // à une donnée manquante alors que c'est un choix assumé.
                    <p style={{ margin: 0, display: "flex", gap: 10, padding: "10px 12px", borderRadius: 9, background: "#FFFFFF", border: "1px solid var(--ds-line)", fontSize: 13, color: "var(--ds-ink-2)" }}>
                      <Info size={15} style={{ flex: "none", marginTop: 2, color: "var(--ds-ink-4)" }} />
                      <span>
                        <span style={{ fontWeight: 500, color: "var(--ds-ink)" }}>{t("dashboard.candidateDetail.aiUsageNotScored")}.</span>{" "}
                        {tNodes(t("dashboard.candidateDetail.aiUsageNotScoredHelp"), {
                          em: <em key="e">{t("dashboard.candidateDetail.aiUsageHelpEm")}</em>,
                        })}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Une carte par étape, dans l'ordre du parcours */}
          {rep && rep.steps.map((step, i) => (
            <CarteEtape
              key={step.id}
              step={step}
              index={i}
              nomCandidat={candidate.first_name || nom}
              estOuvert={estOuvert}
              basculer={basculer}
            />
          ))}

          {/* Tests de compétences (hérité) */}
          {!candidate.experience_run && candidate.test_sessions && candidate.test_sessions.length > 0 && (
            <section className="ds-panel">
              <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
                <TrendingUp size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.candidateDetail.skillsTests")}
              </h2>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {candidate.test_sessions.map((session) => {
                  const isAiTest = session.test_id === AI_PROFICIENCY_TEST_ID;
                  const hasFeedback = isAiTest && session.ai_feedback?.evaluations?.length > 0;
                  const feedbackOpen = openAiFeedback[session.id];
                  const c = ton(session.score);
                  return (
                    <div key={session.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className="ds-card" style={{ padding: 14, borderRadius: 10, boxShadow: "none", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
                            {isAiTest && <Sparkles size={14} style={{ color: "var(--ds-blue)" }} />}
                            {session.assessment_tests?.name}
                          </div>
                          <div className="ds-sub" style={{ fontSize: 12, textTransform: "capitalize" }}>
                            {session.assessment_tests?.category} • {session.completed_at ? t("dashboard.candidateDetail.completedOn") + " " + formatDateNumeric(session.completed_at, locale) : t("dashboard.candidateDetail.pending")}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {hasFeedback && (
                            <button type="button" className={`ds-btn ds-btn-sm ${feedbackOpen ? "ds-btn-primary" : "ds-btn-soft"}`} onClick={() => setOpenAiFeedback(prev => ({ ...prev, [session.id]: !feedbackOpen }))}>
                              <Sparkles size={12} /> {t("dashboard.candidateDetail.aiAnalysis")}
                            </button>
                          )}
                          {!isAiTest && session.cheat_flags?.slow_candidate && (
                            <span className="ds-chip ds-chip-amber"><Clock size={12} /> {t("dashboard.candidateDetail.slowerThanAverage")}</span>
                          )}
                          {!isAiTest && session.cheat_flags?.top_performer && (
                            <span className="ds-chip"><Star size={12} fill="currentColor" /> {t("dashboard.candidateDetail.topPerformer")}</span>
                          )}
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="ds-meter" style={{ width: 80, height: 5, background: c.piste }}><span style={{ width: `${session.score || 0}%`, background: c.barre }} /></span>
                            <span className="ds-mono" style={{ fontWeight: 500, color: c.encre }}>{session.score != null ? `${session.score}%` : "—"}</span>
                          </span>
                        </div>
                      </div>

                      {/* AI Feedback panel */}
                      {hasFeedback && feedbackOpen && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-blue)" }}>
                            {t("dashboard.candidateDetail.aiAnalysisCount", { count: session.ai_feedback.evaluations.length })}
                          </span>
                          {session.ai_feedback.evaluations.map((ev, idx) => {
                            const niveaux = { 0: ["low", t("dashboard.candidateDetail.scoreLevel.insufficient")], 1: ["mid", t("dashboard.candidateDetail.scoreLevel.average")], 2: ["high", t("dashboard.candidateDetail.scoreLevel.excellent")] };
                            const [tn, label] = niveaux[ev.score] || niveaux[0];
                            const qIdx = session.answers?.findIndex(a => a.question_id === ev.question_id);
                            const answer = qIdx >= 0 ? session.answers[qIdx]?.text_answer : null;
                            return (
                              <div key={idx} style={{ padding: 12, borderRadius: 9, border: "1px solid var(--ds-line-inset)", background: "var(--ds-soft)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                  <span className="ds-sub" style={{ fontSize: 12 }}>{t("dashboard.candidateDetail.questionN", { n: idx + 1 })}</span>
                                  <span className={`ds-tag ds-tag-${tn}`}>{label} ({ev.score}/2)</span>
                                </div>
                                {answer && <p style={{ margin: "0 0 6px", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 }}>« {answer} »</p>}
                                {ev.justification && <p className="ds-sub" style={{ lineHeight: 1.5 }}>{ev.justification}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Entretien IA (hérité) */}
          {!candidate.experience_run && candidate.interview_summary && (
            <section className="ds-panel">
              <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
                <MessageSquare size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.candidateDetail.aiInterview")}
              </h2>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, lineHeight: 1.65, color: "var(--ds-ink-2)" }}>{candidate.interview_summary}</p>

                {candidate.interview_score_breakdown && candidate.interview_score_breakdown.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>{t("dashboard.candidateDetail.perQuestion")}</span>
                    {candidate.interview_score_breakdown.map((item, idx) => {
                      const skillFromJob = [...(jobCriteria.hard_skills || []), ...(jobCriteria.soft_skills || [])].find(s =>
                        s.name.toLowerCase() === (item.skill || '').toLowerCase() ||
                        item.question.toLowerCase().includes(s.name.toLowerCase())
                      );
                      return (
                        <div key={idx} className="ds-card" style={{ padding: 12, borderRadius: 10, boxShadow: "none" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: "0 0 4px", fontWeight: 500, color: "var(--ds-blue)" }}>Q : {item.question}</p>
                              <p style={{ margin: 0, fontStyle: "italic" }}>R : {item.answer}</p>
                            </div>
                            <TagScore score={item.score * 10} />
                          </div>
                          {skillFromJob && skillFromJob.evidence && (
                            <div style={{ fontSize: 12, color: "var(--ds-blue)", fontStyle: "italic", marginBottom: 4 }}>
                              {t("dashboard.candidateDetail.expectation", { text: skillFromJob.evidence })}
                            </div>
                          )}
                          {item.explanation && <p className="ds-sub" style={{ lineHeight: 1.45, paddingTop: 8, borderTop: "1px dashed var(--ds-line)" }}>{item.explanation}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {candidate.interview_messages?.length > 0 && (
                  <button type="button" className="ds-btn ds-btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => setShowTranscript(!showTranscript)}>
                    {showTranscript ? t("dashboard.candidateDetail.hideTranscript") : t("dashboard.candidateDetail.showTranscript")}
                  </button>
                )}
                {showTranscript && candidate.interview_messages?.length > 0 && (
                  <div style={{ padding: 14, background: "#FFFFFF", borderRadius: 10, maxHeight: 400, overflowY: "auto", border: "1px solid var(--ds-line)" }}>
                    {candidate.interview_messages.map((msg, i) => (
                      <div key={i} style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ fontWeight: 500, color: msg.role === 'assistant' ? 'var(--ds-blue)' : 'var(--ds-ink)', marginBottom: 4 }}>
                          {msg.role === 'assistant' ? t("dashboard.candidateDetail.aiRecruiter") : nom}
                        </div>
                        <div>{msg.content.replace("[INTERVIEW_TERMINÉE]", "").trim()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Entretien vidéo (hérité) */}
          {!candidate.experience_run && candidate.video_responses && candidate.video_responses.length > 0 && (
            <section className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 10px 0" }}>
                <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Video size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.candidateDetail.videoInterview")}
                </h2>
                {candidate.video_interview_score != null && candidate.video_interview_score > 0 && (
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span className="ds-chip ds-chip-lg" style={{ gap: 8 }}>
                      {t("dashboard.candidateDetail.averageScore")}
                      <span className="ds-mono" style={{ fontWeight: 500, color: ton(candidate.video_interview_score).encre }}>
                        {candidate.video_interview_score}%{candidate.video_score_completeness && !candidate.video_score_completeness.is_complete && "*"}
                      </span>
                    </span>
                    {candidate.video_score_completeness && !candidate.video_score_completeness.is_complete && (
                      <span className="ds-chip ds-chip-amber">
                        <AlertTriangle size={13} /> {t("dashboard.candidateDetail.questionsScored", { scored: candidate.video_score_completeness.evaluated, total: candidate.video_score_completeness.total })} {t("dashboard.candidateDetail.partialScore")}
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {candidate.video_responses.map((resp, idx) => {
                  const statuts = {
                    pending: ["", t("dashboard.candidateDetail.pending")],
                    recorded: ["ds-chip-blue", t("dashboard.candidateDetail.saved")],
                    transcribing: ["ds-chip-amber", t("dashboard.candidateDetail.transcribing")],
                    evaluating: ["ds-chip-blue", t("dashboard.candidateDetail.aiAnalyzing")],
                    evaluated: ["ds-chip-green", t("dashboard.candidateDetail.analyzed")],
                    manual_review: ["ds-chip-red", t("dashboard.candidateDetail.manualReview")],
                  };
                  const [classe, libelle] = statuts[resp.status] || ["", resp.status];

                  return (
                    <div key={resp.id} className="ds-card" style={{ borderRadius: 10, boxShadow: "none", overflow: "hidden" }}>
                      {/* En-tête question */}
                      <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--ds-line-2)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="ds-tag ds-tag-blue">{t("dashboard.candidateDetail.questionN", { n: idx + 1 })}</span>
                          <span style={{ fontWeight: 500 }}>{resp.question_text}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <span className={`ds-chip ${classe}`}>{libelle}</span>
                          {resp.ai_score != null && <TagScore score={resp.ai_score} />}
                        </div>
                      </div>

                      {/* Corps : transcription + analyse IA */}
                      {(resp.status === "evaluated" || resp.status === "manual_review") && (
                        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                          {resp.video_url && (
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.videoRecording")}</p>
                              <video src={resp.video_url} controls style={{ width: "100%", maxWidth: 400, borderRadius: 10, border: "1px solid var(--ds-line)", backgroundColor: "black" }} />
                            </div>
                          )}

                          {resp.transcript && (
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.candidateTranscript")}</p>
                              <div style={{ background: "var(--ds-soft)", border: "1px solid var(--ds-line-inset)", borderRadius: 9, padding: 12, fontSize: 13, lineHeight: 1.6, fontStyle: "italic" }}>
                                « {resp.transcript} »
                              </div>
                            </div>
                          )}

                          {resp.status === "manual_review" && (
                            <div style={{ background: "var(--ds-red-bg)", border: "1px solid var(--ds-red-inset)", borderRadius: 10, padding: 12 }}>
                              <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-red)", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}>
                                <AlertTriangle size={15} /> {t("dashboard.candidateDetail.manualReview")}
                              </h4>
                              <p style={{ fontSize: 13, color: "var(--ds-red-ink-2)", lineHeight: 1.5, margin: 0 }}>
                                {resp.ai_feedback || t("dashboard.candidateDetail.transcriptTooShort")}
                              </p>
                            </div>
                          )}

                          {/* Détail par critère */}
                          {resp.status === "evaluated" && resp.ai_criteria_scores && resp.ai_criteria_scores.length > 0 && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-blue)", display: "flex", alignItems: "center", gap: 5 }}>
                                <Sparkles size={12} /> {t("dashboard.candidateDetail.criteriaDetail")}
                              </span>
                              {resp.ai_criteria_scores.map((crit, cIdx) => (
                                <div key={cIdx} style={{ border: "1px solid var(--ds-line)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontWeight: 500 }}>{crit.criterion_name}</span>
                                    <TagScore score={crit.score} />
                                  </div>
                                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{crit.justification}</p>
                                  <div style={{ padding: "8px 10px", borderRadius: 8, background: crit.verbatim_verified ? "var(--ds-green-bg)" : "var(--ds-amber-bg)" }}>
                                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: crit.verbatim_verified ? "var(--ds-green-ink)" : "var(--ds-amber-ink)" }}>
                                      {crit.verbatim_verified ? t("dashboard.candidateDetail.quoteVerified") : t("dashboard.candidateDetail.quoteNotVerified")}
                                    </div>
                                    <p style={{ margin: 0, fontStyle: "italic", fontSize: 13, opacity: crit.verbatim_verified ? 1 : 0.75 }}>
                                      « {crit.verbatim || t("dashboard.candidateDetail.noQuote")} »
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Points forts / Améliorations */}
                          {resp.status === "evaluated" && ((resp.ai_strengths?.length > 0) || (resp.ai_improvements?.length > 0)) && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              {resp.ai_strengths?.length > 0 && (
                                <div style={{ background: "var(--ds-green-bg)", borderRadius: 10, padding: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-green-ink)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.strengths")}</p>
                                  {resp.ai_strengths.map((s, i) => <div key={i} style={{ fontSize: 13, color: "var(--ds-green-ink)", lineHeight: 1.5 }}>• {s}</div>)}
                                </div>
                              )}
                              {resp.ai_improvements?.length > 0 && (
                                <div style={{ background: "var(--ds-amber-bg)", borderRadius: 10, padding: 12 }}>
                                  <p style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-amber-ink)", margin: "0 0 6px" }}>{t("dashboard.candidateDetail.improvementAreas")}</p>
                                  {resp.ai_improvements.map((s, i) => <div key={i} style={{ fontSize: 13, color: "var(--ds-amber-ink)", lineHeight: 1.5 }}>• {s}</div>)}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notation manuelle */}
                          {(candidate.jobs?.assessment_config?.modules?.video_interview?.evaluation_mode === "manual" || resp.status === "manual_review") && (
                            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              <h4 className="ds-h3">
                                {resp.status === "evaluated" ? t("dashboard.candidateDetail.editScore") : t("dashboard.candidateDetail.scoreThisAnswer")}
                              </h4>
                              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    {[1, 2, 3, 4, 5].map(star => {
                                      const currentScore = manualScores[resp.id]?.score || (resp.ai_score ? Math.round(resp.ai_score / 20) : 0);
                                      const isSelected = currentScore >= star;
                                      return (
                                        <button
                                          key={star}
                                          type="button"
                                          onClick={() => setManualScores(prev => ({ ...prev, [resp.id]: { ...prev[resp.id], score: star } }))}
                                          aria-label={`${star}/5`}
                                          style={{ background: "transparent", border: "none", cursor: "pointer", color: isSelected ? "var(--ds-amber)" : "#D5DBE8", padding: 0 }}
                                        >
                                          <Star size={24} fill={isSelected ? "currentColor" : "transparent"} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <span className="ds-sub" style={{ fontSize: 12, textAlign: "center" }}>{t("dashboard.candidateDetail.scoreOutOf5")}</span>
                                </div>
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 250 }}>
                                  <textarea
                                    placeholder={t("dashboard.candidateDetail.justificationPlaceholder")}
                                    className="ds-textarea"
                                    rows={2}
                                    value={manualScores[resp.id]?.justification !== undefined ? manualScores[resp.id].justification : (resp.status === "evaluated" && !resp.ai_criteria_scores ? resp.ai_feedback : "")}
                                    onChange={e => setManualScores(prev => ({ ...prev, [resp.id]: { ...prev[resp.id], justification: e.target.value } }))}
                                    style={{ fontSize: 13 }}
                                  />
                                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                      type="button"
                                      className="ds-btn ds-btn-primary ds-btn-sm"
                                      disabled={!manualScores[resp.id]?.score && !resp.ai_score || submittingScore}
                                      onClick={() => handleManualVideoScore(resp.id)}
                                    >
                                      {submittingScore ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : t("dashboard.candidateDetail.confirmScore")}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Statuts intermédiaires (pas encore analysé) */}
                      {resp.status !== "evaluated" && resp.status !== "pending" && resp.status !== "manual_review" && (
                        <div className="ds-sub" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                          {t("dashboard.candidateDetail.analysisInProgress")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>

      {feedbackModalOpen && candidate && (
        <FeedbackModal
          isOpen={feedbackModalOpen}
          onClose={() => setFeedbackModalOpen(false)}
          candidateId={candidatId}
          candidateName={nom}
          onSent={handleFeedbackSent}
        />
      )}
    </>
  );
}

// ─── Une étape du rapport ────────────────────────────────────────────────────
// En-tête : numéro, titre, nature de l'étape, score. Dessous, la réponse du
// candidat (repliée) puis ses critères, groupés par compétence.
function CarteEtape({ step, index, nomCandidat, estOuvert, basculer }) {
  const { t } = useI18n();
  const { cle, Icone } = natureEtape(step);
  const nature = cle === "call" || cle === "chat"
    ? t(`dashboard.experienceEditor.overview.${cle}`)
    : t(`dashboard.experienceEditor.coverage.format.${cle}`);
  const points = pointsDe(step.criteria);
  const score = points
    ? Math.round((points.pts / Math.max(1, points.max)) * 100)
    : step.criteria.length ? Math.round(step.criteria.reduce((s, c) => s + (c.score || 0), 0) / step.criteria.length) : null;
  const persona = step.sandbox_kind === "persona" ? step.config?.persona : null;
  const conversation = persona && step.response?.meta?.persona ? repliques(persona, step.response.meta.persona) : null;
  const nbQuestionsIA = step.ai_messages.filter((m) => m.role === "user").length;
  const cleEtape = `step-${step.id}`;
  const cleReponse = `reponse-${step.id}`;
  const titre = step.title || expKindLabel(t, step.kind);

  return (
    <section aria-labelledby={`ds-etape-${step.id}`} className="ds-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "5px 5px 0 10px" }}>
        <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, minWidth: 0 }}>
          <h2 id={`ds-etape-${step.id}`} className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span className="ds-mono" style={{ width: 24, height: 24, flex: "none", borderRadius: 7, background: "var(--ds-blue)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>{index + 1}</span>
            {titre}
          </h2>
          <span className="ds-chip"><Icone size={13} /> {nature.charAt(0).toUpperCase() + nature.slice(1)}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {score != null && <TagScore score={score} points={points} />}
          <Chevron ouvert={estOuvert(cleEtape)} onClick={() => basculer(cleEtape)} label={titre} />
        </span>
      </div>

      {estOuvert(cleEtape) && (
        <>
          {/* La réponse du candidat : conversation, texte, vidéo, échanges avec l'assistant */}
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
            <button
              type="button"
              onClick={() => basculer(cleReponse)}
              aria-expanded={estOuvert(cleReponse)}
              className="ds-critere-tete"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "4px 4px 4px 6px", border: 0, borderRadius: 8, background: "transparent", font: "inherit", textAlign: "left", color: "var(--ds-ink)", cursor: "pointer" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>
                {conversation ? <Phone size={14} /> : <FileText size={14} />}
                {conversation ? t("dashboard.candidateDetail.conversationTitle") : t("dashboard.candidateDetail.candidateAnswer")}
                {nbQuestionsIA > 0 && <span className="ds-chip" style={{ height: 20 }}><Bot size={12} /> {t("dashboard.candidateDetail.aiExchanges", { count: nbQuestionsIA })}</span>}
              </span>
              <ChevronDown size={15} style={{ color: "var(--ds-ink-5)", transition: "transform .15s", transform: estOuvert(cleReponse) ? "none" : "rotate(-90deg)" }} />
            </button>

            {estOuvert(cleReponse) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {step.prompt && <p className="ds-sub" style={{ whiteSpace: "pre-wrap", padding: "0 6px" }}>{step.prompt}</p>}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ flex: "3 1 340px", minWidth: 0 }}>
                    {conversation ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", padding: 12, borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
                        {conversation.map((m, mi) => {
                          const moi = m.role === "candidate";
                          return (
                            <div key={mi} style={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "86%", alignSelf: moi ? "flex-end" : "flex-start", alignItems: moi ? "flex-end" : "flex-start" }}>
                              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ds-ink-4)" }}>{moi ? nomCandidat : (persona?.name || t("dashboard.candidateDetail.interlocutor"))}</span>
                              <span style={{
                                padding: "9px 11px", borderRadius: 12, lineHeight: 1.5, fontSize: 13, whiteSpace: "pre-wrap",
                                ...(moi
                                  ? { background: "var(--ds-blue)", color: "#FFFFFF", borderBottomRightRadius: 4 }
                                  : { background: "#FFFFFF", border: "1px solid var(--ds-line)", borderBottomLeftRadius: 4 }),
                              }}>{m.content}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: "#FFFFFF", border: "1px solid var(--ds-line)", borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", overflowWrap: "break-word", maxHeight: 360, overflowY: "auto" }}>
                        {expAnswerText(t, step)}
                      </div>
                    )}
                  </div>
                  {step.response?.video_url && (
                    <div style={{ flex: "2 1 220px", minWidth: 0 }}>
                      <video src={step.response.video_url} controls style={{ width: "100%", borderRadius: 10, background: "var(--ds-ink)" }} />
                    </div>
                  )}
                </div>

                {/* QCM : propositions vues par le candidat + corrigé. */}
                {step.response_format === "qcm" && <QcmCorrection step={step} />}

                {/* Log complet des échanges avec l'assistant IA sur CE step */}
                {step.ai_messages.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-blue)", display: "flex", alignItems: "center", gap: 6 }}>
                      <Bot size={13} /> {t("dashboard.candidateDetail.aiExchangesTitle", { count: nbQuestionsIA })}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto", padding: 12, borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)" }}>
                      {step.ai_messages.map((m, mi) => (
                        <div key={mi} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "break-word", ...(m.role === "user" ? { background: "var(--ds-blue)", color: "#FFFFFF", borderBottomRightRadius: 4 } : { background: "var(--ds-soft)", border: "1px solid var(--ds-line-inset)", borderBottomLeftRadius: 4 }) }}>
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Les critères, regroupés par compétence. Pas de score agrégé par
              compétence : chaque sous-dimension garde sa note et sa
              justification, le regroupement est purement visuel. */}
          {step.criteria.length > 0 && groupScoresBySkill(step.criteria).map((group, gi) => (
            <div key={gi} className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10 }}>
              {group.skill && <span style={{ padding: "2px 4px", fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>{t("dashboard.candidateDetail.skillCriteria", { skill: group.skill })}</span>}
              {group.items.map((cs) => {
                const ci = step.criteria.indexOf(cs);
                const cleCritere = `crit-${step.id}-${ci}`;
                return <CarteCritere key={ci} cs={cs} step={step} ouvert={estOuvert(cleCritere)} onToggle={() => basculer(cleCritere)} />;
              })}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

// ─── Un critère noté ─────────────────────────────────────────────────────────
function CarteCritere({ cs, step, ouvert, onToggle }) {
  const { t } = useI18n();
  const nom = cs.sub_dimension_name || cs.criterion_name;
  const points = pointsCritere(cs);
  const c = ton(cs.score);
  const grille = (step.bars || []).find((b) => b.name === nom);

  return (
    <div style={{ display: "flex", flexDirection: "column", borderRadius: 10, background: "#FFFFFF", border: "1px solid var(--ds-line)", overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={ouvert}
        className="ds-critere-tete"
        style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 12px 12px 14px", border: 0, background: "transparent", font: "inherit", textAlign: "left", color: "var(--ds-ink)", cursor: "pointer" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600 }}>{nom}</span>
          {/* Le tier pèse dans le score final : il se lit ici. Absent sur un
              critère dont la compétence n'est pas dans la liste de l'offre. */}
          {cs.tier && (
            <span style={{ height: 20, display: "inline-flex", alignItems: "center", padding: "0 6px", borderRadius: 6, fontSize: 11, fontWeight: 500, ...(cs.tier === "must_have" ? { border: "1px solid var(--ds-blue-30)", color: "var(--ds-blue)" } : { border: "1px solid var(--ds-line)", color: "var(--ds-ink-3)" }) }}>
              {t(`dashboard.candidateDetail.tier.${cs.tier}`)}
            </span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="ds-meter" style={{ width: 80, height: 5, background: c.piste }}><span style={{ width: `${Math.max(cs.score || 0, 2)}%`, background: c.barre }} /></span>
          <span className="ds-mono" style={{ fontSize: 13, fontWeight: 500, color: c.encre, minWidth: 104, textAlign: "right" }}>
            {points ? `${points.pts}/${points.max} pts · ${cs.score}%` : cs.bars_level != null ? `N${cs.bars_level} · ${cs.score}%` : `${cs.score}%`}
          </span>
          <ChevronRight size={15} style={{ color: "var(--ds-ink-5)", transition: "transform .15s", transform: ouvert ? "rotate(90deg)" : "none" }} />
        </span>
      </button>

      {ouvert && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px 14px" }}>
          {cs.observations && <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ds-ink-2)" }}>{cs.observations}</p>}
          {cs.justification && <p style={{ margin: 0, padding: "9px 11px", borderRadius: 9, background: "var(--ds-blue-10)", color: "#1E2D5E", fontSize: 13, fontWeight: 500 }}>{cs.justification}</p>}

          {cs.format === "checkpoints" && <CheckpointList checkpoints={cs.checkpoints} />}

          {/* L'échelle sur laquelle cette note a été posée. Absente pour le QCM
              et les champs factuels CRM, qui sont corrigés sans grille. */}
          {grille && <BarsScale levels={grille.bars_levels} attributed={cs.bars_level} />}

          {/* Sandbox CRM — correction déterministe, champ par champ. La ligne
              du piège est mise en évidence : c'est le signal qui distingue
              "a lu" de "a croisé les sources". */}
          {cs.crm_details?.length > 0 && (
            <div style={{ border: "1px solid var(--ds-line-inset)", borderRadius: 9, overflow: "hidden" }}>
              {cs.crm_details.map((d, di) => (
                <div key={di} style={{
                  display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", fontSize: 13,
                  borderTop: di === 0 ? "none" : "1px solid var(--ds-line-inset)",
                  background: d.is_trap ? "#FFFCF5" : "#FFFFFF",
                }}>
                  <span style={{ flexShrink: 0, fontWeight: 600, color: d.correct ? "var(--ds-green-ink)" : "var(--ds-red)" }}>{d.correct ? "✓" : "✗"}</span>
                  <span style={{ flex: "0 0 34%", fontWeight: 500 }}>
                    {d.label}
                    {d.is_trap && <span className="ds-tag ds-tag-mid" style={{ marginLeft: 6, fontFamily: "inherit", fontSize: 11 }}>{t("dashboard.candidateDetail.trap")}</span>}
                  </span>
                  <span style={{ flex: 1, color: d.correct ? "var(--ds-ink)" : "var(--ds-red)", overflowWrap: "anywhere" }}>
                    {d.given ?? <em style={{ color: "var(--ds-ink-4)" }}>{t("dashboard.candidateDetail.notFilled")}</em>}
                  </span>
                  {!d.correct && (
                    <span style={{ flex: "0 0 28%", color: "var(--ds-ink-3)", overflowWrap: "anywhere" }}>{t("dashboard.candidateDetail.expected")} {d.expected}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {cs.verbatim && (
            <span style={{ alignSelf: "flex-start", padding: "5px 9px", borderRadius: 7, background: cs.verbatim_verified ? "#F3F6FC" : "var(--ds-amber-bg)", fontSize: 13, fontStyle: "italic", color: "var(--ds-ink-2)" }}>
              « {cs.verbatim} »
              <span style={{ fontStyle: "normal", fontSize: 11, color: cs.verbatim_verified ? "var(--ds-green-ink)" : "var(--ds-amber-ink)", marginLeft: 6 }}>
                {cs.verbatim_verified ? t("dashboard.candidateDetail.verbatimVerified") : t("dashboard.candidateDetail.verbatimNotFound")}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
