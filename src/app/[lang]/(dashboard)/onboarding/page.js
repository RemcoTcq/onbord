"use client";

// Le tableau de bord de l'onboarding (phase 2) : moyennes de l'organisation,
// progression par learner, scores dans le temps, score par compétence, essais
// par module, temps passé, modules validés et assignés. Et le réglage de
// validation automatique (admin).

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { tableauOnboarding, getReglagesOnboarding, reglerAutoValidation } from "@/lib/actions/personnes";

function Barre({ valeur }) {
  const v = Math.max(0, Math.min(100, valeur ?? 0));
  const couleur = v >= 75 ? "var(--ds-green)" : v >= 50 ? "var(--ds-amber)" : "var(--ds-red)";
  return (
    <span style={{ display: "inline-block", width: 120, height: 6, borderRadius: 99, background: "var(--ds-line)", overflow: "hidden", verticalAlign: "middle" }}>
      <span style={{ display: "block", width: `${v}%`, height: "100%", background: couleur }} />
    </span>
  );
}

export default function OnboardingPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.dashboard.${cle}`, vars);
  const [d, setD] = useState(null);
  const [reglages, setReglages] = useState(null);

  const charger = useCallback(async () => {
    const [tab, reg] = await Promise.all([tableauOnboarding(), getReglagesOnboarding()]);
    setD(tab.success ? tab : { erreur: true });
    setReglages(reg.success ? reg : null);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function basculer() {
    const res = await reglerAutoValidation(!reglages.autoValidate);
    if (!res.success) return toast(k("error"), "error");
    setReglages({ ...reglages, autoValidate: !reglages.autoValidate });
  }

  const tuile = (libelle, valeur) => (
    <div className="ds-panel" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="ds-muted" style={{ fontSize: 12 }}>{libelle}</span>
      <b style={{ fontSize: 22, fontWeight: 600 }}>{valeur}</b>
    </div>
  );

  return (
    <>
      <PageHeader title={k("title")} />
      <div className="ds-body" style={{ maxWidth: 1080, display: "flex", flexDirection: "column", gap: 16 }}>
        {!d && <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />}
        {d?.erreur && <p className="ds-sub">{k("error")}</p>}
        {d?.vide && (
          <div className="ds-panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <p className="ds-sub">{k("empty")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/onboarding/modules" className="ds-btn">{k("toModules")}</Link>
              <Link href="/onboarding/personnes" className="ds-btn ds-btn-primary">{k("toPeople")}</Link>
            </div>
          </div>
        )}
        {d?.synthese && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {tuile(k("learners"), d.synthese.learners)}
              {tuile(k("ready"), d.synthese.prets)}
              {tuile(k("average"), d.synthese.moyenne != null ? `${d.synthese.moyenne} %` : "—")}
              {tuile(k("validated"), `${d.synthese.valides} / ${d.synthese.assignes}`)}
              {tuile(k("attempts"), d.synthese.essais)}
              {tuile(k("time"), k("minutes", { count: d.synthese.minutes }))}
            </div>

            <section className="ds-panel">
              <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("byLearner")}</h2>
              <div className="ds-inset" style={{ padding: 0 }}>
                {d.learners.map((l, i) => (
                  <Link key={l.userId} href={`/onboarding/personnes/${l.userId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", textDecoration: "none", color: "inherit", fontSize: 13 }}>
                    <b style={{ flex: 1, fontWeight: 600 }}>{l.nom}</b>
                    <span className="ds-chip">{t(`dashboard.onb.people.lifecycle.${l.lifecycle}`)}</span>
                    <span style={{ width: 110 }}>{k("validatedOf", { valides: l.valides, assignes: l.assignes })}</span>
                    <span style={{ width: 160 }}><Barre valeur={l.moyenne} /> {l.moyenne != null ? `${l.moyenne} %` : "—"}</span>
                    <span className="ds-muted" style={{ width: 120, textAlign: "right" }}>{k("attemptsShort", { count: l.essais })} · {k("minutes", { count: l.minutes })}</span>
                  </Link>
                ))}
              </div>
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              <section className="ds-panel">
                <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("overTime")}</h2>
                <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  {!d.dansLeTemps.length && <p className="ds-sub">{k("noScores")}</p>}
                  {d.dansLeTemps.map((s) => (
                    <div key={s.semaineDu} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 110 }}>{k("weekOf", { date: formatDateShort(s.semaineDu, locale) })}</span>
                      <Barre valeur={s.moyenne} /> <span>{s.moyenne} %</span>
                      <span className="ds-muted">({k("attemptsShort", { count: s.essais })})</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="ds-panel">
                <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("bySkill")}</h2>
                <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                  {!d.competences.length && <p className="ds-sub">{k("noScores")}</p>}
                  {d.competences.map((c) => (
                    <div key={c.nom} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{c.nom}</span>
                      <Barre valeur={c.moyenne} /> <span style={{ width: 44, textAlign: "right" }}>{c.moyenne} %</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="ds-panel">
              <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("byModule")}</h2>
              <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                {!d.modules.length && <p className="ds-sub">{k("noScores")}</p>}
                {d.modules.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1 }}>{m.titre}</span>
                    <span className="ds-muted">{k("attemptsShort", { count: m.essais })}</span>
                    <Barre valeur={m.moyenne} /> <span style={{ width: 44, textAlign: "right" }}>{m.moyenne != null ? `${m.moyenne} %` : "—"}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {reglages && (
          <section className="ds-panel" style={{ display: "flex", alignItems: "center", gap: 12, padding: 14 }}>
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <b style={{ fontWeight: 600 }}>{k("autoValidate")}</b>
              <span className="ds-sub">{k("autoValidateHint")}</span>
            </span>
            <button type="button" className={`ds-btn ${reglages.autoValidate ? "ds-btn-primary" : ""}`} onClick={basculer} disabled={!reglages.peutModifier}>
              {reglages.autoValidate ? k("on") : k("off")}
            </button>
          </section>
        )}
      </div>
    </>
  );
}
