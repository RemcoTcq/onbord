"use client";

// « Créer une simulation » (16/11/2026) : l'entrée unique. On choisit d'abord
// à quoi elle servira.
//
//   • RECRUTEMENT — rien ne change : on part d'une offre (/jobs/nouveau), Onbord
//     en tire les compétences, puis construit la simulation.
//   • ONBOARDING — quatre temps sur une page : le rôle ; la conversation à
//     travailler (proposée à partir des connaissances d'entreprise, ou
//     décrite) ; le personnage (de la bibliothèque, ou créé par Onbord) ; les
//     réglages. La simulation se génère ensuite sur la page du module, où on
//     la relit, la teste et la publie.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles, Briefcase, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { creerModule, proposerModules } from "@/lib/actions/modules";
import { listerPersonas } from "@/lib/actions/personas";

const DIFFICULTES = ["easy", "medium", "hard"];
const LIBRE = "libre"; // « décrire ma propre situation »

export default function CreerSimulationPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.sims.new.${cle}`, vars);
  const km = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const [usage, setUsage] = useState(useSearchParams().get("usage") === "onboarding" ? "onboarding" : null);
  const [role, setRole] = useState("");
  const [form, setForm] = useState({ title: "", situation: "", objective: "", difficulty: "medium", min_score: 70, locale: EXPERIENCE_LOCALES.includes(locale) ? locale : "en" });
  const [propositions, setPropositions] = useState(null);
  const [choix, setChoix] = useState(null); // index d'une proposition, ou LIBRE
  const [recherche, setRecherche] = useState(false);
  const [personas, setPersonas] = useState(null);
  const [personaId, setPersonaId] = useState("");
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (usage !== "onboarding") return undefined;
    let actif = true;
    listerPersonas().then((r) => { if (actif) setPersonas(r.success ? r.personas : []); });
    return () => { actif = false; };
  }, [usage]);

  const set = (cle) => (e) => setForm((f) => ({ ...f, [cle]: e.target.value }));

  async function proposer(e) {
    e.preventDefault();
    setRecherche(true);
    setPropositions(null);
    setChoix(null);
    const res = await proposerModules({ role, nombre: 5 });
    setRecherche(false);
    if (!res.success) return toast(km("errors.suggestion"), "error");
    setPropositions(res.propositions);
  }

  function choisir(valeur) {
    setChoix(valeur);
    if (valeur === LIBRE) return setForm((f) => ({ ...f, title: "", situation: "", objective: "" }));
    const p = propositions[valeur];
    setForm((f) => ({ ...f, title: p.title, situation: p.situation, objective: p.objective || "", difficulty: p.difficulty || "medium" }));
  }

  async function creer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await creerModule({ ...form, target_role: role });
    if (!res.success) {
      setEnvoi(false);
      return toast(km(`errors.${res.code || "generic"}`), "error");
    }
    router.push(`/onboarding/modules/${res.id}?generer=1${personaId ? `&persona=${personaId}` : ""}`);
  }

  const crumbs = [{ label: t("dashboard.sims.title"), href: "/simulations" }];
  const numero = (n) => (
    <span className="ds-mono" style={{ width: 24, height: 24, borderRadius: 7, background: "var(--ds-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{n}</span>
  );
  const tete = (n, titre, aide) => (
    <div style={{ display: "flex", gap: 10, padding: "10px 10px 0" }}>
      {numero(n)}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <h2 className="ds-h2">{titre}</h2>
        {aide && <p className="ds-sub">{aide}</p>}
      </div>
    </div>
  );

  // ── 0. L'usage ──────────────────────────────────────────────────────────
  if (!usage) {
    const carte = { display: "flex", flexDirection: "column", gap: 10, padding: 18, textAlign: "left", textDecoration: "none", color: "inherit", cursor: "pointer", flex: "1 1 300px" };
    return (
      <>
        <PageHeader crumbs={crumbs} title={k("title")} />
        <div className="ds-body" style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
          <p className="ds-sub">{k("usageTitle")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <Link href="/jobs/nouveau" className="ds-panel" style={carte}>
              <Briefcase size={22} strokeWidth={1.8} style={{ color: "var(--ds-blue)" }} />
              <h2 className="ds-h2">{k("hiring.title")}</h2>
              <p className="ds-sub" style={{ flex: 1 }}>{k("hiring.body")}</p>
              <span className="ds-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>{k("hiring.cta")} <ArrowRight size={14} /></span>
            </Link>
            <button type="button" className="ds-panel" style={{ ...carte, font: "inherit" }} onClick={() => setUsage("onboarding")}>
              <GraduationCap size={22} strokeWidth={1.8} style={{ color: "var(--ds-blue)" }} />
              <h2 className="ds-h2">{k("onboarding.title")}</h2>
              <p className="ds-sub" style={{ flex: 1 }}>{k("onboarding.body")}</p>
              <span className="ds-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>{k("onboarding.cta")} <ArrowRight size={14} /></span>
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── Onboarding ──────────────────────────────────────────────────────────
  const situationChoisie = choix !== null;
  const dejaLa = situationChoisie && choix !== LIBRE ? propositions[choix]?.existing_id : null;
  return (
    <>
      <PageHeader crumbs={crumbs} title={k("titleOnboarding")} actions={
        <button type="button" className="ds-btn" onClick={() => setUsage(null)}><ArrowLeft size={14} /> {k("changeUsage")}</button>
      } />
      <div className="ds-body" style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── 1. Le rôle ─────────────────────────────────────────────────── */}
        <form onSubmit={proposer} className="ds-panel">
          {tete(1, k("roleTitle"), k("roleHint"))}
          <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12 }}>
            <label className="ds-field" style={{ flex: "1 1 260px" }}>
              <span className="ds-label">{km("fields.role")}</span>
              <input className="ds-input" value={role} onChange={(e) => setRole(e.target.value)} placeholder={km("fields.rolePlaceholder")} required />
            </label>
            <label className="ds-field" style={{ flex: "0 1 180px" }}>
              <span className="ds-label">{km("fields.language")}</span>
              <select className="ds-select" value={form.locale} onChange={set("locale")}>
                {EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
              </select>
            </label>
            <button type="submit" className="ds-btn ds-btn-primary" disabled={recherche || !role.trim()}>
              {recherche ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {recherche ? k("finding") : propositions ? k("findAgain") : k("find")}
            </button>
          </div>
          <div className="ds-panel-foot" style={{ justifyContent: "flex-start", fontSize: 13, color: "var(--ds-ink-3)", gap: 6 }}>
            {k("knowledgeHint")} <Link href="/entreprise/connaissances" className="ds-link">{k("knowledgeLink")}</Link>
          </div>
        </form>

        {/* ── 2. La conversation ─────────────────────────────────────────── */}
        {(propositions || recherche) && (
          <section className="ds-panel">
            {tete(2, k("situationTitle"), k("situationHint"))}
            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
              {recherche && <div style={{ padding: 14 }}><Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "var(--ds-ink-5)" }} /></div>}
              {(propositions || []).map((p, i) => (
                <label key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", cursor: "pointer", background: choix === i ? "var(--ds-hover-row)" : "transparent" }}>
                  <input type="radio" name="situation" checked={choix === i} onChange={() => choisir(i)} style={{ marginTop: 3 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <b style={{ fontSize: 14, fontWeight: 600 }}>
                      {p.title} <span className="ds-chip">{km(`difficulty.${p.difficulty}`)}</span>
                      {p.existing_id && <span className="ds-chip ds-chip-green" style={{ marginLeft: 6 }}>{k("inLibrary")}</span>}
                    </b>
                    <span style={{ fontSize: 13 }}>{p.situation}</span>
                    {p.objective && <span className="ds-muted" style={{ fontSize: 12 }}>{p.objective}</span>}
                  </span>
                </label>
              ))}
              {propositions && (
                <label style={{ display: "flex", gap: 12, padding: "12px 14px", borderTop: propositions.length ? "1px solid var(--ds-line)" : "none", cursor: "pointer", background: choix === LIBRE ? "var(--ds-hover-row)" : "transparent" }}>
                  <input type="radio" name="situation" checked={choix === LIBRE} onChange={() => choisir(LIBRE)} style={{ marginTop: 3 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <b style={{ fontSize: 14, fontWeight: 600 }}>{k("own")}</b>
                    <span className="ds-muted" style={{ fontSize: 12 }}>{k("ownHint")}</span>
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        {/* Une conversation déjà dans la bibliothèque s'ouvre, elle ne se recrée pas. */}
        {dejaLa && (
          <section className="ds-panel">
            <div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p className="ds-sub" style={{ flex: 1 }}>{k("inLibraryHint")}</p>
              <Link href={`/onboarding/modules/${dejaLa}`} className="ds-btn ds-btn-primary">{k("open")} <ArrowRight size={14} /></Link>
            </div>
          </section>
        )}

        {situationChoisie && !dejaLa && (
          <form onSubmit={creer} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section className="ds-panel">
              <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ds-label">{km("fields.title")}</span>
                  <input className="ds-input" value={form.title} onChange={set("title")} required placeholder={km("fields.titlePlaceholder")} />
                </label>
                <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ds-label">{km("fields.situation")}</span>
                  <textarea className="ds-textarea" rows={3} value={form.situation} onChange={set("situation")} required placeholder={km("fields.situationPlaceholder")} />
                </label>
                <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                  <span className="ds-label">{km("fields.objective")}</span>
                  <textarea className="ds-textarea" rows={2} value={form.objective} onChange={set("objective")} placeholder={km("fields.objectivePlaceholder")} />
                </label>
              </div>
            </section>

            {/* ── 3. Le personnage ─────────────────────────────────────────── */}
            <section className="ds-panel">
              {tete(3, k("personaTitle"), k("personaHint"))}
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <label style={{ display: "flex", gap: 10, cursor: "pointer" }}>
                  <input type="radio" name="persona" checked={!personaId} onChange={() => setPersonaId("")} style={{ marginTop: 3 }} />
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <b style={{ fontWeight: 600, fontSize: 14 }}>{k("personaAuto")}</b>
                    <span className="ds-muted" style={{ fontSize: 12 }}>{k("personaAutoHint")}</span>
                  </span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  <b style={{ fontWeight: 600, fontSize: 14 }}>{k("personaLibrary")}</b>
                  <select className="ds-select" style={{ flex: "1 1 240px", maxWidth: 360 }} value={personaId} onChange={(e) => setPersonaId(e.target.value)} disabled={!personas?.length} aria-label={k("personaLibrary")}>
                    <option value="">{personas === null ? "…" : personas.length ? k("personaChoose") : k("personaEmpty")}</option>
                    {(personas || []).map((p) => <option key={p.id} value={p.id}>{[p.name, p.role, p.company].filter(Boolean).join(" · ")}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* ── 4. Les réglages ──────────────────────────────────────────── */}
            <section className="ds-panel">
              {tete(4, k("settingsTitle"))}
              <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
                <label className="ds-field">
                  <span className="ds-label">{km("fields.difficulty")}</span>
                  <select className="ds-select" value={form.difficulty} onChange={set("difficulty")}>
                    {DIFFICULTES.map((d) => <option key={d} value={d}>{km(`difficulty.${d}`)}</option>)}
                  </select>
                </label>
                <label className="ds-field">
                  <span className="ds-label">{km("fields.minScore")}</span>
                  <input className="ds-input" type="number" min={0} max={100} value={form.min_score} onChange={set("min_score")} />
                </label>
              </div>
              <div className="ds-panel-foot">
                <span style={{ flex: 1, fontSize: 13, color: "var(--ds-ink-3)" }}>{k("submitHint")}</span>
                <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi}>
                  {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{km("createAndGenerate")}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </>
  );
}
