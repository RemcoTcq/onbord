-- 035 — Organisations multi-utilisateurs (phase 0 de l'onboarding, docs/PLAN.md)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
-- Jusqu'ici, l'« entreprise » n'existait pas : c'étaient des colonnes de
-- `public.users` (company_name, company_ai_context, logo, couleurs), et tout
-- appartenait à UN utilisateur (`jobs.user_id = auth.uid()`). Pour inviter des
-- managers et des learners, il faut une organisation dont plusieurs comptes
-- sont membres :
--
--   organizations          l'entreprise (copie des colonnes company_* de users)
--   organization_members   qui en fait partie, avec quel rôle
--                          (admin | manager | learner) — un compte, UNE organisation
--   org_invitations        invitations par e-mail (jeton haché, rôle, expiration)
--
-- et deux colonnes de rattachement, `jobs.organization_id` et
-- `experiences.organization_id`.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- STRICTEMENT ADDITIVE. Rien n'est supprimé ni renommé : les colonnes company_*
-- de `users` restent, `jobs.user_id` reste, et toutes les policies existantes
-- (par user_id) restent en place. Le code actuellement en production ne lit
-- aucune des nouvelles tables : il continue de fonctionner à l'identique. On
-- peut donc appliquer cette migration AVANT le code qui s'en sert.
--
-- ── Données migrées ─────────────────────────────────────────────────────────
-- Chaque utilisateur existant reçoit SON organisation (ses colonnes company_*
-- recopiées) et en devient `admin`. Ses offres et ses simulations y sont
-- rattachées. `legacy_user_id` retient de quel utilisateur l'organisation est
-- issue : c'est ce qui rend la migration rejouable sans créer de doublon.
--
-- ── Sécurité ────────────────────────────────────────────────────────────────
-- RLS activée sur les trois tables. Lecture seulement, et seulement pour les
-- membres ; TOUTES les écritures passent par le serveur (service_role), qui
-- vérifie le rôle. Aucun accès anonyme. Les invitations n'ont AUCUNE policy :
-- leur jeton ne doit jamais être lisible depuis un navigateur.
--
-- Les fonctions onbord_* sont SECURITY DEFINER : une policy qui lirait
-- `organization_members` sous la RLS de l'appelant tournerait en rond (la
-- policy de members appellerait members). Elles ne renvoient qu'un identifiant,
-- un rôle ou un booléen, jamais une ligne.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc dans le SQL Editor. Idempotente : la relancer ne change rien.
-- Vérification en fin de fichier (à lancer à part).

begin;

-- ── 1. Les tables ───────────────────────────────────────────────────────────

create table if not exists public.organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text,
  website_url           text,
  ai_context            jsonb not null default '{}'::jsonb,  -- résumé du site (même forme que users.company_ai_context)
  logo_url              text,
  brand_primary_color   text,
  brand_secondary_color text,
  created_by            uuid references auth.users(id) on delete set null,
  legacy_user_id        uuid unique,                          -- l'utilisateur dont elle est issue (migration)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.organizations is
  'L''entreprise cliente. Remplace les colonnes company_* de users, qui restent pour la rétrocompatibilité mais ne sont plus écrites.';

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null,
  invited_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_un_seul_compte unique (user_id),
  constraint organization_members_role_valide check (role in ('admin', 'manager', 'learner'))
);

create index if not exists idx_org_members_org on public.organization_members(organization_id);

comment on table public.organization_members is
  'Appartenance d''un compte à UNE organisation, avec son rôle (admin | manager | learner).';

create table if not exists public.org_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text not null,
  role            text not null,
  locale          text not null default 'en',
  token_hash      text not null unique,          -- sha-256 du jeton envoyé par e-mail ; le jeton lui-même n'est jamais stocké
  invited_by      uuid references auth.users(id) on delete set null,
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users(id) on delete set null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  constraint org_invitations_role_valide check (role in ('admin', 'manager', 'learner')),
  constraint org_invitations_locale_valide check (locale in ('fr', 'en'))
);

create index if not exists idx_org_invitations_org on public.org_invitations(organization_id);
create index if not exists idx_org_invitations_email on public.org_invitations(lower(email));

-- ── 2. Le rattachement des offres et des simulations ────────────────────────

alter table public.jobs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.experiences
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

create index if not exists idx_jobs_org on public.jobs(organization_id);
create index if not exists idx_experiences_org on public.experiences(organization_id);

-- ── 3. Les fonctions lues par les policies ──────────────────────────────────

create or replace function public.onbord_org_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

create or replace function public.onbord_org_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.organization_members where user_id = auth.uid();
$$;

-- Vrai si l'appelant est admin ou manager de CETTE organisation : la condition
-- de toutes les policies « gestion » (phase 0, migration 036).
create or replace function public.onbord_gere_org(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.organization_members
    where user_id = auth.uid()
      and organization_id = org
      and role in ('admin', 'manager')
  );
$$;

revoke all on function public.onbord_org_id()       from public;
revoke all on function public.onbord_org_role()     from public;
revoke all on function public.onbord_gere_org(uuid) from public;
grant execute on function public.onbord_org_id()       to authenticated, service_role;
grant execute on function public.onbord_org_role()     to authenticated, service_role;
grant execute on function public.onbord_gere_org(uuid) to authenticated, service_role;

-- ── 4. RLS des nouvelles tables ─────────────────────────────────────────────

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.org_invitations      enable row level security;

drop policy if exists "organizations: lecture membres" on public.organizations;
create policy "organizations: lecture membres"
  on public.organizations for select to authenticated
  using (id = public.onbord_org_id());

-- Un learner ne voit que SA ligne ; un admin ou un manager voit toute
-- l'organisation (la page Équipe).
drop policy if exists "organization_members: lecture" on public.organization_members;
create policy "organization_members: lecture"
  on public.organization_members for select to authenticated
  using (user_id = auth.uid() or public.onbord_gere_org(organization_id));

-- org_invitations : AUCUNE policy, volontairement (voir l'en-tête).

-- ── 5. Les données existantes ───────────────────────────────────────────────
-- Une organisation par utilisateur qui n'en a pas encore. `on conflict` sur
-- legacy_user_id : rejouée, la migration ne crée rien de plus.

insert into public.organizations
  (name, website_url, ai_context, logo_url, brand_primary_color, brand_secondary_color,
   created_by, legacy_user_id, created_at)
select
  u.company_name,
  u.company_website_url,
  coalesce(u.company_ai_context, '{}'::jsonb),
  u.company_logo_url,
  u.brand_primary_color,
  u.brand_secondary_color,
  u.id,
  u.id,
  coalesce(u.created_at, now())
from public.users u
where exists (select 1 from auth.users a where a.id = u.id)
  and not exists (select 1 from public.organization_members m where m.user_id = u.id)
on conflict (legacy_user_id) do nothing;

insert into public.organization_members (organization_id, user_id, role)
select o.id, o.legacy_user_id, 'admin'
from public.organizations o
where o.legacy_user_id is not null
  and exists (select 1 from auth.users a where a.id = o.legacy_user_id)
on conflict do nothing;

update public.jobs j
set organization_id = m.organization_id
from public.organization_members m
where m.user_id = j.user_id
  and j.organization_id is null;

update public.experiences e
set organization_id = j.organization_id
from public.jobs j
where j.id = e.job_id
  and e.organization_id is null
  and j.organization_id is not null;

commit;

-- ── Vérification (à lancer à part, après) ───────────────────────────────────
-- Chaque ligne doit afficher 0 dans la dernière colonne.
--
-- select 'utilisateurs sans organisation' as controle, count(*) as n
--   from public.users u
--   where exists (select 1 from auth.users a where a.id = u.id)
--     and not exists (select 1 from public.organization_members m where m.user_id = u.id)
-- union all
-- select 'offres sans organisation', count(*) from public.jobs where organization_id is null
-- union all
-- select 'simulations sans organisation', count(*) from public.experiences where organization_id is null;
