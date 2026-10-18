"use client";

// Vue d'ensemble de la simulation d'une offre.
//
// Trois temps, de haut en bas : le PARCOURS (une étape = un bloc qui se lit en
// trois secondes, un clic ouvre sa page), COMMENT LE CANDIDAT EST NOTÉ (le
// tableau compétences × étapes), puis les PARAMÈTRES de la simulation entière
// (CV, fil rouge). Le détail d'une étape — son scénario, son scoring, le chat
// qui la retouche — vit sur sa propre page : etapes/[stepId].
//
// Avant le 09/10/2026, toutes les étapes s'affichaient ici, dépliées, avec tous
// leurs champs : un formulaire de plusieurs milliers de pixels, où ce que voit
// le candidat, ce qui est noté et la mécanique se mélangeaient.
//
// Le grand chat plein écran ne sert plus qu'à CONCEVOIR la simulation (quand
// il n'y en a pas encore). Les retouches passent par le chat de chaque étape.

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { Loader2, Check, Plus, RefreshCw, CircleCheck } from "lucide-react";
import {
  getExperienceForJob, addStep, moveStep, publishExperience, couvrirCompetence, resumerEtapes,
  harmoniserNotesRecruteur,
} from "@/lib/actions/experience";
import { listerCompetences, calculerCouverture, partsDeLaNote } from "@/lib/competences";
import { getJobDetail } from "@/lib/actions/candidate";
import ExperienceChatScreen from "@/components/assessment/ExperienceChatScreen";
import GenerationFeed, { streamExperienceGeneration, translateFeedError } from "@/components/assessment/GenerationFeed";
import BlocEtape from "@/components/experience/BlocEtape";
import NotationGlobale from "@/components/experience/NotationGlobale";
import { CvRequisCard, FilRougeCard } from "@/components/experience/Parametres";
import { StatusBadge, BandeauEphemere } from "@/components/experience/ui";
import { useToast } from "@/components/ui/Toast";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";
import { estimerMinutes } from "@/lib/experienceDuree";

export default function ExperienceReviewPage() {
  const { t } = useI18n();
  const { id: jobId } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genEvents, setGenEvents] = useState([]); // flux réel du pipeline serveur
  const [publishing, setPublishing] = useState(false);
  const [experience, setExperience] = useState(null);
  const [steps, setSteps] = useState([]);
  const [job, setJob] = useState(null);
  const [chatStarted, setChatStarted] = useState(false); // ≥1 échange → cache la génération directe
  const [covering, setCovering] = useState(null); // id de la compétence en cours de couverture
  const [recaps, setRecaps] = useState({}); // stepId → phrase de scénario
  const [recapsEnCours, setRecapsEnCours] = useState(false);
  // Réaffiche les bandeaux d'état après une modification qui ne recharge pas
  // la page (la case CV). Un rechargement les réaffiche de lui-même.
  const [signal, setSignal] = useState(0);

  // La liste validée de l'offre, ce que la simulation en teste, et ce que pèse
  // chaque étape. Recalculés à chaque rendu : ils suivent un déplacement ou
  // une suppression sans attendre un rechargement.
  const competences = listerCompetences(job?.extracted_criteria || {});
  const couverture = calculerCouverture(steps, competences);
  const parts = partsDeLaNote(steps, competences);

  // Les notes que seul le recruteur lit, remises dans sa langue s'il le faut
  // (lib/notesRecruteur.js) : en parallèle du premier affichage, qui se
  // recharge seulement si quelque chose a été traduit.
  useEffect(() => {
    load();
    harmoniserNotesRecruteur(jobId).then((r) => { if (r?.changed) load(); });
  }, [jobId]);

  async function load() {
    setLoading(true);
    const [res, jobRes] = await Promise.all([getExperienceForJob(jobId), getJobDetail(jobId)]);
    if (jobRes?.success) setJob(jobRes.job);
    if (res.success) {
      setExperience(res.experience);
      setSteps(res.steps || []);
      // Les résumés en cache s'affichent tout de suite ; les manquants arrivent
      // ensuite, sans retenir l'écran (lib/resumeEtapes.js).
      const cache = res.experience?.generated_from?.recaps || {};
      setRecaps(Object.fromEntries(Object.entries(cache).map(([id, r]) => [id, r?.texte])));
      if (res.experience) chargerResumes(res.experience.id);
    } else {
      toast(res.error || t("dashboard.experienceEditor.loadError"), "error");
    }
    setLoading(false);
  }

  async function chargerResumes(experienceId) {
    setRecapsEnCours(true);
    const res = await resumerEtapes(experienceId);
    if (res.success) setRecaps(res.recaps || {});
    setRecapsEnCours(false);
  }

  // Une retouche sur une version déjà commencée par un candidat en crée une
  // nouvelle (lib/experienceVersion.js) : les identifiants d'étape changent, il
  // faut recharger — et le dire.
  function annoncerVersion(res) {
    if (res?.forked) toast(t("dashboard.experienceEditor.forkedNotice", { version: res.version }));
  }

  const ouvrirEtape = (stepId) => router.push(`/jobs/${jobId}/experience/etapes/${stepId}`);

  // Le chat a généré l'expérience → on recharge : la vue d'ensemble s'ouvre.
  async function handleChatGenerated() {
    toast(t("dashboard.experienceEditor.generated"));
    await load();
  }

  // Même flux de génération que le chat : les étapes affichées sont celles que
  // le serveur pousse réellement, au moment où elles se produisent.
  async function handleGenerate() {
    setGenerating(true);
    setGenEvents([]);

    const res = await streamExperienceGeneration(jobId, "", (event) => {
      setGenEvents((prev) => [...prev, event]);
    });

    if (res.success) {
      toast(t("dashboard.experienceEditor.generatedShort"));
      await load();
    } else {
      toast(translateFeedError(t, res.error) || t("dashboard.experienceEditor.generationFailed"), "error");
    }
    setGenerating(false);
  }

  async function handlePublish() {
    // Le recruteur garde la décision — mais il ne doit jamais découvrir après
    // coup qu'une compétence indispensable n'était testée nulle part.
    if (couverture.manquantes.length) {
      const liste = couverture.manquantes.map((c) => `• ${c.name}`).join("\n");
      if (!confirm(t("dashboard.experienceEditor.coverage.publishWithGaps", { skills: liste }))) return;
    }
    setPublishing(true);
    const res = await publishExperience(experience.id);
    if (res.success) {
      toast(t("dashboard.experienceEditor.published"));
      await load();
    } else {
      toast(res.error || t("dashboard.experienceEditor.publishFailed"), "error");
    }
    setPublishing(false);
  }

  async function handleCover(skillId) {
    setCovering(skillId);
    const res = await couvrirCompetence(experience.id, skillId);
    if (res.success) {
      toast(t(
        res.mode === "new_step"
          ? "dashboard.experienceEditor.coverage.coveredNewStep"
          : "dashboard.experienceEditor.coverage.coveredAttached",
        { n: res.position }
      ));
      annoncerVersion(res);
      await load();
    } else {
      toast(res.error || t("dashboard.experienceEditor.error"), "error");
    }
    setCovering(null);
  }

  // Une étape ajoutée s'ouvre aussitôt : elle est vide, et c'est sur sa page
  // qu'on l'écrit — à la main ou avec le chat de l'étape.
  async function handleAddStep() {
    const res = await addStep(experience.id);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    annoncerVersion(res);
    const relu = await getExperienceForJob(jobId);
    const derniere = relu.success ? (relu.steps || []).at(-1) : null;
    if (derniere) ouvrirEtape(derniere.id);
    else await load();
  }

  async function handleMove(stepId, direction) {
    const res = await moveStep(stepId, direction);
    if (res.success) { annoncerVersion(res); await load(); } else { toast(res.error || t("dashboard.experienceEditor.error"), "error"); }
  }

  const crumbs = [
    { label: t("dashboard.nav.jobs"), href: "/jobs" },
    { label: job?.title || t("dashboard.jobs.untitled"), href: `/jobs/${jobId}` },
  ];

  if (loading) {
    return (
      <>
        <PageHeader crumbs={crumbs} title={t("dashboard.jobDetail.journeyCard.simulation")} />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  // Conception : aucune expérience et aucune génération en cours. Le chat EST
  // l’écran — plein écran, sans carte autour, comme le hub Expériences.
  if (!experience && !generating) {
    return (
      <ExperienceChatScreen
        jobId={jobId}
        jobData={job}
        title={job?.title || t("dashboard.experienceEditor.designWithAssistant")}
        crumbs={crumbs}
        pageTitle={t("dashboard.jobDetail.journeyCard.simulation")}
        backLabel={t("dashboard.experienceEditor.backToJob")}
        onBack={() => router.push(`/jobs/${jobId}`)}
        onGenerated={handleChatGenerated}
        onStepRegenerated={load}
        onUserMessage={() => setChatStarted(true)}
        actions={!chatStarted ? (
          // Le raccourci disparaît dès qu’on engage la conversation : un seul
          // chemin de génération à la fois.
          <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={handleGenerate}>
            {t("dashboard.experienceEditor.generateDirectly")}
          </button>
        ) : null}
      />
    );
  }

  // Compétences notées par chaque étape, pour les blocs.
  const nbCompetences = (stepIndex) =>
    [...couverture.must, ...couverture.nice].filter((c) => c.refs.some((r) => r.stepIndex === stepIndex)).length;
  const minutes = estimerMinutes(steps);
  const langue = { fr: "french", en: "english", nl: "dutch" }[job?.experience_locale];

  return (
    <>
      <style>{`
        .bloc-etape { transition: border-color .12s ease, box-shadow .12s ease; }
        .bloc-etape:hover { border-color: #CCD6EE; }
        .bloc-etape:focus-visible { outline: 2px solid var(--ds-blue); outline-offset: 2px; }
        .bloc-etape-attente { animation: pulse-recap 1.4s ease-in-out infinite; }
        .ds-critere-tete:hover { background: var(--ds-hover-row); }
        @keyframes pulse-recap { 50% { opacity: .45; } }
      `}</style>

      <PageHeader
        crumbs={crumbs}
        title={t("dashboard.jobDetail.journeyCard.simulation")}
        actions={experience && (
          <>
            <StatusBadge status={experience.status} />
            {experience.status !== "published" ? (
              <button type="button" className="ds-btn ds-btn-primary" onClick={handlePublish} disabled={publishing}>
                {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={15} />}
                {t("dashboard.experienceEditor.publish")}
              </button>
            ) : (
              <button type="button" className="ds-btn" onClick={handleGenerate} disabled={generating}>
                <RefreshCw size={15} strokeWidth={2} />
                {t("dashboard.experienceEditor.regenerate")}
              </button>
            )}
          </>
        )}
      />

      {/* Bandeaux d'état : lus à l'ouverture et après une modification,
          puis effacés (BandeauEphemere). */}
      {experience?.status === "published" && (
        <BandeauEphemere key={`publiee-${signal}`} ton="succes" bande>
          <CircleCheck size={15} style={{ flex: "none" }} />
          {t("dashboard.experienceEditor.publishedNotice")}
        </BandeauEphemere>
      )}
      {experience?.locked_at && (
        <BandeauEphemere key={`verrou-${signal}`} ton="alerte" bande>
          <span>
            {tNodes(t("dashboard.experienceEditor.lockedWarning"), {
              next: <strong key="n">{t("dashboard.experienceEditor.lockedWarningNext")}</strong>,
            })}
          </span>
        </BandeauEphemere>
      )}

      {/* Génération directe (raccourci) → flux réel du pipeline serveur, étape par étape */}
      {generating && (
        <section className="ds-section">
          <div className="ds-card" style={{ padding: "24px 28px" }}>
            <GenerationFeed events={genEvents} active={generating} />
          </div>
        </section>
      )}

      {experience && (
        <>
          {/* ── Le parcours ── */}
          <section aria-labelledby="ds-etapes" className="ds-section">
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <h2 id="ds-etapes" className="ds-h2">{t("dashboard.experienceEditor.overview.steps")}</h2>
                <span className="ds-sub">{t("dashboard.experienceEditor.overview.stepsHelp")}</span>
              </span>
              <span style={{ display: "flex", gap: 6 }}>
                <span className="ds-chip ds-chip-lg" style={{ fontSize: 12 }}>{t("dashboard.jobDetail.journeyCard.steps", { count: steps.length })}</span>
                {/* Calculée ici, pas lue en base : elle doit suivre l'ajout et
                    le retrait d'étapes à l'écran, sans attendre un rechargement. */}
                {minutes > 0 && <span className="ds-chip ds-chip-lg" style={{ fontSize: 12 }}>~{minutes} min</span>}
                {langue && <span className="ds-chip ds-chip-lg" style={{ fontSize: 12 }}>{t(`dashboard.jobForm.languageNames.${langue}`)}</span>}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {steps.map((s, i) => (
                <BlocEtape
                  key={s.id}
                  step={s}
                  index={i}
                  total={steps.length}
                  recap={recaps[s.id]}
                  recapEnCours={recapsEnCours}
                  part={parts.etapes[i]?.part || 0}
                  nbCompetences={nbCompetences(i)}
                  onOpen={() => ouvrirEtape(s.id)}
                  onMove={(direction) => handleMove(s.id, direction)}
                />
              ))}
              <button type="button" onClick={handleAddStep} className="ds-add" style={{ flexDirection: "column", gap: 8, height: "auto", minHeight: 200, borderRadius: 14 }}>
                <span className="ds-icon-tile ds-icon-tile-soft" style={{ width: 34, height: 34, borderRadius: 10 }}><Plus size={17} strokeWidth={2.2} /></span>
                {t("dashboard.experienceEditor.addStep")}
              </button>
            </div>
          </section>

          {/* ── Comment le candidat est noté ── */}
          <section className="ds-section">
            <NotationGlobale
              steps={steps}
              competences={competences}
              couverture={couverture}
              covering={covering}
              onCover={handleCover}
              onOpenStep={ouvrirEtape}
            />
          </section>

          {/* ── Paramètres de la simulation entière ── */}
          <section aria-labelledby="ds-reglages-simulation" className="ds-section">
            <h2 id="ds-reglages-simulation" className="ds-h2">{t("dashboard.experienceEditor.overview.settings")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12, alignItems: "start" }}>
              {job && (
                <CvRequisCard
                  jobId={jobId}
                  cvRequis={job.cv_requis === true}
                  toast={toast}
                  onSaved={(valeur) => { setJob((j) => ({ ...j, cv_requis: valeur })); setSignal((n) => n + 1); }}
                />
              )}
              {experience.generated_from?.fil_rouge && (
                <FilRougeCard
                  key={experience.id}
                  experienceId={experience.id}
                  filRouge={experience.generated_from.fil_rouge}
                  jobTitle={job?.title}
                  toast={toast}
                  onSaved={async (res) => { annoncerVersion(res); await load(); }}
                />
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
