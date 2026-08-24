-- 026 — Deux axes de langue
--
-- La plateforme doit servir des clients néerlandophones qui travaillent en
-- anglais et recrutent en néerlandais. Ces trois langues ne se déduisent pas
-- l'une de l'autre, d'où DEUX colonnes et non une.
--
-- ── users.ui_locale — la langue du recruteur ────────────────────────────────
-- Langue du dashboard. Préférence personnelle, pas de l'entreprise : deux
-- collègues de la même société peuvent la régler différemment. FR ou EN
-- uniquement — un dashboard néerlandais n'est pas au programme, les clients
-- visés pilotent en anglais.
--
-- ── jobs.experience_locale — la langue du poste ─────────────────────────────
-- Langue de l'offre ET de tout le parcours candidat : questions qualificatives,
-- énoncés des étapes, assistant IA, e-mails au candidat. Elle appartient à
-- l'OFFRE, pas au candidat : un francophone qui postule à une offre
-- néerlandaise passe l'évaluation en néerlandais, parce que la langue fait
-- partie du poste.
--
-- Une offre = une langue, décidée à la création. Le contenu de l'expérience est
-- GÉNÉRÉ PUIS STOCKÉ rédigé dans cette langue (experience_steps.title, .prompt,
-- .criteria) : la changer après génération n'aurait aucun effet sur les textes
-- déjà écrits. D'où le verrou plus bas.

-- ── 1) Langue d'interface du recruteur ──────────────────────────────────────
alter table public.users
  add column if not exists ui_locale text not null default 'fr';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_ui_locale_valide'
  ) then
    alter table public.users
      add constraint users_ui_locale_valide check (ui_locale in ('fr', 'en'));
  end if;
end $$;

comment on column public.users.ui_locale is
  'Langue du dashboard recruteur (fr|en). Sans effet sur la langue vue par les candidats — voir jobs.experience_locale.';

-- ── 2) Langue de l'offre et du parcours candidat ────────────────────────────
-- Défaut 'fr' : toutes les offres existantes ont été rédigées et générées en
-- français, la valeur décrit donc l'existant sans rien réécrire.
alter table public.jobs
  add column if not exists experience_locale text not null default 'fr';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_experience_locale_valide'
  ) then
    alter table public.jobs
      add constraint jobs_experience_locale_valide
      check (experience_locale in ('fr', 'en', 'nl'));
  end if;
end $$;

comment on column public.jobs.experience_locale is
  'Langue de l''offre et de tout le parcours candidat (fr|en|nl). Figée dès qu''une expérience est générée : les textes des steps sont stockés rédigés dans cette langue.';

-- ── 3) Verrou : la langue ne change plus une fois l'expérience générée ──────
-- Sans ce garde-fou, un recruteur bascule une offre de 'fr' à 'nl', l'interface
-- du parcours passe en néerlandais… mais les énoncés des étapes, eux, restent
-- en français. Le candidat se retrouve devant une page mi-néerlandaise
-- mi-française, et le scoring évalue des réponses dans une langue qu'il croit
-- être une autre.
--
-- Le trigger REFUSE le changement plutôt que de le corriger silencieusement :
-- changer de langue impose de régénérer l'expérience, et c'est une décision du
-- recruteur, pas un effet de bord.
create or replace function public.jobs_langue_figee_apres_generation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.experience_locale is distinct from old.experience_locale
     and exists (select 1 from public.experiences e where e.job_id = old.id)
  then
    raise exception
      'La langue de cette offre ne peut plus changer : une expérience a déjà été générée en « % ». Supprimez l''expérience pour la régénérer dans une autre langue.',
      old.experience_locale
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists trg_jobs_langue_figee on public.jobs;
create trigger trg_jobs_langue_figee
  before update of experience_locale on public.jobs
  for each row
  execute function public.jobs_langue_figee_apres_generation();

-- ── Note RLS ────────────────────────────────────────────────────────────────
-- Aucune policy à ajouter ni à modifier. Ce sont deux colonnes sur des tables
-- déjà couvertes (users, jobs), et la policy de `jobs` filtre déjà sur
-- deleted_at + ownership (migrations 021 et 024). Les chemins candidat lisent
-- experience_locale en service_role, comme le reste de l'offre.
