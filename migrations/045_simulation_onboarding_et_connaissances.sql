-- 045 — Simulations d'onboarding à une conversation, connaissances structurées
-- (16/11/2026, docs/PLAN.md « Création unique »)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
--   modules.channel     le canal de LA conversation travaillée : chat, email,
--                       call (appel vidéo : la personne est filmée, le
--                       personnage répond à la voix) ou phone (voix seule).
--                       Une simulation d'onboarding = une conversation.
--   modules.brief       ce que l'agent de conception a retenu avec le manager :
--                       le scénario tel qu'il se vit dans l'entreprise, les
--                       objections, ce qu'il faut savoir, les signes de réussite.
--                       Relu à chaque (re)génération.
--   modules.persona_id  le personnage de la bibliothèque choisi pour cette
--                       conversation (sa fiche est recopiée dans l'étape).
--   organizations.knowledge_sections
--                       les rubriques des connaissances d'entreprise : offre,
--                       acheteurs types, concurrents, marchés, comment on vend,
--                       comment on fait du support, comment on recrute.
--   knowledge_documents.active
--                       un document déposé peut être mis de côté sans être
--                       supprimé : seuls les documents actifs nourrissent les
--                       simulations.
--   knowledge_documents.kind
--                       trois types de plus : transcription d'appel, échanges
--                       écrits (e-mails, tickets), playbook / process.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive : colonnes ajoutées avec une valeur par défaut, une contrainte de
-- type élargie (les valeurs déjà en base restent valides). Aucune donnée
-- existante modifiée. Le code de `main` ne lit aucune de ces colonnes.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc. Idempotente. Contrôles en fin de fichier.

begin;

-- ── 1. Modules : canal, brief, personnage ──────────────────────────────────

alter table public.modules
  add column if not exists channel    text,
  add column if not exists brief      jsonb not null default '{}'::jsonb,
  add column if not exists persona_id uuid references public.personas(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'modules_canal_valide') then
    alter table public.modules
      add constraint modules_canal_valide
      check (channel is null or channel in ('chat', 'email', 'call', 'phone'));
  end if;
end $$;

-- ── 2. Connaissances : rubriques, documents actifs, nouveaux types ─────────

alter table public.organizations
  add column if not exists knowledge_sections jsonb not null default '{}'::jsonb;

alter table public.knowledge_documents
  add column if not exists active boolean not null default true;

alter table public.knowledge_documents drop constraint if exists knowledge_documents_kind_valide;
alter table public.knowledge_documents
  add constraint knowledge_documents_kind_valide check (kind in
    ('pitch_deck', 'product', 'pricing', 'objections', 'policies', 'faq', 'other',
     'transcript', 'emails', 'playbook'));

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. Les colonnes (attendu : 5 lignes).
--    select table_name, column_name, data_type from information_schema.columns
--    where (table_name, column_name) in (('modules', 'channel'), ('modules', 'brief'), ('modules', 'persona_id'),
--      ('organizations', 'knowledge_sections'), ('knowledge_documents', 'active'));
-- 2. La contrainte de type élargie (attendu : une ligne qui cite 'transcript').
--    select pg_get_constraintdef(oid) from pg_constraint where conname = 'knowledge_documents_kind_valide';
