-- Contrôle de la migration 025 — mémoire du chat et régénération d'étape.
-- Lecture seule. À passer dans l'éditeur SQL Supabase après application.
--
-- Ce que les scripts Node ne peuvent PAS vérifier depuis l'extérieur, et qui
-- justifie ce fichier : les policies du rôle `authenticated`. Une clé anon n'a
-- pas de session, une clé service_role contourne la RLS — aucune des deux ne
-- peut jouer le recruteur propriétaire. Seul pg_policies le dit.
-- (La fermeture au rôle anon, elle, est vérifiée par
--  scratch/verif-rls-experience-chats.mjs, ligne témoin à l'appui.)

-- 1) Les quatre policies, et le rôle auquel elles s'appliquent.
--    Attendu : 4 lignes, cmd = SELECT / INSERT / UPDATE / DELETE, roles = {authenticated}.
select cmd, policyname, roles::text
from pg_policies
where schemaname = 'public' and tablename = 'experience_chats'
order by cmd;

-- 2) LE POINT QUI COMPTE — les prédicats doivent être IDENTIQUES.
--
-- PostgREST n'émet jamais un INSERT ni un UPDATE nu : il les enveloppe dans un
-- `with ... as (insert/update ... returning ...) select`. La policy SELECT est
-- donc évaluée sur la ligne qu'on vient d'écrire. Si elle ne la couvre pas,
-- l'écriture entière échoue — « new row violates row-level security policy ».
-- C'est ce qui a cassé la mise en corbeille des offres après la 024.
--
-- Attendu : UNE seule ligne, avec nb_predicats_distincts = 1.
select
  count(*)                                          as nb_policies,
  count(distinct coalesce(qual, with_check))        as nb_predicats_distincts
from pg_policies
where schemaname = 'public' and tablename = 'experience_chats';

-- 3) La RLS est bien ACTIVE sur la table (des policies sans RLS ne servent à rien).
--    Attendu : rowsecurity = true.
select relname, relrowsecurity as rowsecurity
from pg_class
where oid = 'public.experience_chats'::regclass;

-- 4) La colonne de coût des retouches, et son commentaire.
--    Attendu : 1 ligne, data_type = jsonb.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'experiences'
  and column_name = 'regeneration_usage';

-- 5) Suivi à l'usage — à relire dans quelques jours.
--    `calls` compte les réécritures d'étape : c'est la mesure de l'économie.
--    Chaque appel ici remplace une génération complète (8000 tokens + une passe
--    CRM) par ~4000 tokens.
select
  count(*) filter (where generation_usage   is not null) as generations_completes,
  coalesce(sum((regeneration_usage->>'calls')::int), 0)  as reecritures_d_etape,
  round(sum((generation_usage->>'cost_usd')::numeric), 4)   as cout_generations,
  round(sum((regeneration_usage->>'cost_usd')::numeric), 4) as cout_reecritures
from public.experiences;

-- 6) Taille des fils de conversation. Bornés à 60 messages côté code
--    (MAX_MESSAGES_STOCKES) : aucune ligne ne doit dépasser.
select job_id, jsonb_array_length(messages) as nb_messages, updated_at
from public.experience_chats
order by nb_messages desc;
