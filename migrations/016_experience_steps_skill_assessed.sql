-- 016 — Compétences décomposées en sous-dimensions
--
-- Chaque étape cible désormais UNE compétence principale (skill_assessed),
-- décomposée en 2-3 sous-dimensions notées séparément. La colonne `criteria`
-- garde son nom mais change de contenu : elle stocke les sous-dimensions
-- ([{name, bars_levels:[…]}] — même forme, autre sémantique). Idem pour
-- run_scores.criterion_scores, qui porte maintenant skill_name +
-- sub_dimension_name. Aucun backfill : les lignes existantes restent lisibles,
-- les écrans les affichent à plat (skill_assessed NULL).
--
-- `targets_skills` (dans config) reste distinct : liste informative des
-- compétences que l'étape touche. `skill_assessed` est la compétence unique
-- sur laquelle le score est structuré.

alter table experience_steps
  add column if not exists skill_assessed text;

comment on column experience_steps.skill_assessed is
  'Compétence principale évaluée par cette étape ; les sous-dimensions de `criteria` la décomposent. NULL = étape générée avant la migration 016 (affichage à plat).';

comment on column experience_steps.criteria is
  'Sous-dimensions de skill_assessed : [{name, bars_levels:[{level,label,description}]}]. Nom de colonne historique (ex-critères BARS plats).';

comment on column run_scores.criterion_scores is
  'Scores par sous-dimension : [{step_id, skill_name, sub_dimension_name, bars_level, score, justification, verbatim, verbatim_verified}]. Les lignes antérieures à la 016 portent criterion_name au lieu de sub_dimension_name.';
