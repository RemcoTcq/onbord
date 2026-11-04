-- 034 — Retrait de l'ancien parcours en base
--
-- Le recentrage sur la vente et le customer success / support (04/11/2026) a
-- retiré du code l'ancien parcours : banque de tests, entretien IA, entretien
-- vidéo noté à la main, analyse de CV, ancien score global (commit 470bf158),
-- puis la taxonomie de ses journaux (commit 9e16e5a6). Cette migration retire
-- ce qui les portait en base : onze tables, dix-neuf colonnes de candidates,
-- une colonne de jobs.
--
-- ── Pourquoi c'est sans risque ──────────────────────────────────────────────
-- Aucun fichier de src/ ne lit ni n'écrit ces tables et ces colonnes (vérifié
-- au 04/11/2026, après les trois commits ci-dessus). Vérifié en production
-- avant écriture de cette migration :
--
--     candidats                                    : 22
--     colonnes de candidates retirées, renseignées : 0, sauf deux valeurs
--       par défaut jamais lues — video_interview_status ('pending' partout)
--       et credits_charged_interview (false partout)
--     jobs.ai_interview_config                     : {"enabled": false} partout
--     candidate_test_sessions, video_interview_responses,
--     interviews, interview_messages               : 0 ligne
--
-- Les tables de CONFIGURATION, elles, ne sont pas vides : 8 tests et
-- 98 questions de la banque, 11 questions vidéo, 2 company_assessments,
-- 3 demandes sur mesure, 10 journaux de familles, 23 compétences non
-- rapprochées. Plus rien ne les lit. Leur contenu est sauvegardé en JSON
-- (C:\Users\philt\onbord-sauvegardes\2026-11-04, export du 04/11/2026).
--
-- ── Si ça échoue ────────────────────────────────────────────────────────────
-- Tout tient dans une transaction, et les `drop table` sont SANS cascade :
-- si un objet vivant (vue, clé étrangère, policy d'une autre table) dépend
-- encore d'une de ces tables, Postgres refuse, rien n'est appliqué, et le
-- message nomme l'objet. C'est voulu : mieux vaut lire ce nom qu'emporter en
-- silence ce qui en dépendait.
--
-- Le premier bloc refuse lui aussi d'aller plus loin si des données candidat
-- sont apparues depuis la vérification ci-dessus.
--
-- ── Réversibilité ───────────────────────────────────────────────────────────
-- `drop` est irréversible : les tables et colonnes se recréent, leur contenu
-- non. Le contenu des tables de configuration reste dans la sauvegarde JSON.
--
-- ── Hors de cette migration ─────────────────────────────────────────────────
-- Le bucket de stockage `test-questions` (vide) est supprimé par l'API
-- Storage : Supabase n'autorise plus la suppression directe dans les tables
-- du schéma storage.

begin;

do $$
declare
  n bigint;
begin
  select count(*) into n from public.candidate_test_sessions;
  if n > 0 then raise exception 'candidate_test_sessions contient % ligne(s) : sauvegarder avant d''appliquer', n; end if;

  select count(*) into n from public.video_interview_responses;
  if n > 0 then raise exception 'video_interview_responses contient % ligne(s) : sauvegarder avant d''appliquer', n; end if;

  select count(*) into n from public.interviews;
  if n > 0 then raise exception 'interviews contient % ligne(s) : sauvegarder avant d''appliquer', n; end if;

  select count(*) into n from public.candidates
  where score_cv is not null or score_interview is not null or score_tests is not null
     or ai_summary is not null or interview_transcript is not null or video_interview_score is not null;
  if n > 0 then raise exception '% candidat(s) portent des données de l''ancien parcours : sauvegarder avant d''appliquer', n; end if;
end $$;

-- Un seul `drop table` pour les onze : Postgres résout lui-même les clés
-- étrangères ENTRE elles (sessions → tests, messages → entretiens…).
drop table if exists
  public.candidate_test_sessions,
  public.assessment_questions,
  public.assessment_tests,
  public.company_assessments,
  public.custom_assessment_requests,
  public.interview_messages,
  public.interviews,
  public.video_interview_responses,
  public.video_interview_questions,
  public.job_family_logs,
  public.unmapped_skills_log;

alter table public.candidates
  drop column if exists cv_raw_text,
  drop column if exists cv_score_breakdown,
  drop column if exists score_cv,
  drop column if exists score_interview,
  drop column if exists score_tests,
  drop column if exists green_flags,
  drop column if exists yellow_flags,
  drop column if exists red_flags,
  drop column if exists ai_summary,
  drop column if exists interview_summary,
  drop column if exists interview_strengths,
  drop column if exists interview_weaknesses,
  drop column if exists interview_recommendation,
  drop column if exists interview_transcript,
  drop column if exists interview_score_breakdown,
  drop column if exists credits_charged_interview,
  drop column if exists video_interview_status,
  drop column if exists video_interview_score,
  drop column if exists video_score_completeness;

alter table public.jobs drop column if exists ai_interview_config;

commit;

-- ── Ce qui RESTE, et ne doit pas être confondu ──────────────────────────────
-- candidates.interview_token et interview_expires_at : le lien d'évaluation
-- du candidat, bien vivant malgré son nom (lib/actions/run.js).
-- candidates.score_global : la note de la simulation (lib/runScoring.js).
-- candidates.cv_url : le CV demandé avant la simulation (migration 033).

-- ── Vérification (après application) ────────────────────────────────────────
-- Doit ne renvoyer AUCUNE ligne :
--
--   select table_name from information_schema.tables
--   where table_schema = 'public' and table_name in (
--     'candidate_test_sessions', 'assessment_questions', 'assessment_tests',
--     'company_assessments', 'custom_assessment_requests', 'interview_messages',
--     'interviews', 'video_interview_responses', 'video_interview_questions',
--     'job_family_logs', 'unmapped_skills_log');
--
--   select column_name from information_schema.columns
--   where table_schema = 'public'
--     and ((table_name = 'candidates' and column_name in (
--           'cv_raw_text', 'cv_score_breakdown', 'score_cv', 'score_interview',
--           'score_tests', 'green_flags', 'yellow_flags', 'red_flags', 'ai_summary',
--           'interview_summary', 'interview_strengths', 'interview_weaknesses',
--           'interview_recommendation', 'interview_transcript',
--           'interview_score_breakdown', 'credits_charged_interview',
--           'video_interview_status', 'video_interview_score',
--           'video_score_completeness'))
--       or (table_name = 'jobs' and column_name = 'ai_interview_config'));
--
-- Et l'invariant RLS de candidates (cf. 014) doit rester vrai — aucune ligne :
--
--   select polname from pg_policy
--   where polrelid = 'public.candidates'::regclass
--     and polcmd in ('r','w','*')
--     and pg_get_expr(polqual, polrelid) = 'true';
