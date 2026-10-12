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
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { EXERCICES_CIBLE_MAX, MUST } from "@/lib/competences";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotationGlobale({ steps, competences, couverture, covering, onCover, onOpenStep }) {
  const { t } = useI18n();
  const [ouvert, setOuvert] = useState(false);

  if (!competences.length) {
    return (
      <div className="card" style={{ padding: "0.9rem 1.25rem", fontSize: "12.5px", color: "var(--muted-foreground)" }}>
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
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "1rem 1.3rem",
          background: "none", border: "none", cursor: "pointer", font: "inherit", color: "var(--foreground)", textAlign: "left",
        }}
      >
        <ChevronDown size={16} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s", color: "var(--muted-foreground)", flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "15px", fontWeight: 800 }}>{t("dashboard.experienceEditor.notation.title")}</span>
          <span style={{ display: "block", fontSize: "12.5px", color: "var(--muted-foreground)", marginTop: 2 }}>
            {t("dashboard.experienceEditor.notation.summary", { count: lignes.length })}
          </span>
        </span>
        <span style={{
          fontSize: "11.5px", fontWeight: 700, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap",
          background: manquantes ? "#fee2e2" : "#dcfce7", color: manquantes ? "#991b1b" : "#166534",
        }}>
          {manquantes
            ? t("dashboard.experienceEditor.coverage.missing", { count: manquantes })
            : t("dashboard.experienceEditor.coverage.allCovered")}
        </span>
      </button>

      {ouvert && (
        <div style={{ padding: "0 1.3rem 1.1rem" }}>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: 1.55, margin: "0 0 0.8rem" }}>
            {t("dashboard.experienceEditor.notation.intro")}
          </p>

          {couverture.depasseDuree && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", borderRadius: 8, padding: "8px 12px", fontSize: "12.5px", lineHeight: 1.5, marginBottom: "0.8rem" }}>
              {t("dashboard.experienceEditor.coverage.overDuration", {
                steps: couverture.nbEtapes, max: EXERCICES_CIBLE_MAX, count: couverture.must.length,
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column" }}>
            {lignes.map((c) => {
              const must = c.tier === MUST;
              const manque = must && !c.refs.length;
              const etapes = etapesDe(c);
              return (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                  padding: "0.65rem 0.75rem", borderTop: "1px solid var(--border)",
                  background: manque ? "#fef2f2" : undefined, borderRadius: manque ? 8 : 0,
                }}>
                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{c.name}</div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {etapes.map(([i, info]) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onOpenStep(indexDe.get(i)?.id)}
                        title={indexDe.get(i)?.title || ""}
                        style={{
                          fontSize: "11.5px", fontWeight: 600, borderRadius: 99, padding: "3px 10px", cursor: "pointer",
                          border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)",
                        }}
                      >
                        {t("dashboard.experienceEditor.notation.inStep", { n: i + 1 })}
                        <span style={{ color: "var(--muted-foreground)" }}>
                          {" · "}{info.checkpoints
                            ? t("dashboard.experienceEditor.coverage.checkpointCount", { count: info.checkpoints })
                            : t("dashboard.experienceEditor.notation.auto")}
                        </span>
                      </button>
                    ))}
                    {manque && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => onCover(c.id)}
                        disabled={!!covering}
                        title={t("dashboard.experienceEditor.coverage.coverHelp")}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "12px" }}
                      >
                        {covering === c.id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
                        {covering === c.id ? t("dashboard.experienceEditor.coverage.covering") : t("dashboard.experienceEditor.coverage.cover")}
                      </button>
                    )}
                    {!c.refs.length && !must && (
                      <span style={{ fontSize: "11.5px", color: "var(--muted-foreground)" }}>{t("dashboard.experienceEditor.coverage.uncoveredNice")}</span>
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
