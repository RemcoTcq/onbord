-- 044 — Du recrutement à l'onboarding (phase 4 de l'onboarding, docs/PLAN.md)
--
-- ── Le besoin ───────────────────────────────────────────────────────────────
-- Un candidat embauché devient learner. Le manager l'invite depuis sa fiche
-- (« Passer en onboarding ») : l'invitation garde le candidat d'origine. À
-- l'activation de son compte, la nouvelle recrue CHOISIT si ses résultats de
-- la simulation de recrutement servent à orienter son entraînement. Si oui,
-- ses lacunes (points de contrôle notés 0 ou 1) sont copiées sur sa fiche de
-- membre, et le manager s'en sert pour choisir ses premiers modules.
--
-- ── Deux traces de consentement ─────────────────────────────────────────────
--   • `org_invitations.results_reuse_informed_at` : le manager atteste, en
--     envoyant l'invitation, avoir prévenu le candidat ;
--   • `organization_members.results_reuse_accepted_at` : la recrue a accepté,
--     elle-même, à l'activation de son compte. Sans cette date, rien n'est
--     repris.
--
-- ── Pourquoi une COPIE des lacunes ──────────────────────────────────────────
-- `hiring_gaps` fige ce que la recrue a accepté de partager, au moment où elle
-- l'a accepté. La candidature peut être supprimée ensuite (corbeille, purge) :
-- la fiche du learner ne dépend plus des tables du recrutement, auxquelles un
-- learner n'a d'ailleurs aucun accès (migration 038).
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive : cinq colonnes facultatives. Aucune donnée touchée, aucune policy
-- changée (les deux tables ne s'écrivent qu'en service_role).
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente.

begin;

alter table public.org_invitations
  add column if not exists source_candidate_id uuid references public.candidates(id) on delete set null,
  add column if not exists results_reuse_informed_at timestamptz;

alter table public.organization_members
  add column if not exists source_candidate_id uuid references public.candidates(id) on delete set null,
  add column if not exists results_reuse_accepted_at timestamptz,
  add column if not exists hiring_gaps jsonb;

commit;