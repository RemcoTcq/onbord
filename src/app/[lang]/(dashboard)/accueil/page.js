"use client";

// L'ACCUEIL de la plateforme (17/11/2026). Avant, c'était le tableau de bord
// du seul recrutement (déplacé dans Recrutement → Vue d'ensemble). Il dit
// maintenant, pour les deux métiers à la fois :
//   • ce qui ATTEND UNE ACTION (lib/accueil.js), chaque ligne menant à l'écran
//     où on la règle ;
//   • un résumé du recrutement et un de l'onboarding, avec le lien vers leur
//     vue d'ensemble — ou de quoi démarrer si l'organisation ne fait pas
//     encore ce métier ;
//   • les simulations touchées en dernier.

import { useEffect, useState } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { vueAccueil } from "@/lib/actions/accueil";
import {
  Plus, ChevronRight, Loader2, UserCheck, BadgeCheck, Award, CalendarClock, TriangleAlert,
  Clock, Send, CircleArrowUp, Briefcase, GraduationCap, CheckCircle2, ArrowRight,
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";
import { StatusBadge } from "@/components/experience/ui";

const SEUIL_CREDITS_BAS = 10;

// Icône et ton de chaque ligne « À faire ». Les alertes (retard, échecs,
// crédits) en orange ; le reste est du travail ordinaire.
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

function Chiffre({ valeur, libelle }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <span className="ds-stat" style={{ fontSize: 24 }}>{valeur}</span>
      <span className="ds-muted" style={{ fontSize: 12 }}>{libelle}</span>
    </span>
  );
}

/** La carte résumé d'un métier : trois chiffres et le lien, ou de quoi démarrer. */
function CarteMetier({ icone: Icone, couleur, titre, chiffres, href, lien, demarre, debut }) {
  return (
    <section className="ds-card ds-card-pad" style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 500 }}>
        <span className="ds-icon-tile" style={{ background: couleur }}><Icone size={13} strokeWidth={2.2} /></span>
        {titre}
      </span>
      {demarre ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
            {chiffres.map((c) => <Chiffre key={c.libelle} {...c} />)}
          </div>
          <Link href={href} className="ds-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, alignSelf: "flex-start" }}>
            {lien} <ArrowRight size={13} />
          </Link>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="ds-sub" style={{ margin: 0 }}>{debut.texte}</p>
          <Link href={debut.href} className="ds-btn ds-btn-primary" style={{ alignSelf: "flex-start" }}>
            <Plus size={14} strokeWidth={2.2} /> {debut.bouton}
          </Link>
        </div>
      )}
    </section>
  );
}

export default function Accueil() {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.home.${cle}`, vars);
  const { user } = useShell();
  const [vue, setVue] = useState(null);
  const [credits, setCredits] = useState(null);

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
  const entete = (
    <PageHeader
      title={t("dashboard.nav.home")}
      actions={
        <Link href="/simulations/creer" className="ds-btn ds-btn-primary">
          <Plus size={15} strokeWidth={2.2} /> {k("createSimulation")}
        </Link>
      }
    />
  );

  if (!vue) {
    return (
      <>
        {entete}
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }
  if (vue.erreur) {
    return (<>{entete}<div className="ds-body"><p className="ds-sub">{k("loadError")}</p></div></>);
  }

  // Les crédits ne servent qu'au recrutement : on ne les montre ici que bas.
  const aFaire = [...vue.aFaire];
  if (credits && !credits.illimite && vue.demarrage.recrute && (credits.credits_balance ?? 0) <= SEUIL_CREDITS_BAS) {
    aFaire.push({ cle: "creditsLow", n: credits.credits_balance ?? 0, href: "/compte/billing" });
  }
  const { recrutement: r, onboarding: o } = vue.resume;
  const nomsDe = (l) => (l.noms?.length ? l.noms.join(", ") + (l.n > l.noms.length ? ` ${k("andOthers", { count: l.n - l.noms.length })}` : "") : null);

  return (
    <>
      {entete}

      <section className="ds-section" aria-labelledby="ds-a-faire">
        <span className="ds-chip ds-chip-lg" style={{ alignSelf: "flex-start", height: 30, padding: "0 11px", borderRadius: 8 }}>
          <span className="ds-dot ds-dot-green" style={{ width: 7, height: 7 }} />
          {k("hello", { name: prenom })}
        </span>

        {/* ── À faire ── */}
        <div className="ds-card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "14px 16px 10px" }}>
            <h2 id="ds-a-faire" className="ds-h2">{k("todo.title")}</h2>
            {aFaire.length > 0 && <span className="ds-muted" style={{ fontSize: 13 }}>{k("todo.count", { count: aFaire.length })}</span>}
          </div>
          {aFaire.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 16px 18px", color: "var(--ds-ink-3)", fontSize: 14 }}>
              <CheckCircle2 size={18} color="var(--ds-green)" /> {k("todo.empty")}
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* ── Les deux métiers ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "4px 20px 0" }}>
        <CarteMetier
          icone={Briefcase} couleur="var(--ds-blue)" titre={t("dashboard.nav.hiring")}
          demarre={vue.demarrage.recrute}
          chiffres={[
            { valeur: r.offres, libelle: k("summary.openJobs", { count: r.offres }) },
            { valeur: r.enCours, libelle: k("summary.inProgress", { count: r.enCours }) },
            { valeur: r.terminesSemaine, libelle: k("summary.completedWeek", { count: r.terminesSemaine }) },
          ]}
          href="/recrutement" lien={k("summary.seeHiring")}
          debut={{ texte: k("summary.startHiringHint"), href: "/jobs/nouveau", bouton: t("dashboard.nav.newJob") }}
        />
        <CarteMetier
          icone={GraduationCap} couleur="#4C74E0" titre={t("dashboard.nav.onboarding")}
          demarre={vue.demarrage.forme}
          chiffres={[
            { valeur: o.personnes, libelle: k("summary.people", { count: o.personnes }) },
            { valeur: o.pretes, libelle: k("summary.ready", { count: o.pretes }) },
            { valeur: o.moyenne != null ? `${o.moyenne} %` : "—", libelle: k("summary.average") },
          ]}
          href="/onboarding" lien={k("summary.seeOnboarding")}
          debut={{ texte: k("summary.startOnboardingHint"), href: "/simulations/creer?usage=onboarding", bouton: k("summary.startOnboarding") }}
        />
      </div>

      {/* ── Simulations récentes ── */}
      <section aria-labelledby="ds-recentes" className="ds-card" style={{ margin: "14px 20px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px" }}>
          <h2 id="ds-recentes" className="ds-h2">{k("recent.title")}</h2>
          <Link href="/simulations" className="ds-link" style={{ fontSize: 13 }}>{k("recent.seeAll")}</Link>
        </div>
        {vue.recentes.length === 0 ? (
          <div className="ds-empty" style={{ padding: "20px 16px 24px" }}>{k("recent.empty")}</div>
        ) : (
          <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none", display: "flex", flexDirection: "column" }}>
            {vue.recentes.map((s) => (
              <li key={`${s.usage}-${s.id}`} style={{ borderTop: "1px solid var(--ds-line-3)" }}>
                <Link href={s.href} className="ds-row-link" style={{ gap: 12 }}>
                  <span className="ds-chip" style={{ flex: "none" }}>{s.usage === "hiring" ? t("dashboard.nav.hiring") : t("dashboard.nav.onboarding")}</span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.titre || t("dashboard.jobs.untitled")}</span>
                  {s.statut && <StatusBadge status={s.statut} />}
                  <span className="ds-muted" style={{ fontSize: 12, width: 80, textAlign: "right", flex: "none" }}>{formatDateShort(s.date, locale)}</span>
                  <ChevronRight size={14} strokeWidth={2} color="var(--ds-ink-6)" style={{ flex: "none" }} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
