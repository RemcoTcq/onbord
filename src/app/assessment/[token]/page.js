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
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import CandidateNotice from "@/components/assessment/CandidateNotice";
import { getCandidateEntry } from "@/lib/actions/run";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;

  const [state, setState] = useState("loading"); // loading | not_ready | invalid
  const [job, setJob] = useState(null);
  const [recruiter, setRecruiter] = useState(null);

  async function loadAssessment() {
    try {
      const { entry } = await getCandidateEntry(token);
      if (entry === "experience") {
        router.replace(`/run/${token}`);
        return;
      }
      if (entry === "invalid") {
        setState("invalid");
        return;
      }

      // Reste "not_ready". On charge tout de même l'offre et le branding pour
      // que l'écran d'attente porte les couleurs de l'entreprise.
      const supabase = createClient();
      const { data: cand } = await supabase
        .from("candidates")
        .select("jobs(title, user_id)")
        .eq("interview_token", token)
        .single();

      setJob(cand?.jobs || null);

      if (cand?.jobs?.user_id) {
        try {
          const { data, error } = await supabase
            .rpc("get_public_branding", { user_uuid: cand.jobs.user_id });
          if (!error && data) setRecruiter(data);
        } catch (e) {
          console.error("RPC get_public_branding failed:", e);
        }
      }

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
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Accès impossible</h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Lien d&apos;évaluation invalide ou expiré.</p>
        </div>
      </div>
    );
  }

  // Le candidat n'entre pas, et surtout : rien n'est soumis. Il n'a pas à savoir
  // que le recruteur n'a pas fini de préparer son parcours.
  return (
    <CandidateNotice recruiter={recruiter} job={job} title="Cette évaluation n'est pas encore prête">
      {`${recruiter?.company_name || "L'équipe recrutement"} finalise le parcours pour ce poste. `
        + `Conservez ce lien : il fonctionnera dès que l'évaluation sera ouverte, et vous serez prévenu par e-mail.`}
    </CandidateNotice>
  );
}
