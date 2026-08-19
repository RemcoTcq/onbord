-- 019 — Correctif de 018, puis retrait des policies permissives héritées
--
-- À EXÉCUTER D'UN SEUL BLOC. Ne pas s'arrêter au milieu : entre le retrait des
-- anciennes policies et la création des nouvelles, le dépôt candidat est fermé.
--
-- ── Ce que 018 a raté ────────────────────────────────────────────────────────
-- Les policies INSERT/UPDATE de 018 vérifient l'existence du candidat par
--   EXISTS (SELECT 1 FROM public.candidates ...)
-- Une sous-requête de policy s'exécute avec les droits de L'APPELANT, donc la
-- RLS de `candidates` s'y applique. Or depuis la migration 014, le rôle `anon`
-- n'a plus aucun droit de SELECT sur `candidates`. Pour un candidat anonyme —
-- c'est-à-dire tous les candidats — l'EXISTS est donc toujours FAUX et le dépôt
-- serait rejeté.
--
-- Le défaut est invisible aujourd'hui parce que les policies permissives
-- héritées (« Allow public uploads to resumes », etc.) accordent l'accès en
-- parallèle et masquent le problème. Il apparaîtrait à la seconde exacte où on
-- les supprime — c'est-à-dire plus bas dans ce fichier.
--
-- La parade est une fonction SECURITY DEFINER : elle s'exécute avec les droits
-- de son propriétaire, donc voit `candidates` sans être soumise à sa RLS. Elle
-- ne renvoie qu'un booléen, jamais une ligne : elle n'ouvre aucune lecture.

create or replace function public.storage_segment_est_candidat(segment text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.candidates c
    where c.interview_token = segment
       or c.id::text        = segment
  );
$$;

comment on function public.storage_segment_est_candidat(text) is
  'Le premier segment d''un chemin de storage correspond-il à un candidat existant ? SECURITY DEFINER : les policies de dépôt sont évaluées pour un candidat ANONYME, qui n''a pas le droit de lire `candidates` (migration 014). Ne renvoie qu''un booléen — aucune donnée ne sort.';

-- `public` inclut tous les rôles ; on retire puis on accorde nommément.
revoke all on function public.storage_segment_est_candidat(text) from public;
grant execute on function public.storage_segment_est_candidat(text) to anon, authenticated, service_role;


-- ── Policies de dépôt, réécrites sur la fonction ─────────────────────────────

drop policy if exists "resumes: depot candidat" on storage.objects;
create policy "resumes: depot candidat"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'resumes'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  );

drop policy if exists "resumes: remplacement candidat" on storage.objects;
create policy "resumes: remplacement candidat"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'resumes'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'resumes'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  );

drop policy if exists "videos: depot candidat" on storage.objects;
create policy "videos: depot candidat"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'video-responses'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  );

drop policy if exists "videos: remplacement candidat" on storage.objects;
create policy "videos: remplacement candidat"
  on storage.objects for update
  to anon, authenticated
  using (
    bucket_id = 'video-responses'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  )
  with check (
    bucket_id = 'video-responses'
    and public.storage_segment_est_candidat((storage.foldername(name))[1])
  );

-- Note : 018 avait omis le WITH CHECK sur les policies UPDATE. Sans lui, un
-- upsert peut passer le contrôle d'entrée puis écrire un `name` arbitraire.
-- Les deux clauses sont désormais posées.

-- Les policies SELECT de 018 restent telles quelles : elles s'adressent au rôle
-- `authenticated`, qui a bien le droit de lire `candidates` et `jobs` — et sa
-- propre RLS l'y limite déjà à ses candidats. La sous-requête est donc correcte,
-- et le double filtrage ne fait que renforcer le résultat.


-- ── Retrait des policies permissives héritées ────────────────────────────────
-- La RLS de storage.objects est PERMISSIVE : une seule policy accordant l'accès
-- suffit à le donner. Ces six-là, ouvertes au rôle `public` sur le seul critère
-- du bucket_id, sont ce qui laissait la clé anon lire et ÉNUMÉRER les deux
-- buckets — y compris après leur passage en privé, comme la vérification du
-- 19/08/2026 l'a montré. Tant qu'elles vivent, tout ce qui précède est décoratif.

drop policy if exists "Allow public select on resumes"  on storage.objects;  -- la fuite (CV)
drop policy if exists "Allow public uploads to resumes" on storage.objects;  -- remplacée ci-dessus
drop policy if exists "Allow public updates to resumes" on storage.objects;  -- remplacée ci-dessus

drop policy if exists "Allow video reads"   on storage.objects;  -- la fuite (vidéos)
drop policy if exists "Allow video uploads" on storage.objects;  -- remplacée ci-dessus
drop policy if exists "Allow video updates" on storage.objects;  -- remplacée ci-dessus

-- NE SONT PAS TOUCHÉES, et ne doivent pas l'être — ce sont elles qui affichent
-- le logo de l'employeur à un candidat anonyme :
--   Allow public read access for logos
--   Allow public read access for test-questions
--   Allow authenticated insert/delete access for logos
--   Allow authenticated insert/delete access for test-questions


-- ── Contrôle final ───────────────────────────────────────────────────────────
-- Ne doit renvoyer QUE les quatre lignes logos/test-questions. Toute autre ligne
-- accordée à `public` ou `anon` en SELECT sur resumes/video-responses signifie
-- que la fuite est encore ouverte.
--
--   select policyname, cmd, roles::text, qual
--   from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and ('public' = any(roles) or 'anon' = any(roles))
--     and cmd = 'SELECT'
--   order by policyname;
