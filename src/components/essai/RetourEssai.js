"use client";

// Le retour d'un passage noté : le score (face au seuil, s'il y en a un), la
// synthèse, puis chaque compétence avec ses points attendus (0/1/2) et les
// phrases qui les prouvent. Partagé par l'essai d'un learner (son espace) et
// le test d'un manager (tableau de bord).

import { useI18n } from "@/lib/i18n/I18nProvider";

const COULEUR_POINT = ["var(--ds-red)", "var(--ds-amber-ink)", "var(--ds-green-ink)"];

/**
 * @param {{ note: number, resume: string, competences: Array }} essai
 * @param {number|null} minScore le seuil, ou null s'il n'y en a pas (simulation de recrutement)
 * @param {string} indice la phrase sous le score
 * @param {React.ReactNode} action le bouton à côté de l'indice
 */
export default function RetourEssai({ essai, minScore = null, indice = "", action = null }) {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.learner.attempt.${cle}`, vars);
  const reussi = minScore != null && essai.note >= minScore;
  return (
    <>
      <section className="ds-panel">
        <div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="ds-label">{k("score")}</span>
            <span className="ds-stat">{essai.note} %</span>
          </div>
          <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="ds-meter" style={{ position: "relative" }}>
              <span style={{ width: `${essai.note}%`, background: reussi ? "var(--ds-green)" : "var(--ds-blue)" }} />
            </span>
            {minScore != null && <span className="ds-muted" style={{ fontSize: 12 }}>{k("passMark", { min: minScore })}</span>}
          </div>
          {minScore != null && (
            <span className={`ds-chip ${reussi ? "ds-chip-green" : "ds-chip-amber"}`}>{reussi ? k("passed") : k("notPassed")}</span>
          )}
        </div>
        {(indice || action) && (
          <div className="ds-inset" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <p style={{ flex: 1, fontSize: 13, color: "var(--ds-ink-2)" }}>{indice}</p>
            {action}
          </div>
        )}
      </section>

      {essai.resume && (
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("summary")}</h2>
          <div className="ds-inset"><p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{essai.resume}</p></div>
        </section>
      )}

      {essai.aRetenir?.length > 0 && (
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("takeaways")}</h2>
            <p className="ds-sub">{k("takeawaysHint")}</p>
          </div>
          <div className="ds-inset">
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14, lineHeight: 1.55 }}>
              {essai.aRetenir.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          </div>
        </section>
      )}

      {essai.competences.length > 0 && (
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("skills")}</h2>
            <p className="ds-sub">{k("checkpointsHint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
            {essai.competences.map((c, i) => (
              <div key={c.nom} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <b style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{c.nom}</b>
                  <span className="ds-meter ds-meter-thin" style={{ width: 80 }}><span style={{ width: `${c.score ?? 0}%` }} /></span>
                  <span className="ds-mono" style={{ fontSize: 13, width: 44, textAlign: "right" }}>{c.score != null ? `${c.score} %` : "—"}</span>
                </div>
                {c.dimensions.map((d, j) => (
                  <div key={j} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    {c.dimensions.length > 1 && <span style={{ fontWeight: 500 }}>{d.dimension} · {d.score} %</span>}
                    {d.checkpoints.length > 0 ? d.checkpoints.map((cp, n) => (
                      <div key={n} style={{ display: "flex", gap: 10 }}>
                        <span className="ds-mono" style={{ color: COULEUR_POINT[cp.score] || "inherit", flexShrink: 0 }}>{cp.score}/2</span>
                        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                          <span>{cp.description}</span>
                          {cp.justification && <span style={{ color: "var(--ds-ink-3)" }}>{cp.justification}</span>}
                          {cp.citation && <span style={{ fontStyle: "italic", color: "var(--ds-ink-3)" }}>{locale === "fr" ? `« ${cp.citation} »` : `“${cp.citation}”`}</span>}
                        </span>
                      </div>
                    )) : d.justification && <p style={{ color: "var(--ds-ink-2)", lineHeight: 1.5 }}>{d.justification}</p>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
