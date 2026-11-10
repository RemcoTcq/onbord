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

| N° | Contenu | Données migrées |
|---|---|---|
| 035 | `organizations`, `organization_members`, `org_invitations` ; fonctions `onbord_org_id()` et `onbord_org_role()` (SECURITY DEFINER, lisent l'appartenance de `auth.uid()`) ; `jobs.organization_id`, `experiences.organization_id` | une organisation par utilisateur existant, copie des colonnes `company_*`, l'utilisateur en `admin` ; `organization_id` rempli sur les offres et les simulations |
| 036 | Policies par organisation (admin et manager) sur `jobs`, `experiences`, `experience_steps`, `experience_chats`, `candidates`, `job_skills`, lecture des runs et des notes ; le learner n'en reçoit aucune | — |
| 037 | Stockage : `logos` limité aux membres admin de l'organisation propriétaire du chemin ; bucket privé `knowledge` | — |
| 038 | `knowledge_documents`, `organizations.knowledge_notes` | — |
| 039 | `personas` | une ligne par personnage d'étape existant, `config.persona_id` posé dans l'étape |
| 040 | `experiences.job_id` nullable ; `candidate_runs.candidate_id` nullable + `learner_id`, `assignment_id`, `attempt_number` + contrainte « candidat XOR learner » | — |
| 041 | `modules`, `programs`, `program_modules`, `assignments` ; `organization_members.lifecycle` (`onboarding`, `ready`, extensible) ; `organizations.auto_validate` (faux par défaut) ; policies learner (ses assignments, ses attempts, ses notes) | — |
| 042 | Passage recrutement → onboarding : `org_invitations.source_candidate_id`, `results_reuse_informed_at` ; `organization_members.source_candidate_id` | — |

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
- Espace learner (`/[lang]/learn`) : modules assignés, prochain module,
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
| 10/11/2026 | Phase 0 — correctif | *(ce commit)* | migration 038 : un learner ne touche à rien du recrutement (trou trouvé en test) |

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
