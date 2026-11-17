"use client";

// « Créer une simulation » (16/11/2026, pas à pas le 17/11) : l'entrée unique,
// recrutement ou onboarding, UNE ÉTAPE PAR PAGE, avec la frise en haut pour
// savoir où l'on en est et revenir sur une étape faite.
//
//   1. L'USAGE — recrutement ou onboarding. Il décide des étapes suivantes.
//   • RECRUTEMENT — on part d'une offre : la suite (offre, compétences) se
//     fait sur /jobs/nouveau, qui reprend la même frise, puis la simulation se
//     construit avec l'agent sur la page de l'offre.
//   • ONBOARDING — une simulation = UNE conversation :
//       2. le rôle de la personne qui s'entraîne (un rôle déjà utilisé, ou un
//          nouveau) ;
//       3. le canal : appel vidéo, appel téléphonique, chat ou e-mail ;
//       4. la langue, la difficulté, le seuil de réussite ;
//       5. le personnage : choisi dans la bibliothèque (ceux qui parlent la
//          langue de la simulation), ou créé sur place ;
//       6. le scénario, avec l'agent de conception : il fait raconter comment
//          la conversation se passe dans l'entreprise, puis propose la grille.
//          « Générer » crée la simulation, qu'on relit, teste et envoie.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Briefcase, GraduationCap, ArrowRight, ArrowLeft, MessageSquare, Mail, Video, Phone, Plus, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { useRouter } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { initials } from "@/components/ui/ds";
import { creerModule, listerRoles } from "@/lib/actions/modules";
import { listerPersonas, enregistrerPersona } from "@/lib/actions/personas";
import PersonaFiche from "@/components/personas/PersonaFiche";
import ChatConception from "@/components/simulations/ChatConception";
import EtapesCreation from "@/components/simulations/EtapesCreation";
import Select from "@/components/ui/Select";

const DIFFICULTES = ["easy", "medium", "hard"];
const CANAUX = [
  { id: "call", Icone: Video },
  { id: "phone", Icone: Phone },
  { id: "chat", Icone: MessageSquare },
  { id: "email", Icone: Mail },
];
const USAGES = [
  { id: "hiring", Icone: Briefcase },
  { id: "onboarding", Icone: GraduationCap },
];
// Les étapes de chaque usage, dans l'ordre de la frise. Avant le choix de
// l'usage, la frise annonce seulement la forme générale.
const ETAPES = {
  aucun: ["usage", "settings", "simulation"],
  hiring: ["usage", "job", "skills", "simulation"],
  onboarding: ["usage", "role", "channel", "settings", "persona", "scenario"],
};
const NOUVEAU = "__nouveau__";

export default function CreerSimulationPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.sims.new.${cle}`, vars);
  const km = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const demande = useSearchParams().get("usage");
  const [usage, setUsage] = useState(USAGES.some((u) => u.id === demande) ? demande : null);
  // Venu avec ?usage=onboarding, l'usage est déjà choisi : on ouvre sur le rôle.
  const [etape, setEtape] = useState(demande === "onboarding" ? 1 : 0);
  const [roles, setRoles] = useState(null);
  const [choixRole, setChoixRole] = useState("");
  const [nouveauRole, setNouveauRole] = useState("");
  const [canal, setCanal] = useState(null);
  const [langue, setLangue] = useState(EXPERIENCE_LOCALES.includes(locale) ? locale : "en");
  const [difficulte, setDifficulte] = useState("medium");
  const [seuil, setSeuil] = useState(70);
  const [personas, setPersonas] = useState(null);
  const [personaId, setPersonaId] = useState("");
  const [nouvelle, setNouvelle] = useState(null);
  const [creationPersona, setCreationPersona] = useState(false);
  const [generation, setGeneration] = useState(false);

  useEffect(() => {
    if (usage !== "onboarding") return undefined;
    let actif = true;
    listerRoles().then((r) => { if (actif) setRoles(r.roles || []); });
    listerPersonas().then((r) => { if (actif) setPersonas(r.success ? r.personas : []); });
    return () => { actif = false; };
  }, [usage]);

  // Chaque nouvelle étape s'ouvre en haut de page.
  useEffect(() => { window.scrollTo?.({ top: 0 }); document.querySelector(".ds-main")?.scrollTo?.({ top: 0 }); }, [etape]);

  const role = choixRole === NOUVEAU || !roles?.length ? nouveauRole.trim() : choixRole;
  const personasLangue = (personas || []).filter((p) => String(p.data?.language || "").slice(0, 2) === langue);

  const cles = ETAPES[usage || "aucun"];
  const cle = cles[etape];
  const frise = cles.map((c) => ({ cle: c, label: k(`steps.${c}`) }));

  async function creerPersonnage(e) {
    e.preventDefault();
    setCreationPersona(true);
    const res = await enregistrerPersona({ data: { ...nouvelle, language: nouvelle.language || langue } });
    setCreationPersona(false);
    if (!res.success) return toast(t(`dashboard.personas.errors.${res.code || "generic"}`), "error");
    setPersonas((l) => [res.persona, ...(l || []).filter((p) => p.id !== res.persona.id)]);
    setPersonaId(res.persona.id);
    setNouvelle(null);
    toast(t("dashboard.personas.created", { name: res.persona.name }), "success");
  }

  async function generer(recap) {
    setGeneration(true);
    const res = await creerModule({
      title: recap.title || role,
      target_role: role,
      channel: canal,
      locale: langue,
      difficulty: difficulte,
      min_score: seuil,
      persona_id: personaId || null,
      brief: recap.brief,
      competences: recap.criteres?.hard_skills || [],
    });
    if (!res.success) {
      setGeneration(false);
      return toast(km(`errors.${res.code || "generic"}`), "error");
    }
    router.push(`/onboarding/modules/${res.id}?generer=1`);
  }

  // Ce qui permet de passer à l'étape suivante.
  const pret = {
    usage: Boolean(usage),
    role: Boolean(role),
    channel: Boolean(canal),
    settings: true,
    persona: Boolean(personaId) && !nouvelle,
  }[cle];

  function continuer() {
    if (cle === "usage" && usage === "hiring") return router.push("/jobs/nouveau?depuis=simulations");
    setEtape((n) => n + 1);
  }

  const carteChoix = (actif) => ({
    display: "flex", flexDirection: "column", gap: 6, padding: 16, borderRadius: 12, cursor: "pointer", textAlign: "left", font: "inherit",
    background: actif ? "var(--ds-hover-row)" : "#fff", border: `1px solid ${actif ? "var(--ds-blue)" : "var(--ds-line)"}`,
    boxShadow: actif ? "0 0 0 1px var(--ds-blue)" : "none", color: "inherit", position: "relative",
  });
  const coche = (actif) => actif && (
    <span style={{ position: "absolute", top: 12, right: 12, width: 20, height: 20, borderRadius: 999, background: "var(--ds-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Check size={12} strokeWidth={2.6} />
    </span>
  );

  // ── Le contenu de l'étape ───────────────────────────────────────────────
  let contenu = null;
  if (cle === "usage") {
    contenu = (
      <div role="radiogroup" aria-label={k("usageTitle")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {USAGES.map(({ id, Icone }) => (
          <button key={id} type="button" role="radio" aria-checked={usage === id} style={{ ...carteChoix(usage === id), padding: 20, gap: 10 }} onClick={() => setUsage(id)}>
            {coche(usage === id)}
            <span className="ds-icon-tile" style={{ width: 40, height: 40, borderRadius: 11, background: "var(--ds-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icone size={20} strokeWidth={1.9} />
            </span>
            <b style={{ fontSize: 16, fontWeight: 600 }}>{k(`${id}.title`)}</b>
            <span className="ds-sub" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{k(`${id}.body`)}</span>
            <span className="ds-muted" style={{ fontSize: 12, marginTop: 2 }}>{k(`${id}.next`)}</span>
          </button>
        ))}
      </div>
    );
  } else if (cle === "role") {
    contenu = (
      <div className="ds-card ds-card-pad" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
        {roles === null && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
        {roles?.length > 0 && (
          <label className="ds-field" style={{ flex: "1 1 260px" }}>
            <span className="ds-label">{km("fields.role")}</span>
            <Select className="ds-select" value={choixRole} onChange={(e) => setChoixRole(e.target.value)}>
              <option value="">{k("roleChoose")}</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              <option value={NOUVEAU}>{k("roleNew")}</option>
            </Select>
          </label>
        )}
        {roles !== null && (!roles.length || choixRole === NOUVEAU) && (
          <label className="ds-field" style={{ flex: "1 1 260px" }}>
            <span className="ds-label">{roles.length ? k("roleNewLabel") : km("fields.role")}</span>
            <input className="ds-input" autoFocus value={nouveauRole} onChange={(e) => setNouveauRole(e.target.value)} placeholder={km("fields.rolePlaceholder")} />
          </label>
        )}
      </div>
    );
  } else if (cle === "channel") {
    contenu = (
      <div role="radiogroup" aria-label={k("channelTitle")} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {CANAUX.map(({ id, Icone }) => (
          <button key={id} type="button" role="radio" aria-checked={canal === id} style={carteChoix(canal === id)} onClick={() => setCanal(id)}>
            {coche(canal === id)}
            <Icone size={20} strokeWidth={1.8} style={{ color: "var(--ds-blue)" }} />
            <b style={{ fontSize: 14, fontWeight: 600 }}>{t(`dashboard.sims.channels.${id}.title`)}</b>
            <span className="ds-muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t(`dashboard.sims.channels.${id}.hint`)}</span>
          </button>
        ))}
      </div>
    );
  } else if (cle === "settings") {
    contenu = (
      <div className="ds-card ds-card-pad" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16 }}>
        <label className="ds-field">
          <span className="ds-label">{km("fields.language")}</span>
          <Select className="ds-select" value={langue} onChange={(e) => { setLangue(e.target.value); setPersonaId(""); }}>
            {EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
          </Select>
        </label>
        <label className="ds-field">
          <span className="ds-label">{km("fields.difficulty")}</span>
          <Select className="ds-select" value={difficulte} onChange={(e) => setDifficulte(e.target.value)}>
            {DIFFICULTES.map((d) => <option key={d} value={d}>{km(`difficulty.${d}`)}</option>)}
          </Select>
        </label>
        <label className="ds-field">
          <span className="ds-label">{km("fields.minScore")}</span>
          <input className="ds-input" type="number" min={0} max={100} value={seuil} onChange={(e) => setSeuil(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
        </label>
      </div>
    );
  } else if (cle === "persona") {
    contenu = (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 12 }}>
          {personas === null && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
          {personasLangue.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={personaId === p.id} style={{ ...carteChoix(personaId === p.id), flexDirection: "row", gap: 10 }} onClick={() => setPersonaId(p.id)}>
              {coche(personaId === p.id)}
              <span className="ds-avatar">{initials(...String(p.name).split(" "))}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, paddingRight: 22 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</b>
                <span className="ds-muted" style={{ fontSize: 12 }}>{[p.role, p.company].filter(Boolean).join(" · ")}</span>
                {p.data?.personality && <span style={{ fontSize: 12, color: "var(--ds-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.data.personality}</span>}
              </span>
            </button>
          ))}
          {personas !== null && !nouvelle && (
            <button type="button" style={{ ...carteChoix(false), alignItems: "center", justifyContent: "center", borderStyle: "dashed", minHeight: 76 }} onClick={() => setNouvelle({ name: "", language: langue })}>
              <Plus size={18} style={{ color: "var(--ds-blue)" }} />
              <b style={{ fontSize: 14, fontWeight: 600 }}>{k("personaCreate")}</b>
            </button>
          )}
        </div>
        {personas !== null && !personasLangue.length && !nouvelle && <p className="ds-help">{k("personaEmpty", { langue: t(`dashboard.experienceEditor.voices.lang.${langue}`) })}</p>}
        {nouvelle && (
          <form onSubmit={creerPersonnage} className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <b style={{ fontSize: 14, fontWeight: 600 }}>{k("personaCreate")}</b>
            <PersonaFiche value={nouvelle} onChange={setNouvelle} langues={[langue]} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="ds-btn" onClick={() => setNouvelle(null)}>{t("common.actions.cancel")}</button>
              <button type="submit" className="ds-btn ds-btn-primary" disabled={creationPersona || !String(nouvelle.name || "").trim()}>
                {creationPersona && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("personaSave")}
              </button>
            </div>
          </form>
        )}
      </>
    );
  } else if (cle === "scenario") {
    contenu = (
      <ChatConception
        cadre={{ role, canal, langue, difficulte, personaId: personaId || null }}
        onGenerer={generer}
        generation={generation}
      />
    );
  }

  // Le rappel de ce qui est déjà choisi, à partir du canal.
  const rappel = usage === "onboarding" && etape >= 2 && [
    role,
    canal && t(`dashboard.sims.channels.${canal}.title`),
    etape >= 4 && LOCALE_LABELS[langue],
    etape >= 4 && km(`difficulty.${difficulte}`),
    etape >= 5 && (personasLangue.find((p) => p.id === personaId)?.name),
  ].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader crumbs={[{ label: t("dashboard.sims.title"), href: "/simulations" }]} title={k("title")} />
      <EtapesCreation etapes={frise} courante={etape} onAller={setEtape} label={k("stepsLabel")} />
      <div className="creation-page">
        <div className={`creation-etape ${cle === "scenario" || cle === "persona" ? "creation-etape-large" : ""}`}>
          <div>
            <p className="ds-muted" style={{ margin: "0 0 6px", fontSize: 12, letterSpacing: "0.02em" }}>
              {k("stepOf", { n: etape + 1, total: cles.length })}{rappel ? ` · ${rappel}` : ""}
            </p>
            <h2 className="creation-titre">{k(`${cle}Title`)}</h2>
            <p className="creation-aide">{cle === "persona"
              ? k("personaHint", { langue: t(`dashboard.experienceEditor.voices.lang.${langue}`) })
              : k(`${cle}Hint`)}</p>
          </div>

          {contenu}

          <div className="creation-pied">
            {etape > 0
              ? <button type="button" className="ds-btn ds-btn-ghost" onClick={() => setEtape((n) => n - 1)}><ArrowLeft size={14} /> {k("back")}</button>
              : <span />}
            {cle !== "scenario" && (
              <button type="button" className="ds-btn ds-btn-primary" disabled={!pret} onClick={continuer}>
                {k("next")} <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
