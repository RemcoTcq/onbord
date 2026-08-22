-- 025 — Mémoire du chat de conception, et régénération étape par étape
--
-- Deux manques constatés à l'usage, qui n'en font qu'un :
--
--   1. Le chat de conception ne se souvenait de rien. Ses messages ne vivaient
--      que dans l'état React de AssessmentChatCreator : on ferme le panneau, on
--      change d'écran, on revient — il rouvrait sur son message d'accueil et
--      reproposait de concevoir une expérience DÉJÀ générée.
--
--   2. Faute de savoir ce qui existait, son seul geste était de tout
--      regénérer : une passe complète (8000 tokens de sortie, plus une 2e passe
--      par étape CRM) pour corriger le ton d'UNE tâche. C'est le coût que ce
--      lot supprime.
--
-- ── ORDRE DE DÉPLOIEMENT : cette migration D'ABORD, le code ENSUITE ──────────
-- L'inverse des migrations 018 à 022, et pour une raison simple : celle-ci
-- n'enlève rien, elle ajoute. Rien de ce qui existe ne peut casser en la
-- passant, alors que le code qui la suppose casse sans elle.
--
-- Ce qui se passe si le code part en premier, vérifié cas par cas :
--   chat            dégradé mais vivant — le fil ne se charge ni ne s'enregistre
--                   (erreur loguée, tableau vide), le chat rouvre amnésique
--                   comme avant ce lot ;
--   regenerate_step fonctionne — seule l'écriture de regeneration_usage est
--                   perdue, silencieusement ;
--   /admin/couts    CASSÉ — la lecture demande `regeneration_usage`, PostgREST
--                   refuse la requête entière sur une colonne inconnue, et
--                   l'écran affiche des zéros au lieu des coûts réels.
-- C'est ce dernier point qui impose l'ordre.

-- ── experience_chats : un fil par offre ──────────────────────────────────────
-- Un fil par OFFRE, pas par expérience : le recruteur qui régénère une version
-- v2 continue la même conversation, et c'est précisément cette continuité qui
-- lui manquait. Le fil survit donc aux versions.
--
-- Le fil entier tient dans une seule ligne, en jsonb. Une ligne par message
-- aurait imposé un ordre stable (donc une colonne de séquence), la gestion des
-- doublons à chaque tour, et le découpage des blocs `tool_use` / `tool_result`
-- d'Anthropic sur plusieurs lignes — pour un objet qui est lu et réécrit
-- toujours EN ENTIER, jamais par morceau. Le tableau jsonb est la forme exacte
-- de ce qu'on manipule.
--
-- Le fil est BORNÉ CÔTÉ CODE à MAX_MESSAGES_STOCKES (voir actions/experienceChat.js) :
-- sans cela, une ligne jsonb croît sans limite jusqu'au plafond de 1 Go.

create table if not exists public.experience_chats (
  job_id     uuid primary key references public.jobs(id) on delete cascade,
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.experience_chats is
  'Fil de conversation du chat de conception d''expérience, un par offre. Réécrit en entier à chaque tour par /api/chat/assessment. Borné en nombre de messages côté code.';

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Même modèle que experiences (migration 011) : propriété portée par l'offre.
-- Le fil est lu et écrit par le client SOUMIS À RLS (server actions et route de
-- chat), donc les quatre policies sont nécessaires — un deny-all façon 010 le
-- rendrait invisible à son propre auteur.
--
-- /!\ Le WITH CHECK de l'INSERT n'est pas une redondance du USING du SELECT :
-- PostgREST n'émet jamais un INSERT ni un UPDATE nu, il les enveloppe dans un
-- `with ... as (insert/update ... returning ...) select`. La policy SELECT est
-- donc évaluée sur la ligne écrite, et une policy SELECT qui ne la couvre pas
-- fait échouer l'écriture entière — c'est exactement ce qui a cassé la mise en
-- corbeille des offres après la migration 024. Les quatre prédicats sont ici
-- volontairement IDENTIQUES.
--
-- Conséquence assumée de la 024 : `jobs` en corbeille n'est plus visible du
-- rôle authenticated, donc son fil devient inaccessible en même temps que
-- l'offre — et repart avec elle à la purge, par la cascade ci-dessus.

alter table public.experience_chats enable row level security;

drop policy if exists "experience_chats: lecture proprietaire"      on public.experience_chats;
drop policy if exists "experience_chats: creation proprietaire"     on public.experience_chats;
drop policy if exists "experience_chats: modification proprietaire" on public.experience_chats;
drop policy if exists "experience_chats: suppression proprietaire"  on public.experience_chats;

create policy "experience_chats: lecture proprietaire"
  on public.experience_chats for select
  to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and j.user_id = auth.uid()));

create policy "experience_chats: creation proprietaire"
  on public.experience_chats for insert
  to authenticated
  with check (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and j.user_id = auth.uid()));

create policy "experience_chats: modification proprietaire"
  on public.experience_chats for update
  to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and j.user_id = auth.uid()))
  with check (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and j.user_id = auth.uid()));

create policy "experience_chats: suppression proprietaire"
  on public.experience_chats for delete
  to authenticated
  using (exists (select 1 from public.jobs j where j.id = experience_chats.job_id and j.user_id = auth.uid()));

-- ── Coût des régénérations ciblées ───────────────────────────────────────────
-- `generation_usage` est le coût de la génération COMPLÈTE qui a créé cette
-- version : c'est un instantané, on n'y touche pas — sans quoi le coût moyen
-- d'une génération, lu par l'écran /admin/couts, deviendrait un mélange
-- ininterprétable de passes complètes et de retouches.
--
-- Les régénérations d'étape s'accumulent donc à part. `calls` compte les appels
-- successifs : c'est la mesure de l'économie recherchée — dix retouches à ~0,01 $
-- contre dix générations complètes.
alter table public.experiences
  add column if not exists regeneration_usage jsonb;

comment on column public.experiences.regeneration_usage is
  'Cumul des régénérations ciblées d''étapes : {model, calls, input_tokens, output_tokens, cost_usd}. Distinct de generation_usage, qui reste l''instantané de la génération complète initiale.';

-- ── Contrôle ─────────────────────────────────────────────────────────────────
--   select count(*) from experience_chats;
--   select policyname, cmd from pg_policies
--    where schemaname='public' and tablename='experience_chats';   -- 4 lignes
--   select job_id, jsonb_array_length(messages) from experience_chats;
