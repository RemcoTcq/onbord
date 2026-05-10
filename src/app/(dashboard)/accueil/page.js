"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, ArrowRight, Upload, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Calcule le stage d'un job à partir de ses candidats
function getJobStage(job) {
  const candidates = job.candidates || [];
  const total = candidates.length;
  const scored = candidates.filter(c => c.score_cv != null).length;
  const invited = candidates.filter(c => ["invited", "interview_started", "interview_completed"].includes(c.status)).length;
  const interviewDone = candidates.filter(c => c.status === "interview_completed").length;
  const shortlisted = candidates.filter(c => c.status === "shortlisted").length;

  if (total === 0) {
    return { stage: 0, label: "En attente de candidats", color: "#6366f1", progress: 10, total, scored, invited, interviewDone, shortlisted, requiresAction: true, actionMsg: "Importez vos candidats pour démarrer" };
  }
  if (scored === 0) {
    return { stage: 1, label: "Scoring en cours", color: "#f59e0b", progress: 30, total, scored, invited, interviewDone, shortlisted, requiresAction: false, actionMsg: `Analyse de ${scored}/${total} candidats...` };
  }
  if (invited === 0 && shortlisted === 0) {
    return { stage: 2, label: "Candidats scorés", color: "#0d9488", progress: 55, total, scored, invited, interviewDone, shortlisted, requiresAction: true, actionMsg: `${scored} candidats prêts à inviter en entretien` };
  }
  if (shortlisted === 0) {
    return { stage: 3, label: "Interviews en cours", color: "#8b5cf6", progress: 75, total, scored, invited, interviewDone, shortlisted, requiresAction: false, actionMsg: `${interviewDone}/${invited} entretiens complétés` };
  }
  return { stage: 4, label: "Shortlist prête", color: "#22c55e", progress: 100, total, scored, invited, interviewDone, shortlisted, requiresAction: false, actionMsg: `${shortlisted} candidat${shortlisted > 1 ? "s" : ""} sélectionné${shortlisted > 1 ? "s" : ""}` };
}

const STEP_LABELS = ["Demande validée", "Candidats importés", "Interviews IA", "Shortlist prête"];

function JobCard({ job }) {
  const isAgency = job.mode === "agency";
  const info = getJobStage(job);

  // Pour les demandes agence, vue simplifiée
  if (isAgency) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)" }}>{job.title}</span>
              <span className="badge" style={{ background: "#f0f9ff", color: "#0369a1", fontSize: "11px", fontWeight: "600" }}>Géré par Onbord</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              {job.location || "Localisation non précisée"} · {job.contract_type || "CDI"}
            </p>
          </div>
          <Link href={`/jobs/${job.id}`} style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
            <ChevronRight size={18} />
          </Link>
        </div>
        <div style={{ background: "#f8faff", border: "1px solid #e0e7ff", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1", animation: "pulse 2s infinite", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#3730a3" }}>Onbord s'en occupe</p>
            <p style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>Votre shortlist sera prête sous 48–72h.</p>
          </div>
        </div>
      </div>
    );
  }

  // Self-service : vue complète
  const stepIndex = Math.floor(info.stage * (STEP_LABELS.length - 1) / 4);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: "700", color: "var(--foreground)" }}>{job.title}</span>
            <span className="badge badge-muted" style={{ fontSize: "11px" }}>Self-service</span>
            <span className="badge" style={{ background: info.color + "18", color: info.color, fontSize: "11px", fontWeight: "600" }}>
              {info.label}
            </span>
          </div>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {job.location || "Localisation non précisée"} · {job.contract_type || "CDI"}
          </p>
        </div>
        <Link href={`/jobs/${job.id}`} style={{ color: "var(--muted-foreground)", flexShrink: 0 }}>
          <ChevronRight size={18} />
        </Link>
      </div>

      {/* Progress steps */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0" }}>
        {STEP_LABELS.map((label, idx) => {
          const done = info.stage >= (idx + 1);
          const active = idx === stepIndex && info.stage < 4;
          return (
            <div key={idx} style={{ display: "flex", alignItems: "flex-start", flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                {/* Line + circle row */}
                <div style={{ display: "flex", alignItems: "center", width: "100%", marginBottom: "6px" }}>
                  <div style={{ flex: 1, height: "2px", background: done ? info.color : "var(--border)", borderRadius: "1px", transition: "background 0.4s" }} />
                  <div style={{
                    width: "24px", height: "24px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", fontWeight: "700",
                    background: done ? info.color : (active ? info.color + "25" : "var(--border)"),
                    color: done ? "white" : (active ? info.color : "var(--muted-foreground)"),
                    border: active ? `2px solid ${info.color}` : "none",
                    transition: "all 0.4s"
                  }}>
                    {done ? "✓" : idx + 1}
                  </div>
                  <div style={{ flex: 1, height: "2px", background: done ? info.color : "var(--border)", borderRadius: "1px", transition: "background 0.4s" }} />
                </div>
                <p style={{ fontSize: "10.5px", color: done || active ? "var(--foreground)" : "var(--muted-foreground)", textAlign: "center", lineHeight: 1.3, fontWeight: done || active ? "600" : "400", padding: "0 2px" }}>
                  {label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 key numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { value: info.total, label: "Candidats importés" },
          { value: info.interviewDone, label: "Entretiens IA complétés" },
          { value: info.shortlisted, label: "Dans la shortlist" },
        ].map((m, i) => (
          <div key={i} style={{ background: "var(--background)", borderRadius: "10px", padding: "10px 14px", textAlign: "center" }}>
            <p style={{ fontSize: "22px", fontWeight: "800", color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.02em" }}>{m.value}</p>
            <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "3px" }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Action required banner */}
      {info.requiresAction && (
        <div style={{ background: info.color + "12", border: `1px solid ${info.color}30`, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: info.color, flexShrink: 0 }} />
            <p style={{ fontSize: "13px", fontWeight: "600", color: info.color }}>{info.actionMsg}</p>
          </div>
          <Link
            href={`/jobs/${job.id}`}
            style={{
              background: info.color, color: "white",
              padding: "7px 14px", borderRadius: "8px",
              fontSize: "12px", fontWeight: "600",
              textDecoration: "none", flexShrink: 0,
              display: "flex", alignItems: "center", gap: "4px"
            }}
          >
            {info.stage === 0 ? <><Upload size={12} /> Importer</> : <>Voir <ArrowRight size={12} /></>}
          </Link>
        </div>
      )}

      {/* Info banner (no action needed) */}
      {!info.requiresAction && info.stage < 4 && (
        <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <Loader2 size={14} style={{ color: info.color, animation: "spin 1.5s linear infinite", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{info.actionMsg}</p>
        </div>
      )}

      {/* Shortlist complete */}
      {info.stage === 4 && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#166534" }}>✓ {info.actionMsg}</p>
          <Link href={`/jobs/${job.id}`} style={{ background: "#22c55e", color: "white", padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: "600", textDecoration: "none" }}>
            Voir la shortlist
          </Link>
        </div>
      )}
    </div>
  );
}

export default function Accueil() {
  const [stats, setStats] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*, candidates(id, score_cv, score_global, score_interview, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (jobs) {
      const allCandidates = jobs.flatMap(j => j.candidates || []);
      const active = jobs.filter(j => j.status === "active");

      setStats({
        activeJobs: active.length,
        totalCandidates: allCandidates.length,
        interviewsDone: allCandidates.filter(c => c.status === "interview_completed").length,
        finalized: jobs.filter(j => j.status === "completed").length,
      });

      setActiveJobs(active);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "var(--foreground)", letterSpacing: "-0.02em" }}>Tableau de bord</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "4px" }}>Vue d'ensemble de vos recrutements en cours.</p>
        </div>
        <Link href="/jobs/nouveau" className="btn btn-primary">
          Nouveau job
        </Link>
      </div>

      {/* ===== 4 GLOBAL METRICS ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {[
          { label: "Jobs actifs", value: stats?.activeJobs ?? 0, color: "var(--foreground)" },
          { label: "Candidats analysés", value: stats?.totalCandidates ?? 0, color: "var(--foreground)" },
          { label: "Entretiens IA complétés", value: stats?.interviewsDone ?? 0, color: "var(--foreground)" },
          { label: "Recrutements finalisés", value: stats?.finalized ?? 0, color: "var(--foreground)" },
        ].map((m, i) => (
          <div key={i} className="card" style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: "34px", fontWeight: "800", color: "var(--foreground)", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: "6px" }}>{m.value}</p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>{m.label}</p>
            <div style={{ height: "3px", background: m.color + "25", borderRadius: "2px", marginTop: "14px" }}>
              <div style={{ height: "100%", width: m.value > 0 ? "100%" : "0%", background: m.color, borderRadius: "2px", transition: "width 0.8s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* ===== ACTIVE JOBS ===== */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--foreground)" }}>
            Jobs en cours
            {activeJobs.length > 0 && (
              <span style={{ marginLeft: "8px", fontSize: "13px", fontWeight: "600", background: "var(--primary-light)", color: "var(--primary)", padding: "2px 10px", borderRadius: "20px" }}>
                {activeJobs.length}
              </span>
            )}
          </h2>
          <Link href="/jobs" style={{ fontSize: "13px", color: "var(--muted-foreground)", fontWeight: "500", display: "flex", alignItems: "center", gap: "4px" }}>
            Voir tous les jobs <ArrowRight size={13} />
          </Link>
        </div>

        {activeJobs.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "56px 32px" }}>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--foreground)", marginBottom: "8px" }}>Aucun job actif</p>
            <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "24px" }}>Créez votre premier job pour démarrer.</p>
            <Link href="/jobs/nouveau" className="btn btn-primary">Créer un job</Link>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "20px" }}>
            {activeJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        )}
      </div>

    </div>
  );
}
