"use client";

// Une simulation d'onboarding (16/11/2026). Tout ce qu'il faut pour la
// relire et l'envoyer, sur une page :
//   • la génération (en flux, à l'arrivée depuis « Créer une simulation ») ;
//   • l'APERÇU de la conversation : le personnage, ce que la personne lit
//     avant de commencer, ce que le personnage cache et objecte, la grille de
//     notation et « À retenir » — chaque partie se retouche dans l'éditeur
//     d'étape ;
//   • tester (une fois), publier, assigner à des personnes (la fenêtre
//     partagée avec Onboarding → Modules, components/onboarding/FenetreAssigner) ;
//   • les réglages, et la suppression définitive.

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCw, Check, Trash2, Pencil, MessageSquare, Mail, Video, Phone, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { getModule, majModule, supprimerModule, impactSuppressionModule } from "@/lib/actions/modules";
import { publishExperience } from "@/lib/actions/experience";
import GenerationFeed, { streamModuleGeneration, translateFeedError } from "@/components/assessment/GenerationFeed";
import TesterSimulation from "@/components/experience/TesterSimulation";
import { initials } from "@/components/ui/ds";
import GrilleNotation from "@/components/simulations/GrilleNotation";
import Select from "@/components/ui/Select";
import FenetreAssigner from "@/components/onboarding/FenetreAssigner";

const DIFFICULTES = ["easy", "medium", "hard"];
const ICONES_CANAL = { chat: MessageSquare, email: Mail, call: Video, phone: Phone };
const TONS_ETAT = { published: "ds-chip-green", pending_review: "ds-chip-amber" };

/** Le canal d'une étape : l'écrit (e-mail, et les anciennes réponses à un client), ou le mode de la conversation (appel vidéo par défaut). */
function canalEtape(s) {
  if (["email", "client_reply", "inbox"].includes(s.sandbox_kind)) return "email";
  const mode = s.config?.persona_mode || s.config?.persona?.mode;
  return ["chat", "phone"].includes(mode) ? mode : "call";
}

function Bloc({ titre, children, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="ds-label" style={{ flex: 1 }}>{titre}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Les points de contrôle des autres étapes, par compétence notée. */
function pointsAilleurs(steps, stepId) {
  const out = {};
  for (const s of steps) {
    if (s.id === stepId) continue;
    for (const c of s.criteria || []) for (const id of c.skill_ids || []) out[id] = (out[id] || 0) + (c.checkpoints || []).length;
  }
  return out;
}

const puces = (items) => (
  <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 13, lineHeight: 1.5 }}>
    {items.map((x, i) => <li key={i}>{x}</li>)}
  </ul>
);

export default function ModulePage({ params }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const recherche = useSearchParams();
  const generer = recherche.get("generer") === "1";
  const personaDemande = recherche.get("persona");
  const k = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const p = (cle, vars) => t(`dashboard.sims.page.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [form, setForm] = useState(null);
  const [envoi, setEnvoi] = useState(false);
  const [evenements, setEvenements] = useState([]);
  const [generation, setGeneration] = useState(false);
  const [fenetre, setFenetre] = useState(false);
  const lance = useRef(false);

  const charger = useCallback(async () => {
    const res = await getModule(id);
    if (!res.success) return setDonnees({ erreur: true });
    setDonnees(res);
    setForm({
      title: res.module.title || "", target_role: res.module.target_role || "",
      difficulty: res.module.difficulty, min_score: res.module.min_score, locale: res.module.locale,
    });
  }, [id]);

  const lancerGeneration = useCallback(async (personaId = null) => {
    setGeneration(true);
    setEvenements([]);
    const res = await streamModuleGeneration(id, (ev) => setEvenements((e) => [...e, ev]), { personaId, locale });
    setGeneration(false);
    if (!res.success) toast(translateFeedError(t, res.error) || k("errors.generic"), "error");
    await charger();
  }, [id, charger, toast, t, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  // Arrivée depuis la création (?generer=1) : la génération part toute seule, une fois.
  useEffect(() => {
    if (!generer || lance.current || !donnees || donnees.erreur || donnees.experience) return;
    lance.current = true;
    lancerGeneration(personaDemande);
  }, [generer, donnees, lancerGeneration, personaDemande]);

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

  async function supprimer() {
    const impact = await impactSuppressionModule(id);
    const message = impact.success && (impact.essais || impact.assignations)
      ? p("deleteConfirmData", { titre: donnees.module.title, essais: impact.essais, assignations: impact.assignations })
      : p("deleteConfirm", { titre: donnees.module.title });
    if (!window.confirm(message)) return;
    const res = await supprimerModule(id);
    if (!res.success) return toast(k("errors.generic"), "error");
    toast(p("deleted"), "success");
    router.push("/onboarding/modules");
  }

  const fermerFenetre = useCallback(() => setFenetre(false), []);
  function apresAssignation(n, complet) {
    if (complet) setFenetre(false);
    toast(p("assigned", { count: n }), "success");
    charger();
  }

  const crumbs = [{ label: t("dashboard.nav.modules"), href: "/onboarding/modules" }];
  if (!donnees) return (<><PageHeader crumbs={crumbs} title="…" /><div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  if (donnees.erreur) return (<><PageHeader crumbs={crumbs} title={k("notFound")} /><div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div></>);

  const { module, experience, steps, personnage, assignations } = donnees;
  const set = (cle) => (e) => setForm((f) => ({ ...f, [cle]: e.target.value }));
  // Les canaux des étapes, dans l'ordre — pas le seul canal choisi à la création :
  // un module peut enchaîner un appel et un e-mail de suivi.
  const canaux = steps.length ? [...new Set(steps.map(canalEtape))] : [module.channel || "call"];
  const etat = experience ? (["published", "pending_review"].includes(experience.status) ? experience.status : "draft") : "toBuild";
  const numero = (step) => steps.findIndex((x) => x.id === step.id) + 1;
  // Régénérer garde l'interlocuteur : le personnage choisi, sinon celui de la version courante.
  const personaCourant = module.persona_id || steps.find((s) => s.config?.persona_id)?.config.persona_id || null;
  const publiee = experience?.status === "published";

  return (
    <>
      <PageHeader crumbs={crumbs} title={module.title} actions={
        <>
          {experience && <TesterSimulation moduleId={id} signal={experience.id} disabled={generation} />}
          {experience && !publiee && (
            <button type="button" className="ds-btn ds-btn-primary" onClick={publier} disabled={generation}><Check size={14} /> {k("publish")}</button>
          )}
          <button type="button" className="ds-btn" onClick={supprimer} disabled={generation} title={p("delete")} aria-label={p("delete")}><Trash2 size={14} /></button>
        </>
      } />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── En-tête : canal, rôle, langue, état ─────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {canaux.map((cn) => {
            const Icone = ICONES_CANAL[cn] || Video;
            return <span key={cn} className="ds-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icone size={13} /> {t(`dashboard.sims.channels.${cn}.title`)}</span>;
          })}
          {module.target_role && <span className="ds-chip">{module.target_role}</span>}
          <span className="ds-chip">{LOCALE_LABELS[module.locale] || module.locale}</span>
          <span className="ds-chip">{k(`difficulty.${module.difficulty}`)}</span>
          <span className="ds-chip">{k("minScoreShort", { score: module.min_score })}</span>
          <span className={`ds-chip ${TONS_ETAT[etat] || ""}`}>{k(`etat.${etat}`)}</span>
          <span style={{ flex: 1 }} />
          <button type="button" className="ds-btn" onClick={() => lancerGeneration(personaCourant)} disabled={generation}>
            {generation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={14} />}
            {experience ? k("regenerate") : k("generate")}
          </button>
        </div>

        {(generation || evenements.length > 0) && (
          <section className="ds-panel"><div className="ds-inset"><GenerationFeed events={evenements} active={generation} /></div></section>
        )}
        {!generation && !experience && <section className="ds-panel"><div className="ds-inset"><p className="ds-sub">{k("noSimulationHint")}</p></div></section>}

        {/* ── L'aperçu ─────────────────────────────────────────────────────── */}
        {experience && steps.map((s) => {
          const c = s.config || {};
          const perso = c.persona;
          return (
            <section key={s.id} className="ds-panel">
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 0" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, color: "var(--ds-blue)" }}>
                    {(() => { const Icone = ICONES_CANAL[canalEtape(s)] || Video; return <Icone size={12} />; })()}
                    {p("step", { n: numero(s), canal: t(`dashboard.sims.channels.${canalEtape(s)}.title`) })}
                  </span>
                  <h2 className="ds-h2">{s.title || p("preview")}</h2>
                </span>
                <Link href={`/onboarding/modules/${id}/etapes/${s.id}`} className="ds-btn"><Pencil size={14} /> {p("edit")}</Link>
              </div>
              <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {(perso || personnage) && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span className="ds-avatar">{initials(...String((perso || personnage).name || "?").split(" "))}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 13 }}>
                        <b style={{ fontSize: 14, fontWeight: 600 }}>{(perso || personnage).name}</b>
                        <span className="ds-muted">{[(perso || personnage).role, (perso || personnage).company].filter(Boolean).join(" · ")}</span>
                        {(perso || personnage).personality && <span style={{ color: "var(--ds-ink-3)" }}>{(perso || personnage).personality}</span>}
                      </span>
                    </div>
                  )}
                  {s.prompt && <Bloc titre={p("mission")}><p style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{s.prompt}</p></Bloc>}
                  {s.sandbox_kind === "email" ? (
                    <Bloc titre={p("emailBrief")}>
                      <p style={{ fontSize: 13, lineHeight: 1.55 }}>{[c.to && `${p("to")} ${c.to}`, c.subject && `${p("subject")} ${c.subject}`].filter(Boolean).join(" · ")}</p>
                      {c.context && <p style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{c.context}</p>}
                    </Bloc>
                  ) : s.sandbox_kind === "client_reply" ? (
                    c.client_message && <Bloc titre={p("clientMessage")}><p style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{typeof c.client_message === "string" ? c.client_message : [c.client_message.from, c.client_message.subject, c.client_message.body].filter(Boolean).join("\n")}</p></Bloc>
                  ) : perso && (
                    <>
                      {perso.context && <Bloc titre={p("context")}><p style={{ fontSize: 13, lineHeight: 1.55 }}>{perso.context}</p></Bloc>}
                      {perso.opening_message && <Bloc titre={p("opening")}><p style={{ fontSize: 13, lineHeight: 1.55, fontStyle: "italic" }}>« {perso.opening_message} »</p></Bloc>}
                    </>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {perso?.objections?.length > 0 && <Bloc titre={p("objections")}>{puces(perso.objections)}</Bloc>}
                  {perso?.hidden_info?.length > 0 && <Bloc titre={p("hidden")}>{puces(perso.hidden_info)}</Bloc>}
                  {perso?.end_condition && <Bloc titre={p("end")}><p style={{ fontSize: 13, lineHeight: 1.55 }}>{perso.end_condition}</p></Bloc>}
                </div>
              </div>
              {c.a_retenir?.length > 0 && (
                <div className="ds-inset">
                  <Bloc titre={p("takeaways")}>
                    {puces(c.a_retenir)}
                  </Bloc>
                </div>
              )}
            </section>
          );
        })}

        {/* ── La grille de notation, modifiable ─────────────────────────────── */}
        {experience && steps.filter((s) => Array.isArray(s.criteria)).map((s) => (
          <GrilleNotation
            key={`${s.id}-${s.updated_at}`}
            moduleId={id}
            step={s}
            criteria={module.criteria}
            ailleurs={pointsAilleurs(steps, s.id)}
            verrouillee={Boolean(experience.locked_at)}
            onSaved={charger}
            etape={steps.length > 1 ? p("scorecardOf", { n: numero(s), titre: s.title || p("preview") }) : null}
          />
        ))}

        {/* ── Assigner ─────────────────────────────────────────────────────── */}
        {experience && (
          <section className="ds-panel">
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
              <h2 className="ds-h2">{p("assignTitle")}</h2>
              {!publiee && <p className="ds-sub">{p("assignAfterPublish")}</p>}
            </div>
            <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--ds-ink-3)" }}>
                {(assignations || []).length
                  ? k("assignedCount", { count: assignations.length })
                  : k("assignedNobody")}
              </span>
              <button type="button" className="ds-btn ds-btn-primary" onClick={() => setFenetre(true)} disabled={!publiee}>
                <UserPlus size={14} /> {k("assignOpen")}
              </button>
            </div>
          </section>
        )}

        {/* ── Les réglages ─────────────────────────────────────────────────── */}
        <form onSubmit={enregistrer} className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("settings")}</h2>
            <p className="ds-sub">{k("settingsHint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            <label className="ds-field"><span className="ds-label">{k("fields.title")}</span><input className="ds-input" required value={form.title} onChange={set("title")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.role")}</span><input className="ds-input" value={form.target_role} onChange={set("target_role")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.difficulty")}</span>
              <Select className="ds-select" value={form.difficulty} onChange={set("difficulty")}>{DIFFICULTES.map((d) => <option key={d} value={d}>{k(`difficulty.${d}`)}</option>)}</Select>
            </label>
            <label className="ds-field"><span className="ds-label">{k("fields.minScore")}</span><input className="ds-input" type="number" min={0} max={100} value={form.min_score} onChange={set("min_score")} /></label>
            <label className="ds-field"><span className="ds-label">{k("fields.language")}</span>
              <Select className="ds-select" value={form.locale} onChange={set("locale")}>{EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}</Select>
            </label>
          </div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi}>{envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("save")}</button>
          </div>
        </form>
      </div>
      {fenetre && <FenetreAssigner moduleId={id} titre={module.title} onFermer={fermerFenetre} onAssigne={apresAssignation} />}
    </>
  );
}
