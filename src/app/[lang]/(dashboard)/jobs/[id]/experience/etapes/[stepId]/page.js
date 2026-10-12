"use client";

// Page d'UNE étape de la simulation : deux onglets à gauche — « Scénario » (ce
// que le candidat reçoit) et « Scoring » (ce que l'IA vérifie, et ce que
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
import { Loader2, ArrowLeft, ChevronLeft, ChevronRight, Trash2, Check } from "lucide-react";
import { getExperienceForJob, deleteStep, harmoniserNotesRecruteur, decrireCriteres } from "@/lib/actions/experience";
import { getJobDetail } from "@/lib/actions/candidate";
import { listerCompetences, partsDeLaNote } from "@/lib/competences";
import { useEditionEtape, OngletScenario, OngletScoring } from "@/components/experience/EditeurEtape";
import ChatEtape from "@/components/experience/ChatEtape";
import { StatusBadge, BandeauEphemere } from "@/components/experience/ui";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/I18nProvider";

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
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
        <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const index = steps.findIndex((s) => s.id === stepId);
  const step = steps[index];
  const retour = () => router.push(`/jobs/${jobId}/experience`);

  if (!step) {
    return (
      <div style={{ maxWidth: 640, margin: "3rem auto", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>{t("dashboard.experienceEditor.stepPage.notFound")}</p>
        <button className="btn btn-outline btn-sm" onClick={retour}>{t("dashboard.experienceEditor.stepPage.back")}</button>
      </div>
    );
  }

  return (
    <EspaceEtape
      // Remonté à chaque nouvelle version de l'étape : l'état d'édition repart
      // de ce qui est en base, sans effet de resynchronisation.
      key={`${step.id}:${step.updated_at || ""}`}
      job={job}
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

function EspaceEtape({ job, experience, steps, index, onglet, setOnglet, fil, setFil, onSaved, onVersion, onRetour, onAller, toast }) {
  const { t } = useI18n();
  const step = steps[index];
  const competences = listerCompetences(job?.extracted_criteria || {});
  // Réaffiche le bandeau d'état après un enregistrement (BandeauEphemere).
  const [signal, setSignal] = useState(0);

  // Ce qu'évalue chaque critère, rédigé par l'IA et mis en cache
  // (lib/descriptionsCriteres.js). Rechargé à chaque version enregistrée de
  // l'étape ; l'onglet Scoring ne montre une description que si le nom du
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
  // prévient (fermeture, rechargement) ; nos boutons demandent confirmation.
  useEffect(() => {
    if (!edition.dirty) return;
    const avertir = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [edition.dirty]);

  const quitter = (aller) => () => {
    if (edition.dirty && !confirm(t("dashboard.experienceEditor.stepPage.leaveUnsaved"))) return;
    aller();
  };

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
  const ongletBtn = (id, label) => (
    <button
      onClick={() => setOnglet(id)}
      style={{
        display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
        font: "inherit", fontSize: "13.5px", fontWeight: 700,
        color: onglet === id ? "var(--foreground)" : "var(--muted-foreground)",
        borderBottom: `2px solid ${onglet === id ? "var(--primary)" : "transparent"}`, marginBottom: -1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: edition.dirty ? "6rem" : "3rem" }}>
      <style>{`
        .checkpoint-ligne:hover { background: var(--secondary); }
        .groupe-competence-tete:hover { background: var(--secondary); }
        .tuile-competence:hover { border-color: var(--primary) !important; }
        .carte-critere-corps { display: grid; grid-template-columns: minmax(0, 1fr) 230px; }
        .carte-critere-note { border-left: 1px solid var(--border); }
        @media (max-width: 760px) {
          .carte-critere-corps { grid-template-columns: minmax(0, 1fr); }
          .carte-critere-note { border-left: none; border-top: 1px solid var(--border); }
        }
        .bloc-etape-attente { animation: pulse-attente 1.4s ease-in-out infinite; }
        @keyframes pulse-attente { 50% { opacity: .45; } }
        .checkpoint-actions { opacity: 0; transition: opacity .12s; }
        .checkpoint-ligne:hover .checkpoint-actions, .checkpoint-ligne:focus-within .checkpoint-actions { opacity: 1; }
        .texte-editable:hover { text-decoration: underline dotted var(--muted-foreground); text-underline-offset: 3px; }
        .etape-grille { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1.25rem; align-items: start; }
        .etape-chat { position: sticky; top: 1rem; height: calc(100vh - 2rem); max-height: 760px; }
        @media (max-width: 1050px) {
          .etape-grille { grid-template-columns: minmax(0, 1fr); }
          .etape-chat { position: static; height: 480px; }
        }
      `}</style>

      {/* ── Navigation ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={quitter(onRetour)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} /> {t("dashboard.experienceEditor.stepPage.back")}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" disabled={!precedente} onClick={quitter(() => onAller(precedente.id))} title={t("dashboard.experienceEditor.stepPage.previous")} style={{ padding: 6 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--muted-foreground)" }}>
            {t("dashboard.experienceEditor.stepPage.stepOf", { n: index + 1, total: steps.length })}
          </span>
          <button className="btn btn-ghost btn-sm" disabled={!suivante} onClick={quitter(() => onAller(suivante.id))} title={t("dashboard.experienceEditor.stepPage.next")} style={{ padding: 6 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── En-tête de l'étape ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 800, lineHeight: 1.3, margin: 0 }}>
            <span style={{ color: "var(--muted-foreground)", marginRight: 8 }}>{index + 1}.</span>{edition.local.title || "—"}
          </h1>
          {part < 100 && (
            <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", margin: "4px 0 0" }}>
              {part ? t("dashboard.experienceEditor.overview.share", { part }) : t("dashboard.experienceEditor.overview.noShare")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={experience?.status} />
          <button className="btn btn-ghost btn-sm" onClick={supprimer} disabled={suppression} style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
            {suppression ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
            {t("dashboard.experienceEditor.stepPage.delete")}
          </button>
        </div>
      </div>

      {experience?.locked_at && (
        <BandeauEphemere key={`verrou-${signal}`} ton="alerte" style={{ fontSize: "12.5px", padding: "8px 12px" }}>
          {t("dashboard.experienceEditor.stepPage.lockedShort")}
        </BandeauEphemere>
      )}

      <div className="etape-grille">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: "1rem" }}>
            {ongletBtn("scenario", t("dashboard.experienceEditor.stepPage.tabScenario"))}
            {ongletBtn("scoring", t("dashboard.experienceEditor.stepPage.tabScoring"))}
          </div>
          {onglet === "scenario"
            ? <OngletScenario edition={edition} toast={toast} />
            : <OngletScoring edition={edition} competences={competences} part={part} toast={toast} descriptions={descriptions} descriptionsEnCours={descriptionsEnCours} />}
        </div>

        <aside className="etape-chat">
          <ChatEtape stepId={step.id} dirty={edition.dirty} onRewritten={onVersion} messages={fil} setMessages={setFil} />
        </aside>
      </div>

      {/* ── Barre d'enregistrement, tant qu'il y a des modifications ── */}
      {edition.dirty && (
        <div style={{
          position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20,
          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 12,
          background: "var(--card, var(--background))", border: "1px solid var(--border)", boxShadow: "0 10px 30px rgba(15, 23, 42, .15)",
        }}>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{t("dashboard.experienceEditor.stepPage.unsaved")}</span>
          <button className="btn btn-ghost btn-sm" onClick={edition.annuler} disabled={edition.saving}>{t("dashboard.experienceEditor.stepPage.discard")}</button>
          <button className="btn btn-primary btn-sm" onClick={edition.save} disabled={edition.saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {edition.saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {t("dashboard.experienceEditor.save")}
          </button>
        </div>
      )}
    </div>
  );
}
