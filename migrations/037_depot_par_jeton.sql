-- 037 — Dépôt anonyme dans le stockage : par JETON seulement (audit du
-- 10/11/2026, S3)
--
-- ⚠️ À APPLIQUER APRÈS LA MISE EN LIGNE du code de la phase 0, PAS AVANT.
-- Le code en production jusque-là dépose le CV sous `<id du candidat>/…`
-- (CvGate.js) : cette migration le refuserait, et les candidats d'une offre
-- qui demande un CV seraient bloqués.
--
-- ── Le défaut ───────────────────────────────────────────────────────────────
-- `storage_segment_est_candidat` (migration 019) autorise le dépôt et le
-- remplacement anonymes dans `resumes` et `video-responses` dès que le premier
-- segment du chemin est le JETON d'un candidat OU son `id`. L'`id` n'est pas
-- un secret : il figure dans les URL du tableau de bord. Qui le connaît peut
-- déposer, ou remplacer, un fichier sous ce dossier.
--
-- ── La correction ───────────────────────────────────────────────────────────
-- Depuis la phase 0, le CV se dépose sous le jeton comme les vidéos
-- (CvGate.js, saveCandidateCv). La fonction n'accepte plus que le jeton. Les
-- fichiers déjà rangés sous un `id` restent lisibles (lecture par le serveur,
-- liens signés) et effaçables (purge par préfixe, lib/storage.js) : seuls les
-- NOUVEAUX dépôts sont concernés.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- Une instruction. Idempotente.

create or replace function public.storage_segment_est_candidat(segment text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.candidates c
    where c.interview_token = segment
  );
$$;

comment on function public.storage_segment_est_candidat(text) is
  'Le premier segment d''un chemin de storage est-il le JETON d''un candidat ? (Plus son id : migration 037.) SECURITY DEFINER : les policies de dépôt sont évaluées pour un candidat anonyme. Ne renvoie qu''un booléen.';

-- ── Contrôle (à lancer à part) ──────────────────────────────────────────────
-- La définition ne doit plus mentionner « c.id » :
--   select pg_get_functiondef('public.storage_segment_est_candidat(text)'::regprocedure);
