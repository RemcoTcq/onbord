-- 020 — Point 2 : fermer assessment_questions (et sa table mère) au rôle anon
--
-- NON APPLIQUÉE. À exécuter après validation.
--
-- Constat de l'audit : GET /rest/v1/assessment_questions?select=* avec la seule
-- clé anon renvoyait 98 lignes sur 98, colonne `correct_answer` comprise, plus
-- `explanation` et `scoring_criteria`. La clé anon étant publiée dans le bundle
-- navigateur, toute la banque de tests et son corrigé étaient téléchargeables
-- depuis les outils développeur.
--
-- Vérification faite avant d'écrire cette migration : AUCUN composant client
-- n'interroge ces tables. Les 12 points de lecture passent tous par des server
-- actions (src/lib/actions/assessment.js, job.js, candidate.js), donc par le
-- rôle `authenticated` du recruteur connecté — ou par le service_role.
--
-- La banque de tests est une bibliothèque PARTAGÉE : tous les recruteurs voient
-- les mêmes tests, il n'y a pas de colonne de propriété. La bonne granularité
-- est donc « authentifié » et non « propriétaire ». Ce qui change, et c'est tout
-- l'objet : `anon` n'a plus rien.

alter table public.assessment_questions enable row level security;
alter table public.assessment_tests     enable row level security;

-- On repart d'une table nette : toute policy héritée d'un réglage manuel dans
-- l'interface Supabase serait sinon conservée et continuerait d'ouvrir l'accès.
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('assessment_questions', 'assessment_tests')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "assessment_tests: lecture authentifiee"
  on public.assessment_tests for select
  to authenticated
  using (true);

create policy "assessment_questions: lecture authentifiee"
  on public.assessment_questions for select
  to authenticated
  using (true);

-- Pas de policy INSERT/UPDATE/DELETE : l'alimentation de la banque se fait par
-- scripts en service_role, qui contourne la RLS. Aucun écran ne l'écrit.

-- ─────────────────────────────────────────────────────────────────────────────
-- POINT D'ATTENTION à retenir avant de réveiller le parcours de tests hérité
-- (EXPERIENCE_V1_ONLY = true le neutralise aujourd'hui) :
--
-- getQuestionsForSession() et saveTestAnswer() utilisent le client SOUMIS À RLS.
-- Un candidat est ANONYME. Si ce parcours redevient actif tel quel, ces actions
-- ne verront plus aucune question et le test s'affichera vide.
--
-- La correction, le moment venu, n'est PAS de rouvrir la lecture à anon — ce
-- serait rouvrir la faille — mais de faire passer ces actions en service_role,
-- avec vérification du token candidat, exactement comme le fait déjà le parcours
-- Experience (lib/actions/run.js). Et le corrigé (`correct_answer`) ne doit
-- jamais être inclus dans ce qui est renvoyé au candidat : c'est le rôle d'une
-- fonction de nettoyage côté serveur, du type sanitizeStepForCandidate.
-- ─────────────────────────────────────────────────────────────────────────────
