-- 029 — Nouveau barème de crédits et grille de plans
--
-- Accompagne la refonte de la consommation de crédits (voir
-- src/lib/constants/plans.js et src/lib/utils/limits.js).
--
-- ── Ce qui change côté code, en résumé ──────────────────────────────────────
-- Quatre plans : core, pro, beta, admin. Le plan `custom` disparaît — aucun
-- compte ne le portait en production. `beta` est un Core à l'identique, et il
-- existait DÉJÀ en base (2 comptes) alors qu'aucune constante ne le déclarait :
-- le code retombait silencieusement sur Core. Il est maintenant explicite.
--
-- Deux opérations débitent, et deux seulement :
--     création d'une offre          6 crédits, à l'extraction
--     passage d'un candidat         1 crédit à l'entrée + 2 à la notation
-- Plus rien d'autre : ni ajout de module, ni test de la banque, ni scoring CV.
--
-- ── Cette migration N'EST PAS NÉCESSAIRE au fonctionnement du code ──────────
-- Elle ne fait que du rangement. Le code déployé fonctionne sur le schéma
-- actuel, sans elle. Les deux blocs sont indépendants, applicables séparément.
--
-- État constaté en production avant écriture (30/08/2026) :
--
--     user_usage   beta   2 comptes   129/170 et 493/500
--                  core   2 comptes   163/170 et 163/170
--                  admin  1 compte    999992/999999
--     invite_tokens : aucune invitation en attente
--     aucun compte sur `custom`


-- ── Bloc 1 — Réaligner les allocations sur la nouvelle grille ───────────────
--
-- Nouvelle grille : Core 150, Pro 450, Bêta 150 (c'est un Core), Admin illimité.
--
-- SANS ce bloc, rien ne casse : la recharge mensuelle (checkAndResetMonthly,
-- utils/limits.js) réalignera d'elle-même au premier accès du mois suivant.
-- Le bloc ne sert qu'à éviter d'afficher « 163/170 » jusque-là, alors que la
-- page Crédits annonce déjà 150 par mois.
--
-- CONSÉQUENCE À ASSUMER : `credits_balance` est ramené à l'allocation du plan.
-- Un compte qui avait consommé une partie de son mois repart à plein. Un compte
-- bêta à 493 crédits redescend à 150. Si ce n'est pas voulu, n'appliquer que la
-- mise à jour de `credits_allocated` (retirer la ligne credits_balance).

update public.user_usage
   set credits_allocated = 150,
       credits_balance   = 150
 where plan in ('core', 'beta');

update public.user_usage
   set credits_allocated = 450,
       credits_balance   = 450
 where plan = 'pro';

update public.user_usage
   set credits_allocated = 999999,
       credits_balance   = 999999
 where plan = 'admin';

-- Aucun compte ne porte `custom` aujourd'hui. Si l'un apparaissait (invitation
-- ancienne réclamée entre-temps), il ne correspondrait plus à aucun plan connu
-- et le code le traiterait comme un Core. Autant l'écrire en base.
update public.user_usage set plan = 'core' where plan = 'custom';
update public.users      set plan = 'core' where plan = 'custom';


-- ── Bloc 2 — Retrait des drapeaux de facturation par candidat ───────────────
--
-- `credits_charged_cv` et `credits_charged_tests` servaient à rendre idempotents
-- les deux anciens débits par candidat : le scoring CV (2 cr) et le « parcours
-- complet » (2 cr). Les deux débits sont supprimés.
--
-- Le nouveau barème n'a besoin d'AUCUN drapeau : l'idempotence est portée par
-- des faits déjà en base — la ligne `candidate_runs` ne se crée qu'une fois
-- (1 crédit), et scoreRun() refuse de renoter un run déjà « scored » (2 crédits).
--
-- ── À vérifier AVANT d'appliquer ────────────────────────────────────────────
-- Zéro référence à ces deux colonnes dans tout le dépôt après la refonte :
--
--     grep -rn "credits_charged" src/
--
-- ── Réversibilité ──────────────────────────────────────────────────────────
-- `drop column` est irréversible. Ici la perte est sans portée : ces booléens
-- ne disent que « ce candidat a déjà été facturé sur un barème qui n'existe
-- plus ». Ils ne servent à aucun calcul, à aucun affichage, à aucun historique.

alter table public.candidates drop column if exists credits_charged_cv;
alter table public.candidates drop column if exists credits_charged_tests;
