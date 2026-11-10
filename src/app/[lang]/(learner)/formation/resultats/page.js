"use client";

// Les résultats du learner (phase 3) : chaque compétence, son dernier score
// et son évolution depuis le premier essai ; puis tous les essais, chacun
// ouvrant son retour.

import { useEffect, useState } from "react";
import { Loader2, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { formatDateShort } from "@/lib/i18n/format";
import { mesResultats } from "@/lib/actions/formation";

/** Une courbe minuscule : les scores d'une compétence, essai après essai. */
function Courbe({ points }) {
  if (points.length < 2) return <span style={{ width: 90 }} />;
  const l = 90, h = 24;
  const xy = points.map((p, i) => `${(i / (points.length - 1)) * l},${h - (p.score / 100) * h}`).join(" ");
  return (
    <svg width={l} height={h} viewBox={`0 -2 ${l} ${h + 4}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <polyline points={xy} fill="none" stroke="var(--ds-blue)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function ResultatsPage() {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.learner.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);

  useEffect(() => {
    let annule = false;
    mesResultats().then((res) => { if (!annule) setDonnees(res.success ? res : { erreur: true }); });
    return () => { annule = true; };
  }, []);

  if (!donnees) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>;
  if (donnees.erreur) return <p className="ds-sub">{k("errors.generic")}</p>;

  const { essais, competences } = donnees;
  return (
    <>
      <section className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10 }}>
          <h1 className="ds-h1">{k("results")}</h1>
          <p className="ds-sub">{k("history.subtitle")}</p>
        </div>
        {!essais.length && <div className="ds-inset"><p className="ds-sub">{k("history.empty")}</p></div>}
      </section>

      {competences.length > 0 && (
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("history.skills")}</h2>
            <p className="ds-sub">{k("history.skillsHint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
            {competences.map((c, i) => {
              const delta = c.dernier - c.premier;
              return (
                <div key={c.nom} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: 180, display: "flex", flexDirection: "column", gap: 2 }}>
                    <b style={{ fontSize: 14, fontWeight: 600 }}>{c.nom}</b>
                    {c.points.length > 1 && delta !== 0 && (
                      <span style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, color: delta > 0 ? "var(--ds-green-ink)" : "var(--ds-red)" }}>
                        {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {k("history.since", { delta: `${delta > 0 ? "+" : ""}${delta}` })}
                      </span>
                    )}
                  </span>
                  <Courbe points={c.points} />
                  <span className="ds-meter ds-meter-thin" style={{ width: 80 }}><span style={{ width: `${c.dernier}%` }} /></span>
                  <span className="ds-mono" style={{ fontSize: 13, width: 44, textAlign: "right" }}>{c.dernier} %</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {essais.length > 0 && (
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("history.attempts")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
            {essais.map((e, i) => (
              <Link key={e.id} href={`/formation/essais/${e.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", textDecoration: "none", color: "inherit" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{k("history.attemptLine", { module: e.module || "—", n: e.numero || "?" })}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{formatDateShort(e.date, locale)} · {k("passMark", { min: e.minScore })}</span>
                </span>
                {e.note != null
                  ? <span className={`ds-chip ${e.note >= e.minScore ? "ds-chip-green" : ""}`}>{e.note} %</span>
                  : <span className="ds-chip">{e.statut === "in_progress" ? k("history.inProgress") : k("history.pending")}</span>}
                <ChevronRight size={16} style={{ color: "var(--ds-ink-4)" }} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
