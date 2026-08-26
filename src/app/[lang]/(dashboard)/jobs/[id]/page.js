"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  ArrowLeft, Search, Trash2, Eye, Loader2, Link2, CheckCircle2,
  ArrowUpDown, ChevronDown, ChevronUp, TrendingDown, TrendingUp,
  CalendarArrowDown, CalendarArrowUp, ArrowDownAZ, ArrowUpZA,
  Lock, Unlock, Plus, MoreHorizontal, ChevronRight, Save,
  Users, X, ShieldCheck, BrainCircuit, MessageSquare, Video, Check, Info
} from "lucide-react";
import {
  getCandidatesForJob, getJobDetail,
  deleteCandidate, bulkDeleteCandidates,
  updateJobDetails, updateJobDescription,
  deleteJob
} from "@/lib/actions/candidate";
import { getTestsLibrary, selectQuestionsForJob, saveVideoInterviewConfig } from "@/lib/actions/assessment";
import { getExperienceForJob } from "@/lib/actions/experience";
import { estimerMinutes } from "@/lib/experienceDuree";
import { getJobEntry } from "@/lib/actions/run";
import { entryIsOpen } from "@/lib/candidateEntry";
import { buildDefaultPipeline } from "@/lib/pipelineTemplate";
import { EXPERIENCE_V1_ONLY } from "@/lib/constants/features";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import PipelineNodeConfigPanel from "@/components/jobs/PipelineNodeConfigPanel";
import AssessmentSelectionModal from "@/components/assessment/AssessmentSelectionModal";
import AssessmentActionModal from "@/components/assessment/AssessmentActionModal";
import AssessmentCreationFlow from "@/components/assessment/AssessmentCreationFlow";
import PipelineVisualEditor from "@/components/jobs/PipelineVisualEditor";

// ─── Helpers ───

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e" };
  return { bg: "#fee2e2", color: "#991b1b" };
}

// `t` en paramètre : le libellé se traduit, la CLASSE CSS non. Un statut inconnu
// retombe sur sa valeur brute en base — c'est volontaire, ça se voit à l'écran
// plutôt que de disparaître.
function getStatusBadge(t, status) {
  const classNames = {
    invited: "badge-primary",
    in_progress: "badge-warning",
    termine: "badge-outline",
    soumis: "badge-success",
    scored: "badge-success",
    shortlisted: "badge-success",
    rejected: "badge-destructive",
    disqualified: "badge-destructive",
  };
  if (!classNames[status]) return { label: status, className: "badge-muted" };
  return { label: t(`dashboard.candidateStatus.${status}`), className: classNames[status] };
}

// ─── Main tabs ───
// Bascule douce (EXPERIENCE_V1_ONLY) : les onglets hérités Pipelines/Évaluations
// (catégorie C) sont masqués ; la configuration passe par l'écran Expérience.
// Seuls les IDENTIFIANTS restent en constantes de module ; les libellés se
// résolvent au rendu (voir tabsFor / pipelineNodeLabels plus bas). Une constante
// de module figerait le français au chargement du bundle, avant que le provider
// n'existe.
const TAB_IDS = [
  "pipelines",
  ...(EXPERIENCE_V1_ONLY ? [] : ["evaluations"]),
  "candidats",
  "context",
  "parametres",
];

const tabsFor = (t) =>
  TAB_IDS.map((id) => ({ id, label: t(`dashboard.jobDetail.tabs.${id}`) }));

// ─── Pipeline node labels ───
// `editable` et `subtitle` sont des propriétés de STRUCTURE (elles pilotent le
// rendu), pas du texte : elles restent ici. Seuls les libellés sont traduits.
const PIPELINE_NODES = {
  sourcing: { editable: false },
  accueil: { editable: false },
  qualifying_questions: { editable: true },
  cv_scoring: { editable: true },
  assessment: { editable: true, subtitleKey: "dashboard.pipelineNodes.assessmentSubtitle" },
  ai_interview: { editable: true },
  single_video_question: { editable: true },
  remerciements: { editable: false },
  entretien_visio: { editable: false, subtitleKey: "dashboard.pipelineNodes.customStep" },
  entretien_site: { editable: false, subtitleKey: "dashboard.pipelineNodes.customStep" },
  debrief_finale: { editable: false, subtitleKey: "dashboard.pipelineNodes.customStep" },
};

/** Étape de pipeline avec son libellé traduit, ou null si le type est inconnu. */
function pipelineNode(t, type) {
  const node = PIPELINE_NODES[type];
  if (!node) return null;
  return {
    ...node,
    label: t(`dashboard.pipelineNodes.${type}`),
    subtitle: node.subtitleKey ? t(node.subtitleKey) : undefined,
  };
}

// ─── Component ───

export default function JobDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;
  const { toast } = useToast();

  // Global state
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(EXPERIENCE_V1_ONLY ? "candidats" : "pipelines");
  const [copiedId, setCopiedId] = useState(null);
  const [entry, setEntry] = useState(null); // l'offre accepte-t-elle des candidats ?
  // Ce que la carte Expérience doit annoncer : générée ou non, combien d'étapes,
  // publiée ou brouillon. Un simple compteur, comme celui des questions
  // qualificatives juste à côté.
  const [experience, setExperience] = useState(null);

  // Candidates tab state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [sortBy, setSortBy] = useState("score_desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  // Pipeline tab state
  const [pipelineLocked, setPipelineLocked] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Evaluations tab state
  const [testsLibrary, setTestsLibrary] = useState([]);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showAssessmentActionModal, setShowAssessmentActionModal] = useState(false);
  const [assessmentCreationMode, setAssessmentCreationMode] = useState(false);
  const [linkingNodeId, setLinkingNodeId] = useState(null);

  // Context tab state
  const [contextDescription, setContextDescription] = useState("");
  const [contextSaving, setContextSaving] = useState(false);

  // Settings tab state
  const [settingsForm, setSettingsForm] = useState({ title: "", location: "", contract_type: "", work_mode: "" });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);

  // ─── Load data ───

  useEffect(() => {
    loadData();
  }, [jobId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    }
    if (sortMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortMenuOpen]);

  async function loadData() {
    setLoading(true);
    const [jobRes, candidatesRes, testsRes, entryRes, expRes] = await Promise.all([
      getJobDetail(jobId),
      getCandidatesForJob(jobId),
      getTestsLibrary(),
      // Verdict serveur : l'ouverture de l'offre ne se déduit PAS de la lecture
      // ci-dessous — la version la plus récente non archivée peut être un
      // brouillon, qui masquerait la version publiée.
      getJobEntry(jobId),
      getExperienceForJob(jobId),
    ]);
    setEntry(entryRes?.entry || "not_ready");
    setExperience(
      expRes?.success && expRes.experience
        ? {
            statut: expRes.experience.status,
            nbEtapes: (expRes.steps || []).length,
            minutes: estimerMinutes(expRes.steps || []),
          }
        : null
    );
    if (jobRes.success) {
      setJob(jobRes.job);
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

  // ─── Shared actions ───

  function copyApplyLink() {
    // Digue : tant qu'aucune expérience n'est publiée, le lien mène à un écran
    // d'attente. Le diffuser reviendrait à envoyer des candidats dans le vide.
    if (!entryIsOpen(entry)) {
      toast(t("dashboard.jobDetail.publishFirst"), "error");
      return;
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    const link = isLocal ? `${origin}/apply/${jobId}` : `https://app.onbord.be/apply/${jobId}`;
    navigator.clipboard.writeText(link);
    setCopiedId("apply_link");
    setTimeout(() => setCopiedId(null), 3000);
    toast(t("dashboard.jobDetail.publicLinkCopied"));
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
      if (sortBy === "date_asc") return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === "name_asc") return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      if (sortBy === "name_desc") return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
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
    if (!confirm(`Supprimer ${selectedIds.length} candidat(s) ?`)) return;
    setActionLoading("bulk");
    const res = await bulkDeleteCandidates(selectedIds);
    if (res.success) {
      setCandidates(prev => prev.filter(c => !selectedIds.includes(c.id)));
      toast(`${selectedIds.length} candidat(s) supprimé(s)`);
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
      toast(t("dashboard.jobDetail.jobDeleted"));
      router.push("/jobs");
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
      setDeletingJob(false);
    }
  }

  async function handleDeletePipelineNode(nodeId) {
    const currentNodes = getPipelineNodes();
    const newNodes = currentNodes.filter(n => n.id !== nodeId);
    
    // Ensure all nodes have v2 flag so we don't re-inject legacy nodes later
    const v2Nodes = newNodes.map(n => ({ ...n, v2: true }));
    
    const res = await updateJobDetails(jobId, { saved_flow_nodes: v2Nodes });
    if (res.success) {
      toast(t("dashboard.jobDetail.stepDeleted"));
      setJob({ ...job, saved_flow_nodes: v2Nodes });
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
  }

  // Synchronise les questions vidéo des nœuds "single_video_question" du pipeline vers
  // assessment_config.modules.video_interview — ce que lit le parcours candidat. Sans
  // ça, les questions vidéo configurées dans le pipeline restent invisibles au candidat.
  async function syncVideoConfigFromNodes(nodes) {
    const videoNodes = nodes.filter(n => n.type === 'single_video_question');
    const questions = videoNodes
      .flatMap(n => n.config?.questions || [])
      .filter(q => q && typeof q.text === 'string' && q.text.trim());
    if (questions.length === 0) return;
    const firstCfg = videoNodes[0]?.config || {};
    await saveVideoInterviewConfig(jobId, {
      questions,
      max_duration_seconds: firstCfg.max_duration_seconds || 120,
      max_retakes: firstCfg.max_retakes !== undefined ? firstCfg.max_retakes : 1,
    });
  }

  async function handleUpdateNodeConfig(nodeId, newConfig) {
    const currentNodes = getPipelineNodes();
    const newNodes = currentNodes.map(n =>
      n.id === nodeId ? { ...n, config: { ...n.config, ...newConfig }, v2: true } : { ...n, v2: true }
    );

    // Auto-save
    const res = await updateJobDetails(jobId, { saved_flow_nodes: newNodes });
    if (res.success) {
      setJob({ ...job, saved_flow_nodes: newNodes });
      // Sync vidéo → config candidat si le nœud édité est une question vidéo
      const editedNode = newNodes.find(n => n.id === nodeId);
      if (editedNode?.type === 'single_video_question') {
        await syncVideoConfigFromNodes(newNodes);
      }
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
  }

  async function handleAddPipelineNode(type) {
    const newNode = {
      id: type + '_' + Date.now(),
      type: type,
      v2: true,
      config: type === 'single_video_question' ? { questions: [], max_duration_seconds: 120, max_retakes: 1, evaluation_mode: "ai" } 
            : type === 'assessment' ? { title: t("dashboard.jobDetail.skillsTest") }
            : type === 'qualifying_questions' ? { questions: [] }
            : {}
    };
    
    const currentNodes = getPipelineNodes();
    // Insert before the first locked "after" node (entretien_visio), not at the very end
    const firstLockedAfterIndex = currentNodes.findIndex(n => n.locked && n.type === 'entretien_visio');
    const insertAt = firstLockedAfterIndex !== -1 ? firstLockedAfterIndex : currentNodes.length - 1;
    
    const newNodes = [...currentNodes];
    newNodes.splice(insertAt, 0, newNode);

    // Auto-save
    const res = await updateJobDetails(jobId, { saved_flow_nodes: newNodes.map(n => ({...n, v2: true})) });
    if (res.success) {
      toast(t("dashboard.jobDetail.stepAdded"));
      setJob({ ...job, saved_flow_nodes: newNodes.map(n => ({...n, v2: true})) });
      setSelectedNodeId(newNode.id);
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
  }

  // ─── Context actions ───

  async function handleSaveContext() {
    setContextSaving(true);
    const res = await updateJobDescription(jobId, contextDescription);
    if (res.success) {
      toast(t("dashboard.jobDetail.contextSaved"));
    } else {
      toast(res.error || t("dashboard.jobDetail.error"), "error");
    }
    setContextSaving(false);
  }

  // ─── Pipeline helpers ───

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

  // ─── Evaluations helpers ───

  function getAssessmentCards() {
    const modules = job?.assessment_config?.modules || {};
    const cards = [];

    // Read from saved_flow_nodes instead of old assessment_config
    if (job?.saved_flow_nodes) {
      const assessmentNodes = job.saved_flow_nodes.filter(n => n.type === 'assessment');
      assessmentNodes.forEach(node => {
        const testId = node.config?.test_id;
        const isCustom = node.config?.isCustomRequest;
        
        if (isCustom) {
          cards.push({
            id: node.id,
            nodeId: node.id,
            name: t("dashboard.jobDetail.customCreation"),
            category: t("dashboard.jobDetail.pending"),
            questionCount: null,
            duration: null,
            isConfigured: true,
            isCustomRequest: true,
          });
        } else if (testId) {
          const testInfo = testsLibrary.find(lib => lib.id === testId);
          // Chercher aussi le nom dans assessment_config pour les tests liés après création
          const configTest = (job?.assessment_config?.modules?.skills_tests?.tests || []).find(t => t.test_id === testId);
          cards.push({
            id: testId,
            nodeId: node.id,
            name: node.config?.title || testInfo?.name || configTest?.test_name || t("dashboard.jobDetail.test"),
            category: testInfo?.category || t("dashboard.pipelineNodes.assessment"),
            questions: testInfo?.questions?.length || null,
            questionCount: testInfo?.questions?.length || 10,
            duration: testInfo?.estimated_duration_minutes || 7,
            isConfigured: true,
          });
        } else {
          cards.push({
            id: node.id, // Use node ID as temporary ID for empty slots
            nodeId: node.id,
            name: node.config?.title || t("dashboard.jobDetail.skillsTest"),
            category: t("dashboard.jobDetail.notConfigured"),
            questionCount: 0,
            duration: 0,
            isConfigured: false,
          });
        }
      });
    }

    // AI Interview
    if (modules.ai_interview?.enabled) {
      cards.push({
        id: "ai_interview",
        name: t("dashboard.pipelineNodes.ai_interview"),
        category: t("dashboard.jobDetail.videoQuestions"),
        questionCount: 4,
        duration: 10,
      });
    }

    // Video interview
    if (modules.video_interview?.enabled && modules.video_interview?.questions?.length > 0) {
      cards.push({
        id: "video_interview",
        name: t("dashboard.jobDetail.videoInterview"),
        category: t("dashboard.jobDetail.videoQuestions"),
        questionCount: modules.video_interview.questions.length,
        duration: Math.round((modules.video_interview.questions.length * (modules.video_interview.max_duration_seconds || 120)) / 60),
      });
    }

    return cards;
  }

  // ─── Evaluation Tab Actions ───

  async function handleLinkAssessment(test) {
    if (!linkingNodeId || !job?.saved_flow_nodes) return;
    
    // Update the specific node in saved_flow_nodes
    const updatedFlowNodes = job.saved_flow_nodes.map(node => {
      if (node.id === linkingNodeId) {
        if (typeof test === 'object' && test.custom) {
          return {
            ...node,
            config: {
              ...node.config,
              test_id: null,
              title: t("dashboard.jobDetail.customCreation"),
              isCustomRequest: true,
              customRole: test.role,
              customSkills: test.skills,
              configured: true
            }
          };
        } else {
          const testName = typeof test === 'object' ? test.name : null;
          return {
            ...node,
            config: {
              ...node.config,
              test_id: typeof test === 'object' ? test.id : test,
              title: testName || node.config?.title || t("dashboard.jobDetail.aiEvaluation"),
              isCustomRequest: false,
              configured: true
            }
          };
        }
      }
      return node;
    });

    const res = await updateJobDetails(jobId, { saved_flow_nodes: updatedFlowNodes });
    if (res.success) {
      // Synchronise le test choisi dans assessment_config.modules.skills_tests — c'est
      // ce que lit le parcours candidat. Sans ça, le test apparaît dans le pipeline
      // mais le candidat ne le voit jamais (bug « tests pas sauvegardés »).
      const isCustom = typeof test === 'object' && test.custom;
      if (!isCustom) {
        const testId = typeof test === 'object' ? test.id : test;
        if (testId) {
          const syncRes = await selectQuestionsForJob(jobId, testId);
          if (syncRes.success) {
            setJob(prev => ({
              ...prev,
              assessment_config: {
                ...(prev.assessment_config || {}),
                modules: {
                  ...(prev.assessment_config?.modules || {}),
                  skills_tests: {
                    ...(prev.assessment_config?.modules?.skills_tests || {}),
                    enabled: true,
                    tests: [
                      ...((prev.assessment_config?.modules?.skills_tests?.tests || []).filter(t => t.test_id !== testId)),
                      { test_id: testId, test_name: typeof test === 'object' ? test.name : null, selected_question_ids: syncRes.selectedIds || [] },
                    ],
                  },
                },
              },
            }));
          } else {
            toast(t("dashboard.jobDetail.testLinkedSyncError"), "error");
          }
        }
      }
      setJob(prev => ({ ...prev, saved_flow_nodes: updatedFlowNodes }));
      setShowAssessmentModal(false);
      setLinkingNodeId(null);
      toast(t("dashboard.jobDetail.testLinked"));
    } else {
      toast(t("dashboard.jobDetail.testLinkError"), "error");
    }
  }

  async function handleTestCreated(testId) {
    setAssessmentCreationMode(false);
    
    // Reload tests library and job data to pick up the test sync
    const [testsRes, jobRes] = await Promise.all([
      getTestsLibrary(),
      getJobDetail(jobId),
    ]);
    if (testsRes.success) {
      setTestsLibrary(testsRes.tests);
    }
    if (jobRes.success) {
      setJob(jobRes.job);
    }
    // If we have a linking node, also update the pipeline node
    if (testsRes.success) {
      const testData = testsRes.tests.find(t => t.id === testId);
      if (testData && linkingNodeId) {
        handleLinkAssessment({ id: testId, name: testData.name });
      }
    }
  }

  // ─── Loading ───

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // ─── Subtitle ───
  const subtitleParts = [job?.location, job?.contract_type, job?.work_mode === "remote" ? t("dashboard.jobDetail.workMode.remote") : job?.work_mode === "hybrid" ? t("dashboard.jobDetail.workMode.hybrid") : job?.work_mode === "onsite" ? t("dashboard.jobDetail.workMode.fullTime") : null].filter(Boolean);

  // ─── RENDER ───

  return (
    <div className="fade-in">
      {/* Overlay for Assessment/Experience Creation */}
      {assessmentCreationMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'white', overflow: 'auto' }}>
          <AssessmentCreationFlow 
            jobData={job}
            onCancel={() => setAssessmentCreationMode(false)}
            onTestCreated={async (test) => {
              await handleLinkAssessment(test);
              setAssessmentCreationMode(false);
            }}
          />
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.25rem" }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push("/jobs")} title={t("dashboard.jobDetail.back")} style={{ marginTop: "4px" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--foreground)", lineHeight: 1.2 }}>
            {job?.title || t("dashboard.jobDetail.jobLabel")}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            {subtitleParts.join(" · ")}
          </p>
        </div>

        {/* Le pilotage de l'expérience passe par les cartes de la pipeline
            (onglet Parcours), plus par un bouton en haut de page. */}
        <button
          onClick={copyApplyLink}
          disabled={entry !== null && !entryIsOpen(entry)}
          title={entry !== null && !entryIsOpen(entry)
            ? t("dashboard.jobDetail.publishFirstShort")
            : undefined}
          className="btn btn-primary"
          style={{
            display: "flex", alignItems: "center", gap: "8px", flexShrink: 0,
            opacity: entry !== null && !entryIsOpen(entry) ? 0.5 : 1,
            cursor: entry !== null && !entryIsOpen(entry) ? "not-allowed" : "pointer",
          }}
        >
          {copiedId === "apply_link" ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
          {copiedId === "apply_link" ? t("dashboard.jobDetail.linkCopied") : t("dashboard.jobDetail.copyPublicLink")}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", marginTop: "1rem" }}>
        {tabsFor(t).map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px", fontSize: "14px", fontWeight: "500",
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                background: "transparent", border: "none",
                borderBottom: isActive ? "2px solid var(--foreground)" : "2px solid transparent",
                cursor: "pointer", transition: "all 150ms",
                marginBottom: "-1px"
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "pipelines" && (
        <PipelinesTab 
          job={job}
          experience={experience}
          pipelineLocked={pipelineLocked} 
          setPipelineLocked={setPipelineLocked} 
          getPipelineNodes={getPipelineNodes} 
          testsLibrary={testsLibrary} 
          handleDeletePipelineNode={handleDeletePipelineNode}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          handleAddPipelineNode={handleAddPipelineNode}
          onOpenExperience={() => router.push(`/jobs/${jobId}/experience`)}
          onNodesChange={async (newNodes) => {
            const res = await updateJobDetails(jobId, { saved_flow_nodes: newNodes });
            if (res.success) {
              setJob({ ...job, saved_flow_nodes: newNodes });
            } else {
              toast(res.error || t("dashboard.jobDetail.error"), "error");
            }
          }}
          onAIAssessmentClick={(nodeId) => {
            setLinkingNodeId(nodeId);
            setShowAssessmentActionModal(true);
          }}
        />
      )}
      {activeTab === "evaluations" && (
        <EvaluationsTab 
          cards={getAssessmentCards()} 
          onLinkAssessment={(nodeId) => {
            setLinkingNodeId(nodeId);
            setShowAssessmentActionModal(true);
          }}
          assessmentCreationMode={assessmentCreationMode}
          jobData={job}
          onCancelCreation={() => setAssessmentCreationMode(false)}
          onTestCreated={async (test) => {
            await handleLinkAssessment(test);
            setAssessmentCreationMode(false);
          }}
        />
      )}
      {activeTab === "candidats" && (
        <CandidatsTab
          candidates={filteredAndSortedCandidates}
          allCandidates={candidates}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortMenuOpen={sortMenuOpen}
          setSortMenuOpen={setSortMenuOpen}
          sortMenuRef={sortMenuRef}
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
          job={job}
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

      {/* Side panel */}
      {selectedNodeId && (
        <PipelineNodeConfigPanel
          selectedNode={getPipelineNodes().find(n => n.id === selectedNodeId)}
          nodeTypeInfo={pipelineNode(t, getPipelineNodes().find(n => n.id === selectedNodeId)?.type)}
          jobData={job}
          onClose={() => setSelectedNodeId(null)}
          onUpdateConfig={handleUpdateNodeConfig}
          onLinkAssessmentClick={(nodeId) => {
            setSelectedNodeId(null);
            setLinkingNodeId(nodeId);
            setShowAssessmentModal(true);
          }}
          onAIAssessmentClick={(nodeId) => {
            setSelectedNodeId(null);
            setLinkingNodeId(nodeId);
            setShowAssessmentActionModal(true);
          }}
        />
      )}

      {/* Assessment Selection Modal */}
      {showAssessmentModal && linkingNodeId && (
        <AssessmentSelectionModal
          isOpen={true}
          jobId={jobId}
          onClose={() => {
            setShowAssessmentModal(false);
            setLinkingNodeId(null);
          }}
          onSelect={handleLinkAssessment}
          testsLibrary={testsLibrary}
        />
      )}

      {/* Assessment Action Modal */}
      {showAssessmentActionModal && linkingNodeId && (
        <AssessmentActionModal
          isOpen={true}
          onClose={() => {
            setShowAssessmentActionModal(false);
            setLinkingNodeId(null);
          }}
          onAddAI={() => {
            setShowAssessmentActionModal(false);
            setAssessmentCreationMode(true);
            setActiveTab("evaluations");
          }}
          onSelectLibrary={() => {
            setShowAssessmentActionModal(false);
            setShowAssessmentModal(true);
          }}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 1 — Pipelines
// ═══════════════════════════════════════════════════════

// Types de nœuds hérités désormais obsolètes (bascule Experience). On les retire
// et on reconstruit une pipeline V1 déterministe :
//   [sourcing] → Questions qualif (si présentes) → Expérience candidat
//   → [étapes verrouillées de fin]
// La carte Expérience est le point d'entrée.
//
// Les cartes « message de bienvenue » et « message de remerciement » ont été
// retirées : personnaliser ces deux textes n'apporte rien tant qu'on n'a pas de
// clients pour le demander, et elles occupaient deux cartes sur quatre dans le
// parcours. Le candidat voit les textes par défaut (app/run/[token]/page.js),
// qui restent traduits. La colonne reste en base, non lue.
const LEGACY_EVAL_NODE_TYPES = ["cv_scoring", "assessment", "ai_interview", "single_video_question", "accueil", "remerciements"];

function buildV1PipelineNodes(rawNodes, experience) {
  if (!EXPERIENCE_V1_ONLY) return rawNodes;
  const filtered = rawNodes.filter((n) => !LEGACY_EVAL_NODE_TYPES.includes(n.type));
  const before = filtered.filter((n) => n.locked && n.type === "sourcing");
  const after = filtered.filter((n) => n.locked && n.type !== "sourcing");
  const qualifying = filtered.find((n) => n.type === "qualifying_questions");
  const middle = [
    ...(qualifying ? [qualifying] : []),
    // L'état de l'expérience voyage dans la config du nœud, comme le nombre de
    // questions du nœud qualificatif juste avant : la carte doit dire ce qui EST,
    // pas répéter « cliquez pour configurer » sur une expérience déjà générée.
    { id: "experience_main", type: "experience", v2: true, config: { experience } },
  ];
  return [...before, ...middle, ...after];
}

function PipelinesTab({ job, experience, pipelineLocked, setPipelineLocked, getPipelineNodes, testsLibrary, handleDeletePipelineNode, selectedNodeId, setSelectedNodeId, handleAddPipelineNode, onOpenExperience, onNodesChange, onAIAssessmentClick }) {
  const { t, locale } = useI18n();
  const pipelineNodes = buildV1PipelineNodes(getPipelineNodes(), experience);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Cliquer le bloc Expérience ouvre l'écran de config/relecture (étape 3) ;
  // les autres nœuds éditables ouvrent leur panneau latéral comme avant.
  function handleNodeClick(nodeId) {
    const node = pipelineNodes.find((n) => n.id === nodeId);
    if (node?.type === "experience") { onOpenExperience?.(); return; }
    setSelectedNodeId(nodeId);
  }

  return (
    <div style={{ paddingTop: "8px" }}>
      <PipelineVisualEditor
        nodes={pipelineNodes}
        isEditable={!pipelineLocked}
        selectedNodeId={selectedNodeId}
        onNodeClick={handleNodeClick}
        onAssessmentClick={(nodeId) => {
          setSelectedNodeId(null);
          if (onAIAssessmentClick) onAIAssessmentClick(nodeId);
        }}
        onAddNode={handleAddPipelineNode}
        onDeleteNode={(e, nodeId) => handleDeletePipelineNode(nodeId)}
        onNodesChange={onNodesChange}
        headerActions={
          <button
            onClick={() => setPipelineLocked(!pipelineLocked)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--muted-foreground)", padding: "4px", borderRadius: "4px",
              display: "flex", alignItems: "center",
              transition: "color 150ms"
            }}
            title={pipelineLocked ? t("dashboard.jobDetail.unlockPipeline") : t("dashboard.jobDetail.lockPipeline")}
          >
            {pipelineLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        }
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 2 — Évaluations
// ═══════════════════════════════════════════════════════

function EvaluationsTab({ cards, onLinkAssessment, assessmentCreationMode, jobData, onCancelCreation, onTestCreated }) {
  const { t, locale } = useI18n();
  const [hoveredCard, setHoveredCard] = useState(null);

  if (assessmentCreationMode) {
    return (
      <AssessmentCreationFlow 
        jobData={jobData}
        onCancel={onCancelCreation}
        onTestCreated={onTestCreated}
      />
    );
  }

  return (
    <div>
      {/* Cards grid */}
      {cards.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <BrainCircuit size={48} style={{ color: "var(--muted-foreground)", opacity: 0.4, margin: "0 auto 1rem" }} />
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{t("dashboard.jobDetail.noAssessment")}</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            {t("dashboard.jobDetail.addTestsHint")}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {cards.map((card, idx) => {
            const isConfigured = card.isConfigured !== false;
            
            if (!isConfigured) {
              // Empty slot rendering
              return (
                <div
                  key={`${card.id}_${idx}`}
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "20px",
                    background: "transparent",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    minHeight: "140px"
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "12px", textAlign: "center" }}>
                    Slot {card.name} (vide)
                  </div>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => onLinkAssessment && onLinkAssessment(card.nodeId)}
                    style={{ fontSize: "13px" }}
                  >
                    {t("dashboard.jobDetail.linkTest")}
                  </button>
                </div>
              );
            }

            // Configured slot rendering
            return (
              <div
                key={`${card.id}_${idx}`}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "20px",
                  background: "var(--card)",
                  cursor: "pointer",
                  transition: "all 150ms",
                  position: "relative",
                }}
              >
                {/* Three-dot menu — visible only on hover */}
                {hoveredCard === card.id && (
                  <button
                    style={{
                      position: "absolute", top: "16px", right: "16px",
                      background: "transparent", border: "none", cursor: "pointer",
                      color: "var(--muted-foreground)", padding: "4px",
                      borderRadius: "4px", display: "flex",
                      transition: "color 150ms"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--foreground)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--muted-foreground)"}
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                )}

                <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "4px", paddingRight: "24px", display: "flex", alignItems: "center", gap: "6px" }}>
                  {card.name}
                  {card.isCustomRequest && (
                    <span title={t("dashboard.jobDetail.testBeingCreated")} style={{ color: "var(--primary)", display: "flex" }}>
                       <Info size={14} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "2px" }}>
                  {card.category}
                </div>
                {card.questionCount > 0 && (
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {card.questionCount} questions
                  </div>
                )}
                {card.duration > 0 && (
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {card.duration} min
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 3 — Candidats
// ═══════════════════════════════════════════════════════

function CandidatsTab({
  candidates, allCandidates, searchQuery, setSearchQuery,
  sortBy, setSortBy, sortMenuOpen, setSortMenuOpen, sortMenuRef,
  selectedIds, toggleSelect, toggleSelectAll,
  handleDelete, handleBulkDelete, actionLoading, jobId
}) {
  const { t, locale } = useI18n();
  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            className="input-field"
            placeholder={t("dashboard.jobDetail.searchCandidate")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "36px", height: "40px" }}
          />
        </div>

        {/* Sort dropdown */}
        <div ref={sortMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setSortMenuOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              height: '40px', padding: '0 14px',
              background: sortMenuOpen ? 'var(--primary)' : 'var(--card)',
              color: sortMenuOpen ? 'white' : 'var(--foreground)',
              border: `1px solid ${sortMenuOpen ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: '4px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              transition: 'all 150ms', whiteSpace: 'nowrap',
            }}
          >
            <ArrowUpDown size={14} />
            {{
              score_desc: 'Score ↓',
              score_asc:  'Score ↑',
              date_desc:  t('dashboard.jobDetail.sort.dateRecent'),
              date_asc:   t('dashboard.jobDetail.sort.dateOld'),
              name_asc:   t('dashboard.jobDetail.sort.nameAsc'),
              name_desc:  t('dashboard.jobDetail.sort.nameDesc'),
            }[sortBy]}
            {sortMenuOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {sortMenuOpen && (
            <div
              className="fade-in"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '6px', boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)',
                zIndex: 50, minWidth: '200px', overflow: 'hidden', padding: '6px',
              }}
            >
              {[
                { group: t('dashboard.jobDetail.sort.score'), options: [
                  { value: 'score_desc', label: t('dashboard.jobDetail.sort.scoreDesc'), Icon: TrendingDown },
                  { value: 'score_asc',  label: t('dashboard.jobDetail.sort.scoreAsc'),  Icon: TrendingUp  },
                ]},
                { group: t('dashboard.jobDetail.sort.date'), options: [
                  { value: 'date_desc', label: t('dashboard.jobDetail.sort.dateDesc'), Icon: CalendarArrowDown },
                  { value: 'date_asc',  label: t('dashboard.jobDetail.sort.dateAsc'),  Icon: CalendarArrowUp  },
                ]},
                { group: t('dashboard.jobDetail.sort.name'), options: [
                  { value: 'name_asc',  label: 'A → Z', Icon: ArrowDownAZ },
                  { value: 'name_desc', label: 'Z → A', Icon: ArrowUpZA  },
                ]},
              ].map(({ group, options }) => (
                <div key={group}>
                  <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--muted-foreground)', textTransform: 'uppercase', padding: '6px 10px 4px' }}>
                    {group}
                  </div>
                  {options.map(({ value, label, Icon }) => {
                    const isActive = sortBy === value;
                    return (
                      <button
                        key={value}
                        onClick={() => { setSortBy(value); setSortMenuOpen(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          width: '100%', padding: '8px 10px', border: 'none',
                          background: isActive ? 'var(--accent)' : 'transparent',
                          color: 'var(--foreground)',
                          borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--secondary)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Icon size={15} style={{ opacity: isActive ? 1 : 0.5 }} />
                        {label}
                        {isActive && (
                          <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--foreground)', display: 'inline-block' }} />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginLeft: "auto", padding: "8px 16px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
            <span style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>
              {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
            </span>
            <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#991b1b", border: "none" }} onClick={handleBulkDelete} disabled={actionLoading === "bulk"}>
              <Trash2 size={14} /> Supprimer
            </button>
            {actionLoading === "bulk" && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          </div>
        )}
      </div>

      {/* Table */}
      {candidates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={48} style={{ color: "var(--muted-foreground)", opacity: 0.4, marginBottom: "1rem" }} />
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{t("dashboard.jobDetail.noCandidates")}</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            {t("dashboard.jobDetail.shareLinkToStart")}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === candidates.length && candidates.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                <th>CANDIDAT</th>
                <th>SCORE GLOBAL</th>
                <th>STATUT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(candidate => {
                const globalScoreStyle = candidate.score_global != null ? getScoreColor(candidate.score_global) : null;
                const statusBadge = getStatusBadge(t, candidate.status);
                const initials = `${(candidate.first_name || "?")[0]}${(candidate.last_name || "?")[0]}`.toUpperCase();
                const isSelected = selectedIds.includes(candidate.id);
                const isLoading = actionLoading === candidate.id;

                return (
                  <tr key={candidate.id} style={{ opacity: isLoading ? 0.5 : 1 }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(candidate.id)}
                        style={{ cursor: "pointer", width: "16px", height: "16px" }}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "6px",
                          background: "var(--foreground)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: "600", flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "14px" }}>{candidate.first_name} {candidate.last_name}</div>
                          <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{candidate.email || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {candidate.score_global != null ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "4px 12px", borderRadius: "4px", fontWeight: "800", fontSize: "14px",
                          background: globalScoreStyle.bg, color: globalScoreStyle.color
                        }}>
                          {candidate.score_global}%
                        </span>
                      ) : <span style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Link
                          href={`/jobs/${jobId}/candidats/${candidate.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "12px" }}
                        >
                          <Eye size={14} /> {t("dashboard.jobDetail.detailsLink")}
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(candidate.id)}
                          disabled={isLoading}
                          title={t("dashboard.jobs.delete")}
                          style={{ color: "var(--destructive)" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 4 — Context
// ═══════════════════════════════════════════════════════

function ContextTab({ job, contextDescription, setContextDescription, handleSaveContext, contextSaving }) {
  const { t, locale } = useI18n();
  const criteria = job?.extracted_criteria || {};
  const sourceUrl = job?.description?.match(/URL[^\n]*Source[:\s]*(https?:\/\/[^\s\n]+)/i)?.[1]
    || job?.description?.match(/(https?:\/\/[^\s\n]+)/)?.[1]
    || null;

  // Extract title from description or criteria
  const contextTitle = criteria.title || job?.title || "";

  return (
    <div>
      {/* Job Description section */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", marginBottom: "24px"
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 12px" }}>
          <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "4px" }}>
            JOB DESCRIPTION
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
            {t("dashboard.jobDetail.contextHelp")}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "0 24px 20px" }}>
          {contextTitle && (
            <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px", marginTop: "8px" }}>
              Title: {contextTitle}
            </div>
          )}
          {sourceUrl && (
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "12px" }}>
              URL Source: <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>{sourceUrl}</a>
            </div>
          )}

          <div style={{ marginTop: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("dashboard.jobDetail.markdownContent")}
            </div>
            <textarea
              className="input-field"
              value={contextDescription}
              onChange={e => setContextDescription(e.target.value)}
              rows={20}
              style={{
                width: "100%", fontFamily: "monospace", fontSize: "12px",
                lineHeight: 1.6, resize: "vertical", minHeight: "300px"
              }}
            />
          </div>

          {/* Save button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveContext}
              disabled={contextSaving}
            >
              {contextSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
              {t("common.actions.save")}
            </button>
          </div>
        </div>
      </div>

      {/* Attached Context */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "20px 24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "4px" }}>
          ATTACHED CONTEXT
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "12px" }}>
          {t("dashboard.jobDetail.sourcesHelp")}
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "var(--secondary)", borderRadius: "var(--radius)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px" }}>📄</span>
            <span style={{ fontSize: "13px", fontWeight: "500" }}>{t("dashboard.jobDetail.jobDescriptionUrl")}</span>
          </div>
          {/* Toggle switch */}
          <label style={{ position: "relative", display: "inline-block", width: "40px", height: "22px" }}>
            <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
            <span style={{
              position: "absolute", cursor: "pointer", inset: 0,
              backgroundColor: "var(--foreground)", borderRadius: "11px",
              transition: "0.3s"
            }}>
              <span style={{
                position: "absolute", content: '""', height: "16px", width: "16px",
                left: "20px", bottom: "3px", backgroundColor: "white",
                borderRadius: "50%", transition: "0.3s"
              }} />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// TAB 5 — Paramètres
// ═══════════════════════════════════════════════════════

function ParametresTab({ job, settingsForm, setSettingsForm, handleSaveSettings, settingsSaving, handleCloseApplications, handleDeleteJob, deletingJob }) {
  const { t, locale } = useI18n();
  const isClosed = job?.status === "closed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Détails */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "20px" }}>
          {t("dashboard.jobDetail.details")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Titre */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>{t("dashboard.jobDetail.title")}</label>
            <input
              className="input-field"
              value={settingsForm.title}
              onChange={e => setSettingsForm(prev => ({ ...prev, title: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            />
          </div>

          {/* Localisation */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>{t("dashboard.jobDetail.location")}</label>
            <input
              className="input-field"
              value={settingsForm.location}
              onChange={e => setSettingsForm(prev => ({ ...prev, location: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            />
          </div>

          {/* Type de contrat */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>{t("dashboard.jobDetail.contractType")}</label>
            <select
              className="input-field"
              value={settingsForm.contract_type}
              onChange={e => setSettingsForm(prev => ({ ...prev, contract_type: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            >
              <option value="">—</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Freelance">{t("dashboard.jobDetail.contract.freelance")}</option>
              <option value="Stage">{t("dashboard.jobDetail.contract.internship")}</option>
              <option value="Alternance">{t("dashboard.jobDetail.contract.apprenticeship")}</option>
              <option value="Intérim">{t("dashboard.jobDetail.contract.temp")}</option>
            </select>
          </div>

          {/* Type d'emploi */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>{t("dashboard.jobDetail.employmentType")}</label>
            <select
              className="input-field"
              value={settingsForm.work_mode}
              onChange={e => setSettingsForm(prev => ({ ...prev, work_mode: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            >
              <option value="">—</option>
              <option value="onsite">{t("dashboard.jobDetail.workMode.fullTime")}</option>
              <option value="remote">{t("dashboard.jobDetail.workMode.remote")}</option>
              <option value="hybrid">{t("dashboard.jobDetail.workMode.hybrid")}</option>
            </select>
          </div>
        </div>

        {/* Save button for settings */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            style={{ fontSize: "13px" }}
          >
            {settingsSaving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {t("common.actions.save")}
          </button>
        </div>
      </div>

      {/* Visibilité */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "16px" }}>
          {t("dashboard.jobDetail.visibility")}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)", marginBottom: "4px" }}>
              {isClosed ? t("dashboard.jobDetail.applicationsClosed") : t("dashboard.jobDetail.applicationsOpen")}
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted-foreground)", maxWidth: "500px" }}>
              {isClosed
                ? t("dashboard.jobDetail.applicationsClosedHelp")
                : t("dashboard.jobDetail.applicationsOpenHelp")
              }
            </div>
          </div>

          {!isClosed && (
            <button
              className="btn btn-outline"
              onClick={handleCloseApplications}
              disabled={settingsSaving}
              style={{ fontSize: "13px", flexShrink: 0 }}
            >
              <CheckCircle2 size={14} />
              {t("dashboard.jobDetail.closeApplications")}
            </button>
          )}
        </div>
      </div>

      {/* Zone de danger */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "16px" }}>
          ZONE DE DANGER
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--destructive)", marginBottom: "4px" }}>
              {t("dashboard.jobDetail.deleteJob")}
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted-foreground)", maxWidth: "500px" }}>
              {t("dashboard.jobDetail.deleteJobHelp")}
            </div>
          </div>

          <button
            className="btn"
            onClick={handleDeleteJob}
            disabled={deletingJob}
            style={{
              fontSize: "13px", flexShrink: 0,
              color: "var(--destructive)", border: "1px solid var(--destructive)",
              background: "transparent",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            {deletingJob && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
