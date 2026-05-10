"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Loader2, Trash2, MapPin, Users, Plus, Search, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteJob } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("jobs")
        .select("*, candidates(id, status, score_cv)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setJobs(data);
    }
    setLoading(false);
  }

  async function handleDelete(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer ce job et tous ses candidats ?")) return;
    setDeletingId(jobId);
    try {
      const res = await deleteJob(jobId);
      if (res.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        toast("Job supprimé");
      } else {
        toast(res.error || "Erreur lors de la suppression", "error");
      }
    } catch (err) {
      toast("Erreur lors de la suppression", "error");
    }
    setDeletingId(null);
  }

  const filteredJobs = jobs.filter(j => {
    const matchTab = tab === "active" ? j.status === "active" : j.status === "draft";
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const activeJobs = jobs.filter(j => j.status === "active");
  const allCandidates = activeJobs.flatMap(j => j.candidates || []);
  const interviewsDone = allCandidates.filter(c => c.status === "interview_completed").length;
  const draftsCount = jobs.filter(j => j.status === "draft").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={24} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--foreground)", letterSpacing: "-0.02em" }}>Jobs</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "2px" }}>Gérez vos recrutements.</p>
        </div>
        <Link href="/jobs/nouveau" className="btn btn-primary" style={{ textDecoration: "none" }}>
          <Plus size={15} />
          Nouveau job
        </Link>
      </div>

      {/* 3 Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Jobs actifs", value: activeJobs.length, icon: Briefcase },
          { label: "Candidats en pipeline", value: allCandidates.length, icon: Users },
          { label: "Entretiens complétés", value: interviewsDone, icon: MessageSquare },
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "4px",
                background: "var(--secondary)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <Icon size={16} style={{ color: "var(--muted-foreground)" }} />
              </div>
              <div>
                <p style={{ fontSize: "22px", fontWeight: "700", color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.02em" }}>{m.value}</p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px" }}>{m.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none", gap: "0" }}>
          <button
            className={`tab ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
            style={{ borderBottom: tab === "active" ? "2px solid var(--foreground)" : "2px solid transparent" }}
          >
            Actifs {activeJobs.length > 0 && <span style={{ marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}>({activeJobs.length})</span>}
          </button>
          <button
            className={`tab ${tab === "drafts" ? "active" : ""}`}
            onClick={() => setTab("drafts")}
            style={{ borderBottom: tab === "drafts" ? "2px solid var(--foreground)" : "2px solid transparent" }}
          >
            Brouillons {draftsCount > 0 && <span style={{ marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}>({draftsCount})</span>}
          </button>
        </div>
        <div style={{ position: "relative", width: "220px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "32px", fontSize: "12px" }}
          />
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--border)", marginTop: "-16px" }} />

      {/* Job listing */}
      {filteredJobs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginBottom: "6px" }}>
            {tab === "active" ? "Aucun job actif" : "Aucun brouillon"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px" }}>
            {tab === "active" ? "Créez votre premier job pour démarrer." : "Vos jobs non publiés apparaîtront ici."}
          </p>
          {tab === "active" && (
            <Link href="/jobs/nouveau" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Plus size={14} /> Créer un job
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          {filteredJobs.map(job => {
            const candidateCount = job.candidates?.length || 0;
            const isDeleting = deletingId === job.id;
            return (
              <div
                key={job.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", background: "var(--card)",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                  transition: "background 100ms ease",
                  opacity: isDeleting ? 0.5 : 1,
                  pointerEvents: isDeleting ? "none" : "auto"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "4px",
                    background: tab === "active" ? "var(--foreground)" : "var(--secondary)",
                    color: tab === "active" ? "var(--background)" : "var(--muted-foreground)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <Briefcase size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {job.title || "Sans titre"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                      {job.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                          <MapPin size={11} /> {job.location}
                        </span>
                      )}
                      {job.contract_type && (
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {job.contract_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                    <Users size={12} /> {candidateCount}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    {new Date(job.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, job.id)}
                    title="Supprimer"
                    style={{
                      background: "transparent", border: "none", padding: "4px",
                      color: "var(--muted-foreground)", cursor: "pointer",
                      borderRadius: "2px", transition: "all 120ms", display: "flex"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "#fee2e2"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    {isDeleting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
