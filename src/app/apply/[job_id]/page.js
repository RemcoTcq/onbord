"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Briefcase, ChevronRight, CheckCircle2 } from "lucide-react";
import { applyForJob, getPublicJobAndBranding } from "@/lib/actions/candidate";
import { getJobEntry } from "@/lib/actions/run";
import { entryIsOpen } from "@/lib/candidateEntry";
import CandidateOnboardingFlow from "@/components/assessment/CandidateOnboardingFlow";
import CandidateNotice from "@/components/assessment/CandidateNotice";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ApplyPage() {
  const { job_id } = useParams();
  const router = useRouter();
  const { t, setLocale } = useI18n();

  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notReady, setNotReady] = useState(false); // aucune évaluation derrière ce lien

  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await getPublicJobAndBranding(job_id);
        if (!res.success) throw new Error(res.error);

        setJob(res.job);
        if (res.recruiter) {
          setRecruiter(res.recruiter);
        }

        // Langue de l'offre : le candidat postule dans la langue du poste, pas
        // dans celle de son navigateur. Awaité avant les écrans d'erreur plus
        // bas, qui doivent déjà s'afficher traduits.
        await setLocale(res.job?.experience_locale, ["common", "candidate"]);

        // Tant qu'aucune évaluation n'est prête, on ne collecte rien : ni nom,
        // ni e-mail, ni consentement. Une candidature enregistrée sans parcours
        // derrière est une promesse qu'on ne tient pas.
        const { entry } = await getJobEntry(job_id);
        if (!entryIsOpen(entry)) setNotReady(true);
      } catch (err) {
        console.error("fetchJob error:", err);
        setError(err.message || t("candidate.notice.jobNotFound"));
      } finally {
        setLoading(false);
      }
    }
    
    if (job_id) fetchJob();
    // setLocale est appelé À L'INTÉRIEUR de cet effet : l'ajouter aux
    // dépendances relancerait l'effet à chaque changement de langue, donc en
    // boucle. Et `t` n'est lu que dans le catch, pour un message affiché une
    // seule fois — la langue de l'offre est déjà fixée à ce moment-là.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job_id]);

  const handleUpdateCandidate = async (updates) => {
    try {
      // Le consentement RGPD part avec la candidature : applyForJob le pose
      // dans l'insert. Il faisait auparavant l'objet d'un UPDATE anon depuis le
      // navigateur, qui exigeait une policy RLS ouverte à tous (migration 014).
      const res = await applyForJob(
        job.id, updates.first_name, updates.last_name, updates.email, updates.gdpr_consent_at
      );
      if (!res.success) throw new Error(res.error);

      router.push(`/assessment/${res.candidate.interview_token}`);
    } catch (err) {
      console.error(err);
      throw err;
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
          <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>{t("candidate.notice.jobUnavailableTitle")}</h1>
          <p style={{ color: "var(--muted-foreground)" }}>{error}</p>
        </div>
      </div>
    );
  }

  // ─── Offre ouverte mais évaluation pas encore publiée ─────────────────────
  if (notReady) {
    return (
      <CandidateNotice recruiter={recruiter} job={job} title={t("candidate.notice.applicationsClosedTitle")}>
        {t("candidate.notice.applicationsClosedBody", {
          company: recruiter?.company_name || t("candidate.intro.fallbackTeam"),
        })}
      </CandidateNotice>
    );
  }

  // Get dynamic branding style variables (same as AssessmentPage)
  const brandStyles = {};
  if (recruiter) {
    if (recruiter.brand_primary_color) {
      brandStyles["--primary"] = recruiter.brand_primary_color;
      brandStyles["--ring"] = recruiter.brand_primary_color;
    }
  }

  return (
    <div style={{ minHeight: "100vh", ...brandStyles }}>
      <CandidateOnboardingFlow
        candidate={null}
        job={job}
        recruiter={recruiter}
        onComplete={() => {}}
        onUpdateCandidate={handleUpdateCandidate}
      />
    </div>
  );
}
