-- 028 — Retrait de candidates.cv_feedback
--
-- La colonne portait un feedback CV « bienveillant » généré par IA après la
-- soumission d'une évaluation. Elle est retirée avec la fonction qui l'écrivait
-- (generateCvFeedback, lib/actions/assessment.js).
--
-- ── Pourquoi c'est sans risque ──────────────────────────────────────────────
-- La colonne n'était LUE par aucun écran : zéro référence dans tout le dépôt
-- en dehors de la fonction qui l'écrivait. Rien ne l'affichait au candidat,
-- rien ne l'affichait au recruteur.
--
-- Vérifié en production avant écriture de cette migration :
--
--     candidats total        : 2
--     avec cv_raw_text       : 0
--     avec cv_feedback       : 0
--
-- Et l'écriture était morte depuis des mois : elle appelait le modèle
-- `claude-3-haiku-20240307`, retiré par Anthropic le 19/04/2026, qui répond
-- désormais 404. L'appel était en « fire and forget » avec un catch, donc
-- l'échec ne remontait nulle part.
--
-- ── À vérifier AVANT d'appliquer ────────────────────────────────────────────
-- Si la base a vécu autrement que ce que dit le dépôt, cette requête doit
-- renvoyer 0. Sinon, exporter la colonne avant de la supprimer :
--
--     select count(*) from public.candidates where cv_feedback is not null;
--
-- ── Réversibilité ───────────────────────────────────────────────────────────
-- `drop column` est irréversible : la colonne se recrée, son contenu non.
-- Ici le contenu est vide, donc la perte est nulle — mais plus aucun code ne
-- lit ni n'écrit cette colonne, donc la laisser dormir ne coûte rien non plus.

begin;

alter table public.candidates drop column if exists cv_feedback;

commit;

-- ── Vérification (après application) ────────────────────────────────────────
-- Doit ne renvoyer AUCUNE ligne :
--
--   select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'candidates'
--     and column_name = 'cv_feedback';
