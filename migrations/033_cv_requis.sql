-- 033 — CV demandé avant la simulation, au choix de l'entreprise
--
-- ── Ce que la colonne porte ─────────────────────────────────────────────────
-- Une case, cochée par le recruteur sur l'écran de la simulation : « Recevoir
-- le CV des candidats ». Cochée, le candidat doit déposer son CV (PDF) avant
-- d'entrer dans la simulation ; le recruteur le retrouve sur la fiche
-- candidat. Décochée — la valeur par défaut —, le parcours est inchangé.
--
-- Onbord ne remplace pas le CV : il remplace le temps passé à lire des CV
-- inutiles. La case existe pour les entreprises qui ne sont pas prêtes à s'en
-- passer d'emblée ; elles la décocheront elles-mêmes.
--
-- ── Pourquoi une colonne, et pas `assessment_config` ────────────────────────
-- `assessment_config` est réécrit en entier par quatre chemins différents
-- (création d'offre, pipeline, tests, entretien IA) : une clé ajoutée là
-- disparaîtrait à la prochaine sauvegarde de l'un d'eux. La policy UPDATE de
-- `jobs` (propriétaire) couvre déjà l'écriture ; aucune policy à ajouter.
--
-- ── Où vit le fichier ───────────────────────────────────────────────────────
-- Bucket privé `resumes`, sous `<candidate_id>/` — le dépôt anonyme est déjà
-- autorisé à ce préfixe (migrations 018 et 019). `candidates.cv_url` garde le
-- CHEMIN ; la fiche candidat le signe à l'affichage (getCandidateDetail).
--
-- ── ORDRE DE DÉPLOIEMENT : indifférent ──────────────────────────────────────
-- Le code lit la colonne à part et la tient pour fausse si elle manque : sans
-- cette migration, aucun candidat n'est bloqué, seule la case refuse de
-- s'enregistrer.

alter table public.jobs
  add column if not exists cv_requis boolean not null default false;

comment on column public.jobs.cv_requis is
  'Le candidat dépose son CV (PDF, bucket resumes) avant la simulation. Réglé par le recruteur sur l''écran de la simulation.';

-- Vérification :
--   select column_name, data_type, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'jobs' and column_name = 'cv_requis';
