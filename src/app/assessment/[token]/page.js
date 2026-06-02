"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import ConsentModal from "@/components/interview/ConsentModal";
import AssessmentHub from "@/components/assessment/AssessmentHub";

export default function AssessmentPage() {
  const params = useParams();
  const token = params.token;

  const [candidate, setCandidate] = useState(null);
  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasConsented, setHasConsented] = useState(false);
  const [isSendingConsent, setIsSendingConsent] = useState(false);

  useEffect(() => {
    loadAssessment();
  }, [token]);

  async function loadAssessment() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: cand, error: candError } = await supabase
        .from("candidates")
        .select("*, jobs(*)")
        .eq("interview_token", token)
        .single();

      if (candError || !cand) {
        setError("Lien d'évaluation invalide ou expiré.");
        setLoading(false);
        return;
      }

      // Check expiration (5 days from creation)
      if (cand.created_at) {
        const createdAt = new Date(cand.created_at);
        const expiresAt = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
        if (new Date() > expiresAt) {
          setError("Ce lien d'évaluation a expiré. Veuillez contacter le recruteur.");
          setLoading(false);
          return;
        }
      }

      setCandidate(cand);
      setJob(cand.jobs);

      // Fetch recruiter details for branding
      if (cand.jobs && cand.jobs.user_id) {
        const recruiterId = cand.jobs.user_id;

        // Récupérer les infos de branding
        const { data: rec } = await supabase
          .from("users")
          .select("id, company_name, company_logo_url, brand_primary_color, brand_secondary_color")
          .eq("id", recruiterId)
          .single();

        // Vérifier si le plan autorise le branding (via user_usage)
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

      // Already consented?
      if (cand.gdpr_consent_at) {
        setHasConsented(true);
      }
    } catch (err) {
      setError("Une erreur est survenue : " + (err.message || "Erreur inconnue"));
    }
    setLoading(false);
  }

  async function handleAcceptConsent() {
    if (isSendingConsent) return;
    setIsSendingConsent(true);
    try {
      const supabase = createClient();
      await supabase
        .from("candidates")
        .update({
          gdpr_consent_at: new Date().toISOString(),
          assessment_status: "in_progress",
        })
        .eq("id", candidate.id);
      setHasConsented(true);
    } catch (err) {
      console.error("Consent error:", err);
    }
    setIsSendingConsent(false);
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

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", ...brandStyles }}>
      {!hasConsented ? (
        <ConsentModal
          candidate={candidate}
          job={job}
          recruiter={recruiter}
          onAccept={handleAcceptConsent}
          loading={isSendingConsent}
        />
      ) : (
        <AssessmentHub
          key={candidate.id}
          candidate={candidate}
          job={job}
          recruiter={recruiter}
          onCandidateUpdate={(updates) => setCandidate((prev) => ({ ...prev, ...updates }))}
        />
      )}
    </div>
  );
}
