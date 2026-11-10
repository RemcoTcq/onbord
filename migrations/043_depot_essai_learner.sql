-- 043 — Dépôt des enregistrements d'un ESSAI de learner (phase 3 de
-- l'onboarding, docs/PLAN.md)
--
-- ── Le besoin ───────────────────────────────────────────────────────────────
-- Un essai se joue sur l'écran du parcours (/run/<id de l'essai>), le même que
-- celui des candidats. Les réponses vidéo, l'appel vidéo et l'appel téléphonique
-- s'enregistrent depuis le navigateur dans `video-responses`, sous un dossier
-- qui porte le jeton du passage. Pour un candidat, ce jeton est son
-- `interview_token`, et la policy « videos: depot candidat » (migration 019)
-- l'accepte. Pour un learner, c'est l'id de son essai : aucune policy ne
-- l'accepte, le dépôt est refusé — l'essai se joue et se note quand même (sur
-- la transcription), seul l'enregistrement manque.
--
-- ── La règle ────────────────────────────────────────────────────────────────
-- Un utilisateur CONNECTÉ dépose (et remplace) sous `<id d'essai>/…` si cet
-- essai est le sien et qu'il est en cours. Rien d'autre : ni l'essai d'un
-- autre, ni un essai soumis, ni un dossier quelconque. Aucune lecture n'est
-- ouverte — le serveur signe les liens, comme pour les candidats.
--
-- La vérification passe par une fonction SECURITY DEFINER, comme celle des
-- candidats (019) : elle ne dépend pas des policies de lecture de
-- `candidate_runs`, et ne renvoie qu'un booléen.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive : une fonction, deux policies. Les policies des candidats ne sont
-- pas touchées.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente.

begin;

create or replace function public.storage_segment_est_essai(segment text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.candidate_runs r
    where r.id::text = segment
      and r.learner_id = auth.uid()
      and r.status = 'in_progress'
  );
$$;

comment on function public.storage_segment_est_essai(text) is
  'Le premier segment d''un chemin de storage est-il un essai EN COURS de l''utilisateur connecté ? (Phase 3 de l''onboarding.) SECURITY DEFINER, ne renvoie qu''un booléen.';

revoke all on function public.storage_segment_est_essai(text) from public;
grant execute on function public.storage_segment_est_essai(text) to authenticated, service_role;

drop policy if exists "videos: depot essai learner" on storage.objects;
create policy "videos: depot essai learner"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'video-responses'
    and public.storage_segment_est_essai((storage.foldername(name))[1])
  );

drop policy if exists "videos: remplacement essai learner" on storage.objects;
create policy "videos: remplacement essai learner"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'video-responses'
    and public.storage_segment_est_essai((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'video-responses'
    and public.storage_segment_est_essai((storage.foldername(name))[1])
  );

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. Les deux policies (attendu : 2 lignes).
--    select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like '%essai learner%';
-- 2. La fonction (attendu : true, security definer).
--    select prosecdef from pg_proc where proname = 'storage_segment_est_essai';
