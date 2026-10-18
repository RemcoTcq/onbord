"use client";

// « Comment le candidat est noté » — la simulation entière.
//
// FERMÉ par défaut (12/10/2026) : le titre, une phrase de règle et l'état de la
// couverture suffisent à la lecture de la page. Ouvert, une compétence par
// ligne : obligatoire ou bonus, et les étapes qui la notent (cliquables). Un
// must-have testé nulle part reste une alerte, avec son bouton « Couvrir » ; un
// nice-to-have non testé n'en est jamais une. La part de chaque étape dans la
// note se lit sur son bloc et se règle sur sa page (onglet Scoring).

import { useState } from "react";
import { Loader2, Sparkles, ChevronDown, ListChecks, AlertTriangle } from "lucide-react";
import { EXERCICES_CIBLE_MAX, MUST } from "@/lib/competences";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotationGlobale({ steps, competences, couverture, covering, onCover, onOpenStep }) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);

  if (!competences.length) {
    return (
      <div className="ds-card ds-sub" style={{ padding: "14px 16px" }}>
        {t("dashboard.experienceEditor.coverage.noSkills")}
      </div>
    );
  }

  const lignes = [...couverture.must, ...couverture.nice];
  const manquantes = couverture.manquantes.length;
  const indexDe = new Map(steps.map((s, i) => [i, s]));

  // Les étapes qui notent une compétence, une fois chacune, dans l'ordre.
  function etapesDe(c) {
    const parEtape = new Map();
    for (const r of c.refs) {
      const prec = parEtape.get(r.stepIndex) || { checkpoints: 0, auto: false };
      parEtape.set(r.stepIndex, { checkpoints: prec.checkpoints + r.checkpoints.length, auto: prec.auto || !!r.automatic });
    }
    return [...parEtape.entries()].sort((a, b) => a[0] - b[0]);
  }

  return (
    <div className="ds-card" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className="ds-critere-tete"
        style={{
          width: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "14px 16px",
          background: "transparent", border: 0, cursor: "pointer", font: "inherit", color: "var(--ds-ink)", textAlign: "left",
        }}
      >
        <span className="ds-icon-tile ds-icon-tile-soft" style={{ width: 32, height: 32, borderRadius: 9 }}><ListChecks size={15} strokeWidth={2} /></span>
        <span style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{t("dashboard.experienceEditor.notation.title")}</span>
          <span className="ds-sub">{t("dashboard.experienceEditor.notation.summary", { count: lignes.length })}</span>
        </span>
        <span className="ds-chip ds-chip-lg" style={manquantes
          ? { borderColor: "var(--ds-red-line)", background: "#FFF6F4", color: "var(--ds-red)", fontWeight: 500, fontSize: 12 }
          : { color: "var(--ds-green-ink)", fontWeight: 500, fontSize: 12 }}>
          {manquantes ? <AlertTriangle size={13} /> : <span className="ds-dot ds-dot-green" />}
          {manquantes
            ? t("dashboard.experienceEditor.coverage.missing", { count: manquantes })
            : t("dashboard.experienceEditor.coverage.allCovered")}
        </span>
        <ChevronDown size={16} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--ds-ink-3)", flexShrink: 0 }} />
      </button>

      {ouvert && (
        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="ds-sub" style={{ lineHeight: 1.55 }}>
            {t("dashboard.experienceEditor.notation.intro")}
          </p>

          {couverture.depasseDuree && (
            <div className="ds-inset" style={{ background: "var(--ds-amber-bg)", borderColor: "#F3DDB8", color: "var(--ds-amber-ink)", fontSize: 13, lineHeight: 1.5, padding: "10px 12px" }}>
              {t("dashboard.experienceEditor.coverage.overDuration", {
                steps: couverture.nbEtapes, max: EXERCICES_CIBLE_MAX, count: couverture.must.length,
              })}
            </div>
          )}

          <div className="ds-inset ds-rows">
            {lignes.map((c) => {
              const must = c.tier === MUST;
              const manque = must && !c.refs.length;
              const etapes = etapesDe(c);
              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "10px 14px",
                  background: manque ? "var(--ds-red-soft)" : undefined,
                }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`ds-dot ${must ? "ds-dot-blue" : "ds-dot-grey"}`} title={must ? t("dashboard.experienceEditor.coverage.must") : t("dashboard.experienceEditor.coverage.nice")} />
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {etapes.map(([i, info]) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onOpenStep(indexDe.get(i)?.id)}
                        title={indexDe.get(i)?.title || ""}
                        className="ds-chip"
                        style={{ cursor: "pointer", font: "inherit", fontSize: 12 }}
                      >
                        {t("dashboard.experienceEditor.notation.inStep", { n: i + 1 })}
                        <span style={{ color: "var(--ds-ink-4)" }}>
                          {" · "}{info.checkpoints
                            ? t("dashboard.experienceEditor.coverage.checkpointCount", { count: info.checkpoints })
                            : t("dashboard.experienceEditor.notation.auto")}
                        </span>
                      </button>
                    ))}
                    {manque && (
                      <button
                        type="button"
                        className="ds-btn ds-btn-sm"
                        onClick={() => onCover(c.id)}
                        disabled={!!covering}
                        title={t("dashboard.experienceEditor.coverage.coverHelp")}
                        style={{ height: 28, fontSize: 12, color: "var(--ds-blue)" }}
                      >
                        {covering === c.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                        {covering === c.id ? t("dashboard.experienceEditor.coverage.covering") : t("dashboard.experienceEditor.coverage.cover")}
                      </button>
                    )}
                    {!c.refs.length && !must && (
                      <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>{t("dashboard.experienceEditor.coverage.uncoveredNice")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
