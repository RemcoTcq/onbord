"use client";

// Fiche d'un job — maquettes « D · Job – Parcours / Candidats / Contexte /
// Paramètres ».
//
// Les onglets hérités (Évaluations, éditeur visuel de pipeline, liaison de
// tests) ont quitté cet écran avec la refonte d'octobre 2026 : ils étaient déjà
// masqués par EXPERIENCE_V1_ONLY, et la maquette ne les reprend pas. Leurs
// composants restent dans le dépôt. Le parcours se lit désormais en deux cartes :
// les questions de présélection, puis la simulation.

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter, LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  Search, Trash2, Loader2, Lock, Save, ArrowRight, ChevronRight, Pencil, Plus, Sparkles,
} from "lucide-react";
import {
  getCandidatesForJob, getJobDetail,
  deleteCandidate, bulkDeleteCandidates,
  updateJobDetails, updateJobDescription,
  deleteJob
} from "@/lib/actions/candidate";
import { getTestsLibrary } from "@/lib/actions/assessment";
import { getExperienceForJob } from "@/lib/actions/experience";
import { estimerMinutes, minutesEtape } from "@/lib/experienceDuree";
import { getJobEntry } from "@/lib/actions/run";
import { entryIsOpen } from "@/lib/candidateEntry";
import { buildDefaultPipeline } from "@/lib/pipelineTemplate";
import { listerCompetences, calculerCouverture } from "@/lib/competences";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";
import CopyJobLink from "@/components/jobs/CopyJobLink";
import QuestionsDrawer from "@/components/jobs/QuestionsDrawer";
import { natureEtape } from "@/components/experience/BlocEtape";
import { StatusBadge } from "@/components/experience/ui";
import { scoreTone, initials, candidateStatusLabel } from "@/components/ui/ds";

// ─── Helpers ───

// Ton d'un statut candidat : la couleur de la pastille dans la liste.
const TON_STATUT = {
  invited: "blue", in_progress: "amber",
  soumis: "green", scored: "green", shortlisted: "green", next_step: "green",
  rejected: "red", disqualified: "red",
};

const ONGLETS = ["parcours", "candidats", "context", "parametres"];

function ongletInitial() {
  if (typeof window === "undefined") return "parcours";
  const demande = new URLSearchParams(window.location.search).get("tab");
  return ONGLETS.includes(demande) ? demande : "parcours";
}

// ─── Component ───

export default function JobDetailPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;
  const { toast } = useToast();
  const { refreshJobs } = useShell();

  // Global state
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(ongletInitial);
  const [entry, setEntry] = useState(null); // l'offre accepte-t-elle des candidats ?
  const [experience, setExperience] = useState(null); // { experience, steps }
  const [testsLibrary, setTestsLibrary] = useState([]);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  // Candidates tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [sortBy, setSortBy] = useState("score_desc");

  // Context tab state
  const [contextTitle, setContextTitle] = useState("");
  const [contextDescription, setContextDescription] = useState("");
  const [contextSaving, setContextSaving] = useState(false);

  // Settings tab state
  const [settingsForm, setSettingsForm] = useState({ title: "", location: "", contract_type: "", work_mode: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);

  // ─── Load data ───

  async function loadData() {
    setLoading(true);
    const [jobRes, candidatesRes, testsRes, entryRes, expRes] = await Promise.all([
      getJobDetail(jobId),
      getCandidatesForJob(jobId),
      // Ne sert qu'aux offres d'avant l'éditeur de parcours, dont les nœuds
      // sont reconstruits depuis assessment_config (cf. getPipelineNodes).
      getTestsLibrary(),
      // Verdict serveur : l'ouverture de l'offre ne se déduit PAS de la lecture
      // ci-dessous — la version la plus récente non archivée peut être un
      // brouillon, qui masquerait la version publiée.
      getJobEntry(jobId),
      getExperienceForJob(jobId),
    ]);
    setEntry(entryRes?.entry || "not_ready");
    setExperience(expRes?.success && expRes.experience ? { experience: expRes.experience, steps: expRes.steps || [] } : null);
    if (jobRes.success) {
      setJob(jobRes.job);
      setContextTitle(jobRes.job.title || "");
      setContextDescription(jobRes.job.description || "");
      setSettingsForm({
        title: jobRes.job.title || "",
        location: jobRes.job.location || "",
        contract_type: jobRes.job.contract_type || "",
        work_mode: jobRes.job.work_mode || "",
      });
    }
    if (candidatesRes.success) setCandidates(candidatesRes.candidates);
    if (testsRes.success) setTestsLibrary(testsRes.tests);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  function changerOnglet(id) {
    setActiveTab(id);
    // Dans l'URL, pour qu'un retour arrière ou un lien partagé rouvre le bon onglet.
    const url = new URL(window.location.href);
    if (id === "parcours") url.searchParams.delete("tab"); else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  // ─── Candidate actions ───

  const filteredAndSortedCandidates = candidates
    .filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(q) || (c.email && c.email.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") return (b.score_global || b.score_cv || 0) - (a.score_global || a.score_cv || 0);
      if (sortBy === "score_asc") return (a.score_global || a.score_cv || 0) - (b.score_global || b.score_cv || 0);
      if (sortBy === "date_desc") return new Date(b.created_at) - new Date(a.created_at);
      return 0;
    });

  async function handleDelete(candidateId) {
    if (!confirm(t("dashboard.jobDetail.deleteCandidateConfirm"))) return;
    setActionLoading(candidateId);
    const res = await deleteCandidate(candidateId);
    if (res.success) {
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSelectedIds(prev => prev.filter(id => id !== candidateId));
      toast(t("dashboard.jobDetail.candidateDeleted"));
    } else {
      toast(t("dashboard.jobDetail.deleteError"), "error");
    }
    setActionLoading(null);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    if (!confirm(t("dashboard.jobDetail.bulkDeleteConfirm", { count: selectedIds.length }))) return;
    setActionLoading("bulk");
    const res = await bulkDeleteCandidates(selectedIds);
    if (res.success) {
      setCandidates(prev => prev.filter(c => !selectedIds.includes(c.id)));
      toast(t("dashboard.jobDetail.bulkDeleted", { count: selectedIds.length }));
      setSelectedIds([]);
    }
    setActionLoading(null);
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    if (selectedIds.length === filteredAndSortedCandidates.length && filteredAndSortedCandidates.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedCandidates.map(c => c.id));
    }
  }

  // ─── Settings actions ───

  async function handleSaveSettings() {
    setSettingsSaving(true);
    const res = await updateJobDetails(jobId, settingsForm);
    if (res.success) {
      setJob(res.job);
      setContextTitle(res.job.title || "");
      refreshJobs();
      toast(t("dashboard.jobDetail.settingsSaved"));
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
    setSettingsSaving(false);
  }

  async function handleCloseApplications() {
    setSettingsSaving(true);
    const res = await updateJobDetails(jobId, { status: "closed" });
    if (res.success) {
      setJob(res.job);
      refreshJobs();
      toast(t("dashboard.jobDetail.applicationsNowClosed"));
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
    setSettingsSaving(false);
  }

  async function handleDeleteJob() {
    if (!confirm(t("dashboard.jobDetail.deleteJobConfirm"))) return;
    setDeletingJob(true);
    const res = await deleteJob(jobId);
    if (res.success) {
      refreshJobs();
      toast(t("dashboard.jobDetail.jobDeleted"));
      router.push("/jobs");
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
      setDeletingJob(false);
    }
  }

  // ─── Context actions ───

  async function handleSaveContext() {
    setContextSaving(true);
    const titre = contextTitle.trim();
    const [res, resTitre] = await Promise.all([
      updateJobDescription(jobId, contextDescription),
      titre && titre !== job?.title ? updateJobDetails(jobId, { title: titre }) : null,
    ]);
    if (resTitre?.success) {
      setJob(resTitre.job);
      setSettingsForm(f => ({ ...f, title: resTitre.job.title || "" }));
      refreshJobs();
    }
    if (res.success && (!resTitre || resTitre.success)) {
      toast(t("dashboard.jobDetail.contextSaved"));
    } else {
      toast(res.error || resTitre?.error || t("dashboard.jobDetail.error"), "error");
    }
    setContextSaving(false);
  }

  // ─── Parcours : nœuds enregistrés et questions de présélection ───

  function getPipelineNodes() {
    let nodes = [];

    if (job?.saved_flow_nodes && job.saved_flow_nodes.length > 0) {
      const isV2 = job.saved_flow_nodes.some(n => n.v2);
      if (isV2) {
        return job.saved_flow_nodes;
      } else {
        // Legacy: inject locked nodes
        const lockedBefore = [{ id: 'locked_sourcing', type: 'sourcing', locked: true, v2: true, config: {} }];
        const lockedAfter = [
          { id: 'locked_entretien_visio', type: 'entretien_visio', locked: true, v2: true, config: {} },
          { id: 'locked_entretien_site', type: 'entretien_site', locked: true, v2: true, config: {} },
          { id: 'locked_debrief_finale', type: 'debrief_finale', locked: true, v2: true, config: {} },
        ];
        const onbordNodes = job.saved_flow_nodes.map(n => n.type === 'accueil' ? { ...n, v2: true } : n);
        nodes = [...lockedBefore, ...onbordNodes, ...lockedAfter];
      }
    } else if (!job?.assessment_config?.modules) {
      // Aucune pipeline enregistrée ET aucune configuration héritée : on affiche
      // la MÊME proposition par défaut que l'étape 3 de la création. Sans cette
      // branche, un brouillon abandonné avant validation retombait sur la
      // dérivation ci-dessous avec des modules vides, et perdait au passage ses
      // questions qualificatives et son nœud d'évaluation.
      nodes = buildDefaultPipeline({ ...job, ...(job?.extracted_criteria || {}) }, job?.experience_locale);
    } else {
      // Offres antérieures à l'éditeur visuel : leur parcours ne vit que dans
      // assessment_config. On continue de le dériver pour ne pas les casser.
      const lockedBefore = [{ id: 'locked_sourcing', type: 'sourcing', locked: true, v2: true, config: {} }];
      const lockedAfter = [
        { id: 'locked_entretien_visio', type: 'entretien_visio', locked: true, v2: true, config: {} },
        { id: 'locked_entretien_site', type: 'entretien_site', locked: true, v2: true, config: {} },
        { id: 'locked_debrief_finale', type: 'debrief_finale', locked: true, v2: true, config: {} },
      ];
      const onbordNodes = [{ id: 'accueil', type: 'accueil', v2: true, config: {} }];

      const modules = job?.assessment_config?.modules || {};
      if (modules.skills_tests?.enabled && modules.skills_tests?.tests?.length > 0) {
        // Le paramètre s’appelle `test` et non `t` : `t` est la fonction de
        // traduction du composant, et la masquer ici cassait les deux.
        modules.skills_tests.tests.forEach((test, i) => {
          const testInfo = testsLibrary.find(lib => lib.id === test.test_id);
          onbordNodes.push({
            id: `skill_${i}`, type: "assessment", v2: true,
            config: { tests: [{ ...test, test_name: testInfo?.name || t("dashboard.jobDetail.test") }] },
          });
        });
      }
      if (modules.ai_interview?.enabled) {
        onbordNodes.push({ id: "ai_interview", type: "ai_interview", v2: true, config: {} });
      }
      onbordNodes.push({ id: 'remerciements', type: 'remerciements', v2: true, config: {} });
      nodes = [...lockedBefore, ...onbordNodes, ...lockedAfter];
    }
    return nodes;
  }

  // Enregistre les questions : met à jour le nœud existant, ou en crée un à la
  // même place que l'ancien bouton « ajouter une étape » (avant les étapes
  // verrouillées de fin). Renvoie true si c'est enregistré.
  async function saveQuestions(questions) {
    const nodes = getPipelineNodes();
    const config = { enabled: questions.length > 0, questions };
    const existant = nodes.find(n => n.type === "qualifying_questions");
    let newNodes;
    if (existant) {
      newNodes = nodes.map(n => n.id === existant.id ? { ...n, config: { ...n.config, ...config }, v2: true } : { ...n, v2: true });
    } else {
      const node = { id: "qualifying_questions_" + Date.now(), type: "qualifying_questions", v2: true, config };
      const firstLockedAfterIndex = nodes.findIndex(n => n.locked && n.type === "entretien_visio");
      const insertAt = firstLockedAfterIndex !== -1 ? firstLockedAfterIndex : Math.max(0, nodes.length - 1);
      newNodes = [...nodes];
      newNodes.splice(insertAt, 0, node);
      newNodes = newNodes.map(n => ({ ...n, v2: true }));
    }
    const res = await updateJobDetails(jobId, { saved_flow_nodes: newNodes });
    if (res.success) {
      setJob(prev => ({ ...prev, saved_flow_nodes: newNodes }));
      toast(t("dashboard.jobDetail.questions.saved"));
      return true;
    }
    toast(res.error || t("dashboard.jobDetail.error"), "error");
    return false;
  }

  // ─── Loading ───

  if (loading) {
    return (
      <>
        <PageHeader crumbs={[{ label: t("dashboard.nav.jobs"), href: "/jobs" }]} title={"…"} />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  const modeTravail = { remote: "remote", hybrid: "hybrid", onsite: "fullTime" }[job?.work_mode];
  const questions = getPipelineNodes().find(n => n.type === "qualifying_questions")?.config?.questions || [];

  // ─── RENDER ───

  return (
    <>
      <PageHeader
        crumbs={[{ label: t("dashboard.nav.jobs"), href: "/jobs" }]}
        title={job?.title || t("dashboard.jobs.untitled")}
        actions={<CopyJobLink jobId={jobId} variant="button" open={entry === null ? undefined : entryIsOpen(entry)} />}
      />

      <div className="ds-tabbar">
        <nav aria-label={t("dashboard.jobDetail.sectionsLabel")} className="ds-tabs">
          {ONGLETS.map(id => (
            <button key={id} type="button" className="ds-tab" aria-selected={activeTab === id} onClick={() => changerOnglet(id)}>
              {t(`dashboard.jobDetail.tabs.${id}`)}
              {id === "candidats" && candidates.length > 0 && <span className="ds-tab-count">{candidates.length}</span>}
            </button>
          ))}
        </nav>
        <span style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 9 }}>
          {job?.location && <span className="ds-chip ds-chip-lg">{job.location}</span>}
          {modeTravail && <span className="ds-chip ds-chip-lg">{t(`dashboard.jobDetail.workMode.${modeTravail}`)}</span>}
          {job?.status === "closed" ? (
            <span className="ds-chip ds-chip-lg"><span className="ds-dot ds-dot-grey" />{t("dashboard.jobDetail.applicationsClosedChip")}</span>
          ) : job?.status === "draft" ? (
            <span className="ds-chip ds-chip-lg ds-chip-amber"><span className="ds-dot ds-dot-amber" />{t("dashboard.jobDetail.draftChip")}</span>
          ) : (
            <span className="ds-chip ds-chip-lg ds-chip-green"><span className="ds-dot ds-dot-green" />{t("dashboard.jobDetail.applicationsOpenChip")}</span>
          )}
        </span>
      </div>

      {activeTab === "parcours" && (
        <ParcoursTab
          job={job}
          jobId={jobId}
          questions={questions}
          experience={experience}
          onEditQuestions={() => setQuestionsOpen(true)}
        />
      )}
      {activeTab === "candidats" && (
        <CandidatsTab
          candidates={filteredAndSortedCandidates}
          total={candidates.length}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          toggleSelectAll={toggleSelectAll}
          handleDelete={handleDelete}
          handleBulkDelete={handleBulkDelete}
          actionLoading={actionLoading}
          jobId={jobId}
        />
      )}
      {activeTab === "context" && (
        <ContextTab
          contextTitle={contextTitle}
          setContextTitle={setContextTitle}
          contextDescription={contextDescription}
          setContextDescription={setContextDescription}
          handleSaveContext={handleSaveContext}
          contextSaving={contextSaving}
        />
      )}
      {activeTab === "parametres" && (
        <ParametresTab
          job={job}
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          handleSaveSettings={handleSaveSettings}
          settingsSaving={settingsSaving}
          handleCloseApplications={handleCloseApplications}
          handleDeleteJob={handleDeleteJob}
          deletingJob={deletingJob}
        />
      )}

      {questionsOpen && (
        <QuestionsDrawer
          jobTitle={job?.title || ""}
          questions={questions}
          onSave={saveQuestions}
          onClose={() => setQuestionsOpen(false)}
        />
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// Parcours candidat
// ═══════════════════════════════════════════════════════

function ParcoursTab({ job, jobId, questions, experience, onEditQuestions }) {
  const { t } = useI18n();
  const steps = experience?.steps || [];
  const competences = listerCompetences(job?.extracted_criteria || {});
  const couverture = calculerCouverture(steps, competences);
  const toutes = [...couverture.must, ...couverture.nice];
  const couvertes = toutes.filter(c => c.refs.length).length;
  const nbCompetences = (i) => toutes.filter(c => c.refs.some(r => r.stepIndex === i)).length;
  const minutes = estimerMinutes(steps);
  const langue = ["fr", "en", "nl"].includes(job?.experience_locale) ? t(`dashboard.jobDetail.journeyCard.in.${job.experience_locale}`) : null;

  return (
    <section aria-labelledby="ds-parcours" className="ds-section">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h2 id="ds-parcours" className="ds-h2">{t("dashboard.jobDetail.journeyCard.title")}</h2>
        <p className="ds-sub">{t("dashboard.jobDetail.journeyCard.subtitle")}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 28px minmax(0, 1fr)", alignItems: "start", gap: 8 }}>

        {/* Étape 1 — questions de présélection */}
        <article aria-labelledby="ds-t-questions" className="ds-panel">
          <div className="ds-panel-head">
            <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span className="ds-eyebrow">{t("dashboard.jobDetail.journeyCard.step", { n: 1 })}</span>
              <h3 id="ds-t-questions" className="ds-h2">{t("dashboard.jobDetail.questions.title")}</h3>
              <span className="ds-sub">
                {questions.length ? t("dashboard.jobDetail.journeyCard.questionsCount", { count: questions.length }) : t("dashboard.jobDetail.journeyCard.noQuestions")}
              </span>
            </span>
            <button type="button" className="ds-btn ds-btn-primary ds-btn-md" onClick={onEditQuestions} style={{ flex: "none" }}>
              {questions.length ? <Pencil size={14} strokeWidth={2} /> : <Plus size={15} strokeWidth={2.2} />}
              {questions.length ? t("dashboard.jobDetail.journeyCard.editQuestions") : t("dashboard.jobDetail.journeyCard.addQuestions")}
            </button>
          </div>
          {questions.length > 0 ? (
            <ol className="ds-inset" style={{ margin: 0, padding: "4px 12px", listStyle: "none", display: "flex", flexDirection: "column", fontSize: 13 }}>
              {questions.map((q, i) => (
                <li key={q.id || i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderTop: i ? "1px solid #E8ECF4" : 0 }}>
                  <span className="ds-mono" style={{ fontSize: 11, color: "var(--ds-ink-5)", paddingTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ flex: 1, color: "var(--ds-ink-2)" }}>{q.text}</span>
                  <span className="ds-chip" style={{ height: 22, padding: "0 7px", borderRadius: 6 }}>
                    {q.expectedAnswer === "no" ? t("dashboard.qualifyingConfig.no") : t("dashboard.qualifyingConfig.yes")}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="ds-inset ds-sub" style={{ textAlign: "center" }}>{t("dashboard.jobDetail.journeyCard.noQuestionsHelp")}</div>
          )}
        </article>

        <span aria-hidden="true" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 90, color: "var(--ds-ink-6)" }}>
          <ArrowRight size={18} strokeWidth={2} />
        </span>

        {/* Étape 2 — simulation */}
        <article aria-labelledby="ds-t-simulation" className="ds-panel">
          <div className="ds-panel-head">
            <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
              <span className="ds-eyebrow">{t("dashboard.jobDetail.journeyCard.step", { n: 2 })}</span>
              <h3 id="ds-t-simulation" className="ds-h2">{t("dashboard.jobDetail.journeyCard.simulation")}</h3>
              <span className="ds-sub">
                {experience
                  ? [t("dashboard.jobDetail.journeyCard.steps", { count: steps.length }), minutes ? `~${minutes} min` : null, langue].filter(Boolean).join(" · ")
                  : t("dashboard.jobDetail.journeyCard.noSimulation")}
              </span>
            </span>
            <Link href={`/jobs/${jobId}/experience`} className="ds-btn ds-btn-primary ds-btn-md" style={{ flex: "none" }}>
              {experience ? <Pencil size={14} strokeWidth={2} /> : <Sparkles size={14} strokeWidth={2} />}
              {experience ? t("dashboard.jobDetail.journeyCard.editSimulation") : t("dashboard.jobDetail.journeyCard.designSimulation")}
            </Link>
          </div>

          {experience && (
            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 9, padding: 12, fontSize: 13 }}>
              {steps.map((s, i) => {
                const { cle, Icone } = natureEtape(s);
                const nature = cle === "call" || cle === "chat"
                  ? t(`dashboard.experienceEditor.overview.${cle}`)
                  : t(`dashboard.experienceEditor.coverage.format.${cle}`);
                const m = minutesEtape(s);
                return (
                  <Link key={s.id} href={`/jobs/${jobId}/experience/etapes/${s.id}`} className="ds-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 9, boxShadow: "none" }}>
                    <span className="ds-icon-tile ds-icon-tile-soft"><Icone size={14} strokeWidth={2} /></span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500, color: "var(--ds-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title || "—"}</span>
                      <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>
                        {[nature.charAt(0).toUpperCase() + nature.slice(1), m ? `${m} min` : null, t("dashboard.experienceEditor.overview.skills", { count: nbCompetences(i) })].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <ChevronRight size={15} strokeWidth={2} color="var(--ds-ink-6)" />
                  </Link>
                );
              })}
              <dl className="ds-kv" style={{ paddingTop: 4 }}>
                <div>
                  <dt>{t("dashboard.home.status")}</dt>
                  <dd><StatusBadge status={experience.experience.status} /></dd>
                </div>
                <div>
                  <dt>{t("dashboard.jobDetail.journeyCard.cvRequired")}</dt>
                  <dd className="ds-chip">{job?.cv_requis === true ? t("dashboard.qualifyingConfig.yes") : t("dashboard.qualifyingConfig.no")}</dd>
                </div>
                {toutes.length > 0 && (
                  <div>
                    <dt>{t("dashboard.jobDetail.journeyCard.coverage")}</dt>
                    <dd className={`ds-chip ${couverture.manquantes.length ? "ds-chip-amber" : ""}`}>
                      {t("dashboard.jobDetail.journeyCard.coverageValue", { covered: couvertes, total: toutes.length })}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════
// Candidats
// ═══════════════════════════════════════════════════════

function CandidatsTab({
  candidates, total, searchQuery, setSearchQuery,
  sortBy, setSortBy,
  selectedIds, toggleSelect, toggleSelectAll,
  handleDelete, handleBulkDelete, actionLoading, jobId
}) {
  const { t } = useI18n();
  const couleurBarre = { high: "var(--ds-green)", mid: "var(--ds-amber)", low: "#D9573F" };
  const fondBarre = { high: "#DCEFE6", mid: "#F6E8D2", low: "#F4E1DD" };
  const encreScore = { high: "var(--ds-green-ink)", mid: "var(--ds-amber-ink)", low: "var(--ds-red)" };

  return (
    <div className="ds-body">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <label className="ds-search" style={{ minWidth: 260 }}>
          <Search size={15} strokeWidth={2} />
          <span className="sr-only">{t("dashboard.jobDetail.searchCandidate")}</span>
          <input type="search" placeholder={t("dashboard.jobDetail.searchCandidate")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selectedIds.length > 0 && (
            <button type="button" className="ds-btn ds-btn-danger ds-btn-sm" onClick={handleBulkDelete} disabled={actionLoading === "bulk"}>
              {actionLoading === "bulk" ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
              {t("dashboard.jobDetail.deleteSelected", { count: selectedIds.length })}
            </button>
          )}
          <label className="ds-sort">
            {t("dashboard.jobs.sort")}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="score_desc">{t("dashboard.jobDetail.sort.scoreDesc")}</option>
              <option value="score_asc">{t("dashboard.jobDetail.sort.scoreAsc")}</option>
              <option value="date_desc">{t("dashboard.jobs.sortRecent")}</option>
            </select>
          </label>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="ds-card ds-empty">
          <span className="ds-empty-title">{searchQuery ? t("dashboard.search.noResults") : t("dashboard.jobDetail.noCandidates")}</span>
          {!searchQuery && <span>{t("dashboard.jobDetail.shareLinkToStart")}</span>}
        </div>
      ) : (
        <div className="ds-table-wrap">
          <table className="ds-table" style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th scope="col" style={{ width: 44, paddingRight: 0 }}>
                  <input
                    type="checkbox"
                    aria-label={t("dashboard.jobDetail.selectAll")}
                    checked={selectedIds.length === candidates.length && candidates.length > 0}
                    onChange={toggleSelectAll}
                    style={{ width: 16, height: 16, margin: 0, cursor: "pointer" }}
                  />
                </th>
                <th scope="col">{t("dashboard.jobDetail.colCandidate")}</th>
                <th scope="col" style={{ width: 200 }}>{t("dashboard.jobDetail.colScore")}</th>
                <th scope="col" style={{ width: 140 }}>{t("dashboard.jobDetail.colStatus")}</th>
                <th scope="col" style={{ width: 190 }}><span className="sr-only">{t("dashboard.jobDetail.colActions")}</span></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const nom = `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || candidate.email;
                const tone = scoreTone(candidate.score_global);
                const ton = TON_STATUT[candidate.status];
                const isLoading = actionLoading === candidate.id;

                return (
                  <tr key={candidate.id} style={{ opacity: isLoading ? 0.5 : 1 }}>
                    <td style={{ paddingRight: 0 }}>
                      <input
                        type="checkbox"
                        aria-label={t("dashboard.jobDetail.selectOne", { name: nom })}
                        checked={selectedIds.includes(candidate.id)}
                        onChange={() => toggleSelect(candidate.id)}
                        style={{ width: 16, height: 16, margin: 0, cursor: "pointer" }}
                      />
                    </td>
                    <th scope="row">
                      <Link href={`/jobs/${jobId}/candidats/${candidate.id}`} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className="ds-avatar">{initials(candidate.first_name, candidate.last_name, candidate.email)}</span>
                        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{nom}</span>
                          <span style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{candidate.email || "—"}</span>
                        </span>
                      </Link>
                    </th>
                    <td>
                      {candidate.score_global != null ? (
                        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="ds-mono" style={{ fontWeight: 500, color: encreScore[tone], width: 40 }}>{candidate.score_global} %</span>
                          <span className="ds-meter" style={{ flex: 1, height: 5, background: fondBarre[tone] }}>
                            <span style={{ width: `${candidate.score_global}%`, background: couleurBarre[tone] }} />
                          </span>
                        </span>
                      ) : <span style={{ color: "var(--ds-ink-5)" }}>—</span>}
                    </td>
                    <td>
                      <span className={`ds-chip ${ton ? `ds-chip-${ton}` : ""}`}>
                        <span className={`ds-dot ds-dot-${ton || "grey"}`} />
                        {candidateStatusLabel(t, candidate.status)}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                        <Link href={`/jobs/${jobId}/candidats/${candidate.id}`} className="ds-btn ds-btn-soft ds-btn-sm">
                          {t("dashboard.jobDetail.viewReport")} <ChevronRight size={14} strokeWidth={2} />
                        </Link>
                        <button
                          type="button"
                          className="ds-icon-btn is-danger"
                          onClick={() => handleDelete(candidate.id)}
                          disabled={isLoading}
                          aria-label={t("dashboard.jobDetail.deleteOne", { name: nom })}
                          title={t("dashboard.jobs.delete")}
                        >
                          <Trash2 size={15} strokeWidth={1.8} />
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {candidates.length > 0 && (
        <span style={{ fontSize: 13, color: "var(--ds-ink-4)" }}>
          {t("dashboard.home.candidatesCount", { count: candidates.length === total ? total : candidates.length })}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Contexte
// ═══════════════════════════════════════════════════════

function ContextTab({ contextTitle, setContextTitle, contextDescription, setContextDescription, handleSaveContext, contextSaving }) {
  const { t } = useI18n();

  return (
    <div className="ds-body">
      <section aria-labelledby="ds-description" className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
          <h2 id="ds-description" className="ds-h2">{t("dashboard.jobDetail.contextTitle")}</h2>
          <p className="ds-sub">{t("dashboard.jobDetail.contextHelp")}</p>
        </div>
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="ds-field" style={{ maxWidth: 520 }}>
            <span className="ds-label">{t("dashboard.jobDetail.title")}</span>
            <input type="text" className="ds-input" value={contextTitle} onChange={e => setContextTitle(e.target.value)} />
          </label>
          <label className="ds-field">
            <span className="ds-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{t("dashboard.jobDetail.markdownContent")}</span>
              <span className="ds-mono" style={{ fontWeight: 400, color: "var(--ds-ink-4)" }}>MARKDOWN</span>
            </span>
            <textarea
              className="ds-textarea ds-mono"
              value={contextDescription}
              onChange={e => setContextDescription(e.target.value)}
              rows={16}
              style={{ padding: "16px 18px", fontSize: 13, lineHeight: 1.7, borderRadius: 10, minHeight: 300 }}
            />
          </label>
        </div>
        <div className="ds-panel-foot">
          <button type="button" className="ds-btn ds-btn-primary" onClick={handleSaveContext} disabled={contextSaving}>
            {contextSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={15} strokeWidth={2} />}
            {t("common.actions.save")}
          </button>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Paramètres
// ═══════════════════════════════════════════════════════

function ParametresTab({ job, settingsForm, setSettingsForm, handleSaveSettings, settingsSaving, handleCloseApplications, handleDeleteJob, deletingJob }) {
  const { t } = useI18n();
  const isClosed = job?.status === "closed";
  const champ = (cle) => ({
    value: settingsForm[cle],
    onChange: e => setSettingsForm(prev => ({ ...prev, [cle]: e.target.value })),
  });

  return (
    <div className="ds-body">
      {/* Détails */}
      <section aria-labelledby="ds-details" className="ds-panel">
        <h2 id="ds-details" className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.jobDetail.details")}</h2>
        <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobDetail.title")}</span>
            <input type="text" className="ds-input" {...champ("title")} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobDetail.location")}</span>
            <input type="text" className="ds-input" {...champ("location")} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobDetail.contractType")}</span>
            <select className="ds-select" {...champ("contract_type")}>
              <option value="">—</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Freelance">{t("dashboard.jobDetail.contract.freelance")}</option>
              <option value="Stage">{t("dashboard.jobDetail.contract.internship")}</option>
              <option value="Alternance">{t("dashboard.jobDetail.contract.apprenticeship")}</option>
              <option value="Intérim">{t("dashboard.jobDetail.contract.temp")}</option>
            </select>
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.jobDetail.employmentType")}</span>
            <select className="ds-select" {...champ("work_mode")}>
              <option value="">—</option>
              <option value="hybrid">{t("dashboard.jobDetail.workMode.hybrid")}</option>
              <option value="onsite">{t("dashboard.jobDetail.workMode.fullTime")}</option>
              <option value="remote">{t("dashboard.jobDetail.workMode.remote")}</option>
            </select>
          </label>
        </div>
        <div className="ds-panel-foot">
          <button type="button" className="ds-btn ds-btn-primary" onClick={handleSaveSettings} disabled={settingsSaving}>
            {settingsSaving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {t("common.actions.save")}
          </button>
        </div>
      </section>

      {/* Visibilité */}
      <section aria-labelledby="ds-visibilite" className="ds-panel">
        <h2 id="ds-visibilite" className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.jobDetail.visibility")}</h2>
        <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
              <span className={`ds-dot ${isClosed ? "ds-dot-grey" : "ds-dot-green"}`} style={{ width: 7, height: 7 }} />
              {isClosed ? t("dashboard.jobDetail.applicationsClosed") : t("dashboard.jobDetail.applicationsOpen")}
            </span>
            <span className="ds-sub">{isClosed ? t("dashboard.jobDetail.applicationsClosedHelp") : t("dashboard.jobDetail.applicationsOpenHelp")}</span>
          </span>
          {!isClosed && (
            <button type="button" className="ds-btn" onClick={handleCloseApplications} disabled={settingsSaving}>
              <Lock size={14} strokeWidth={2} />
              {t("dashboard.jobDetail.closeApplications")}
            </button>
          )}
        </div>
      </section>

      {/* Zone de danger */}
      <section aria-labelledby="ds-danger" className="ds-panel ds-panel-danger">
        <h2 id="ds-danger" className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.jobDetail.dangerZone")}</h2>
        <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 560 }}>
            <span style={{ fontWeight: 500 }}>{t("dashboard.jobDetail.deleteJob")}</span>
            <span style={{ fontSize: 13, color: "var(--ds-red-ink-2)" }}>{t("dashboard.jobDetail.deleteJobHelp")}</span>
          </span>
          <button type="button" className="ds-btn ds-btn-danger" onClick={handleDeleteJob} disabled={deletingJob}>
            {deletingJob ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} strokeWidth={2} />}
            {t("dashboard.jobDetail.delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
