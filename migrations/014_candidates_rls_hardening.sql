-- ============================================================================
-- Migration 014 — Durcissement RLS de public.candidates
-- ============================================================================
-- ⚠️  À APPLIQUER **APRÈS** LE DÉPLOIEMENT DU CODE, JAMAIS AVANT.
--
-- Le main actuellement en production monte encore InterviewModule, qui écrit
-- sur candidates depuis le NAVIGATEUR (anti_cheat_metrics, interview_transcript,
-- status). Retirer les policies ci-dessous avant que le nouveau code soit en
-- ligne casserait le parcours candidat en production. Sur la refonte Experience,
-- ces écritures n'existent plus : /assessment ne monte plus que CandidateNotice,
-- et tout le parcours passe par des server actions en service_role.
--
-- ── Le problème ─────────────────────────────────────────────────────────────
-- Cinq policies portaient la mention « by token » dans leur nom sans que le
-- token n'apparaisse jamais dans leur condition : toutes en `USING (true)`.
-- N'importe qui disposant de la clé anon — publique par construction, elle est
-- dans le bundle JS servi à chaque visiteur — pouvait donc LIRE et MODIFIER la
-- ligne de n'importe quel candidat : identité, e-mail, transcript d'entretien,
-- métriques anti-triche, scores, feedback CV.
--
-- Ce n'est pas réparable en SQL. Une policy RLS filtre des lignes selon ce que
-- la base sait de l'appelant ; un candidat n'a pas de compte, donc pas de JWT,
-- donc rien à comparer à interview_token. Le token n'existe que dans la requête
-- envoyée par le client — s'en servir dans la condition reviendrait à demander à
-- l'attaquant de se valider lui-même. `USING (true)` était le seul moyen de
-- faire fonctionner la requête navigateur : le besoin, c'est de la supprimer.
--
-- ── La correction ───────────────────────────────────────────────────────────
-- La vérification du token remonte côté serveur, où elle a toujours eu sa place
-- (cf. resolveCandidateAndRun dans lib/actions/run.js, et le durcissement É3/É4
-- de /api/run/assistant et /api/transcribe) :
--   - /assessment/[token] : getCandidateEntry résout offre + branding en admin ;
--   - /apply/[job_id]     : gdpr_consent_at posé dans l'insert d'applyForJob,
--                           l'UPDATE anon depuis le navigateur disparaît ;
--   - /results/[token]    : idem (portée en server action ou retirée).
--
-- Aucun impact recruteur : les policies d'ownership (« Users can ... own ... »)
-- couvrent déjà tout le dashboard via jobs.user_id = auth.uid(). Elles sont
-- déclarées sur le rôle {public}, mais auth.uid() vaut NULL pour un appelant
-- anonyme — l'EXISTS échoue, l'accès est refusé. Elles sont conservées telles
-- quelles.
-- ============================================================================

-- Ceinture : la RLS doit être active pour que les policies aient un sens.
-- Sans cela, retirer des policies ne restreint rien du tout.
alter table public.candidates enable row level security;

-- ── SELECT ouverts à tous — retirés ─────────────────────────────────────────
-- Deux policies quasi-homonymes, empilées au fil du temps, toutes deux en
-- USING (true) : lecture intégrale de la table avec la clé anon.
drop policy if exists "Public can view candidate by token"   on public.candidates;
drop policy if exists "Public can view candidates by token"  on public.candidates;

-- ── UPDATE ouverts à tous — retirés ─────────────────────────────────────────
-- Trois policies en USING (true) : modification de n'importe quelle ligne, y
-- compris status, scores et transcript, par n'importe quel visiteur.
drop policy if exists "Public can update candidate by token" on public.candidates;
drop policy if exists "Public can update candidates"         on public.candidates;
drop policy if exists "Public update candidate status"       on public.candidates;

-- ── CONSERVÉES, délibérément ────────────────────────────────────────────────
-- « Public can insert candidates » (INSERT, WITH CHECK true) : c'est la
-- candidature publique. applyForJob s'exécute avec le client SSR anon
-- (lib/actions/candidate.js), pas en service_role, et en dépend donc.
-- Un WITH CHECK permissif sur un INSERT ne permet ni de lire ni de modifier
-- l'existant — le risque n'est pas comparable à celui des policies ci-dessus.
-- La digue métier vit côté serveur (assertJobAcceptsCandidates).
--
-- « Users can view / insert / update / delete own candidates »,
-- « Users can update pool status », « Users can access candidates of their own
-- jobs » : ownership recruteur, inchangées.

-- ── Vérification (à lancer après application) ───────────────────────────────
-- Doit ne renvoyer AUCUNE ligne :
--
--   select polname, pg_get_expr(polqual, polrelid) as cond
--   from pg_policy
--   where polrelid = 'public.candidates'::regclass
--     and polcmd in ('r','w','*')
--     and pg_get_expr(polqual, polrelid) = 'true';
