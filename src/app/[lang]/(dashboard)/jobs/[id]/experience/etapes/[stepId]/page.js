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
import { Loader2, ChevronLeft, ChevronRight, Trash2, Check, Sparkles } from "lucide-react";
import { getExperienceForJob, deleteStep, harmoniserNotesRecruteur, decrireCriteres } from "@/lib/actions/experience";
import { getJobDetail } from "@/lib/actions/candidate";
import { listerCompetences, partsDeLaNote } from "@/lib/competences";
import { useEditionEtape, OngletScenario, OngletScoring } from "@/components/experience/EditeurEtape";
import ChatEtape from "@/components/experience/ChatEtape";
import { StatusBadge, BandeauEphemere } from "@/components/experience/ui";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";

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
      jobId={jobId}
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

function EspaceEtape({ job, jobId, experience, steps, index, onglet, setOnglet, fil, setFil, onSaved, onVersion, onRetour, onAller, toast }) {
  const { t } = useI18n();
  const { user } = useShell();
  const step = steps[index];
  const competences = listerCompetences(job?.extracted_criteria || {});
  // Réaffiche le bandeau d'état après un enregistrement (BandeauEphemere).
  const [signal, setSignal] = useState(0);
  // Le copilote se replie en bouton flottant ; le choix tient le temps de la session.
  const [copilote, setCopilote] = useState(() => {
    try { return sessionStorage.getItem("onbord_copilote") !== "0"; } catch { return true; }
  });
  function basculerCopilote(v) {
    setCopilote(v);
    try { sessionStorage.setItem("onbord_copilote", v ? "1" : "0"); } catch {}
  }

  // Ce qu'évalue chaque critère, rédigé par l'IA et mis en cache
  // (lib/descriptionsCriteres.js). Rechargé à chaque version enregistrée de
  // l'étape ; l'onglet Notation ne montre une description que si le nom du
  // critère correspond encore.
  const [descriptions, setDescriptions] = useState([]);
  const [descriptionsEnCours, setDescriptionsEnCours] = useState(true);
  const majEtape = `${step.id}:${step.updated_at || ""}:${signal}`;
  useEffect(() => {
    let actif = true;
    decrireCriteres(step.id).then((r) => {
      if (!actif) return;
      if (r?.success) setDescriptions(r.descriptions || []);
      setDescriptionsEnCours(false);
    });
    return () => { actif = false; };
  }, [majEtape, step.id]);
  const edition = useEditionEtape(step, competences, {
    onSaved: (saved) => { onSaved(saved); setSignal((n) => n + 1); },
    onForked: (res) => onVersion(res),
    toast,
  });
  // La part de l'étape suit les modifications en cours : on la calcule sur
  // l'état local, à sa place dans le parcours.
  const parts = partsDeLaNote(steps.map((s, i) => (i === index ? edition.local : s)), competences);
  const part = parts.etapes[index]?.part || 0;
  const [suppression, setSuppression] = useState(false);

  // Quitter la page avec des modifications non enregistrées : le navigateur
  // prévient (fermeture, rechargement) ; nos boutons et le fil d'Ariane
  // demandent confirmation.
  useEffect(() => {
    if (!edition.dirty) return;
    const avertir = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [edition.dirty]);

  const peutQuitter = () => !edition.dirty || confirm(t("dashboard.experienceEditor.stepPage.leaveUnsaved"));
  const quitter = (aller) => () => { if (peutQuitter()) aller(); };

  async function supprimer() {
    if (!confirm(t("dashboard.experienceEditor.deleteStepConfirm"))) return;
    setSuppression(true);
    const res = await deleteStep(step.id);
    setSuppression(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    if (res.forked) toast(t("dashboard.experienceEditor.forkedNotice", { version: res.version }));
    onRetour();
  }

  const precedente = steps[index - 1];
  const suivante = steps[index + 1];
  const navBtn = { width: 30, height: 30, border: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

  return (
    <>
      <style>{`
        .ds-critere-tete:hover { background: var(--ds-hover-row); }
        .checkpoint-actions { opacity: 0; transition: opacity .12s; }
        .checkpoint-ligne:hover .checkpoint-actions, .checkpoint-ligne:focus-within .checkpoint-actions { opacity: 1; }
        .texte-editable:hover { text-decoration: underline dotted var(--ds-ink-5); text-underline-offset: 3px; }
        .bloc-etape-attente { animation: pulse-attente 1.4s ease-in-out infinite; }
        @keyframes pulse-attente { 50% { opacity: .45; } }
        .etape-copilote { position: sticky; top: 10px; height: calc(100vh - 40px); max-height: 760px; }
      `}</style>

      <PageHeader
        garde={peutQuitter}
        crumbs={[
          { label: job?.title || t("dashboard.nav.jobs"), href: `/jobs/${jobId}` },
          { label: t("dashboard.jobDetail.journeyCard.simulation"), href: `/jobs/${jobId}/experience` },
        ]}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="ds-mono" style={{ width: 24, height: 24, flex: "none", borderRadius: 7, background: "var(--ds-blue)", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500 }}>{index + 1}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{edition.local.title || "—"}</span>
          </span>
        }
        actions={
          <>
            <span style={{ display: "flex", alignItems: "center", height: 32, borderRadius: 9, border: "1px solid var(--ds-line)" }}>
              <button type="button" disabled={!precedente} onClick={quitter(() => onAller(precedente.id))} aria-label={t("dashboard.experienceEditor.stepPage.previous")} title={t("dashboard.experienceEditor.stepPage.previous")} style={{ ...navBtn, color: precedente ? "var(--ds-ink-2)" : "#C2C9DA" }}>
                <ChevronLeft size={16} strokeWidth={2} />
              </button>
              <span className="ds-mono" style={{ fontSize: 12, color: "var(--ds-ink-2)" }}>{index + 1} / {steps.length}</span>
              <button type="button" disabled={!suivante} onClick={quitter(() => onAller(suivante.id))} aria-label={t("dashboard.experienceEditor.stepPage.next")} title={t("dashboard.experienceEditor.stepPage.next")} style={{ ...navBtn, color: suivante ? "var(--ds-ink-2)" : "#C2C9DA" }}>
                <ChevronRight size={16} strokeWidth={2} />
              </button>
            </span>
            <StatusBadge status={experience?.status} />
            <button type="button" className="ds-btn ds-btn-danger ds-btn-sm" onClick={supprimer} disabled={suppression} style={{ borderColor: "var(--ds-red-line)" }}>
              {suppression ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
              {t("dashboard.experienceEditor.stepPage.delete")}
            </button>
          </>
        }
      />

      <div className="ds-tabbar">
        <div role="tablist" aria-label={t("dashboard.experienceEditor.stepPage.viewsLabel")} className="ds-tabs">
          <button type="button" role="tab" className="ds-tab" aria-selected={onglet === "scenario"} onClick={() => setOnglet("scenario")}>{t("dashboard.experienceEditor.stepPage.tabScenario")}</button>
          <button type="button" role="tab" className="ds-tab" aria-selected={onglet === "scoring"} onClick={() => setOnglet("scoring")}>{t("dashboard.experienceEditor.stepPage.tabScoring")}</button>
        </div>
      </div>

      {experience?.locked_at && (
        <BandeauEphemere key={`verrou-${signal}`} ton="alerte" bande>
          {t("dashboard.experienceEditor.stepPage.lockedShort")}
        </BandeauEphemere>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start", padding: "18px 20px", paddingBottom: edition.dirty ? 96 : 24 }}>
        <div style={{ flex: "2 1 560px", minWidth: 0 }}>
          {onglet === "scenario"
            ? <OngletScenario edition={edition} toast={toast} />
            : <OngletScoring edition={edition} competences={competences} part={part} toast={toast} descriptions={descriptions} descriptionsEnCours={descriptionsEnCours} />}
        </div>

        {copilote && (
          <aside className="etape-copilote" style={{ flex: "1 1 340px", minWidth: 0 }}>
            <ChatEtape
              stepId={step.id}
              dirty={edition.dirty}
              onRewritten={onVersion}
              messages={fil}
              setMessages={setFil}
              prenom={user?.first_name}
              jobTitle={job?.title}
              onReplier={() => basculerCopilote(false)}
            />
          </aside>
        )}
      </div>

      {!copilote && (
        <button
          type="button"
          onClick={() => basculerCopilote(true)}
          aria-label={t("dashboard.experienceEditor.stepChat.open")}
          aria-expanded="false"
          className="ds-btn ds-btn-primary"
          style={{ position: "fixed", right: 24, bottom: edition.dirty ? 84 : 24, zIndex: 40, height: 48, padding: "0 18px 0 8px", borderRadius: 999, boxShadow: "0 10px 28px var(--ds-blue-30), inset 0 1px 0 rgba(255,255,255,0.2)" }}
        >
          <span style={{ width: 34, height: 34, borderRadius: 999, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} strokeWidth={2} />
          </span>
          {t("dashboard.experienceEditor.stepChat.title")}
        </button>
      )}

      {/* ── Barre d'enregistrement, tant qu'il y a des modifications ── */}
      {edition.dirty && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 41,
          display: "flex", alignItems: "center", gap: 12, padding: "8px 8px 8px 16px", borderRadius: 14,
          background: "#FFFFFF", border: "1px solid var(--ds-line)", boxShadow: "var(--ds-shadow-modal)",
        }}>
          <span className="ds-dot ds-dot-amber" style={{ width: 7, height: 7 }} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{t("dashboard.experienceEditor.stepPage.unsaved")}</span>
          <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={edition.annuler} disabled={edition.saving}>{t("dashboard.experienceEditor.stepPage.discard")}</button>
          <button type="button" className="ds-btn ds-btn-primary ds-btn-sm" onClick={edition.save} disabled={edition.saving}>
            {edition.saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {t("dashboard.experienceEditor.save")}
          </button>
        </div>
      )}
    </>
  );
}
