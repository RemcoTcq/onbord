-- 039 — Company Knowledge (phase 1 de l'onboarding, docs/PLAN.md)
--
-- ── Ce que la migration pose ────────────────────────────────────────────────
-- La base de connaissances de l'ORGANISATION, partagée par le recrutement et
-- l'onboarding, lue par tous les générateurs (lib/knowledge.js) :
--
--   organizations.knowledge_notes   des notes en texte libre
--   knowledge_documents             des documents (pitch deck, produit,
--                                   tarifs, objections, politiques, FAQ…),
--                                   avec leur TEXTE extrait au dépôt
--   bucket `knowledge` (privé)      les fichiers eux-mêmes
--
-- Le résumé du site web reste où il est (`organizations.ai_context`).
--
-- ── Sécurité ────────────────────────────────────────────────────────────────
-- Documents : lecture par les admins et managers de l'organisation ; AUCUNE
-- écriture depuis le navigateur — le serveur extrait le texte et écrit la
-- ligne (service_role). Un learner n'y a pas accès : ce que la base contient
-- (tarifs, objections, politiques) nourrit ses simulations, il ne le lit pas.
--
-- Fichiers : le navigateur d'un admin ou d'un manager dépose directement dans
-- le dossier de SON organisation (`<organization_id>/…`) — un fichier de
-- présentation dépasse vite la limite de taille d'une action serveur. Aucune
-- lecture navigateur : le serveur relit le fichier pour en extraire le texte.
-- 20 Mo par fichier, PDF, Word et texte seulement.
--
-- ── Rétrocompatibilité ──────────────────────────────────────────────────────
-- Additive. Le code de `main` n'y touche pas.
--
-- ── Exécution ───────────────────────────────────────────────────────────────
-- D'un seul bloc dans le SQL Editor. Idempotente. Contrôles en fin de fichier.

begin;

alter table public.organizations
  add column if not exists knowledge_notes text;

create table if not exists public.knowledge_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title           text not null,
  kind            text not null default 'other',
  storage_path    text not null,
  mime_type       text,
  size_bytes      bigint,
  extracted_text  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint knowledge_documents_kind_valide check (kind in
    ('pitch_deck', 'product', 'pricing', 'objections', 'policies', 'faq', 'other'))
);

create index if not exists idx_knowledge_documents_org on public.knowledge_documents(organization_id, created_at desc);

alter table public.knowledge_documents enable row level security;

drop policy if exists "knowledge_documents: lecture gestion" on public.knowledge_documents;
create policy "knowledge_documents: lecture gestion"
  on public.knowledge_documents for select to authenticated
  using (public.onbord_gere_org(organization_id));

-- ── Le bucket privé ─────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge', 'knowledge', false, 20971520,
  array['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/markdown']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "knowledge: depot gestion" on storage.objects;
create policy "knowledge: depot gestion"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'knowledge'
    and (storage.foldername(name))[1] = public.onbord_org_id()::text
    and public.onbord_gere_org(public.onbord_org_id())
  );

commit;

-- ── Contrôles (à lancer à part) ─────────────────────────────────────────────
-- 1. La table et sa policy (attendu : 1 ligne).
--    select policyname from pg_policies where tablename = 'knowledge_documents';
-- 2. Le bucket, privé, 20 Mo (attendu : public = false, 20971520).
--    select id, public, file_size_limit from storage.buckets where id = 'knowledge';
-- 3. La policy de dépôt (attendu : 1 ligne).
--    select policyname from pg_policies where schemaname = 'storage' and policyname = 'knowledge: depot gestion';
