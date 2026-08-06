-- ============================================================================
-- Migration 012 — Messages paramétrables de l'expérience
-- ============================================================================
-- ADDITIVE ET NON-CASSANTE.
-- Restaure, portés sur experiences, deux textes paramétrables par le recruteur
-- (équivalents des anciens nœuds accueil / remerciements des saved_flow_nodes) :
--   - welcome_message   : message d'accueil affiché au candidat avant la 1re
--                         étape du run (invitation à démarrer l'expérience) ;
--   - thank_you_message : message de remerciement affiché sur la page de fin.
-- Null = message par défaut affiché côté candidat.
-- ============================================================================

alter table public.experiences add column if not exists welcome_message   text;
alter table public.experiences add column if not exists thank_you_message text;
