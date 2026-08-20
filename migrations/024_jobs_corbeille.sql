-- 024 — Corbeille de 7 jours sur les offres
--
-- Supprimer une offre effaçait tout, immédiatement et sans retour : l'offre, ses
-- candidats, leurs runs, leurs fichiers. Aucun filet en cas de fausse manœuvre —
-- et la restauration était d'autant plus impossible que les fichiers du stockage
-- n'étaient, eux, jamais supprimés (point 11 de l'audit du 19/08/2026).
--
-- Le geste de suppression devient donc réversible pendant une semaine :
--   suppression -> deleted_at = now(), l'offre disparaît partout ;
--   purge       -> au-delà de 7 jours, effacement réel, fichiers compris.
--
-- ── Pourquoi le filtre est DANS LA POLICY ────────────────────────────────────
-- Le code compte 23 lectures de `jobs`. Filtrer `deleted_at is null` dans 22
-- d'entre elles et en oublier une, c'est une offre supprimée qui réapparaît dans
-- un écran — ou pire, qui continue d'accepter des candidatures. Porté par la
-- policy, l'oubli devient impossible : une offre en corbeille cesse d'exister
-- pour le rôle `authenticated`, quelle que soit la requête.
--
-- Contrepartie assumée : l'écran de corbeille et la restauration ne peuvent plus
-- passer par le client soumis à RLS — ils ne verraient rien. Ils passent par des
-- server actions en service_role, avec contrôle de propriété explicite
-- (listDeletedJobs / restoreJob dans lib/actions/candidate.js).
--
-- Les chemins CANDIDAT ne sont pas couverts par cette policy : ils lisent en
-- service_role, qui contourne la RLS. Le filtre y est donc posé à la main, dans
-- resolveJobEntry(), applyForJob() et getPublicJobAndBranding(). C'est le prix
-- du service_role, et c'est vérifié dans le même commit.

alter table public.jobs
  add column if not exists deleted_at timestamptz;

comment on column public.jobs.deleted_at is
  'Mise en corbeille. NULL = offre vivante. Non NULL = supprimée par le recruteur, invisible partout, purgée définitivement (lignes + fichiers du stockage) au-delà de 7 jours par /api/cron/purge.';

-- La purge balaie par date : sans index, elle scanne toute la table à chaque
-- passage. L'index partiel ne porte que sur les lignes en corbeille — quelques
-- lignes, contre la totalité des offres vivantes.
create index if not exists jobs_deleted_at_idx
  on public.jobs (deleted_at)
  where deleted_at is not null;

-- ── Policy de lecture ────────────────────────────────────────────────────────
-- Remplace celle posée par la migration 021, à laquelle on ajoute le filtre.
drop policy if exists "jobs: lecture proprietaire" on public.jobs;

create policy "jobs: lecture proprietaire"
  on public.jobs for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

-- Les policies insert / update / delete de 021 restent inchangées : un recruteur
-- doit pouvoir écrire `deleted_at` sur sa propre offre, et la policy UPDATE le
-- permet déjà. La suppression réelle, elle, se fait en service_role.

-- ── Contrôle ─────────────────────────────────────────────────────────────────
--   select count(*) from jobs where deleted_at is not null;   -- corbeille
--   select policyname, qual from pg_policies
--   where schemaname='public' and tablename='jobs' and cmd='SELECT';
