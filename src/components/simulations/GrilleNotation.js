"use client";

// La GRILLE DE NOTATION d'une simulation d'onboarding, modifiable en détail
// (16/11/2026) — c'est elle qui fait la qualité de la note.
//
//   • Compétences évaluées : renommer, passer d'indispensable à atout,
//     supprimer, ajouter. Chacune dit combien de points la notent ; une
//     compétence indispensable que rien ne note est signalée.
//   • Critères : leur nom, les compétences qu'ils notent (des pastilles à
//     cocher), et leurs points de contrôle — chacun un comportement observable,
//     noté 0 (absent), 1 (partiel) ou 2 (maîtrisé). De 1 à 5 points par critère ;
//     3 au moins rendent la note plus juste.
//
// Rien ne part avant « Enregistrer » (enregistrerGrille). Une version déjà
// jouée est copiée, jamais modifiée : les essais faits gardent leur grille.

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2, AlertTriangle, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { grillePourEdition, couvertureGrille, CHECKPOINTS_MAX, MUST } from "@/lib/grilleModule";
import { enregistrerGrille } from "@/lib/actions/modules";

let compteur = 0;
const nouvelleCle = (p) => `${p}-n${++compteur}-${Date.now().toString(36)}`;

// `ailleurs` : les points de contrôle des AUTRES étapes de la simulation, par
// compétence (une ancienne simulation peut en avoir plusieurs) — une compétence
// notée ailleurs n'est pas « non notée ».
export default function GrilleNotation({ moduleId, step, criteria, verrouillee = false, ailleurs = {}, onSaved }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.sims.grid.${cle}`, vars);
  const depart = useMemo(() => grillePourEdition(criteria, step.criteria), [criteria, step.criteria]);
  const [grille, setGrille] = useState(depart);
  const [envoi, setEnvoi] = useState(false);
  const modifiee = JSON.stringify(grille) !== JSON.stringify(depart);
  const ici = couvertureGrille(grille);
  const couverture = new Map([...ici].map(([cle, n]) => [cle, n + (ailleurs[cle] || 0)]));
  const totalPoints = grille.criteres.reduce((n, c) => n + c.checkpoints.length, 0);

  const setCompetence = (cle, patch) => setGrille((g) => ({ ...g, competences: g.competences.map((c) => (c.cle === cle ? { ...c, ...patch } : c)) }));
  const retirerCompetence = (cle) => setGrille((g) => ({
    competences: g.competences.filter((c) => c.cle !== cle),
    criteres: g.criteres.map((c) => ({ ...c, skills: c.skills.filter((s) => s !== cle) })),
  }));
  const ajouterCompetence = () => setGrille((g) => ({ ...g, competences: [...g.competences, { cle: nouvelleCle("s"), name: "", priority: MUST }] }));

  const setCritere = (cle, patch) => setGrille((g) => ({ ...g, criteres: g.criteres.map((c) => (c.cle === cle ? { ...c, ...patch } : c)) }));
  const retirerCritere = (cle) => setGrille((g) => ({ ...g, criteres: g.criteres.filter((c) => c.cle !== cle) }));
  const ajouterCritere = () => setGrille((g) => ({
    ...g,
    criteres: [...g.criteres, { cle: nouvelleCle("c"), name: "", skills: g.competences[0] ? [g.competences[0].cle] : [], checkpoints: [{ cle: nouvelleCle("p"), description: "" }] }],
  }));
  const basculerSkill = (critere, cle) => setCritere(critere.cle, {
    skills: critere.skills.includes(cle) ? critere.skills.filter((s) => s !== cle) : [...critere.skills, cle],
  });
  const setPoint = (critere, cle, description) => setCritere(critere.cle, { checkpoints: critere.checkpoints.map((p) => (p.cle === cle ? { ...p, description } : p)) });
  const retirerPoint = (critere, cle) => setCritere(critere.cle, { checkpoints: critere.checkpoints.filter((p) => p.cle !== cle) });
  const ajouterPoint = (critere) => setCritere(critere.cle, { checkpoints: [...critere.checkpoints, { cle: nouvelleCle("p"), description: "" }] });

  async function enregistrer() {
    setEnvoi(true);
    const res = await enregistrerGrille(moduleId, step.id, grille);
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(res.nouvelleVersion ? k("savedNewVersion") : k("saved"), "success");
    onSaved?.();
  }

  const nonNotees = grille.competences.filter((c) => c.priority === MUST && String(c.name).trim() && !couverture.get(c.cle));

  return (
    <section className="ds-panel">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 10px 0", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 360px" }}>
          <h2 className="ds-h2">{k("title")}</h2>
          <p className="ds-sub">{k("subtitle")}</p>
        </div>
        <span className="ds-chip">{k("pointsCount", { count: totalPoints })}</span>
      </div>

      {/* ── Le barème, en une ligne ───────────────────────────────────────── */}
      <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", fontSize: 12, color: "var(--ds-ink-3)" }}>
        {[["0", "var(--ds-red)", k("scale0")], ["1", "var(--ds-amber-ink)", k("scale1")], ["2", "var(--ds-green-ink)", k("scale2")]].map(([n, c, l]) => (
          <span key={n} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="ds-mono" style={{ color: c, fontWeight: 600 }}>{n}</span> {l}
          </span>
        ))}
        <span style={{ flex: 1 }} />
        <span>{k("mustDouble")}</span>
      </div>

      {/* ── Les compétences ───────────────────────────────────────────────── */}
      <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span className="ds-label">{k("skillsTitle")}</span>
        {grille.competences.map((c) => {
          const n = couverture.get(c.cle) || 0;
          return (
            <div key={c.cle} className="grille-ligne">
              <input className="grille-champ" value={c.name} onChange={(e) => setCompetence(c.cle, { name: e.target.value })}
                placeholder={k("skillPlaceholder")} aria-label={k("skillName")} style={{ fontWeight: 500, flex: "1 1 220px" }} />
              <div role="radiogroup" aria-label={k("priority")} className="ds-seg" style={{ height: 30 }}>
                {[[MUST, k("must")], ["nice_to_have", k("nice")]].map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={c.priority === v}
                    className="ds-seg-item" style={{ height: 24, fontSize: 12 }} onClick={() => setCompetence(c.cle, { priority: v })}>{l}</button>
                ))}
              </div>
              <span className={`ds-chip ${n ? "" : c.priority === MUST ? "ds-chip-amber" : ""}`} style={{ minWidth: 92, justifyContent: "center" }}>
                {n ? k("coveredBy", { count: n }) : k("notCovered")}
              </span>
              <button type="button" className="ds-icon-btn" onClick={() => retirerCompetence(c.cle)} aria-label={k("removeSkill", { name: c.name || "—" })} title={k("removeSkill", { name: c.name || "—" })}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
        <button type="button" className="ds-add" style={{ height: 34, fontSize: 13 }} onClick={ajouterCompetence}><Plus size={14} /> {k("addSkill")}</button>
        {nonNotees.length > 0 && (
          <p className="ds-help" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ds-amber-ink)" }}>
            <AlertTriangle size={13} /> {k("uncoveredWarning", { names: nonNotees.map((c) => c.name).join(", ") })}
          </p>
        )}
      </div>

      {/* ── Les critères et leurs points ──────────────────────────────────── */}
      <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="ds-label">{k("criteriaTitle")}</span>
        {grille.criteres.map((c, i) => (
          <div key={c.cle} className="grille-critere">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="grille-numero">{i + 1}</span>
              <input className="grille-champ" value={c.name} onChange={(e) => setCritere(c.cle, { name: e.target.value })}
                placeholder={k("criterionPlaceholder")} aria-label={k("criterionName")} style={{ fontWeight: 600, fontSize: 14, flex: 1 }} />
              <button type="button" className="ds-icon-btn" onClick={() => retirerCritere(c.cle)} aria-label={k("removeCriterion")} title={k("removeCriterion")}><Trash2 size={15} /></button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, paddingLeft: 34 }}>
              <span style={{ fontSize: 12, color: "var(--ds-ink-3)" }}>{k("assesses")}</span>
              {grille.competences.filter((s) => String(s.name).trim()).map((s) => {
                const actif = c.skills.includes(s.cle);
                return (
                  <button key={s.cle} type="button" aria-pressed={actif} onClick={() => basculerSkill(c, s.cle)} className={`grille-pastille${actif ? " is-on" : ""}`}>
                    {actif && <Check size={12} strokeWidth={2.4} />} {s.name}
                  </button>
                );
              })}
              {!c.skills.length && <span style={{ fontSize: 12, color: "var(--ds-amber-ink)" }}>{k("pickSkill")}</span>}
            </div>

            <ol style={{ listStyle: "none", margin: 0, padding: "0 0 0 34px", display: "flex", flexDirection: "column", gap: 6 }}>
              {c.checkpoints.map((p, j) => (
                <li key={p.cle} className="grille-point">
                  <span className="ds-mono" style={{ fontSize: 12, color: "var(--ds-ink-4)", width: 18, paddingTop: 7, flexShrink: 0 }}>{j + 1}.</span>
                  <AutoTextarea className="grille-champ" rows={1} value={p.description} onChange={(e) => setPoint(c, p.cle, e.target.value)}
                    placeholder={k("checkpointPlaceholder")} aria-label={k("checkpoint", { n: j + 1 })} style={{ flex: 1, resize: "none", lineHeight: 1.5 }} />
                  <button type="button" className="ds-icon-btn grille-retirer" onClick={() => retirerPoint(c, p.cle)} aria-label={k("removeCheckpoint", { n: j + 1 })} title={k("removeCheckpoint", { n: j + 1 })}><Trash2 size={14} /></button>
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 34, flexWrap: "wrap" }}>
              <button type="button" className="ds-btn ds-btn-ghost ds-btn-sm" onClick={() => ajouterPoint(c)} disabled={c.checkpoints.length >= CHECKPOINTS_MAX}>
                <Plus size={13} /> {k("addCheckpoint")}
              </button>
              {c.checkpoints.length >= CHECKPOINTS_MAX
                ? <span className="ds-help">{k("maxCheckpoints", { max: CHECKPOINTS_MAX })}</span>
                : c.checkpoints.length < 3 && <span className="ds-help">{k("fewCheckpoints")}</span>}
            </div>
          </div>
        ))}
        <button type="button" className="ds-add" style={{ height: 38, fontSize: 13 }} onClick={ajouterCritere}><Plus size={14} /> {k("addCriterion")}</button>
      </div>

      <div className="ds-panel-foot" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span className="ds-help" style={{ flex: "1 1 280px" }}>{modifiee ? (verrouillee ? k("lockedNote") : k("unsaved")) : k("upToDate")}</span>
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ds-btn" onClick={() => setGrille(depart)} disabled={!modifiee || envoi}>{k("reset")}</button>
          <button type="button" className="ds-btn ds-btn-primary" onClick={enregistrer} disabled={!modifiee || envoi}>
            {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("save")}
          </button>
        </span>
      </div>
    </section>
  );
}
