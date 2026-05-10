"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, UserCheck, MessageSquare, Search,
  Trash2, CheckCircle2, XCircle, Eye, UploadCloud,
  Loader2, Mail, MoreHorizontal, ChevronDown, ChevronUp, Copy, Link2, Ban, ArrowUpDown, TrendingDown, TrendingUp, CalendarArrowDown, CalendarArrowUp, ArrowDownAZ, ArrowUpZA, ShieldCheck
} from "lucide-react";
import {
  getCandidatesForJob, getJobDetail,
  updateCandidateStatus, deleteCandidate,
  bulkUpdateCandidateStatus, bulkDeleteCandidates,
  scoreCandidate, getMailLogs
} from "@/lib/actions/candidate";
import EmailModal from "@/components/candidates/EmailModal";
import { updateJobAgencyStatus } from "@/lib/actions/job";
import { parseFile } from "@/lib/actions/parse-file";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/utils/admin";
import { checkUserQuota, incrementUserUsage } from "@/lib/actions/usage";
import AgencyTimeline, { AGENCY_STATUSES } from "@/components/jobs/AgencyTimeline";

const tabs = [
  { id: "all", label: "Tous", icon: Users },
  { id: "shortlisted", label: "Validés", icon: UserCheck },
  { id: "rejected", label: "Refusés", icon: Ban },
  { id: "interview_completed", label: "Interviewés", icon: MessageSquare },
];

function getScoreColor(score) {
  if (score >= 75) return { bg: "#dcfce7", color: "#166534" };
  if (score >= 50) return { bg: "#fef3c7", color: "#92400e" };
  return { bg: "#fee2e2", color: "#991b1b" };
}

function getStatusBadge(status) {
  const map = {
    imported: { label: "Importé", className: "badge-muted" },
    scored: { label: "CV évalué", className: "badge-outline" },
    shortlisted: { label: "Validé", className: "badge-success" },
    rejected: { label: "Rejeté", className: "badge-destructive" },
    invited: { label: "Invité IA", className: "badge-primary" },
    interview_started: { label: "Entretien IA en cours", className: "badge-warning" },
    interview_completed: { label: "Entretien IA terminé", className: "badge-success" },
  };
  return map[status] || { label: status, className: "badge-muted" };
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id;

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [sortBy, setSortBy] = useState("score_desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const sortMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [mailLogs, setMailLogs] = useState([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const isClientDelegatedView = job?.extracted_criteria?.is_delegated && !isAdmin(currentUser);
  const agencyStatus = job?.extracted_criteria?.agency_status || "searching";
  const showCandidatesForClient = isClientDelegatedView && agencyStatus === "shortlist_ready";

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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUser(user);

    const [jobRes, candidatesRes, logsRes] = await Promise.all([
      getJobDetail(jobId),
      getCandidatesForJob(jobId),
      getMailLogs(jobId),
    ]);
    if (jobRes.success) setJob(jobRes.job);
    if (candidatesRes.success) setCandidates(candidatesRes.candidates);
    if (logsRes.success) setMailLogs(logsRes.logs);
    setLoading(false);
  }

  const filteredAndSortedCandidates = candidates
    .filter(c => {
      // Si on est en mode client délégué et que la shortlist est prête, on ne montre QUE les shortlisted
      if (isClientDelegatedView && agencyStatus === "shortlist_ready") {
        return c.status === "shortlisted";
      }

      // Tab filter
      if (activeTab === "shortlisted" && c.status !== "shortlisted") return false;
      if (activeTab === "rejected" && c.status !== "rejected") return false;
      if (activeTab === "interview_completed" && !["interview_completed", "interview_started", "invited"].includes(c.status)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        return fullName.includes(q) || (c.email && c.email.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score_desc") {
        return (b.score_global || b.score_cv || 0) - (a.score_global || a.score_cv || 0);
      }
      if (sortBy === "score_asc") {
        return (a.score_global || a.score_cv || 0) - (b.score_global || b.score_cv || 0);
      }
      if (sortBy === "date_desc") {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === "date_asc") {
        return new Date(a.created_at) - new Date(b.created_at);
      }
      if (sortBy === "name_asc") {
        return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
      }
      if (sortBy === "name_desc") {
        return `${b.first_name} ${b.last_name}`.localeCompare(`${a.first_name} ${a.last_name}`);
      }
      return 0;
    });

  const tabCounts = {
    all: candidates.length,
    shortlisted: candidates.filter(c => c.status === "shortlisted").length,
    rejected: candidates.filter(c => c.status === "rejected").length,
    interview_completed: candidates.filter(c => ["interview_completed", "interview_started", "invited"].includes(c.status)).length,
  };

  function getInterviewLink(candidate) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/interview/${candidate.interview_token}`;
  }

  async function handleInvite(candidateId) {
    setActionLoading(candidateId);
    const res = await updateCandidateStatus(candidateId, "invited");
    if (res.success) {
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: "invited" } : c));
      const cand = candidates.find(c => c.id === candidateId);
      if (cand?.interview_token) {
        const link = getInterviewLink(cand);
        navigator.clipboard.writeText(link);
        setCopiedId(candidateId);
        setTimeout(() => setCopiedId(null), 3000);
        toast("Lien d'entretien copié dans le presse-papiers !");
      } else {
        toast("Candidat invité avec succès");
      }
    }
    setActionLoading(null);
  }

  function copyInterviewLink(candidate) {
    const link = getInterviewLink(candidate);
    navigator.clipboard.writeText(link);
    setCopiedId(candidate.id);
    setTimeout(() => setCopiedId(null), 3000);
    toast("Lien copié !");
  }

  async function handleStatusChange(candidateId, status) {
    setActionLoading(candidateId);
    const res = await updateCandidateStatus(candidateId, status);
    if (res.success) {
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status } : c));
      const labels = { shortlisted: "validé", rejected: "refusé", invited: "invité" };
      toast(`Candidat ${labels[status] || status} avec succès`);
    } else {
      toast("Erreur lors de la mise à jour", "error");
    }
    setActionLoading(null);
  }

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

  async function handleBulkValidate() {
    if (selectedIds.length === 0) return;
    setActionLoading("bulk");
    const res = await bulkUpdateCandidateStatus(selectedIds, "shortlisted");
    if (res.success) {
      setCandidates(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, status: "shortlisted" } : c));
      toast(`${selectedIds.length} candidat(s) validé(s)`);
      setSelectedIds([]);
    }
    setActionLoading(null);
  }

  async function handleAgencyStatusChange(newStatus) {
    setActionLoading("agency_status");
    const res = await updateJobAgencyStatus(jobId, newStatus);
    if (res.success) {
      setJob(prev => ({
        ...prev,
        extracted_criteria: {
          ...prev.extracted_criteria,
          agency_status: newStatus
        }
      }));
      toast(`Statut agence mis à jour : ${newStatus}`);
    } else {
      toast("Erreur lors de la mise à jour du statut.", "error");
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

  async function handleImport(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    
    let totalRows = 0;
    const allRows = [];
    const Papa = await import('papaparse');

    // 1. D'abord on compte tout pour la barre de progression
    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.csv')) {
        await new Promise((resolve) => {
          Papa.default.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              allRows.push({ file, rows: results.data });
              totalRows += results.data.length;
              resolve();
            }
          });
        });
      }
    }

    if (totalRows === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: totalRows });
    let successCount = 0;
    let processedCount = 0;
    
    for (const item of allRows) {
      const { rows } = item;
      
      // Vérification quota au début
      const quota = await checkUserQuota('candidate');
      if (!quota.allowed) {
        toast(quota.error, "error");
        setIsImporting(false);
        return;
      }

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        processedCount++;
        setImportProgress(prev => ({ ...prev, current: processedCount }));

        const name = row['Name'] || row['Nom'] || row['First Name'] || row['Prénom'] || row['Candidate'] || `Candidat ${processedCount}`;
        const email = row['Email'] || row['E-mail'] || row['Courriel'] || '';
        
        let cvText = null;
        const cvKeywords = ['cv', 'resume', 'expérience', 'experience', 'description', 'profil', 'profile', 'parcours'];
        
        for (const [key, value] of Object.entries(row)) {
          if (!value || typeof value !== 'string') continue;
          const lowerKey = key.toLowerCase();
          if (cvKeywords.some(k => lowerKey.includes(k))) {
            if (value.length > 250 && !value.includes('http://') && !value.includes('https://')) {
              cvText = value;
              break;
            }
          }
        }

        if (!cvText) {
          const combined = Object.values(row)
            .filter(v => typeof v === 'string' && !v.includes('http://') && !v.includes('https://'))
            .join(' \n');
          if (combined.length > 400) cvText = combined;
        }

        if (cvText) {
          try {
            const enrichedCvText = `Nom du candidat: ${name}\nEmail: ${email}\n\nProfil/CV:\n${cvText}`;
            const result = await scoreCandidate(jobId, enrichedCvText, job.extracted_criteria || job, name);
            if (result.success) {
              successCount++;
              await incrementUserUsage('candidate');
            }
          } catch (err) {
            console.error(`Erreur pour ${name}:`, err);
          }
        }
      }
    }
    
    if (successCount > 0) {
      toast(`${successCount} candidat(s) importé(s) et évalué(s) avec succès !`);
      loadData();
    }
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} className="spin" style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push("/jobs")} title="Retour">
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--foreground)" }}>
              {job?.title || "Demande"}
            </h1>
            {job?.extracted_criteria?.is_delegated && (
              <span className="badge" style={{ background: "var(--primary)", color: "white" }}>Mode Agence</span>
            )}
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            {job?.location && `${job.location} · `}{job?.contract_type && `${job.contract_type} · `}{candidates.length} candidat{candidates.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ADMIN CONTROL BAR */}
      {isAdmin(currentUser) && job?.extracted_criteria?.is_delegated && (
        <div style={{ 
          background: "var(--primary)", 
          color: "white", 
          padding: "1rem 1.5rem", 
          borderRadius: "12px", 
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ShieldCheck size={20} />
            <div>
              <div style={{ fontWeight: "bold", fontSize: "14px" }}>Contrôle Administrateur</div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>Mettez à jour l'avancement pour le client</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <select 
              value={agencyStatus}
              onChange={(e) => handleAgencyStatusChange(e.target.value)}
              disabled={actionLoading === "agency_status"}
              style={{ 
                background: "rgba(255,255,255,0.1)", 
                color: "white", 
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "13px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              {AGENCY_STATUSES.map(s => (
                <option key={s.id} value={s.id} style={{ color: "black" }}>{s.label}</option>
              ))}
            </select>
            {actionLoading === "agency_status" && <Loader2 size={16} className="spin" />}
          </div>
        </div>
      )}

      {isClientDelegatedView && !showCandidatesForClient ? (
        <div style={{ marginTop: "2rem" }}>
          <AgencyTimeline currentStatus={agencyStatus} />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem", marginTop: "1.5rem" }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "12px 20px", fontSize: "14px", fontWeight: "500",
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                background: "transparent", border: "none",
                borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                cursor: "pointer", transition: "all 150ms",
                marginBottom: "-1px"
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{
                background: isActive ? "var(--primary)" : "var(--secondary)",
                color: isActive ? "white" : "var(--muted-foreground)",
                padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600"
              }}>
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search + Bulk Actions */}
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

        {!isClientDelegatedView && (
          <button 
            className="btn btn-outline" 
            style={{ height: "40px", display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
            {isImporting ? "Analyse en cours..." : "Importer CSV"}
          </button>
        )}
        <input 
          type="file" 
          multiple
          accept=".csv"
          ref={fileInputRef} 
          style={{ display: "none" }} 
          onChange={handleImport} 
        />

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
              borderRadius: '20px', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              transition: 'all 150ms', whiteSpace: 'nowrap',
              boxShadow: sortMenuOpen ? '0 4px 12px rgba(var(--primary-rgb, 99,102,241),0.25)' : 'none',
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
                borderRadius: '12px', boxShadow: '0 12px 24px -4px rgba(0,0,0,0.12)',
                zIndex: 50, minWidth: '200px', overflow: 'hidden', padding: '6px',
              }}
            >
              {[
                { group: 'Score', options: [
                  { value: 'score_desc', label: 'Décroissant', Icon: TrendingDown },
                  { value: 'score_asc',  label: 'Croissant',   Icon: TrendingUp  },
                ]},
                { group: 'Date d\'ajout', options: [
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
                          color: isActive ? 'var(--primary)' : 'var(--foreground)',
                          borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                          fontWeight: isActive ? '600' : '400',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--secondary)'; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Icon size={15} style={{ opacity: isActive ? 1 : 0.5 }} />
                        {label}
                        {isActive && (
                          <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
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
            <button className="btn btn-sm" style={{ background: "#dcfce7", color: "#166534", border: "none" }} onClick={handleBulkValidate} disabled={actionLoading === "bulk"}>
              <CheckCircle2 size={14} /> Valider
            </button>
            <button className="btn btn-sm" style={{ background: "#fee2e2", color: "#991b1b", border: "none" }} onClick={handleBulkDelete} disabled={actionLoading === "bulk"}>
              <Trash2 size={14} /> Supprimer
            </button>
            {actionLoading === "bulk" && <Loader2 size={16} className="spin" style={{ animation: "spin 1s linear infinite" }} />}
          </div>
        )}
      </div>

      {/* Table */}
      {filteredAndSortedCandidates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={48} style={{ color: "var(--muted-foreground)", opacity: 0.4, marginBottom: "1rem" }} />
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Aucun candidat</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            {activeTab !== "all" ? "Aucun candidat dans cette catégorie." : "Importez des candidats pour commencer le scoring."}
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
                    checked={selectedIds.length === filteredAndSortedCandidates.length && filteredAndSortedCandidates.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  />
                </th>
                <th>Nom</th>
                <th>Email</th>
                <th>Score CV</th>
                <th>Score Interview</th>
                <th>Statut</th>
                <th>Ajouté</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCandidates.map(candidate => {
                const scoreStyle = candidate.score_cv ? getScoreColor(candidate.score_cv) : null;
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
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "var(--primary)", color: "white",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: "600", flexShrink: 0
                        }}>
                          {initials}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: "500" }}>{candidate.first_name} {candidate.last_name}</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                            {mailLogs.filter(l => l.candidate_id === candidate.id).slice(0, 3).map(log => {
                              const config = {
                                interview_invitation: { label: "Invité", bg: "#e0e7ff", color: "#4338ca" },
                                selected: { label: "Sélectionné", bg: "#dcfce7", color: "#166534" },
                                rejected: { label: "Refusé", bg: "#fee2e2", color: "#991b1b" }
                              }[log.mail_type] || { label: log.mail_type, bg: "#f3f4f6", color: "#374151" };
                              
                              const date = new Date(log.sent_at).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' });
                              
                              return (
                                <span key={log.id} style={{
                                  fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "4px",
                                  background: config.bg, color: config.color, whiteSpace: "nowrap"
                                }}>
                                  {config.label} {date}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
                      {candidate.email || "—"}
                    </td>
                    <td>
                      {candidate.score_cv != null ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "4px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "13px",
                          background: scoreStyle.bg, color: scoreStyle.color
                        }}>
                          {candidate.score_cv}/100
                        </span>
                      ) : "—"}
                    </td>
                    <td>
                      {candidate.score_interview != null ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          padding: "4px 12px", borderRadius: "20px", fontWeight: "700", fontSize: "13px",
                          background: getScoreColor(candidate.score_interview).bg,
                          color: getScoreColor(candidate.score_interview).color
                        }}>
                          {candidate.score_interview}/100
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                    </td>
                    <td style={{ color: "var(--muted-foreground)", fontSize: "13px" }}>
                      {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Link
                          href={`/jobs/${jobId}/candidats/${candidate.id}`}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: "12px" }}
                        >
                          <Eye size={14} /> Détails
                        </Link>
                        {!['shortlisted', 'invited', 'interview_started', 'interview_completed'].includes(candidate.status) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleStatusChange(candidate.id, "shortlisted")}
                            disabled={isLoading}
                            title="Valider"
                            style={{ color: "#166534" }}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {candidate.status !== 'rejected' && !['invited', 'interview_started', 'interview_completed', 'shortlisted'].includes(candidate.status) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleStatusChange(candidate.id, "rejected")}
                            disabled={isLoading}
                            title="Refuser"
                            style={{ color: "var(--destructive)" }}
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {candidate.status === "shortlisted" && !candidate.score_interview && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleInvite(candidate.id)}
                            disabled={isLoading}
                            title="Inviter à l'entretien IA (copie le lien)"
                            style={{ color: "var(--primary)" }}
                          >
                            <Mail size={16} />
                          </button>
                        )}
                        {candidate.status === "interview_completed" && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleStatusChange(candidate.id, "shortlisted")}
                            disabled={isLoading}
                            title="Valider définitivement"
                            style={{ color: "#166534" }}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {['invited', 'interview_started'].includes(candidate.status) && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => copyInterviewLink(candidate)}
                            disabled={isLoading}
                            title={copiedId === candidate.id ? 'Lien copié !' : 'Copier le lien d\'entretien'}
                            style={{ color: copiedId === candidate.id ? '#166534' : 'var(--primary)' }}
                          >
                            {copiedId === candidate.id ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => { setSelectedCandidate(candidate); setEmailModalOpen(true); }}
                          title="Générer un mail"
                          style={{ color: "var(--primary)" }}
                        >
                          <Mail size={16} />
                        </button>
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
    </>
  )}

      {emailModalOpen && selectedCandidate && (
        <EmailModal
          isOpen={emailModalOpen}
          onClose={() => { setEmailModalOpen(false); setSelectedCandidate(null); }}
          candidate={selectedCandidate}
          job={job}
          currentUser={currentUser}
          existingLogs={mailLogs.filter(l => l.candidate_id === selectedCandidate.id)}
          onLogged={() => getMailLogs(jobId).then(res => res.success && setMailLogs(res.logs))}
        />
      )}

      {isImporting && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center'
        }}>
          <div style={{ maxWidth: '500px', width: '100%' }}>
            <div style={{
              width: '80px', height: '80px', background: 'var(--primary-light)',
              color: 'var(--primary)', borderRadius: '24px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem',
              animation: 'pulse 2s infinite ease-in-out'
            }}>
              <Sparkles size={40} />
            </div>
            
            <h2 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1rem', color: 'var(--foreground)' }}>
              Analyse des candidats en cours...
            </h2>
            <p style={{ color: 'var(--muted-foreground)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
              Notre IA analyse chaque profil par rapport à vos critères ({job?.title}) pour identifier les meilleurs matchs.
            </p>

            <div style={{ background: 'var(--secondary)', borderRadius: '12px', height: '12px', width: '100%', overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{
                height: '100%', background: 'var(--primary)',
                width: `${(importProgress.current / importProgress.total) * 100}%`,
                transition: 'width 0.3s ease-out'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', fontWeight: '600' }}>
              <span style={{ color: 'var(--primary)' }}>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
              <span style={{ color: 'var(--muted-foreground)' }}>{importProgress.current} / {importProgress.total} candidats</span>
            </div>
            
            <p style={{ marginTop: '3rem', fontSize: '13px', fontStyle: 'italic', color: 'var(--muted-foreground)' }}>
              Ne fermez pas cette fenêtre pendant l'analyse.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

