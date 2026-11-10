# Audit de l'application — avant l'onboarding

*10/11/2026. Lecture du code de `main` (`bf86fc45`) et de la sauvegarde JSON des
tables du 04/11/2026 (noms de colonnes et volumes seulement). Aucune requête
n'a été lancée sur la base : il n'y en a qu'une, et c'est la production.*

Ce document décrit l'application **telle qu'elle est**, pour préparer l'ajout
de l'onboarding (`docs/PLAN.md`). La section 12 liste ce qui contredit la
description de la mission.

---

## 1. Ce qu'il faut retenir

1. **Tout appartient à UN utilisateur.** Il n'y a ni organisation, ni rôle, ni
   équipe. L'« entreprise » est une poignée de colonnes de `public.users`
   (`company_name`, `company_ai_context`, logo, couleurs). Toute la RLS
   recruteur s'écrit `jobs.user_id = auth.uid()`. Passer à des organisations
   multi-utilisateurs touche donc **toutes les policies** et toutes les
   requêtes qui filtrent par `user_id`.
2. **La simulation est attachée à l'offre** (`experiences.job_id NOT NULL`), et
   le personnage est rangé **dans l'étape** (`experience_steps.config.persona`).
   Il n'existe ni bibliothèque de personnages ni simulation hors d'une offre.
3. **Le passage d'une simulation est un « run » de candidat**
   (`candidate_runs.candidate_id NOT NULL`). Le moteur de passage, les
   sandboxes et le scoring ne connaissent que le candidat anonyme identifié par
   son `interview_token`.
4. **Les canaux** : e-mail, chat et appel vidéo avec caméra existent, tous
   trois dans la même sandbox « persona » pour les deux derniers. **Le
   téléphone (voix seule, sans caméra) n'existe pas.**
5. **Une seule base Supabase, la production.** Pas de CLI, pas de chaîne de
   connexion : les migrations se collent à la main dans le SQL Editor. Aucune
   migration ne peut être testée avant d'être appliquée sur les vraies données.
6. **Aucun test automatisé.** Seulement le lint, deux contrôles i18n et un hook
   `pre-commit`.

---

## 2. Modèle de données

Les tables de base ont été créées depuis l'interface Supabase : **il n'existe
pas de fichier SQL qui les décrit**. Les colonnes ci-dessous viennent du code
et de la sauvegarde du 04/11 (volumes à cette date). Les migrations versionnées
commencent à `010`.

| Table | Rôle | Clés et colonnes utiles | Lignes au 04/11 |
|---|---|---|---|
| `users` | le recruteur ET son entreprise | `id` = `auth.users.id`, `company_name`, `company_website_url`, `company_ai_context` (jsonb : description, industry, target_market, domain…), `company_logo_url`, `brand_*_color`, `ui_locale` (fr\|en), `plan`, `onboarding_completed_at` | 5 |
| `user_usage` | crédits du recruteur | `user_id`, `plan`, `credits_balance`, `credits_allocated`, `billing_cycle`, `cycle_start` | 5 |
| `jobs` | l'offre | `user_id`, `title`, `description`, `extracted_criteria` (jsonb : hard/soft skills avec `priority` et `evidence`, langues…), `saved_flow_nodes` (questions de présélection), `experience_locale` (fr\|en\|nl, figée après génération par trigger, migration 026), `cv_requis`, `status`, `deleted_at` (corbeille, 024) | 11 |
| `job_skills` | compétences de l'offre, à plat | `job_id`, `name`, `type`, `priority`, `level` — **vidée et réécrite à chaque sauvegarde** | 195 |
| `experiences` | la simulation d'une offre, versionnée | `job_id NOT NULL`, `status` (draft\|pending_review\|published\|archived), `version`, `locked_at`, `generated_from` (jsonb : contexte, fil rouge, résumés…), `generation_usage`, `regeneration_usage` | 17 (10 publiées, 6 archivées) |
| `experience_steps` | les étapes | `experience_id`, `order_index`, `kind`, `response_format`, `sandbox_kind`, `title`, `prompt`, `criteria` (checkpoints), `config` (jsonb : scène, **personnage**, poids de l'étape…), `skill_assessed`, `ai_assistant_allowed` | 46 |
| `experience_chats` | le chat de conception | PK `job_id`, `messages`, `decouverte` (fiche de découverte, 030) | 10 |
| `candidates` | le candidat d'une offre | `job_id`, nom, e-mail, `interview_token`, `interview_expires_at`, `gdpr_consent_at`, `status`, `cv_storage_path`… (20 colonnes depuis 034) | 22 |
| `candidate_runs` | un passage | `candidate_id NOT NULL`, `experience_id`, `status` (in_progress\|submitted\|scored\|disqualified), `unique(candidate_id, experience_id)` | 22 |
| `run_step_responses` | réponse à une étape | `run_id`, `step_id`, `response_format`, `text_answer`, `video_url`, `transcript`, `meta` (dont `meta.persona` : la conversation), `unique(run_id, step_id)` | 44 |
| `run_ai_messages` | échanges avec l'assistant IA du candidat | `run_id`, `step_id`, `role`, `content`, tokens | 10 |
| `run_scores` | la note d'un run | `run_id` unique, `overall`, `criterion_scores` (jsonb : checkpoints notés et citations), `summary`, `ai_usage_*`, `scoring_usage` | 15 |
| `candidate_feedback` | le retour écrit au candidat | `candidate_id`, brouillons positif/négatif, envoi (sujet, corps, destinataire, `resend_id`) | 3 |
| `invite_tokens` | liens d'invitation **commerciaux** (un plan offert) | — | 0 |
| `mail_logs` | journal d'envois | `candidate_id`, `job_id`, `user_id`, `mail_type` | 3 |
| `simulations_prepayees` | offres déjà payées sous l'ancien barème | `job_id`, `user_id` | 1 |

Points de structure à connaître :

- **Versions figées** (`src/lib/experienceVersion.js`) : retoucher une
  simulation verrouillée (`locked_at`, posé au premier run) crée une COPIE ;
  un candidat engagé reste sur SA version (`resolveCandidateAndRun`). Il n'y a
  pas de policy DELETE recruteur sur `experiences`.
- **Identifiant de compétence dérivé du nom** (`h:slug`, `s:slug`,
  `src/lib/competences.js`) : `job_skills` change d'`id` à chaque sauvegarde,
  donc les étapes référencent les compétences par ce slug.
- `users.id` et `user_usage.user_id` référencent `auth.users` **sans
  `ON DELETE CASCADE`** : supprimer un compte échoue tant que ces lignes
  existent.

---

## 3. Le parcours de recrutement, tel qu'il est codé

| # | Étape | Où |
|---|---|---|
| 1 | Le recruteur crée une offre : texte collé, fichier (PDF/Word, `parse-file.js`) ou URL (`fetch-url.js`). Il choisit la langue du poste (`experience_locale`). | `jobs/nouveau/page.js` |
| 2 | **Opus 5.5** extrait titre, famille, compétences hard/soft avec `priority` (must_have / nice_to_have / ambiguous) et `evidence` (citation de l'offre), langues (niveau CECR), expérience, diplôme. Le recruteur corrige et valide. | `actions/job.js` `analyzeJobDescription`, `jobExtractionPrompt.js`, `JobFormStep2.js` |
| 3 | Les **questions de présélection** sont proposées par des **gabarits** à partir des critères (langues, expérience, diplôme, lieu) : pas d'IA. | `questionsPreselection.js`, `recommendationEngine.js` |
| 4 | **Chat de conception** (Sonnet 5.5) : il pose des questions au recruteur (scénario vécu, objections…) et tient une fiche de découverte stockée (`experience_chats.decouverte`), puis lance la génération. | `api/chat/assessment`, `experienceChat*.js`, `experienceDecouverte.js` |
| 5 | **Génération** (Opus 5.5, budget 270 s sous le plafond Vercel de 300 s) : conception des étapes, scènes (personnage, boîte de réception) en seconde passe, critique, couverture des compétences. Contexte : offre + `users.company_ai_context` (résumé du site, Haiku 5.5). | `experienceGeneration.js` (2 000 lignes), `api/experience/generate` |
| 6 | Le recruteur relit la vue d'ensemble, ouvre chaque étape (onglets Scénario et Scoring), règle personnage, voix, scène, poids ; le **chat d'étape** (Sonnet 5.5) répond gratuitement et propose des changements appliqués à 2 crédits (`regenerateStep`). | `jobs/[id]/experience/…`, `components/experience/*`, `api/chat/etape` |
| 7 | Publication, puis **lien public** `/apply/[job_id]`. Le candidat donne nom et e-mail, consent (CGU, confidentialité, analyse IA), reçoit son `interview_token`. | `apply/[job_id]`, `actions/candidate.js` `applyForJob` (service_role, limitée en débit) |
| 8 | Passage sur `/run/[token]` : questions de présélection, CV si demandé, puis les étapes dans leurs sandboxes. Tout passe par des server actions en service_role qui vérifient le jeton. | `run/[token]/page.js`, `actions/run.js` |
| 9 | **Scoring** (Sonnet 5.5) : une étape = un appel, en parallèle. Chaque checkpoint est noté **0 / 1 / 2** avec une **citation exacte vérifiée** dans la réponse (`verifyVerbatim`). Second avis en cas de doute, médiane basse. Pondération par critère, must-have ×2, importance d'étape ×0,5 à ×2, plafond si recopiage de l'assistant ≥ 70 %. | `runScoring.js`, `competences.js` |
| 10 | Rapport recruteur par candidat, décision (présélection, suite, refus), puis **retour écrit** au candidat (Sonnet 5.5), modifiable, envoyé par Resend. | `jobs/[id]/candidats/[candidatId]`, `candidateFeedback.js` |

---

## 4. Agents et modèles

| Agent | Modèle | Fichier |
|---|---|---|
| Analyse de l'offre | Opus 5.5 | `actions/job.js` |
| Résumé du site web | Haiku 5.5 | `actions/company-profile.js` |
| Chat de conception, fiche de découverte | Sonnet 5.5 (fiche : Haiku 5.5) | `experienceChat*.js`, `experienceDecouverte.js` |
| Génération de la simulation, régénération d'étape | Opus 5.5 | `experienceGeneration.js` |
| Couverture d'une compétence | Sonnet 5.5 | `experienceGeneration.js` |
| Chat d'étape (expert) | Sonnet 5.5, effort low | `api/chat/etape` |
| Résumés de blocs, descriptions de critères, traduction des notes recruteur | Haiku 5.5 | `resumeEtapes.js`, `descriptionsCriteres.js`, `notesRecruteur.js` |
| Personnage (chat et appel maison) | Claude Sonnet 5.5 | `api/run/persona`, `persona.js` |
| Personnage (appel Realtime) | ElevenLabs Realtime Mini (agent par étape) | `realtimeAppel.js`, `api/run/persona/realtime` |
| Voix et transcription de l'appel | ElevenLabs Flash + Scribe | `api/run/persona/voix`, `…/transcrire` |
| Transcription des vidéos enregistrées | AssemblyAI | `api/transcribe`, `transcription.js` |
| Assistant IA du candidat | Sonnet 5.5 | `api/run/assistant` |
| Scoring | Sonnet 5.5 | `runScoring.js` |
| Retour au candidat | Sonnet 5.5 | `candidateFeedback.js` |

Les prompts sont écrits en français avec une consigne de langue de sortie en
tête (`lib/i18n/prompt.js`). Pièges connus : les modèles 5.5 refusent
`temperature` ; Haiku 5.5 doit avoir la réflexion coupée.

---

## 5. Canaux réellement implémentés

| Canal | Format d'étape | État |
|---|---|---|
| E-mail | `sandbox_kind = email`, rendu `email_reply` | en production |
| Réponse client écrite | `client_reply` | en production |
| Boîte de réception (trier, prioriser) | `inbox` | en production |
| Document | `document` | en production |
| Vidéo enregistrée (monologue) | `response_format = video` | en production |
| **Chat avec un personnage** | `sandbox_kind = persona`, `config.persona.mode = "chat"` | **codé** (`PersonaChat`), **aucune étape en production** au 04/11 |
| **Appel vidéo avec un personnage** | `persona`, `mode = "call"` : caméra du candidat + voix ElevenLabs, Realtime avec repli sur l'appel maison | en production (10 étapes) |
| **Téléphone (voix seule)** | — | **absent** : `MODES_PERSONA = ["call", "chat"]`, l'appel exige la caméra |
| QCM | `response_format = qcm` | en production |
| CRM, code, tableur, tableau de cartes | — | retirés le 04/11 (`SANDBOXES_EN_PAUSE`) |

Le personnage (`normaliserPersona`, `persona.js`) porte : nom, mode, rôle,
entreprise, langue, accent, genre, `voice_id`, contexte, premier message,
personnalité, objectifs, informations cachées, objections, lignes rouges,
signes de réussite, `end_condition`, nombre de tours. Seuls le nom, la
fonction, le contexte et le premier message partent chez le candidat
(`sanitizeStepForCandidate`).

---

## 6. Authentification et comptes

- Supabase Auth, e-mail + mot de passe. **L'inscription publique est fermée**
  (réglage du tableau de bord Supabase). Les comptes sont créés par l'équipe
  Onbord depuis `/admin` (`adminCreerCompte`, service_role).
- Un trigger crée `public.users` et `user_usage` à la création d'un compte.
- **« Admin » désigne aujourd'hui l'équipe Onbord**, pas un rôle client :
  `ADMIN_EMAILS` (variable d'environnement), écrans `/admin`, `/admin/billing`,
  `/admin/couts`. Il faudra un autre nom pour l'administrateur d'une
  organisation cliente.
- `invite_tokens` et `/join` sont des invitations **commerciales** (un plan
  offert à un nouveau client). Elles passent par `signUp()` côté navigateur et
  **ne fonctionnent plus** depuis la fermeture des inscriptions. Rien ne permet
  d'inviter un collègue dans un compte.
- Le candidat n'a pas de compte : son `interview_token` (avec expiration) est
  vérifié côté serveur à chaque appel.

---

## 7. RLS

- Toutes les tables du schéma `public` ont la RLS activée et **ne renvoient
  rien à la clé anon** (audit du 19/08, migrations 018 à 023).
- Recruteur : policies d'**ownership par `jobs.user_id = auth.uid()`**, directes
  ou par jointure (`experiences`, `experience_steps`, `experience_chats`,
  `candidates`, `job_skills`). `user_usage` : lecture de sa propre ligne.
  `jobs` : la corbeille (`deleted_at`) est filtrée par la policy.
- Candidat : **aucune policy**. Tout passe par le serveur en service_role,
  après vérification du jeton (`resolveCandidateAndRun`). C'est un invariant
  documenté : une policy ne peut pas vérifier un jeton que seul le navigateur
  connaît.
- `candidate_runs`, `run_step_responses`, `run_ai_messages`, `run_scores` :
  RLS activée ; le recruteur les lit via le serveur.
- Fonction `public.storage_segment_est_candidat` (SECURITY DEFINER) pour les
  dépôts anonymes dans le stockage.

---

## 8. Stockage

| Bucket | Public | Contenu | Policies |
|---|---|---|---|
| `resumes` | non | CV des candidats | lecture : recruteur propriétaire ; dépôt et remplacement : anonyme si le premier segment du chemin est un candidat existant |
| `video-responses` | non | vidéos des réponses et des appels | idem ; 50 Mo par fichier |
| `logos` | **oui** | logos des entreprises | lecture publique ; **dépôt et suppression : tout utilisateur connecté, sans contrôle de propriétaire** |
| `test-questions` | — | supprimé le 04/11 | — |

---

## 9. Sécurité : constats

| # | Constat | Gravité | Où |
|---|---|---|---|
| S1 | **SSRF dans l'analyse du site web** : `fetchAndAnalyzeWebsite` télécharge l'URL fournie avec `redirect: "follow"` et **sans** le filtre d'adresses de `fetch-url.js` (`destinationAutorisee`, qui bloque les IP privées, locales et de métadonnées). Réservée à un compte connecté, mais tout compte peut faire appeler par le serveur une adresse interne. | moyenne | `actions/company-profile.js` |
| S2 | **Bucket `logos`** : tout utilisateur connecté peut remplacer ou supprimer le logo d'une autre entreprise. Avec des comptes « learner », la population concernée grandit beaucoup. | moyenne | policies héritées de `supabase_migration.sql` |
| S3 | **Dépôt anonyme par identifiant de candidat** : `storage_segment_est_candidat` accepte le jeton OU l'`id` du candidat comme premier segment. L'`id` n'est pas un secret (il figure dans les URL recruteur) : quiconque le connaît peut déposer ou remplacer un fichier sous ce préfixe. | basse | migration 019 |
| S4 | **Limitation de débit en mémoire**, par instance serverless. Elle couvre la candidature, l'assistant, le personnage, la voix, la transcription et les invitations, mais **pas** les server actions du passage (`startRun`, `saveStepResponse`, `submitRun`, qui déclenche le scoring). | basse | `rateLimit.js`, `actions/run.js` |
| S5 | Ouverts depuis l'audit d'août : pas d'en-têtes de sécurité (`next.config.mjs`), mot de passe de 6 caractères sur `/join`, `pdfjs-dist` en version 3. | basse | — |
| S6 | Pas de base de développement : toute migration, tout test et tout `npm run dev` touchent les données réelles. | structurelle | — |

---

## 10. Langues

- **Deux axes indépendants**, documentés dans `docs/i18n.md` :
  `users.ui_locale` (fr\|en) pour le tableau de bord, `jobs.experience_locale`
  (fr\|en\|nl) pour le contenu de la simulation et le parcours candidat.
- Dictionnaires : `common`, `dashboard` (fr, en) et `candidate` (fr, en, nl).
  Environ 1 450 clés. Le parcours candidat existe donc **aussi en
  néerlandais**, puisqu'il suit la langue du poste.
- Routes recruteur préfixées `/fr` et `/en` ; routes candidat sans préfixe.
  Sélecteur de langue dans le profil (`LanguageSelector`).
- Règle tranchée : ce que voit le recruteur est dans SA langue (rapports,
  notes du personnage, grilles) ; ce que voit le candidat suit la langue du
  poste. `sanitizeStepForCandidate` est l'arbitre.
- Contrôles : `npm run check:i18n` (chaînes en dur, clés manquantes) et
  `npm run check:langue`, passés par le hook `pre-commit`.
- E-mails Resend : retour au candidat dans la langue du poste. Les e-mails
  d'authentification sont ceux de Supabase (SMTP Resend), hors de ce système.

---

## 11. Crédits et facturation

La facturation Stripe n'est pas branchée ; les plans et les crédits sont gérés
à la main dans `/admin/billing`. Mais le code **décompte des crédits** :
génération d'une simulation 6, réécriture d'étape 2, démarrage d'un candidat 1,
notation 2 (`lib/constants/plans.js`, `utils/limits.js`). Toute nouvelle
génération (module d'onboarding, suggestion de modules) devra décider si elle
consomme des crédits. La mission interdit de toucher à ce code : voir le plan.

---

## 12. Ce qui contredit la description de la mission

| La mission dit | Le code dit |
|---|---|
| « Une organisation a exactement un utilisateur » | Il n'y a **pas d'organisation** du tout : l'entreprise est une colonne de `users`. Le modèle cible doit créer la table, pas l'étendre. |
| Questions de filtrage « générées par IA » | Ce sont des **gabarits** tirés des critères de l'offre (`recommendationEngine.js`), sans appel au modèle. |
| Compétences « chacune avec sa preuve » | Vrai à l'extraction (`extracted_criteria.*.evidence`), mais `job_skills` ne garde pas la preuve, et la liste de référence reste le JSON de l'offre. |
| Le recruteur paramètre chaque étape « (voix, scénario, caractère) » et modifie « par chat » | Vrai, avec une nuance : le chat d'étape **propose** et le recruteur applique (2 crédits) ; le grand chat ne sert qu'à la création. |
| Scoring « les notes sont ensuite moyennées » | Moyenne **pondérée** : par critère, must-have ×2, importance d'étape réglable, plafond en cas de recopiage, second avis en cas de doute. |
| Email et appel vidéo en production ; téléphone et chat « à vérifier » | Le **chat** est codé mais inutilisé en production ; le **téléphone** n'existe pas. |
| Contexte entreprise = « résumé du site web stocké dans les paramètres » | Vrai (`users.company_ai_context`), plus des champs saisis à la main (marché, secteur…). Aucun document n'est stocké. |
| Interface « anglais et français » | Le tableau de bord l'est. Le parcours candidat existe **aussi en néerlandais**, et c'est voulu (il suit la langue du poste). |
| Rien sur « onboarding » dans le code | Le mot est déjà pris : `components/onboarding/OnboardingChecklist.js` et `actions/onboarding.js` sont la **checklist de démarrage du recruteur** (profil, logo, première offre). |
| — | `/admin` est l'outil interne de l'équipe Onbord ; le rôle client `admin` devra s'appeler autrement dans le code. |

---

## 13. Contraintes pour la suite

- **Production seule.** Une migration écrite n'est pas une migration appliquée,
  et l'appliquer, c'est toucher aux vraies données. Il faut soit un projet
  Supabase de développement, soit appliquer chaque migration à la main en
  production après relecture.
- **Plafond Vercel Hobby : `maxDuration` ≤ 300 s**, sans quoi TOUT le
  déploiement échoue sans bruit. La génération tourne déjà à 270 s de budget.
- **Ne pas recréer d'accès anonyme** aux tables candidats : toute vérification
  de jeton se fait côté serveur.
- **Ne pas lancer `npm run build` pendant `npm run dev`** (même dossier
  `.next`).
- Pas de framework de test installé. Des tests unitaires sur les modules purs
  (`competences.js`, `persona.js`, agrégation du scoring) sont possibles avec
  `node:test`, sans dépendance. Un test de bout en bout du recrutement
  demanderait une base dédiée et des appels IA réels.
