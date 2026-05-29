"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2, ArrowRight, ChevronRight, Upload, FileText,
  MessageSquare, BarChart2, Play, ExternalLink, Mail,
  CheckCircle2, Users, Brain, Zap, FlaskConical
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ONBOARDING_STEPS = [
  {
    number: "01",
    icon: FileText,
    title: "Créez une évaluation",
    description: "Collez la description du poste. L'IA la lit et structure automatiquement les critères de sélection.",
    cta: "Nouvelle évaluation",
    href: "/jobs/nouveau",
  },
  {
    number: "02",
    icon: Upload,
    title: "Les candidats s'évaluent",
    description: "Partagez le lien unique. Chaque candidat passe les tests cognitifs et réalise l'interview IA.",
    cta: null,
    href: null,
  },
  {
    number: "03",
    icon: Brain,
    title: "L'IA analyse tout",
    description: "Score CV, résultats aux tests, réponses à l'interview — tout est analysé et expliqué.",
    cta: null,
    href: null,
  },
  {
    number: "04",
    icon: BarChart2,
    title: "Prenez vos décisions",
    description: "Consultez le classement des candidats avec leurs scores détaillés. Prenez la bonne décision.",
    cta: "Voir mes évaluations",
    href: "/jobs",
  },
];

function getJobStage(job) {
  const candidates = job.candidates || [];
  const total = candidates.length;
  const scored = candidates.filter(c => c.score_cv != null).length;
  const invited = candidates.filter(c => ["invited", "interview_started", "interview_completed"].includes(c.status)).length;
  const interviewDone = candidates.filter(c => c.status === "interview_completed").length;
  const shortlisted = candidates.filter(c => c.status === "shortlisted").length;

  if (total === 0) return { stage: 0, label: "En attente de candidats", progress: 10, total, scored, invited, interviewDone, shortlisted };
  if (scored === 0) return { stage: 1, label: "Évaluations en cours", progress: 35, total, scored, invited, interviewDone, shortlisted };
  if (invited === 0 && shortlisted === 0) return { stage: 2, label: "CV analysés", progress: 60, total, scored, invited, interviewDone, shortlisted };
  if (shortlisted === 0) return { stage: 3, label: "Interviews en cours", progress: 80, total, scored, invited, interviewDone, shortlisted };
  return { stage: 4, label: "Shortlist prête", progress: 100, total, scored, invited, interviewDone, shortlisted };
}

function JobCard({ job }) {
  const info = getJobStage(job);
  const progressColors = ["#737373", "#f59e0b", "#0d9488", "#6366f1", "#22c55e"];
  const color = progressColors[info.stage];

  return (
    <Link href={`/jobs/${job.id}`} style={{ textDecoration: "none" }}>
      <div className="card card-hover" style={{ padding: "18px 20px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "14px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: "700", fontSize: "14px", color: "var(--foreground)", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {job.title}
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>
              {job.location || "Localisation non précisée"} · {job.contract_type || "CDI"}
            </div>
          </div>
          <span style={{ fontSize: "11px", fontWeight: "600", background: color + "18", color, padding: "3px 8px", borderRadius: "4px", flexShrink: 0, whiteSpace: "nowrap" }}>
            {info.label}
          </span>
        </div>

        <div style={{ height: "3px", background: "var(--border)", borderRadius: "2px", marginBottom: "12px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${info.progress}%`, background: color, borderRadius: "2px", transition: "width 0.8s ease" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
          {[
            { value: info.total, label: "Candidats" },
            { value: info.interviewDone, label: "Interviews" },
            { value: info.shortlisted, label: "Sélectionnés" },
          ].map((m, i) => (
            <div key={i} style={{ textAlign: "center", background: "var(--secondary)", borderRadius: "6px", padding: "8px 4px" }}>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--foreground)", lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: "10px", color: "var(--muted-foreground)", marginTop: "2px" }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function Accueil() {
  const [userName, setUserName] = useState("");
  const [activeJobs, setActiveJobs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    setUserName(user.user_metadata?.first_name || user.email?.split("@")[0] || "");

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*, candidates(id, score_cv, score_global, score_interview, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (jobs) {
      const allCandidates = jobs.flatMap(j => j.candidates || []);
      const active = jobs.filter(j => j.status === "active");
      setActiveJobs(active.slice(0, 3));
      setStats({
        totalJobs: jobs.length,
        activeJobs: active.length,
        totalCandidates: allCandidates.length,
        interviewsDone: allCandidates.filter(c => c.status === "interview_completed").length,
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const hasJobs = activeJobs.length > 0;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "40px", maxWidth: "960px" }}>

      {/* ===== HEADER ===== */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--foreground)", letterSpacing: "-0.03em", marginBottom: "4px" }}>
            {userName ? `Bonjour, ${userName} 👋` : "Bienvenue sur Onbord"}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            Votre plateforme d'évaluation des candidats pilotée par l'IA.
          </p>
        </div>
        <Link href="/jobs/nouveau" className="btn btn-primary">
          Nouvelle évaluation
        </Link>
      </div>

      {/* ===== GRID: VIDEO + ONBOARDING CHECKLIST ===== */}
      <div style={{ display: "grid", gridTemplateColumns: ((stats?.totalJobs > 0) && (stats?.totalCandidates > 0)) ? "1fr" : "1.8fr 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* ===== VIDEO D'INTRO ===== */}
        <div style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)", background: "var(--foreground)", aspectRatio: "16/9" }}>
          <video
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            poster="/video-poster.jpg"
            controls
            preload="metadata"
          >
            <source src="/intro.mp4" type="video/mp4" />
          </video>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.45)", pointerEvents: "none"
          }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
              <Play size={24} style={{ color: "var(--foreground)", marginLeft: "3px" }} />
            </div>
          </div>
        </div>

        {/* ===== ONBOARDING CHECKLIST ===== */}
        {!((stats?.totalJobs > 0) && (stats?.totalCandidates > 0)) && (
          <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", margin: 0, color: "var(--foreground)", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
              Checklist de démarrage
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              
              {/* Étape 1 */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", opacity: (stats?.totalJobs > 0) ? 0.5 : 1 }}>
                {(stats?.totalJobs > 0) ? <CheckCircle2 size={18} style={{ color: "var(--foreground)", marginTop: "1px" }} /> : <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid var(--border)", marginTop: "1px", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", textDecoration: (stats?.totalJobs > 0) ? "line-through" : "none" }}>
                    Créer une évaluation
                  </div>
                  {!(stats?.totalJobs > 0) && (
                    <Link href="/jobs/nouveau" style={{ display: "inline-block", fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px", textDecoration: "underline" }}>
                      Commencer
                    </Link>
                  )}
                </div>
              </div>

              {/* Étape 2 */}
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", opacity: (stats?.totalCandidates > 0) ? 0.5 : 1 }}>
                {(stats?.totalCandidates > 0) ? <CheckCircle2 size={18} style={{ color: "var(--foreground)", marginTop: "1px" }} /> : <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid var(--border)", marginTop: "1px", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", textDecoration: (stats?.totalCandidates > 0) ? "line-through" : "none" }}>
                    Recevoir son premier candidat
                  </div>
                  {!(stats?.totalCandidates > 0) && (
                    <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "6px", lineHeight: "1.4" }}>
                      Partagez le lien de votre évaluation pour obtenir vos premières candidatures.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>



      {/* ===== 2 CARTES (Science + Support) ===== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* Carte Science */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", marginBottom: "6px" }}>
              La science derrière Onbord
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
              Découvrez les recherches en psychologie cognitive et en évaluation comportementale qui fondent nos méthodes d'évaluation des candidats.
            </p>
          </div>
          <a
            href="https://onbord.io/science"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "auto", width: "fit-content" }}
          >
            En savoir plus <ExternalLink size={13} />
          </a>
        </div>

        {/* Carte Support */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <div style={{ fontWeight: "700", fontSize: "15px", color: "var(--foreground)", marginBottom: "6px" }}>
              Contacter le support
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.6" }}>
              Une question, un bug ou une suggestion ? Notre équipe est disponible par email et vous répondra dans les meilleurs délais.
            </p>
          </div>
          <a
            href="mailto:support@onbord.io"
            className="btn btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "auto", width: "fit-content", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)" }}
          >
            <Mail size={13} /> support@onbord.io
          </a>
        </div>
      </div>



    </div>
  );
}
