-- État RLS en UNE seule requête, à sortie courte — faite pour être copiée-collée.
--
-- Version condensée de etat-rls.sql, dont les colonnes `qual` produisent des
-- pavés illisibles dès qu'une policy contient une jointure. Ici, chaque ligne
-- tient sur une largeur d'écran : le verdict est calculé côté SQL, et les
-- expressions sont tronquées à 60 caractères.
--
-- Lecture seule. À relancer après chaque migration touchant la RLS.
--
-- Trois sections empilées par UNION ALL, distinguées par la colonne `bloc` :
--   A/  une ligne par table du schéma public
--   B/  une ligne par policy ouverte à anon ou public (les seules à risque)
--   C/  les policies de invite_tokens, quel que soit leur rôle

select * from (

  -- ── A. État RLS par table ────────────────────────────────────────────────
  select
    'A/tables'                                    as bloc,
    c.relname                                     as objet,
    case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end as etat,
    (select count(*)::text from pg_policies p
      where p.schemaname='public' and p.tablename=c.relname) as nb,
    case
      when not c.relrowsecurity then 'OUVERTE — anon lit tout'
      when (select count(*) from pg_policies p
             where p.schemaname='public' and p.tablename=c.relname) = 0
        then 'deny-all (service_role seul)'
      else 'a des policies — voir bloc B'
    end                                           as verdict
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r','p')

  union all

  -- ── B. Policies ouvertes à anon / public ─────────────────────────────────
  -- Les seules qui peuvent laisser fuir quoi que ce soit. Une policy réservée
  -- à `authenticated` n'est pas un risque de fuite publique.
  select
    'B/anon',
    tablename || ' :: ' || policyname,
    cmd,
    roles::text,
    case
      when coalesce(qual, with_check, 'true') = 'true' then '!! SANS FILTRE — table ouverte'
      else 'filtré: ' || left(replace(coalesce(qual, with_check), E'\n', ' '), 60)
    end
  from pg_policies
  where schemaname = 'public'
    and ('anon' = any(roles) or 'public' = any(roles))

  union all

  -- ── C. invite_tokens ─────────────────────────────────────────────────────
  -- join/page.js interroge cette table depuis le NAVIGATEUR avec la clé anon.
  -- Deux réponses possibles, opposées, et il faut savoir laquelle :
  --   aucune ligne ici -> l'écran d'invitation est CASSÉ (personne ne s'en est
  --                       aperçu, il n'y a aucune invitation en circulation) ;
  --   une policy sans filtre -> toutes les invitations en attente sont
  --                       listables avec leur token et leur plan.
  select
    'C/invites',
    policyname,
    cmd,
    roles::text,
    coalesce('qual: ' || left(replace(qual, E'\n', ' '), 60), 'check: ' || left(replace(with_check, E'\n', ' '), 60))
  from pg_policies
  where schemaname = 'public' and tablename = 'invite_tokens'

) t
order by
  bloc,
  -- Dans le bloc A, les tables sans RLS d'abord : ce sont elles qui comptent.
  case when bloc = 'A/tables' and etat = 'RLS OFF' then 0 else 1 end,
  objet;
