"use client";

import { X } from "lucide-react";
import { estCritereCheckpoints, MUST } from "@/lib/competences";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Identifiant du prochain checkpoint d'un critère : jamais réutilisé, pour que
// l'id d'un checkpoint supprimé ne désigne pas, plus tard, un autre comportement.
export function nouvelIdCheckpoint(checkpoints) {
  const max = (checkpoints || []).reduce((m, cp) => Math.max(m, Number(String(cp?.id || "").replace(/\D/g, "")) || 0), 0);
  return `cp${max + 1}`;
}

// Compétences que la grille d'une étape note, checkpoint par checkpoint.
export function competencesDeLaGrille(criteria) {
  const ids = [];
  for (const c of criteria || []) {
    if (!estCritereCheckpoints(c)) continue;
    for (const id of [...(c.skill_ids || []), ...c.checkpoints.map((cp) => cp.skill_id).filter(Boolean)]) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  return ids;
}

// Pastille d'une compétence, colorée par son tier. Un identifiant qui n'est plus
// dans la liste de l'offre (compétence renommée ou retirée depuis la
// génération) reste affiché, signalé : le cacher ferait croire qu'il n'existe pas.
export function SkillChip({ id, competence, onRemove }) {
  const { t } = useI18n();
  const must = competence?.tier === MUST;
  const style = !competence
    ? { background: "var(--ds-amber-bg)", color: "var(--ds-amber-ink)", border: "1px solid #F3DDB8" }
    : must
      ? { background: "var(--ds-blue-06)", color: "var(--ds-blue)", border: "1px solid var(--ds-blue-16)" }
      : { background: "var(--ds-soft)", color: "var(--ds-ink-2)", border: "1px solid var(--ds-line)" };
  return (
    <span style={{ ...style, display: "inline-flex", alignItems: "center", gap: 4, height: 22, fontSize: "12px", borderRadius: 6, padding: "0 7px" }}>
      {competence ? competence.name : t("dashboard.experienceEditor.coverage.offList", { id })}
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit", display: "flex" }}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}

// Compétences notées par un critère : choisies dans la liste validée de l'offre,
// jamais saisies librement — une compétence hors liste ne compterait nulle part.
export function SkillPicker({ ids, competences, onChange }) {
  const { t } = useI18n();
  const parId = new Map((competences || []).map((c) => [c.id, c]));
  const disponibles = (competences || []).filter((c) => !ids.includes(c.id));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "0 0 8px" }}>
      <span style={{ fontSize: 12, color: "var(--ds-ink-3)", fontWeight: 500 }}>{t("dashboard.experienceEditor.criterionSkills")}</span>
      {ids.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--ds-amber-ink)" }}>{t("dashboard.experienceEditor.noSkill")}</span>
      )}
      {ids.map((id) => (
        <SkillChip key={id} id={id} competence={parId.get(id)} onRemove={() => onChange(ids.filter((x) => x !== id))} />
      ))}
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => e.target.value && onChange([...ids, e.target.value])}
          style={{ height: 24, fontSize: 12, padding: "0 6px", borderRadius: 6, border: "1px dashed #C9D3EA", background: "transparent", color: "var(--ds-blue)", cursor: "pointer", font: "inherit" }}
        >
          <option value="">{t("dashboard.experienceEditor.addSkill")}</option>
          {disponibles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}
    </div>
  );
}
