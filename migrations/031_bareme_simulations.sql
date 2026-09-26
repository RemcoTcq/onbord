-- 031 — Barème du 26/09/2026 : la simulation se paie à sa génération
--
-- ── Ce qui change côté code ─────────────────────────────────────────────────
-- Jusqu'ici, les 6 crédits d'une offre étaient débités au LANCEMENT DE
-- L'EXTRACTION et couvraient tout le reste, régénérations comprises.
-- Désormais (voir CREDIT_COSTS, src/lib/constants/plans.js) :
--     générer une simulation        6 crédits, à CHAQUE génération complète
--                                   réussie — la première comme les refontes
--     régénérer une étape           1 crédit par étape réécrite par l'agent
--     candidat                      1 à l'entrée + 2 à la notation (inchangé)
-- L'extraction ne débite plus rien.
--
-- ── Le seul cas à traiter en base : les offres déjà payées ──────────────────
-- Une offre analysée sous l'ANCIEN barème a payé 6 crédits pour une simulation
-- qu'elle n'a pas encore générée. Sans ce bloc, sa première génération
-- repaierait 6 crédits. Ces offres sont inscrites dans `simulations_prepayees` ;
-- leur première génération CONSOMME la ligne au lieu de débiter
-- (factureGenerationSimulation, src/lib/utils/limits.js).
--
-- Les offres qui ont DÉJÀ une simulation ne sont pas concernées : leurs 6
-- crédits ont payé cette simulation-là. Leurs régénérations suivent le nouveau
-- barème.
--
-- La table ne peut pas être une colonne de `jobs` : le recruteur écrit sa
-- propre ligne d'offre depuis le navigateur (clé anon + RLS), il pourrait
-- s'offrir des générations. RLS activée, AUCUNE policy : seul service_role (le
-- serveur) la lit et l'écrit.
--
-- ── ORDRE DE DÉPLOIEMENT : le code D'ABORD, cette migration JUSTE APRÈS ─────
-- Tant que la table n'existe pas, le nouveau code facture normalement toute
-- génération (pas de prépaiement lu). Une offre ancienne générée dans cet
-- intervalle paierait donc deux fois : appliquer dans la foulée du déploiement.
--
-- Inversement, une offre créée par le NOUVEAU code avant la migration n'a rien
-- payé à l'extraction ; si elle n'a pas encore de simulation, le bloc 2 lui en
-- offre une. Perte : quelques minutes d'offres, en faveur du client.


-- ── Bloc 1 — La table ───────────────────────────────────────────────────────

create table if not exists public.simulations_prepayees (
  job_id     uuid primary key references public.jobs(id) on delete cascade,
  user_id    uuid not null,
  inscrite_le timestamptz not null default now()
);

comment on table public.simulations_prepayees is
  'Offres dont la PROCHAINE génération de simulation est déjà payée : analysées sous l''ancien barème (6 crédits débités à l''extraction, avant le 26/09/2026) et jamais générées. La première génération supprime la ligne au lieu de débiter. Écrite par le serveur seul (service_role) — RLS activée sans aucune policy, exprès : une ligne insérée par un recruteur lui offrirait une génération.';

alter table public.simulations_prepayees enable row level security;
-- PAS de policy. Ne pas en ajouter une « pour lire ses propres lignes » sans
-- mesurer qu'un select est inoffensif mais qu'un insert ne l'est pas.


-- ── Bloc 2 — Les offres payées et jamais générées ───────────────────────────

insert into public.simulations_prepayees (job_id, user_id)
select j.id, j.user_id
  from public.jobs j
 where not exists (select 1 from public.experiences e where e.job_id = j.id)
    on conflict (job_id) do nothing;


-- ── Bloc 3 — Réaligner l'allocation Pro sur 500 ─────────────────────────────
-- SANS ce bloc, rien ne casse : la recharge mensuelle (checkAndResetMonthly)
-- réalignera d'elle-même au premier accès du mois suivant. Il évite seulement
-- d'afficher « x/450 » d'ici là.
--
-- Seule l'ALLOCATION est remise à niveau, pas le solde : les 50 crédits de plus
-- s'ajoutent à ce qui reste du mois, ils ne le remettent pas à plein.

update public.user_usage
   set credits_balance   = credits_balance + (500 - credits_allocated),
       credits_allocated = 500
 where plan = 'pro'
   and credits_allocated = 450;


-- ── Bloc 4 — Le cycle de facturation : le report des crédits en annuel ──────
-- Sur un plan ANNUEL, les crédits non utilisés se reportent d'un mois sur
-- l'autre ; le solde repart de zéro au renouvellement de l'année (règle vendue
-- par le site, voir CYCLES dans src/lib/constants/plans.js). L'application ne
-- savait pas si un compte était annuel, ni quand son année avait commencé.
--
--   billing_cycle   'monthly' (défaut) ou 'annual'. Réglé depuis
--                   /admin/billing — il n'y a pas de paiement en ligne.
--   cycle_start     1er du mois où l'année a commencé (annuel seulement).
--                   Le renouvellement tombe le 1er du même mois l'année
--                   suivante.
--
-- Tous les comptes existants restent en MENSUEL : rien ne change pour eux tant
-- que l'équipe ne passe pas un client en annuel dans /admin/billing.
--
-- Pas de policy à ajouter : `user_usage` n'a qu'une policy de LECTURE de sa
-- propre ligne (migration 023). Un recruteur voit son cycle, il ne peut pas se
-- déclarer annuel.
--
-- Avant ce bloc, le code lit ces colonnes comme absentes → mensuel, et le
-- réglage du cycle dans /admin/billing répond « migration 031 non appliquée ».

alter table public.user_usage
  add column if not exists billing_cycle text not null default 'monthly'
    check (billing_cycle in ('monthly', 'annual'));

alter table public.user_usage
  add column if not exists cycle_start timestamptz;

comment on column public.user_usage.billing_cycle is
  'monthly : le solde repart à l''allocation chaque mois. annual : l''allocation s''ajoute au solde (report), et le solde repart de zéro au renouvellement annuel (cycle_start + 12 mois).';
comment on column public.user_usage.cycle_start is
  'Annuel seulement : 1er du mois où l''année d''abonnement a commencé (stocké à midi UTC pour rester dans le bon mois quel que soit le fuseau).';
comment on column public.user_usage.credits_allocated is
  'Crédits disponibles au DÉBUT de la période en cours : l''allocation du plan, plus le report sur un plan annuel, plus les ajouts manuels. Sert de dénominateur aux jauges. L''allocation du plan seule se lit dans le code (PLANS[plan].creditsPerMonth).';


-- Vérification après passage :
--   select count(*) from public.simulations_prepayees;
--   select count(*) from public.jobs j
--    where not exists (select 1 from public.experiences e where e.job_id = j.id);  -- même nombre
--   select relrowsecurity from pg_class where relname = 'simulations_prepayees';     -- true
--   select count(*) from pg_policies where tablename = 'simulations_prepayees';      -- 0
--   select plan, credits_allocated, credits_balance from public.user_usage where plan = 'pro';
--   select billing_cycle, count(*) from public.user_usage group by 1;               -- tout en monthly
