-- Contrôle des migrations 022 et 023. Lecture seule, relançable.
--
-- Résultat attendu :
--   A = 0    aucune policy n'accorde plus rien à anon sans filtre
--   B = 0    la fonction is_admin() n'existe plus
--   C = 0    plus aucune policy ne l'appelle
--   D = 2    les deux policies de lecture recruteur posées par 022 sont là
--
-- Si D = 0, la migration 022 n'a pas tourné.
-- Si B ou C sont non nuls, c'est 023 qui manque.

select 'A. policies ouvertes a anon' as controle, count(*) as valeur, 0 as attendu
from pg_policies
where schemaname = 'public'
  and ('anon' = any(roles) or 'public' = any(roles))
  and coalesce(qual, with_check, 'true') = 'true'

union all
select 'B. fonction is_admin', count(*), 0
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin'

union all
select 'C. policies appelant is_admin', count(*), 0
from pg_policies
where schemaname = 'public' and coalesce(qual, with_check) like '%is_admin%'

union all
select 'D. policies posees par 022', count(*), 2
from pg_policies
where schemaname = 'public'
  and policyname in ('candidate_test_sessions: lecture recruteur proprietaire',
                     'video_interview_responses: lecture recruteur proprietaire')

order by 1;
