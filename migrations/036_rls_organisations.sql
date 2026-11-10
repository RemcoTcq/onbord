-- 036 — Accès par organisation (phase 0 de l'onboarding, docs/PLAN.md)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
-- Les policies d'aujourd'hui donnent tout au PROPRIÉTAIRE d'une offre
-- (`jobs.user_id = auth.uid()`). Celles-ci donnent la même chose aux ADMINS et
-- MANAGERS de l'organisation de l'offre (`onbord_gere_org`, migration 035).
-- Un learner n'en reçoit aucune : il ne voit ni les offres, ni les candidats,
-- ni les simulations du recrutement.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- ADDITIVE : aucune policy existante n'est retirée ni modifiée. La RLS de
-- PostgreSQL est permissive (les policies s'additionnent) : pour un compte qui
-- est seul dans son organisation, ce qu'il voit ne change pas.
--
-- ── Les déclencheurs : l'organisation n'est pas une donnée du client ────────
-- La policy d'insertion de 021 ne vérifie que `user_id = auth.uid()`. Sans
-- garde, un compte pourrait créer une offre avec l'`organization_id` d'une
-- AUTRE organisation, qui la verrait alors apparaître chez elle. Les
-- déclencheurs ci-dessous posent l'organisation EUX-MÊMES, depuis le compte
-- connecté, et l'empêchent de changer ensuite. Le code de production actuel,
-- qui ne connaît pas `organization_id`, voit donc ses nouvelles offres
-- rattachées automatiquement : rien à déployer avant cette migration.
--
-- Côté serveur (service_role, auth.uid() nul), la valeur fournie est gardée,
-- ou déduite de l'offre pour une simulation.
--
-- ── Stockage : le bucket `logos` ────────────────────────────────────────────
-- Les policies héritées « Allow authenticated insert/delete access for logos »
-- laissaient TOUT compte connecté remplacer ou supprimer le logo d'une autre
-- entreprise (audit, S2). Elles sont remplacées : on n'écrit que dans le
-- dossier de SON organisation (admin ou manager), ou dans son propre dossier
-- utilisateur (le chemin d'avant, `<user_id>/logo-…`) tant qu'on n'est pas
-- learner. La lecture publique ne change pas (les logos s'affichent aux
-- candidats).
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc dans le SQL Editor. Idempotente. Contrôles en fin de fichier.

begin;

-- ── 1. Les déclencheurs d'organisation ──────────────────────────────────────

create or replace function public.onbord_jobs_organisation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  org uuid := public.onbord_org_id();
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.organization_id := org;              -- l'organisation de celui qui crée
    end if;
  elsif auth.uid() is not null then
    new.organization_id := old.organization_id; -- figée après création
  end if;
  return new;
end;
$$;

drop trigger if exists trg_jobs_organisation on public.jobs;
create trigger trg_jobs_organisation
  before insert or update on public.jobs
  for each row execute function public.onbord_jobs_organisation();

create or replace function public.onbord_experiences_organisation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.organization_id := public.onbord_org_id();
    end if;
    if new.organization_id is null and new.job_id is not null then
      select organization_id into new.organization_id from public.jobs where id = new.job_id;
    end if;
  elsif auth.uid() is not null then
    new.organization_id := old.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_experiences_organisation on public.experiences;
create trigger trg_experiences_organisation
  before insert or update on public.experiences
  for each row execute function public.onbord_experiences_organisation();

-- ── 2. jobs ─────────────────────────────────────────────────────────────────
-- La corbeille (`deleted_at`, migration 024) reste filtrée par la policy.

drop policy if exists "jobs: lecture organisation" on public.jobs;
create policy "jobs: lecture organisation"
  on public.jobs for select to authenticated
  using (public.onbord_gere_org(organization_id) and deleted_at is null);

drop policy if exists "jobs: creation organisation" on public.jobs;
create policy "jobs: creation organisation"
  on public.jobs for insert to authenticated
  with check (user_id = auth.uid() and public.onbord_gere_org(public.onbord_org_id()));

drop policy if exists "jobs: modification organisation" on public.jobs;
create policy "jobs: modification organisation"
  on public.jobs for update to authenticated
  using (public.onbord_gere_org(organization_id))
  with check (public.onbord_gere_org(organization_id));

drop policy if exists "jobs: suppression organisation" on public.jobs;
create policy "jobs: suppression organisation"
  on public.jobs for delete to authenticated
  using (public.onbord_gere_org(organization_id));

-- ── 3. experiences (avec ou sans offre) ─────────────────────────────────────
-- Pas de policy DELETE, comme pour le propriétaire : une version ratée est
-- archivée, pas supprimée (experienceVersion.js).

drop policy if exists "experiences: lecture organisation" on public.experiences;
create policy "experiences: lecture organisation"
  on public.experiences for select to authenticated
  using (public.onbord_gere_org(organization_id));

drop policy if exists "experiences: creation organisation" on public.experiences;
create policy "experiences: creation organisation"
  on public.experiences for insert to authenticated
  with check (public.onbord_gere_org(public.onbord_org_id()));

drop policy if exists "experiences: modification organisation" on public.experiences;
create policy "experiences: modification organisation"
  on public.experiences for update to authenticated
  using (public.onbord_gere_org(organization_id))
  with check (public.onbord_gere_org(organization_id));

-- ── 4. experience_steps (par la simulation) ─────────────────────────────────

drop policy if exists "experience_steps: lecture organisation" on public.experience_steps;
create policy "experience_steps: lecture organisation"
  on public.experience_steps for select to authenticated
  using (exists (select 1 from public.experiences e
                 where e.id = experience_steps.experience_id and public.onbord_gere_org(e.organization_id)));

drop policy if exists "experience_steps: creation organisation" on public.experience_steps;
create policy "experience_steps: creation organisation"
  on public.experience_steps for insert to authenticated
  with check (exists (select 1 from public.experiences e
                      where e.id = experience_steps.experience_id and public.onbord_gere_org(e.organization_id)));

drop policy if exists "experience_steps: modification organisation" on public.experience_steps;
create policy "experience_steps: modification organisation"
  on public.experience_steps for update to authenticated
  using (exists (select 1 from public.experiences e
                 where e.id = experience_steps.experience_id and public.onbord_gere_org(e.organization_id)))
  with check (exists (select 1 from public.experiences e
                      where e.id = experience_steps.experience_id and public.onbord_gere_org(e.organization_id)));

drop policy if exists "experience_steps: suppression organisation" on public.experience_steps;
create policy "experience_steps: suppression organisation"
  on public.experience_steps for delete to authenticated
  using (exists (select 1 from public.experiences e
                 where e.id = experience_steps.experience_id and public.onbord_gere_org(e.organization_id)));

-- ── 5. Tables rattachées à l'offre ──────────────────────────────────────────
-- candidates, job_skills, experience_chats : l'offre dit l'organisation.

drop policy if exists "candidates: lecture organisation" on public.candidates;
create policy "candidates: lecture organisation"
  on public.candidates for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = candidates.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "candidates: creation organisation" on public.candidates;
create policy "candidates: creation organisation"
  on public.candidates for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = candidates.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "candidates: modification organisation" on public.candidates;
create policy "candidates: modification organisation"
  on public.candidates for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = candidates.job_id and public.onbord_gere_org(j.organization_id)))
  with check (exists (select 1 from public.jobs j where j.id = candidates.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "candidates: suppression organisation" on public.candidates;
create policy "candidates: suppression organisation"
  on public.candidates for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = candidates.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "job_skills: lecture organisation" on public.job_skills;
create policy "job_skills: lecture organisation"
  on public.job_skills for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_skills.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "job_skills: creation organisation" on public.job_skills;
create policy "job_skills: creation organisation"
  on public.job_skills for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = job_skills.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "job_skills: modification organisation" on public.job_skills;
create policy "job_skills: modification organisation"
  on public.job_skills for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_skills.job_id and public.onbord_gere_org(j.organization_id)))
  with check (exists (select 1 from public.jobs j where j.id = job_skills.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "job_skills: suppression organisation" on public.job_skills;
create policy "job_skills: suppression organisation"
  on public.job_skills for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_skills.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "experience_chats: lecture organisation" on public.experience_chats;
create policy "experience_chats: lecture organisation"
  on public.experience_chats for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "experience_chats: creation organisation" on public.experience_chats;
create policy "experience_chats: creation organisation"
  on public.experience_chats for insert to authenticated
  with check (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "experience_chats: modification organisation" on public.experience_chats;
create policy "experience_chats: modification organisation"
  on public.experience_chats for update to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and public.onbord_gere_org(j.organization_id)))
  with check (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and public.onbord_gere_org(j.organization_id)));

drop policy if exists "experience_chats: suppression organisation" on public.experience_chats;
create policy "experience_chats: suppression organisation"
  on public.experience_chats for delete to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and public.onbord_gere_org(j.organization_id)));

-- ── 6. Stockage : `logos` ───────────────────────────────────────────────────

drop policy if exists "Allow authenticated insert access for logos" on storage.objects;
drop policy if exists "Allow authenticated delete access for logos" on storage.objects;

drop policy if exists "logos: depot organisation" on storage.objects;
create policy "logos: depot organisation"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos' and (
      ((storage.foldername(name))[1] = public.onbord_org_id()::text and public.onbord_gere_org(public.onbord_org_id()))
      or ((storage.foldername(name))[1] = auth.uid()::text and coalesce(public.onbord_org_role(), 'admin') <> 'learner')
    )
  );

drop policy if exists "logos: remplacement organisation" on storage.objects;
create policy "logos: remplacement organisation"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos' and (
      ((storage.foldername(name))[1] = public.onbord_org_id()::text and public.onbord_gere_org(public.onbord_org_id()))
      or ((storage.foldername(name))[1] = auth.uid()::text and coalesce(public.onbord_org_role(), 'admin') <> 'learner')
    )
  );

drop policy if exists "logos: suppression organisation" on storage.objects;
create policy "logos: suppression organisation"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos' and (
      ((storage.foldername(name))[1] = public.onbord_org_id()::text and public.onbord_gere_org(public.onbord_org_id()))
      or ((storage.foldername(name))[1] = auth.uid()::text and coalesce(public.onbord_org_role(), 'admin') <> 'learner')
    )
  );

commit;

-- ── Contrôles (à lancer à part, après) ──────────────────────────────────────
-- 1. Les policies « organisation » sont là (attendu : 23 lignes).
--    select tablename, policyname from pg_policies
--    where schemaname = 'public' and policyname like '%organisation%' order by 1, 2;
--
-- 2. Plus aucune policy d'écriture ouverte sur `logos` (attendu : les trois
--    « logos: … organisation », et la lecture publique d'origine).
--    select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and (qual like '%logos%' or with_check like '%logos%');
--
-- 3. Les déclencheurs (attendu : 2 lignes).
--    select tgname from pg_trigger where tgname in ('trg_jobs_organisation', 'trg_experiences_organisation');
