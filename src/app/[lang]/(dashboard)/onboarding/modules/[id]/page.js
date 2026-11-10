"use client";

// Un module d'onboarding (phase 2) : ses réglages, la génération de sa
// simulation (même moteur que le recrutement, sans crédit, en flux), ses
// étapes — chacune s'ouvre dans l'éditeur d'étape habituel — et sa
// publication, qui la rend jouable par les learners.

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Check, Archive, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { getModule, majModule, archiverModule } from "@/lib/actions/modules";
import { publishExperience } from "@/lib/actions/experience";
import GenerationFeed, { streamModuleGeneration, translateFeedError } from "@/components/assessment/GenerationFeed";
import { natureEtape } from "@/components/experience/BlocEtape";
import { StatusBadge } from "@/components/experience/ui";
import { listerCompetences } from "@/lib/competences";

const DIFFICULTES = ["easy", "medium", "hard"];

export default function ModulePage({ params }) {
  const { id } = use(params);
  const { t } = useI18n();
  const { toast } = useToast();
  const generer = useSearchParams().get("generer") === "1";
  const k = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [form, setForm] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [evenements, setEvenements] = useState([]);
  const [generation, setGeneration] = useState(false);
  const lance = useRef(false);

  const charger = useCallback(async () => {
    const res = await getModule(id);
    if (!res.success) return setDonnees({ erreur: true });
    setDonnees(res);
    setForm({
      title: res.module.title || "", target_role: res.module.target_role || "", situation: res.module.situation || "",
      objective: res.module.objective || "", difficulty: res.module.difficulty, min_score: res.module.min_score, locale: res.module.locale,
    });
  }, [id]);

  const lancerGeneration = useCallback(async () => {
    setGeneration(true);
    setEvenements([]);
    const res = await streamModuleGeneration(id, (ev) => setEvenements((e) => [...e, ev]));
    setGeneration(false);
    if (!res.success) toast(translateFeedError(t, res.error) || k("errors.generic"), "error");
    await charger();
  }, [id, charger, toast, t]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Arrivée depuis la création (?generer=1) : la génération part toute seule,
  // une fois.
  useEffect(() => {
    if (!generer || lance.current || !donnees || donnees.erreur || donnees.experience) return;
    lance.current = true;
    lancerGeneration();
  }, [generer, donnees, lancerGeneration]);

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await majModule(id, form);
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(k("saved"), "success");
    charger();
  }

  async function publier() {
    const res = await publishExperience(donnees.experience.id);
    if (!res.success) return toast(k("errors.generic"), "error");
    toast(k("published"), "success");
    charger();
  }

  async function archiver() {
    if (!window.confirm(k("archiveConfirm"))) return;
    const res = await archiverModule(id, !donnees.module.archived_at);
    if (!res.success) return toast(k("errors.generic"), "error");
    charger();
  }

  const crumbs = [{ label: k("title"), href: "/onboarding/modules" }];
  if (!donnees) return (<><PageHeader crumbs={crumbs} title="…" /><div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  if (donnees.erreur) return (<><PageHeader crumbs={crumbs} title={k("notFound")} /><div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div></>);

  const { module, experience, steps, job } = donnees;
  const competences = listerCompetences(job?.extracted_criteria || {});
  const set = (cle) => (e) => setForm((f) => ({ ...f, [cle]: e.target.value }));

  return (
    <>
      <PageHeader crumbs={crumbs} title={module.title} actions={
        <button type="button" className="ds-btn" onClick={archiver}><Archive size={14} /> {module.archived_at ? k("unarchive") : k("archive")}</button>
      } />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── La simulation ─────────────────────────────────────────────── */}
        <section className="ds-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 0", flexWrap: "wrap" }}>
            <h2 className="ds-h2" style={{ flex: 1 }}>{k("simulation")}</h2>
            {experience && <StatusBadge status={experience.status} />}
            {experience && experience.status !== "published" && (
              <button type="button" className="ds-btn ds-btn-primary" onClick={publier} disabled={generation}><Check size={14} /> {k("publish")}</button>
            )}
            <button type="button" className="ds-btn" onClick={lancerGeneration} disabled={generation}>
              {generation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
              {experience ? k("regenerate") : k("generate")}
            </button>
          </div>
          {(generation || evenements.length > 0) && (
            <div className="ds-inset"><GenerationFeed events={evenements} active={generation} /></div>
          )}
          {!generation && !experience && <div className="ds-inset"><p className="ds-sub">{k("noSimulationHint")}</p></div>}
          {experience && (
            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
              {steps.map((s, i) => {
                const { cle, Icone } = natureEtape(s);
                const nature = ["call", "phone", "chat"].includes(cle)
                  ? t(`dashboard.experienceEditor.overview.${cle}`)
                  : t(`dashboard.experienceEditor.coverage.format.${cle}`);
                return (
                  <Link key={s.id} href={`/onboarding/modules/${id}/etapes/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", textDecoration: "none", color: "inherit" }}>
                    <span className="ds-mono" style={{ width: 24, height: 24, borderRadius: 7, background: "var(--ds-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{i + 1}</span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                      <b style={{ fontSize: 14, fontWeight: 600 }}>{s.title || "—"}</b>
                      <span className="ds-muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}><Icone size={12} /> {nature}</span>
                    </span>
                    <ChevronRight size={16} style={{ color: "var(--ds-ink-4)" }} />
                  </Link>
                );
              })}
            </div>
          )}
          {competences.length > 0 && (
            <div className="ds-inset" style={{ fontSize: 13 }}>
              <b style={{ fontWeight: 600 }}>{k("skills")} : </b>{competences.map((c) => c.name).join(", ")}
            </div>
          )}
        </section>

        {/* ── Les réglages ──────────────────────────────────────────────── */}
        <form onSubmit={enregistrer} className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("settings")}</h2>
            <p className="ds-sub">{k("settingsHint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label className="ds-field"><span className="ds-label">{k("fields.title")}</span><input className="ds-input" required value={form.title} onChange={set("title")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.role")}</span><input className="ds-input" value={form.target_role} onChange={set("target_role")} /></label>
            <label className="ds-field" style={{ gridColumn: "1 / -1" }}><span className="ds-label">{k("fields.situation")}</span><textarea className="ds-textarea" rows={3} value={form.situation} onChange={set("situation")} /></label>
            <label className="ds-field" style={{ gridColumn: "1 / -1" }}><span className="ds-label">{k("fields.objective")}</span><textarea className="ds-textarea" rows={2} value={form.objective} onChange={set("objective")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.difficulty")}</span>
              <select className="ds-select" value={form.difficulty} onChange={set("difficulty")}>{DIFFICULTES.map((d) => <option key={d} value={d}>{k(`difficulty.${d}`)}</option>)}</select>
            </label>
            <label className="ds-field"><span className="ds-label">{k("fields.minScore")}</span><input className="ds-input" type="number" min={0} max={100} value={form.min_score} onChange={set("min_score")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.language")}</span>
              <select className="ds-select" value={form.locale} onChange={set("locale")}>{EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}</select>
            </label>
          </div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi}>{envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("save")}</button>
          </div>
        </form>
      </div>
    </>
  );
}
