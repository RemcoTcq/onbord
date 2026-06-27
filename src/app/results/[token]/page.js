"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import ResultsView from "@/components/assessment/ResultsView";
import { getCandidateTestSessions } from "@/lib/actions/assessment";

export default function ResultsPage() {
  const params = useParams();
  const token = params.token;

  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [testSessions, setTestSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadResults();
  }, [token]);

  async function loadResults() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: cand, error: candError } = await supabase
        .from("candidates")
        .select("*, jobs(*)")
        .eq("interview_token", token)
        .single();

      if (candError || !cand) {
        setError("Lien de résultats invalide.");
        setLoading(false);
        return;
      }

      setCandidate(cand);
      setJob(cand.jobs);

      // Fetch test sessions
      const sessionsRes = await getCandidateTestSessions(cand.id);
      if (sessionsRes.success) {
        setTestSessions(sessionsRes.sessions || []);
      }

      // Fetch recruiter details for branding
      if (cand.jobs && cand.jobs.user_id) {
        const recruiterId = cand.jobs.user_id;

        const { data: rec } = await supabase
          .from("users")
          .select("id, company_name, company_logo_url, brand_primary_color, brand_secondary_color")
          .eq("id", recruiterId)
          .single();

        const { data: usage } = await supabase
          .from("user_usage")
          .select("plan")
          .eq("user_id", recruiterId)
          .single();

        const plan = usage?.plan || "beta";
        const plansWithBranding = ["core", "scale", "enterprise", "beta"];

        if (rec && plansWithBranding.includes(plan)) {
          setRecruiter(rec);
        }
      }
    } catch (err) {
      setError("Une erreur est survenue : " + (err.message || "Erreur inconnue"));
    }
    setLoading(false);
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "2rem" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: "420px", padding: "3rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>⛔</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Accès impossible</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>{error}</p>
        </div>
      </div>
    );
  }

  // Get dynamic branding style variables
  const brandStyles = {};
  if (recruiter) {
    if (recruiter.brand_primary_color) {
      brandStyles["--primary"] = recruiter.brand_primary_color;
      brandStyles["--ring"] = recruiter.brand_primary_color;
    }
    if (recruiter.brand_secondary_color) {
      brandStyles["--primary-hover"] = recruiter.brand_secondary_color;
    } else if (recruiter.brand_primary_color) {
      brandStyles["--primary-hover"] = recruiter.brand_primary_color;
    }
    
    if (recruiter.brand_primary_color && recruiter.brand_primary_color.startsWith("#")) {
      const primary = recruiter.brand_primary_color;
      brandStyles["--primary-light"] = primary.length === 7 ? `${primary}1a` : `${primary}1`;
    }
  }

  return (
    <div style={{ minHeight: "100vh", ...brandStyles }}>
      <ResultsView
        candidate={candidate}
        job={job}
        recruiter={recruiter}
        testSessions={testSessions}
        showScores={false}
        showRating={false}
        feedback={candidate.generated_feedback || null}
        status={candidate.status}
      />
    </div>
  );
}
