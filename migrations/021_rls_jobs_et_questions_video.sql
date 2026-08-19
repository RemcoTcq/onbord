-- 021 — Point 3 : fermer `jobs` et `video_interview_questions` au rôle anon
--
-- NON APPLIQUÉE. À exécuter après validation, ET conjointement au changement de
-- code décrit plus bas — sans lui, la page publique de candidature casse.
--
-- Constat de l'audit : la clé anon lisait `jobs` en `select=*`, soit `user_id`,
-- `extracted_criteria`, `ai_interview_config`, `assessment_config` et
-- `saved_flow_nodes` — la configuration complète du pipeline d'évaluation de
-- chaque recruteur, brouillons compris.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POURQUOI CE N'EST PAS QU'UNE AFFAIRE DE POLICY
--
-- `jobs` DOIT rester lisible par un visiteur anonyme : la page /apply/<job_id>
-- affiche l'offre à des candidats qui n'ont pas de compte. Elle passe par
-- getPublicJobAndBranding(), qui fait aujourd'hui `.select('*')` avec le client
-- soumis à RLS — donc en rôle `anon`.
--
-- Une policy ne sait pas restreindre les COLONNES. Deux options :
--
--   (a) garder une policy anon sur les offres publiées, et retirer le droit
--       SELECT d'anon colonne par colonne (revoke/grant) ;
--   (b) faire lire l'offre par le service_role dans getPublicJobAndBranding(),
--       en ne renvoyant au navigateur que les champs d'affichage, et fermer
--       entièrement `jobs` à anon.
--
-- (b) est retenue : la liste des colonnes publiques devient explicite dans le
-- code, relue à chaque revue, au lieu d'être un état de grants invisible que
-- toute nouvelle colonne rouvrirait par défaut. C'est aussi le motif déjà
-- employé partout ailleurs dans le parcours candidat.
--
-- /!\ PRÉREQUIS — deux changements de code, DÉJÀ COMMITÉS, mais qui doivent être
-- DÉPLOYÉS AVANT cette migration, sans quoi le parcours candidat casse :
--
--   getPublicJobAndBranding()  lit en service_role et ne renvoie que
--                              id / title / status + le nœud d'accueil.
--                              Sinon : /apply n'affiche plus l'offre.
--   applyForJob()              lit `jobs` en service_role.
--                              Sinon : « Offre d'emploi introuvable » sur
--                              TOUTES les candidatures.
--
-- Ce second point est exactement le piège tendu par la migration 018 sur le
-- stockage : une policy fermée ne casse rien tant qu'un chemin permissif
-- subsiste, et tout tombe à la seconde où on le retire. Les lectures anonymes
-- de `jobs` ont donc été recensées une par une avant d'écrire ce fichier.
--
-- Restent en client soumis à RLS, et c'est correct — appelants tous
-- authentifiés : deleteJob, scoreCandidate, getJobDetail, updateJobDetails,
-- updateJobDescription, updateJobAiConfig, createRoleQuick, getExperienceForJob,
-- saveAssessmentConfig, saveVideoInterviewConfig, generateVideoQuestions,
-- selectQuestionsForJob, runExperienceGeneration.
--
-- UNE EXCEPTION CONNUE ET ASSUMÉE : submitAssessment() (assessment.js) lit
-- `jobs` en client RLS alors que son appelant est un candidat ANONYME. Elle
-- appartient au parcours hérité, neutralisé par EXPERIENCE_V1_ONLY = true, et
-- ne s'exécute donc jamais aujourd'hui. Si ce parcours est réveillé, elle devra
-- passer en service_role avant.
--
-- Le filtre sur `status` rejoint la digue déjà posée dans applyForJob : une
-- offre en brouillon ne doit ni s'afficher, ni accepter de candidature.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.jobs                      enable row level security;
alter table public.video_interview_questions enable row level security;

do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('jobs', 'video_interview_questions')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ── jobs : strictement le propriétaire ───────────────────────────────────────
-- L'accès public passe désormais par le service_role, qui contourne la RLS.

create policy "jobs: lecture proprietaire"
  on public.jobs for select
  to authenticated
  using (user_id = auth.uid());

create policy "jobs: creation proprietaire"
  on public.jobs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "jobs: modification proprietaire"
  on public.jobs for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "jobs: suppression proprietaire"
  on public.jobs for delete
  to authenticated
  using (user_id = auth.uid());

-- ── video_interview_questions : bibliothèque partagée ────────────────────────
-- Même raisonnement que la banque de tests (migration 019) : aucun composant
-- client ne l'interroge, la seule lecture est getVideoQuestionLibrary(), server
-- action appelée par un recruteur connecté.

create policy "video_interview_questions: lecture authentifiee"
  on public.video_interview_questions for select
  to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- À VÉRIFIER APRÈS APPLICATION — les écrans qui lisent `jobs` depuis le
-- NAVIGATEUR avec le client anon/authenticated continuent de fonctionner
-- (ils sont couverts par la policy propriétaire, mais la liste vaut d'être
-- reparcourue) :
--   src/app/(dashboard)/jobs/page.js, jobs/[id]/page.js, talents/[id]/page.js
-- Et surtout : /apply/<job_id> en navigation privée, sur une offre publiée
-- comme sur un brouillon.
-- ─────────────────────────────────────────────────────────────────────────────
