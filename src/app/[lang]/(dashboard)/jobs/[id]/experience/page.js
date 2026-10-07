"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import {
  Loader2, Sparkles, ChevronUp, ChevronDown, Trash2, Plus, Check,
  ArrowLeft, Bot, Video, Type, ListChecks, Code2, CircleHelp, ClipboardList,
  ShieldCheck, AlertTriangle, X, Compass,
} from "lucide-react";
import {
  getExperienceForJob, updateStep,
  addStep, deleteStep, moveStep, publishExperience, couvrirCompetence, updateFilRouge,
} from "@/lib/actions/experience";
import { crmEstEspace, crmToutesSources, CRM_MISSIONS, CRM_ACTIVITY_TYPES } from "@/lib/crmScoring";
import { lireNombre } from "@/lib/tableur";
import { CANAUX, PRIORITES } from "@/lib/boiteReception";
import { MODES_PERSONA, DEFAUT_TOURS, MAX_TOURS } from "@/lib/persona";
import { MODES as MODES_TABLEAU } from "@/lib/tableauCartes";
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

const SANDBOX_KIND_VALUES = ["none", "persona", "email", "client_reply", "document", "crm", "sheet", "inbox", "board", "code"];
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

          {experience.generated_from?.fil_rouge && (
            <FilRougeCard
              key={experience.id}
              experienceId={experience.id}
              filRouge={experience.generated_from.fil_rouge}
              toast={toast}
              onSaved={async (res) => { annoncerVersion(res); await load(); }}
            />
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

      {/* Éditeur du tableur */}
      {local.sandbox_kind === "sheet" && (
        <SheetEditor
          sheet={local.config?.sheet}
          onChange={(sheet) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), sheet } })); setDirty(true); }}
        />
      )}

      {/* Éditeur de la boîte de réception */}
      {local.sandbox_kind === "inbox" && (
        <InboxEditor
          inbox={local.config?.inbox}
          onChange={(inbox) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), inbox } })); setDirty(true); }}
        />
      )}

      {/* Éditeur du personnage */}
      {local.sandbox_kind === "persona" && (
        <PersonaEditor
          persona={local.config?.persona}
          onChange={(persona) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), persona } })); setDirty(true); }}
        />
      )}

      {/* Éditeur du tableau de cartes */}
      {local.sandbox_kind === "board" && (
        <BoardEditor
          board={local.config?.board}
          onChange={(board) => { setLocal((p) => ({ ...p, config: { ...(p.config || {}), board } })); setDirty(true); }}
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

// Les formats dont la couverture affiche le nom : le geste par lequel la
// compétence est prouvée (« testée à l'étape 2 · Tableur »).
const FORMATS_PREUVE = ["text", "video", "qcm", "choice", "code", "email", "client_reply", "document", "crm", "sheet", "inbox", "persona", "board"];

// ─── Fil rouge ───────────────────────────────────────────────────────────────
// La situation qui relie les étapes, lue par le candidat avant de commencer.
// Décidée par la génération selon le métier ; le recruteur la relit, la
// retouche, ou la retire (texte vidé). L'« univers » est la fiche de cohérence
// des scènes détaillées : il ne s'affiche pas au candidat.
function FilRougeCard({ experienceId, filRouge, onSaved, toast }) {
  const { t } = useI18n();
  const [contexte, setContexte] = useState(filRouge?.contexte_candidat || "");
  const [univers, setUnivers] = useState(filRouge?.univers || "");
  const [ouvert, setOuvert] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = contexte !== (filRouge?.contexte_candidat || "") || univers !== (filRouge?.univers || "");

  async function save() {
    setSaving(true);
    const res = await updateFilRouge(experienceId, { contexte_candidat: contexte, univers });
    setSaving(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    toast(t(contexte.trim() ? "dashboard.experienceEditor.filRouge.saved" : "dashboard.experienceEditor.filRouge.removed"));
    await onSaved?.(res);
  }

  return (
    <div className="card" style={{ padding: "1.1rem 1.4rem", marginBottom: "1.5rem", borderLeft: dirty ? "3px solid var(--primary)" : undefined }}>
      <h2 style={{ fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Compass size={16} style={{ color: "var(--primary)" }} /> {t("dashboard.experienceEditor.filRouge.title")}
      </h2>
      <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
        {t("dashboard.experienceEditor.filRouge.help")}
      </p>
      <label style={labelStyle}>{t("dashboard.experienceEditor.filRouge.candidateText")}</label>
      <AutoTextarea value={contexte} onChange={(e) => setContexte(e.target.value)} rows={3} style={{ ...inputStyle, lineHeight: 1.5 }} />
      <button className="btn btn-ghost btn-sm" onClick={() => setOuvert((o) => !o)} style={{ fontSize: "12px", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: 4 }}>
        <ChevronDown size={13} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        {t("dashboard.experienceEditor.filRouge.universe")}
      </button>
      {ouvert && (
        <>
          <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0.25rem 0 0.35rem" }}>{t("dashboard.experienceEditor.filRouge.universeHelp")}</p>
          <AutoTextarea value={univers} onChange={(e) => setUnivers(e.target.value)} rows={4} style={{ ...inputStyle, lineHeight: 1.5, fontSize: "13px" }} />
        </>
      )}
      {dirty && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {t("dashboard.experienceEditor.save")}
          </button>
        </div>
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
      {r.format && FORMATS_PREUVE.includes(r.format) ? ` · ${t(`dashboard.experienceEditor.coverage.format.${r.format}`)}` : ""}
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
  // En v2, les « sources » sont l'historique et les propriétés de chaque fiche.
  const espace = crmEstEspace(c);
  const sourcesText = crmToutesSources(c).map((s) => `${s.body || ""} ${s.subject || ""} ${s.from || ""} ${s.title || ""}`).join(" ").toLowerCase();
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

      {/* CRM v2 : le pipeline. Sinon (expériences publiées avant), les sources du brief. */}
      {espace && <PipelineEditor crm={c} set={set} />}
      {!espace && (<>
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
      </>)}

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
        {tNodes(t("dashboard.experienceEditor.crm.fieldsHelp"), {
          factual: <strong>{t("dashboard.experienceEditor.crm.fieldsHelpFactual")}</strong>,
          judgment: <strong>{t("dashboard.experienceEditor.crm.fieldsHelpJudgment")}</strong>,
        })}
      </p>
    </div>
  );
}

// ─── Éditeur du tableur ──────────────────────────────────────────────────────
// Le jeu de données s'édite comme on le colle depuis un tableur : une ligne par
// ligne, colonnes séparées par des tabulations (ou des points-virgules), en-têtes
// en première ligne. Ce qui compte le plus à relire n'est pas une cellule, c'est
// la note d'analyse : si le constat qu'elle décrit n'est pas dans les chiffres,
// la grille notera les candidats sur une illusion.
function donneesVersTexte(o) {
  return [o?.columns || [], ...(o?.rows || [])].map((l) => (l || []).map((v) => (v ?? "")).join("\t")).join("\n");
}

function texteVersDonnees(texte) {
  const lignes = String(texte || "").replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (!lignes.length) return { columns: [], rows: [] };
  const sep = lignes[0].includes("\t") ? "\t" : ";";
  const [entete, ...corps] = lignes.map((l) => l.split(sep).map((c) => c.trim()));
  return {
    columns: entete,
    rows: corps.map((l) => entete.map((_, i) => {
      const v = l[i] ?? "";
      const n = lireNombre(v);
      // Un code (« 0042 ») reste du texte, comme à la génération.
      return n !== null && !/^0\d/.test(v) ? n : v;
    })),
  };
}

function OngletEditor({ onglet, onChange, onRemove }) {
  const { t } = useI18n();
  const [brouillon, setBrouillon] = useState(donneesVersTexte(onglet));
  const inegales = (onglet?.rows || []).some((r) => (r || []).length !== (onglet?.columns || []).length);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem", marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input value={onglet?.name || ""} onChange={(e) => onChange({ ...onglet, name: e.target.value })}
          placeholder={t("dashboard.experienceEditor.sheet.tabName")} style={{ ...inputStyle, marginBottom: 0, fontWeight: 600 }} />
        {onRemove && (
          <button className="btn btn-ghost btn-sm" onClick={onRemove} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
        )}
      </div>
      <AutoTextarea
        value={brouillon}
        onChange={(e) => setBrouillon(e.target.value)}
        onBlur={() => onChange({ ...onglet, ...texteVersDonnees(brouillon) })}
        rows={8}
        style={{ ...inputStyle, marginBottom: 0, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: "12px", lineHeight: 1.5, whiteSpace: "pre", overflowX: "auto" }}
      />
      <p style={{ fontSize: "11px", color: inegales ? "#b45309" : "var(--muted-foreground)", marginTop: 4 }}>
        {inegales
          ? t("dashboard.experienceEditor.sheet.unevenRows")
          : t("dashboard.experienceEditor.sheet.dataSize", { rows: (onglet?.rows || []).length, cols: (onglet?.columns || []).length })}
      </p>
    </div>
  );
}

function SheetEditor({ sheet, onChange }) {
  const { t } = useI18n();
  const s = sheet || { file_name: "", deliverable_label: "", sheets: [{ name: "Feuille1", columns: [], rows: [] }], analysis_notes: "" };
  const onglets = s.sheets || [];
  const set = (patch) => onChange({ ...s, ...patch });

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.sheet.fileName")}</label>
          <input value={s.file_name || ""} onChange={(e) => set({ file_name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "2 1 260px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.sheet.deliverableLabel")}</label>
          <input value={s.deliverable_label || ""} onChange={(e) => set({ deliverable_label: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.sheet.data")}</label>
        {onglets.length < 3 && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
            onClick={() => set({ sheets: [...onglets, { name: `Feuille${onglets.length + 1}`, columns: [], rows: [] }] })}>
            <Plus size={13} /> {t("dashboard.experienceEditor.sheet.addTab")}
          </button>
        )}
      </div>
      <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0 0 0.5rem" }}>{t("dashboard.experienceEditor.sheet.dataHelp")}</p>
      {onglets.map((o, i) => (
        <OngletEditor
          key={`${i}-${onglets.length}`}
          onglet={o}
          onChange={(neuf) => set({ sheets: onglets.map((x, j) => (j === i ? neuf : x)) })}
          onRemove={onglets.length > 1 ? () => set({ sheets: onglets.filter((_, j) => j !== i) }) : null}
        />
      ))}

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0.75rem", marginTop: "0.75rem" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginBottom: 5 }}>
          {t("dashboard.experienceEditor.sheet.analysisNotes")}
        </div>
        <AutoTextarea value={s.analysis_notes || ""} onChange={(e) => set({ analysis_notes: e.target.value })} rows={3}
          style={{ ...inputStyle, marginBottom: 0, fontSize: "13px", lineHeight: 1.5, background: "#ffffff" }} />
        <p style={{ fontSize: "11px", color: "#0369a1", marginTop: 5, lineHeight: 1.45 }}>{t("dashboard.experienceEditor.sheet.analysisHelp")}</p>
      </div>
    </div>
  );
}

// ─── Éditeur de la boîte de réception ────────────────────────────────────────
// Chaque message porte, à côté, la lecture attendue du tri : c'est la grille du
// correcteur, jamais montrée au candidat. Un message marqué « piège » est celui
// qui départage — l'urgence discrète, le bruit insistant.
function InboxEditor({ inbox, onChange }) {
  const { t } = useI18n();
  const b = inbox || { owner: "", now: "", items: [], triage_notes: [] };
  const items = b.items || [];
  const notes = b.triage_notes || [];
  const set = (patch) => onChange({ ...b, ...patch });
  const setItem = (i, patch) => set({ items: items.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const noteDe = (id) => notes.find((n) => n.item === id) || { item: id, priority: null, trap: false, why: "" };
  const setNote = (id, patch) => {
    const existe = notes.some((n) => n.item === id);
    set({ triage_notes: existe ? notes.map((n) => (n.item === id ? { ...n, ...patch } : n)) : [...notes, { ...noteDe(id), ...patch }] });
  };
  const ajouter = () => {
    const max = items.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0);
    set({ items: [...items, { id: `m${max + 1}`, channel: "email", from: "", from_role: "", subject: "", received_at: "", body: "" }] });
  };
  const retirer = (i) => {
    const id = items[i]?.id;
    set({ items: items.filter((_, j) => j !== i), triage_notes: notes.filter((n) => n.item !== id) });
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 240px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.owner")}</label>
          <input value={b.owner || ""} onChange={(e) => set({ owner: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.now")}</label>
          <input value={b.now || ""} onChange={(e) => set({ now: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.inbox.messages", { count: items.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={ajouter}>
          <Plus size={13} /> {t("dashboard.experienceEditor.inbox.addMessage")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((m, i) => {
          const note = noteDe(m.id);
          return (
            <div key={m.id || i} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${note.trap ? "#f97316" : "var(--border)"}`, borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", fontFamily: "monospace" }}>{m.id}</span>
                <select value={m.channel || "email"} onChange={(e) => setItem(i, { channel: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px" }}>
                  {CANAUX.map((c) => <option key={c} value={c}>{t(`dashboard.experienceEditor.inbox.channels.${c}`)}</option>)}
                </select>
                <input value={m.from || ""} onChange={(e) => setItem(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.from")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px" }} />
                <input value={m.from_role || ""} onChange={(e) => setItem(i, { from_role: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.fromRole")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px" }} />
                <button className="btn btn-ghost btn-sm" onClick={() => retirer(i)} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input value={m.subject || ""} onChange={(e) => setItem(i, { subject: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.subject")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={m.received_at || ""} onChange={(e) => setItem(i, { received_at: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.receivedAt")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 140px" }} />
              </div>
              <AutoTextarea value={m.body || ""} onChange={(e) => setItem(i, { body: e.target.value })} rows={3}
                style={{ ...inputStyle, marginBottom: 6, fontSize: "13px", lineHeight: 1.5 }} />
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>{t("dashboard.experienceEditor.inbox.expectedTriage")}</span>
                <select value={note.priority || ""} onChange={(e) => setNote(m.id, { priority: e.target.value || null })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 150px", fontSize: "12.5px", padding: "5px 28px 5px 8px" }}>
                  <option value="">—</option>
                  {PRIORITES.map((p) => <option key={p} value={p}>{t(`dashboard.experienceEditor.inbox.priorities.${p}`)}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#92400e" }}>
                  <input type="checkbox" checked={!!note.trap} onChange={(e) => setNote(m.id, { trap: e.target.checked })} />
                  {t("dashboard.experienceEditor.inbox.trap")}
                </label>
                <input value={note.why || ""} onChange={(e) => setNote(m.id, { why: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.why")}
                  style={{ ...inputStyle, marginBottom: 0, flex: "1 1 220px", fontSize: "12.5px", background: "#ffffff" }} />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.inbox.help")}</p>
    </div>
  );
}

// ─── CRM v2 : le pipeline ────────────────────────────────────────────────────
// Les propriétés libres d'une fiche s'éditent en « Clé : valeur », une par
// ligne — la forme la plus rapide à relire et à corriger.
function proprietesVersTexte(p) {
  return Object.entries(p || {}).map(([k, v]) => `${k} : ${v}`).join("\n");
}
function texteVersProprietes(texte) {
  const out = {};
  for (const l of String(texte || "").split("\n")) {
    const i = l.indexOf(":");
    if (i <= 0) continue;
    const k = l.slice(0, i).trim();
    const v = l.slice(i + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function FicheCrmEditor({ record, onChange, onRemove }) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);
  const [props, setProps] = useState(proprietesVersTexte(record.properties));
  const timeline = record.timeline || [];
  const set = (patch) => onChange({ ...record, ...patch });
  const setActivite = (i, patch) => set({ timeline: timeline.map((a, j) => (j === i ? { ...a, ...patch } : a)) });

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.6rem 0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOuvert((o) => !o)} style={{ padding: "2px" }}>
          <ChevronDown size={14} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        </button>
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted-foreground)" }}>{record.id}</span>
        <span style={{ fontSize: "13px", fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{record.name || "—"}</span>
        <span style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>
          {[record.stage, t("dashboard.experienceEditor.crm.activityCount", { count: timeline.length })].filter(Boolean).join(" · ")}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onRemove} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
      </div>
      {ouvert && (
        <div style={{ marginTop: "0.6rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
            {[
              ["name", "recordName"], ["company", "recordCompany"], ["contact", "recordContact"], ["stage", "recordStage"],
              ["amount", "recordAmount"], ["currency", "recordCurrency"], ["close_date", "recordCloseDate"],
              ["owner", "recordOwner"], ["last_activity", "recordLastActivity"],
            ].map(([cle, libelle]) => (
              <input key={cle} value={record[cle] ?? ""} placeholder={t(`dashboard.experienceEditor.crm.${libelle}`)}
                onChange={(e) => set({ [cle]: cle === "amount" ? (lireNombre(e.target.value) ?? e.target.value) : e.target.value })}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "13px" }} />
            ))}
          </div>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.properties")}</label>
          <AutoTextarea value={props} onChange={(e) => setProps(e.target.value)} onBlur={() => set({ properties: texteVersProprietes(props) })}
            rows={2} placeholder={t("dashboard.experienceEditor.crm.propertiesPlaceholder")} style={{ ...inputStyle, fontSize: "13px", lineHeight: 1.5 }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0.6rem 0 0.4rem" }}>
            <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.crm.timeline")}</label>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
              onClick={() => set({ timeline: [...timeline, { id: `${record.id}_a${timeline.length + 1}`, type: "note", date: "", body: "" }] })}>
              <Plus size={13} /> {t("dashboard.experienceEditor.crm.addActivity")}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {timeline.map((a, i) => (
              <div key={a.id || i} style={{ border: "1px dashed var(--border)", borderRadius: 6, padding: "0.5rem" }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted-foreground)", alignSelf: "center" }}>{a.id}</span>
                  <select value={a.type || "note"} onChange={(e) => setActivite(i, { type: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 180px", fontSize: "12.5px" }}>
                    {CRM_ACTIVITY_TYPES.map((ty) => <option key={ty} value={ty}>{t(`dashboard.experienceEditor.crm.activityTypes.${ty}`)}</option>)}
                  </select>
                  <input value={a.from || ""} onChange={(e) => setActivite(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceFrom")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px", fontSize: "12.5px" }} />
                  <input value={a.subject || a.title || ""} onChange={(e) => setActivite(i, a.type === "email" ? { subject: e.target.value } : { title: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceSubject")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px", fontSize: "12.5px" }} />
                  <input value={a.date || ""} onChange={(e) => setActivite(i, { date: e.target.value })} placeholder={t("dashboard.experienceEditor.sourceReceived")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 120px", fontSize: "12.5px" }} />
                  <button className="btn btn-ghost btn-sm" onClick={() => set({ timeline: timeline.filter((_, j) => j !== i) })} style={{ padding: "4px", color: "#dc2626" }}><X size={13} /></button>
                </div>
                <AutoTextarea value={a.body || ""} onChange={(e) => setActivite(i, { body: e.target.value })} rows={3}
                  style={{ ...inputStyle, marginBottom: 0, fontSize: "12.5px", lineHeight: 1.5 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PipelineEditor({ crm, set }) {
  const { t } = useI18n();
  const records = crm.records || [];
  const setRecord = (i, r) => set({ records: records.map((x, j) => (j === i ? r : x)) });
  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "0.75rem" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.mission")}</label>
          <select value={crm.mission || "update"} onChange={(e) => set({ mission: e.target.value, ...(e.target.value === "pipeline_review" ? { focus_record: null } : {}) })} style={selectStyle}>
            {CRM_MISSIONS.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.crm.missions.${m}`)}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.crm.pipelineName")}</label>
          <input value={crm.pipeline_name || ""} onChange={(e) => set({ pipeline_name: e.target.value })} style={inputStyle} />
        </div>
        {crm.mission !== "pipeline_review" && (
          <div style={{ flex: "1 1 200px" }}>
            <label style={labelStyle}>{t("dashboard.experienceEditor.crm.focusRecord")}</label>
            <select value={crm.focus_record || ""} onChange={(e) => set({ focus_record: e.target.value || null })} style={selectStyle}>
              <option value="">—</option>
              {records.map((r) => <option key={r.id} value={r.id}>{r.name || r.id}</option>)}
            </select>
          </div>
        )}
      </div>
      <label style={labelStyle}>{t("dashboard.experienceEditor.crm.stages")}</label>
      <input value={(crm.stages || []).join(", ")} onChange={(e) => set({ stages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} style={inputStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.crm.records", { count: records.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={() => set({ records: [...records, { id: `r${records.length + 1}`, name: "", stage: (crm.stages || [])[0] || "", properties: {}, timeline: [] }] })}>
          <Plus size={13} /> {t("dashboard.experienceEditor.crm.addRecord")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {records.map((r, i) => (
          <FicheCrmEditor key={r.id || i} record={r} onChange={(neuf) => setRecord(i, neuf)}
            onRemove={() => set({ records: records.filter((_, j) => j !== i), ...(crm.focus_record === r.id ? { focus_record: null } : {}) })} />
        ))}
      </div>
    </>
  );
}

// ─── Éditeur du personnage ───────────────────────────────────────────────────
// Deux zones bien distinctes : ce que le candidat voit (nom, fonction,
// contexte, première réplique) et ce qui fait le jeu — personnalité, objectifs,
// informations cachées, objections, limites — que seul le personnage connaît.
// Les signes de réussite, eux, vont au correcteur.
function PersonaEditor({ persona, onChange }) {
  const { t } = useI18n();
  const p = persona || { name: "", role: "", company: "", mode: "call", language: "", context: "", opening_message: "", personality: "", goals: "", hidden_info: [], objections: [], red_lines: [], success_signals: [], max_turns: DEFAUT_TOURS };
  const set = (patch) => onChange({ ...p, ...patch });
  // Une liste s'édite à une ligne par élément ; les lignes vides sont ignorées
  // à l'usage, pas pendant la frappe — sinon impossible de passer à la ligne.
  const liste = (cle) => (
    <AutoTextarea value={(p[cle] || []).join("\n")} onChange={(e) => set({ [cle]: e.target.value.split("\n") })} rows={2}
      placeholder={t("dashboard.experienceEditor.persona.onePerLine")} style={{ ...inputStyle, fontSize: "13px", lineHeight: 1.5, background: "#ffffff" }} />
  );

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.mode")}</label>
          <select value={p.mode || "call"} onChange={(e) => set({ mode: e.target.value })} style={selectStyle}>
            {MODES_PERSONA.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.persona.modes.${m}`)}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.name")}</label>
          <input value={p.name || ""} onChange={(e) => set({ name: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.role")}</label>
          <input value={p.role || ""} onChange={(e) => set({ role: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.company")}</label>
          <input value={p.company || ""} onChange={(e) => set({ company: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "0 0 90px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.language")}</label>
          <input value={p.language || ""} onChange={(e) => set({ language: e.target.value })} placeholder="fr" style={inputStyle} />
        </div>
        <div style={{ flex: "0 0 90px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.accent")}</label>
          <input value={p.accent || ""} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} placeholder="BE" style={inputStyle} />
        </div>
        <div style={{ flex: "0 0 110px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.gender")}</label>
          <select value={p.gender === "m" ? "m" : "f"} onChange={(e) => set({ gender: e.target.value })} style={selectStyle}>
            <option value="f">{t("dashboard.experienceEditor.persona.genders.f")}</option>
            <option value="m">{t("dashboard.experienceEditor.persona.genders.m")}</option>
          </select>
        </div>
        <div style={{ flex: "0 0 110px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.maxTurns")}</label>
          <input type="number" min={2} max={MAX_TOURS} value={p.max_turns ?? DEFAUT_TOURS}
            onChange={(e) => set({ max_turns: Math.max(2, Math.min(MAX_TOURS, parseInt(e.target.value, 10) || DEFAUT_TOURS)) })} style={inputStyle} />
        </div>
      </div>

      {(p.mode || "call") === "call" && (
        <>
          <label style={labelStyle}>{t("dashboard.experienceEditor.persona.voiceId")}</label>
          <input value={p.voice_id || ""} onChange={(e) => set({ voice_id: e.target.value.trim() })}
            placeholder={t("dashboard.experienceEditor.persona.voiceIdPlaceholder")} style={{ ...inputStyle, fontFamily: "monospace", fontSize: "12.5px" }} />
        </>
      )}

      <label style={labelStyle}>{t("dashboard.experienceEditor.persona.context")}</label>
      <AutoTextarea value={p.context || ""} onChange={(e) => set({ context: e.target.value })} rows={2} style={{ ...inputStyle, lineHeight: 1.5 }} />
      <label style={labelStyle}>{t("dashboard.experienceEditor.persona.opening")}</label>
      <AutoTextarea value={p.opening_message || ""} onChange={(e) => set({ opening_message: e.target.value })} rows={1}
        placeholder={t("dashboard.experienceEditor.persona.openingPlaceholder")} style={{ ...inputStyle, lineHeight: 1.5 }} />

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "0.75rem", marginTop: "0.75rem" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#92400e", textTransform: "uppercase", marginBottom: 2 }}>
          {t("dashboard.experienceEditor.persona.hiddenTitle")}
        </div>
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.personality")}</label>
        <AutoTextarea value={p.personality || ""} onChange={(e) => set({ personality: e.target.value })} rows={1} style={{ ...inputStyle, fontSize: "13px", lineHeight: 1.5, background: "#ffffff" }} />
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.goals")}</label>
        <AutoTextarea value={p.goals || ""} onChange={(e) => set({ goals: e.target.value })} rows={1} style={{ ...inputStyle, fontSize: "13px", lineHeight: 1.5, background: "#ffffff" }} />
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.hiddenInfo")}</label>
        {liste("hidden_info")}
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.objections")}</label>
        {liste("objections")}
        <label style={labelStyle}>{t("dashboard.experienceEditor.persona.redLines")}</label>
        {liste("red_lines")}
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "0.75rem", marginTop: "0.75rem" }}>
        <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", marginBottom: 2 }}>
          {t("dashboard.experienceEditor.persona.successSignals")}
        </div>
        {liste("success_signals")}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.6rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.persona.help")}</p>
    </div>
  );
}

// ─── Éditeur du tableau de cartes ────────────────────────────────────────────
function BoardEditor({ board, onChange }) {
  const { t } = useI18n();
  const b = board || { title: "", mode: "backlog", constraint: "", columns: [], cards: [], triage_notes: [] };
  const cards = b.cards || [];
  const notes = b.triage_notes || [];
  const set = (patch) => onChange({ ...b, ...patch });
  const setCard = (i, patch) => set({ cards: cards.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const noteDe = (id) => notes.find((n) => n.card === id) || { card: id, column: null, trap: false, why: "" };
  const setNote = (id, patch) => {
    const existe = notes.some((n) => n.card === id);
    set({ triage_notes: existe ? notes.map((n) => (n.card === id ? { ...n, ...patch } : n)) : [...notes, { ...noteDe(id), ...patch }] });
  };
  const ajouter = () => {
    const max = cards.reduce((m, c) => Math.max(m, Number(String(c.id).replace(/\D/g, "")) || 0), 0);
    set({ cards: [...cards, { id: `c${max + 1}`, title: "", body: "", meta: {} }] });
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 220px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.board.title")}</label>
          <input value={b.title || ""} onChange={(e) => set({ title: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 150px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.board.mode")}</label>
          <select value={b.mode || "backlog"} onChange={(e) => set({ mode: e.target.value })} style={selectStyle}>
            {MODES_TABLEAU.map((m) => <option key={m} value={m}>{t(`dashboard.experienceEditor.board.modes.${m}`)}</option>)}
          </select>
        </div>
      </div>
      <label style={labelStyle}>{t("dashboard.experienceEditor.board.constraint")}</label>
      <input value={b.constraint || ""} onChange={(e) => set({ constraint: e.target.value })} style={inputStyle} />
      <label style={labelStyle}>{t("dashboard.experienceEditor.board.columns")}</label>
      <input value={(b.columns || []).join(", ")} onChange={(e) => set({ columns: e.target.value.split(",").map((s) => s.trim()) })} style={inputStyle} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.board.cards", { count: cards.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={ajouter}>
          <Plus size={13} /> {t("dashboard.experienceEditor.board.addCard")}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cards.map((c, i) => {
          const note = noteDe(c.id);
          return (
            <div key={c.id || i} style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${note.trap ? "#f97316" : "var(--border)"}`, borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", fontFamily: "monospace" }}>{c.id}</span>
                <input value={c.title || ""} onChange={(e) => setCard(i, { title: e.target.value })} placeholder={t("dashboard.experienceEditor.board.cardTitle")} style={{ ...inputStyle, marginBottom: 0, fontWeight: 600 }} />
                <button className="btn btn-ghost btn-sm" onClick={() => set({ cards: cards.filter((_, j) => j !== i), triage_notes: notes.filter((n) => n.card !== c.id) })} style={{ padding: "4px", color: "#dc2626" }}><Trash2 size={14} /></button>
              </div>
              <AutoTextarea value={c.body || ""} onChange={(e) => setCard(i, { body: e.target.value })} rows={2} style={{ ...inputStyle, marginBottom: 6, fontSize: "13px", lineHeight: 1.5 }} />
              <MetaEditor meta={c.meta} onChange={(meta) => setCard(i, { meta })} />
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "8px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>{t("dashboard.experienceEditor.board.expected")}</span>
                <select value={note.column || ""} onChange={(e) => setNote(c.id, { column: e.target.value || null })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px", fontSize: "12.5px", padding: "5px 28px 5px 8px" }}>
                  <option value="">—</option>
                  {(b.columns || []).filter(Boolean).map((col) => <option key={col} value={col}>{col}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#92400e" }}>
                  <input type="checkbox" checked={!!note.trap} onChange={(e) => setNote(c.id, { trap: e.target.checked })} />
                  {t("dashboard.experienceEditor.inbox.trap")}
                </label>
                <input value={note.why || ""} onChange={(e) => setNote(c.id, { why: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.why")}
                  style={{ ...inputStyle, marginBottom: 0, flex: "1 1 220px", fontSize: "12.5px", background: "#ffffff" }} />
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.board.help")}</p>
    </div>
  );
}

// Les repères d'une carte, en « Clé : valeur » une ligne chacun — même forme
// que les propriétés d'une fiche CRM.
function MetaEditor({ meta, onChange }) {
  const { t } = useI18n();
  const [brouillon, setBrouillon] = useState(proprietesVersTexte(meta));
  return (
    <AutoTextarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} onBlur={() => onChange(texteVersProprietes(brouillon))}
      rows={1} placeholder={t("dashboard.experienceEditor.board.metaPlaceholder")} style={{ ...inputStyle, marginBottom: 0, fontSize: "12.5px", lineHeight: 1.5 }} />
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
