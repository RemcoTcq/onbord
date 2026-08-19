-- 022 — Fermer les cinq tables restées ouvertes à tous
--
-- Point 8 de l'audit du 19/08/2026, résolu par la lecture de pg_policies.
--
-- Ces cinq tables portaient des policies au rôle `public` avec la condition
-- `true` : lecture ET écriture ouvertes à n'importe qui muni de la clé anon,
-- laquelle est publiée dans le bundle navigateur.
--
-- Elles n'étaient pas apparues dans le relevé initial parce qu'elles sont
-- VIDES : une requête anon y renvoyait « 0 ligne », ce qui ressemble à une table
-- protégée. C'est précisément l'ambiguïté que le point 8 devait lever, et la
-- réponse est l'inverse de celle qu'on pouvait espérer — elles n'étaient pas
-- fermées, elles étaient vides.
--
--   interview_messages         SELECT x2, INSERT x2, et un ALL pour anon
--   interviews                 SELECT, INSERT, UPDATE
--   candidate_test_sessions    SELECT, INSERT, UPDATE
--   video_interview_responses  SELECT, INSERT, UPDATE
--   invite_tokens              SELECT true, UPDATE true
--
-- invite_tokens est le cas grave : la lecture ouverte permettait de LISTER
-- toutes les invitations en attente avec leur jeton et leur plan — et le plan
-- `admin` existe — tandis que l'UPDATE ouvert permettait d'en modifier une.
-- Se fabriquer un compte administrateur ne demandait que deux requêtes.
--
-- Rien ne fuit à cette date puisque les tables sont vides. Ce sont des portes
-- ouvertes sur des pièces encore vides, pas une fuite en cours.
--
-- ── Modèle retenu ────────────────────────────────────────────────────────────
-- Écriture : service_role uniquement. Les parcours candidat qui alimentaient ces
-- tables appartiennent au flux HÉRITÉ, neutralisé par EXPERIENCE_V1_ONLY = true.
-- Le flux actuel écrit dans run_step_responses, en deny-all depuis 011.
--
-- Lecture : conservée au recruteur propriétaire là où un écran en dépend —
-- getCandidateDetail() lit candidate_test_sessions et video_interview_responses
-- avec le client soumis à RLS pour afficher l'historique d'un candidat.
--
-- interviews et interview_messages n'apparaissent DANS AUCUN appel du code
-- (vérifié sur l'ensemble des .from() de src/) : tables mortes, deny-all total.
--
-- ⚠ PRÉREQUIS pour invite_tokens — changements de code déjà commités, à
-- DÉPLOYER AVANT cette migration :
--   /join                validateInviteToken() au lieu d'une lecture directe
--   /admin               adminListInviteTokens / Create / Delete
-- Sans eux, l'écran d'invitation et l'écran d'administration cessent de
-- fonctionner.

-- ── Purge ────────────────────────────────────────────────────────────────────
-- La RLS est PERMISSIVE : une seule policy accordant l'accès suffit à le donner.
-- On retire donc TOUT avant de reposer, sans quoi les nouvelles policies
-- s'ajouteraient aux anciennes sans rien fermer — c'est l'erreur commise en 018
-- sur storage.objects.

do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('interview_messages', 'interviews', 'candidate_test_sessions',
                        'video_interview_responses', 'invite_tokens')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

alter table public.interview_messages        enable row level security;
alter table public.interviews                enable row level security;
alter table public.candidate_test_sessions   enable row level security;
alter table public.video_interview_responses enable row level security;
alter table public.invite_tokens             enable row level security;


-- ── Lecture recruteur, sur ses propres candidats ─────────────────────────────

create policy "candidate_test_sessions: lecture recruteur proprietaire"
  on public.candidate_test_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.candidates c
      join public.jobs j on j.id = c.job_id
      where c.id = candidate_test_sessions.candidate_id
        and j.user_id = auth.uid()
    )
  );

create policy "video_interview_responses: lecture recruteur proprietaire"
  on public.video_interview_responses for select
  to authenticated
  using (
    exists (
      select 1 from public.candidates c
      join public.jobs j on j.id = c.job_id
      where c.id = video_interview_responses.candidate_id
        and j.user_id = auth.uid()
    )
  );

-- interviews, interview_messages, invite_tokens : AUCUNE policy.
-- RLS active sans policy = personne ne passe, sauf le service_role. C'est le
-- modèle des tables du run (migration 011), et il est ici volontaire :
--   - interviews / interview_messages : plus aucun appel dans le code ;
--   - invite_tokens : tous les accès légitimes passent désormais par les
--     server actions de lib/actions/usage.js, en service_role.


-- ── Contrôle ─────────────────────────────────────────────────────────────────
-- Ne doit renvoyer AUCUNE ligne :
--
--   select tablename, policyname, cmd, roles::text
--   from pg_policies
--   where schemaname = 'public'
--     and ('anon' = any(roles) or 'public' = any(roles))
--     and coalesce(qual, with_check, 'true') = 'true';
