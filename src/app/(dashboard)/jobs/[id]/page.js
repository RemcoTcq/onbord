"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Search, Trash2, Eye, Loader2, Link2, CheckCircle2,
  ArrowUpDown, ChevronDown, ChevronUp, TrendingDown, TrendingUp,
  CalendarArrowDown, CalendarArrowUp, ArrowDownAZ, ArrowUpZA,
  Lock, Unlock, Plus, MoreHorizontal, ChevronRight, Save,
  Users, X, ShieldCheck, FileCheck2, BrainCircuit, MessageSquare, Video, Check, Info
} from "lucide-react";
import {
  getCandidatesForJob, getJobDetail,
  deleteCandidate, bulkDeleteCandidates,
  updateJobDetails, updateJobDescription,
  deleteJob
} from "@/lib/actions/candidate";
import { getTestsLibrary, selectQuestionsForJob, saveVideoInterviewConfig } from "@/lib/actions/assessment";
import { getRunsForJob } from "@/lib/actions/experience";
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

function getStatusBadge(status) {
  const map = {
    invited:       { label: "Invité",       className: "badge-primary" },
    in_progress:   { label: "En cours",     className: "badge-warning" },
    termine:       { label: "Terminé",      className: "badge-outline" },
    soumis:        { label: "Soumis",       className: "badge-success" },
    scored:        { label: "Évalué",       className: "badge-success" },
    shortlisted:   { label: "Validé",       className: "badge-success" },
    rejected:      { label: "Rejeté",       className: "badge-destructive" },
    disqualified:  { label: "Disqualifié",  className: "badge-destructive" },
  };
  return map[status] || { label: status, className: "badge-muted" };
}

// ─── Main tabs ───
// Bascule douce (EXPERIENCE_V1_ONLY) : les onglets hérités Pipelines/Évaluations
// (catégorie C) sont masqués ; la configuration passe par l'écran Expérience.
const LEGACY_TABS = [
  { id: "pipelines",   label: "Pipelines" },
  { id: "evaluations", label: "Évaluations" },
];
const TABS = [
  ...(EXPERIENCE_V1_ONLY ? [] : LEGACY_TABS),
  { id: "candidats",   label: "Candidats" },
  { id: "context",     label: "Context" },
  { id: "parametres",  label: "Paramètres" },
];

// ─── Pipeline node labels ───
const PIPELINE_NODE_LABELS = {
  sourcing: { label: "Sourcing & Publication", editable: false },
  accueil: { label: "Accueil candidat", editable: false },
  qualifying_questions: { label: "Questions qualificatives", editable: true },
  cv_scoring: { label: "Scoring CV (IA)", editable: true },
  assessment: { label: "Évaluation", editable: true, subtitle: "Cliquer pour choisir" },
  ai_interview: { label: "Interview IA", editable: true },
  single_video_question: { label: "Question vidéo", editable: true },
  remerciements: { label: "Remerciements", editable: false },
  entretien_visio: { label: "Entretien visio", editable: false, subtitle: "Étape personnalisée" },
  entretien_site: { label: "Interview sur site", editable: false, subtitle: "Étape personnalisée" },
  debrief_finale: { label: "Débrief final", editable: false, subtitle: "Étape personnalisée" },
};

// ─── Component ───

export default function JobDetailPage() {
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
  const [runsByCandidate, setRunsByCandidate] = useState({});

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
    const [jobRes, candidatesRes, testsRes, runsRes] = await Promise.all([
      getJobDetail(jobId),
      getCandidatesForJob(jobId),
      getTestsLibrary(),
      getRunsForJob(jobId),
    ]);
    if (runsRes?.success) setRunsByCandidate(runsRes.runsByCandidate || {});
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    const link = isLocal ? `${origin}/apply/${jobId}` : `https://app.onbord.be/apply/${jobId}`;
    navigator.clipboard.writeText(link);
    setCopiedId("apply_link");
    setTimeout(() => setCopiedId(null), 3000);
    toast("Lien public copié !");
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
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce candidat ?")) return;
    setActionLoading(candidateId);
    const res = await deleteCandidate(candidateId);
    if (res.success) {
      setCandidates(prev => prev.filter(c => c.id !== candidateId));
      setSelectedIds(prev => prev.filter(id => id !== candidateId));
      toast("Candidat supprimé");
    } else {
      toast("Erreur lors de la suppression", "error");
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
      toast("Paramètres sauvegardés");
    } else {
      toast(res.error || "Erreur", "error");
    }
    setSettingsSaving(false);
  }

  async function handleCloseApplications() {
    setSettingsSaving(true);
    const res = await updateJobDetails(jobId, { status: "closed" });
    if (res.success) {
      setJob(res.job);
      toast("Les candidatures sont maintenant fermées");
    } else {
      toast(res.error || "Erreur", "error");
    }
    setSettingsSaving(false);
  }

  async function handleDeleteJob() {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) return;
    setDeletingJob(true);
    const res = await deleteJob(jobId);
    if (res.success) {
      toast("Offre supprimée");
      router.push("/jobs");
    } else {
      toast(res.error || "Erreur", "error");
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
      toast("Étape supprimée");
      setJob({ ...job, saved_flow_nodes: v2Nodes });
    } else {
      toast(res.error || "Erreur", "error");
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
      toast(res.error || "Erreur", "error");
    }
  }

  async function handleAddPipelineNode(type) {
    const newNode = {
      id: type + '_' + Date.now(),
      type: type,
      v2: true,
      config: type === 'single_video_question' ? { questions: [], max_duration_seconds: 120, max_retakes: 1, evaluation_mode: "ai" } 
            : type === 'assessment' ? { title: "Test de compétences" }
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
      toast("Étape ajoutée");
      setJob({ ...job, saved_flow_nodes: newNodes.map(n => ({...n, v2: true})) });
      setSelectedNodeId(newNode.id);
    } else {
      toast(res.error || "Erreur", "error");
    }
  }

  // ─── Context actions ───

  async function handleSaveContext() {
    setContextSaving(true);
    const res = await updateJobDescription(jobId, contextDescription);
    if (res.success) {
      toast("Contexte sauvegardé");
    } else {
      toast(res.error || "Erreur", "error");
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
    } else {
      // Fallback: build from assessment_config
      const lockedBefore = [{ id: 'locked_sourcing', type: 'sourcing', locked: true, v2: true, config: {} }];
      const lockedAfter = [
        { id: 'locked_entretien_visio', type: 'entretien_visio', locked: true, v2: true, config: {} },
        { id: 'locked_entretien_site', type: 'entretien_site', locked: true, v2: true, config: {} },
        { id: 'locked_debrief_finale', type: 'debrief_finale', locked: true, v2: true, config: {} },
      ];
      const onbordNodes = [{ id: 'accueil', type: 'accueil', v2: true, config: {} }];
      
      const modules = job?.assessment_config?.modules || {};
      if (modules.skills_tests?.enabled && modules.skills_tests?.tests?.length > 0) {
        modules.skills_tests.tests.forEach((t, i) => {
          const testInfo = testsLibrary.find(lib => lib.id === t.test_id);
          onbordNodes.push({
            id: `skill_${i}`, type: "assessment", v2: true,
            config: { tests: [{ ...t, test_name: testInfo?.name || "Test" }] },
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
            name: "Création sur-mesure",
            category: "En attente",
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
            name: node.config?.title || testInfo?.name || configTest?.test_name || "Test",
            category: testInfo?.category || "Évaluation",
            questions: testInfo?.questions?.length || null,
            questionCount: testInfo?.questions?.length || 10,
            duration: testInfo?.estimated_duration_minutes || 7,
            isConfigured: true,
          });
        } else {
          cards.push({
            id: node.id, // Use node ID as temporary ID for empty slots
            nodeId: node.id,
            name: node.config?.title || "Test de compétences",
            category: "Non configuré",
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
        name: "Interview IA",
        category: "Questions vidéos",
        questionCount: 4,
        duration: 10,
      });
    }

    // Video interview
    if (modules.video_interview?.enabled && modules.video_interview?.questions?.length > 0) {
      cards.push({
        id: "video_interview",
        name: "Interview Vidéo",
        category: "Questions vidéos",
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
              title: "Création sur-mesure",
              isCustomRequest: true,
              customRole: test.role,
              customSkills: test.skills
            }
          };
        } else {
          const testName = typeof test === 'object' ? test.name : null;
          return {
            ...node,
            config: {
              ...node.config,
              test_id: typeof test === 'object' ? test.id : test,
              title: testName || node.config?.title || "Test de compétences",
              isCustomRequest: false
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
            toast("Test associé au pipeline, mais erreur de synchronisation candidat", "error");
          }
        }
      }
      setJob(prev => ({ ...prev, saved_flow_nodes: updatedFlowNodes }));
      setShowAssessmentModal(false);
      setLinkingNodeId(null);
      toast("Test associé avec succès");
    } else {
      toast("Erreur lors de l'association du test", "error");
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
  const subtitleParts = [job?.location, job?.contract_type, job?.work_mode === "remote" ? "Remote" : job?.work_mode === "hybrid" ? "Hybride" : job?.work_mode === "onsite" ? "Temps plein" : null].filter(Boolean);

  // ─── RENDER ───

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "0.25rem" }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push("/jobs")} title="Retour" style={{ marginTop: "4px" }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--foreground)", lineHeight: 1.2 }}>
            {job?.title || "Offre d'emploi"}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            {subtitleParts.join(" · ")}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Link
            href={`/jobs/${jobId}/experience`}
            className="btn btn-outline"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <BrainCircuit size={16} />
            Expérience de présélection
          </Link>
          <button
            onClick={copyApplyLink}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {copiedId === "apply_link" ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
            {copiedId === "apply_link" ? "Lien copié !" : "Copier le lien public"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", marginTop: "1rem" }}>
        {TABS.map(tab => {
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
          pipelineLocked={pipelineLocked} 
          setPipelineLocked={setPipelineLocked} 
          getPipelineNodes={getPipelineNodes} 
          testsLibrary={testsLibrary} 
          handleDeletePipelineNode={handleDeletePipelineNode} 
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          handleAddPipelineNode={handleAddPipelineNode}
          onNodesChange={async (newNodes) => {
            const res = await updateJobDetails(jobId, { saved_flow_nodes: newNodes });
            if (res.success) {
              setJob({ ...job, saved_flow_nodes: newNodes });
            } else {
              toast(res.error || "Erreur", "error");
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
          runsByCandidate={runsByCandidate}
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
          nodeTypeInfo={PIPELINE_NODE_LABELS[getPipelineNodes().find(n => n.id === selectedNodeId)?.type]}
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

function PipelinesTab({ job, pipelineLocked, setPipelineLocked, getPipelineNodes, testsLibrary, handleDeletePipelineNode, selectedNodeId, setSelectedNodeId, handleAddPipelineNode, onNodesChange, onAIAssessmentClick }) {
  const pipelineNodes = getPipelineNodes();
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div style={{ paddingTop: "8px" }}>
      <PipelineVisualEditor 
        nodes={pipelineNodes}
        isEditable={!pipelineLocked}
        selectedNodeId={selectedNodeId}
        onNodeClick={setSelectedNodeId}
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
            title={pipelineLocked ? "Déverrouiller la pipeline" : "Verrouiller la pipeline"}
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
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Aucune évaluation configurée</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            Ajoutez des tests via l'étape "Parcours" de votre offre.
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
                    Associer un test
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
                    <span title="Test en cours de création par l'équipe Onbord" style={{ color: "var(--primary)", display: "flex" }}>
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
  handleDelete, handleBulkDelete, actionLoading, jobId, runsByCandidate = {}
}) {
  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "320px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            className="input-field"
            placeholder="Rechercher un candidat..."
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
              date_desc:  'Ajout (récent)',
              date_asc:   'Ajout (ancien)',
              name_asc:   'Nom A → Z',
              name_desc:  'Nom Z → A',
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
                { group: 'Score', options: [
                  { value: 'score_desc', label: 'Décroissant', Icon: TrendingDown },
                  { value: 'score_asc',  label: 'Croissant',   Icon: TrendingUp  },
                ]},
                { group: "Date d'ajout", options: [
                  { value: 'date_desc', label: 'Récent en premier',  Icon: CalendarArrowDown },
                  { value: 'date_asc',  label: 'Ancien en premier',  Icon: CalendarArrowUp  },
                ]},
                { group: 'Nom', options: [
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
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Aucun candidat</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            Partagez le lien public pour commencer à recevoir des candidatures.
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
                const statusBadge = getStatusBadge(candidate.status);
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
                        {runsByCandidate[candidate.id] && (
                          <Link
                            href={`/jobs/${jobId}/runs/${runsByCandidate[candidate.id].runId}`}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: "12px" }}
                            title="Rapport de preuves de l'expérience"
                          >
                            <FileCheck2 size={14} /> Rapport
                          </Link>
                        )}
                        <Link
                          href={`/jobs/${jobId}/candidats/${candidate.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "12px" }}
                        >
                          <Eye size={14} /> Détails
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(candidate.id)}
                          disabled={isLoading}
                          title="Supprimer"
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
            Based as context for this posting. Editable anytime. It informs assessment authoring.
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
              Markdown Content:
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
              Save
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
          Sources attached to this posting. Toggle one off to keep it attached but exclude it from the context used to author assessments.
        </div>

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "var(--secondary)", borderRadius: "var(--radius)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px" }}>📄</span>
            <span style={{ fontSize: "13px", fontWeight: "500" }}>Job description - URL</span>
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
  const isClosed = job?.status === "closed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Détails */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "20px" }}>
          DÉTAILS
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Titre */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>Titre</label>
            <input
              className="input-field"
              value={settingsForm.title}
              onChange={e => setSettingsForm(prev => ({ ...prev, title: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            />
          </div>

          {/* Localisation */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>Localisation</label>
            <input
              className="input-field"
              value={settingsForm.location}
              onChange={e => setSettingsForm(prev => ({ ...prev, location: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            />
          </div>

          {/* Type de contrat */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>Type de contrat</label>
            <select
              className="input-field"
              value={settingsForm.contract_type}
              onChange={e => setSettingsForm(prev => ({ ...prev, contract_type: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            >
              <option value="">—</option>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="Freelance">Freelance</option>
              <option value="Stage">Stage</option>
              <option value="Alternance">Alternance</option>
              <option value="Intérim">Intérim</option>
            </select>
          </div>

          {/* Type d'emploi */}
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <label style={{ width: "140px", fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>Type d'emploi</label>
            <select
              className="input-field"
              value={settingsForm.work_mode}
              onChange={e => setSettingsForm(prev => ({ ...prev, work_mode: e.target.value }))}
              style={{ flex: 1, maxWidth: "300px" }}
            >
              <option value="">—</option>
              <option value="onsite">Temps plein</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybride</option>
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
            Sauvegarder
          </button>
        </div>
      </div>

      {/* Visibilité */}
      <div style={{
        border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
        background: "var(--card)", padding: "24px"
      }}>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)", marginBottom: "16px" }}>
          VISIBILITÉ
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--foreground)", marginBottom: "4px" }}>
              {isClosed ? "Les candidatures sont fermées" : "Les candidatures sont ouvertes"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted-foreground)", maxWidth: "500px" }}>
              {isClosed
                ? "Les candidats ne peuvent plus postuler à cette offre."
                : "Les candidats peuvent être invités et suivre les différentes étapes du processus de recrutement."
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
              Terminé
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
              Supprimer l'offre
            </div>
            <div style={{ fontSize: "13px", color: "var(--muted-foreground)", maxWidth: "500px" }}>
              Supprime l'annonce et la dissocie de ses candidats. Les évaluations restent dans votre bibliothèque. Cette action ne peut pas être annulée.
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
