-- 040 — Bibliothèque de personnages (phase 1 de l'onboarding, docs/PLAN.md)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
-- Jusqu'ici, un personnage (le client simulé d'une étape « persona ») vivait
-- DANS l'étape, `experience_steps.config.persona`, et n'existait nulle part
-- ailleurs. La table `personas` en fait une fiche de l'ORGANISATION,
-- réutilisable d'une simulation à l'autre, recrutement comme onboarding.
--
--   name, role, company   pour la liste
--   data                  la fiche complète, dans la forme de normaliserPersona
--                         (lib/persona.js) : personnalité, humeur, objectifs,
--                         objections, infos cachées, voix, langue…
--   fingerprint           md5 de la fiche : la même fiche n'entre qu'une fois
--
-- ── L'étape garde SA copie ──────────────────────────────────────────────────
-- `config.persona` reste dans l'étape : c'est la version FIGÉE que joue le
-- candidat (une version de simulation commencée ne bouge plus,
-- lib/experienceVersion.js). L'étape gagne seulement `config.persona_id`, le
-- lien vers la fiche de la bibliothèque. Modifier la fiche ne modifie pas une
-- simulation déjà passée ; l'éditeur propose de reprendre la fiche à jour.
-- `persona_id` ne part jamais chez le candidat (sanitizeStepForCandidate).
--
-- ── Données migrées ─────────────────────────────────────────────────────────
-- Une fiche par personnage DISTINCT de chaque organisation (les copies de
-- version d'une même simulation portent la même fiche : une seule ligne), et
-- `config.persona_id` posé sur chaque étape qui la porte. C'est la seule
-- écriture sur des données existantes : l'AJOUT d'une clé dans `config`, sans
-- rien retirer ni changer. Le parcours candidat ne la lit pas.
--
-- ── Sécurité ────────────────────────────────────────────────────────────────
-- Lecture par les admins et managers de l'organisation ; écriture par le
-- serveur seulement. Aucun accès learner ni anonyme.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente : rejouée, elle ne crée aucun doublon.

begin;

create table if not exists public.personas (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  role            text,
  company         text,
  data            jsonb not null default '{}'::jsonb,
  fingerprint     text not null,
  created_by      uuid references auth.users(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint personas_une_fiche_par_empreinte unique (organization_id, fingerprint)
);

create index if not exists idx_personas_org on public.personas(organization_id, updated_at desc);

alter table public.personas enable row level security;

drop policy if exists "personas: lecture gestion" on public.personas;
create policy "personas: lecture gestion"
  on public.personas for select to authenticated
  using (public.onbord_gere_org(organization_id));

-- ── Les personnages existants ───────────────────────────────────────────────

insert into public.personas (organization_id, name, role, company, data, fingerprint, created_at)
select distinct on (e.organization_id, md5((s.config->'persona')::text))
  e.organization_id,
  s.config->'persona'->>'name',
  nullif(s.config->'persona'->>'role', ''),
  nullif(s.config->'persona'->>'company', ''),
  s.config->'persona',
  md5((s.config->'persona')::text),
  s.created_at
from public.experience_steps s
join public.experiences e on e.id = s.experience_id
where e.organization_id is not null
  and jsonb_typeof(s.config->'persona') = 'object'
  and coalesce(s.config->'persona'->>'name', '') <> ''
order by e.organization_id, md5((s.config->'persona')::text), s.created_at
on conflict (organization_id, fingerprint) do nothing;

update public.experience_steps s
set config = s.config || jsonb_build_object('persona_id', p.id::text)
from public.experiences e, public.personas p
where e.id = s.experience_id
  and p.organization_id = e.organization_id
  and p.fingerprint = md5((s.config->'persona')::text)
  and jsonb_typeof(s.config->'persona') = 'object'
  and not (s.config ? 'persona_id');

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. Les fiches créées, par organisation.
--    select organization_id, count(*) from public.personas group by 1;
-- 2. Aucune étape à personnage sans lien (attendu : 0).
--    select count(*) from public.experience_steps
--    where jsonb_typeof(config->'persona') = 'object' and not (config ? 'persona_id');
