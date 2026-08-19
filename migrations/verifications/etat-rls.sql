-- État RLS du schéma public — requête de diagnostic, LECTURE SEULE.
-- À lancer dans le SQL Editor de Supabase. Ne modifie rien, relançable à volonté.
--
-- Écrite pour le point 8 de l'audit du 19/08/2026, mais faite pour resservir :
-- c'est le contrôle à repasser après chaque migration touchant la RLS.
--
-- ⚠ LEÇON DES MIGRATIONS 018/019, à garder en tête en lisant la section B :
-- la RLS de PostgreSQL est PERMISSIVE — les policies s'additionnent, une seule
-- qui accorde l'accès suffit à le donner. Une table peut donc porter une policy
-- parfaitement verrouillée ET rester grande ouverte à cause d'une autre, plus
-- ancienne, créée dans l'interface. C'est exactement ce qui s'est produit sur
-- storage.objects : six policies « Allow public … » annulaient en silence tout
-- le travail. Ne jamais conclure d'après la seule policy qu'on vient d'écrire.
--
-- Pourquoi je ne peux pas trancher depuis l'extérieur : huit tables sont VIDES.
-- Une requête anon y renvoie `200 []`, ce qui ne distingue pas « RLS active et
-- policy correcte » de « RLS absente, la table est simplement vide ». Il faut
-- lire le catalogue, et la RPC execute_sql_query qui servait à cela n'existe
-- plus (c'est une bonne chose).

-- ── A. État RLS de toutes les tables, les 8 ambiguës en tête ─────────────────
select
  c.relname                                                  as table_name,
  c.relrowsecurity                                           as rls_activee,
  c.relforcerowsecurity                                      as rls_forcee,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as nb_policies,
  case
    when not c.relrowsecurity then 'OUVERTE — anon lit tout'
    when (select count(*) from pg_policies p
           where p.schemaname = 'public' and p.tablename = c.relname) = 0
      then 'deny-all (service_role uniquement)'
    else 'policies à relire'
  end                                                        as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by
  (c.relname in ('invite_tokens', 'interviews', 'interview_messages',
                 'candidate_test_sessions', 'job_family_logs', 'job_skills',
                 'mail_logs', 'video_interview_responses')) desc,
  c.relrowsecurity asc,
  c.relname;

-- Lecture du résultat :
--   rls_activee = false          -> la table est lisible par n'importe qui avec
--                                   la clé anon. C'est le cas à corriger.
--   rls_activee = true, 0 policy -> personne ne passe sauf le service_role.
--                                   C'est le modèle des tables du run (011).

-- ── B. Le détail des policies, pour repérer les `using (true)` ──────────────
-- Une policy `qual = true` accordée à `anon` ou à `public` est une table
-- ouverte avec un cadenas décoratif.
select
  tablename, policyname, cmd, roles::text as roles,
  qual        as condition_lecture,
  with_check  as condition_ecriture,
  case
    when 'anon' = any(roles) or 'public' = any(roles) then
      case when coalesce(qual, 'true') = 'true' then '!! OUVERT À ANON, SANS FILTRE'
           else 'anon, filtré — à relire' end
    else 'ok (authentifié)'
  end as alerte
from pg_policies
where schemaname = 'public'
order by
  ('anon' = any(roles) or 'public' = any(roles)) desc,
  tablename, policyname;

-- ── C. invite_tokens en particulier ─────────────────────────────────────────
-- C'est la table prioritaire : src/app/join/page.js:36 l'interroge depuis le
-- NAVIGATEUR avec la clé anon —
--     supabase.from("invite_tokens").select("*").eq("token", token).single()
-- — donc une policy SELECT ouverte à anon existe forcément, sinon l'écran
-- d'invitation ne fonctionnerait pas du tout.
--
-- La question n'est donc pas « y a-t-il une policy » mais « est-elle filtrée ».
-- Si sa condition est `true`, alors :
--   GET /rest/v1/invite_tokens?select=*  renvoie TOUTES les invitations en
--   attente, avec leur `token` et leur `plan` — et PLAN_LABELS de join/page.js
--   montre qu'un plan `admin` existe. Se créer un compte administrateur ne
--   demande alors qu'une requête.
--
-- Une policy correcte ne peut pas filtrer sur le token (le client le fournit
-- dans le WHERE, pas dans le contexte d'authentification). Le seul filtre
-- possible en SQL est de restreindre aux invitations encore valables :
--
--     using (used = false and expires_at > now())
--
-- Cela réduit la fuite sans la fermer : les invitations en attente restent
-- listables. La vraie correction est de retirer TOUTE policy anon et de faire
-- valider le token par une server action en service_role, qui ne renvoie au
-- navigateur que { valide, plan } — jamais la ligne, jamais la liste. C'est
-- exactement le motif de resolveJobEntry() pour le parcours candidat.

select policyname, cmd, roles::text, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'invite_tokens';

select count(*) as invitations_en_base,
       count(*) filter (where not used) as non_utilisees,
       count(*) filter (where plan = 'admin') as portant_le_plan_admin
from public.invite_tokens;
