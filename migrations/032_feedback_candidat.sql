-- 032 — Feedback candidat automatique
--
-- ── Ce que la table porte ───────────────────────────────────────────────────
-- Un retour écrit par candidat, rédigé à partir des checkpoints déjà notés
-- (src/lib/candidateFeedback.js), puis envoyé par le recruteur en deux clics
-- depuis la fiche candidat. La rédaction part au clic sur la DÉCISION, et ne
-- produit que la version de cette décision : `draft_negative` (rejeté) ou
-- `draft_positive` (validé, ou passé à l'étape suivante). Rien n'est payé pour
-- un candidat sur lequel l'entreprise ne tranche jamais.
--
-- `generation_started_at` est un verrou : la rédaction lancée par la décision
-- et celle qu'ouvrirait la fenêtre Feedback au même moment n'en font qu'une.
--
-- Une fois l'e-mail parti, `sent_*` garde le texte RÉELLEMENT envoyé — le
-- recruteur le relit en lecture seule — et `sent_at` interdit un second envoi.
--
-- ── Pourquoi une table, et pas des colonnes de `candidates` ─────────────────
-- Le recruteur écrit sa propre ligne `candidates` depuis le navigateur (clé
-- anon + RLS d'ownership). Avec `feedback_sent_at` dans cette ligne, il
-- pourrait la remettre à NULL, changer `candidates.email`, et renvoyer à
-- volonté un texte libre depuis le domaine d'Onbord. Même raisonnement que
-- `simulations_prepayees` (migration 031) : RLS activée, AUCUNE policy, seul
-- service_role (le serveur) lit et écrit. Les actions serveur vérifient la
-- propriété par une lecture RLS de `candidates` avant de toucher à cette table.
--
-- ── Ce qui reste en base sans être lu ───────────────────────────────────────
-- `candidates.generated_feedback`, écrit par l'ancien générateur, n'est plus
-- ni lu ni écrit. La colonne reste (données préservées).
--
-- ── ORDRE DE DÉPLOIEMENT : cette migration AVANT le code ────────────────────
-- Sans la table, les décisions s'enregistrent normalement (la rédaction qui
-- les suit est non bloquante et journalisée), mais la fenêtre Feedback
-- affiche une erreur et rien ne peut partir.

create table if not exists public.candidate_feedback (
  candidate_id     uuid primary key references public.candidates(id) on delete cascade,

  -- Langue du candidat (jobs.experience_locale au moment de la génération).
  locale           text not null default 'fr' check (locale in ('fr', 'en', 'nl')),

  -- { subject, body, sources: [...], warnings: [...] }, ou { no_material: true }
  -- quand aucun checkpoint étayé ne permet de rien dire d'honnête.
  draft_negative   jsonb,
  draft_positive   jsonb,
  generated_at     timestamptz,
  generation_started_at timestamptz,
  generation_usage jsonb,
  generation_error text,

  sent_at          timestamptz,
  sent_version     text check (sent_version in ('positive', 'negative')),
  sent_subject     text,
  sent_body        text,
  sent_to          text,
  sent_by          uuid,
  resend_id        text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.candidate_feedback enable row level security;

-- Purge défensive : une policy ouverte ajoutée depuis l'interface annulerait
-- en silence l'absence voulue de policy (la RLS est permissive).
do $$
declare p record;
begin
  for p in select polname from pg_policy where polrelid = 'public.candidate_feedback'::regclass loop
    execute format('drop policy %I on public.candidate_feedback', p.polname);
  end loop;
end $$;

-- Vérification (doit renvoyer relrowsecurity = true et 0 policy) :
--   select relrowsecurity from pg_class where oid = 'public.candidate_feedback'::regclass;
--   select count(*) from pg_policy where polrelid = 'public.candidate_feedback'::regclass;
