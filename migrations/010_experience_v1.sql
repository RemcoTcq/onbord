-- ============================================================================
-- Migration V1 — Refonte "Experience" (présélection par preuves)
-- ============================================================================
-- ADDITIVE ET NON-CASSANTE : aucune table existante n'est modifiée ni supprimée.
-- Les tables héritées (resumes, video_interview_*, candidate_test_sessions,
-- assessment_*, ainsi que jobs.assessment_config / saved_flow_nodes) restent en
-- place jusqu'à la bascule finale (dernière étape de la Phase 4), après validation
-- du nouveau parcours.
--
-- Modèle : Job --(généré)--> Experience --> Steps[] ; Candidate --> Run -->
-- StepResponses[] + log assistant IA --> 1 seul scoring --> rapport de preuves.
-- Le FORMAT DE RÉPONSE (texte/vidéo/qcm/choix/code) est une colonne du STEP,
-- pas un module séparé.
--
-- Sécurité : l'accès candidat et recruteur à ces tables passe par des server
-- actions / routes serveur (client service_role, qui contourne RLS ; validation
-- par token candidat ou ownership recruteur côté serveur — cohérent avec le
-- durcissement É3/É4). On active donc RLS SANS policy publique : tout accès direct
-- via la clé anon est refusé par défaut. Des policies recruteur pourront être
-- ajoutées ultérieurement si un accès client direct devient nécessaire.
-- ============================================================================

-- 1) Experiences — une expérience générée par offre, avec gate de validation.
create table if not exists public.experiences (
  id                  uuid primary key default gen_random_uuid(),
  job_id              uuid not null references public.jobs(id) on delete cascade,
  status              text not null default 'draft',   -- draft | pending_review | published | archived
  version             integer not null default 1,
  estimated_minutes   integer,
  ai_assistant_config jsonb not null default '{"enabled_default": true, "model": "claude-haiku-4-5", "max_messages": 10}'::jsonb,
  generated_from      jsonb,   -- snapshot extracted_criteria + company_ai_context au moment de la génération
  generation_usage    jsonb,   -- {input_tokens, output_tokens, cost_usd, model} — coût de generateExperience
  locked_at           timestamptz,   -- verrouillage au 1er run candidat (versionnage draft -> verrouillé)
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_experiences_job    on public.experiences(job_id);
create index if not exists idx_experiences_status on public.experiences(status);

-- 2) Steps ordonnés. response_format est un PARAMÈTRE DU STEP.
create table if not exists public.experience_steps (
  id                   uuid primary key default gen_random_uuid(),
  experience_id        uuid not null references public.experiences(id) on delete cascade,
  order_index          integer not null,
  kind                 text not null,                  -- qualifying | question | task | classic_qcm | code_task
  response_format      text not null default 'text',   -- text | video | qcm | choice | code
  title                text,
  prompt               text,                           -- énoncé / brief de tâche
  sandbox_kind         text,                           -- null | email | client_reply | document | code
  ai_assistant_allowed boolean not null default false,
  criteria             jsonb not null default '[]'::jsonb,  -- critères BARS validés : [{name, weight, bars_levels:[{level,label,description}]}]
  config               jsonb not null default '{}'::jsonb,  -- spécifique au kind : options QCM, réponse qualifiante attendue, langage+tests code, etc.
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_steps_experience on public.experience_steps(experience_id, order_index);

-- 3) Run candidat — une tentative par candidat et par expérience.
create table if not exists public.candidate_runs (
  id            uuid primary key default gen_random_uuid(),
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  experience_id uuid not null references public.experiences(id) on delete restrict,
  status        text not null default 'in_progress',   -- in_progress | submitted | scored | disqualified
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  scored_at     timestamptz,
  unique (candidate_id, experience_id)
);
create index if not exists idx_runs_candidate  on public.candidate_runs(candidate_id);
create index if not exists idx_runs_experience on public.candidate_runs(experience_id);

-- 4) Réponse candidat par step. La vidéo n'est qu'une valeur de response_format ;
--    le résultat d'exécution du sandbox code va dans meta.
create table if not exists public.run_step_responses (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.candidate_runs(id) on delete cascade,
  step_id          uuid not null references public.experience_steps(id) on delete cascade,
  response_format  text not null,
  text_answer      text,
  video_url        text,
  transcript       text,
  duration_seconds integer,
  meta             jsonb not null default '{}'::jsonb,   -- choix QCM, résultat exécution code (tests pass/fail), signaux anti-triche
  status           text not null default 'submitted',    -- submitted | transcribing | manual_review
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (run_id, step_id)
);
create index if not exists idx_responses_run on public.run_step_responses(run_id);

-- 5) Log COMPLET de l'assistant IA candidat (chaque message conservé).
create table if not exists public.run_ai_messages (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.candidate_runs(id) on delete cascade,
  step_id       uuid references public.experience_steps(id) on delete set null,
  role          text not null,     -- user | assistant
  content       text not null,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);
create index if not exists idx_aimsgs_run on public.run_ai_messages(run_id);

-- 6) Sortie du scoring UNIQUE de fin de run.
create table if not exists public.run_scores (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references public.candidate_runs(id) on delete cascade,
  overall          integer,                 -- score global dérivé (0-100)
  ai_usage_used    boolean not null default false,
  ai_usage_score   integer,                 -- null si l'assistant n'a pas été utilisé
  summary          text,
  criterion_scores jsonb not null default '[]'::jsonb,  -- [{step_id, criterion_name, score, bars_level, justification, verbatim, verbatim_verified}]
  scoring_usage    jsonb,                   -- {input_tokens, output_tokens, cost_usd, model} — coût de scoreRun
  created_at       timestamptz not null default now(),
  unique (run_id)
);

-- ── RLS : refus par défaut de tout accès client direct (anon). ───────────────
-- Le service_role (server actions / routes) contourne RLS.
alter table public.experiences        enable row level security;
alter table public.experience_steps   enable row level security;
alter table public.candidate_runs     enable row level security;
alter table public.run_step_responses enable row level security;
alter table public.run_ai_messages    enable row level security;
alter table public.run_scores         enable row level security;
