-- 017 — Justification de la note d'usage de l'IA
--
-- Le scoring demandait déjà au modèle une justification pour `ai_usage`
-- (cf. le JSON attendu dans runScoring.js), mais aucune colonne ne l'accueillait :
-- elle était produite puis jetée à chaque run. Le recruteur voyait donc un
-- pourcentage nu — « 15% » — sans pouvoir savoir ce qui le motivait, alors que
-- chaque sous-dimension BARS, elle, porte sa justification.
--
-- Aucun backfill possible : la justification des runs déjà scorés n'existe
-- nulle part. Elle restera NULL jusqu'à un nouveau scoring, et l'écran ne
-- montre alors simplement pas le bloc d'explication.

alter table run_scores
  add column if not exists ai_usage_justification text;

comment on column run_scores.ai_usage_justification is
  'Pourquoi cette note d''usage de l''IA : ce que le candidat a fait de l''assistant (cadrage, itération, regard critique). NULL sur les runs scorés avant la migration 017, ou quand l''assistant n''a pas été utilisé.';
