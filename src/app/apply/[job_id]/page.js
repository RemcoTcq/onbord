"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";
import { applyForJob } from "@/lib/actions/candidate";

export default function ApplyPage() {
  const { job_id } = useParams();
  const router = useRouter();
  
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: ""
  });

  useEffect(() => {
    async function fetchJob() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", job_id)
          .single();
          
        if (error) throw error;
        setJob(data);
      } catch (err) {
        setError("Cette offre d'emploi est introuvable ou a été supprimée.");
      } finally {
        setLoading(false);
      }
    }
    
    if (job_id) fetchJob();
  }, [job_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const res = await applyForJob(job.id, form.firstName, form.lastName, form.email);
      if (!res.success) throw new Error(res.error);
      
      // Redirect to the assessment hub using the generated token
      router.push(`/assessment/${res.candidate.interview_token}`);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (error && !job) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "48px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fee2e2", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "28px" }}>!</div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>Offre indisponible</h1>
          <p style={{ color: "var(--muted-foreground)" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
      <div className="card" style={{ maxWidth: "500px", width: "100%", padding: "2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem", color: "var(--foreground)" }}>
            Postuler : {job.title}
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "15px" }}>
            Veuillez renseigner vos informations pour accéder aux évaluations (CV, Tests, Entretien).
          </p>
        </div>

        {error && (
          <div style={{ color: "#991b1b", background: "#fee2e2", padding: "12px", borderRadius: "var(--radius)", fontSize: "14px", marginBottom: "1.5rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Prénom *</label>
              <input 
                className="input-field" 
                required 
                value={form.firstName} 
                onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} 
                placeholder="Ex: Jean" 
              />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Nom *</label>
              <input 
                className="input-field" 
                required 
                value={form.lastName} 
                onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} 
                placeholder="Ex: Dupont" 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Adresse email *</label>
            <input 
              className="input-field" 
              type="email" 
              required 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} 
              placeholder="jean.dupont@email.com" 
            />
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px" }}>
              Vous pourrez reprendre votre évaluation plus tard grâce à cette adresse.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", marginTop: "1rem" }}
            disabled={submitting}
          >
            {submitting ? (
              <><Loader2 size={18} className="spin" style={{ marginRight: "8px" }} /> Création en cours...</>
            ) : (
              <>Commencer l'évaluation <ChevronRight size={18} style={{ marginLeft: "8px" }} /></>
            )}
          </button>
        </form>
        
        <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "12px", color: "var(--muted-foreground)" }}>
          Propulsé par <strong>Onbord</strong>
        </div>
      </div>
    </div>
  );
}
