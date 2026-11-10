-- 038 — Un learner ne touche à rien du recrutement (phase 0, correctif)
--
-- ── Le trou, trouvé en test le 10/11/2026 ───────────────────────────────────
-- Un compte learner de test a pu CRÉER une offre. La policy d'insertion de la
-- migration 021, « jobs: creation proprietaire », n'exige que
-- `user_id = auth.uid()` : tout compte connecté, learner compris, peut créer
-- une offre à son nom, puis tout ce qui en dépend (simulation, candidats).
-- La migration 036 n'en est pas la cause — elle ne fait qu'AJOUTER des accès —
-- mais elle ne le corrigeait pas non plus.
--
-- ── La correction : des policies RESTRICTIVES ───────────────────────────────
-- Une policy restrictive s'applique EN PLUS des permissives (ET logique) : elle
-- ne donne rien, elle retire. Ici, une seule condition sur les six tables du
-- recrutement, pour toutes les opérations : l'appelant n'est pas un learner.
-- Un compte sans organisation (`onbord_org_role()` nul, ancien code) n'est pas
-- concerné : `coalesce(…, 'admin')`.
--
-- Additive au sens de la mission : aucune policy existante n'est retirée ni
-- réécrite, aucune donnée n'est touchée. Le service_role (le serveur, le
-- parcours candidat) contourne la RLS et n'est pas concerné.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente. Contrôle en fin de fichier.

begin;

drop policy if exists "jobs: pas de learner" on public.jobs;
create policy "jobs: pas de learner"
  on public.jobs as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

drop policy if exists "candidates: pas de learner" on public.candidates;
create policy "candidates: pas de learner"
  on public.candidates as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

drop policy if exists "job_skills: pas de learner" on public.job_skills;
create policy "job_skills: pas de learner"
  on public.job_skills as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

drop policy if exists "experience_chats: pas de learner" on public.experience_chats;
create policy "experience_chats: pas de learner"
  on public.experience_chats as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

-- `experiences` et `experience_steps` : le learner jouera des MODULES
-- (phase 3), mais toujours par le serveur, jamais en lecture directe. La
-- restriction peut donc couvrir ces tables aussi.
drop policy if exists "experiences: pas de learner" on public.experiences;
create policy "experiences: pas de learner"
  on public.experiences as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

drop policy if exists "experience_steps: pas de learner" on public.experience_steps;
create policy "experience_steps: pas de learner"
  on public.experience_steps as restrictive for all to authenticated
  using (coalesce(public.onbord_org_role(), 'admin') <> 'learner')
  with check (coalesce(public.onbord_org_role(), 'admin') <> 'learner');

commit;

-- ── Contrôle (à lancer à part) ──────────────────────────────────────────────
-- Attendu : 6 lignes, permissive = RESTRICTIVE.
--   select tablename, policyname, permissive from pg_policies
--   where schemaname = 'public' and policyname like '%pas de learner%';
