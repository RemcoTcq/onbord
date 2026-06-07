"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Users, UserCheck, Search,
  Trash2, CheckCircle2, Eye,
  Loader2, Mail, ChevronDown, ChevronUp, Link2, Ban, ArrowUpDown, TrendingDown, TrendingUp, CalendarArrowDown, CalendarArrowUp, ArrowDownAZ, ArrowUpZA
} from "lucide-react";
import {
  getCandidatesForJob, getJobDetail,
  deleteCandidate, bulkDeleteCandidates,
  getMailLogs
} from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

const tabs = [
  { id: "all", label: "Tous", icon: Users },
  { id: "shortlisted", label: "Validés", icon: UserCheck },
  { id: "rejected", label: "Refusés", icon: Ban },
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
    disqualified: { label: "Disqualifié", className: "badge-destructive" },
    invited: { label: "Invité", className: "badge-primary" },
    interview_started: { label: "Assessment en cours", className: "badge-warning" },
    interview_completed: { label: "Assessment terminé", className: "badge-success" },
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
  const sortMenuRef = useRef(null);
  const { toast } = useToast();

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

    const [jobRes, candidatesRes] = await Promise.all([
      getJobDetail(jobId),
      getCandidatesForJob(jobId),
    ]);
    if (jobRes.success) setJob(jobRes.job);
    if (candidatesRes.success) setCandidates(candidatesRes.candidates);
    setLoading(false);
  }

  const filteredAndSortedCandidates = candidates
    .filter(c => {
      if (activeTab === "shortlisted" && c.status !== "shortlisted") return false;
      if (activeTab === "rejected" && c.status !== "rejected") return false;
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

  const tabCounts = {
    all: candidates.length,
    shortlisted: candidates.filter(c => c.status === "shortlisted").length,
    rejected: candidates.filter(c => c.status === "rejected").length,
  };

  function copyApplyLink() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
    const link = isLocal ? `${origin}/apply/${jobId}` : `https://app.onbord.be/apply/${jobId}`;
    navigator.clipboard.writeText(link);
    setCopiedId("apply_link");
    setTimeout(() => setCopiedId(null), 3000);
    toast("Lien public copié !");
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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      {job?.status === 'draft' && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#92400e', marginBottom: '4px' }}>Offre en brouillon</h3>
            <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>Cette offre n'a pas encore été entièrement configurée.</p>
          </div>
          <button 
            className="btn btn-primary"
            style={{ background: '#d97706', color: 'white', border: 'none' }}
            onClick={() => router.push(`/jobs/nouveau?draftId=${job.id}`)}
          >
            Continuer la configuration
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        <button className="btn btn-ghost btn-icon" onClick={() => router.push("/jobs")} title="Retour">
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--foreground)" }}>
            {job?.title || "Demande"}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>
            {job?.location && `${job.location} · `}{job?.contract_type && `${job.contract_type} · `}{candidates.length} candidat{candidates.length > 1 ? "s" : ""}
          </p>
        </div>

        <button
          onClick={copyApplyLink}
          className="btn btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          {copiedId === "apply_link" ? <CheckCircle2 size={16} /> : <Link2 size={16} />}
          {copiedId === "apply_link" ? "Lien copié !" : "Copier le lien public"}
        </button>
      </div>

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
                color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
                background: "transparent", border: "none",
                borderBottom: isActive ? "2px solid var(--foreground)" : "2px solid transparent",
                cursor: "pointer", transition: "all 150ms",
                marginBottom: "-1px"
              }}
            >
              <Icon size={16} />
              {tab.label}
              <span style={{
                background: isActive ? "var(--foreground)" : "var(--secondary)",
                color: isActive ? "white" : "var(--muted-foreground)",
                padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600"
              }}>
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

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
      {filteredAndSortedCandidates.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <Users size={48} style={{ color: "var(--muted-foreground)", opacity: 0.4, marginBottom: "1rem" }} />
          <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Aucun candidat</h3>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
            {activeTab !== "all" ? "Aucun candidat dans cette catégorie." : "Partagez le lien public pour commencer à recevoir des candidatures."}
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
                <th>Candidat</th>
                <th>Score global</th>
                <th>CV</th>
                <th>Tests</th>
                <th>Interview</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedCandidates.map(candidate => {
                const globalScoreStyle = candidate.score_global ? getScoreColor(candidate.score_global) : null;
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
                    <td style={{ fontSize: "13px", fontWeight: "600", color: candidate.score_cv ? getScoreColor(candidate.score_cv).color : "var(--muted-foreground)" }}>
                      {candidate.score_cv != null ? `${candidate.score_cv}%` : "—"}
                    </td>
                    <td style={{ fontSize: "13px", fontWeight: "600", color: candidate.score_tests ? getScoreColor(candidate.score_tests).color : "var(--muted-foreground)" }}>
                      {candidate.score_tests != null ? `${candidate.score_tests}%` : "—"}
                    </td>
                    <td style={{ fontSize: "13px", fontWeight: "600", color: candidate.score_interview ? getScoreColor(candidate.score_interview).color : "var(--muted-foreground)" }}>
                      {candidate.score_interview != null ? `${candidate.score_interview}%` : "—"}
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
