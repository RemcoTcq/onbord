"use client";

// « Créer une simulation » (16/11/2026) : l'entrée unique, recrutement ou
// onboarding.
//
//   • RECRUTEMENT — comme avant : on part d'une offre (/jobs/nouveau), Onbord en
//     tire les compétences, puis construit la simulation avec son agent.
//   • ONBOARDING — une simulation = UNE conversation. Des choix, dans l'ordre :
//       1. le rôle de la personne qui s'entraîne (un rôle déjà utilisé, ou un
//          nouveau) ;
//       2. le canal : chat, e-mail, appel vidéo ou appel téléphonique ;
//       3. la langue, la difficulté, le seuil de réussite ;
//       4. le personnage : choisi dans la bibliothèque (ceux qui parlent la
//          langue de la simulation), ou créé sur place ;
//       5. le scénario, avec l'agent de conception : il fait raconter comment
//          la conversation se passe dans l'entreprise, les objections, ce qu'il
//          faut savoir, puis propose la grille. « Générer » crée la simulation,
//          qu'on relit, teste et envoie sur sa page.

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Briefcase, GraduationCap, ArrowRight, ArrowLeft, MessageSquare, Mail, Video, Phone, Plus, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { EXPERIENCE_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { initials } from "@/components/ui/ds";
import { creerModule, listerRoles } from "@/lib/actions/modules";
import { listerPersonas, enregistrerPersona } from "@/lib/actions/personas";
import PersonaFiche from "@/components/personas/PersonaFiche";
import ChatConception from "@/components/simulations/ChatConception";
import Select from "@/components/ui/Select";

const DIFFICULTES = ["easy", "medium", "hard"];
const CANAUX = [
  { id: "call", Icone: Video },
  { id: "phone", Icone: Phone },
  { id: "chat", Icone: MessageSquare },
  { id: "email", Icone: Mail },
];
const NOUVEAU = "__nouveau__";

export default function CreerSimulationPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const router = useRouter();
  const k = (cle, vars) => t(`dashboard.sims.new.${cle}`, vars);
  const km = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const [usage, setUsage] = useState(useSearchParams().get("usage") === "onboarding" ? "onboarding" : null);
  const [roles, setRoles] = useState(null);
  const [choixRole, setChoixRole] = useState("");
  const [nouveauRole, setNouveauRole] = useState("");
  const [canal, setCanal] = useState(null);
  const [langue, setLangue] = useState(EXPERIENCE_LOCALES.includes(locale) ? locale : "en");
  const [difficulte, setDifficulte] = useState("medium");
  const [seuil, setSeuil] = useState(70);
  const [reglagesOk, setReglagesOk] = useState(false);
  const [personas, setPersonas] = useState(null);
  const [personaId, setPersonaId] = useState("");
  const [nouvelle, setNouvelle] = useState(null);
  const [creationPersona, setCreationPersona] = useState(false);
  const [personaOk, setPersonaOk] = useState(false);
  const [generation, setGeneration] = useState(false);

  useEffect(() => {
    if (usage !== "onboarding") return undefined;
    let actif = true;
    listerRoles().then((r) => { if (actif) setRoles(r.roles || []); });
    listerPersonas().then((r) => { if (actif) setPersonas(r.success ? r.personas : []); });
    return () => { actif = false; };
  }, [usage]);

  const role = choixRole === NOUVEAU || !roles?.length ? nouveauRole.trim() : choixRole;
  const personasLangue = (personas || []).filter((p) => String(p.data?.language || "").slice(0, 2) === langue);
  const persona = personasLangue.find((p) => p.id === personaId) || null;

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

  const crumbs = [{ label: t("dashboard.sims.title"), href: "/simulations" }];

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
  const numero = (n, fait) => (
    <span className="ds-mono" style={{ width: 24, height: 24, borderRadius: 7, background: fait ? "var(--ds-green)" : "var(--ds-blue)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
      {fait ? <Check size={13} /> : n}
    </span>
  );
  const tete = (n, titre, aide, fait = false, modifier = null) => (
    <div style={{ display: "flex", gap: 10, padding: "10px 10px 0", alignItems: "flex-start" }}>
      {numero(n, fait)}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <h2 className="ds-h2">{titre}</h2>
        {aide && <p className="ds-sub">{aide}</p>}
      </div>
      {fait && modifier && <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={modifier}>{k("change")}</button>}
    </div>
  );
  const carteChoix = (actif) => ({
    display: "flex", flexDirection: "column", gap: 6, padding: 14, borderRadius: 12, cursor: "pointer", textAlign: "left", font: "inherit",
    background: actif ? "var(--ds-hover-row)" : "#fff", border: `1px solid ${actif ? "var(--ds-blue)" : "var(--ds-line)"}`, color: "inherit",
  });

  const roleOk = Boolean(role);
  const etape2 = roleOk;
  const etape3 = etape2 && Boolean(canal);
  const etape4 = etape3 && reglagesOk;
  const etape5 = etape4 && personaOk;

  return (
    <>
      <PageHeader crumbs={crumbs} title={k("titleOnboarding")} actions={
        <button type="button" className="ds-btn" onClick={() => setUsage(null)}><ArrowLeft size={14} /> {k("changeUsage")}</button>
      } />
      <div className="ds-body" style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── 1. Le rôle ─────────────────────────────────────────────────── */}
        <section className="ds-panel">
          {tete(1, k("roleTitle"), k("roleHint"), roleOk && Boolean(canal))}
          <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            {roles === null && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
            {roles?.length > 0 && (
              <label className="ds-field" style={{ flex: "1 1 240px" }}>
                <span className="ds-label">{km("fields.role")}</span>
                <Select className="ds-select" value={choixRole} onChange={(e) => setChoixRole(e.target.value)}>
                  <option value="">{k("roleChoose")}</option>
                  {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  <option value={NOUVEAU}>{k("roleNew")}</option>
                </Select>
              </label>
            )}
            {roles !== null && (!roles.length || choixRole === NOUVEAU) && (
              <label className="ds-field" style={{ flex: "1 1 240px" }}>
                <span className="ds-label">{roles.length ? k("roleNewLabel") : km("fields.role")}</span>
                <input className="ds-input" value={nouveauRole} onChange={(e) => setNouveauRole(e.target.value)} placeholder={km("fields.rolePlaceholder")} />
              </label>
            )}
          </div>
        </section>

        {/* ── 2. Le canal ─────────────────────────────────────────────────── */}
        {etape2 && (
          <section className="ds-panel">
            {tete(2, k("channelTitle"), k("channelHint"), etape3 && reglagesOk)}
            <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
              {CANAUX.map(({ id, Icone }) => (
                <button key={id} type="button" style={carteChoix(canal === id)} onClick={() => setCanal(id)} aria-pressed={canal === id}>
                  <Icone size={18} strokeWidth={1.8} style={{ color: "var(--ds-blue)" }} />
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{t(`dashboard.sims.channels.${id}.title`)}</b>
                  <span className="ds-muted" style={{ fontSize: 12, lineHeight: 1.45 }}>{t(`dashboard.sims.channels.${id}.hint`)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Langue, difficulté, seuil ───────────────────────────────── */}
        {etape3 && (
          <section className="ds-panel">
            {tete(3, k("settingsTitle"), k("settingsHint"), reglagesOk, () => setReglagesOk(false))}
            <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <label className="ds-field">
                <span className="ds-label">{km("fields.language")}</span>
                <Select className="ds-select" value={langue} disabled={reglagesOk} onChange={(e) => { setLangue(e.target.value); setPersonaId(""); }}>
                  {EXPERIENCE_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
                </Select>
              </label>
              <label className="ds-field">
                <span className="ds-label">{km("fields.difficulty")}</span>
                <Select className="ds-select" value={difficulte} disabled={reglagesOk} onChange={(e) => setDifficulte(e.target.value)}>
                  {DIFFICULTES.map((d) => <option key={d} value={d}>{km(`difficulty.${d}`)}</option>)}
                </Select>
              </label>
              <label className="ds-field">
                <span className="ds-label">{km("fields.minScore")}</span>
                <input className="ds-input" type="number" min={0} max={100} value={seuil} disabled={reglagesOk} onChange={(e) => setSeuil(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
              </label>
            </div>
            {!reglagesOk && (
              <div className="ds-panel-foot">
                <button type="button" className="ds-btn ds-btn-primary" onClick={() => setReglagesOk(true)}>{k("next")} <ArrowRight size={14} /></button>
              </div>
            )}
          </section>
        )}

        {/* ── 4. Le personnage ───────────────────────────────────────────── */}
        {etape4 && (
          <section className="ds-panel">
            {tete(4, k("personaTitle"), k("personaHint", { langue: LOCALE_LABELS[langue] }), personaOk, () => setPersonaOk(false))}
            {personaOk ? (
              <div className="ds-inset" style={{ fontSize: 13 }}>
                {persona ? <b style={{ fontWeight: 600 }}>{persona.name}</b> : k("personaAuto")}
                {persona && <span className="ds-muted"> · {[persona.role, persona.company].filter(Boolean).join(" · ")}</span>}
              </div>
            ) : (
              <>
                <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
                  {personas === null && <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />}
                  {personasLangue.map((p) => (
                    <button key={p.id} type="button" style={{ ...carteChoix(personaId === p.id), flexDirection: "row", gap: 10 }} onClick={() => setPersonaId(p.id)} aria-pressed={personaId === p.id}>
                      <span className="ds-avatar">{initials(...String(p.name).split(" "))}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                        <b style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</b>
                        <span className="ds-muted" style={{ fontSize: 12 }}>{[p.role, p.company].filter(Boolean).join(" · ")}</span>
                        {p.data?.personality && <span style={{ fontSize: 12, color: "var(--ds-ink-3)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{p.data.personality}</span>}
                      </span>
                    </button>
                  ))}
                  {personas !== null && !nouvelle && (
                    <button type="button" style={{ ...carteChoix(false), alignItems: "center", justifyContent: "center", borderStyle: "dashed" }} onClick={() => setNouvelle({ name: "", language: langue })}>
                      <Plus size={18} style={{ color: "var(--ds-blue)" }} />
                      <b style={{ fontSize: 14, fontWeight: 600 }}>{k("personaCreate")}</b>
                    </button>
                  )}
                </div>
                {personas !== null && !personasLangue.length && !nouvelle && <p className="ds-help" style={{ padding: "0 14px" }}>{k("personaEmpty", { langue: LOCALE_LABELS[langue] })}</p>}
                {nouvelle && (
                  <form onSubmit={creerPersonnage} className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
                <div className="ds-panel-foot">
                  <button type="button" className="ds-btn ds-btn-primary" disabled={!personaId || Boolean(nouvelle)} onClick={() => setPersonaOk(true)}>{k("next")} <ArrowRight size={14} /></button>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── 5. Le scénario, avec l'agent ───────────────────────────────── */}
        {etape5 && (
          <section className="ds-panel">
            {tete(5, k("agentTitle"), k("agentHint"))}
            <div className="ds-inset">
              <ChatConception
                cadre={{ role, canal, langue, difficulte, personaId: personaId || null }}
                onGenerer={generer}
                generation={generation}
              />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
