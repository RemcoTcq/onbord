"use client";

// L'ACCUEIL de la plateforme (17/11/2026, revu avec Remco). Pas un tableau de
// bord — les chiffres vivent dans les deux vues d'ensemble (Recrutement,
// Onboarding) — mais une page pour AGIR vite :
//   • un grand « Bon retour, <prénom> » ;
//   • les actions rapides : créer une simulation, une offre, un personnage,
//     inviter une recrue, ouvrir les résultats de chaque métier ;
//   • « À faire », seulement quand quelque chose attend (lib/accueil.js) ;
//   • les simulations ACTIVES, filtrables par usage, avec de quoi les suivre.

import { useEffect, useState } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { vueAccueil } from "@/lib/actions/accueil";
import {
  ChevronRight, Loader2, UserCheck, BadgeCheck, Award, CalendarClock, TriangleAlert, Clock, Send,
  CircleArrowUp, Sparkles, Briefcase, Contact, UserPlus, ChartColumn, GraduationCap, Layers,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";
import { StatusBadge } from "@/components/experience/ui";

const SEUIL_CREDITS_BAS = 10;
const NB_ACTIVES = 8;

// Icône et ton de chaque ligne « À faire » : les alertes en orange.
const LIGNES = {
  candidatesToReview: { icone: UserCheck, alerte: false },
  attemptsToValidate: { icone: BadgeCheck, alerte: false },
  readyToDeclare: { icone: Award, alerte: false },
  overdue: { icone: CalendarClock, alerte: true },
  struggling: { icone: TriangleAlert, alerte: true },
  inactive: { icone: Clock, alerte: true },
  toPublish: { icone: Send, alerte: false },
  creditsLow: { icone: CircleArrowUp, alerte: true },
};

// Les actions rapides, dans l'ordre où on s'en sert. Toutes à égalité :
// même carte, même icône, même hauteur (demande de Remco).
const ACTIONS = [
  { cle: "createSimulation", href: "/simulations/creer", icone: Sparkles },
  { cle: "createJob", href: "/jobs/nouveau", icone: Briefcase },
  { cle: "createPersona", href: "/bibliotheque/personnages", icone: Contact },
  { cle: "inviteHire", href: "/onboarding/personnes", icone: UserPlus },
  { cle: "hiringReports", href: "/recrutement", icone: ChartColumn },
  { cle: "onboardingReports", href: "/onboarding", icone: GraduationCap },
];

export default function Accueil() {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.home.${cle}`, vars);
  const { user } = useShell();
  const [vue, setVue] = useState(null);
  const [credits, setCredits] = useState(null);
  const [filtre, setFiltre] = useState("all");

  useEffect(() => {
    let annule = false;
    Promise.all([vueAccueil(), getUserCreditInfo()]).then(([v, c]) => {
      if (annule) return;
      setVue(v.success ? v : { erreur: true });
      setCredits(c || null);
    });
    return () => { annule = true; };
  }, []);

  const prenom = user?.first_name || user?.email?.split("@")[0] || "";

  // Les crédits ne servent qu'au recrutement : on ne les signale que bas.
  const aFaire = vue?.aFaire ? [...vue.aFaire] : [];
  if (vue?.recrute && credits && !credits.illimite && (credits.credits_balance ?? 0) <= SEUIL_CREDITS_BAS) {
    aFaire.push({ cle: "creditsLow", n: credits.credits_balance ?? 0, href: "/compte/billing" });
  }
  const nomsDe = (l) => (l.noms?.length ? l.noms.join(", ") + (l.n > l.noms.length ? ` ${k("andOthers", { count: l.n - l.noms.length })}` : "") : null);

  const actives = vue?.actives || [];
  const compte = { all: actives.length, hiring: actives.filter((s) => s.usage === "hiring").length, onboarding: actives.filter((s) => s.usage === "onboarding").length };
  const visibles = actives.filter((s) => filtre === "all" || s.usage === filtre).slice(0, NB_ACTIVES);
  const suivi = (s) => (s.usage === "hiring"
    ? [k("active.candidates", { count: s.suivi.candidats }), k("active.completed", { count: s.suivi.termines }), s.suivi.aDecider ? k("active.toDecide", { count: s.suivi.aDecider }) : null]
    : [k("active.assigned", { count: s.suivi.assignes }), k("active.validated", { count: s.suivi.valides })]
  ).filter(Boolean).join(" · ");

  return (
    <>
    <PageHeader title={t("dashboard.nav.home")} />
    <div className="ds-body" style={{ maxWidth: 1120, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 28, padding: "28px 24px 40px" }}>

      {/* ── Bienvenue ── */}
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--ds-ink)" }}>
          {prenom ? k("welcome", { name: prenom }) : k("welcomeNoName")}
        </h1>
        <p className="ds-sub" style={{ margin: 0, fontSize: 15 }}>{k("welcomeHint")}</p>
      </header>

      {/* ── Actions rapides ── */}
      <section aria-labelledby="ds-actions" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 id="ds-actions" className="sr-only">{k("quick.title")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gridAutoRows: "1fr", gap: 12 }}>
          {ACTIONS.map(({ cle, href, icone: Icone }) => (
            <Link key={cle} href={href} className="ds-card ds-card-pad accueil-action" style={{ display: "flex", alignItems: "flex-start", gap: 12, textDecoration: "none", color: "inherit" }}>
              <span className="ds-icon-tile" style={{ background: "var(--ds-blue)", width: 34, height: 34, flex: "none" }}><Icone size={16} strokeWidth={2.2} /></span>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <b style={{ fontWeight: 600, fontSize: 14 }}>{k(`quick.${cle}`)}</b>
                <span className="ds-muted" style={{ fontSize: 12.5, lineHeight: 1.45 }}>{k(`quick.${cle}Hint`)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {!vue && <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} /></div>}
      {vue?.erreur && <p className="ds-sub">{k("loadError")}</p>}

      {/* ── À faire : seulement si quelque chose attend ── */}
      {vue && !vue.erreur && aFaire.length > 0 && (
        <section aria-labelledby="ds-a-faire" className="ds-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "14px 16px 10px" }}>
            <h2 id="ds-a-faire" className="ds-h2">{k("todo.title")}</h2>
            <span className="ds-muted" style={{ fontSize: 13 }}>{k("todo.count", { count: aFaire.length })}</span>
          </div>
          <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none", display: "flex", flexDirection: "column" }}>
            {aFaire.map((l) => {
              const { icone: Icone, alerte } = LIGNES[l.cle] || LIGNES.toPublish;
              const noms = nomsDe(l);
              return (
                <li key={l.cle} style={{ borderTop: "1px solid var(--ds-line-3)" }}>
                  <Link href={l.href} className="ds-row-link" style={{ gap: 12 }}>
                    <span className="ds-icon-tile" style={{ background: alerte ? "var(--ds-amber)" : "var(--ds-blue)", width: 28, height: 28, flex: "none" }}>
                      <Icone size={14} strokeWidth={2.2} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500 }}>{k(`todo.${l.cle}`, { count: l.n })}</span>
                      {noms && <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{noms}</span>}
                    </span>
                    <ChevronRight size={14} strokeWidth={2} color="var(--ds-ink-6)" style={{ flex: "none" }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Simulations actives ── */}
      {vue && !vue.erreur && (
        <section aria-labelledby="ds-actives" className="ds-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px 10px" }}>
            <h2 id="ds-actives" className="ds-h2">{k("active.title")}</h2>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div role="radiogroup" aria-label={k("active.filter")} className="ds-seg" style={{ height: 30 }}>
                {[["all", k("active.all")], ["hiring", t("dashboard.nav.hiring")], ["onboarding", t("dashboard.nav.onboarding")]].map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={filtre === v} className="ds-seg-item" style={{ height: 24, fontSize: 12 }} onClick={() => setFiltre(v)}>
                    {l} <span className="ds-muted" style={{ marginLeft: 4 }}>{compte[v]}</span>
                  </button>
                ))}
              </div>
              <Link href={filtre === "all" ? "/simulations" : `/simulations?usage=${filtre}`} className="ds-link" style={{ fontSize: 13 }}>{k("active.seeAll")}</Link>
            </span>
          </div>
          {visibles.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 16px 26px" }}>
              <Layers size={20} color="var(--ds-ink-5)" />
              <span className="ds-muted" style={{ fontSize: 14 }}>{k("active.empty")}</span>
              <Link href="/simulations/creer" className="ds-btn ds-btn-primary">{k("quick.createSimulation")}</Link>
            </div>
          ) : (
            <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none", display: "flex", flexDirection: "column" }}>
              {visibles.map((s) => (
                <li key={`${s.usage}-${s.id}`} style={{ borderTop: "1px solid var(--ds-line-3)" }}>
                  <Link href={s.href} className="ds-row-link" style={{ gap: 12 }}>
                    <span className="ds-icon-tile" style={{ background: s.usage === "hiring" ? "#4C74E0" : "var(--ds-blue)", width: 28, height: 28, flex: "none" }}>
                      {s.usage === "hiring" ? <Briefcase size={14} strokeWidth={2.2} /> : <GraduationCap size={14} strokeWidth={2.2} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.titre || t("dashboard.jobs.untitled")}</span>
                      <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.usage === "hiring" ? t("dashboard.nav.hiring") : `${t("dashboard.nav.onboarding")}${s.canal ? ` · ${t(`dashboard.sims.channels.${s.canal}.title`)}` : ""}`} · {suivi(s)}
                      </span>
                    </span>
                    <StatusBadge status={s.statut} />
                    <span className="ds-muted" style={{ fontSize: 12, width: 72, textAlign: "right", flex: "none" }}>{formatDateShort(s.date, locale)}</span>
                    <ChevronRight size={14} strokeWidth={2} color="var(--ds-ink-6)" style={{ flex: "none" }} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
    </>
  );
}
