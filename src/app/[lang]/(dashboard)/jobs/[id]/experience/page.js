"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Loader2, Sparkles, ChevronUp, ChevronDown, Trash2, Plus, Check,
  ArrowLeft, Bot, Video, Type, ListChecks, Code2, CircleHelp, ClipboardList,
  ShieldCheck, AlertTriangle, X,
} from "lucide-react";
import {
  getExperienceForJob, updateStep,
  addStep, deleteStep, moveStep, publishExperience, couvrirCompetence,
} from "@/lib/actions/experience";
import {
  listerCompetences, calculerCouverture, estCritereCheckpoints, etapeNoteeSansGrille,
  EXERCICES_CIBLE_MAX, CHECKPOINTS_MAX, MUST,
} from "@/lib/competences";
import { getJobDetail } from "@/lib/actions/candidate";
import ExperienceChatScreen from "@/components/assessment/ExperienceChatScreen";
import GenerationFeed, { streamExperienceGeneration, translateFeedError } from "@/components/assessment/GenerationFeed";
import { useToast } from "@/components/ui/Toast";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import { CODE_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants/codeLanguages";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { estimerMinutes } from "@/lib/experienceDuree";
import { DEFAUT_ECHANGES_IA } from "@/lib/constants/experience";

// Les `value` sont les valeurs STOCKÉES en base : elles restent en constantes.
// Les libellés se résolvent au rendu — une constante de module figerait le
// français avant même que le provider existe.
const RESPONSE_FORMAT_VALUES = [
  { value: "text", icon: Type },
  { value: "video", icon: Video },
  { value: "qcm", icon: ListChecks },
  { value: "choice", icon: CircleHelp },
  { value: "code", icon: Code2 },
];
const responseFormats = (t) =>
  RESPONSE_FORMAT_VALUES.map((f) => ({ ...f, label: t(`dashboard.experienceEditor.format.${f.value}`) }));

const SANDBOX_KIND_VALUES = ["none", "email", "client_reply", "document", "code", "crm"];
const sandboxKinds = (t) =>
  SANDBOX_KIND_VALUES.map((value) => ({ value, label: t(`dashboard.experienceEditor.sandboxKind.${value}`) }));

// `chat` est la valeur stockée, `message` la clé de traduction : les deux
// diffèrent historiquement, on ne renomme pas la donnée pour autant.
const CRM_SOURCE_TYPE_VALUES = [
  { value: "email", key: "email" },
  { value: "call_transcript", key: "call_transcript" },
  { value: "chat", key: "message" },
  { value: "note", key: "note" },
];
const crmSourceTypes = (t) =>
  CRM_SOURCE_TYPE_VALUES.map(({ value, key }) => ({
    value,
    label: t(`dashboard.experienceEditor.crm.sourceTypes.${key}`),
  }));

const CRM_FIELD_TYPES = ["text", "number", "select", "textarea", "date"];

const kindLabel = (t, kind) => t(`dashboard.experienceEditor.kind.${kind}`);

export default function ExperienceReviewPage() {
  const { t } = useI18n();
  const { id: jobId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genEvents, setGenEvents] = useState([]); // flux réel du pipeline serveur
  const [publishing, setPublishing] = useState(false);
  const [experience, setExperience] = useState(null);
  const [steps, setSteps] = useState([]);
  const [job, setJob] = useState(null);
  const [chatOpen, setChatOpen] = useState(false); // panneau chat d'ajustement (expérience existante)
  const [chatStarted, setChatStarted] = useState(false); // ≥1 échange → cache la génération directe
  const [covering, setCovering] = useState(null); // id de la compétence en cours de couverture

  // La liste validée de l'offre, et ce que la simulation en teste. Recalculée
  // à chaque rendu : elle doit suivre une étape enregistrée ou supprimée sans
  // attendre un rechargement.
  const competences = listerCompetences(job?.extracted_criteria || {});
  const couverture = calculerCouverture(steps, competences);

  useEffect(() => { load(); }, [jobId]);

  async function load() {
    setLoading(true);
    const [res, jobRes] = await Promise.all([getExperienceForJob(jobId), getJobDetail(jobId)]);
    if (jobRes?.success) setJob(jobRes.job);
    if (res.success) {
      setExperience(res.experience);
      setSteps(res.steps || []);
    } else {
      toast(res.error || t("dashboard.experienceEditor.loadError"), "error");
    }
    setLoading(false);
  }

  // Une retouche sur une version déjà commencée par un candidat en crée une
  // nouvelle (lib/experienceVersion.js) : les identifiants d'étape changent, il
  // faut recharger — et le dire, puisque la version affichée n'est plus celle
  // que les candidats engagés sont en train de passer.
  function annoncerVersion(res) {
    if (res?.forked) toast(t("dashboard.experienceEditor.forkedNotice", { version: res.version }));
  }

  // Le chat a généré l'expérience → on recharge : l'écran de relecture s'ouvre
  // automatiquement (flow chat-first, étape C).
  async function handleChatGenerated() {
    toast(t("dashboard.experienceEditor.generated"));
    await load();
  }

  // Le chat a réécrit UNE étape, en place. Rechargement identique, message
  // différent : rien d'autre n'a bougé, et le recruteur doit le savoir — c'est
  // toute la différence avec une régénération complète.
  async function handleStepRegenerated(res) {
    toast(t("dashboard.experienceEditor.stepRewritten"));
    annoncerVersion(res);
    await load();
  }

  // Même flux de génération que le chat : les étapes affichées sont celles que
  // le serveur pousse réellement, au moment où elles se produisent.
  async function handleGenerate() {
    setGenerating(true);
    setGenEvents([]);

    const res = await streamExperienceGeneration(jobId, "", (event) => {
      setGenEvents((prev) => [...prev, event]);
    });

    if (res.success) {
      toast(t("dashboard.experienceEditor.generatedShort"));
      await load();
    } else {
      toast(translateFeedError(t, res.error) || t("dashboard.experienceEditor.generationFailed"), "error");
    }
    setGenerating(false);
  }

  async function handlePublish() {
    // Le recruteur garde la décision — mais il ne doit jamais découvrir après
    // coup qu'une compétence indispensable n'était testée nulle part.
    if (couverture.manquantes.length) {
      const liste = couverture.manquantes.map((c) => `• ${c.name}`).join("\n");
      if (!confirm(t("dashboard.experienceEditor.coverage.publishWithGaps", { skills: liste }))) return;
    }
    setPublishing(true);
    const res = await publishExperience(experience.id);
    if (res.success) {
      toast(t("dashboard.experienceEditor.published"));
      await load();
    } else {
      toast(res.error || t("dashboard.experienceEditor.publishFailed"), "error");
    }
    setPublishing(false);
  }

  async function handleCover(skillId) {
    setCovering(skillId);
    const res = await couvrirCompetence(experience.id, skillId);
    if (res.success) {
      toast(t(
        res.mode === "new_step"
          ? "dashboard.experienceEditor.coverage.coveredNewStep"
          : "dashboard.experienceEditor.coverage.coveredAttached",
        { n: res.position }
      ));
      annoncerVersion(res);
      await load();
    } else {
      toast(res.error || t("dashboard.experienceEditor.error"), "error");
    }
    setCovering(null);
  }

  // Une étape enregistrée remonte ici : sans ça, le panneau de couverture
  // continuerait de lire la version d'avant l'enregistrement.
  function handleStepSaved(saved) {
    setSteps((prev) => prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)));
  }

  async function handleAddStep() {
    const res = await addStep(experience.id);
    if (res.success) { annoncerVersion(res); await load(); } else { toast(res.error || t("dashboard.experienceEditor.error"), "error"); }
  }

  async function handleMove(stepId, direction) {
    const res = await moveStep(stepId, direction);
    if (res.success) { annoncerVersion(res); await load(); } else { toast(res.error || t("dashboard.experienceEditor.error"), "error"); }
  }

  async function handleDelete(stepId) {
    if (!confirm(t("dashboard.experienceEditor.deleteStepConfirm"))) return;
    const res = await deleteStep(stepId);
    if (res.success) { annoncerVersion(res); await load(); } else { toast(res.error || t("dashboard.experienceEditor.error"), "error"); }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
        <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // Conception : aucune expérience et aucune génération en cours. Le chat EST
  // l’écran — plein écran, sans carte autour, comme le hub Expériences.
  if (!experience && !generating) {
    return (
      <ExperienceChatScreen
        jobId={jobId}
        jobData={job}
        title={job?.title || t("dashboard.experienceEditor.designWithAssistant")}
        backLabel={t("dashboard.experienceEditor.backToJob")}
        onBack={() => router.push(`/jobs/${jobId}`)}
        onGenerated={handleChatGenerated}
        onStepRegenerated={handleStepRegenerated}
        onUserMessage={() => setChatStarted(true)}
        actions={!chatStarted ? (
          // Le raccourci disparaît dès qu’on engage la conversation : un seul
          // chemin de génération à la fois.
          <button className="btn btn-ghost btn-sm" onClick={handleGenerate} style={{ color: "var(--muted-foreground)" }}>
            {t("dashboard.experienceEditor.generateDirectly")}
          </button>
        ) : null}
      />
    );
  }

  // Ajustement par dialogue sur une expérience existante : même écran, même
  // plein écran. L’assistant réécrit UNE étape à la fois, en place — le parcours
  // ne change pas de version et les étapes déjà relues ne bougent pas. La
  // régénération complète reste possible, mais il faut la demander.
  if (experience && chatOpen) {
    return (
      <ExperienceChatScreen
        jobId={jobId}
        jobData={job}
        title={job?.title || t("dashboard.experienceEditor.designWithAssistant")}
        backLabel={t("dashboard.experienceEditor.closeAssistant")}
        onBack={() => setChatOpen(false)}
        onGenerated={handleChatGenerated}
        onStepRegenerated={handleStepRegenerated}
      />
    );
  }

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", paddingBottom: "4rem" }}>
      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/jobs/${jobId}`)} style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
        <ArrowLeft size={16} /> {t("dashboard.experienceEditor.backToJob")}
      </button>

      {/* Génération directe (raccourci) → flux réel du pipeline, étape par étape */}
      {!experience && generating && (
        <div className="card" style={{ padding: "1.75rem 2rem" }}>
          <GenerationFeed events={genEvents} active={generating} />
        </div>
      )}

      {experience && (
        <>
          {/* En-tête + gate de publication */}
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardList size={18} style={{ color: "var(--primary)" }} /> {t("dashboard.experienceEditor.reviewTitle")}
              </h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                {t("dashboard.experienceEditor.stepCount", { count: steps.length })}
                {/* Calculée ici, pas lue en base : elle doit suivre l'ajout et
                    le retrait d'étapes à l'écran, sans attendre un rechargement. */}
                {estimerMinutes(steps) ? t("dashboard.experienceEditor.estimatedMinutes", { minutes: estimerMinutes(steps) }) : ""}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusBadge status={experience.status} />
              {/* Le chat s’ouvre en plein écran : plus d’état « ouvert » à refléter ici. */}
              <button className="btn btn-outline btn-sm" onClick={() => setChatOpen(true)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} /> {t("dashboard.experienceEditor.adjustStepByStep")}
              </button>
              {experience.status !== "published" ? (
                <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                  {t("dashboard.experienceEditor.publish")}
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={generating}>
                  {t("dashboard.experienceEditor.regenerate")}
                </button>
              )}
            </div>
          </div>

          {experience.status === "published" && (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "1.5rem" }}>
              {t("dashboard.experienceEditor.publishedNotice")}
            </div>
          )}

          {experience.locked_at && (
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
              {tNodes(t("dashboard.experienceEditor.lockedWarning"), {
                next: <strong>{t("dashboard.experienceEditor.lockedWarningNext")}</strong>,
              })}
            </div>
          )}

          <CoveragePanel
            couverture={couverture}
            competences={competences}
            covering={covering}
            onCover={handleCover}
          />

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {steps.map((step, i) => (
              <StepCard
                key={step.id}
                step={step}
                index={i}
                total={steps.length}
                competences={competences}
                onMove={handleMove}
                onDelete={handleDelete}
                onSaved={handleStepSaved}
                onForked={async (res) => { annoncerVersion(res); await load(); }}
                toast={toast}
              />
            ))}
          </div>

          <button className="btn btn-outline" onClick={handleAddStep} style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Plus size={16} /> {t("dashboard.experienceEditor.addStep")}
          </button>
        </>
      )}
    </div>
  );
}


function StatusBadge({ status }) {
  const { t } = useI18n();
  const map = {
    draft: { label: t("dashboard.experienceEditor.status.draft"), bg: "#f1f5f9", color: "#475569" },
    pending_review: { label: t("dashboard.experienceEditor.status.pending_review"), bg: "#fef3c7", color: "#92400e" },
    published: { label: t("dashboard.experienceEditor.status.published"), bg: "#dcfce7", color: "#166534" },
    archived: { label: t("dashboard.experienceEditor.status.archived"), bg: "#f1f5f9", color: "#94a3b8" },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "99px", background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// Identifiant du prochain checkpoint d'un critère : jamais réutilisé, pour que
// l'id d'un checkpoint supprimé ne désigne pas, plus tard, un autre comportement.
function nouvelIdCheckpoint(checkpoints) {
  const max = (checkpoints || []).reduce((m, cp) => Math.max(m, Number(String(cp?.id || "").replace(/\D/g, "")) || 0), 0);
  return `cp${max + 1}`;
}

// Compétences que la grille d'une étape note, checkpoint par checkpoint.
function competencesDeLaGrille(criteria) {
  const ids = [];
  for (const c of criteria || []) {
    if (!estCritereCheckpoints(c)) continue;
    for (const id of [...(c.skill_ids || []), ...c.checkpoints.map((cp) => cp.skill_id).filter(Boolean)]) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

function StepCard({ step, index, total, competences, onMove, onDelete, onSaved, onForked, toast }) {
  const { t } = useI18n();
  const [local, setLocal] = useState(step);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setLocal(step); setDirty(false); }, [step.id, step.updated_at]);

  function set(field, value) { setLocal((p) => ({ ...p, [field]: value })); setDirty(true); }

  // `criteria` : nom de colonne historique, contient les sous-dimensions.
  function setSubDimension(ci, field, value) {
    setLocal((p) => {
      const criteria = [...(p.criteria || [])];
      criteria[ci] = { ...criteria[ci], [field]: value };
      return { ...p, criteria };
    });
    setDirty(true);
  }
  function setLevel(ci, li, value) {
    setLocal((p) => {
      const criteria = [...(p.criteria || [])];
      const levels = [...(criteria[ci].bars_levels || [])];
      levels[li] = { ...levels[li], description: value };
      criteria[ci] = { ...criteria[ci], bars_levels: levels };
      return { ...p, criteria };
    });
    setDirty(true);
  }
  // Une nouvelle sous-dimension naît au format checkpoints, rattachée aux
  // compétences que l'étape teste déjà.
  function addSubDimension() {
    setLocal((p) => ({
      ...p,
      criteria: [...(p.criteria || []), {
        name: t("dashboard.experienceEditor.newSubDimension"),
        skill_ids: [...(p.config?.skills_tested || [])],
        checkpoints: [1, 2, 3].map((n) => ({ id: `cp${n}`, description: "" })),
      }],
    }));
    setDirty(true);
  }
  function removeSubDimension(ci) {
    setLocal((p) => ({ ...p, criteria: (p.criteria || []).filter((_, i) => i !== ci) }));
    setDirty(true);
  }
  function updateCheckpoints(ci, transform) {
    setLocal((p) => {
      const criteria = [...(p.criteria || [])];
      criteria[ci] = { ...criteria[ci], checkpoints: transform([...(criteria[ci].checkpoints || [])]) };
      return { ...p, criteria };
    });
    setDirty(true);
  }
  function setCheckpoint(ci, ki, description) {
    updateCheckpoints(ci, (cps) => cps.map((cp, i) => (i === ki ? { ...cp, description } : cp)));
  }
  function addCheckpoint(ci) {
    updateCheckpoints(ci, (cps) => [...cps, { id: nouvelIdCheckpoint(cps), description: "" }]);
  }
  function removeCheckpoint(ci, ki) {
    updateCheckpoints(ci, (cps) => cps.filter((_, i) => i !== ki));
  }
  function setCriterionSkills(ci, skill_ids) {
    setSubDimension(ci, "skill_ids", skill_ids);
  }
  function setQcmSkill(id) {
    setLocal((p) => ({ ...p, config: { ...(p.config || {}), skills_tested: id ? [id] : [] } }));
    setDirty(true);
  }

  async function save() {
    // Un checkpoint vide n'est pas un comportement : il partirait au correcteur
    // comme une ligne à noter sans rien à observer. Un critère qui n'a plus de
    // checkpoint disparaît avec eux, plutôt que de se faire passer pour une
    // grille à niveaux vide.
    const criteria = (local.criteria || [])
      .map((c) => (Array.isArray(c.checkpoints)
        ? { ...c, checkpoints: c.checkpoints.filter((cp) => (cp.description || "").trim()) }
        : c))
      .filter((c) => !Array.isArray(c.checkpoints) || c.checkpoints.length);

    // Ce que l'étape teste suit sa grille. Seule une étape corrigée sans grille
    // (QCM, tests, champs factuels) garde ses compétences déclarées — c'est
    // par elle-même qu'elle les teste.
    const grille = competencesDeLaGrille(criteria);
    const aGrilleCheckpoints = criteria.some(estCritereCheckpoints);
    const declarees = etapeNoteeSansGrille(local) || !aGrilleCheckpoints ? (local.config?.skills_tested || []) : [];
    const skills_tested = [...new Set([...declarees, ...grille])];
    const noms = new Map((competences || []).map((c) => [c.id, c.name]));
    const config = {
      ...(local.config || {}),
      skills_tested,
      targets_skills: skills_tested.map((id) => noms.get(id)).filter(Boolean),
    };

    setSaving(true);
    const res = await updateStep(step.id, {
      title: local.title, prompt: local.prompt,
      response_format: local.response_format, sandbox_kind: local.sandbox_kind,
      ai_assistant_allowed: local.ai_assistant_allowed,
      skill_assessed: local.skill_assessed, criteria,
      config,
    });
    if (res.success) {
      setLocal((p) => ({ ...p, criteria, config }));
      setDirty(false);
      toast(t("dashboard.experienceEditor.stepSaved"));
      // Nouvelle version : cette carte désigne une étape de l'ancienne, qui
      // n'est plus modifiable. Rechargement complet.
      if (res.forked) onForked?.(res);
      else onSaved?.({ ...local, criteria, config });
    }
    else { toast(res.error || t("dashboard.experienceEditor.error"), "error"); }
    setSaving(false);
  }

  const isQualifying = local.kind === "qualifying";
  const isQcm = local.kind === "classic_qcm";

  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem", borderLeft: dirty ? "3px solid var(--primary)" : "3px solid transparent" }}>
      {/* Barre du haut */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted-foreground)" }}>#{index + 1}</span>
          <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "99px", background: "var(--secondary)", color: "var(--foreground)" }}>
            {kindLabel(t, local.kind)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <button className="btn btn-ghost btn-sm" disabled={index === 0} onClick={() => onMove(step.id, "up")} style={{ padding: "4px" }}><ChevronUp size={16} /></button>
          <button className="btn btn-ghost btn-sm" disabled={index === total - 1} onClick={() => onMove(step.id, "down")} style={{ padding: "4px" }}><ChevronDown size={16} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(step.id)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={15} /></button>
        </div>
      </div>

      {/* Titre */}
      <input
        value={local.title || ""}
        onChange={(e) => set("title", e.target.value)}
        placeholder={t("dashboard.experienceEditor.stepTitle")}
        style={inputStyle}
      />

      {/* Énoncé */}
      <label style={labelStyle}>{t("dashboard.experienceEditor.stepPrompt")}</label>
      <AutoTextarea
        value={local.prompt || ""}
        onChange={(e) => set("prompt", e.target.value)}
        rows={4}
        placeholder={t("dashboard.experienceEditor.promptPlaceholder")}
        style={{ ...inputStyle, lineHeight: 1.5 }}
      />

      {/* Format + sandbox + assistant */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.responseFormat")}</label>
          <select value={local.response_format} onChange={(e) => set("response_format", e.target.value)} style={selectStyle}>
            {responseFormats(t).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.sandbox")}</label>
          <select value={local.sandbox_kind || "none"} onChange={(e) => set("sandbox_kind", e.target.value)} style={selectStyle}>
            {sandboxKinds(t).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: "2px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            <input type="checkbox" checked={!!local.ai_assistant_allowed} onChange={(e) => set("ai_assistant_allowed", e.target.checked)} />
            <Bot size={15} style={{ color: local.ai_assistant_allowed ? "var(--primary)" : "var(--muted-foreground)" }} />
            Claude (assistant complet)
          </label>
        </div>
        {local.ai_assistant_allowed && (
          <div style={{ flex: "0 0 150px" }}>
            <label style={labelStyle}>{t("dashboard.experienceEditor.messageCap")}</label>
            <input
              type="number" min={1} max={200}
              value={local.config?.ai_max_messages ?? DEFAUT_ECHANGES_IA}
              onChange={(e) => {
                const v = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value, 10) || 1);
                setLocal((p) => ({ ...p, config: { ...(p.config || {}), ai_max_messages: v } }));
                setDirty(true);
              }}
              style={inputStyle}
            />
          </div>
        )}
      </div>

      {/* Compétence évaluée + ses sous-dimensions (ni qualifying, ni QCM).
          Les sous-dimensions décomposent UNE compétence : elles sont donc
          présentées à l'intérieur de son cadre, pas en liste plate. Deux
          formats cohabitent : les checkpoints (générations récentes) et les
          niveaux BARS des expériences publiées avant, toujours notés tels quels. */}
      {!isQualifying && !isQcm && (
        <div style={{ marginTop: "1.25rem" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.skillAssessed")}</label>
          <input
            value={local.skill_assessed || ""}
            onChange={(e) => set("skill_assessed", e.target.value)}
            placeholder={t("dashboard.experienceEditor.skillAssessedHint")}
            style={{ ...inputStyle, fontWeight: 700 }}
          />

          <div style={{ borderLeft: "2px solid var(--border)", paddingLeft: "0.85rem", marginTop: "0.35rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label style={{ ...labelStyle, margin: 0 }}>
                {t("dashboard.experienceEditor.subDimensions")}{local.skill_assessed ? ` — ${local.skill_assessed}` : ""}
              </label>
              <button className="btn btn-ghost btn-sm" onClick={addSubDimension} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={13} /> {t("dashboard.experienceEditor.addSubDimension")}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(local.criteria || []).map((c, ci) => (
                <div key={ci} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "0.5rem" }}>
                    <input value={c.name || ""} onChange={(e) => setSubDimension(ci, "name", e.target.value)} placeholder={t("dashboard.experienceEditor.subDimensionName")} style={{ ...inputStyle, fontWeight: 700, marginBottom: 0 }} />
                    <button className="btn btn-ghost btn-sm" onClick={() => removeSubDimension(ci)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
                  </div>

                  {Array.isArray(c.checkpoints) ? (
                    <>
                      <SkillPicker
                        ids={c.skill_ids || []}
                        competences={competences}
                        onChange={(ids) => setCriterionSkills(ci, ids)}
                      />
                      {c.added_for_coverage && (
                        <p style={{ fontSize: "11px", color: "#0369a1", margin: "0 0 6px" }}>
                          {t("dashboard.experienceEditor.addedForCoverage", {
                            skill: competences.find((k) => k.id === c.added_for_coverage)?.name || c.added_for_coverage,
                          })}
                        </p>
                      )}
                      {c.checkpoints.map((cp, ki) => (
                        <div key={cp.id || ki} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", width: "22px", flexShrink: 0, paddingTop: "8px", textAlign: "right" }}>{ki + 1}.</span>
                          <AutoTextarea
                            value={cp.description || ""}
                            onChange={(e) => setCheckpoint(ci, ki, e.target.value)}
                            rows={1}
                            placeholder={t("dashboard.experienceEditor.checkpointPlaceholder")}
                            style={{ ...inputStyle, marginBottom: 0, fontSize: "12.5px", lineHeight: 1.5 }}
                          />
                          <button className="btn btn-ghost btn-sm" onClick={() => removeCheckpoint(ci, ki)} style={{ padding: "4px", color: "var(--muted-foreground)", marginTop: "4px" }}><X size={13} /></button>
                        </div>
                      ))}
                      {c.checkpoints.length < CHECKPOINTS_MAX && (
                        <button className="btn btn-ghost btn-sm" onClick={() => addCheckpoint(ci)} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginLeft: "22px" }}>
                          <Plus size={13} /> {t("dashboard.experienceEditor.addCheckpoint")}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic", margin: "0 0 6px" }}>
                        {t("dashboard.experienceEditor.legacyGrid")}
                      </p>
                      {(c.bars_levels || []).map((b, li) => (
                        <div key={li} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "4px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", width: "70px", flexShrink: 0, paddingTop: "8px" }}>N{b.level} {b.label}</span>
                          <AutoTextarea value={b.description || ""} onChange={(e) => setLevel(ci, li, e.target.value)} rows={2} style={{ ...inputStyle, marginBottom: 0, fontSize: "12px", lineHeight: 1.5 }} />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>
            {(local.criteria || []).some((c) => Array.isArray(c.checkpoints)) && (
              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.5rem", lineHeight: 1.5 }}>
                {t("dashboard.experienceEditor.checkpointsHelp")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* QCM Editor */}
      {isQcm && (
        <div style={{ marginTop: "1.25rem" }}>
          {/* La compétence que le QCM vérifie : c'est ainsi qu'il compte dans la
              couverture et dans le tier du score final. */}
          {competences.length > 0 && (
            <>
              <label style={{ ...labelStyle, margin: "0 0 0.35rem" }}>{t("dashboard.experienceEditor.qcmSkill")}</label>
              <select
                value={(local.config?.skills_tested || [])[0] || ""}
                onChange={(e) => setQcmSkill(e.target.value)}
                style={{ ...selectStyle, marginBottom: "0.75rem" }}
              >
                <option value="">{t("dashboard.experienceEditor.noSkill")}</option>
                {competences.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </>
          )}
          <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.qcmOptions")}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(local.config?.options || []).map((opt, oi) => (
              <div key={oi} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", flexShrink: 0 }} title={t("dashboard.experienceEditor.qcmCorrect")}>
                  <input
                    type="radio"
                    name={`qcm-correct-${step.id}`}
                    checked={local.config?.correct_index === oi}
                    onChange={() => {
                      setLocal((p) => ({ ...p, config: { ...p.config, correct_index: oi } }));
                      setDirty(true);
                    }}
                    style={{ accentColor: "var(--primary)", width: "16px", height: "16px" }}
                  />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: local.config?.correct_index === oi ? "#166534" : "var(--muted-foreground)" }}>
                    {local.config?.correct_index === oi ? "✓" : ""}
                  </span>
                </label>
                <input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...(local.config?.options || [])];
                    newOpts[oi] = e.target.value;
                    setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts } }));
                    setDirty(true);
                  }}
                  placeholder={`Option ${oi + 1}`}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const newOpts = (local.config?.options || []).filter((_, i) => i !== oi);
                    let newCorrect = local.config?.correct_index;
                    if (newCorrect === oi) newCorrect = 0;
                    else if (newCorrect > oi) newCorrect--;
                    setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts, correct_index: newCorrect } }));
                    setDirty(true);
                  }}
                  style={{ padding: "4px", color: "#dc2626" }}
                ><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const newOpts = [...(local.config?.options || []), ""];
              setLocal((p) => ({ ...p, config: { ...p.config, options: newOpts } }));
              setDirty(true);
            }}
            style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginTop: "0.5rem" }}
          >
            <Plus size={13} /> {t("dashboard.experienceEditor.addOption")}
          </button>
          <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
            {t("dashboard.experienceEditor.qcmHelp")}
          </p>
        </div>
      )}

      {/* Scène d'une mise en situation écrite (message client, fiche du destinataire, contexte) */}
      {CHAMPS_SCENE[local.sandbox_kind] && (
        <SceneEditor
          kind={local.sandbox_kind}
          config={local.config}
          onChange={(patch) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), ...patch } })); setDirty(true); }}
        />
      )}

      {/* Éditeur de fiche CRM */}
      {local.sandbox_kind === "crm" && (
        <CrmEditor
          crm={local.config?.crm}
          onChange={(crm) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), crm } })); setDirty(true); }}
        />
      )}

      {/* Éditeur de l'exercice de code */}
      {local.sandbox_kind === "code" && (
        <CodeExerciseEditor
          code={local.config?.code}
          onChange={(code) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), code } })); setDirty(true); }}
        />
      )}

      {/* Enregistrer */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
          {dirty ? t("dashboard.experienceEditor.save") : t("dashboard.experienceEditor.saved")}
        </button>
      </div>
    </div>
  );
}

// Pastille d'une compétence, colorée par son tier. Un identifiant qui n'est plus
// dans la liste de l'offre (compétence renommée ou retirée depuis la
// génération) reste affiché, signalé : le cacher ferait croire qu'il n'existe pas.
function SkillChip({ id, competence, onRemove }) {
  const { t } = useI18n();
  const must = competence?.tier === MUST;
  const style = !competence
    ? { background: "#fffbeb", color: "#b45309", border: "1px solid #fde68a" }
    : must
      ? { background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe" }
      : { background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" };
  return (
    <span style={{ ...style, display: "inline-flex", alignItems: "center", gap: 4, fontSize: "11px", fontWeight: 600, borderRadius: "99px", padding: "2px 8px" }}>
      {competence ? competence.name : t("dashboard.experienceEditor.coverage.offList", { id })}
      {competence && <span style={{ fontWeight: 500, opacity: 0.75 }}>· {t(must ? "dashboard.experienceEditor.coverage.must" : "dashboard.experienceEditor.coverage.nice")}</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}

// Compétences notées par un critère : choisies dans la liste validée de l'offre,
// jamais saisies librement — une compétence hors liste ne compterait nulle part.
function SkillPicker({ ids, competences, onChange }) {
  const { t } = useI18n();
  const parId = new Map((competences || []).map((c) => [c.id, c]));
  const disponibles = (competences || []).filter((c) => !ids.includes(c.id));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "0 0 8px" }}>
      <span style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: 600 }}>{t("dashboard.experienceEditor.criterionSkills")}</span>
      {ids.length === 0 && (
        <span style={{ fontSize: "11px", color: "#b45309" }}>{t("dashboard.experienceEditor.noSkill")}</span>
      )}
      {ids.map((id) => (
        <SkillChip key={id} id={id} competence={parId.get(id)} onRemove={() => onChange(ids.filter((x) => x !== id))} />
      ))}
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...ids, e.target.value])}
          style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "99px", border: "1px dashed var(--border)", background: "transparent", color: "var(--muted-foreground)", cursor: "pointer" }}
        >
          <option value="">{t("dashboard.experienceEditor.addSkill")}</option>
          {disponibles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Couverture des compétences ──────────────────────────────────────────────
// Le contrôle est CALCULÉ, pas demandé au modèle (lib/competences.js) : chaque
// compétence must-have validée à la création de l'offre doit être notée par au
// moins un checkpoint quelque part. Deux sections volontairement dissemblables :
// un must-have non testé est une alerte, un nice-to-have non testé n'en est pas
// une et ne doit jamais en avoir l'air.
function CoveragePanel({ couverture, competences, covering, onCover }) {
  const { t } = useI18n();

  if (!competences.length) {
    return (
      <div className="card" style={{ padding: "0.9rem 1.25rem", marginBottom: "1.5rem", fontSize: "12.5px", color: "var(--muted-foreground)" }}>
        {t("dashboard.experienceEditor.coverage.noSkills")}
      </div>
    );
  }

  const manquantes = couverture.manquantes.length;

  const lignesRefs = (refs) => refs.map((r, i) => (
    <div key={i} style={{ fontSize: "12px", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
      {t("dashboard.experienceEditor.coverage.testedIn", { n: r.stepIndex + 1, title: r.stepTitle || "—" })}
      {r.criterion ? ` · ${r.criterion}` : ""}
      {r.checkpoints.length > 0 && ` · ${t("dashboard.experienceEditor.coverage.checkpointCount", { count: r.checkpoints.length })}`}
      {r.automatic && ` · ${t("dashboard.experienceEditor.coverage.automatic")}`}
      {r.addedForCoverage && (
        <span style={{ marginLeft: 6, fontSize: "10.5px", color: "#0369a1" }}>{t("dashboard.experienceEditor.coverage.addedTag")}</span>
      )}
    </div>
  ));

  return (
    <div className="card" style={{ padding: "1.1rem 1.4rem", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldCheck size={16} style={{ color: "var(--primary)" }} /> {t("dashboard.experienceEditor.coverage.title")}
        </h2>
        <span style={{
          fontSize: "11.5px", fontWeight: 700, borderRadius: "99px", padding: "3px 10px",
          background: manquantes ? "#fee2e2" : "#dcfce7", color: manquantes ? "#991b1b" : "#166534",
        }}>
          {manquantes
            ? t("dashboard.experienceEditor.coverage.missing", { count: manquantes })
            : t("dashboard.experienceEditor.coverage.allCovered")}
        </span>
      </div>

      {couverture.depasseDuree && (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: "8px", padding: "8px 12px", fontSize: "12.5px", lineHeight: 1.5, marginBottom: "0.75rem" }}>
          {t("dashboard.experienceEditor.coverage.overDuration", {
            steps: couverture.nbEtapes, max: EXERCICES_CIBLE_MAX, count: couverture.must.length,
          })}
        </div>
      )}

      {/* Must-have : chaque manque est une alerte, avec de quoi le combler. */}
      <div style={{ ...labelStyle, margin: "0 0 6px" }}>{t("dashboard.experienceEditor.coverage.must")}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
        {couverture.must.map((c) => (
          <div key={c.id} style={{
            border: `1px solid ${c.refs.length ? "var(--border)" : "#fecaca"}`,
            background: c.refs.length ? "transparent" : "#fef2f2",
            borderRadius: "8px", padding: "8px 12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                {c.refs.length
                  ? <Check size={14} style={{ color: "#166534" }} />
                  : <AlertTriangle size={14} style={{ color: "#dc2626" }} />}
                {c.name}
              </span>
              {!c.refs.length && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onCover(c.id)}
                  disabled={!!covering}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", whiteSpace: "nowrap" }}
                  title={t("dashboard.experienceEditor.coverage.coverHelp")}
                >
                  {covering === c.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                  {covering === c.id ? t("dashboard.experienceEditor.coverage.covering") : t("dashboard.experienceEditor.coverage.cover")}
                </button>
              )}
            </div>
            {c.refs.length
              ? <div style={{ marginTop: 4, paddingLeft: 20 }}>{lignesRefs(c.refs)}</div>
              : <div style={{ marginTop: 2, paddingLeft: 20, fontSize: "12px", color: "#991b1b" }}>{t("dashboard.experienceEditor.coverage.uncovered")}</div>}
          </div>
        ))}
      </div>

      {/* Nice-to-have : information neutre, jamais une alerte. */}
      {couverture.nice.length > 0 && (
        <>
          <div style={{ ...labelStyle, margin: "0 0 6px" }}>{t("dashboard.experienceEditor.coverage.nice")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {couverture.nice.map((c) => (
              <div key={c.id} style={{ fontSize: "12.5px", color: "var(--muted-foreground)", padding: "4px 12px" }}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                {c.refs.length
                  ? <div style={{ paddingLeft: 0 }}>{lignesRefs(c.refs)}</div>
                  : <span> — {t("dashboard.experienceEditor.coverage.uncoveredNice")}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Éditeur de l'exercice de code. Même enjeu que l'éditeur CRM, en plus sévère :
// la correction est faite par EXÉCUTION, donc une sortie attendue fausse fait
// échouer tout le monde, y compris les meilleurs candidats — et ça ne se voit
// qu'une fois l'expérience en ligne. C'est la partie à relire avant publication.
function CodeExerciseEditor({ code, onChange }) {
  const { t } = useI18n();
  const c = code || { language: DEFAULT_LANGUAGE, starter_code: "", tests: [] };
  const tests = c.tests || [];
  const set = (patch) => onChange({ ...c, ...patch });
  const setTest = (i, patch) => set({ tests: tests.map((tst, j) => (j === i ? { ...tst, ...patch } : tst)) });

  const visibles = tests.filter((tst) => !tst.hidden).length;
  const caches = tests.length - visibles;

  const mono = { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12.5px" };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.code.language")}</label>
      <select value={c.language || DEFAULT_LANGUAGE} onChange={(e) => set({ language: e.target.value })} style={inputStyle}>
        {Object.entries(CODE_LANGUAGES).map(([cle, l]) => <option key={cle} value={cle}>{l.label}</option>)}
      </select>

      <label style={{ ...labelStyle, margin: "0.75rem 0 0.5rem" }}>{t("dashboard.experienceEditor.code.starter")}</label>
      <AutoTextarea
        value={c.starter_code || ""}
        onChange={(e) => set({ starter_code: e.target.value })}
        rows={6}
        placeholder={t("dashboard.experienceEditor.code.starterPlaceholder")}
        style={{ ...inputStyle, ...mono, resize: "vertical" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.code.tests")}</label>
        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
          {t("dashboard.experienceEditor.code.testCount", { visible: visibles, hidden: caches })}
        </span>
      </div>

      {/* Les deux façons de rendre l'exercice inexploitable, signalées sans bloquer. */}
      {!visibles && (
        <p style={{ fontSize: "11.5px", color: "#b45309", marginBottom: "0.5rem" }}>
          {t("dashboard.experienceEditor.code.warnNoVisible")}
        </p>
      )}
      {!caches && (
        <p style={{ fontSize: "11.5px", color: "#b45309", marginBottom: "0.5rem" }}>
          {t("dashboard.experienceEditor.code.warnNoHidden")}
        </p>
      )}

      {tests.map((tst, i) => (
        <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "0.5rem" }}>
            <input
              value={tst.name || ""}
              onChange={(e) => setTest(i, { name: e.target.value })}
              placeholder={t("dashboard.experienceEditor.code.testNamePlaceholder")}
              style={{ ...inputStyle, marginBottom: 0 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", whiteSpace: "nowrap", color: "var(--muted-foreground)" }}>
              <input type="checkbox" checked={!!tst.hidden} onChange={(e) => setTest(i, { hidden: e.target.checked })} />
              {t("dashboard.experienceEditor.code.hidden")}
            </label>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => set({ tests: tests.filter((_, j) => j !== i) })}
              style={{ padding: "4px", color: "#dc2626" }}
            ><Trash2 size={14} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.code.stdin")}</label>
              <AutoTextarea value={tst.stdin || ""} onChange={(e) => setTest(i, { stdin: e.target.value })} rows={3}
                style={{ ...inputStyle, ...mono, marginBottom: 0 }} />
            </div>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.code.expected")}</label>
              <AutoTextarea value={tst.expected_output || ""} onChange={(e) => setTest(i, { expected_output: e.target.value })} rows={3}
                style={{ ...inputStyle, ...mono, marginBottom: 0 }} />
            </div>
          </div>
        </div>
      ))}

      <button
        className="btn btn-ghost btn-sm"
        onClick={() => set({ tests: [...tests, { name: "", stdin: "", expected_output: "", hidden: false }] })}
        style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
      >
        <Plus size={13} /> {t("dashboard.experienceEditor.code.addTest")}
      </button>

      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
        {t("dashboard.experienceEditor.code.help")}
      </p>
    </div>
  );
}

// La scène d'une mise en situation écrite : le message de l'interlocuteur, la
// fiche du destinataire d'un e-mail, le contexte d'un document. Générée, montrée
// au candidat, lue par le correcteur — et jusqu'ici invisible ici même : le
// recruteur publiait une scène qu'il n'avait jamais lue. Elle compte d'autant
// plus quand elle est jouée dans une autre langue que le parcours.
// [clé de config, nombre de lignes] — une seule ligne : champ simple.
const CHAMPS_SCENE = {
  client_reply: [["client_message", 4]],
  email: [["to", 1], ["subject", 1], ["context", 4]],
  document: [["document_context", 4]],
};

function SceneEditor({ kind, config, onChange }) {
  const { t } = useI18n();
  return (
    <div style={{ marginTop: "0.75rem" }}>
      {CHAMPS_SCENE[kind].map(([cle, lignes]) => (
        <div key={cle}>
          <label style={labelStyle}>{t(`dashboard.experienceEditor.scene.${cle}`)}</label>
          {lignes > 1 ? (
            <AutoTextarea
              value={config?.[cle] || ""}
              onChange={(e) => onChange({ [cle]: e.target.value })}
              rows={lignes}
              style={{ ...inputStyle, lineHeight: 1.5 }}
            />
          ) : (
            <input value={config?.[cle] || ""} onChange={(e) => onChange({ [cle]: e.target.value })} style={inputStyle} />
          )}
        </div>
      ))}
    </div>
  );
}

// Éditeur du sandbox "crm". C'est ici que le recruteur corrige un attendu mal
// généré : la correction des champs factuels est déterministe, donc une valeur
// attendue fausse pénalise injustement tous les candidats. Rien n'est plus
// important à relire sur ce type d'étape.
function CrmEditor({ crm, onChange }) {
  const { t } = useI18n();
  const c = crm || { sources: [], fields: [], traps: [], notes_field: true };
  const sources = c.sources || [];
  const fields = c.fields || [];
  const traps = c.traps || [];
  const set = (patch) => onChange({ ...c, ...patch });

  const setSource = (i, patch) => set({ sources: sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setField = (i, patch) => set({ fields: fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const setExpected = (i, patch) => setField(i, { expected: { ...(fields[i].expected || {}), ...patch } });
  const setTrap = (i, patch) => set({ traps: traps.map((tr, j) => (j === i ? { ...tr, ...patch } : tr)) });

  const factualKeys = fields.filter((f) => f.nature === "factual").map((f) => f.key);

  // Un attendu introuvable dans les sources est incorrigible pour le candidat et
  // pénalise tout le monde. On le signale sans bloquer : le repérage textuel est
  // approximatif (une date reformatée, un montant écrit en toutes lettres).
  const sourcesText = sources.map((s) => `${s.body || ""} ${s.subject || ""} ${s.from || ""}`).join(" ").toLowerCase();
  // Comparaison aussi sans les espaces : un montant attendu "18000" s'écrit
  // "18 000 €" dans la source — ce n'est pas un attendu manquant.
  const sourcesTight = sourcesText.replace(/[\s ]/g, "");
  const missingFromSources = (f) => {
    const value = String(f.expected?.value ?? "").trim().toLowerCase();
    if (!value) return false;
    const candidates = [value, ...(f.expected?.accept || []).map((a) => String(a).toLowerCase())];
    return !candidates.some((cand) => cand && (sourcesText.includes(cand) || sourcesTight.includes(cand.replace(/[\s ]/g, ""))));
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <label style={{ ...labelStyle, margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.crm.recordTitle")}</label>
      <input value={c.record_title || ""} onChange={(e) => set({ record_title: e.target.value })}
        placeholder={t("dashboard.experienceEditor.crm.recordTitlePlaceholder")} style={inputStyle} />

      {/* Sources du brief */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>Sources du brief ({sources.length})</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ sources: [...sources, { id: `s${sources.length + 1}`, type: "email", body: "" }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.addSource")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {sources.map((s, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <select value={s.type || "email"} onChange={(e) => setSource(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 200px" }}>
                {crmSourceTypes(t).map((src) => <option key={src.value} value={src.value}>{src.label}</option>)}
              </select>
              <input value={s.title || ""} onChange={(e) => setSource(i, { title: e.target.value })}
                placeholder={t("dashboard.experienceEditor.crm.tabLabelPlaceholder")} style={{ ...inputStyle, marginBottom: 0 }} />
              <button className="btn btn-ghost btn-sm" onClick={() => set({ sources: sources.filter((_, j) => j !== i) })}
                style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
            </div>
            {s.type === "email" && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
                <input value={s.from || ""} onChange={(e) => setSource(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceFrom")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={s.subject || ""} onChange={(e) => setSource(i, { subject: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceSubject")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={s.received_at || ""} onChange={(e) => setSource(i, { received_at: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceReceived")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 140px" }} />
              </div>
            )}
            <AutoTextarea value={s.body || ""} onChange={(e) => setSource(i, { body: e.target.value })} rows={6}
              placeholder={t("dashboard.experienceEditor.crm.sourceBodyPlaceholder")}
              style={{ ...inputStyle, marginBottom: 0, lineHeight: 1.5, fontSize: "13px" }} />
          </div>
        ))}
      </div>

      {/* Champs de la fiche */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>Champs de la fiche ({fields.length})</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ fields: [...fields, { key: `champ_${fields.length + 1}`, label: "", type: "text", nature: "judgment" }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.addField")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {fields.map((f, i) => {
          const isFactual = f.nature === "factual";
          return (
            <div key={i} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${isFactual ? "#0ea5e9" : "#a855f7"}`, borderRadius: "8px", padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                <input value={f.label || ""} onChange={(e) => setField(i, { label: e.target.value })} placeholder={t("dashboard.experienceEditor.fieldLabel")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px", fontWeight: 600 }} />
                <input value={f.key || ""} onChange={(e) => setField(i, { key: e.target.value })} placeholder={t("dashboard.experienceEditor.fieldKey")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 130px", fontFamily: "monospace", fontSize: "12px" }} />
                <select value={f.type || "text"} onChange={(e) => setField(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 120px" }}>
                  {CRM_FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
                </select>
                <select value={f.nature || "judgment"} onChange={(e) => setField(i, { nature: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px" }}>
                  <option value="factual">{t("dashboard.experienceEditor.crm.natureFactual")}</option>
                  <option value="judgment">{t("dashboard.experienceEditor.crm.natureJudgment")}</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => set({ fields: fields.filter((_, j) => j !== i) })}
                  style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>

              {f.type === "select" && (
                <input value={(f.options || []).join(", ")} onChange={(e) => setField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                  placeholder={t("dashboard.experienceEditor.crm.optionsPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px" }} />
              )}
              {f.type === "number" && (
                <input value={f.unit || ""} onChange={(e) => setField(i, { unit: e.target.value })}
                  placeholder={t("dashboard.experienceEditor.crm.unitPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px", maxWidth: 160 }} />
              )}

              {isFactual && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", padding: "8px" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginBottom: "5px" }}>
                    {t("dashboard.experienceEditor.crm.expectedLabel")}
                  </div>
                  {missingFromSources(f) && (
                    <div style={{ fontSize: "11.5px", color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "5px", padding: "5px 8px", marginBottom: "6px", lineHeight: 1.45 }}>
                      {t("dashboard.experienceEditor.crm.expectedMissing")}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input value={f.expected?.value ?? ""} onChange={(e) => setExpected(i, { value: e.target.value })}
                      placeholder={t("dashboard.experienceEditor.crm.exactAnswer")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px" }} />
                    <input value={(f.expected?.accept || []).join(", ")} onChange={(e) => setExpected(i, { accept: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })}
                      placeholder={t("dashboard.experienceEditor.crm.acceptedVariants")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px" }} />
                    {f.type === "number" && (
                      <input type="number" value={f.expected?.tolerance ?? 0} onChange={(e) => setExpected(i, { tolerance: Number(e.target.value) || 0 })}
                        placeholder={t("dashboard.experienceEditor.crm.tolerance")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 110px" }} />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Piège / incohérence */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>Incohérence volontaire ({traps.length})</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ traps: [...traps, { id: `trap_${traps.length + 1}`, kind: "contradiction", fields: [], description: "", resolution: "", expected_signal: "" }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.addTrap")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {traps.map((trap, i) => (
          <div key={i} style={{ border: "1px solid #fed7aa", background: "#fffbeb", borderRadius: "8px", padding: "0.75rem" }}>
            <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
              <select value={(trap.fields || [])[0] || ""} onChange={(e) => setTrap(i, { fields: e.target.value ? [e.target.value] : [] })}
                style={{ ...selectStyle, marginBottom: 0, flex: "1 1 auto" }}>
                <option value="">{t("dashboard.experienceEditor.crm.trapFieldPlaceholder")}</option>
                {factualKeys.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={() => set({ traps: traps.filter((_, j) => j !== i) })}
                style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
            </div>
            <AutoTextarea value={trap.description || ""} onChange={(e) => setTrap(i, { description: e.target.value })} rows={2}
              placeholder={t("dashboard.experienceEditor.crm.trapSourcesPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px", lineHeight: 1.5 }} />
            <input value={trap.resolution || ""} onChange={(e) => setTrap(i, { resolution: e.target.value })}
              placeholder={t("dashboard.experienceEditor.crm.trapResolutionPlaceholder")} style={{ ...inputStyle, marginBottom: "6px", fontSize: "13px" }} />
            <input value={trap.expected_signal || ""} onChange={(e) => setTrap(i, { expected_signal: e.target.value })}
              placeholder={t("dashboard.experienceEditor.crm.trapBehaviourPlaceholder")} style={{ ...inputStyle, marginBottom: 0, fontSize: "13px" }} />
          </div>
        ))}
      </div>

      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>
        Les champs <strong>factuels</strong> sont corrigés automatiquement (sans IA) et regroupés en un critère, sous la compétence de l&apos;étape.
        Les champs de <strong>jugement</strong> sont notés par les checkpoints ci-dessus. Le candidat ne voit aucune différence entre les deux.
      </p>
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--border)",
  fontSize: "14px", fontFamily: "inherit", background: "var(--background)", color: "var(--foreground)", marginBottom: "2px",
};
const selectStyle = {
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: "32px",
  cursor: "pointer",
};
const labelStyle = {
  display: "block", fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.05em", color: "var(--muted-foreground)", margin: "0.5rem 0 4px",
};
