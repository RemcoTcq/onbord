"use client";

// Page d'UNE étape de la simulation : deux onglets à gauche — « Scénario » (ce
// que le candidat reçoit) et « Notation » (ce que l'IA vérifie, et ce que
// l'étape pèse dans la note) —, et à droite le chat qui ne retouche QUE cette
// étape. On y arrive depuis un bloc de la vue d'ensemble ; les flèches
// passent à l'étape voisine sans repasser par elle.
//
// Une retouche (à la main ou par le chat) sur une version déjà commencée par
// un candidat crée une nouvelle version, où les identifiants d'étape changent :
// la page suit alors l'étape de MÊME RANG dans la nouvelle version.

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { Loader2 } from "lucide-react";
import { getExperienceForJob, harmoniserNotesRecruteur } from "@/lib/actions/experience";
import { getJobDetail } from "@/lib/actions/candidate";
import EspaceEtape from "@/components/experience/EspaceEtape";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";

export default function StepPage() {
  const { t } = useI18n();
  const { id: jobId, stepId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [experience, setExperience] = useState(null);
  const [steps, setSteps] = useState([]);
  const [job, setJob] = useState(null);
  const [onglet, setOnglet] = useState("scenario");
  // Fil du chat de retouche, par RANG d'étape : il survit au rechargement qui
  // suit une réécriture, et au changement d'identifiant d'une nouvelle version.
  const [fils, setFils] = useState({}); // rang → [{ role, text, ok }]

  useEffect(() => { load(); }, [jobId, stepId]);

  // `rangASuivre` : après une nouvelle version, l'étape de ce rang remplace
  // celle de l'URL, qui n'existe plus dans la version affichée.
  async function load(rangASuivre = null) {
    // Avant le premier affichage, et non en parallèle : l'éditeur part de ce
    // qu'il lit, et un Enregistrer réécrirait l'ancienne langue par-dessus la
    // traduction (lib/notesRecruteur.js). Rapide quand il n'y a rien à traduire.
    if (!experience) await harmoniserNotesRecruteur(jobId);
    const [res, jobRes] = await Promise.all([getExperienceForJob(jobId), getJobDetail(jobId)]);
    if (jobRes?.success) setJob(jobRes.job);
    if (!res.success) {
      toast(res.error || t("dashboard.experienceEditor.loadError"), "error");
      setLoading(false);
      return;
    }
    const liste = res.steps || [];
    if (rangASuivre != null && !liste.some((s) => s.id === stepId) && liste[rangASuivre]) {
      router.replace(`/jobs/${jobId}/experience/etapes/${liste[rangASuivre].id}`);
    }
    setExperience(res.experience);
    setSteps(liste);
    setLoading(false);
  }

  if (loading) {
    return (
      <>
        <PageHeader title="…" />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  const index = steps.findIndex((s) => s.id === stepId);
  const step = steps[index];
  const retour = () => router.push(`/jobs/${jobId}/experience`);

  if (!step) {
    return (
      <>
        <PageHeader crumbs={[{ label: job?.title || t("dashboard.nav.jobs"), href: `/jobs/${jobId}` }]} title={t("dashboard.jobDetail.journeyCard.simulation")} />
        <div className="ds-empty" style={{ padding: "64px 20px" }}>
          <span>{t("dashboard.experienceEditor.stepPage.notFound")}</span>
          <button type="button" className="ds-btn ds-btn-md" onClick={retour} style={{ marginTop: 10 }}>{t("dashboard.experienceEditor.stepPage.back")}</button>
        </div>
      </>
    );
  }

  return (
    <EspaceEtape
      // Remonté à chaque nouvelle version de l'étape : l'état d'édition repart
      // de ce qui est en base, sans effet de resynchronisation.
      key={`${step.id}:${step.updated_at || ""}`}
      job={job}
      crumbs={[
        { label: job?.title || t("dashboard.nav.jobs"), href: `/jobs/${jobId}` },
        { label: t("dashboard.jobDetail.journeyCard.simulation"), href: `/jobs/${jobId}/experience` },
      ]}
      experience={experience}
      steps={steps}
      index={index}
      onglet={onglet}
      setOnglet={setOnglet}
      fil={fils[index] || []}
      setFil={(maj) => setFils((f) => ({ ...f, [index]: typeof maj === "function" ? maj(f[index] || []) : maj }))}
      onSaved={(saved) => setSteps((prev) => prev.map((s) => (s.id === saved.id ? { ...s, ...saved } : s)))}
      onVersion={(res) => {
        if (res?.forked) toast(t("dashboard.experienceEditor.forkedNotice", { version: res.version }));
        return load(index);
      }}
      onRetour={retour}
      onAller={(id) => router.push(`/jobs/${jobId}/experience/etapes/${id}`)}
      toast={toast}
    />
  );
}

