-- 030 — La fiche de découverte du chat de conception
--
-- Ce que ce lot corrige : le chat collectait des CATÉGORIES (« un ton plutôt
-- direct », « des clients exigeants ») là où la génération a besoin de FAITS
-- (un client nommable, une objection dans les mots du recruteur, un cas vécu la
-- semaine dernière). Et il les redemandait, parce qu'il ne savait pas ce qu'il
-- avait déjà obtenu : son seul souvenir était le fil de conversation, qu'il
-- devait relire et réinterpréter à chaque tour, dans le même budget de tokens
-- que celui où il devait décider quoi dire.
--
-- ── Pourquoi une colonne, et pas le fil ─────────────────────────────────────
-- Exactement la raison qui a fait sortir l'état de l'expérience du fil en 025 :
-- « la base fait foi, le fil ne porte que l'intention ». Un fil est une trace
-- de ce qui s'est dit ; une fiche est un état, et un état se relit, se compare
-- et se transmet. Trois conséquences concrètes :
--
--   • le fil est borné (30 messages côté modèle, amputés PAR LA TÊTE) : la
--     première réponse du recruteur — celle qui porte sa vision de la mise en
--     situation idéale, donc la plus riche — serait la première effacée ;
--   • le brief transmis à la génération n'est plus une synthèse réécrite de
--     mémoire au moment de générer, mais une recopie de citations stockées.
--     C'est là que les détails se diluaient ;
--   • ce que le chat sait devient inspectable en SQL, donc vérifiable
--     autrement qu'en relisant une conversation.
--
-- ── ORDRE DE DÉPLOIEMENT : cette migration D'ABORD, le code ENSUITE ─────────
-- Comme 025, et pour la même raison : elle n'enlève rien. Si le code partait en
-- premier, le chat perdrait sa fiche à chaque tour (erreur loguée, fiche vide
-- relue vide) et retomberait sur le comportement d'avant ce lot — dégradé, mais
-- vivant. Aucune autre surface ne lit cette colonne.

alter table public.experience_chats
  add column if not exists decouverte jsonb;

comment on column public.experience_chats.decouverte is
  'Fiche de découverte du chat de conception : ce que le recruteur a dit de son métier, par emplacement (situation idéale, situation vécue, distinction bon/moyen, métier réel, interlocuteur), avec ses citations mot pour mot, le vocabulaire à réemployer, et le compte de fois où chaque emplacement a été demandé. Alimentée par une passe d''extraction à chaque tour ; relue pour construire le brief envoyé à la génération. Effacée avec le fil par resetExperienceChat (la ligne entière est supprimée) : repartir d''une conversation vierge, c''est repartir d''une découverte vierge.';

-- Aucune policy à ajouter : les quatre policies de 025 portent sur la LIGNE
-- (propriété de l'offre via jobs.user_id), pas sur les colonnes. Une colonne de
-- plus est couverte par ce qui existe.
--
-- Vérification après passage :
--   select column_name from information_schema.columns
--    where table_name = 'experience_chats';
--   select job_id, jsonb_array_length(messages) as messages,
--          decouverte -> 'slots' -> 'situation_reelle' ->> 'statut' as situation
--     from experience_chats;
