-- ============================================================================
-- Migration 013 — Rattrapage : candidates.interview_expires_at
-- ============================================================================
-- ADDITIVE, NON-CASSANTE ET SANS EFFET EN PRODUCTION.
--
-- Cette colonne existe déjà en production et y est écrite depuis longtemps
-- (createCandidateShell et applyForJob y posent la date de création + 5 jours),
-- mais elle n'avait jamais été versionnée : le schéma du dépôt et la base réelle
-- avaient divergé. Un environnement reconstruit depuis ces migrations seules
-- n'aurait pas eu la colonne — et lib/actions/run.js la lisant désormais pour
-- la péremption des liens, le parcours candidat aurait échoué pour TOUS les
-- candidats, pas seulement les liens périmés.
--
-- Elle ne fait donc que documenter l'existant. `if not exists` la rend inopérante
-- là où la colonne est déjà là ; aucune donnée n'est écrite ni modifiée.
--
-- Définition relevée sur la base de production le 13/08/2026 :
--   interview_expires_at | timestamp with time zone | nullable | sans défaut
--
-- Nullable À DESSEIN : tous les chemins de création ne la renseignent pas
-- (l'import de CV côté recruteur, notamment, crée un candidat sans lien
-- d'évaluation). Le code retombe alors sur created_at + 5 jours, et une date
-- absente ne recale jamais personne.
-- ============================================================================

alter table public.candidates
  add column if not exists interview_expires_at timestamp with time zone;

comment on column public.candidates.interview_expires_at is
  'Péremption du lien d''évaluation du candidat (création + 5 jours). Null = repli sur created_at + 5 jours. Bloque l''entrée dans un parcours non commencé, jamais la reprise d''un parcours en cours.';
