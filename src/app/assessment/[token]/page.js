"use client";

// Cette page n'est plus qu'un AIGUILLAGE. Le parcours candidat vit dans /run.
//
// Elle rendait auparavant l'ancien hub (consentement, upload de CV, tests,
// entretien) quand aucune expérience n'était publiée — ce qui envoyait les
// candidats d'une offre neuve sur un upload de CV isolé, ou sur un écran vide
// qu'ils pouvaient soumettre. L'ancien hub n'est plus atteignable : voir
// lib/candidateEntry.js. Le lien du candidat reste valide et affiche un écran
// d'attente tant que le recruteur n'a pas publié son expérience.

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import CandidateNotice from "@/components/assessment/CandidateNotice";
import { getCandidateEntry } from "@/lib/actions/run";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;
  const { t, setLocale } = useI18n();

  const [state, setState] = useState("loading"); // loading | not_ready | invalid
  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);

  async function loadAssessment() {
    try {
      const { entry, job: entryJob, recruiter: entryRecruiter } = await getCandidateEntry(token);
      if (entry === "experience") {
        router.replace(`/run/${token}`);
        return;
      }
      if (entry === "invalid") {
        setState("invalid");
        return;
      }

      // Reste "not_ready". L'offre et le branding arrivent avec le verdict :
      // getCandidateEntry les résout SERVEUR, par token. Cette page lisait
      // auparavant candidates avec la clé anon, ce qui exigeait une policy RLS
      // ouverte à tous — voir migration 014.
      setJob(entryJob || null);
      setRecruiter(entryRecruiter || null);
      // L'écran d'attente parle au candidat : il suit la langue de l'offre,
      // comme le reste du parcours.
      await setLocale(entryJob?.experience_locale, ["common", "candidate"]);
      setState("not_ready");
    } catch (err) {
      console.error("loadAssessment error:", err);
      // On ferme plutôt que d'ouvrir : un incident ne doit pas laisser entrer un
      // candidat dans un parcours qui n'existe peut-être pas.
      setState("not_ready");
    }
  }

  useEffect(() => {
    loadAssessment();
  }, [token]);

  if (state === "loading") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "2rem" }}>
        <div className="card" style={{ textAlign: "center", maxWidth: "420px", padding: "3rem" }}>
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>⛔</div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>{t("candidate.notice.invalidLinkTitle")}</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>{t("candidate.notice.invalidLinkBody")}</p>
        </div>
      </div>
    );
  }

  // Le candidat n'entre pas, et surtout : rien n'est soumis. Il n'a pas à savoir
  // que le recruteur n'a pas fini de préparer son parcours.
  return (
    <CandidateNotice recruiter={recruiter} job={job} title={t("candidate.notice.notReadyTitle")}>
      {t("candidate.notice.notReadyBody", {
        company: recruiter?.company_name || t("candidate.intro.fallbackTeam"),
      })}
    </CandidateNotice>
  );
}
