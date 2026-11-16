# Plan — l'onboarding, et une plateforme bâtie sur des simulations réutilisables

*Écrit le 10/11/2026 à partir de `docs/AUDIT.md`. Mis à jour à la fin de
chaque phase (section « Journal »).*

Le principe directeur : **on ne remplace rien, on ajoute à côté.** Le
recrutement d'aujourd'hui continue de lire les mêmes tables et les mêmes
colonnes ; les nouvelles tables et colonnes sont nullables, remplies par
migration, et le code bascule dessus pas à pas, avec un repli sur l'ancien
emplacement tant qu'une migration n'est pas appliquée.

---

## 1. Décisions de conception

| Sujet | Décision | Pourquoi |
|---|---|---|
| Organisation | Nouvelle table `organizations`. **Un utilisateur appartient à une seule organisation** (`organization_members.user_id` unique). | Aucun cas client multi-organisation ; une seule appartenance simplifie la RLS et chaque requête. |
| Rôles | `admin`, `manager`, `learner` dans `organization_members.role`. Dans le code, le rôle client s'appelle `orgRole` ; le mot « admin » seul reste réservé à l'équipe Onbord (`ADMIN_EMAILS`, `/admin`). | Le mot est déjà pris (audit §6). |
| Données d'entreprise | Copiées de `users` vers `organizations` (nom, site, `company_ai_context`, logo, couleurs). Les colonnes de `users` **restent** et ne sont plus écrites. | Rétrocompatibilité : le code de `main` les lit encore. |
| Appartenance des données | `organization_id` ajouté (nullable puis rempli) sur `jobs`, `experiences`. `jobs.user_id` reste : il devient « créé par ». | Les policies existantes par `user_id` restent valides ; les nouvelles policies par organisation s'y ajoutent. |
| Simulation | La table **reste `experiences`** (renommer casserait tout le code et `main`). `experiences.job_id` devient nullable : une simulation sans offre est un module. Le versionnage figé ne change pas. | Le moteur, l'éditeur et le scoring sont déjà centrés sur `experience_id`. |
| Personnage | Nouvelle table `personas` (par organisation). L'étape garde **sa copie** dans `config.persona` (la version figée que joue le candidat) et gagne `config.persona_id` (le lien vers la bibliothèque). | Les versions figées doivent rester rejouables à l'identique, même si le personnage de la bibliothèque change. |
| Attempt | La table **reste `candidate_runs`**. `candidate_id` devient nullable, on ajoute `learner_id`, `assignment_id`, `attempt_number`. Une contrainte impose exactement l'un des deux (candidat ou learner). L'unicité `(candidate_id, experience_id)` reste : elle ne gêne pas les learners (NULL distincts), qui ont des essais illimités. | Le même moteur de passage et le même scoring servent aux deux sans copier une ligne de code. |
| Accès du learner | Le learner est **connecté** : ses server actions vérifient la session et l'appartenance, puis travaillent en service_role, comme le parcours candidat le fait avec le jeton. Les sandboxes reçoivent soit un jeton candidat, soit un identifiant d'attempt. | Réutilise `resolveCandidateAndRun` au lieu de rouvrir des accès anonymes. |
| Téléphone | Troisième mode du personnage : `MODES_PERSONA = ["call", "phone", "chat"]`. `phone` = l'appel actuel sans caméra (ni `getUserMedia` vidéo, ni enregistrement vidéo). | Même moteur que la vidéo, comme demandé. |
| Company Knowledge | `organizations.knowledge_notes` (texte libre) + table `knowledge_documents` (fichier dans un bucket privé `knowledge`, texte extrait). Un module `lib/knowledge.js` assemble le contexte (résumé du site + notes + extraits) avec un plafond de taille, pour tous les générateurs. | Un seul point d'entrée pour la génération, le chat, le personnage et le feedback. |
| Invitations | Table `org_invitations` (jeton haché, rôle, expiration). Acceptation **côté serveur** : `auth.admin.createUser` ou rattachement d'un compte existant, puis e-mail Resend dans la langue de l'invité. | `/join` passe par `signUp()` navigateur, bloqué par la fermeture des inscriptions (audit §6). |
| Crédits | **Aucune ligne du code de crédits n'est modifiée.** La génération d'un module passe par le même moteur, donc par le même débit qu'une simulation. Les essais des learners : voir la question ouverte Q2. | La mission interdit de toucher à la facturation. |

---

## 2. Migrations (toutes additives)

Numérotées à la suite (`035` …). Chacune est **idempotente** (`if not
exists`), ne supprime rien, et laisse le code de `main` fonctionner : on peut
donc l'appliquer en production avant que le code qui s'en sert soit en ligne.

| N° | Contenu | Données migrées | État |
|---|---|---|---|
| 035 | `organizations`, `organization_members`, `org_invitations` ; fonctions `onbord_org_id()`, `onbord_org_role()`, `onbord_gere_org()` ; `jobs.organization_id`, `experiences.organization_id` | une organisation par utilisateur existant, l'utilisateur en `admin` | **appliquée** |
| 036 | Policies « organisation » (admin et manager) sur les six tables du recrutement ; déclencheurs qui posent l'organisation ; `logos` par organisation | — | **appliquée** |
| 037 | Dépôt anonyme dans le stockage par JETON seulement (S3) | — | **après mise en ligne** |
| 038 | Policies RESTRICTIVES : un learner ne touche à rien du recrutement (trou trouvé en test) | — | **appliquée** |
| 039 | Company Knowledge : `knowledge_documents`, `organizations.knowledge_notes`, bucket privé `knowledge` | — | **appliquée** |
| 040 | `personas` | une fiche par personnage distinct, `config.persona_id` posé dans l'étape | **appliquée** |
| 041 | `experiences.job_id` et `candidate_runs.candidate_id` facultatifs, `learner_id`, `assignment_id`, `attempt_number`, contrainte « candidat XOR learner » ; audio accepté dans `video-responses` (téléphone) | — | **appliquée** |
| 042 | `modules`, `programs`, `program_modules`, `assignments` ; `organization_members.lifecycle` ; `organizations.auto_validate` ; policies learner | — | **appliquée** |
| 043 | Dépôt des enregistrements d'un essai de learner dans `video-responses` (dossier = son essai en cours) | — | **appliquée** |
| 044 | Recrutement → onboarding : `org_invitations.source_candidate_id`, `results_reuse_informed_at` ; `organization_members.source_candidate_id`, `results_reuse_accepted_at`, `hiring_gaps` | — | **appliquée** — à passer AVANT toute mise en ligne de la branche (la lecture des invitations la nomme) |

Avant chaque migration de policies : relire `pg_policies` (les policies
s'additionnent, une seule trop large annule les autres) et vérifier les
`select()` après `insert` (audit d'août, piège du `RETURNING`).

---

## 3. Phases

Chaque phase se termine par : lint, `check:i18n`, `check:langue`, tests
unitaires, `npm run build` (serveur de dev arrêté), un commit sur
`feat/onboarding`, et la mise à jour du journal ci-dessous. **Rien n'est
poussé** : `main` est déployé en production par Vercel.

### Phase 0 — Fondations et sécurité
- Migrations 035 à 037.
- `lib/org.js` : `getOrgContext()` (utilisateur, organisation, rôle) avec repli
  sur l'utilisateur seul si la migration manque ; les écrans et actions
  recruteur passent par lui.
- Équipe : page Settings → Team (inviter par e-mail, rôle, retirer) ;
  acceptation serveur de l'invitation ; e-mail Resend FR/EN.
- Sécurité : S1 (le scraper passe par `destinationAutorisee`, redirections
  suivies à la main et revérifiées), S2 (policies `logos`), S3 (dépôt anonyme
  par jeton seulement, à appliquer après vérification qu'aucun chemin vivant
  n'utilise l'`id`), S4 (limites sur `startRun`, `saveStepResponse`,
  `submitRun`).
- Interface FR/EN : elle existe déjà (audit §10) ; on l'étend à chaque nouvel
  écran, et la langue d'interface du learner suit `users.ui_locale`.
- Tests : `node:test` installé via un script `npm test`, premiers tests sur
  `competences.js`, `persona.js` et l'agrégation du scoring.

### Phase 1 — Briques communes
- Company Knowledge : page Company → Knowledge (résumé du site, notes, dépôt
  de documents PDF/Word/texte, extraction par les parseurs existants) ;
  `lib/knowledge.js` branché dans l'analyse d'offre, le chat de conception, la
  génération, le personnage et le feedback.
- Bibliothèque de personnages (migration 039) : liste, fiche modifiable,
  choix d'un personnage existant dans l'éditeur d'étape.
- Simulations découplées des offres (migration 040) : `getSimulation(id)` à
  côté de `getExperienceForJob(jobId)` ; la génération accepte une entrée
  « module » (rôle, situation, connaissances) au lieu d'une offre.
- Canal téléphone (`mode: "phone"`) et chat mis au niveau de l'appel :
  choix dans l'éditeur, génération qui sait les proposer, scoring inchangé
  (la transcription arrive au même format dans `meta.persona`).

### Phase 2 — Onboarding, côté manager
- Modules : création rapide par le chat de conception (rôle + situation +
  Company Knowledge), « suggérer des modules » pour un rôle, édition avec
  l'éditeur d'étapes existant ; titre, objectif, rôle cible, difficulté,
  score minimum, langue de simulation (fr/en/nl).
- Programs : listes ordonnées de modules, à la main ou suggérées.
- People : inviter un learner, lui assigner modules ou program, en ajouter à
  tout moment ; validation par le manager (ou automatique si l'organisation
  l'a activée) ; « Mark as ready ».
- Dashboard : moyennes, progression par learner, scores dans le temps, par
  compétence, essais par module, temps passé, validés / assignés ; fiche
  learner avec chaque attempt, ses checkpoints et ses citations.

### Phase 3 — Onboarding, côté learner
- Espace learner (`/[lang]/formation`, en anglais `/en/training`) : modules assignés, prochain module,
  progression ; passage sur tous les canaux par le moteur existant ; retour
  juste après chaque essai (checkpoints, citations, quoi améliorer) ;
  recommencer ; historique et progression par compétence.
- E-mails : invitation, nouvel assignment, module validé (FR/EN).

### Phase 4 — Du recrutement à l'onboarding
- « Move to onboarding » sur un candidat : invitation learner liée au
  candidat, consentement « résultats réutilisés » enregistré, lacunes
  (checkpoints à 0 ou 1) listées sur la fiche du learner, modules suggérés en
  priorité sur ces lacunes, relus et assignés par le manager.

### Phase 5 — Navigation et finitions
- Navigation manager / admin : Home · Hiring ▾ (Jobs, Candidates) ·
  Onboarding ▾ (People, Modules, Programs) · Library ▾ (Personas) ·
  Company ▾ (Knowledge) · Settings (Team, Organization, Language).
- Navigation learner : My training · My results.
- Compteur des comptes learner actifs par organisation, lu par `/admin`.

---

## 4. Ce qui garantit que le recrutement ne casse pas

- Les colonnes et tables lues par le recrutement ne changent ni de nom ni de
  sens ; les nouvelles sont nullables.
- Chaque lecture de l'organisation a un repli sur l'utilisateur
  (`getOrgContext`), tant que 035 n'est pas appliquée.
- Le passage candidat (`/apply`, `/run/[token]`) et sa vérification de jeton
  ne sont pas réécrits : le chemin learner s'ajoute à côté.
- Tests unitaires sur les modules purs du parcours ; parcours complet vérifié
  à la main à la fin de chaque phase (création d'offre → compétences →
  simulation → lien → passage → rapport), sur une base où c'est sans risque
  (voir Q1).

---

## 5. Questions tranchées (10/11/2026, Remco)

- **Q1 — Base de développement : pas de base séparée.** Chaque migration est
  écrite additive (sans effet sur le code de `main`), Remco la colle dans le
  SQL Editor de production, puis le code est testé contre la production avec
  une organisation et des comptes de test, nommés comme tels et supprimés à la
  fin.
- **Q2 — Crédits : l'onboarding ne débite rien.** Ni la génération d'un
  module, ni les essais des learners, tant que la facturation reste manuelle.
  La facturation se fera au nombre de comptes learner actifs (compteur de la
  phase 5). Concrètement : les chemins d'onboarding n'appellent pas les
  fonctions de débit ; le code de crédits lui-même n'est pas modifié.

---

## 6. Journal

| Date | Phase | Commit | Fait |
|---|---|---|---|
| 10/11/2026 | Audit et plan | c9e46ffd | `docs/AUDIT.md`, `docs/PLAN.md` |
| 10/11/2026 | Phase 0 — migration 035 | 1f480af8 | organisations, membres, invitations ; **appliquée en prod par Remco le 10/11** |
| 10/11/2026 | Phase 0 — code | c941dac3 | voir ci-dessous ; migration 036 appliquée en prod par Remco le 10/11 |
| 10/11/2026 | Phase 0 — correctif | 630baf55 | migration 038 : un learner ne touche à rien du recrutement (trou trouvé en test) |

### Phase 0 — ce qui est fait

- **`src/lib/org.js`** : `getOrgContext()` (compte, organisation, rôle,
  compte de facturation), `exigerGestion()`, `exigerAdminOrg()`,
  `brandingPublic()`, `contexteEntreprise()`, `compteFacturationDuMembre()`.
  Un compte sans organisation (créé par l'ancien code) en reçoit une à sa
  première visite.
- **Le recrutement lit l'organisation** : listes d'offres, corbeille,
  vérifications d'accès (la RLS fait foi, plus de « créateur = compte
  connecté »), profil d'entreprise et image de marque (écrits sur
  `organizations`), contexte d'entreprise des générateurs, image de marque
  du parcours candidat et du retour candidat, checklist de démarrage.
- **Crédits** : le code de crédits n'est pas modifié ; les appels débitent le
  compte qui a créé l'organisation, pour que ses managers consomment le
  solde de l'entreprise.
- **Équipe** : Paramètres → Équipe (membres, rôles, invitations), invitation
  par e-mail Resend FR/EN, acceptation publique `/[lang]/invitation/[jeton]`
  qui crée le compte côté serveur (mot de passe de 10 caractères), retrait
  d'un membre = compte désactivé. Un admin invite tout rôle, un manager des
  learners.
- **Learner** : renvoyé hors du tableau de bord vers `/[lang]/formation`
  (accueil provisoire, rempli en phase 3).
- **Sécurité** : S1 (`lib/requeteSure.js`, l'analyse du site web passe par le
  filtre d'adresses), S2 (policies `logos`, migration 036), S3 (CV déposé
  sous le jeton ; resserrement SQL en migration 037), S4 (limites sur
  `startRun`, `saveStepResponse`, `submitRun`).
- **Tests** : `npm test` (node:test, 11 tests) sur les compétences, la
  notation 0/1/2, la note pondérée, l'entrée candidat, le personnage vu par
  le candidat, et le filtre d'adresses.
- Contrôles : lint identique à `main` (15 erreurs, 24 avertissements, toutes
  antérieures), `check:i18n` et `check:langue` verts, build de production OK.

### Phase 0 — à appliquer par Remco

- **Migration 036** (accès par organisation, déclencheurs, `logos`) : maintenant.
  Additive ; le code de `main` continue de fonctionner.
- **Migration 037** (dépôt anonyme par jeton seulement) : **après** la mise en
  ligne de ce code, jamais avant (elle bloquerait le dépôt de CV du code de
  `main`).

### Phase 0 — vérifié en production le 10/11/2026

Sur une organisation « TEST Onbord » (comptes `onbord-test-p0-*@example.com`,
gardés pour les phases suivantes, supprimés à la fin du chantier) :

- offre créée depuis le navigateur : l'organisation est posée par le
  déclencheur, et un client ne peut pas la changer ;
- invitations manager (fr) et learner (en) acceptées par la vraie page :
  comptes créés, rattachés, connectés ; le learner arrive sur « My training »
  et un lien vers une offre le renvoie à son espace ;
- page Équipe : 3 membres, rôles modifiables par l'admin ; un manager ne peut
  inviter que des learners ;
- RLS : admin et manager voient et modifient l'offre de l'organisation, le
  learner ne la voit ni ne la modifie ; aucun navigateur ne lit les
  invitations ;
- **trou trouvé : le learner pouvait CRÉER une offre** (policy d'insertion de
  021). Corrigé par la migration 038 (policies restrictives), à appliquer ;
- parcours candidat sur une copie de simulation publiée : candidature par
  `/apply`, consentement, passage démarré sur `/run`, image de marque de
  l'organisation, crédit de démarrage débité sur le compte de facturation de
  l'organisation (500 → 499).

Non vérifié : l'envoi réel d'un e-mail d'invitation (il serait parti chez
Resend), la soumission et la notation d'un passage (appels au modèle), la
génération d'une simulation.
| 10/11/2026 | Phase 1 — briques communes | 2a13f0ce | voir ci-dessous ; migrations 039 à 041 appliquées le 10/11 |

### Phase 1 — ce qui est fait

- **Company Knowledge** : page Connaissances (`/entreprise/connaissances`) :
  le résumé du site, des notes libres, des documents PDF, Word ou texte
  (20 Mo, déposés par le navigateur dans le dossier de l'organisation, texte
  extrait par le serveur). `lib/knowledge.js` : un seul bloc « contexte
  d'entreprise » pour les sept prompts qui le recopiaient (génération,
  scènes, critique, couverture, réécriture, chat de conception), base
  bornée à 12 000 caractères. `contexteEntreprise()` (lib/org.js) y ajoute
  notes et documents. Sans base, le texte des prompts est inchangé.
- **Bibliothèque de personnages** (`/bibliotheque/personnages`) : liste,
  fiche modifiable avec les mêmes éditeurs que l'étape, archivage,
  génération d'une fiche à partir d'une phrase (Sonnet 5.5, avec le Company
  Knowledge, sans crédit). Les personnages générés avec une simulation y
  entrent automatiquement. Dans l'éditeur d'étape : prendre une fiche de la
  bibliothèque, ou y ranger celle de l'étape. L'étape garde sa copie
  (version figée) et le lien `config.persona_id`, qui ne part jamais chez le
  candidat. Nouveau champ `mood` (humeur) : généré, modifiable, joué.
- **Canal téléphone** : `MODES_PERSONA = ["call", "phone", "chat"]`. Même
  moteur que l'appel vidéo, sans caméra, audio enregistré. Choix dans
  l'éditeur, proposé par la génération, textes candidat en fr, en et nl.
  Le chat existait déjà (aucune étape en production ne l'utilisait).
- **Simulations détachées des offres** : migration 041 (colonnes). Le code
  qui s'en sert arrive avec les modules (phase 2) et les essais des
  learners (phase 3) ; à reprendre alors : `runScoring` lit l'offre par
  `jobs!inner`, ce qui ne marchera pas pour un module.
- `parse-file` réservé à un compte connecté (il lisait les fichiers d'un
  anonyme).
- Tests : 16 (`tests/briques.test.mjs` en plus). Lint identique à `main`,
  `check:i18n` et `check:langue` verts, build OK.

### Phase 1 — vérifié en production le 10/11/2026

Migrations 039, 040 et 041 appliquées par Remco. 040 : 10 étapes à
personnage → 9 fiches (deux copies de version identiques), aucune étape sans
lien. Sur l'organisation de test :

- Connaissances : notes enregistrées, document texte déposé et lu (226
  caractères) ;
- Personnages : fiche générée en 17 s à partir d'une phrase, canal
  téléphone ; elle **reprend le Company Knowledge** (le forfait à 360 € du
  document de test, la PME des notes), avec son humeur ;
- Téléphone : une étape à ce personnage, ouverte par un candidat de test.
  Le navigateur ne demande que le micro (`{"video":false,"audio":true}`),
  aucune vidéo affichée, consigne « seul le son est enregistré ».

Non vérifié : un appel téléphonique rejoint et noté de bout en bout
(il demande une voix réelle).
| 10/11/2026 | Phase 2 — onboarding côté manager | ce575df2 | voir ci-dessous ; 042 appliquée, vérifiée en production |

### Phase 2 — ce qui est fait

- **Une simulation a une offre OU un module** (`experiences.module_id`,
  migration 042). `lib/simulationSource.js` présente un module sous la forme
  « offre » que lit tout le moteur : la génération, la réécriture d'étape, la
  couverture, le chat d'étape, la notation (plus de `jobs!inner`), les
  versions figées (numérotées par module), la publication. Les contrôles
  d'accès s'appuient sur la RLS (policies « organisation »).
- **Modules** (`/onboarding/modules`) : création en quelques champs (titre,
  rôle, situation, objectif, difficulté, score minimum, langue fr/en/nl),
  génération de la simulation en flux (`lib/moduleGeneration.js`, route
  `/api/modules/generate`, même moteur que le recrutement, compétences
  déduites de la situation si absentes), relecture et retouche avec
  l'éditeur d'étape habituel (`EspaceEtape`, sorti de la page d'étape d'une
  offre), publication. **Suggestions** de modules pour un rôle, tirées du
  Company Knowledge, à garder ou non. Aucun crédit, y compris pour les
  réécritures d'étape d'un module.
- **Programmes** (`/onboarding/programmes`) : listes ordonnées de modules.
- **Personnes** (`/onboarding/personnes`) : invitation d'un learner, fiche
  par personne : assigner des modules et/ou un programme (avec échéance),
  en ajouter à tout moment, valider un module, « Marquer comme prête »
  (`organization_members.lifecycle`), et chaque essai avec ses checkpoints et
  leurs citations.
- **Tableau de bord** (`/onboarding`) : moyennes, progression par personne,
  scores par semaine, par compétence, essais par module, temps passé, validés
  sur assignés ; réglage « validation automatique » (admin, désactivé par
  défaut).
- La notation d'un essai de learner ne débite rien et rédige son rapport
  dans la langue du learner.
- Lint identique à `main`, 16 tests, `check:i18n` et `check:langue` verts,
  build OK.

### Phase 2 — vérifiée en production

042 appliquée (en deux fois : un premier passage partiel, rejoué en entier).
Sur l'organisation de test : 5 suggestions de modules en 9 s, un module créé
et sa simulation générée en 76 s (2 étapes), publiée, une étape ouverte dans
l'éditeur, le module assigné au learner de test (`assigned`), tableau de bord
affiché.

À reprendre en phase 5 : le fil de génération d'un module dit « Offre
analysée », et le copilote d'étape parle d'« offre » et de « candidat ».

| 10/11/2026 | Phase 3 — onboarding côté learner | 712f497e (+ bf910530) | voir ci-dessous ; 043 appliquée |

### Phase 3 — ce qui est fait

- **L'essai passe par l'écran du parcours** (`/run/<id de l'essai>`), le même
  que celui des candidats, sur tous les canaux (écrit, vidéo, appel,
  téléphone, chat). Le jeton d'un essai est l'id du `candidate_runs` ; il ne
  vaut qu'avec la session du learner qui le fait (`lib/passage.js`). Le
  candidat est cherché d'abord : son chemin ne change pas. Les six points
  d'entrée (actions du parcours, assistant, personnage, Realtime, voix,
  transcription) passent par cette résolution ; la langue vient de l'offre
  OU du module (plus de `jobs!inner`). Pour un learner : ni questions
  qualificatives, ni CV, ni péremption, ni facture ; accueil et écran de fin
  à lui (« un entraînement, seul le meilleur score compte », « Voir mon
  retour », dans la langue de son interface).
- **Espace learner** (`/formation`) : progression, « à faire maintenant »,
  tous les modules (statut, meilleur score, seuil, échéance, dernier retour),
  Commencer / Reprendre / Refaire un essai (`lib/actions/formation.js`). Un
  essai en cours se reprend au lieu d'en ouvrir un second ; le premier essai
  verrouille la version jouée, comme le premier candidat.
- **Retour après chaque essai** (`/formation/essais/<id>`) : score face au
  seuil, synthèse rédigée POUR le learner (deuxième personne, deux points à
  travailler, dans sa langue), chaque compétence avec ses points attendus
  0/1/2, leur justification et la citation qui le prouve. La page attend la
  notation toute seule (≈ 25 s).
- **Résultats** (`/formation/resultats`) : chaque compétence, son dernier
  score, sa courbe et son évolution depuis le premier essai ; tous les essais.
- **Assignation après la notation** (`lib/assignations.js`, règles pures dans
  `lib/essais.js`) : meilleur score retenu, « seuil atteint » (`passed`), ou
  `validated` directement si l'organisation valide automatiquement. Une
  assignation validée le reste.
- **E-mails** (FR/EN, langue du destinataire) : « nouveaux modules » à
  l'assignation (seulement les nouvelles), « module validé » (par le manager
  ou automatiquement). Jamais envoyés à un domaine réservé (`example.com`…) :
  les comptes de test y vivent.
- **043** : un learner connecté dépose ses enregistrements sous le dossier de
  SON essai en cours, rien d'autre. Sans elle, l'essai se joue et se note
  (sur la transcription), seul l'enregistrement manque.
- 25 tests (9 nouveaux : `tests/onboarding.test.mjs`), lint identique à
  `main`, `check:i18n` et `check:langue` verts, build OK.

### Phase 3 — vérifiée en local contre la production (avant 043)

Learner de test, module de test (l'étape d'appel passée en chat le temps du
test, puis remise en appel) : accueil → Commencer → essai créé (`learner_id`,
`assignment_id`, essai n° 1, aucun `candidate_id`) ; le même lien SANS
session est refusé (« Lien d'évaluation invalide ») ; réponse écrite,
conversation de 3 répliques avec le personnage, soumission ; notation en 24 s ;
retour affiché en anglais à `/en/training/attempts/…` ; assignation
`in_progress`, meilleur score 40. Second essai (seuil abaissé à 30,
validation automatique) : essai n° 2, assignation `validated`, e-mail
« Module validated » composé en anglais et retenu (adresse de test). Seuil et
réglage remis. Non-régression : le lien d'un candidat de test ouvre toujours
son parcours.

043 appliquée, contrôlée : un learner connecté dépose sous son essai en cours ;
refusé sur un essai noté, un dossier quelconque, ou sans session.

**Trouvé en le testant** : un dépôt avec `upsert: true` est refusé à TOUT le
monde, candidats anonymes compris (le stockage exige alors un droit de
lecture) — or les deux composants d'enregistrement l'utilisaient. La dernière
vidéo enregistrée en production date du 23/10. Correctif : `upsert: false`
(le chemin est horodaté, toujours neuf), commit à part, à reporter sur `main`.

Non vérifié : un e-mail réellement reçu.

Repris après la phase 5 : les justifications de chaque point s'adressent
aussi au learner, dans la langue de son interface (`consigneLangueRapport`,
option `pourLearner`). Vérifié sur un essai réel : tout en anglais, à la
deuxième personne, y compris l'étape jouée en français.

| 10/11/2026 | Phase 4 — du recrutement à l'onboarding | 71b5b954 | voir ci-dessous ; 044 appliquée |

### Phase 4 — ce qui est fait

- **« Passer en onboarding »** sur la fiche d'un candidat (`components/candidates/VersOnboarding.js`,
  `versOnboarding` dans `lib/actions/equipe.js`) : invitation de learner liée au
  candidat (`source_candidate_id`), adresse et langue choisies, et une case
  OBLIGATOIRE par laquelle le manager atteste avoir prévenu la personne que ses
  résultats seront réutilisés (`results_reuse_informed_at`). Le bouton suit
  l'état : invité, puis « Voir en onboarding » vers sa fiche.
- **Le consentement de la recrue** : l'écran d'activation lui demande, case
  DÉCOCHÉE par défaut, si ses résultats orientent son entraînement. Oui :
  `results_reuse_accepted_at` et une COPIE figée de ses lacunes
  (`hiring_gaps` : poste, note, date, points notés 0 ou 1, au plus 20,
  `lacunesDuRecrutement` dans `lib/essais.js`). Non : seul le lien au candidat
  est gardé, la fiche dit qu'elle a refusé. La copie ne dépend plus des tables
  du recrutement (candidature supprimée, purge).
- **Sur la fiche de la recrue** (`components/onboarding/LacunesRecrutement.js`) :
  ses lacunes, et « Suggérer des modules pour ces lacunes » — le générateur de
  suggestions reçoit les lacunes et les travaille en priorité, les points à 0
  d'abord. Le manager garde ce qu'il veut : modules créés (dans la langue de
  l'offre, pour le poste de l'offre) et assignés d'un coup, chacun avec son lien
  « À générer » (la génération part à l'ouverture).
- L'e-mail d'invitation d'une recrue venue du recrutement annonce le choix qui
  l'attend. Aucune invitation n'est envoyée à un domaine réservé (tests).
- 27 tests, lint identique à `main`, `check:i18n` vert, build OK.

### Phase 4 — vérifiée en local contre la production

Organisation de test : le candidat de test reçoit une simulation notée (notes
copiées d'un essai de test, 40 %) ; passé en onboarding depuis sa fiche — le
bouton reste inactif tant que la case n'est pas cochée ; invitation en base
avec le candidat et la date d'information ; la recrue active son compte en
anglais en acceptant le partage : membre `learner`, consentement daté, 16
lacunes copiées avec le poste et la note ; sur sa fiche, 4 modules proposés en
8 s, chacun visant des lacunes réelles (« Reconnaître la double facturation de
360 € », « Tenir face à la menace de résiliation », « Défendre le Pro par le ROI
en trois mois », « Conclure l'appel : accord, récap et suivi »), créés et
assignés ; la fiche candidat affiche « Voir en onboarding ».

Refus du partage vérifié ensuite : case décochée par défaut, membre lié au
candidat sans date d'accord ni lacunes, fiche « a choisi de ne pas partager »,
aucune suggestion sur lacunes. Non vérifié : un e-mail réellement reçu.

| 10/11/2026 | Phase 5 — navigation et finitions | *(ce commit)* | aucune migration |

### Phase 5 — ce qui est fait

- **Menu en groupes** (`components/layout/Sidebar.js`) : Tableau de bord ·
  Recrutement ▾ (Offres, Candidats) · Onboarding ▾ (Vue d'ensemble, Personnes,
  Modules, Programmes) · Bibliothèque ▾ (Personnages) · Entreprise ▾
  (Connaissances) · Paramètres. Chaque groupe se replie (mémorisé dans le
  navigateur) ; celui de la page ouverte reste déplié. Menu réduit : les icônes,
  un trait entre les groupes. Paramètres reste l'entrée de l'équipe, du profil
  et de la langue (`/compte`).
- **Recrutement → Candidats** (`/candidats`, en anglais `/en/candidates`) : tous
  les candidats de l'organisation, hors corbeille, recherche (nom, adresse,
  offre) et filtre par offre ; chaque ligne ouvre la fiche habituelle.
- **Learner** : Mon entraînement · Mes résultats (fait en phase 3).
- **`/admin`** : nombre de learners actifs (essai commencé dans les 30 derniers
  jours), et par compte client « actifs / total » (`compterLearnersActifs`,
  `lib/essais.js`). Rien n'est facturé : c'est la base de la facturation à
  venir.
- **Un module n'est pas une offre** : le fil de génération d'un module dit
  « Module lu » ; le copilote d'une étape de module sait que c'est un
  entraînement (manager, personne qui s'entraîne, réécriture gratuite) et
  l'écran n'affiche plus « 2 crédits ».
- 28 tests, lint identique à `main`, `check:i18n` vert, build OK. Vérifié
  dans le navigateur : candidats et recherche, groupe replié qui le reste après
  rechargement, copilote d'une étape de module. Le compteur `/admin` n'a pas pu
  être affiché (réservé aux adresses de l'équipe Onbord) : ses requêtes ont été
  rejouées à part.

### 16/11/2026 — Une seule entrée : « Créer une simulation »

Retour de Remco après ses tests : le recrutement et l'onboarding étaient trop
séparés. Ce qui a été tranché avec lui, puis fait (aucune migration) :

- **Simulations** (`/simulations`) : toutes les simulations de l'organisation
  au même endroit, recrutement (une par offre) et onboarding (une par module),
  filtre par usage, recherche. Dans le menu, juste sous l'accueil. « Modules »
  quitte le menu : `/onboarding/modules` y renvoie (filtre onboarding) ; les
  pages d'un module ne bougent pas. Personnages rejoint le groupe Entreprise.
- **Créer une simulation** (`/simulations/creer`, `/en/simulations/create`) :
  on choisit d'abord l'usage. Recrutement : l'offre, comme avant
  (`/jobs/nouveau`). Onboarding, sur une page : le rôle → les conversations
  proposées à partir du Company Knowledge (ou la sienne) → le personnage
  (bibliothèque, ou créé par Onbord) → difficulté et seuil → génération.
- **Personnage choisi avant la génération** : `runModuleGeneration(…, {
  personaId })`. La génération écrit la situation POUR lui ; son identité
  (`CHAMPS_IDENTITE`, `imposerPersonnage`, `lib/persona.js`) remplace celle
  du personnage généré, l'étape garde le lien. Régénérer garde l'interlocuteur.
- **Tester** (`lib/actions/tests.js`, bouton sur la page d'un module et sur la
  simulation d'une offre) : un admin ou un manager joue la simulation en
  entier, brouillon ou publiée, et lit le retour que recevra la personne
  (`/simulations/tests/<id>`). Un test est un passage à son nom, sans
  assignation ni numéro d'essai (`estUnTest`) : rien de facturé, aucun
  candidat, aucune assignation touchée, version non verrouillée. **Un test
  complet par simulation**, toutes versions confondues
  (`TESTS_PAR_SIMULATION`, `lib/essais.js`).
- **Lacunes du recrutement** : les modules créés pour une recrue entrent dans
  la bibliothèque et se réutilisent (vérifié par Remco : légal). La consigne
  interdit de nommer la personne ou de citer ses réponses ; les suggestions
  connaissent la bibliothèque et DÉSIGNENT un module déjà là (`existing_id`)
  plutôt que d'en écrire un second — il est assigné, pas recréé.
- **Abandonné** : une grille de compétences par rôle (les compétences restent
  tirées de l'offre, ou déduites de la situation pour un module) ; tout
  outillage de l'appel d'onboarding client (il se fait sur Google Meet, le
  compte est créé en admin).
- **Pas fait, à décider** : les tests d'UNE étape en mode texte (peu coûteux).
  Ils demandent de distinguer deux sortes de tests, donc une colonne — une
  migration additive.
- 31 tests, lint identique à `main`, `check:i18n` vert. Vérifié dans le
  navigateur sur l'organisation de test : liste et filtres, ancienne adresse,
  création guidée (5 conversations en 10 s, dont 4 reconnues en bibliothèque),
  génération en 94 s avec le personnage choisi lié à l'étape, test complet
  noté (38 %), retour lisible par l'admin et le manager et refusé au learner,
  second test refusé, assignations intactes.

### 16/11/2026 (suite) — Création unique, une simulation d'onboarding = une conversation

Retour de Remco après avoir tout joué. Tranché avec lui, puis fait
(migration **045**, additive) :

- **Recrutement inchangé** (plusieurs étapes, même agent). Seule l'écriture de
  document disparaît des propositions de la génération : Onbord ne simule que
  des conversations (chat, e-mail, appel vidéo, appel téléphonique).
- **Onboarding : UNE conversation, UN canal** (`modules.channel`) :
  `lib/simulationOnboarding.js` écrit une seule étape — appel vidéo (la
  personne est filmée, le personnage répond à la voix), téléphone, chat ou
  e-mail. Les règles pures (canaux, brief, grille) : `lib/simulationCanal.js`.
- **Fait pour apprendre** : le générateur sait que c'est un entraînement ; un
  checkpoint peut exiger un fait de l'entreprise ; la simulation rend « À
  retenir » (`config.a_retenir`), lu par la personne APRÈS chaque essai avec
  son retour (jamais avant : `sanitizeStepForCandidate` le retire).
- **Création unique** (`/simulations/creer`) : usage → recrutement comme avant
  ; onboarding = rôle (déjà utilisé ou nouveau ; à approfondir plus tard) →
  canal → langue, difficulté, seuil → personnage (bibliothèque, filtrée sur la
  langue, ou créé sur place) → **agent de conception** (`lib/agentOnboarding.js`,
  `/api/chat/module`) : il demande TOUJOURS le scénario tel qu'il se vit dans
  l'entreprise, puis les objections, ce qu'il faut savoir, la réussite, et
  remet un récapitulatif avec la grille proposée → « Générer » crée le module
  (`modules.brief`, `modules.persona_id`, `modules.criteria`).
- **Page d'une simulation** : aperçu complet (personnage, mission, contexte,
  objections, informations cachées, fin, grille, À retenir), tester, publier,
  assigner à des personnes, régénérer (même personnage), supprimer.
- **Personnage = une personne** (`identitePersona`, `CHAMPS_IDENTITE`) : nom,
  fonction, entreprise, qui il est (`background`), caractère, langue et voix
  (un seul choix : la voix vient avec la langue, homme ou femme). Objections,
  humeur et situation s'écrivent avec chaque simulation. Nouvelle fiche
  (`components/personas/PersonaFiche.js`) avec « Proposer une fiche » à partir
  d'une phrase. « Utiliser » un personnage dans une étape de recrutement
  reprend son identité et garde la situation de l'étape.
- **Supprimer pour de bon**, avec confirmation : une simulation d'onboarding
  (versions, essais, notes, enregistrements du stockage, assignations —
  `supprimerModule`) depuis la liste ou sa page ; un personnage depuis
  Personnages. Une offre, depuis la liste Simulations, part en corbeille et
  est effacée 7 jours plus tard (mécanisme existant).
- **Connaissances** : rubriques (`organizations.knowledge_sections`) — offre,
  acheteurs types, concurrents, marchés et langues (pré-remplissables depuis
  le site : `brouillonsDuSite`), comment on vend, fait du support, recrute,
  autres notes. Documents : trois types de plus (transcription d'appel,
  échanges écrits, playbook) et un interrupteur « utilisé / de côté »
  (`knowledge_documents.active`) : seuls les actifs nourrissent les agents.
  Les objections ne sont plus dans les connaissances : l'agent les demande.

## 7. Avant la mise en ligne

1. Migrations **035 à 045 appliquées** (035-044 le 10/11/2026, 045 le 17/11). Parcours
   complet testé le 17/11 sur l'organisation de test : agent, génération, grille,
   test, publication, assignation, suppression, connaissances.
2. Reporter et pousser `bf910530` (dépôt sans upsert) peut se faire seul, avant
   le reste : il corrige l'enregistrement des vidéos des candidats en production.
3. Fusionner `feat/onboarding` dans `main`, pousser, vérifier le statut Vercel.
4. **Après** la mise en ligne seulement : migration **037** (dépôt du CV par le
   jeton seul).
5. Effacer l'organisation et les comptes de test : `node test-p0.mjs nettoyer`
   (scratchpad de la session).
