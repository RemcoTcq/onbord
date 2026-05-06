"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, PlusCircle, MapPin, Users, Calendar, Loader2, Briefcase, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteJob } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";

export default function DemandesPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await supabase
        .from("jobs")
        .select("*, candidates(id)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (!error && data) {
        setJobs(data);
      }
    }
    setLoading(false);
  }

  async function handleDelete(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer cette demande et tous ses candidats ?")) return;
    setDeletingId(jobId);
    const res = await deleteJob(jobId);
    if (res.success) {
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast("Demande supprimée avec succès");
    } else {
      toast(res.error || "Erreur lors de la suppression", "error");
    }
    setDeletingId(null);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--foreground)" }}>Toutes les demandes</h1>
          <p style={{ color: "var(--muted-foreground)" }}>Gérez vos recrutements en cours.</p>
        </div>
        <Link href="/nouvelle-demande" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
          <PlusCircle size={18} />
          Nouvelle demande
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--primary-light)", marginBottom: "1.5rem" }}>
            <FileText size={32} style={{ color: "var(--primary)" }} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem", color: "var(--foreground)" }}>Aucune demande</h2>
          <p style={{ color: "var(--muted-foreground)", maxWidth: "400px", margin: "0 auto 2rem auto" }}>
            Vous n'avez pas encore créé de demande de recrutement.
          </p>
          <Link href="/nouvelle-demande" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
            <PlusCircle size={18} />
            Créer une demande
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
          {jobs.map(job => {
            const candidateCount = job.candidates?.length || 0;
            const isDeleting = deletingId === job.id;
            return (
              <Link
                key={job.id}
                href={`/demandes/${job.id}`}
                style={{ textDecoration: "none", opacity: isDeleting ? 0.5 : 1, pointerEvents: isDeleting ? "none" : "auto" }}
              >
                <div className="card card-hover" style={{ height: "100%", cursor: "pointer", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "10px",
                      background: "var(--primary)", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Briefcase size={20} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className={`badge ${job.status === "active" ? "badge-success" : "badge-muted"}`}>
                        {job.status === "active" ? "Active" : job.status === "draft" ? "Brouillon" : job.status}
                      </span>
                      <button
                        onClick={(e) => handleDelete(e, job.id)}
                        title="Supprimer la demande"
                        style={{
                          background: "transparent", border: "none", padding: "4px",
                          color: "var(--muted-foreground)", cursor: "pointer",
                          borderRadius: "4px", transition: "all 150ms", display: "flex"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "#fee2e2"; }}
                        onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                      >
                        {isDeleting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "var(--foreground)", marginBottom: "0.5rem" }}>
                    {job.title}
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "1rem" }}>
                    {job.location && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                        <MapPin size={14} /> {job.location}
                      </div>
                    )}
                    {job.contract_type && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                        <Briefcase size={14} /> {job.contract_type}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                      <Users size={14} />
                      {candidateCount} candidat{candidateCount > 1 ? "s" : ""}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                      <Calendar size={14} />
                      {new Date(job.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
