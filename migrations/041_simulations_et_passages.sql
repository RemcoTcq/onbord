-- 041 — Simulations détachées des offres, passages de learners, audio des
-- appels téléphoniques (phase 1 de l'onboarding, docs/PLAN.md)
--
-- ── 1. Une simulation sans offre ────────────────────────────────────────────
-- `experiences.job_id` devient FACULTATIF : une simulation d'onboarding (un
-- module, phase 2) n'appartient à aucune offre. Son organisation, posée par le
-- déclencheur de la migration 036, suffit aux policies « organisation ». Les
-- simulations existantes gardent leur offre ; rien ne change pour elles.
--
-- ── 2. Un passage de learner ────────────────────────────────────────────────
-- `candidate_runs` est le PASSAGE d'une simulation, et le reste : le même
-- moteur et la même notation serviront au learner (phase 3).
--   • `candidate_id` devient facultatif ;
--   • `learner_id` (le compte du learner) apparaît ;
--   • exactement l'un des deux est rempli (contrainte) ;
--   • `attempt_number` numérote les essais d'un learner (illimités) ;
--   • `assignment_id` le rattachera à son assignation (clé posée en phase 2).
-- L'unicité `(candidate_id, experience_id)` reste : elle ne gêne pas les
-- learners, dont `candidate_id` est nul (deux NULL ne sont pas égaux).
--
-- ── 3. L'audio du téléphone ─────────────────────────────────────────────────
-- Le canal téléphone (voix seule) enregistre l'AUDIO de l'appel, là où l'appel
-- vidéo enregistre la caméra. Le bucket `video-responses` n'acceptait que de la
-- vidéo : il accepte aussi l'audio. Sans cette migration, l'appel se joue et se
-- note quand même (sur sa transcription) ; seul l'enregistrement manquerait.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive : deux contraintes NOT NULL levées, des colonnes ajoutées, des
-- formats ajoutés. Aucune donnée touchée. Le code de `main` écrit toujours un
-- `job_id` et un `candidate_id`.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente.

begin;

alter table public.experiences alter column job_id drop not null;

alter table public.candidate_runs alter column candidate_id drop not null;
alter table public.candidate_runs
  add column if not exists learner_id uuid references auth.users(id) on delete cascade,
  add column if not exists assignment_id uuid,
  add column if not exists attempt_number integer;

create index if not exists idx_runs_learner on public.candidate_runs(learner_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'candidate_runs_candidat_ou_learner') then
    alter table public.candidate_runs
      add constraint candidate_runs_candidat_ou_learner
      check ((candidate_id is not null) <> (learner_id is not null));
  end if;
end $$;

update storage.buckets
set allowed_mime_types = array[
  'video/webm', 'video/mp4', 'video/ogg', 'video/quicktime',
  'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'
]
where id = 'video-responses';

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. job_id et candidate_id facultatifs (attendu : YES, YES).
--    select table_name, column_name, is_nullable from information_schema.columns
--    where (table_name, column_name) in (('experiences', 'job_id'), ('candidate_runs', 'candidate_id'));
-- 2. Les formats du bucket (attendu : 8 formats, dont audio/webm).
--    select allowed_mime_types from storage.buckets where id = 'video-responses';
