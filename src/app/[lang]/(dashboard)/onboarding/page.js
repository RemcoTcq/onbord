"use client";

// Onboarding → Vue d'ensemble (refaite le 17/11/2026). Elle répond d'abord à
// la question du manager : QUI EST PRÊT POUR DE VRAIS CLIENTS, ET QUI BLOQUE ?
//   • le chemin vers les vrais clients, en trois colonnes (en onboarding,
//     presque prêtes, prêtes) — lib/accueil.js, etapeVersClients ;
//   • ce qui bloque, personne par personne, avec la simulation en cause ;
//   • les compétences les plus faibles de l'équipe, et les simulations qui
//     les travaillent ;
//   • c'est tout. Allégée le 20/11/2026 (Remco, « trop chargé ») : quatre
//     chiffres au lieu de six, plus de scores dans le temps ni de résultats par
//     simulation (la liste des simulations donne leur note moyenne), et la
//     validation automatique est partie dans Paramètres → Onboarding.

import { useState, useEffect } from "react";
import { Loader2, Plus, ChevronRight, CalendarClock, TriangleAlert, Clock, Award, BadgeCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { initials } from "@/components/ui/ds";
import { tableauOnboarding } from "@/lib/actions/personnes";

const COLONNES = ["onboarding", "almost", "ready"];
const NB_COMPETENCES = 3;
const ICONES_BLOCAGE = { overdue: CalendarClock, struggling: TriangleAlert, inactive: Clock };

function Barre({ valeur, largeur = 120 }) {
  const v = Math.max(0, Math.min(100, valeur ?? 0));
  const couleur = v >= 75 ? "var(--ds-green)" : v >= 50 ? "var(--ds-amber)" : "var(--ds-red)";
  return (
    <span style={{ display: "inline-block", width: largeur, height: 6, borderRadius: 99, background: "var(--ds-line)", overflow: "hidden", verticalAlign: "middle", flex: "none" }}>
      <span style={{ display: "block", width: `${v}%`, height: "100%", background: couleur }} />
    </span>
  );
}

/** Une personne dans sa colonne : progression, score moyen, ce qui l'attend. */
function CartePersonne({ l, k }) {
  const pct = l.assignes ? Math.round((l.valides / l.assignes) * 100) : 0;
  const aDeclarer = l.etape === "almost" && l.assignes > 0 && l.valides === l.assignes;
  return (
    <Link href={`/onboarding/personnes/${l.userId}`} className="ds-panel" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12, textDecoration: "none", color: "inherit" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span className="ds-avatar">{initials(...String(l.nom || "?").split(" "))}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <b style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.nom}</b>
          <span className="ds-muted" style={{ fontSize: 12 }}>
            {l.moyenne != null ? k("averageShort", { score: l.moyenne }) : k("noAttemptYet")}
          </span>
        </span>
        <ChevronRight size={14} color="var(--ds-ink-6)" />
      </span>
      {l.assignes > 0 ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--ds-ink-3)" }}>
          <span className="ds-meter ds-meter-thin" style={{ flex: 1 }}><span style={{ width: `${pct}%` }} /></span>
          {k("validatedOf", { valides: l.valides, assignes: l.assignes })}
        </span>
      ) : (
        <span className="ds-muted" style={{ fontSize: 12 }}>{k("nothingAssigned")}</span>
      )}
      {(aDeclarer || l.aValider > 0) && (
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {aDeclarer && <span className="ds-chip ds-chip-green" style={{ gap: 5 }}><Award size={12} /> {k("toDeclare")}</span>}
          {l.aValider > 0 && <span className="ds-chip ds-chip-blue" style={{ gap: 5 }}><BadgeCheck size={12} /> {k("toValidate", { count: l.aValider })}</span>}
        </span>
      )}
    </Link>
  );
}

export default function OnboardingPage() {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.onb.dashboard.${cle}`, vars);
  const [d, setD] = useState(null);

  useEffect(() => {
    let annule = false;
    tableauOnboarding().then((tab) => { if (!annule) setD(tab.success ? tab : { erreur: true }); });
    return () => { annule = true; };
  }, []);

  const tuile = (libelle, valeur) => (
    <div className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="ds-muted" style={{ fontSize: 12 }}>{libelle}</span>
      <span className="ds-stat" style={{ fontSize: 24 }}>{valeur}</span>
    </div>
  );

  const raison = (b) => {
    if (b.raison === "overdue") return k("blocked.overdue", { module: b.module, date: formatDateShort(b.date, locale) });
    if (b.raison === "struggling") return k("blocked.struggling", { module: b.module, count: b.essais });
    return k("blocked.inactive", { count: b.jours });
  };

  return (
    <>
      <PageHeader title={k("title")} actions={
        <Link href="/simulations/creer?usage=onboarding" className="ds-btn ds-btn-primary"><Plus size={15} strokeWidth={2.2} /> {k("createSimulation")}</Link>
      } />
      <div className="ds-body" style={{ maxWidth: 1180, display: "flex", flexDirection: "column", gap: 16 }}>
        {!d && <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>}
        {d?.erreur && <p className="ds-sub">{k("error")}</p>}
        {d?.vide && (
          <div className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="ds-sub" style={{ margin: 0 }}>{k("empty")}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/simulations/creer?usage=onboarding" className="ds-btn">{k("toModules")}</Link>
              <Link href="/onboarding/personnes" className="ds-btn ds-btn-primary">{k("toPeople")}</Link>
            </div>
          </div>
        )}

        {d?.synthese && (
          <>
            {/* ── Chiffres clés ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {tuile(k("learners"), d.synthese.learners)}
              {tuile(k("ready"), d.synthese.prets)}
              {tuile(k("average"), d.synthese.moyenne != null ? `${d.synthese.moyenne} %` : "—")}
              {tuile(k("validated"), `${d.synthese.valides} / ${d.synthese.assignes}`)}
            </div>

            {/* ── Vers de vrais clients ── */}
            <section aria-labelledby="ds-chemin" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <h2 id="ds-chemin" className="ds-h2">{k("path.title")}</h2>
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, alignItems: "start" }}>
                {COLONNES.map((col) => {
                  const gens = d.learners.filter((l) => l.etape === col);
                  return (
                    <div key={col} className="ds-card" style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, background: "var(--ds-page)" }}>
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 4px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13 }}>
                          <span className={`ds-dot ${col === "ready" ? "ds-dot-green" : col === "almost" ? "ds-dot-amber" : "ds-dot-blue"}`} />
                          {k(`path.${col}`)}
                        </span>
                        <span className="ds-chip">{gens.length}</span>
                      </span>
                      {gens.length === 0
                        ? <span className="ds-muted" style={{ fontSize: 12, padding: "10px 4px", textAlign: "center" }}>—</span>
                        : gens.map((l) => <CartePersonne key={l.userId} l={l} k={k} />)}
                    </div>
                  );
                })}
              </div>
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16, alignItems: "start" }}>
              {/* ── Qui bloque ── */}
              <section className="ds-card" aria-labelledby="ds-bloque" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <h2 id="ds-bloque" className="ds-h2">{k("blocked.title")}</h2>
                </div>
                {d.blocages.length === 0 ? (
                  <div className="ds-empty" style={{ padding: "16px 16px 22px" }}>{k("blocked.none")}</div>
                ) : (
                  <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none" }}>
                    {d.blocages.map((b, i) => {
                      const Icone = ICONES_BLOCAGE[b.raison];
                      return (
                        <li key={`${b.learnerId}-${b.raison}-${b.moduleId || i}`} style={{ borderTop: "1px solid var(--ds-line-3)" }}>
                          <Link href={`/onboarding/personnes/${b.learnerId}`} className="ds-row-link" style={{ gap: 12 }}>
                            <span className="ds-icon-tile" style={{ background: "var(--ds-amber)", width: 28, height: 28, flex: "none" }}><Icone size={14} strokeWidth={2.2} /></span>
                            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 500 }}>{b.nom}</span>
                              <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{raison(b)}</span>
                            </span>
                            <ChevronRight size={14} color="var(--ds-ink-6)" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* ── Compétences à travailler ── */}
              <section className="ds-card" aria-labelledby="ds-competences" style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
                  <h2 id="ds-competences" className="ds-h2">{k("skills.title")}</h2>
                </div>
                {d.competences.length === 0 ? (
                  <div className="ds-empty" style={{ padding: "16px 16px 22px" }}>{k("noScores")}</div>
                ) : (
                  <ul style={{ margin: 0, padding: "0 16px 14px", listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                    {d.competences.slice(0, NB_COMPETENCES).map((c) => (
                      <li key={c.nom} style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: "1px solid var(--ds-line-3)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                          <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis" }}>{c.nom}</span>
                          <Barre valeur={c.moyenne} largeur={90} />
                          <span className="ds-mono" style={{ width: 40, textAlign: "right" }}>{c.moyenne} %</span>
                        </span>
                        {c.simulations.length > 0 ? (
                          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12 }}>
                            <span className="ds-muted">{k("skills.workedBy")}</span>
                            {c.simulations.slice(0, 2).map((s) => (
                              <Link key={s.id} href={`/onboarding/modules/${s.id}`} className="ds-chip" style={{ maxWidth: 260 }} title={s.titre}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.titre}</span></Link>
                            ))}
                          </span>
                        ) : (
                          <Link href="/simulations/creer?usage=onboarding" className="ds-link" style={{ fontSize: 12 }}>{k("skills.create")}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

          </>
        )}

      </div>
    </>
  );
}
