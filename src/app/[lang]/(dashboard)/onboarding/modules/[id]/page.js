"use client";

// Une simulation d'onboarding (16/11/2026). Tout ce qu'il faut pour la
// relire et l'envoyer, sur une page :
//   • la génération (en flux, à l'arrivée depuis « Créer une simulation ») ;
//   • l'APERÇU de la conversation : le personnage, ce que la personne lit
//     avant de commencer, ce que le personnage cache et objecte, la grille de
//     notation et « À retenir » — chaque partie se retouche dans l'éditeur
//     d'étape ;
//   • tester (une fois), publier, assigner à des personnes ;
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
import { listerPersonnes, assigner } from "@/lib/actions/personnes";
import { publishExperience } from "@/lib/actions/experience";
import GenerationFeed, { streamModuleGeneration, translateFeedError } from "@/components/assessment/GenerationFeed";
import { StatusBadge } from "@/components/experience/ui";
import TesterSimulation from "@/components/experience/TesterSimulation";
import { initials } from "@/components/ui/ds";
import Select from "@/components/ui/Select";

const DIFFICULTES = ["easy", "medium", "hard"];
const ICONES_CANAL = { chat: MessageSquare, email: Mail, call: Video, phone: Phone };

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
  const [personnes, setPersonnes] = useState(null);
  const [choisies, setChoisies] = useState(new Set());
  const [assignation, setAssignation] = useState(false);
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
    listerPersonnes().then((r) => setPersonnes(r.success ? r.personnes : []));
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
    router.push("/simulations");
  }

  async function assignerChoisies() {
    setAssignation(true);
    let n = 0;
    for (const learnerId of choisies) {
      const res = await assigner({ learnerId, moduleIds: [id] });
      if (res.success) n += res.nouvelles || 0;
    }
    setAssignation(false);
    setChoisies(new Set());
    toast(p("assigned", { count: n }), "success");
    charger();
  }

  const crumbs = [{ label: t("dashboard.sims.title"), href: "/simulations?usage=onboarding" }];
  if (!donnees) return (<><PageHeader crumbs={crumbs} title="…" /><div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  if (donnees.erreur) return (<><PageHeader crumbs={crumbs} title={k("notFound")} /><div className="ds-body"><p className="ds-sub">{k("notFound")}</p></div></>);

  const { module, experience, steps, personnage, assignations } = donnees;
  const set = (cle) => (e) => setForm((f) => ({ ...f, [cle]: e.target.value }));
  const canal = module.channel || "call";
  const IconeCanal = ICONES_CANAL[canal] || Video;
  // Régénérer garde l'interlocuteur : le personnage choisi, sinon celui de la version courante.
  const personaCourant = module.persona_id || steps.find((s) => s.config?.persona_id)?.config.persona_id || null;
  const dejaAssignes = new Set((assignations || []).map((a) => a.learner_id));
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
          <span className="ds-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><IconeCanal size={13} /> {t(`dashboard.sims.channels.${canal}.title`)}</span>
          {module.target_role && <span className="ds-chip">{module.target_role}</span>}
          <span className="ds-chip">{LOCALE_LABELS[module.locale] || module.locale}</span>
          <span className="ds-chip">{k(`difficulty.${module.difficulty}`)}</span>
          <span className="ds-chip">{k("minScoreShort", { score: module.min_score })}</span>
          {experience && <StatusBadge status={experience.status} />}
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
                <h2 className="ds-h2" style={{ flex: 1 }}>{s.title || p("preview")}</h2>
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
              {(s.criteria || []).length > 0 && (
                <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <span className="ds-label">{p("scorecard")}</span>
                  {(s.criteria || []).map((cr, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <b style={{ fontSize: 13, fontWeight: 600 }}>{cr.name}</b>
                      {puces((cr.checkpoints || []).map((cp) => cp.description))}
                    </div>
                  ))}
                </div>
              )}
              {c.a_retenir?.length > 0 && (
                <div className="ds-inset">
                  <Bloc titre={p("takeaways")}>
                    <p className="ds-help" style={{ marginTop: -2 }}>{p("takeawaysHint")}</p>
                    {puces(c.a_retenir)}
                  </Bloc>
                </div>
              )}
            </section>
          );
        })}

        {/* ── Assigner ─────────────────────────────────────────────────────── */}
        {experience && (
          <section className="ds-panel">
            <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
              <h2 className="ds-h2">{p("assignTitle")}</h2>
              <p className="ds-sub">{publiee ? p("assignHint") : p("assignAfterPublish")}</p>
            </div>
            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {personnes === null && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
              {personnes?.length === 0 && (
                <p className="ds-sub">{p("noPeople")} <Link href="/onboarding/personnes" className="ds-link">{p("invite")}</Link></p>
              )}
              {(personnes || []).map((pe) => {
                const deja = dejaAssignes.has(pe.userId);
                return (
                  <label key={pe.userId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: deja ? "default" : "pointer", opacity: deja ? 0.6 : 1 }}>
                    <input type="checkbox" disabled={deja || !publiee} checked={deja || choisies.has(pe.userId)}
                      onChange={() => setChoisies((s) => { const n = new Set(s); if (n.has(pe.userId)) n.delete(pe.userId); else n.add(pe.userId); return n; })} />
                    <span style={{ flex: 1 }}>{pe.nom || pe.email}</span>
                    {deja && <span className="ds-chip">{p("alreadyAssigned")}</span>}
                  </label>
                );
              })}
            </div>
            {publiee && personnes?.length > 0 && (
              <div className="ds-panel-foot">
                <button type="button" className="ds-btn ds-btn-primary" onClick={assignerChoisies} disabled={assignation || !choisies.size}>
                  {assignation ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />} {p("assign", { count: choisies.size })}
                </button>
              </div>
            )}
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
    </>
  );
}
