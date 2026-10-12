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
import { Loader2, Check, ArrowLeft, Plus } from "lucide-react";
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

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "5rem" }}>
        <Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
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
        backLabel={t("dashboard.experienceEditor.backToJob")}
        onBack={() => router.push(`/jobs/${jobId}`)}
        onGenerated={handleChatGenerated}
        onStepRegenerated={load}
        onUserMessage={() => setChatStarted(true)}
        actions={!chatStarted ? (
          // Le raccourci disparaît dès qu’on engage la conversation : un seul
          // chemin de génération à la fois.
          <button className="btn btn-ghost btn-sm" onClick={handleGenerate} style={{ color: "var(--muted-foreground)" }}>
            {t("dashboard.experienceEditor.generateDirectly")}
          </button>
        ) : null}
      />
    );
  }

  // Compétences notées par chaque étape, pour les blocs.
  const nbCompetences = (stepIndex) =>
    [...couverture.must, ...couverture.nice].filter((c) => c.refs.some((r) => r.stepIndex === stepIndex)).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "4rem" }}>
      <style>{`
        .bloc-etape { transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease; }
        .bloc-etape:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(15, 23, 42, .08); border-color: var(--primary); }
        .bloc-etape:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .bloc-etape-attente { animation: pulse-recap 1.4s ease-in-out infinite; }
        @keyframes pulse-recap { 50% { opacity: .45; } }
      `}</style>

      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/jobs/${jobId}`)} style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
        <ArrowLeft size={16} /> {t("dashboard.experienceEditor.backToJob")}
      </button>

      {/* Génération directe (raccourci) → flux réel du pipeline serveur, étape par étape */}
      {generating && (
        <div className="card" style={{ padding: "1.75rem 2rem", marginBottom: "1.5rem" }}>
          <GenerationFeed events={genEvents} active={generating} />
        </div>
      )}

      {experience && (
        <>
          {/* En-tête + gate de publication */}
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 800 }}>{t("dashboard.experienceEditor.overview.title")}</h1>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                {job?.title ? `${job.title} · ` : ""}
                {t("dashboard.experienceEditor.stepCount", { count: steps.length })}
                {/* Calculée ici, pas lue en base : elle doit suivre l'ajout et
                    le retrait d'étapes à l'écran, sans attendre un rechargement. */}
                {estimerMinutes(steps) ? t("dashboard.experienceEditor.estimatedMinutes", { minutes: estimerMinutes(steps) }) : ""}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <StatusBadge status={experience.status} />
              {experience.status !== "published" ? (
                <button className="btn btn-primary btn-sm" onClick={handlePublish} disabled={publishing} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {publishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                  {t("dashboard.experienceEditor.publish")}
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={handleGenerate} disabled={generating}>
                  {t("dashboard.experienceEditor.regenerate")}
                </button>
              )}
            </div>
          </div>

          {/* Bandeaux d'état : lus à l'ouverture et après une modification,
              puis effacés (BandeauEphemere). */}
          {experience.status === "published" && (
            <BandeauEphemere key={`publiee-${signal}`} ton="succes">
              {t("dashboard.experienceEditor.publishedNotice")}
            </BandeauEphemere>
          )}

          {experience.locked_at && (
            <BandeauEphemere key={`verrou-${signal}`} ton="alerte">
              {tNodes(t("dashboard.experienceEditor.lockedWarning"), {
                next: <strong>{t("dashboard.experienceEditor.lockedWarningNext")}</strong>,
              })}
            </BandeauEphemere>
          )}

          {/* ── Le parcours ── */}
          <section style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <h2 style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>{t("dashboard.experienceEditor.overview.journey")}</h2>
              <span style={{ fontSize: "12.5px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.overview.journeyHelp")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.9rem" }}>
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
              <button
                onClick={handleAddStep}
                className="bloc-etape"
                style={{
                  minHeight: 190, borderRadius: 12, border: "2px dashed var(--border)", background: "transparent",
                  color: "var(--muted-foreground)", cursor: "pointer", font: "inherit", fontSize: "13px", fontWeight: 700,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
                }}
              >
                <Plus size={20} /> {t("dashboard.experienceEditor.addStep")}
              </button>
            </div>
          </section>

          {/* ── Comment le candidat est noté ── */}
          <section style={{ marginBottom: "2rem" }}>
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
          <section>
            <h2 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 0.75rem" }}>{t("dashboard.experienceEditor.overview.settings")}</h2>
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
                toast={toast}
                onSaved={async (res) => { annoncerVersion(res); await load(); }}
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
