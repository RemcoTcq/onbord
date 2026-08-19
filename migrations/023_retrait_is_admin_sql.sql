-- 023 — Retirer is_admin(), la règle « @onbord.be » restée en base
--
-- Le lot de correctifs du 19/08/2026 avait remplacé la règle applicative
-- (lib/utils/admin.js : suffixe @onbord.be + une adresse Gmail personnelle
-- codée en dur) par une liste explicite en variable d'environnement.
--
-- Ce correctif était INCOMPLET. La même règle vivait aussi en SQL :
--
--     CREATE FUNCTION is_admin() ... RETURN (
--       auth.jwt() ->> 'email' LIKE '%@onbord.be'
--       OR auth.jwt() ->> 'email' = 'rem.tacq@gmail.com'
--     );
--
-- et quatre policies l'appelaient. La plus lourde de conséquences est sur
-- `candidates` :
--
--     USING (jobs.user_id = auth.uid() OR is_admin())
--
-- N'importe quel compte dont l'adresse se termine en @onbord.be lisait et
-- modifiait donc les candidats de TOUS les recruteurs. Ce n'est pas seulement
-- une élévation de privilèges : c'est une brèche entre locataires, sur les
-- données personnelles de candidats qui ne sont pas les siens. Idem sur
-- job_skills, interview_messages et user_usage.
--
-- ── Pourquoi supprimer plutôt que réécrire ───────────────────────────────────
-- On pourrait faire lire à is_admin() une table d'administrateurs. Ce serait
-- une SECONDE source de vérité, à tenir synchronisée avec ADMIN_EMAILS — et
-- deux listes d'administrateurs qui divergent, c'est la faille de demain.
--
-- Les écrans qui dépendaient de ce contournement lisaient la base DEPUIS LE
-- NAVIGATEUR. Ils passent maintenant par des server actions en service_role,
-- gardées par requireAdmin(), donc par ADMIN_EMAILS. Le contournement SQL n'a
-- plus d'objet : une seule liste, côté serveur, et la RLS n'a plus à connaître
-- la notion d'administrateur.
--
-- ⚠ PRÉREQUIS — changement de code déjà commité, à DÉPLOYER AVANT :
--   /admin/billing   adminListUserUsage() au lieu de lire user_usage
-- Sans lui, l'écran de facturation se vide.
--
-- Vérifié avant d'écrire : les autres lectures de user_usage (UsageWidget,
-- lib/utils/limits.js) ne portent que sur la ligne de l'utilisateur lui-même,
-- couverte par `auth.uid() = user_id`. Elles ne dépendent pas de is_admin().

-- ── candidates ───────────────────────────────────────────────────────────────
-- Cette policy ALL doublonnait déjà les quatre policies par verbe qui la
-- suivent, toutes correctement limitées au propriétaire. Elle n'ajoutait donc
-- rien d'autre que le contournement admin : on la retire sans la remplacer.
drop policy if exists "Users can access candidates of their own jobs" on public.candidates;

-- ── job_skills ───────────────────────────────────────────────────────────────
-- Même structure : une policy ALL avec contournement, en doublon des trois
-- policies par verbe déjà limitées au propriétaire. Il manquait cependant
-- UPDATE, que la policy ALL couvrait — on le repose explicitement.
drop policy if exists "Users can access skills of their own jobs" on public.job_skills;

create policy "job_skills: modification proprietaire"
  on public.job_skills for update
  to authenticated
  using (
    exists (select 1 from public.jobs j where j.id = job_skills.job_id and j.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.jobs j where j.id = job_skills.job_id and j.user_id = auth.uid())
  );

-- ── user_usage ───────────────────────────────────────────────────────────────
-- La lecture admin passe désormais par adminListUserUsage(), en service_role.
drop policy if exists "Users can see their own usage" on public.user_usage;

create policy "user_usage: lecture de sa propre consommation"
  on public.user_usage for select
  to authenticated
  using (auth.uid() = user_id);

-- ── interview_messages ───────────────────────────────────────────────────────
-- Déjà traitée par la migration 022, qui purge toutes ses policies : la policy
-- appelant is_admin() a donc disparu avec les autres. Rien à faire ici, mais on
-- le note pour que la liste des quatre appelants soit close.

-- ── La fonction elle-même ────────────────────────────────────────────────────
-- Plus aucun appelant. On la supprime plutôt que de la laisser dormir : une
-- fonction qui accorde l'administration sur un suffixe d'e-mail ne doit pas
-- rester à portée de main, prête à être rebranchée par mégarde dans une future
-- policy. `restrict` (défaut) fait échouer la suppression s'il subsiste une
-- dépendance — c'est le filet voulu.
drop function if exists public.is_admin();


-- ── Contrôle ─────────────────────────────────────────────────────────────────
-- Les deux requêtes doivent renvoyer zéro ligne :
--
--   select proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname = 'is_admin';
--
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' and coalesce(qual, with_check) like '%is_admin%';
