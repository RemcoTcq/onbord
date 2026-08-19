-- 018 — Policies RLS sur storage.objects pour `resumes` et `video-responses`
--
-- NON APPLIQUÉE. À exécuter après validation, et APRÈS le script 1.2 qui bascule
-- les deux buckets en privé.
--
-- Passer un bucket en privé retire déjà l'accès /object/public/*. Les policies
-- ci-dessous ferment l'autre porte : la lecture authentifiée avec la clé anon,
-- qui reste ouverte tant que storage.objects laisse passer le rôle `anon`.
-- C'est cette porte-là qui rendait les buckets ÉNUMÉRABLES lors de l'audit.
--
-- Modèle retenu :
--   - lecture  : recruteur propriétaire de l'offre, et personne d'autre ;
--   - écriture : le candidat DÉPOSE de façon anonyme (il n'a pas de compte),
--                on ne peut donc pas exiger auth.uid() sur l'INSERT ;
--   - service_role : contourne tout, c'est lui qui signe les URLs de lecture.
--
-- Pourquoi la lecture n'est pas rendue au candidat : il ne relit jamais son
-- propre fichier. Le parcours affiche ce qu'il vient d'enregistrer depuis le
-- navigateur, sans repasser par le stockage.

-- ─────────────────────────────────────────────────────────────────────────────
-- Convention de nommage des chemins, dont dépendent les policies :
--   resumes/<candidate_id>/<horodatage>_cv.pdf
--   video-responses/<interview_token>/<step_id>_<horodatage>.webm   (parcours run)
--   video-responses/<candidate_id>/<job_id>/q<n>_<horodatage>.webm  (parcours hérité)
-- storage.foldername(name) renvoie le tableau des segments ; [1] est le premier.
-- ─────────────────────────────────────────────────────────────────────────────

-- PAS de `alter table storage.objects enable row level security` ici : la table
-- appartient à `supabase_storage_admin`, le SQL Editor tourne en `postgres`, et
-- l'ALTER échoue sur « must be owner of table objects ». La ligne serait de
-- toute façon sans objet — Supabase active déjà la RLS sur storage.objects dans
-- tout projet. Créer des policies, en revanche, est autorisé.
--
-- ATTENTION — les policies ci-dessous s'AJOUTENT aux existantes, elles ne les
-- remplacent pas. Or la RLS de storage.objects est PERMISSIVE : une seule
-- policy qui accorde l'accès suffit à le donner, quelles que soient les autres.
-- Si le bucket reste énumérable par la clé anon après cette migration, c'est
-- qu'une policy permissive préexiste (créée jadis dans l'interface Storage >
-- Policies). Pour les débusquer :
--
--     select policyname, cmd, roles::text, qual, with_check
--     from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--     order by policyname;
--
-- Toute ligne dont `roles` contient anon ou public, et dont `qual` vaut `true`
-- ou ne teste que `bucket_id`, doit être supprimée :
--     drop policy "<son nom>" on storage.objects;

-- ── Lecture ──────────────────────────────────────────────────────────────────
-- Un CV n'est lisible que par le recruteur propriétaire de l'offre à laquelle le
-- candidat a postulé. La jointure part du premier segment du chemin.

drop policy if exists "resumes: lecture recruteur proprietaire" on storage.objects;
create policy "resumes: lecture recruteur proprietaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and exists (
      select 1
      from public.candidates c
      join public.jobs j on j.id = c.job_id
      where c.id::text = (storage.foldername(name))[1]
        and j.user_id = auth.uid()
    )
  );

-- Les vidéos couvrent DEUX conventions de chemin (run et parcours hérité) :
-- le premier segment est tantôt un interview_token, tantôt un candidate_id.
drop policy if exists "videos: lecture recruteur proprietaire" on storage.objects;
create policy "videos: lecture recruteur proprietaire"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'video-responses'
    and exists (
      select 1
      from public.candidates c
      join public.jobs j on j.id = c.job_id
      where j.user_id = auth.uid()
        and (
          c.interview_token = (storage.foldername(name))[1]
          or c.id::text     = (storage.foldername(name))[1]
        )
    )
  );

-- ── Dépôt ────────────────────────────────────────────────────────────────────
-- Le candidat est anonyme : impossible d'exiger auth.uid(). Le garde-fou est que
-- le premier segment doit correspondre à un candidat EXISTANT — on ne peut donc
-- pas écrire dans un dossier arbitraire, seulement dans celui d'un candidat déjà
-- créé par applyForJob (elle-même limitée en débit depuis le lot de correctifs).
--
-- Volontairement PAS de policy UPDATE ni DELETE pour anon : les uploads passent
-- en upsert, ce qui exige update. Le compromis retenu est d'autoriser l'update
-- sous la même condition que l'insert, et de garder la suppression au seul
-- service_role (le ménage est fait par deleteJob/deleteCandidate).

drop policy if exists "resumes: depot candidat" on storage.objects;
create policy "resumes: depot candidat"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and exists (select 1 from public.candidates c where c.id::text = (storage.foldername(name))[1])
  );

drop policy if exists "resumes: remplacement candidat" on storage.objects;
create policy "resumes: remplacement candidat"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'resumes'
    and exists (select 1 from public.candidates c where c.id::text = (storage.foldername(name))[1])
  );

drop policy if exists "videos: depot candidat" on storage.objects;
create policy "videos: depot candidat"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'video-responses'
    and exists (
      select 1 from public.candidates c
      where c.interview_token = (storage.foldername(name))[1]
         or c.id::text        = (storage.foldername(name))[1]
    )
  );

drop policy if exists "videos: remplacement candidat" on storage.objects;
create policy "videos: remplacement candidat"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'video-responses'
    and exists (
      select 1 from public.candidates c
      where c.interview_token = (storage.foldername(name))[1]
         or c.id::text        = (storage.foldername(name))[1]
    )
  );

-- ── Note sur le bucket `logos` ───────────────────────────────────────────────
-- Volontairement NON touché : il est affiché à des candidats anonymes sur les
-- écrans du parcours, il doit rester public. Même chose pour `test-questions`,
-- qui ne contient pas de donnée personnelle — mais il mériterait son propre
-- examen, il n'était pas dans le périmètre de l'audit.
