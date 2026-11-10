-- 042 — L'onboarding : modules, programmes, assignations (phase 2, docs/PLAN.md)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
--   modules            une simulation d'entraînement : titre, objectif, rôle
--                      cible, situation travaillée, difficulté, score minimum,
--                      langue de simulation (fr | en | nl)
--   experiences.module_id
--                      la simulation d'un module, comme `job_id` pour une
--                      offre. Une copie de version (experienceVersion.js) le
--                      reprend : le module suit toujours sa dernière version.
--   programs           une liste ordonnée de modules pour un rôle (modèle de
--   program_modules    départ, facultatif)
--   assignments        un module assigné à un learner : échéance, statut
--                      (assigned → in_progress → passed → validated)
--   organization_members.lifecycle
--                      onboarding | ready | training (extensible), et quand /
--                      par qui la personne a été marquée prête
--   organizations.auto_validate
--                      valider seul un module au score minimum (faux par défaut :
--                      c'est le manager qui valide)
--   candidate_runs.assignment_id
--                      la clé étrangère de la colonne posée par 041
--
-- ── Sécurité ────────────────────────────────────────────────────────────────
-- Modules, programmes : lecture par les admins et managers. Assignations :
-- lecture par les admins et managers de l'organisation, ET par le learner pour
-- les SIENNES. Passages (`candidate_runs`) : le learner lit les SIENS. Toutes
-- les écritures passent par le serveur (service_role), qui vérifie le rôle.
-- Rien d'anonyme. Les policies restrictives de 038 tiennent toujours le
-- learner hors des simulations elles-mêmes : il les joue par le serveur.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive. Aucune donnée existante touchée.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente. Contrôles en fin de fichier.

begin;

-- ── 1. Modules ──────────────────────────────────────────────────────────────

create table if not exists public.modules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  objective       text,
  target_role     text,
  situation       text,
  difficulty      text not null default 'medium',
  min_score       integer not null default 70,
  locale          text not null default 'en',
  criteria        jsonb not null default '{}'::jsonb,   -- compétences travaillées, forme de jobs.extracted_criteria
  created_by      uuid references auth.users(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint modules_difficulte_valide check (difficulty in ('easy', 'medium', 'hard')),
  constraint modules_score_valide check (min_score between 0 and 100),
  constraint modules_langue_valide check (locale in ('fr', 'en', 'nl'))
);
create index if not exists idx_modules_org on public.modules(organization_id, updated_at desc);

alter table public.experiences
  add column if not exists module_id uuid references public.modules(id) on delete set null;
create index if not exists idx_experiences_module on public.experiences(module_id);

-- ── 2. Programmes ───────────────────────────────────────────────────────────

create table if not exists public.programs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  target_role     text,
  description     text,
  created_by      uuid references auth.users(id) on delete set null,
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_programs_org on public.programs(organization_id);

create table if not exists public.program_modules (
  program_id uuid not null references public.programs(id) on delete cascade,
  module_id  uuid not null references public.modules(id) on delete cascade,
  position   integer not null default 0,
  primary key (program_id, module_id)
);

-- ── 3. Assignations ─────────────────────────────────────────────────────────

create table if not exists public.assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module_id       uuid not null references public.modules(id) on delete cascade,
  learner_id      uuid not null references auth.users(id) on delete cascade,
  program_id      uuid references public.programs(id) on delete set null,
  due_at          timestamptz,
  status          text not null default 'assigned',
  best_score      integer,
  passed_at       timestamptz,
  validated_at    timestamptz,
  validated_by    uuid references auth.users(id) on delete set null,
  assigned_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint assignments_statut_valide check (status in ('assigned', 'in_progress', 'passed', 'validated')),
  constraint assignments_une_par_module unique (module_id, learner_id)
);
create index if not exists idx_assignments_learner on public.assignments(learner_id);
create index if not exists idx_assignments_org on public.assignments(organization_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'candidate_runs_assignment_fk') then
    alter table public.candidate_runs
      add constraint candidate_runs_assignment_fk
      foreign key (assignment_id) references public.assignments(id) on delete set null;
  end if;
end $$;

-- ── 4. Cycle de vie du learner, validation automatique ──────────────────────

alter table public.organization_members
  add column if not exists lifecycle text,
  add column if not exists ready_at timestamptz,
  add column if not exists ready_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'organization_members_lifecycle_valide') then
    alter table public.organization_members
      add constraint organization_members_lifecycle_valide
      check (lifecycle is null or lifecycle in ('onboarding', 'ready', 'training'));
  end if;
end $$;

-- Les learners déjà là commencent en onboarding.
update public.organization_members set lifecycle = 'onboarding'
where role = 'learner' and lifecycle is null;

alter table public.organizations
  add column if not exists auto_validate boolean not null default false;

-- ── 5. RLS ──────────────────────────────────────────────────────────────────

alter table public.modules         enable row level security;
alter table public.programs        enable row level security;
alter table public.program_modules enable row level security;
alter table public.assignments     enable row level security;

drop policy if exists "modules: lecture gestion" on public.modules;
create policy "modules: lecture gestion"
  on public.modules for select to authenticated
  using (public.onbord_gere_org(organization_id));

drop policy if exists "programs: lecture gestion" on public.programs;
create policy "programs: lecture gestion"
  on public.programs for select to authenticated
  using (public.onbord_gere_org(organization_id));

drop policy if exists "program_modules: lecture gestion" on public.program_modules;
create policy "program_modules: lecture gestion"
  on public.program_modules for select to authenticated
  using (exists (select 1 from public.programs p where p.id = program_modules.program_id and public.onbord_gere_org(p.organization_id)));

drop policy if exists "assignments: lecture gestion ou learner" on public.assignments;
create policy "assignments: lecture gestion ou learner"
  on public.assignments for select to authenticated
  using (learner_id = auth.uid() or public.onbord_gere_org(organization_id));

drop policy if exists "candidate_runs: lecture du learner" on public.candidate_runs;
create policy "candidate_runs: lecture du learner"
  on public.candidate_runs for select to authenticated
  using (learner_id = auth.uid());

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. Les quatre tables et leurs policies (attendu : 5 lignes).
--    select tablename, policyname from pg_policies
--    where policyname in ('modules: lecture gestion', 'programs: lecture gestion',
--      'program_modules: lecture gestion', 'assignments: lecture gestion ou learner',
--      'candidate_runs: lecture du learner');
-- 2. La colonne du module sur les simulations (attendu : 1 ligne).
--    select column_name from information_schema.columns
--    where table_name = 'experiences' and column_name = 'module_id';
