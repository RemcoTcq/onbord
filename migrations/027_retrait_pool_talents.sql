-- 027 — Retrait du vivier de talents
--
-- La page /talents et la « base de talents » sont retirées du produit.
-- Ce qui les portait en base tient en deux colonnes de public.candidates et
-- une policy RLS.
--
-- ── Pourquoi c'est sans risque ──────────────────────────────────────────────
-- Vérifié en production avant écriture de cette migration :
--
--     candidats au total       : 2
--     is_in_pool = true        : 0
--     pool_added_at renseigné  : 0
--
-- Et surtout : AUCUN code n'a jamais écrit `is_in_pool = true`. Les deux seuls
-- écrits du dépôt le mettaient à false (le bouton « Retirer du pool »). Le
-- vivier ne pouvait donc que se vider, jamais se remplir — la fonctionnalité
-- était déjà inopérante avant qu'on décide de la retirer.
--
-- ── À vérifier AVANT d'appliquer ────────────────────────────────────────────
-- Si la base a vécu autrement que ce que dit le dépôt, cette requête doit
-- renvoyer 0. Si elle renvoie autre chose, NE PAS appliquer sans sauvegarde :
--
--     select count(*) from public.candidates where is_in_pool is true;
--
-- ── Réversibilité ───────────────────────────────────────────────────────────
-- `drop column` est irréversible : les colonnes se recréent, leur contenu non.
-- Ici le contenu est vide, donc la perte est nulle — mais si vous préférez
-- garder une porte de sortie, n'exécutez que la partie POLICY et laissez les
-- colonnes dormir. Elles ne coûtent rien : plus aucun code ne les lit.

begin;

-- La policy ne servait qu'au bouton « Retirer du pool », qui n'existe plus.
drop policy if exists "Users can update pool status" on public.candidates;

alter table public.candidates drop column if exists is_in_pool;
alter table public.candidates drop column if exists pool_added_at;

commit;

-- ── Vérification (après application) ────────────────────────────────────────
-- Doit ne renvoyer AUCUNE ligne :
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'candidates'
--     and column_name in ('is_in_pool', 'pool_added_at');
--
-- Et l'invariant RLS de candidates (cf. 014) doit rester vrai :
--
--   select polname from pg_policy
--   where polrelid = 'public.candidates'::regclass
--     and polcmd in ('r','w','*')
--     and pg_get_expr(polqual, polrelid) = 'true';
