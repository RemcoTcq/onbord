// Pipeline de génération d'expérience — module PUR (pas "use server").
//
// Extrait de lib/actions/experience.js pour pouvoir être appelé DEUX fois :
//  - par la server action generateExperience (chemin historique, sans feed) ;
//  - par la route /api/experience/generate, qui pousse chaque étape réelle du
//    pipeline au client au fur et à mesure (onEvent).
// Les prompts sont la source de vérité unique : ils ne vivent QUE ici.

import { createClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { chargerDecouverte } from "@/lib/experienceChat";
import { construireBriefDecouverte } from "@/lib/experienceDecouverte";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { crmSkillName, normaliserCrm, crmEstEspace } from "@/lib/crmScoring";
import { normaliserTableur } from "@/lib/tableur";
import { normaliserBoite } from "@/lib/boiteReception";
import { normaliserPersona } from "@/lib/persona";
import { consigneVoix } from "@/lib/constants/voix";
import { normaliserTableau, MODES as MODES_TABLEAU } from "@/lib/tableauCartes";
import { versionModifiable } from "@/lib/experienceVersion";
import {
  listerCompetences, resoudreIds, normaliserCritere, estCritereCheckpoints,
  calculerCouverture, blocCompetencesPrompt, MUST,
} from "@/lib/competences";
import { estimerMinutes } from "@/lib/experienceDuree";
import { consigneLangueContenu, consigneLangueEtapes } from "@/lib/i18n/prompt";
import { coerceExperienceLocale, coerceUiLocale } from "@/lib/i18n/config";
import { niveauLangueLisible } from "@/lib/i18n/languages";
import { sceneEnTexte } from "@/lib/sceneEtape";
import { checkCredits, simulationPrepayee, factureGenerationSimulation, factureRegenerationEtape } from "@/lib/utils/limits";
import { CREDIT_COSTS } from "@/lib/constants/plans";
import { CODE_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants/codeLanguages";

// Opus pour concevoir le parcours : c'est la tâche la plus difficile du
// produit, et elle ne tourne qu'une fois par offre.
const GENERATION_MODEL = "claude-opus-5-5";

// Sonnet pour le bouton « Couvrir une compétence » de l'éditeur
// (runCouvertureCompetence) : une retouche ciblée sur un parcours déjà conçu.
// Les mêmes passes servent aussi à la génération complète, d'où le modèle
// passé en paramètre plutôt qu'un second jeu de fonctions.
const COUVERTURE_MODEL = "claude-sonnet-5-5";

// ─── Réflexion interne avant réponse ──────────────────────────────────────────
// Le modèle devait jusqu'ici sortir son JSON immédiatement, sans espace pour
// raisonner sur la répartition des compétences ou la cohérence du scénario.
// `adaptive` lui rend cet espace : il décide lui-même combien il en prend.
//
// `display: "omitted"` : personne n'affiche ce raisonnement — le feed ne montre
// que les événements du pipeline, et le chat de conception ne rend que les blocs
// `text` (extractText, AssessmentChatCreator). Un résumé serait du texte qu'on
// stocke pour rien, et que le chat repaierait en entrée à CHAQUE tour suivant.
// La réflexion est facturée de la même façon dans les deux cas : `display` ne
// change que ce qui revient.
const REFLEXION = { type: "adaptive", display: "omitted" };

// ── Et une réflexion BORNÉE, sinon elle mange tout ──────────────────────────
// Sans ce réglage, le modèle réfléchit au niveau "high" (le défaut) : mesuré au
// banc, une génération complète dépassait alors 16 000 tokens de sortie et se
// faisait TRONQUER — deux fois de suite, donc génération perdue. La réflexion
// qu'on cherche ici tient en quelques phrases (répartir les compétences, tenir
// la cohérence du scénario), pas en une délibération sans fin.
//
// "medium" est donc un plafond de qualité autant que de coût : au-delà, on
// paie de la latence et un risque de troncature pour un raisonnement dont on
// n'a pas l'usage.
const EFFORT_REFLEXION = "medium";

// Les passes « sans réflexion » tournent à cet effort. Opus 5.5 et Sonnet 5.5
// ne permettent plus de couper la réflexion (`disabled` = 400) : "low" est le
// plus bas, et le modèle y saute la réflexion quand la tâche le permet.
const EFFORT_SANS_REFLEXION = "low";

// ── Sauf pour la passe de CONCEPTION : réflexion au plus bas ────────────────
// Mesuré au banc le 29/09/2026 (offre Spott, Sonnet 4.6) : en "medium", 209 s
// de réflexion AVANT la première étape écrite, 43 s pour écrire tout le JSON,
// puis 52 s de critique — 304 s, au-delà des 300 s que la route peut durer
// (maxDuration, plafond du plan Vercel). En "low", encore 137 s de réflexion :
// le budget ne laissait plus la place d'un second essai quand le JSON sortait
// invalide, et la génération était perdue. Sous Opus 5.5 la réflexion ne se
// coupe plus : cette passe tourne à EFFORT_SANS_REFLEXION.
// Ce que cette réflexion arbitrait — répartir les compétences, dimensionner le
// parcours — est désormais écrit en toutes lettres dans le prompt (règles 1 et
// 6), vérifié par le code (couverture), et relu par la passe de critique, qui
// garde sa réflexion : c'est elle, le second regard.
const REFLEXION_CONCEPTION = false;

// Interrupteur d'exploitation : la réflexion se ramène au plus bas
// (EFFORT_SANS_REFLEXION) par variable d'environnement, sans toucher au code —
// la couper tout à fait n'existe plus sur les modèles 5.5. Il change TOUTES
// les passes à la fois — c'est précisément ce qu'on veut pouvoir annuler d'un
// geste si elle dérape en production.
const REFLEXION_ACTIVE = process.env.ONBORD_REFLEXION !== "0";

// Idem pour la passe de critique (2e regard sur le parcours généré). Séparée de
// la précédente : ce sont deux leviers indépendants, et l'un peut être bon
// pendant que l'autre déçoit.
const CRITIQUE_ACTIVE = process.env.ONBORD_CRITIQUE !== "0";

// ─── Règles partagées par les deux prompts ────────────────────────────────────
// Ces règles décrivent CE QU'EST UNE BONNE ÉTAPE. Elles valent donc à
// l'identique quand on génère l'expérience entière et quand on en réécrit une
// seule (regenerate_step) — et c'est bien le problème : recopiées dans deux
// prompts, elles divergent au premier ajustement, et la retouche d'une étape se
// met à produire autre chose que sa génération d'origine.
//
// La numérotation (3 à 8) est celle du prompt principal, conservée telle quelle
// pour que le bloc y reste inséré sans réécriture. Elle n'a pas de sens dans le
// prompt de régénération, qui l'introduit par un titre explicite ; un modèle
// n'en a que faire, un relecteur humain a besoin de savoir pourquoi ça commence
// à 3.
// Ce qu'est un bon checkpoint. Sorti de REGLES_ETAPE parce qu'un troisième
// prompt en a besoin tel quel : la passe de couverture, qui écrit une
// sous-dimension pour une compétence must-have restée sans checkpoint. Recopiées,
// ces règles divergeraient à la première retouche — et c'est la règle de PORTÉE
// (e) qui porte l'équité de la grille.
const REGLES_CHECKPOINTS = `   c) Chaque sous-dimension reçoit 3 à 5 CHECKPOINTS INDÉPENDANTS. Un checkpoint = UN SEUL comportement observable dans la réponse. Chacun est noté à part (absent / présent mais faible / présent et bien fait), puis les checkpoints s'additionnent : un candidat qui en réussit deux sur trois est crédité pour ces deux-là. N'écris donc JAMAIS un checkpoint qui combine plusieurs comportements — « valide l'objection, la reformule puis argumente », ce sont trois checkpoints. Et jamais moins de 3 : une sous-dimension qui n'en trouve que deux est trop étroite — fusionne-la avec sa voisine plutôt que de la laisser à deux.
   d) Range-les dans l'ordre logique de la réponse quand il en existe un (reconnaître avant de reformuler, reformuler avant d'argumenter).
   e) PORTÉE — la règle qui rend la grille juste : chaque checkpoint doit être atteignable par un bon professionnel qui découvre l'entreprise aujourd'hui, avec la SEULE information remise dans l'énoncé et la scène. N'exige jamais un chiffre, un délai, une référence client, une fonctionnalité du produit ou un fait interne qui n'y figure pas. Si un fait doit être utilisé, mets-le dans la scène. Sinon, écris le checkpoint sur la démarche (« propose de chiffrer le gain avec le prospect »), jamais sur le fait (« cite un gain de 30 % »).
   f) Un checkpoint décrit ce que la réponse FAIT, pas comment elle est tournée : pas de phrase modèle à reconnaître, pas de verbatim à reproduire. Deux bons candidats qui s'y prennent différemment doivent pouvoir valider le même checkpoint. Jamais de formulation vague (« bonne qualité », « réponse adéquate »).
   g) Au plus UN checkpoint par sous-dimension décrit un geste au-delà de l'attendu (ex. : retourner l'objection en levier). Les autres décrivent ce qu'une réponse correcte doit accomplir.`;

const REGLES_ETAPE = `3. INTERDICTION des questions rétrospectives auto-déclaratives ("décrivez une situation où vous avez…", "racontez une expérience passée…", "parlez-moi d'une fois où…"). Elles recréent le biais du CV déclaratif que ce produit doit éviter : on mesure ce que le candidat FAIT maintenant, pas ce qu'il dit avoir fait.
4. Pour un signal oral/relationnel, utilise une MISE EN SITUATION JOUÉE EN DIRECT : place le candidat dans une scène concrète et fais-le RÉPONDRE DANS L'INSTANT, comme s'il y était (ex. : "Un prospect vous dit en visio : '…'. Répondez-lui maintenant, directement."). Jamais un récit après coup.
5. LA BONNE PREUVE POUR CHAQUE COMPÉTENCE. Avant d'écrire une étape, demande-toi quel GESTE DE TRAVAIL montre le mieux la compétence qu'elle doit noter — pas quel format est le plus simple à écrire. Repères :
   - écrire à un client, un prospect, un partenaire, un collègue (ton, clarté, persuasion écrite) → sandbox "email" ou "client_reply" ;
   - conduire un ÉCHANGE à l'oral sur plusieurs tours — appel à froid, découverte, objections, négociation, escalade client, feedback ou conflit avec un collaborateur → sandbox "persona" (un appel avec un interlocuteur joué par l'IA, qui a ses objections et des informations à faire sortir). C'est la meilleure preuve des métiers où tout se joue en conversation ;
   - un échange qui se vit réellement PAR ÉCRIT (chat de support, messagerie interne, message LinkedIn) → sandbox "persona" en mode "chat" ;
   - une prise de parole d'une traite — pitch, présentation, posture, aisance orale, message vidéo → "video", mise en situation jouée en direct (règle 4) ;
   - consigner, suivre, prioriser des opportunités ou des comptes, préparer un rendez-vous à partir d'un historique → sandbox "crm" ;
   - analyser des chiffres, raisonner sur des données, piloter par indicateurs, construire un reporting → sandbox "sheet" (tableur) ;
   - prioriser, s'organiser, arbitrer entre des demandes concurrentes, tenir sous la charge → sandbox "inbox" (boîte de réception) ;
   - arbitrer un backlog, une roadmap, un plan de projet ou une file de tickets sous contrainte (capacité, budget, délai) → sandbox "board" (tableau de cartes) ;
   - structurer une réflexion : note, plan d'action, cahier des charges, process → sandbox "document" ;
   - une connaissance qui se vérifie mieux par une question fermée → "classic_qcm", avec parcimonie ;
   - programmer → sandbox "code", uniquement pour un poste technique.
   Un must-have central gagne à être observé dans DEUX gestes différents (l'écrit et l'oral, le calcul et la recommandation). AU PLUS UN step de chacune des sandboxes "crm", "sheet", "inbox", "board" et "persona" par expérience.
   "response_format" par défaut : "text" pour l'écrit et pour toutes les sandboxes (email, client_reply, document, crm, sheet, inbox, board, persona — même en appel : c'est la transcription qui est notée) ; "video" pour l'oral, TOUJOURS sous forme de mise en situation jouée en direct (règle 4) ; "qcm" pour un QCM ; "code" pour le code. Le recruteur pourra changer ce défaut ; propose le plus pertinent.
6. COMPÉTENCES ET GRILLE DE CHAQUE ÉTAPE.
   a) "skills_tested" : les IDENTIFIANTS (entre crochets dans la liste des compétences validées) des compétences que l'étape teste — une ou plusieurs, de tiers différents quand un même geste s'y prête. Recopie-les TELS QUELS. Jamais une compétence hors de cette liste. "skill_assessed" : le NOM de la compétence principale (celle du premier identifiant).
   b) Pour CHAQUE étape "question" ou "task", décompose ce que « bien réussir » veut dire ici en 2 à 3 SOUS-DIMENSIONS observables — une vraie décomposition, pas une liste de critères plats. Ex. : une réponse à une objection en visio se décompose en "Gestion de l'objection", "Clarté du pitch sous pression", "Orientation vers la suite". Chaque sous-dimension porte "skill_ids" : le ou les identifiants, pris dans "skills_tested", de la compétence qu'elle note.
${REGLES_CHECKPOINTS}
   h) Un checkpoint peut porter son propre "skill_id" quand il note une AUTRE compétence de "skills_tested" que sa sous-dimension (ex. : un checkpoint de ton commercial dans un e-mail adressé à un coéquipier).
   Une étape "classic_qcm" n'a pas de sous-dimensions (corrigée automatiquement), mais elle porte ses "skills_tested".
7. Propose "ai_assistant_allowed" = true sur AU MOINS DEUX étapes de type "task" (le recruteur pourra désactiver ; on veut plusieurs points de mesure de l'usage de l'IA). Mets false pour les questions de connaissance pure et les QCM.
8. "sandbox_kind" : "email" | "client_reply" | "document" | "code" | "crm" | "sheet" | "inbox" | "board" | "persona" pour les tâches, sinon "none".
   Quand sandbox_kind != "none", enrichis "config" avec le contexte de la sandbox :
   - Pour "email" : config.to (le destinataire : nom, fonction, entreprise), config.subject (l'objet s'il est imposé, par exemple une réponse « Re : … » ; chaîne vide si c'est au candidat de l'écrire — jamais un texte entre crochets), config.context (la fiche remise au candidat : qui est le destinataire, où, pourquoi lui écrire — c'est tout ce que le candidat saura de lui). Les trois sont rédigés dans la langue de la scène quand elle diffère de celle du parcours (voir l'exception de langue en tête)
   - Pour "client_reply" : config.client_message (le message client auquel le candidat doit répondre, rédigé de manière réaliste)
   - Pour "document" : config.document_context
   - Pour "crm" : config.crm_brief — UNE SEULE PHRASE décrivant la situation — et config.crm_mission, l'une de :
       "update" (mettre à jour une fiche après des échanges récents — SDR, support, ADV, assistanat),
       "pipeline_review" (passer en revue un pipeline ou un portefeuille et décider quoi traiter — account executive, sales manager, customer success sur les renouvellements),
       "account_prep" (préparer un rendez-vous à partir de l'historique d'un compte — account manager, customer success, conseil).
     Le pipeline détaillé (fiches, historiques, champs) sera produit dans un second temps ; ne le génère PAS ici.
   - Pour "sheet" : config.sheet_brief — UNE SEULE PHRASE : quelles données, pour répondre à quelle question de travail, pour qui. Le fichier sera produit dans un second temps ; ne génère PAS les données ici.
   - Pour "inbox" : config.inbox_brief — UNE SEULE PHRASE : la boîte de qui, quel moment, quelle contrainte de temps. Les messages seront produits dans un second temps ; ne les génère PAS ici.
   - Pour "persona" : config.persona_brief — UNE SEULE PHRASE : qui est l'interlocuteur, dans quelle situation, ce que le candidat doit obtenir — et config.persona_mode : "call" (un appel, le cas général) ou "chat" (un échange écrit). Le personnage complet sera produit dans un second temps ; ne le génère PAS ici.
   - Pour "board" : config.board_brief — UNE SEULE PHRASE : quelles cartes, quelle contrainte, quelle décision — et config.board_mode : "backlog" | "roadmap" | "project" | "tickets". Les cartes seront produites dans un second temps ; ne les génère PAS ici.
   - Pour "code" : config.code_brief — UNE SEULE PHRASE décrivant la tâche de programmation. L'exercice complet (langage, squelette, cas de test) sera produit dans un second temps ; ne génère PAS les tests ici.
   QUAND CHOISIR "crm" : le poste consiste, au moins en partie, à RECEVOIR de l'information d'un tiers et à la CONSIGNER, ou à SUIVRE des opportunités ou des comptes dans un outil — vente, SDR, business developer, account management, customer success, support/SAV, ADV, ops, office management, assistanat.
   QUAND CHOISIR "sheet" : le poste demande de lire des chiffres pour décider — opérations, supply, customer success, sales ops, product, finance, marketing, RH (indicateurs), contrôle de gestion.
   QUAND CHOISIR "inbox" : le poste reçoit des demandes concurrentes qu'il faut arbitrer — office management, opérations, customer success, support, assistanat, gestion de projet, RH généraliste, encadrement d'équipe.
   QUAND CHOISIR "persona" : le poste se joue en conversation — vente, SDR, account management, customer success, support, recrutement, management, négociation achats. Préfère-le à une vidéo dès que la compétence se prouve en réagissant à l'autre (objection, information à obtenir, désaccord) plutôt qu'en parlant seul.
   QUAND CHOISIR "board" : le poste arbitre des demandes sous contrainte — product, gestion de projet, opérations, support (file de tickets), marketing (plan de campagnes).
   NE PAS choisir une de ces sandboxes pour un poste où le geste ne se retrouve pas dans le quotidien. Leur "response_format" est toujours "text".`;

// ─── L'offre, telle qu'elle entre dans les prompts ───────────────────────────
// Le défaut que ce bloc corrige, remonté à l'usage : une offre de vente
// PARTENARIATS produisait des mises en situation de prospection client. Le
// modèle ne lisait pas mal l'offre — il ne la recevait presque pas.
//
// Trois causes, et la troisième est la vraie :
//   1. la description était coupée à 1200 caractères, là où une offre réelle en
//      fait trois à cinq mille. Le passage qui disait « partenaires » passait
//      régulièrement à la coupe ;
//   2. `clean_description` — le résumé des missions et du profil, écrit à
//      l'extraction PUIS relu et corrigé par le recruteur, donc le texte le plus
//      juste et le plus dense du dossier — n'était transmis à AUCUN prompt ;
//   3. rien ne disait au modèle à quoi sert quoi. Les compétences arrivaient en
//      pleine lumière, l'offre en note de bas de page. Or « Négociation » et
//      « Prospection » suffisent à évoquer un commercial : faute de mieux, il
//      complétait avec le stéréotype du métier.
//
// La famille et la sous-famille sont ajoutées au titre : c'est souvent là que se
// lit la nuance (Vente · Partenariats) quand le titre seul dit « Sales ».
//
// Les langues exigées, elles, n'arrivaient dans AUCUN prompt de génération : le
// recruteur réglait « Français C2 » sur une offre anglaise, et le modèle n'en
// savait rien. C'est pourtant ce qui dit dans quelle langue se joue la scène
// (consigneLangueScene, lib/i18n/prompt.js). Elles sont données en CECR, parce
// que « 5 » ne veut rien dire pour le modèle et « C2 » tout.
function blocOffre({ title, description, criteria }) {
  const crit = criteria || {};
  const missions = String(crit.clean_description || "").trim();
  const famille = [crit.category, crit.sub_family].filter(Boolean).join(" · ");
  const langues = (crit.languages || [])
    .filter((l) => l?.name)
    .map((l) => `${l.name} — ${niveauLangueLisible(l.level)}`)
    .join(" ; ");

  return [
    `POSTE : ${title || "Non précisé"}${famille ? ` — ${famille}` : ""}`,
    missions
      ? `MISSIONS ET PROFIL (résumé de l'offre, relu et corrigé par le recruteur — c'est la source la plus fiable) :\n${missions.slice(0, 1500)}`
      : null,
    langues
      ? `LANGUES EXIGÉES PAR LE POSTE : ${langues}\n(Elles aident à savoir dans quelle langue le candidat parlera à ses interlocuteurs. Jamais une raison de créer une étape qui teste la langue.)`
      : null,
    `OFFRE D'EMPLOI (texte d'origine) :\n${(description || "").slice(0, 3500) || "Non fournie"}`,
  ].filter(Boolean).join("\n\n");
}

// Ce que l'offre apporte et que les compétences n'apportent pas. Placé juste
// avant les règles de conception, donc lu après l'offre elle-même.
const REGLE_ANCRAGE_OFFRE = `ANCRAGE DANS CETTE OFFRE-CI — à lire avant de concevoir la moindre étape :
Les compétences listées disent CE QU'IL FAUT MESURER. L'offre dit DANS QUEL MONDE : à qui le candidat s'adresse, ce qu'il cherche à obtenir d'eux, ce que l'entreprise vend, et à quoi ressemble une journée. Les deux sont indispensables et l'une ne remplace pas l'autre.
NE RETOMBE JAMAIS SUR LA VERSION GÉNÉRIQUE DU MÉTIER. Un poste de vente peut viser des PARTENAIRES et non des clients ; un poste de support peut être interne ; un poste marketing peut ne jamais toucher au grand public ; un poste de recrutement peut ne sourcer que des profils techniques. Si l'offre parle de partenariats, les mises en situation mettent en scène des partenaires à convaincre de collaborer — jamais des prospects à qui vendre.
Avant d'écrire la première étape, repère dans l'offre : à qui le candidat parle, DANS QUELLE LANGUE il leur parle, ce qu'il attend d'eux, et ce qui rend CE poste différent d'un autre portant le même intitulé. Si une étape que tu viens d'écrire resterait vraie pour n'importe quelle offre du même intitulé, elle est à refaire.`;

// ─── Fil rouge : un parcours qui se suit, quand le métier se vit ainsi ────────
// Un parcours d'étapes indépendantes mesure bien des compétences isolées ; il
// rate ce qu'est une journée de customer success ou de vente : le même compte
// qu'on retrouve dans le CRM, à qui l'on écrit, puis qu'on appelle. Mais forcer
// une histoire sur un poste d'expertise testé sur des cas distincts produirait
// un scénario artificiel. La décision revient donc au concepteur, poste par
// poste, avec des repères — et elle se lit dans `fil_rouge.actif`.
//
// `univers` est la fiche de cohérence des 2es passes (CRM, tableur, boîte de
// réception) : écrites séparément, elles inventaient chacune leurs propres
// noms, et le client de l'étape 1 changeait de nom à l'étape 3.
const REGLE_FIL_ROUGE = `10. FIL ROUGE — décide s'il en faut un, et dis-le dans "fil_rouge".
   Un fil rouge relie les étapes en une seule situation de travail qui se déroule : le même compte client, le même dossier, la même journée. Une étape fait suite à la précédente — le client trouvé dans le CRM est celui à qui le candidat écrit ensuite, puis qu'il appelle en vidéo.
   ACTIVE-LE quand le métier se vit comme une suite d'actions sur les mêmes dossiers et que les tâches se répondent naturellement : customer success, account management, vente, support, recrutement, opérations, gestion de projet.
   NE L'ACTIVE PAS quand les compétences à mesurer sont indépendantes, ou quand les enchaîner forcerait un scénario artificiel : un poste d'expertise testé sur des cas distincts, un parcours dominé par des questions de connaissance.
   S'il est actif :
   - "contexte_candidat" : 3 à 5 phrases, dans la langue du parcours, lues par le candidat AVANT la première étape — qui il est dans l'entreprise, quel jour, quelle situation, avec qui il va travailler. Aucun indice sur ce qui est évalué.
   - "univers" : la fiche de cohérence, EN FRANÇAIS, pour les concepteurs qui écriront ensuite le détail des mises en situation (fiches CRM, tableur, boîte de réception) — noms des entreprises et des personnes, leurs fonctions, les chiffres et dates clés, ce qui s'est passé avant. Tout ce qui doit rester IDENTIQUE d'une étape à l'autre.
   - Chaque énoncé s'appuie sur ce qui précède sans le répéter, et reste compréhensible seul.
   S'il n'est pas actif : "fil_rouge": { "actif": false }.`;

/** Le fil rouge rendu par le modèle, ou null s'il n'y en a pas. */
function normaliserFilRouge(fr) {
  if (!fr || fr.actif === false) return null;
  const contexte = String(fr.contexte_candidat || "").trim();
  if (!contexte) return null;
  return { contexte_candidat: contexte.slice(0, 1500), univers: String(fr.univers || "").trim().slice(0, 4000) };
}

// Bloc d'un prompt de 2e passe : la fiche de cohérence du parcours. Vide sans
// fil rouge — la mise en situation invente alors librement, comme avant.
function blocFilRouge(filRouge) {
  if (!filRouge?.contexte_candidat) return "";
  return `FIL ROUGE DU PARCOURS — cette mise en situation fait partie d'une seule histoire, que le candidat suit d'étape en étape. Réutilise EXACTEMENT ces noms, fonctions, chiffres et dates ; n'en invente pas d'autres pour les mêmes choses :
${filRouge.univers || "(pas de fiche de cohérence)"}
Ce que le candidat a lu en commençant : ${filRouge.contexte_candidat}
`;
}

// Le défaut de JSON le plus fréquent, constaté au banc : un énoncé qui cite
// l'objection d'un prospect entre guillemets droits non échappés. Le JSON
// entier devient illisible, et toute la conception est à refaire.
const REGLE_GUILLEMETS = `GUILLEMETS : dans les VALEURS du JSON (énoncés, messages, checkpoints), n'écris JAMAIS de guillemet droit " — pour citer une parole, utilise « … » en français, “…” en anglais ou en néerlandais. Un seul guillemet droit oublié rend tout le JSON illisible.`;

const REGLES_QCM = `RÈGLES QCM ANTI-BIAIS :
- TOUTES les options doivent avoir une longueur SIMILAIRE (±20% de caractères). Ne mets JAMAIS une option correcte significativement plus longue ou plus détaillée que les distracteurs.
- Chaque distracteur doit être PLAUSIBLE pour quelqu'un qui connaît partiellement le sujet. Pas de réponses absurdes.
- Formulation HOMOGÈNE : si la bonne réponse commence par "Le…", les distracteurs aussi.
- 4 options par QCM (ni plus, ni moins).`;

// Forme JSON d'UNE étape. Partagée pour la même raison : une clé ajoutée ici
// doit apparaître dans les deux sorties, sinon une étape régénérée perd
// silencieusement un champ que la génération complète produisait.
const SCHEMA_STEP = `    {
      "kind": "question|task|classic_qcm",
      "title": "Titre court",
      "prompt": "Énoncé lu tel quel au candidat (vouvoiement)",
      "response_format": "text|video|qcm|choice",
      "sandbox_kind": "none|email|client_reply|document|code|crm|sheet|inbox|board|persona",
      "ai_assistant_allowed": true,
      "config": {},
      "skills_tested": ["h:identifiant-recopie-de-la-liste"],
      "skill_assessed": "Nom de la compétence principale ciblée par cette étape — RENDU DANS LA LANGUE DU RECRUTEUR (voir la consigne de langue en tête), en TRADUISANT le nom repris de la liste des compétences si celle-ci est dans une autre langue",
      "sub_dimensions": [
        { "name": "Nom de la sous-dimension", "skill_ids": ["h:identifiant-recopie-de-la-liste"], "checkpoints": [
          { "description": "Un seul comportement observable" },
          { "description": "Un autre comportement, noté séparément" },
          { "description": "Un comportement qui note une autre compétence de skills_tested", "skill_id": "s:identifiant-recopie-de-la-liste" }
        ] }
      ]
    }`;

// Les mêmes champs, sortis de leur objet englobant : le prompt de régénération
// décrit UNE étape À LA RACINE du JSON, avec deux clés de pilotage en plus.
const SCHEMA_STEP_CHAMPS = SCHEMA_STEP.split("\n").slice(1, -1).join("\n");

// ─── Prompt de génération (offre + contexte entreprise → expérience) ──────────
// Interne : dans un module "use server", seuls des exports async sont permis.
// La démo hors repo garde une copie identique de ce prompt.
function buildExperienceGenerationPrompt({ title, description, criteria, companyContext, additionalContext, locale, uiLocale }) {
  const competences = listerCompetences(criteria);
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
    ctx.domain && `Modèle : ${ctx.domain}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  // La consigne de langue est en TÊTE, avant tout le reste : placée en fin de
  // prompt, elle se fait recouvrir par les dizaines de lignes de règles et
  // d'exemples en français qui la précèdent, et le modèle rend du français.
  return `${consigneLangueEtapes(locale, uiLocale)}

Tu es un concepteur d'évaluations de recrutement par compétences. À partir d'une offre et du contexte de l'entreprise, tu génères une EXPÉRIENCE DE PRÉSÉLECTION courte (5 à 20 minutes) qui fait la PREUVE des compétences du candidat — pas un questionnaire théorique.

${blocOffre({ title, description, criteria })}

${blocCompetencesPrompt(competences)}

CONTEXTE ENTREPRISE :
${companyBlock}

${REGLE_ANCRAGE_OFFRE}
${additionalContext ? `\nMATÉRIAU DU RECRUTEUR — issu de l'échange de conception, ET IL PRIME SUR TOUT LE RESTE :\n${additionalContext}\n\nCOMMENT T'EN SERVIR — c'est ce qui sépare un parcours que le recruteur reconnaît d'un parcours générique :\n- Les passages entre guillemets sont SES MOTS. Reprends-les TELS QUELS dans les énoncés, les messages client et les sources des mises en situation : le nom exact de son produit, la formulation exacte d'une objection, le vocabulaire de son marché. Ne les paraphrase pas, ne les traduis pas en langue de bois professionnelle.\n- S'il a raconté une situation qu'il a vécue, BÂTIS LA TÂCHE DESSUS plutôt que d'en inventer une autre. C'est la situation dont tu sais qu'elle arrive vraiment dans cette entreprise.\n- Un scénario qu'on pourrait recopier tel quel sur l'offre d'un concurrent est un scénario raté, même s'il respecte toutes les règles ci-dessous.\n` : ""}
CONSTRUIS une expérience composée d'étapes ordonnées. Types d'étape ("kind") :
- "question" : question ciblée sur une compétence (connaissance ou jugement appliqué), réponse courte — JAMAIS un récit d'expérience passée.
- "task" : tâche courte et réaliste inspirée du poste (rédiger un email client, répondre à une situation, produire un court document/analyse). C'est le cœur de la preuve.
- "classic_qcm" : QCM quand une connaissance se teste mieux ainsi et qu'aucune tâche n'est pertinente.

Ne génère jamais d'étape de filtre qualificatif (langue, expérience minimale, diplôme, localisation) — ce filtre existe déjà ailleurs dans le parcours, avant cette expérience. Toutes les étapes que tu génères ici évaluent une compétence, aucune n'élimine sur un critère administratif.

RÈGLES :
1. DIMENSIONNE LE PARCOURS SUR LES MUST-HAVE. Chaque compétence MUST-HAVE doit être notée par au moins un checkpoint quelque part dans le parcours. Regroupe plusieurs must-have dans un même exercice quand c'est cohérent (une réponse à une objection peut noter à la fois la gestion de l'objection, la clarté et l'orientation vers la suite) : c'est ce qui garde le parcours court. Vise 3 à 5 étapes, 5 à 20 minutes. Si les must-have distincts, regroupés au mieux, imposent davantage d'étapes, génère-les quand même : ne sacrifie JAMAIS la couverture d'un must-have pour tenir la durée — le recruteur en sera prévenu et tranchera.
   Les NICE-TO-HAVE n'ont JAMAIS d'étape dédiée. Ajoute-les en sous-dimension ou en checkpoint secondaire seulement s'ils s'intègrent naturellement à une étape déjà prévue pour un must-have. Sinon, ne les teste pas : ce n'est pas un défaut.
2. Inclus AU MOINS DEUX "task" réalistes ancrées dans le métier et le contexte entreprise. C'est le cœur de la preuve.
${REGLES_ETAPE}
9. DIVERSITÉ DES KINDS : ne génère JAMAIS plus de 2 étapes du même kind "question" d'affilée. Varie entre task, question et classic_qcm.
${REGLE_FIL_ROUGE}

${REGLES_QCM}

${REGLE_GUILLEMETS}

Réponds UNIQUEMENT avec un JSON valide :
{
  "estimated_minutes": 12,
  "fil_rouge": { "actif": true, "contexte_candidat": "…", "univers": "…" },
  "steps": [
${SCHEMA_STEP}
  ]
}
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 } — "sub_dimensions" reste vide ([]) et "skill_assessed" aussi (""), mais "skills_tested" porte la compétence que le QCM vérifie.`;
}

// ─── Prompt de la 2e passe : le pipeline complet d'un step "crm" ──────────────
// Passe séparée à dessein : un pipeline complet (plusieurs fiches et leurs
// historiques) pèse plusieurs milliers de tokens et ferait dérailler la passe
// principale, qui a déjà été tronquée par le passé. On isole le risque.
//
// ── Ce qui change avec la v2 ────────────────────────────────────────────────
// La v1 posait 2 ou 3 documents à côté d'un formulaire : de l'extraction
// d'information, pas du travail dans un CRM. La v2 produit un PIPELINE —
// plusieurs fiches avec leurs propriétés et leur historique — et une MISSION.
// Les règles des champs (factuels corrigés sans IA, de jugement notés par la
// grille) et du piège sont celles de la v1, mot pour mot : la correction ne
// change pas, c'est le terrain qui devient réaliste.
const MISSIONS_CRM = {
  update: `"update" — METTRE À JOUR une fiche (focus_record) après des échanges récents. Son historique contient 2 à 3 activités RICHES (120 à 220 mots chacune, de formats différents), désordonnées, où l'information utile est noyée. Les "fields" sont les champs de cette fiche à mettre à jour. Ajoute 3 à 5 AUTRES fiches légères (propriétés et au plus une activité courte) : un pipeline d'une seule fiche n'est pas un CRM.`,
  pipeline_review: `"pipeline_review" — PASSER LE PIPELINE EN REVUE avant le point hebdomadaire. 6 à 7 fiches, chacune avec 1 à 2 activités COURTES (40 à 100 mots). Les signaux décisifs sont dans les activités et les propriétés, jamais signalés comme tels : un deal qui n'a pas bougé depuis des semaines, un interlocuteur clé parti, un budget gelé, un concurrent entré dans la boucle, une date de clôture devenue irréaliste, une relance promise et oubliée. Deux ou trois fiches vont bien. Les "fields" demandent quoi traiter en premier, ce qui est à risque et pourquoi, quelle action mener — plus au moins 2 champs factuels lisibles dans les fiches. "focus_record" vaut null.`,
  account_prep: `"account_prep" — PRÉPARER UN RENDEZ-VOUS avec un compte (focus_record). Son historique compte 5 à 7 activités étalées sur plusieurs mois (60 à 140 mots chacune) : ce qui a été promis, ce qui a coincé, qui décide, ce qui a changé. Les "fields" forment le brief de préparation : faits clés (factuels) et enjeux, risques, objectifs du rendez-vous (jugement). Ajoute 3 à 4 AUTRES fiches légères pour que le pipeline soit crédible.`,
};

function buildCrmScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";
  const mission = MISSIONS_CRM[step.config?.crm_mission] ? step.config.crm_mission : "update";

  // Les activités sont le cœur de l'exercice : de faux e-mails, comptes rendus
  // d'appel et notes. Ils doivent sonner comme des vrais documents dans la
  // langue du candidat — d'où la consigne en tête, ici aussi.
  return `${consigneLangueContenu(locale)}

Tu conçois une MISE EN SITUATION « CRM » pour une évaluation de recrutement.

Le candidat travaille dans un vrai CRM : un pipeline de plusieurs fiches (opportunités ou comptes), chacune avec ses propriétés et son historique d'activités — e-mails, comptes rendus d'appel, messages, notes, réunions. Il a une MISSION, puis remplit une fiche de restitution (les "fields"). On mesure ce qu'il fait d'une information réelle, dispersée et imparfaite : la trouver, la croiser, en tirer une décision.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}
${blocFilRouge(filRouge)}
ÉNONCÉ DE L'ÉTAPE (première ébauche, lue au candidat) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.crm_brief || "À toi de la choisir, cohérente avec le poste."}

LA MISSION — ${MISSIONS_CRM[mission]}

RÈGLES DE CONCEPTION :
1. FICHES : des propriétés réalistes pour CE métier — une étape du pipeline prise dans "stages", un montant NUMÉRIQUE, une date de clôture, un contact avec sa fonction, un propriétaire, la dernière activité (« il y a 12 jours ») — et 2 à 4 "properties" propres au métier (effectif, offre souscrite, score de santé, date de renouvellement…). Dates et montants cohérents entre fiches et activités.
2. ACTIVITÉS : réalistes et DÉSORDONNÉES — bavardage, digressions, politesses. Jamais de liste à puces qui donne les réponses. Identifiants uniques sur TOUT le pipeline ("a1", "a2"…). Types : "email", "call_transcript", "chat", "note", "meeting".
3. CHAMPS : 5 à 7. Chaque champ a une "nature" :
   - "factual" : la réponse est une valeur COURTE (5 mots maximum) recopiable TELLE QUELLE depuis une activité ou une propriété — nom du contact, société, effectif, montant, date, intitulé de poste, nom d'un concurrent. Fournis "expected" : { "value": …, "accept": [variantes acceptables] }, et "tolerance" pour les nombres si pertinent. L'"expected.value" doit apparaître MOT POUR MOT dans une activité ou une propriété : il est corrigé par comparaison automatique, sans IA.
   - "judgment" : tout le reste — ce qui suppose de reformuler, résumer, synthétiser ou arbitrer (besoin, enjeu, risque, priorité, deal à traiter en premier, prochaine action). PAS de "expected".
   RÈGLE DE TRANCHAGE : si deux bons candidats peuvent formuler la réponse différemment, le champ est "judgment", jamais "factual".
   Il faut AU MOINS 2 champs "factual" et AU MOINS 2 champs "judgment".
   Un champ "select" dont les options sont des fiches du pipeline reprend EXACTEMENT leur "name".
   La fiche comporte D'OFFICE un bloc « prochaine action planifiée » (type, date, description) : ne crée PAS de champ « prochaine action », il ferait doublon.
4. PIÈGE OBLIGATOIRE — exactement UN : une information CONTRADICTOIRE entre deux activités (ou entre une activité et une propriété de la fiche) — l'e-mail annonce un chiffre, l'appel plus récent en annonce un autre. Elle doit porter sur un champ "factual", et l'"expected" de ce champ doit être la valeur RÉSOLUE (celle qui fait foi). La règle de résolution doit être déductible (une date, une mention « finalement », « après arbitrage », « je corrige »), jamais arbitraire. "sources" du piège : les identifiants des deux activités.
5. Les valeurs attendues doivent être TEXTUELLEMENT PRÉSENTES dans le pipeline. N'invente jamais un attendu que le candidat ne pourrait pas trouver.
6. Pour un champ "select", les options sont un vocabulaire métier plausible (4 à 5 options) ou les noms des fiches, et l'attendu est EXACTEMENT l'une des options.
7. Le type "date" est réservé aux échéances DATÉES ; son "expected" est au format jj/mm/aaaa et cette date figure dans le pipeline. Une échéance vague (« fin juin », « avant l'été ») prend le type "text".
8. ÉNONCÉ : réécris l'énoncé de l'étape ("step_prompt"). COURT (2 à 3 phrases) : la scène et la mission. Il ne contient SURTOUT PAS les informations à extraire (ni nom, ni chiffre, ni échéance), ne désigne pas les fiches à problème, ne mentionne pas de contradiction.
9. LANGUE DE LA SCÈNE (voir l'exception en tête) : si les interlocuteurs du poste parlent une autre langue que celle du parcours, les ACTIVITÉS sont rédigées dans leur langue — ce sont leurs e-mails et leurs appels. "step_prompt", "record_title", "pipeline_name", les noms d'étapes et les "label" des champs restent dans la langue du parcours. Les "expected" des champs "factual" sont recopiés du pipeline, donc dans sa langue : ils sont comparés mot pour mot. Le "step_prompt" ne demande JAMAIS de traduire la fiche ni de « tout remplir en » une langue : il peut demander de rédiger les champs de synthèse dans la langue de l'équipe, mais précise que les valeurs factuelles (noms, intitulés, chiffres) se recopient telles qu'elles figurent dans le CRM.
10. Aucun emoji. Vouvoiement. Registre professionnel.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "Énoncé court lu au candidat, sans aucune information à extraire.",
  "record_title": "Titre de la fiche de restitution, ex. : Mise à jour — opportunité Dumont / Revue du pipeline — semaine 42",
  "mission": "${mission}",
  "pipeline_name": "Pipeline commercial — T4",
  "stages": ["Découverte", "Démo", "Proposition", "Négociation", "Signé"],
  "focus_record": ${mission === "pipeline_review" ? "null" : "\"r1\""},
  "records": [
    { "id": "r1", "name": "…", "company": "…", "contact": "Prénom Nom (fonction)", "stage": "Proposition", "amount": 18000, "currency": "€", "close_date": "jj/mm/aaaa", "owner": "…", "last_activity": "il y a 3 jours",
      "properties": { "Effectif": "120" },
      "timeline": [
        { "id": "a1", "type": "email", "from": "prenom.nom@societe.fr", "subject": "…", "date": "Lundi 14:32", "body": "…" },
        { "id": "a2", "type": "call_transcript", "title": "Appel — mardi 9h10", "date": "Mardi 9:10", "body": "…" }
      ] }
  ],
  "fields": [
    { "key": "contact_name", "label": "Contact", "type": "text", "nature": "factual", "expected": { "value": "…", "accept": ["…"] } },
    { "key": "budget", "label": "Budget annoncé", "type": "number", "unit": "€", "nature": "factual", "expected": { "value": 30000, "tolerance": 0 } },
    { "key": "priority", "label": "Priorité", "type": "select", "options": ["Basse","Moyenne","Haute"], "nature": "judgment" },
    { "key": "main_risk", "label": "Principal risque", "type": "textarea", "nature": "judgment" }
  ],
  "notes_field": true,
  "traps": [
    { "id": "t1", "kind": "contradiction", "fields": ["budget"], "sources": ["a1","a2"],
      "description": "Ce que dit chaque activité et en quoi elles se contredisent.",
      "resolution": "Quelle valeur fait foi et pourquoi.",
      "expected_signal": "Ce que fait un bon candidat (retient la bonne valeur ET/OU signale l'écart dans ses notes)." }
  ]
}
Types de champ autorisés : "text", "number", "select", "textarea", "date".`;
}

// ─── Prompt de la 2e passe : le tableur d'un step "sheet" ─────────────────────
// La difficulté à fabriquer ici n'est pas le volume de données : c'est un
// constat que seule une analyse fait apparaître, et un indicateur trompeur qui
// détourne le candidat pressé. Les totaux exacts ne sont PAS demandés au
// modèle : ils sont recalculés en JS pour le correcteur (sheetReperesCalcules),
// parce qu'un modèle de langage additionne mal trente lignes.
function buildSheetScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  return `${consigneLangueContenu(locale)}

Tu conçois une MISE EN SITUATION « TABLEUR » pour une évaluation de recrutement.

Le candidat reçoit un fichier de données réaliste, ouvert dans un vrai tableur (formules, recopie, plusieurs onglets possibles). Il doit l'analyser pour trancher une question de travail concrète, puis rédiger une synthèse courte pour un destinataire précis. On mesure sa démarche d'analyse (ce qu'il calcule et pourquoi), la justesse de ses chiffres, et la décision qu'il en tire.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}
${blocFilRouge(filRouge)}
ÉNONCÉ DE L'ÉTAPE (première ébauche, à réécrire) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.sheet_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. DONNÉES : un onglet, deux au plus si le second sert vraiment (objectifs, tarifs, référentiel). 4 à 7 colonnes, 12 à 30 lignes. En-têtes métier explicites, unité comprise (« CA (€) », « Délai (j) »). Les nombres sont des NOMBRES JSON : pas de texte, pas de séparateur de milliers, pas d'unité dans la cellule. Une colonne de catégories (région, produit, commercial, client, semaine…) structure l'analyse.
2. CE QUE LES DONNÉES CACHENT : construis les chiffres pour qu'une ANALYSE ÉLÉMENTAIRE (un total, un taux, une moyenne par catégorie, une évolution) révèle UN constat décisif qu'une lecture en diagonale ne voit pas — et qu'un indicateur trompeur (le plus gros volume, la catégorie qui « crie ») détourne le candidat pressé. Exemples : la région qui vend le plus est celle qui perd le plus en retours ; le commercial au plus gros chiffre d'affaires a la pire marge ; la semaine record cache une hausse des annulations.
   Le constat doit être VRAI dans les données que tu écris : vérifie tes calculs ligne par ligne. Un constat faux pénalise tous les candidats.
3. La difficulté est l'analyse, pas le nettoyage : pas de piège arithmétique, pas de cellule vide au hasard, pas de doublon caché — sauf si le poste est précisément un poste de qualité de données.
4. "analysis_notes" — EN FRANÇAIS, lu par le seul correcteur : ce que les données permettent de voir, quel calcul le montre, quel indicateur trompe, et ce qu'une bonne recommandation en tire. Décris-le en ordre de grandeur (« le Sud retourne environ deux fois plus que les autres régions ») : les totaux exacts sont recalculés automatiquement à part.
5. "step_prompt" : 2 à 4 phrases. La situation, le destinataire, et la question à trancher (« Votre directrice veut savoir sur quelle région concentrer le budget du T4 »). Il ne livre pas le constat, n'indique pas quel calcul faire, ne nomme pas l'indicateur trompeur. Il précise que le candidat peut calculer directement dans le tableur.
6. "deliverable_label" : le libellé du champ de synthèse, dans la langue du parcours (« Votre recommandation à Claire Dubois — 5 à 8 lignes »).
7. "file_name" : un nom de fichier réaliste (« Suivi_retours_T3.xlsx »).
8. Langue : en-têtes, valeurs texte, nom de fichier et énoncé dans la langue du parcours. Aucun emoji. Vouvoiement.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "…",
  "file_name": "…",
  "deliverable_label": "…",
  "sheets": [
    { "name": "Commandes T3", "columns": ["Semaine", "Région", "Commandes", "Retours", "CA (€)"], "rows": [[36, "Nord", 120, 6, 15000], [36, "Sud", 95, 13, 11800]] }
  ],
  "analysis_notes": "…"
}`;
}

// ─── Prompt de la 2e passe : la boîte de réception d'un step "inbox" ──────────
// Une boîte où tout crie est aussi fausse qu'une boîte où rien ne presse. Le
// prompt impose la composition qui rend le tri révélateur : une urgence
// discrète, du bruit insistant, une délégation, un message sans suite, et deux
// messages qui se répondent.
function buildInboxScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  return `${consigneLangueContenu(locale)}

Tu conçois une MISE EN SITUATION « BOÎTE DE RÉCEPTION » pour une évaluation de recrutement.

Le candidat ouvre sa boîte au début d'une journée de travail : 6 à 8 messages arrivés par plusieurs canaux (e-mail, messagerie interne, ticket, invitation, message vocal retranscrit). Pour chacun il choisit une priorité (urgent / aujourd'hui / cette semaine / sans suite) et une action (répondre / déléguer / planifier / archiver), puis rédige les réponses et les consignes de délégation. On mesure sa capacité à voir ce qui compte vraiment, à arbitrer entre des demandes concurrentes, et à agir juste.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}
${blocFilRouge(filRouge)}
ÉNONCÉ DE L'ÉTAPE (première ébauche, à réécrire) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.inbox_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. MESSAGES : 6 à 8, de canaux variés ("email", "chat", "ticket", "calendar", "voicemail"), 40 à 150 mots, réalistes — expéditeurs nommés avec leur fonction, horodatage de la veille au soir ou du matin. Composition imposée :
   - 1 à 2 vraies urgences, dont au moins une DISCRÈTE : l'enjeu tient dans une ligne au milieu d'un message banal ;
   - 1 à 2 messages BRUYANTS mais secondaires : ton pressant, relance insistante, demande d'un supérieur sur un sujet qui peut attendre ;
   - 1 demande à DÉLÉGUER, dont le message laisse deviner qui pourrait la prendre ;
   - 1 message qui n'appelle aucune action ;
   - au moins 2 messages qui se RÉPONDENT ou se contredisent : une information du message 2 change la priorité du message 5.
2. Le métier donne le contenu : ce sont les demandes que CE poste reçoit dans CETTE entreprise, pas des demandes génériques de bureau.
3. "triage_notes" — EN FRANÇAIS, lu par le seul correcteur : pour CHAQUE message, la priorité qu'un bon professionnel retiendrait ("urgent" | "today" | "week" | "none"), pourquoi en une phrase, et "trap": true pour les messages conçus pour tromper (urgence discrète, bruit, contradiction). Un autre tri peut se défendre : écris le raisonnement, pas un barème.
4. "step_prompt" : 2 à 3 phrases. La situation (qui, quand, quelle contrainte de temps — « vous avez une réunion à 9h30 ») et la consigne : trier toute la boîte, décider d'une action pour chaque message, rédiger les réponses et délégations nécessaires. Il ne désigne aucun message.
5. "owner" : la personne dont c'est la boîte (« Vous — Office Manager chez Kinéo ») et "now" : le moment (« Lundi, 8h40 »), dans la langue du parcours.
6. Langue de la scène : les messages sont rédigés dans la langue de leurs expéditeurs (voir l'exception en tête). Aucun emoji.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "…",
  "owner": "…",
  "now": "…",
  "items": [
    { "id": "m1", "channel": "email", "from": "Prénom Nom", "from_role": "fonction, société", "subject": "…", "received_at": "Lundi 7:52", "body": "…" }
  ],
  "triage_notes": [
    { "item": "m1", "priority": "urgent", "trap": false, "why": "…" }
  ]
}`;
}

// ─── Prompt de la 2e passe : exercice de code exécutable ─────────────────────
// Même raison qu'au CRM de séparer la passe : un exercice complet (énoncé
// précis, squelette, 6 cas de test) est volumineux, et surtout il demande une
// rigueur que la passe principale — occupée à concevoir tout un parcours — ne
// tient pas.
//
// CONTRAINTE STRUCTURANTE : le code s'exécute chez un tiers, en un fichier isolé qui
// lit stdin et écrit stdout. Pas de dépendances, pas de fichiers, pas de réseau.
// L'énoncé doit donc spécifier le format d'entrée et de sortie AU CARACTÈRE
// PRÈS, sinon un bon candidat échoue sur la forme et le signal est faussé.
function buildCodeExercisePrompt({ title, description, criteria, companyContext, step, locale }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  const langages = Object.entries(CODE_LANGUAGES)
    .map(([cle, l]) => `"${cle}" (${l.label})`).join(", ");

  // Pas d'exception de langue de la scène : un exercice de code n'a pas
  // d'interlocuteur, elle n'y serait que du bruit.
  return `${consigneLangueContenu(locale, { scene: false })}

Tu conçois un EXERCICE DE CODE EXÉCUTABLE pour une évaluation de recrutement.

Le code du candidat sera exécuté automatiquement dans un bac à sable isolé, puis comparé à des sorties attendues. Cela impose des contraintes absolues, listées plus bas.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}

ÉNONCÉ DE L'ÉTAPE (première ébauche, à réécrire) :
${step.prompt || "(non fourni)"}
TÂCHE À METTRE EN SCÈNE : ${step.config?.code_brief || "À toi de la choisir, cohérente avec le poste."}

CONTRAINTES D'EXÉCUTION (non négociables) :
1. Le programme lit ses données sur l'ENTRÉE STANDARD et écrit son résultat sur la SORTIE STANDARD. C'est la seule interface. Pas de lecture de fichier, pas de réseau, pas de bibliothèque externe : uniquement la bibliothèque standard du langage.
2. L'énoncé doit spécifier EXACTEMENT le format d'entrée (combien de lignes, dans quel ordre) et le format de sortie (quoi imprimer, sur combien de lignes, avec quelles unités ou quel arrondi). Un candidat compétent ne doit JAMAIS pouvoir hésiter sur la forme attendue. C'est la règle la plus importante : une sortie ambiguë transforme l'exercice en loterie.
3. Aucun habillage dans la sortie : on imprime la valeur demandée, pas "Résultat : 42".
4. L'exercice doit se résoudre en 20 à 30 minutes par une personne compétente. Une seule difficulté réelle, pas un empilement.
5. JAVA UNIQUEMENT : la classe principale ne doit PAS être déclarée "public" — écris "class Main", jamais "public class Main". Le fichier compilé porte un autre nom chez l'exécuteur, et une classe publique fait échouer la compilation avant même que le candidat ait écrit une ligne.

LANGAGE : choisis-en UN, cohérent avec le poste, parmi ${langages}. Utilise la clé, pas le libellé.

SQUELETTE DE DÉPART ("starter_code") : un programme qui TOURNE déjà — il lit l'entrée au bon format et imprime quelque chose — mais dont la logique métier est à écrire, marquée par un commentaire TODO. Il ne doit contenir AUCUNE partie de la solution.

CAS DE TEST : 5 à 8, dont au moins 2 VISIBLES et au moins 2 CACHÉS.
- "hidden": false — cas nominaux, simples, qui font comprendre l'exercice. Le candidat voit l'entrée et la sortie attendue.
- "hidden": true — cas limites (valeur nulle, liste vide, doublons, très grande valeur, ordre inattendu). Le candidat ne voit ni l'entrée ni l'attendu : ils empêchent de coder en dur les réponses visibles.
- "expected_output" doit être EXACTEMENT ce qu'imprime un programme correct pour ce "stdin" : rien de plus, rien de moins. Vérifie mentalement chaque cas avant de l'écrire — un attendu faux pénalise tous les candidats et ne se voit qu'une fois l'expérience en ligne.
- "stdin" doit respecter le format décrit dans l'énoncé, à la virgule près.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "Énoncé complet : la situation, la tâche, le format d'entrée, le format de sortie, et un exemple.",
  "language": "python",
  "starter_code": "import sys\\n\\ndef main():\\n    data = sys.stdin.read().strip()\\n    # TODO: votre logique ici\\n    print(data)\\n\\nmain()",
  "tests": [
    { "name": "Cas nominal", "stdin": "5", "expected_output": "120", "hidden": false },
    { "name": "Valeur nulle", "stdin": "0", "expected_output": "1", "hidden": true }
  ]
}`;
}

// Génère l'exercice exécutable d'un step "code" (2e passe).
async function generateCodeExercise({ title, description, criteria, companyContext, step, locale, onEvent }) {
  const prompt = buildCodeExercisePrompt({ title, description, criteria, companyContext, step, locale });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu conçois des exercices de code pour des évaluations de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // 8000 (c'était 4000) : la réflexion se sert dans le même budget.
      maxTokens: 8000,
      // La passe où la réflexion se justifie le plus : le prompt demande déjà
      // « vérifie mentalement chaque cas avant de l'écrire », et un
      // `expected_output` faux pénalise tous les candidats sans se voir avant
      // la mise en ligne. C'est exactement le travail qu'on lui refusait.
      reflexion: true,
    });
    const usage = response.usage;
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const code = JSON.parse(match[0]);
      const tests = Array.isArray(code.tests) ? code.tests : [];
      // Un exercice sans cas VISIBLE est injouable (le candidat ne sait pas ce
      // qu'on attend), et sans cas CACHÉ il suffit d'imprimer les réponses.
      if (tests.length < 2) { lastErr = "moins de deux cas de test"; continue; }
      if (!tests.some((t) => !t.hidden)) { lastErr = "aucun cas visible"; continue; }
      if (tests.some((t) => typeof t.expected_output !== "string" || !t.expected_output.length)) {
        lastErr = "un attendu est vide"; continue;
      }
      // Un langage hors catalogue n'a pas d'identifiant chez l'exécuteur : on
      // retombe sur le défaut plutôt que de publier une étape inexécutable.
      if (!CODE_LANGUAGES[code.language]) code.language = DEFAULT_LANGUAGE;
      onEvent?.({ kind: "code_test", nbTests: tests.length, nbCaches: tests.filter((t) => t.hidden).length });
      return { success: true, code, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Exercice de code invalide (${lastErr}).` };
}

// Sous-dimension ajoutée d'office sur un step CRM : la justesse du champ piégé
// est corrigée automatiquement, mais VOIR la contradiction est un comportement
// distinct — un candidat peut avoir juste par chance. Les deux signaux comptent.
//
// Ce critère est ajouté EN DUR aux steps CRM, il ne sort pas du modèle : il
// doit donc être traduit ici, sans quoi une expérience anglaise se retrouverait
// avec une grille française au milieu — visible par le recruteur dans
// l'éditeur, et injectée telle quelle dans le prompt de scoring.
//
// Trois checkpoints et non plus trois niveaux : l'ancien niveau 5 exigeait de
// retenir la bonne valeur ET de signaler l'écart ET de dire laquelle fait foi.
// Un candidat qui retenait la bonne valeur et signalait l'écart sans trancher
// n'avait aucun niveau qui lui ressemble ; il est maintenant crédité de ce qu'il
// a fait.
const CRM_CROSS_CHECK_CRITERION = {
  fr: {
    name: "Croisement des sources",
    checkpoints: [
      "Retient, pour le champ contredit, la valeur qui fait foi (la plus récente, ou celle explicitement corrigée dans une source).",
      "Signale l'écart entre les deux sources, dans les notes ou dans un champ de la fiche.",
      "Dit laquelle des deux valeurs fait foi, et pourquoi.",
    ],
  },
  en: {
    name: "Cross-checking sources",
    checkpoints: [
      "Records, for the contradicted field, the value that stands (the most recent one, or the one explicitly corrected in a source).",
      "Flags the discrepancy between the two sources, in the notes or in a field of the record.",
      "States which of the two values stands, and why.",
    ],
  },
};

/** Le critère de croisement des sources, rattaché aux compétences de l'étape CRM. */
function critereCroisementSources(uiLocale, skillIds) {
  const modele = CRM_CROSS_CHECK_CRITERION[coerceUiLocale(uiLocale)];
  return {
    name: modele.name,
    skill_ids: [...(skillIds || [])],
    checkpoints: modele.checkpoints.map((description, i) => ({ id: `cp${i + 1}`, description })),
  };
}

// La détection couvre plusieurs langues : en néerlandais le modèle écrit
// "bronnen", pas "sources", et le critère serait ajouté en double.
const RE_CROISEMENT = /crois|source|cross.?check|bronn/i;

// Génère le pipeline complet d'un step "crm" (2e passe).
async function generateCrmScenario({ title, description, criteria, companyContext, step, locale, onEvent, model, filRouge }) {
  const prompt = buildCrmScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const scan = onEvent ? makeCrmScanner(onEvent) : null;
    const response = await streamCompletion({
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // 12000 (c'était 8000) : un pipeline de six fiches avec leurs historiques
      // pèse deux à trois fois la fiche isolée de la v1.
      maxTokens: 12000,
      onText: scan || undefined,
      model,
    });
    const usage = response.usage;
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const crm = normaliserCrm(JSON.parse(match[0]));
      if (!Array.isArray(crm.fields) || !crm.fields.length) { lastErr = "aucun champ généré"; continue; }
      if (!crmEstEspace(crm) && !(crm.sources || []).length) { lastErr = "aucune fiche générée"; continue; }
      return { success: true, crm, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Scénario CRM invalide (${lastErr}).` };
}

// Génère le tableur d'un step "sheet" (2e passe). La réflexion est ouverte :
// le prompt exige que le constat caché soit VRAI dans les chiffres écrits, et
// un constat faux pénalise tous les candidats sans se voir avant la mise en
// ligne — le même enjeu que les sorties attendues d'un exercice de code.
async function generateSheetScenario({ title, description, criteria, companyContext, step, locale, onEvent, model, filRouge }) {
  const prompt = buildSheetScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      maxTokens: 12000,
      reflexion: true,
      model,
    });
    const usage = response.usage;
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const brut = JSON.parse(match[0]);
      const sheet = normaliserTableur(brut);
      if (!sheet) { lastErr = "tableur inexploitable (colonnes ou lignes manquantes)"; continue; }
      onEvent?.({ kind: "sheet_data", rows: sheet.sheets.reduce((n, o) => n + o.rows.length, 0), cols: sheet.sheets[0].columns.length });
      return { success: true, sheet, step_prompt: brut.step_prompt, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Tableur invalide (${lastErr}).` };
}

// Génère la boîte de réception d'un step "inbox" (2e passe).
async function generateInboxScenario({ title, description, criteria, companyContext, step, locale, onEvent, model, filRouge }) {
  const prompt = buildInboxScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      maxTokens: 10000,
      model,
    });
    const usage = response.usage;
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const brut = JSON.parse(match[0]);
      const inbox = normaliserBoite(brut);
      if (!inbox) { lastErr = "moins de trois messages exploitables"; continue; }
      onEvent?.({ kind: "inbox_items", count: inbox.items.length, traps: inbox.triage_notes.filter((n) => n.trap).length });
      return { success: true, inbox, step_prompt: brut.step_prompt, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Boîte de réception invalide (${lastErr}).` };
}

// ─── Prompt de la 2e passe : le personnage d'un step "persona" ────────────────
// Un personnage qui dit tout à la première question ne mesure rien ; un
// personnage fermé à tout est injuste. Le prompt impose ce qui fait un bon
// partenaire de jeu : une raison d'être là, des objections qui tombent face à
// une vraie réponse, et des informations qui ne sortent que si on les cherche.
function buildPersonaScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";
  const mode = step.config?.persona_mode === "chat" ? "chat" : "call";

  return `${consigneLangueContenu(locale)}

Tu conçois un PERSONNAGE pour une évaluation de recrutement. Le candidat va ${mode === "call" ? "l'APPELER (ou être appelé) : il parle, le personnage lui répond à voix haute" : "échanger avec lui PAR ÉCRIT, dans une messagerie"}. Le personnage est joué par une IA qui suivra ta fiche à la lettre.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}
${blocFilRouge(filRouge)}
ÉNONCÉ DE L'ÉTAPE (première ébauche, à réécrire) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.persona_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. UN VRAI INTERLOCUTEUR DE CE MÉTIER : nom, fonction, entreprise, et une raison concrète d'être dans cette conversation. Il veut quelque chose ("goals") qui n'est pas forcément ce que veut le candidat.
2. PERSONNALITÉ ("personality") en une ou deux phrases jouables : pressé, méfiant, aimable mais évasif, irrité… Pas de caricature.
3. INFORMATIONS CACHÉES ("hidden_info") : 2 à 4 faits décisifs que le personnage ne livre QUE si le candidat pose la question qui y mène (le vrai blocage, le budget réel, qui décide vraiment, ce qui s'est passé avec le concurrent). Chacune dit ce qu'elle est ET quel genre de question la fait sortir.
4. OBJECTIONS ("objections") : 2 à 4, crédibles dans ce métier, qui tombent face à une vraie réponse — pas devant une formule.
5. LIMITES ("red_lines") : 1 à 3 choses que le personnage n'accepte pas (une remise au-delà d'un seuil, un engagement sans validation…).
6. SIGNAUX DE RÉUSSITE ("success_signals") — EN FRANÇAIS, lus par le seul correcteur : 3 à 5 comportements qui distinguent une bonne conversation (a fait sortir telle information, a reformulé l'objection, a obtenu un engagement précis). Atteignables avec la seule information de la scène.
7. "context" : ce que le CANDIDAT sait en entrant — 2 à 4 phrases, vouvoiement : qui il est, qui est l'interlocuteur, pourquoi cette conversation, ce qu'il doit obtenir. Sans les informations cachées.
8. "opening_message" : la première réplique du personnage s'il décroche ou ouvre l'échange (1 à 2 phrases, ${mode === "call" ? "parlées, sans mise en forme" : "écrites"}). Chaîne vide si c'est au candidat de parler en premier (appel à froid, message de prospection).
9. "language" : le code de la langue que parle le personnage (fr, en, nl…) — celle de la scène, voir l'exception en tête. "accent" : son pays d'origine, en deux lettres (BE, FR, NL, GB, US…) — il choisit la voix de l'appel : un client gantois est "nl" + "BE", un Bruxellois francophone "fr" + "BE". "gender" : "f" ou "m", cohérent avec le prénom.
${mode === "call" ? consigneVoix() : ""}
10. "step_prompt" : 2 à 3 phrases lues avant la conversation : la mission et ce qui est attendu. Il ne livre aucune information cachée.
11. "max_turns" : 8 à 14 — ce qu'une vraie conversation de ce type demande, pas plus.
12. Aucun emoji.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "…",
  "name": "Prénom Nom",
  "role": "Fonction",
  "company": "Entreprise",
  "language": "fr",
  "accent": "BE",
  "gender": "m",
  "mode": "${mode}",
  "context": "…",
  "opening_message": "…",
  "personality": "…",
  "goals": "…",
  "hidden_info": ["…"],
  "objections": ["…"],
  "red_lines": ["…"],
  "success_signals": ["…"],
  "max_turns": 10
}`;
}

// ─── Prompt de la 2e passe : le tableau d'un step "board" ─────────────────────
function buildBoardScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";
  const mode = MODES_TABLEAU.includes(step.config?.board_mode) ? step.config.board_mode : "backlog";
  const exemples = {
    backlog: "« Ce sprint », « Sprint suivant », « Plus tard », « On ne fait pas »",
    roadmap: "« T1 », « T2 », « T3 », « Hors roadmap »",
    project: "« Maintenant », « Avant le jalon », « Après le jalon », « Abandonné »",
    tickets: "« Immédiat », « Aujourd'hui », « Cette semaine », « Clôturer »",
  };

  return `${consigneLangueContenu(locale)}

Tu conçois un TABLEAU DE CARTES À ARBITRER pour une évaluation de recrutement (${mode}). Le candidat range chaque carte dans une colonne, ordonne chaque colonne, puis justifie ses choix au regard d'une CONTRAINTE. On mesure sa capacité à arbitrer : ce qui passe, ce qui attend, ce qu'on abandonne, et pourquoi.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}
${blocFilRouge(filRouge)}
ÉNONCÉ DE L'ÉTAPE (première ébauche, à réécrire) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.board_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. CARTES : 7 à 10. Chacune a un titre court, un "body" de 1 à 3 phrases (qui demande, pourquoi, ce qu'on sait), et un "meta" de 2 à 4 repères chiffrés ou factuels propres au mode (effort en jours, clients concernés, revenu en jeu, demandé par, délai SLA restant, dépendance…).
2. CONTRAINTE ("constraint") : une seule phrase chiffrée qui rend IMPOSSIBLE de tout faire (« Capacité du sprint : 20 jours-développeur »). Les efforts des cartes doivent la dépasser nettement.
3. Des cartes qui se départagent : une demande bruyante d'un gros client ou d'un dirigeant qui pèse moins qu'elle n'en a l'air, une dette ou un risque discret mais critique, une dépendance qui impose un ordre, une carte qui ne sert personne, deux cartes qui font doublon.
4. COLONNES ("columns") : 3 à 4, dans la langue du parcours, du plus urgent au rejet (par exemple ${exemples[mode]}).
5. "triage_notes" — EN FRANÇAIS, lu par le seul correcteur : pour chaque carte, la colonne qu'un bon professionnel retiendrait (son nom exact), pourquoi en une phrase, et "trap": true pour les cartes conçues pour tromper. Un autre arbitrage se défend : écris le raisonnement, pas un barème.
6. "step_prompt" : 2 à 3 phrases : la situation, la décision attendue, et la demande de justifier les choix. Il ne désigne aucune carte.
7. Identifiants "c1", "c2"… Langue du parcours pour tout ce que voit le candidat. Aucun emoji.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "…",
  "title": "…",
  "mode": "${mode}",
  "constraint": "…",
  "columns": ["…", "…", "…", "…"],
  "cards": [ { "id": "c1", "title": "…", "body": "…", "meta": { "Effort": "5 j", "Demandé par": "…" } } ],
  "triage_notes": [ { "card": "c1", "column": "…", "trap": false, "why": "…" } ]
}`;
}

async function generateSceneJson({ prompt, maxTokens, model, normaliser }) {
  let lastErr = "";
  let usages = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      maxTokens,
      model,
    });
    usages.push(response.usage);
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const brut = JSON.parse(match[0]);
      const scene = normaliser(brut);
      if (!scene) { lastErr = "scène inexploitable"; continue; }
      return { success: true, scene, step_prompt: brut.step_prompt, usage: mergeUsage(usages) };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: lastErr, usage: mergeUsage(usages) };
}

// Génère le personnage d'un step "persona" (2e passe).
async function generatePersonaScenario({ title, description, criteria, companyContext, step, locale, onEvent, model, filRouge }) {
  const res = await generateSceneJson({
    prompt: buildPersonaScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }),
    maxTokens: 6000,
    model,
    normaliser: (brut) => normaliserPersona({ ...brut, mode: brut.mode || step.config?.persona_mode }),
  });
  if (!res.success) return { success: false, error: `Personnage invalide (${res.error}).`, usage: res.usage };
  onEvent?.({ kind: "persona_ready", label: res.scene.name, mode: res.scene.mode });
  return { success: true, persona: res.scene, step_prompt: res.step_prompt, usage: res.usage };
}

// Génère le tableau d'un step "board" (2e passe).
async function generateBoardScenario({ title, description, criteria, companyContext, step, locale, onEvent, model, filRouge }) {
  const res = await generateSceneJson({
    prompt: buildBoardScenarioPrompt({ title, description, criteria, companyContext, step, locale, filRouge }),
    maxTokens: 8000,
    model,
    normaliser: normaliserTableau,
  });
  if (!res.success) return { success: false, error: `Tableau invalide (${res.error}).`, usage: res.usage };
  onEvent?.({ kind: "board_cards", count: res.scene.cards.length });
  return { success: true, board: res.scene, step_prompt: res.step_prompt, usage: res.usage };
}

// Les scènes écrites en 2e passe qui partagent la même mécanique : un brief
// d'une phrase à la conception, une scène complète ensuite, rangée sous sa clé
// de config. Partagée par la génération complète et la réécriture d'une étape :
// une scène refaite ne doit pas suivre d'autres règles qu'une scène neuve.
const SCENES_DEUXIEME_PASSE = {
  sheet: { generer: generateSheetScenario, cle: "sheet", briefs: ["sheet_brief"], evenement: "sheet_start" },
  inbox: { generer: generateInboxScenario, cle: "inbox", briefs: ["inbox_brief"], evenement: "inbox_start" },
  persona: { generer: generatePersonaScenario, cle: "persona", briefs: ["persona_brief", "persona_mode"], evenement: "persona_start" },
  board: { generer: generateBoardScenario, cle: "board", briefs: ["board_brief", "board_mode"], evenement: "board_start" },
};

// Applique le résultat d'une passe de scène à l'étape, EN MÉMOIRE. Sans scène
// exploitable, l'étape retombe en tâche texte simple plutôt que d'exposer au
// candidat un tableur vide ou une boîte sans messages.
function appliquerScene(s, scene, res) {
  if (!res?.success) {
    console.error(`scène ${scene.cle} : génération échouée —`, res?.error);
    s.sandbox_kind = "none";
    s.response_format = "text";
    if (s.config) for (const b of scene.briefs) delete s.config[b];
    return false;
  }
  s.response_format = "text";
  // L'énoncé de la 1re passe a été écrit sans connaître les données ni les
  // messages : celui de la 2e passe, oui. Il fait foi.
  if (res.step_prompt) s.prompt = String(res.step_prompt);
  s.config = { ...(s.config || {}), [scene.cle]: res[scene.cle] };
  for (const b of scene.briefs) delete s.config[b];
  return true;
}

// Additionne les usages de plusieurs appels en gardant la forme à plat attendue
// par la page Coûts API (generation_usage.cost_usd).
function mergeUsage(usages) {
  const list = usages.filter(Boolean);
  if (!list.length) return null;
  return {
    model: list[0].model,
    calls: list.length,
    input_tokens: list.reduce((s, u) => s + (u.input_tokens || 0), 0),
    output_tokens: list.reduce((s, u) => s + (u.output_tokens || 0), 0),
    cost_usd: Number(list.reduce((s, u) => s + (u.cost_usd || 0), 0).toFixed(6)),
  };
}

// ─── Streaming d'un appel Claude ──────────────────────────────────────────────
// On ne se contente pas d'attendre la réponse complète : on lit le flux de
// tokens pour pouvoir émettre un événement dès qu'un fragment exploitable est
// arrivé. C'est ce qui permet au feed d'afficher le travail RÉEL du modèle, à sa
// vitesse réelle — une étape complexe met plus longtemps à apparaître.
//
// `reflexion` : laisse le modèle raisonner avant d'écrire, à l'effort
// demandé. Sans elle, l'appel tourne à EFFORT_SANS_REFLEXION — les modèles
// 5.5 réfléchissent toujours un peu, on ne peut que les borner au plus bas.
// Pas de `temperature` : les deux modèles 5.5 la refusent (400).
//
// Piège constaté sur l'API réelle : les tokens de réflexion se prélèvent sur
// `max_tokens`. Un plafond trop juste et le modèle consomme son budget à
// réfléchir puis rend un JSON tronqué — la panne que
// `stop_reason === "max_tokens"` rattrape, au prix d'un appel entier.
async function streamCompletion({ system, prompt, maxTokens, onText, reflexion = false, effort = EFFORT_REFLEXION, model = GENERATION_MODEL }) {
  const reflechit = reflexion && REFLEXION_ACTIVE;
  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    thinking: REFLEXION,
    output_config: { effort: reflechit ? effort : EFFORT_SANS_REFLEXION },
    system,
    messages: [{ role: "user", content: prompt }],
  });

  let text = "";
  stream.on("text", (delta) => {
    text += delta;
    try { onText?.(text); } catch { /* le feed ne doit jamais casser la génération */ }
  });

  const final = await stream.finalMessage();
  // Avec la réflexion, `content[0]` est un bloc `thinking` : lire `.text` dessus
  // renvoie undefined, et l'extraction du JSON échoue sur TOUTES les passes.
  // On concatène les blocs `text`, les seuls à porter la réponse.
  const texteFinal = final.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return {
    text: texteFinal || text,
    usage: computeAiCost(model, final.usage),
    stop_reason: final.stop_reason,
  };
}

// Déséchappe une valeur de chaîne JSON lue hors parser (affichage seulement).
function unescapeJsonString(s) {
  return String(s).replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();
}

// Scanner incrémental : émet un événement dès qu'un nom est COMPLET dans le
// flux. Une regex ne matche qu'une fois le guillemet fermant arrivé, donc on ne
// peut jamais émettre un libellé tronqué ; et on n'avance jamais le curseur sur
// du texte partiel.
function makeScanner(patterns, onMatch) {
  const source = patterns.map((p) => `(${p.re})`).join("|");
  const re = new RegExp(source, "g");
  let cursor = 0;
  return (text) => {
    re.lastIndex = cursor;
    let m;
    while ((m = re.exec(text)) !== null) {
      cursor = re.lastIndex;
      for (let i = 0; i < patterns.length; i++) {
        // +1 : le groupe englobant de chaque motif ; +2 : sa 1re capture interne.
        const whole = m[i * 2 + 1];
        if (whole === undefined) continue;
        onMatch(patterns[i].key, unescapeJsonString(m[i * 2 + 2] ?? ""));
        break;
      }
    }
  };
}

const STR = `(?:[^"\\\\]|\\\\.)*`;

// Passe principale : les étapes et leurs critères BARS, dans l'ordre d'arrivée.
function makeExperienceScanner(onEvent) {
  let kind = null;
  let stepNo = 0;
  return makeScanner(
    [
      { key: "kind", re: `"kind"\\s*:\\s*"([a-z_]+)"` },
      { key: "title", re: `"title"\\s*:\\s*"(${STR})"` },
      { key: "skill", re: `"skill_assessed"\\s*:\\s*"(${STR})"` },
      { key: "criterion", re: `"name"\\s*:\\s*"(${STR})"` },
    ],
    (key, value) => {
      if (key === "kind") { kind = value; return; }
      if (key === "title") {
        stepNo += 1;
        onEvent({ kind: "step", n: stepNo, stepKind: kind, label: value });
        return;
      }
      // Une compétence vide (cas du QCM) n'a rien à annoncer dans le feed.
      if (key === "skill") {
        if (value) onEvent({ kind: "skill", n: stepNo, label: value });
        return;
      }
      onEvent({ kind: "criterion", n: stepNo, label: value });
    }
  );
}

// 2e passe CRM : fiches du pipeline, activités, champs de la fiche, puis
// l'incohérence volontaire.
function makeCrmScanner(onEvent) {
  return makeScanner(
    [
      { key: "record", re: `"name"\\s*:\\s*"(${STR})"` },
      { key: "source", re: `"type"\\s*:\\s*"(email|call_transcript|chat|note|meeting)"` },
      { key: "field", re: `"label"\\s*:\\s*"(${STR})"` },
      { key: "trap", re: `"resolution"\\s*:\\s*"(${STR})"` },
    ],
    // La résolution du piège est une phrase entière : on la tronque pour le feed
    // (le détail complet reste dans config.crm, visible à la relecture).
    (key, value) => onEvent({
      kind: key,
      label: key === "trap" && value.length > 80 ? `${value.slice(0, 80).trimEnd()}…` : value,
    })
  );
}

// ─── 2e regard : la passe de critique ─────────────────────────────────────────
// Une génération qui respecte toutes les règles peut rester fade : un « client
// mécontent » sans visage, un énoncé qui pourrait être copié-collé sur
// n'importe quelle offre, une grille dont les niveaux 3 et 5 disent la même
// chose. Rien de tout ça n'est une erreur de structure — c'est une erreur de
// qualité, et elle ne se voit qu'en relisant.
//
// Cette passe relit donc le parcours AVANT le recruteur, et fait réécrire les
// étapes qui ne passeraient pas la barre. Elle tourne juste après la conception
// et AVANT les 2e passes CRM/code : un scénario CRM pèse 600-900 tokens, autant
// ne pas l'écrire sur un énoncé qu'on va jeter — et l'étape corrigée reçoit
// ensuite son scénario, écrit sur le bon énoncé.
//
// ── Ce qui l'empêche de faire plus de mal que de bien ────────────────────────
// Un modèle à qui on demande « qu'est-ce qui ne va pas ? » trouve toujours
// quelque chose. Sans garde-fous, cette passe réécrirait du bon travail :
//   • UN SEUL TOUR, jamais de boucle ;
//   • AU PLUS 2 étapes réécrites, les plus graves ;
//   • un défaut doit être CITÉ, et la citation est vérifiée en JS contre le
//     texte réel de l'étape (même règle que le verbatim du scoring) : un défaut
//     inventé est écarté sans être payé ;
//   • la réécriture passe par le prompt de régénération d'étape, donc par les
//     MÊMES règles que la génération — une correction ne peut pas produire ce
//     que la génération s'interdit ;
//   • si la réécriture échoue, on garde l'étape d'origine. Cette passe ne peut
//     jamais dégrader, seulement améliorer ou ne rien faire.
const CRITIQUE_MAX_REECRITURES = 2;

// Rendu lisible des étapes pour le critique. Pas le JSON brut : on lui demande
// de juger ce qu'un recruteur lirait, et les accolades ne l'aident pas.
function rendreEtapesPourCritique(steps) {
  return steps.map((s, i) => {
    const sousDims = (s.sub_dimensions || s.criteria || []).map((c) => {
      const lignes = estCritereCheckpoints(c)
        ? c.checkpoints.map((cp) => `      – ${cp?.description || cp || ""}`).join("\n")
        : (c?.bars_levels || []).map((n) => `      [${n.level}] ${n.description || ""}`).join("\n");
      return `    • ${c?.name || "sans nom"}\n${lignes}`;
    }).join("\n");

    return [
      `ÉTAPE ${i + 1} — ${s.kind} · ${s.response_format || "text"}${s.sandbox_kind && s.sandbox_kind !== "none" ? ` · sandbox ${s.sandbox_kind}` : ""}`,
      `  Titre : ${s.title || "sans titre"}`,
      s.skill_assessed ? `  Compétence évaluée : ${s.skill_assessed}` : null,
      `  Énoncé : ${(s.prompt || "").replace(/\s+/g, " ").trim()}`,
      // La scène entière, fiche du prospect comprise : sans elle, le critique
      // jugeait une tâche de prospection sur son seul énoncé — et ne pouvait
      // pas voir dans quelle langue la scène était jouée.
      sceneEnTexte(s.config, "  ") || null,
      s.config?.crm_brief ? `  Situation CRM prévue${s.config.crm_mission ? ` (mission ${s.config.crm_mission})` : ""} : ${s.config.crm_brief}` : null,
      s.config?.sheet_brief ? `  Tableur prévu : ${s.config.sheet_brief}` : null,
      s.config?.inbox_brief ? `  Boîte de réception prévue : ${s.config.inbox_brief}` : null,
      s.config?.persona_brief ? `  Interlocuteur prévu (${s.config.persona_mode === "chat" ? "échange écrit" : "appel"}) : ${s.config.persona_brief}` : null,
      s.config?.board_brief ? `  Tableau prévu${s.config.board_mode ? ` (${s.config.board_mode})` : ""} : ${s.config.board_brief}` : null,
      s.config?.code_brief ? `  Tâche de code prévue : ${s.config.code_brief}` : null,
      sousDims ? `  Sous-dimensions et leurs checkpoints :\n${sousDims}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function buildCritiquePrompt({ title, description, criteria, companyContext, additionalContext, steps, filRouge }) {
  const hard = (criteria.hard_skills || []).map((s) => `- ${s.name}`).join("\n");
  const soft = (criteria.soft_skills || []).map((s) => `- ${s.name}`).join("\n");
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  // Pas de consigne de langue de sortie : ce prompt ne produit RIEN qui soit lu
  // par le candidat ou le recruteur. Ses `consigne` repartent vers le prompt de
  // régénération, qui est en français — même règle que les entrées d'outil du
  // chat. Seul `extrait_fautif` échappe à ça : c'est une citation, elle reste
  // dans la langue de l'étape, sinon elle n'est plus vérifiable.
  return `Tu es un recruteur exigeant. On te présente une expérience de présélection qui vient d'être conçue pour ton offre, et tu dois décider si tu la publies TELLE QUELLE devant de vrais candidats.

Tu ne juges PAS la structure (nombre d'étapes, formats de réponse, champs manquants) : elle est vérifiée ailleurs. Tu juges ce qu'aucune vérification automatique ne voit — est-ce que ce parcours donne envie, est-ce qu'il est crédible, est-ce qu'il fera vraiment la différence entre un bon candidat et un moyen ?

${blocOffre({ title, description, criteria })}

COMPÉTENCES TECHNIQUES À MESURER :
${hard || "Non précisées"}

SAVOIR-ÊTRE À MESURER :
${soft || "Non précisés"}

CONTEXTE ENTREPRISE :
${companyBlock}
${additionalContext ? `\nCE QUE LE RECRUTEUR A DIT DE SON MÉTIER (matériau recueilli en entretien) :\n${additionalContext}\n` : ""}
${filRouge ? `LES ÉTAPES SE SUIVENT — fil rouge lu par le candidat avant de commencer : ${filRouge.contexte_candidat}\nUne étape qui fait référence à la précédente n'est pas « creuse » pour autant ; une étape qui contredit le fil rouge (un autre nom pour le même client, un autre chiffre) est un SCÉNARIO INVRAISEMBLABLE.\n\n` : ""}LE PARCOURS À RELIRE :
${rendreEtapesPourCritique(steps)}

CE QUI EST BLOQUANT — et rien d'autre :
1. RÔLE TRAHI — le défaut le plus grave, vérifie-le en premier : la mise en situation met en scène la version GÉNÉRIQUE du métier au lieu de ce que dit l'offre. Des clients à qui vendre là où l'offre parle de PARTENAIRES à convaincre de collaborer, du grand public là où elle parle de B2B, des utilisateurs externes là où le support est interne. Relis à qui le candidat s'adresse dans l'offre, puis à qui il s'adresse dans l'étape : si ce n'est pas la même personne, c'est bloquant.
2. SCÈNE JOUÉE DANS LA MAUVAISE LANGUE : l'offre dit que le candidat parlera à ses interlocuteurs dans une autre langue que celle du parcours — une entreprise anglophone qui recrute pour attaquer le marché francophone, par exemple — et l'étape fait pourtant parler ces interlocuteurs dans la langue du parcours : l'objection citée, le message client, la fiche du prospect à contacter (le contexte d'un e-mail à écrire), les sources. Ou elle ne dit pas au candidat de leur répondre dans leur langue. L'énoncé, lui, peut rester dans la langue du parcours : c'est la SCÈNE qui doit changer de langue. Ne le signale PAS si l'offre ne dit rien de tel.
3. SCÉNARIO FADE : la mise en situation pourrait être recopiée telle quelle sur n'importe quelle offre du même intitulé. Aucun détail qui vienne de CE poste, de CETTE entreprise, de CE marché.
4. SCÉNARIO INVRAISEMBLABLE : la situation ne se produit pas dans ce métier, ou pas comme ça. Un professionnel du secteur froncerait les sourcils.
${additionalContext ? `5. MATÉRIAU IGNORÉ : le recruteur a donné une situation vécue, des noms de produits, une objection dans ses mots — et rien de tout cela n'apparaît dans le parcours. Il reconnaîtra son métier ou il ne le reconnaîtra pas.\n` : `5. ÉNONCÉ CREUX : la tâche est posée si vaguement que le candidat ne sait pas ce qu'on attend de lui.\n`}6. GRILLE INDISTINCTE : deux checkpoints d'une sous-dimension disent la même chose en d'autres mots, un checkpoint combine plusieurs comportements, ou il reste si vague ("bonne qualité", "réponse adéquate") qu'il ne permet de trancher aucun cas réel.
7. QUESTION QUI NE PROUVE RIEN : la réponse est devinable, ou récite une définition, sans rien montrer de ce que le candidat sait FAIRE.
8. CHECKPOINT HORS DE PORTÉE — le défaut qui rend une grille injuste : un checkpoint exige un fait que le candidat ne peut pas connaître, parce qu'il ne figure ni dans l'énoncé ni dans la scène — un chiffre, un délai, une référence client, une fonctionnalité du produit, une information interne. Un candidat extérieur à l'entreprise est alors noté sur ce qu'on ne lui a pas dit. Consigne attendue : réécrire le checkpoint sur la démarche, ou ajouter le fait à la scène.

CE QUI N'EST PAS BLOQUANT : une tournure perfectible, une longueur, une préférence de ton, un choix de format discutable, une orthographe. Ne les signale pas.

RÈGLES DE JUGEMENT — lis-les avant de répondre :
- Un parcours correct est le cas NORMAL. Si rien n'est bloquant, dis-le : "publiable", liste vide. Ne cherche pas un défaut pour en trouver un — faire réécrire une étape correcte est un dommage, pas une amélioration.
- Signale AU PLUS ${CRITIQUE_MAX_REECRITURES} étapes. Si tu en vois plus, garde les plus graves : celles qu'un candidat remarquerait.
- Pour CHAQUE problème, "extrait_fautif" doit être un passage RECOPIÉ MOT POUR MOT depuis l'étape (énoncé, titre, message client, contexte de l'e-mail ou du document, ou description d'un niveau). Ne le traduis pas, ne le reformule pas, ne l'abrège pas : il est vérifié automatiquement contre le texte de l'étape, et un extrait introuvable fait écarter ton signalement.
- "consigne" est rédigée EN FRANÇAIS pour un concepteur qui ne voit ni cette conversation ni ton raisonnement. Dis ce qui doit changer ET ce qui doit être conservé. Sois concret : "remplace le client anonyme par un DRH d'une PME industrielle de 80 personnes qui conteste le prix au moment de signer" vaut mieux que "rends la situation plus réaliste".
- INTERDIT DANS UNE CONSIGNE : demander au candidat de RACONTER une expérience passée ("décrivez une situation où vous avez…", "expliquez comment vous avez déjà…"). Ce produit interdit les questions rétrospectives auto-déclaratives — elles recréent le biais du CV — et le concepteur appliquera ta consigne AVANT tout le reste : une consigne fautive fait donc entrer dans le parcours ce que la génération s'interdit. Demande une mise en situation JOUÉE DANS L'INSTANT, jamais un récit.

Réponds UNIQUEMENT avec un JSON valide :
{
  "verdict": "publiable" | "a_revoir",
  "problemes": [
    { "etape": 2, "probleme": "Ce qui ne va pas, en une phrase.", "extrait_fautif": "…passage recopié mot pour mot…", "consigne": "Consigne de réécriture, en français." }
  ]
}`;
}

// Normalise pour comparer une citation au texte d'une étape : les espaces et
// les retours à la ligne du JSON ne doivent pas faire échouer un extrait juste.
function normaliserPourCitation(s) {
  return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Tout le texte d'une étape que le critique a pu lire, mis bout à bout : c'est
// contre ça qu'on vérifie ses citations.
function texteEtape(step) {
  const dims = (step.sub_dimensions || step.criteria || []).flatMap((c) => [
    c?.name,
    ...(c?.bars_levels || []).map((n) => n?.description),
    ...(Array.isArray(c?.checkpoints) ? c.checkpoints : []).map((cp) => cp?.description || cp),
  ]);
  return normaliserPourCitation([
    step.title, step.prompt,
    step.config?.client_message, step.config?.crm_brief, step.config?.code_brief,
    step.config?.sheet_brief, step.config?.inbox_brief, step.config?.persona_brief, step.config?.board_brief,
    step.config?.to, step.config?.subject, step.config?.context, step.config?.document_context,
    ...dims,
  ].filter(Boolean).join(" ¶ "));
}

/**
 * Relit le parcours et renvoie les étapes à réécrire, déjà filtrées.
 *
 * Ne renvoie JAMAIS d'erreur bloquante : un échec de critique laisse passer le
 * parcours tel quel. Perdre un 2e regard est ennuyeux, perdre la génération que
 * le recruteur attend depuis deux minutes l'est bien davantage.
 *
 * Exportée pour être exerçable seule : le risque propre à cette passe est
 * qu'elle réécrive du bon travail, et ça ne se vérifie qu'en lui soumettant des
 * parcours dont on sait déjà s'ils sont bons ou fades.
 */
export async function critiquerExperience({ title, description, criteria, companyContext, additionalContext, steps, filRouge }) {
  const prompt = buildCritiquePrompt({ title, description, criteria, companyContext, additionalContext, steps, filRouge });

  const response = await streamCompletion({
    system: "Tu relis des évaluations de recrutement avant publication. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
    prompt,
    maxTokens: 8000,
    // Juger demande de peser plusieurs lectures d'un même énoncé : c'est le
    // genre de tâche pour laquelle cette passe existe.
    reflexion: true,
  });

  if (response.stop_reason === "max_tokens") return { problemes: [], usage: response.usage };
  const match = (response.text || "").match(/\{[\s\S]*\}/);
  if (!match) return { problemes: [], usage: response.usage };

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return { problemes: [], usage: response.usage };
  }

  const bruts = Array.isArray(parsed.problemes) ? parsed.problemes : [];
  const retenus = [];
  for (const p of bruts) {
    const index = Number(p?.etape) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) continue;
    if (!p?.consigne || !String(p.consigne).trim()) continue;

    // La citation fait foi. Un extrait qu'on ne retrouve pas dans l'étape est un
    // défaut inventé — le mode d'échec propre à cette passe, et le seul qu'on
    // puisse attraper sans relire soi-même.
    const extrait = normaliserPourCitation(p.extrait_fautif);
    if (extrait.length < 12 || !texteEtape(steps[index]).includes(extrait)) continue;

    if (retenus.some((r) => r.index === index)) continue; // une étape ne se réécrit qu'une fois
    retenus.push({ index, probleme: String(p.probleme || "").trim(), consigne: String(p.consigne).trim() });
    if (retenus.length >= CRITIQUE_MAX_REECRITURES) break;
  }

  return { problemes: retenus, usage: response.usage, ecartes: bruts.length - retenus.length };
}

// Applique une étape réécrite sur l'étape d'origine, EN MÉMOIRE (avant toute
// persistance). Même principe que la fusion de runStepRegeneration : le modèle
// ne renvoie que ce qu'il change, une clé absente veut dire « je n'y touche
// pas » — remplacer effacerait ce que la consigne ne visait pas.
function fusionnerEtapeReecrite(ancienne, nouvelle) {
  const memeSandbox = (ancienne.sandbox_kind || "none") === (nouvelle.sandbox_kind || "none");
  return {
    ...ancienne,
    kind: nouvelle.kind || ancienne.kind,
    title: nouvelle.title || ancienne.title,
    prompt: nouvelle.prompt ?? ancienne.prompt,
    response_format: nouvelle.response_format || ancienne.response_format,
    sandbox_kind: nouvelle.sandbox_kind || ancienne.sandbox_kind || "none",
    ai_assistant_allowed: nouvelle.ai_assistant_allowed ?? ancienne.ai_assistant_allowed,
    skill_assessed: nouvelle.skill_assessed || ancienne.skill_assessed,
    skills_tested: Array.isArray(nouvelle.skills_tested) && nouvelle.skills_tested.length
      ? nouvelle.skills_tested
      : ancienne.skills_tested,
    sub_dimensions: Array.isArray(nouvelle.sub_dimensions) && nouvelle.sub_dimensions.length
      ? nouvelle.sub_dimensions
      : (ancienne.sub_dimensions || []),
    config: {
      ...(memeSandbox ? (ancienne.config || {}) : {}),
      ...(nouvelle.config || {}),
    },
  };
}

/**
 * Passe de critique complète : relire, puis réécrire ce qui doit l'être.
 * Renvoie les étapes (modifiées ou non) et les usages à comptabiliser.
 */
async function relireEtCorriger({ title, description, criteria, companyContext, additionalContext, steps, locale, uiLocale, onEvent, filRouge }) {
  const usages = [];
  onEvent?.({ kind: "critique_start" });

  const { problemes, usage } = await critiquerExperience({
    title, description, criteria, companyContext, additionalContext, steps, filRouge,
  });
  if (usage) usages.push(usage);

  if (!problemes.length) {
    onEvent?.({ kind: "critique_ok" });
    return { steps, usages };
  }

  const corrigees = steps.slice();
  // Les réécritures partent EN PARALLÈLE : elles portent sur des étapes
  // différentes et ne lisent que le parcours d'origine. En série, deux
  // réécritures ajoutaient deux appels bout à bout à une génération qui frôle
  // déjà le plafond de durée de la route (300 s).
  const fixes = await Promise.all(problemes.map((pb) => {
    const etape = steps[pb.index];
    onEvent?.({ kind: "critique_fix", n: pb.index + 1, label: etape.title || null });
    return regenererEtapeContenu({
      title, description, criteria, companyContext,
      // Forme attendue par le prompt de régénération : il lit les
      // sous-dimensions sous le nom de colonne `criteria` (celui de la base).
      step: { ...etape, criteria: etape.sub_dimensions || etape.criteria || [] },
      position: pb.index + 1,
      total: steps.length,
      autresEtapes: steps
        .map((e, i) => ({ position: i + 1, kind: e.kind, title: e.title, skill_assessed: e.skill_assessed }))
        .filter((_, i) => i !== pb.index),
      instruction: pb.consigne,
      locale, uiLocale, filRouge,
    }).catch((e) => ({ success: false, error: e.message }));
  }));

  problemes.forEach((pb, k) => {
    const fix = fixes[k];
    // L'usage est comptabilisé même quand la réécriture échoue : l'appel a bien
    // été payé, et la page Coûts doit le voir.
    if (fix.usage) usages.push(fix.usage);

    // Réécriture ratée : on garde l'étape d'origine. Une passe de qualité qui
    // dégrade le résultat serait pire que pas de passe du tout.
    if (!fix.success) {
      console.error("critique — réécriture échouée:", fix.error);
      return;
    }
    corrigees[pb.index] = fusionnerEtapeReecrite(steps[pb.index], fix.step);
  });

  return { steps: corrigees, usages };
}

// ─── Compétences : normalisation et couverture ────────────────────────────────
// Le modèle rend des identifiants de compétence et des checkpoints ; rien de ce
// qu'il rend n'est cru sur parole. Les identifiants sont résolus contre la liste
// validée (un identifiant inventé disparaît), les checkpoints reçoivent des
// identifiants posés par le code, et les compétences notées par les critères
// rejoignent `skills_tested` — l'étape ne peut pas tester moins que ce que sa
// grille note.

/** Une étape générée, remise dans sa forme stockable. Forme « génération » : `sub_dimensions`. */
function normaliserEtape(s, competences) {
  const declares = resoudreIds(s.skills_tested, competences);
  // Repli sur le nom : une étape réécrite par un prompt plus ancien, ou un
  // modèle qui a recopié le libellé au lieu de l'identifiant.
  const ids = declares.length
    ? declares
    : resoudreIds([...(s.targets_skills || []), s.skill_assessed].filter(Boolean), competences);

  const sub_dimensions = (s.sub_dimensions || s.criteria || [])
    .map((c) => normaliserCritere(c, ids, competences))
    .filter(Boolean);

  const skills_tested = [...ids];
  for (const c of sub_dimensions) {
    if (!estCritereCheckpoints(c)) continue;
    for (const id of [...(c.skill_ids || []), ...c.checkpoints.map((cp) => cp.skill_id).filter(Boolean)]) {
      if (!skills_tested.includes(id)) skills_tested.push(id);
    }
  }
  return { ...s, skills_tested, sub_dimensions };
}

/** Vue « base » d'une étape en mémoire, pour calculerCouverture. */
function formeBase(s) {
  return { ...s, criteria: s.sub_dimensions || s.criteria || [], config: { ...(s.config || {}), skills_tested: s.skills_tested || [] } };
}

// Le prompt de la passe de couverture. Même principe que la passe de critique :
// une correction CIBLÉE — une sous-dimension ajoutée à une étape existante —,
// jamais une régénération du parcours. Et le droit de répondre « aucune étape
// ne s'y prête » : un rattachement artificiel noterait le candidat sur ce que
// sa réponse ne pouvait pas montrer.
function buildCouverturePrompt({ title, description, criteria, companyContext, steps, manquantes, locale, uiLocale }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  return `${consigneLangueEtapes(locale, uiLocale)}

Tu es un concepteur d'évaluations de recrutement par compétences. Un parcours de présélection vient d'être conçu pour l'offre ci-dessous, mais des compétences MUST-HAVE, validées par le recruteur, n'y sont notées par AUCUN checkpoint. Un candidat serait donc retenu ou écarté sans que ces compétences aient été observées.

${blocOffre({ title, description, criteria })}

CONTEXTE ENTREPRISE :
${companyBlock}

LE PARCOURS, TEL QU'IL EST :
${rendreEtapesPourCritique(steps)}

COMPÉTENCES MUST-HAVE SANS AUCUN CHECKPOINT :
${manquantes.map((c) => `- [${c.id}] ${c.name}`).join("\n")}

TA TÂCHE, pour CHACUNE de ces compétences :
- Trouve l'étape EXISTANTE dont la réponse permet DÉJÀ d'observer cette compétence, telle que l'énoncé et la scène sont écrits. Tu ne modifies ni l'énoncé ni la scène : tu ajoutes seulement une sous-dimension à sa grille.
- Écris cette sous-dimension : un nom, et 3 à 5 checkpoints qui notent cette compétence dans CETTE réponse-là.
- Si AUCUNE étape ne s'y prête honnêtement — la réponse attendue ne montrera jamais cette compétence —, réponds "etape": null. N'invente pas un rattachement artificiel : c'est le recruteur qui décidera d'ajouter un exercice.

RÈGLES DES CHECKPOINTS — identiques à celles de la génération :
${REGLES_CHECKPOINTS}

Le "name" de la sous-dimension et la "description" des checkpoints sont lus par le recruteur seul : ils suivent la langue du recruteur (voir la consigne en tête).

Réponds UNIQUEMENT avec un JSON valide :
{
  "rattachements": [
    { "skill_id": "identifiant recopié tel quel", "etape": 2, "sub_dimension": { "name": "…", "checkpoints": [ { "description": "…" } ] } },
    { "skill_id": "…", "etape": null }
  ]
}`;
}

/**
 * Cherche, pour des compétences must-have sans checkpoint, une étape existante
 * où les noter. Ne touche à rien : renvoie les rattachements proposés, déjà
 * validés (étape existante, compétence demandée, critère non vide).
 *
 * @returns {Promise<{rattachements: Array<{skillId:string, index:number|null, critere:object|null}>, usage: object|null}>}
 */
async function rattacherCompetences({ title, description, criteria, companyContext, steps, manquantes, competences, locale, uiLocale, model }) {
  const prompt = buildCouverturePrompt({ title, description, criteria, companyContext, steps, manquantes, locale, uiLocale });
  const response = await streamCompletion({
    system: "Tu conçois des grilles d'évaluation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
    prompt,
    maxTokens: 8000,
    model,
  });

  const vide = manquantes.map((c) => ({ skillId: c.id, index: null, critere: null }));
  if (response.stop_reason === "max_tokens") return { rattachements: vide, usage: response.usage };
  const match = (response.text || "").match(/\{[\s\S]*\}/);
  let parsed = null;
  try { parsed = match ? JSON.parse(match[0]) : null; } catch { parsed = null; }
  if (!parsed) return { rattachements: vide, usage: response.usage };

  const proposes = Array.isArray(parsed.rattachements) ? parsed.rattachements : [];
  const rattachements = manquantes.map((c) => {
    const p = proposes.find((r) => resoudreIds([r?.skill_id], competences)[0] === c.id);
    const index = Number(p?.etape) - 1;
    if (!p || !Number.isInteger(index) || index < 0 || index >= steps.length) {
      return { skillId: c.id, index: null, critere: null };
    }
    const critere = normaliserCritere(
      { ...(p.sub_dimension || {}), skill_ids: [c.id], added_for_coverage: c.id },
      [c.id],
      competences
    );
    return critere ? { skillId: c.id, index, critere } : { skillId: c.id, index: null, critere: null };
  });
  return { rattachements, usage: response.usage };
}

/**
 * Passe de couverture sur un parcours EN MÉMOIRE (génération complète).
 * Enveloppée par l'appelant : comme la critique, elle ne peut qu'ajouter, et son
 * échec laisse le parcours tel quel — l'écart s'affichera au recruteur.
 */
async function assurerCouverture({ title, description, criteria, companyContext, steps, competences, locale, uiLocale, onEvent }) {
  const { manquantes } = calculerCouverture(steps.map(formeBase), competences);
  const nbMust = competences.filter((c) => c.tier === MUST).length;
  if (!manquantes.length) {
    onEvent?.({ kind: "coverage_ok", count: nbMust });
    return { steps, usages: [] };
  }

  const { rattachements, usage } = await rattacherCompetences({
    title, description, criteria, companyContext, steps, manquantes, competences, locale, uiLocale,
  });

  const corrigees = steps.slice();
  for (const r of rattachements) {
    const nom = competences.find((c) => c.id === r.skillId)?.name || r.skillId;
    if (r.index == null) {
      onEvent?.({ kind: "coverage_gap", label: nom });
      continue;
    }
    const etape = corrigees[r.index];
    corrigees[r.index] = {
      ...etape,
      sub_dimensions: [...(etape.sub_dimensions || []), r.critere],
      skills_tested: [...new Set([...(etape.skills_tested || []), r.skillId])],
    };
    onEvent?.({ kind: "coverage_fix", n: r.index + 1, label: nom });
  }
  return { steps: corrigees, usages: usage ? [usage] : [] };
}

// ─── Budget de temps de la génération ─────────────────────────────────────────
// La route qui la sert est coupée à 300 s (maxDuration, plafond du plan Vercel
// « hobby »). Une génération coupée, c'est plusieurs minutes de modèle payées
// pour rien, et aucune simulation. Les passes FACULTATIVES — relecture critique,
// couverture — cèdent donc la place quand le temps manque : mieux vaut un
// parcours enregistré sans deuxième regard, que le recruteur relit et dont le
// panneau de couverture montre les trous, qu'un parcours perdu.
//
// Les passes CRM et code, elles, ne sont jamais sautées : sans elles l'étape
// n'a pas de scène. Elles partent en parallèle.
//
// 270 s : l'enregistrement qui suit (version, étapes) et la marge réseau
// tiennent dans les 30 dernières secondes. Les marges ci-dessous sont les
// durées mesurées au banc, arrondies au-dessus.
export const BUDGET_GENERATION_MS = 270_000;
const MARGE_NOUVEL_ESSAI_MS = 100_000;  // une conception complète, sans réflexion
// 140 (c'était 110) : les passes tableur et boîte de réception rejoignent les
// passes CRM et code, et le pipeline CRM v2 pèse plus lourd que la fiche v1.
// Elles tournent en parallèle, mais la plus longue fixe la durée.
const MARGE_CRITIQUE_MS = 140_000;      // critique ~50 s + réécritures + passes de scène
const MARGE_COUVERTURE_MS = 40_000;     // un appel sans réflexion

// ─── Génération pure (appelable hors DB pour tests/démo) ──────────────────────
// `echeance` : horodatage (ms) au-delà duquel la génération doit avoir rendu
// la main. Absente, aucune passe n'est jamais sautée.
export async function generateExperienceContent({ title, description, criteria, companyContext, additionalContext, locale, uiLocale, onEvent, echeance = null }) {
  const prompt = buildExperienceGenerationPrompt({ title, description, criteria: criteria || {}, companyContext, additionalContext, locale, uiLocale });
  const competences = listerCompetences(criteria || {});
  const reste = () => (echeance ? echeance - Date.now() : Infinity);

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      // Un second essai qui ne peut pas finir ne ferait que payer une coupure.
      if (reste() < MARGE_NOUVEL_ESSAI_MS) break;
      onEvent?.({ kind: "retry" });
    }
    const scan = onEvent ? makeExperienceScanner(onEvent) : null;
    // La réflexion se voit dans le feed : sans cette ligne, le recruteur regarde
    // un curseur immobile pendant les dizaines de secondes où le modèle répartit
    // les compétences — et le feed a justement pour raison d'être de montrer le
    // travail réel plutôt qu'une barre de progression fictive.
    if (REFLEXION_ACTIVE && REFLEXION_CONCEPTION) onEvent?.({ kind: "reflexion" });
    const response = await streamCompletion({
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // 24000 : c'était 8000, déjà relevé une fois parce qu'une expérience
      // complète (3-6 étapes + grilles détaillées) se faisait tronquer.
      // La réflexion se sert dans le MÊME budget, et le banc l'a montré sans
      // douceur : à 16000, effort par défaut, les DEUX tentatives sont sorties
      // tronquées et la génération était perdue. Le plafond monte, et l'effort
      // est borné (REFLEXION_CONCEPTION) — les deux ensemble, parce que relever
      // le plafond seul ne fait que payer plus longtemps.
      // On est en streaming : un plafond haut ne coûte que ce qui sort.
      maxTokens: 24000,
      reflexion: REFLEXION_CONCEPTION,
      onText: scan || undefined,
    });
    const text = response.text || "";
    const usage = response.usage;

    // Troncature : la réponse a atteint le plafond de tokens -> JSON incomplet.
    if (response.stop_reason === "max_tokens") {
      lastErr = "réponse tronquée (expérience trop longue) — réessai";
      continue;
    }

    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        parsed.steps = (parsed.steps || []).map((s) => normaliserEtape(s, competences));
        // Le fil rouge est décidé par la conception ; les passes qui suivent
        // (critique, scènes détaillées) s'y tiennent.
        const filRouge = normaliserFilRouge(parsed.fil_rouge);
        parsed.fil_rouge = filRouge;
        onEvent?.({
          kind: "design_done",
          nbEtapes: (parsed.steps || []).length,
          minutes: parsed.estimated_minutes || null,
        });
        if (filRouge) onEvent?.({ kind: "fil_rouge" });

        const extraUsages = [];

        // ── 2e regard, AVANT les passes CRM/code ────────────────────────────
        // Enveloppé : une critique qui échoue laisse passer le parcours tel
        // quel. C'est un supplément de qualité, jamais un point de panne — et
        // c'est la première passe sacrifiée quand le temps manque.
        if (CRITIQUE_ACTIVE && (parsed.steps || []).length) {
          if (reste() < MARGE_CRITIQUE_MS) {
            onEvent?.({ kind: "critique_skipped" });
          } else {
            try {
              const relu = await relireEtCorriger({
                title, description, criteria: criteria || {}, companyContext, additionalContext,
                steps: parsed.steps, locale, uiLocale, onEvent, filRouge,
              });
              // Une étape réécrite sort du prompt de régénération : même
              // normalisation que le premier jet, sinon ses identifiants de
              // compétence et de checkpoint ne seraient pas contrôlés.
              parsed.steps = relu.steps.map((s) => normaliserEtape(s, competences));
              extraUsages.push(...relu.usages);
            } catch (e) {
              console.error("relireEtCorriger failed:", e.message);
            }
          }
        }

        // ── 2es passes : CRM, tableur, boîte de réception, code — EN PARALLÈLE
        // Ces steps n'ont qu'un brief d'une phrase ; on écrit maintenant leur
        // contenu complet. Chaque passe ne touche que son étape : rien ne les
        // oblige à attendre l'une après l'autre.
        await Promise.all((parsed.steps || []).map(async (s) => {
          // Tableur et boîte de réception : même forme, même repli.
          const scene = SCENES_DEUXIEME_PASSE[s.sandbox_kind];
          if (scene) {
            onEvent?.({ kind: scene.evenement, label: s.title || null });
            const res = await scene.generer({ title, description, criteria, companyContext, step: s, locale, onEvent, filRouge })
              .catch((e) => ({ success: false, error: e.message }));
            appliquerScene(s, scene, res);
            if (res.usage) extraUsages.push(res.usage);
            return;
          }
          // Sandbox code : 2e passe elle aussi, pour la même raison que le CRM.
          if (s.sandbox_kind === "code") {
            onEvent?.({ kind: "code_start", label: s.title || null });
            const exercice = await generateCodeExercise({ title, description, criteria, companyContext, step: s, locale, onEvent })
              .catch((e) => ({ success: false, error: e.message }));
            if (!exercice.success) {
              // Pas d'exercice exécutable = pas de sandbox code. L'étape retombe
              // en tâche texte plutôt que d'afficher un éditeur sans tests.
              console.error("generateCodeExercise failed:", exercice.error);
              s.sandbox_kind = "none";
              s.response_format = "text";
              return;
            }
            extraUsages.push(exercice.usage);
            s.response_format = "code";
            const { step_prompt, ...codeConfig } = exercice.code;
            // L'énoncé de la 1re passe ne connaissait ni le format d'entrée ni
            // celui de sortie : celui-ci les spécifie, il fait donc foi.
            if (step_prompt) s.prompt = step_prompt;
            s.config = { ...(s.config || {}), code: codeConfig };
            delete s.config.code_brief;
            return;
          }
          if (s.sandbox_kind !== "crm") return;
          onEvent?.({ kind: "crm_start", label: s.title || null });
          const scenario = await generateCrmScenario({ title, description, criteria, companyContext, step: s, locale, onEvent, filRouge })
            .catch((e) => ({ success: false, error: e.message }));
          if (!scenario.success) {
            // Pas de scénario = pas de sandbox : l'étape retombe en tâche texte
            // simple plutôt que d'exposer une fiche vide au candidat.
            console.error("generateCrmScenario failed:", scenario.error);
            s.sandbox_kind = "none";
            return;
          }
          extraUsages.push(scenario.usage);
          s.response_format = "text";
          // L'énoncé de la 1re passe a été écrit sans connaître le scénario : il
          // re-livre souvent l'information à extraire (et peut la contredire).
          // Celui de la 2e passe est écrit en connaissance des sources.
          const { step_prompt, ...crmConfig } = scenario.crm;
          if (step_prompt) s.prompt = step_prompt;
          s.config = { ...(s.config || {}), crm: crmConfig };
          delete s.config.crm_brief;
          // La mission vit désormais dans le scénario (crm.mission).
          delete s.config.crm_mission;
          // La fiche CRM se range sous la compétence que le modèle a choisie DANS
          // la liste validée — la correction des champs factuels comme la
          // sous-dimension "Croisement des sources" ci-dessous. Elle se rangeait
          // sous une compétence fixe, « Extraction d'information », qu'aucun
          // recruteur n'avait validée : la couverture ne pouvait pas la compter.
          // Le libellé fixe ne sert plus que de repli, pour une étape sans
          // compétence reconnue.
          if (!s.skill_assessed) s.skill_assessed = crmSkillName(uiLocale);
          const hasCrossCheck = (s.sub_dimensions || []).some((c) => RE_CROISEMENT.test(c.name || ""));
          if (!hasCrossCheck) {
            s.sub_dimensions = [...(s.sub_dimensions || []), critereCroisementSources(uiLocale, s.skills_tested)];
          }
        }));

        // ── Couverture des must-have, APRÈS les 2e passes ────────────────────
        // Placée en dernier pour juger le parcours complet : une sous-dimension
        // ajoutée à une étape CRM ou code doit être écrite sur la scène réelle,
        // pas sur le brief d'une phrase qui la précédait. Sans le temps de
        // l'appel, les trous sont annoncés tels quels : le panneau de couverture
        // les montrera au recruteur, avec de quoi les combler.
        if (competences.length) {
          if (reste() < MARGE_COUVERTURE_MS) {
            const { manquantes } = calculerCouverture(parsed.steps.map(formeBase), competences);
            for (const c of manquantes) onEvent?.({ kind: "coverage_gap", label: c.name });
          } else {
            try {
              const couvert = await assurerCouverture({
                title, description, criteria: criteria || {}, companyContext,
                steps: parsed.steps, competences, locale, uiLocale, onEvent,
              });
              parsed.steps = couvert.steps;
              extraUsages.push(...couvert.usages);
            } catch (e) {
              console.error("assurerCouverture failed:", e.message);
            }
          }
        }
        return { success: true, experience: parsed, usage: mergeUsage([usage, ...extraUsages]) };
      } catch (e) {
        lastErr = e.message;
      }
    } else {
      lastErr = "aucun JSON dans la réponse";
    }
  }
  return { success: false, error: `Génération invalide (${lastErr}).` };
}

// ─── Génère et persiste une expérience (draft → pending_review) ───────────────
// `additionalContext` : précisions libres issues du chat-first (ton souhaité,
// type de client, spécificités du poste non couvertes par l'offre).
export async function runExperienceGeneration(jobId, additionalContext = "", onEvent = null) {
  const debut = Date.now();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: job } = await supabase
      .from("jobs")
      .select("id, user_id, title, description, extracted_criteria, experience_locale")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();
    if (!job) return { success: false, error: "Offre introuvable ou accès refusé" };

    // ── Facturation : contrôle AVANT le modèle, débit APRÈS l'enregistrement ──
    // Chaque génération complète coûte 6 crédits (voir CREDIT_COSTS), sauf la
    // première d'une offre déjà payée sous l'ancien barème. On refuse ici un
    // compte qui ne pourrait pas payer, plutôt que de faire tourner plusieurs
    // minutes de modèle pour rien.
    if (!(await simulationPrepayee(job.id))) {
      const solde = await checkCredits(user.id, CREDIT_COSTS.simulation_generation);
      if (!solde.allowed) return { success: false, error: solde.error || "Crédits insuffisants." };
    }

    const crit = job.extracted_criteria || {};
    const nbSkills = (crit.hard_skills || []).length + (crit.soft_skills || []).length;
    onEvent?.({ kind: "job", title: job.title || null, nbSkills });

    const { data: profile } = await supabase
      .from("users")
      .select("company_ai_context, ui_locale")
      .eq("id", user.id)
      .single();

    const ctx = profile?.company_ai_context || {};
    onEvent?.({
      kind: "context",
      charge: !!(ctx.industry || ctx.description),
      industry: ctx.industry || null,
    });

    // ── Le matériau du chat, relu EN BASE et non transmis par le client ──────
    // Le brief que le chat envoie ne porte plus que l'INTENTION du recruteur ;
    // les faits qu'il a racontés — sa situation vécue, ses mots exacts — vivent
    // dans la fiche de découverte, et arrivent ici RECOPIÉS depuis un JSON
    // stocké. C'est tout le levier : une synthèse réécrite au moment de générer
    // diluait précisément ce qui rendait le scénario reconnaissable.
    //
    // Relu côté serveur plutôt que reçu du navigateur : rien à faire transiter,
    // rien à faire tenir dans le plafond du chemin réseau, et une source unique.
    const fiche = await chargerDecouverte(supabase, jobId);
    const materiau = construireBriefDecouverte(fiche);
    // 12000 (c'était 4000) : le brief seul y tenait, le brief PLUS la fiche non.
    // Une coupe tomberait sur la fin du matériau, donc sur le vocabulaire du
    // recruteur — en silence, et en supprimant justement ce qu'on est venu
    // chercher. La fiche est bornée par construction (construireBriefDecouverte).
    const contexteComplet = [additionalContext, materiau].filter(Boolean).join("\n\n").slice(0, 12000);
    if (contexteComplet) {
      onEvent?.({ kind: "brief" });
    }
    // DEUX langues, et elles ne se déduisent pas l'une de l'autre :
    //   • le parcours appartient à l'OFFRE — un recruteur en interface anglaise
    //     qui génère une offre néerlandaise obtient une expérience en
    //     néerlandais ;
    //   • la grille de correction (skill_assessed, sous-dimensions, ancres BARS)
    //     appartient au RECRUTEUR. Elle est retirée de ce que reçoit le candidat
    //     (sanitizeStepForCandidate) : il ne la lit jamais, lui la lit toujours.
    const locale = coerceExperienceLocale(job.experience_locale);
    const uiLocale = coerceUiLocale(profile?.ui_locale);
    onEvent?.({ kind: "locale", locale });
    onEvent?.({ kind: "design_start" });

    const gen = await generateExperienceContent({
      title: job.title,
      description: job.description,
      criteria: crit,
      companyContext: ctx,
      additionalContext: contexteComplet,
      locale,
      uiLocale,
      onEvent,
      // Compté depuis l'entrée dans la fonction, lectures en base comprises :
      // c'est le chronomètre de la route qui compte, pas celui du modèle.
      echeance: debut + BUDGET_GENERATION_MS,
    });
    if (!gen.success) return gen;

    const { steps = [] } = gen.experience;
    // La durée annoncée par le modèle est ignorée : elle n'engage rien et se
    // désaccorde du contenu dès la première retouche du recruteur. On dérive la
    // même estimation que celle affichée partout ailleurs (lib/experienceDuree).
    const estimated_minutes = estimerMinutes(steps.map((s) => ({
      kind: s.kind,
      response_format: s.response_format || "text",
      sandbox_kind: s.sandbox_kind || "none",
      ai_assistant_allowed: !!s.ai_assistant_allowed,
    })));

    // Versionnage : une régénération crée TOUJOURS une nouvelle version. On ne
    // réécrit jamais une expérience existante — surtout pas une sur laquelle des
    // runs candidat existent (elle reste intacte, publiée ou non).
    const { data: latest } = await supabase
      .from("experiences").select("version").eq("job_id", job.id)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;
    onEvent?.({ kind: "version", version: nextVersion });

    // Nettoyage : on archive les brouillons précédents SANS run (superseded par
    // celui-ci). Les expériences avec des runs — ou publiées — ne sont pas touchées.
    const { data: priorDrafts } = await supabase
      .from("experiences").select("id").eq("job_id", job.id).in("status", ["draft", "pending_review"]);
    for (const d of priorDrafts || []) {
      const { count } = await supabase
        .from("candidate_runs").select("id", { count: "exact", head: true }).eq("experience_id", d.id);
      if (!count) {
        await supabase.from("experiences").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", d.id);
      }
    }

    // Crée la nouvelle version (registre du snapshot + coût de génération)
    const { data: experience, error: expErr } = await supabase
      .from("experiences")
      .insert({
        job_id: job.id,
        status: "pending_review",
        version: nextVersion,
        estimated_minutes,
        // Le fil rouge voyage avec la version, dans le registre de génération :
        // aucune migration, et une copie de version (experienceVersion.js) le
        // reprend avec le reste.
        generated_from: {
          criteria: job.extracted_criteria || {},
          company_ai_context: profile?.company_ai_context || {},
          fil_rouge: gen.experience.fil_rouge || null,
        },
        generation_usage: gen.usage,
      })
      .select()
      .single();
    if (expErr) throw expErr;

    // Insère les steps (le format de réponse est bien une colonne par step)
    const nomsCompetences = new Map(listerCompetences(crit).map((c) => [c.id, c.name]));
    const rows = steps.map((s, i) => ({
      experience_id: experience.id,
      order_index: i,
      kind: s.kind,
      response_format: s.response_format || "text",
      title: s.title || null,
      prompt: s.prompt || null,
      sandbox_kind: s.sandbox_kind || "none",
      ai_assistant_allowed: !!s.ai_assistant_allowed,
      skill_assessed: s.skill_assessed || null,
      // Nom de colonne historique : contient désormais les sous-dimensions de
      // skill_assessed. `|| s.criteria` : tolérance si le modèle retombe sur
      // l'ancienne clé malgré le schéma demandé.
      criteria: s.sub_dimensions || s.criteria || [],
      // `skills_tested` : identifiants de la liste validée, la clé de la
      // couverture et du tier. `targets_skills` : les mêmes, en noms — lu en
      // repli par le scoring des étapes qui n'ont pas de skill_assessed (QCM).
      // Aucun des deux ne part chez le candidat (sanitizeStepForCandidate).
      config: {
        ...(s.config || {}),
        skills_tested: s.skills_tested || [],
        targets_skills: (s.skills_tested || []).map((id) => nomsCompetences.get(id)).filter(Boolean),
      },
    }));
    if (rows.length > 0) {
      const { error: stepsErr } = await supabase.from("experience_steps").insert(rows);
      if (stepsErr) throw stepsErr;
    }

    // La nouvelle version existe : c'est maintenant, et pas avant, qu'elle est
    // due. Un échec de débit (solde tombé pendant la génération) ne défait pas
    // la simulation — le recruteur l'a, l'IA a tourné — il est journalisé.
    const facture = await factureGenerationSimulation(user.id, job.id);
    if (!facture.success) console.error("factureGenerationSimulation:", job.id, facture.error);

    const nbSubDims = rows.reduce((n, r) => n + (r.criteria || []).length, 0);
    onEvent?.({ kind: "saved", nbEtapes: rows.length, nbSubDims });
    onEvent?.({ kind: "done" });

    return { success: true, experienceId: experience.id, usage: gen.usage };
  } catch (err) {
    console.error("runExperienceGeneration error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Régénération d'UNE étape ─────────────────────────────────────────────────
// Le geste que ce module ne savait pas faire : retoucher une étape sans refaire
// les cinq autres.
//
// Ce que ça change concrètement : une passe complète, c'est 8000 tokens de
// sortie plus une 2e passe par étape CRM ; réécrire une étape en coûte quelques
// centaines. Corriger le ton d'une tâche ne justifiait pas de payer — ni de
// risquer — la refonte de tout le parcours.
//
// Et « risquer » n'est pas une figure de style : une génération complète crée
// une NOUVELLE VERSION, donc un parcours entièrement neuf. Les quatre étapes que
// le recruteur avait déjà relues et ajustées à la main partaient avec l'ancienne
// version. La régénération d'étape écrit EN PLACE, exactement comme l'édition
// manuelle de l'écran de relecture — dont elle n'est que la variante assistée.
function buildStepRegenerationPrompt({ title, description, criteria, companyContext, step, position, total, autresEtapes, instruction, locale, uiLocale, filRouge }) {
  const competences = listerCompetences(criteria);
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
    ctx.domain && `Modèle : ${ctx.domain}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  // L'étape est donnée telle qu'elle est EN BASE. `config.crm` est volontairement
  // remplacé par un marqueur : le scénario complet pèse 600-900 tokens qu'on
  // paierait à chaque retouche, alors que la consigne ne le concerne presque
  // jamais. Le modèle sait qu'il existe, et demande sa refonte s'il le faut.
  const configAffichee = { ...(step.config || {}) };
  if (configAffichee.crm) {
    configAffichee.crm = "<scénario CRM complet déjà généré (pipeline, champs, incohérence volontaire) — non reproduit ici>";
  }
  // Même raison pour le tableur et la boîte de réception : des milliers de
  // tokens qu'une retouche d'énoncé n'a pas à repayer.
  if (configAffichee.sheet) {
    configAffichee.sheet = "<tableur complet déjà généré (données, notes d'analyse) — non reproduit ici>";
  }
  if (configAffichee.inbox) {
    configAffichee.inbox = "<boîte de réception complète déjà générée (messages, notes de tri) — non reproduite ici>";
  }
  if (configAffichee.persona) {
    configAffichee.persona = `<personnage complet déjà généré (${configAffichee.persona.name || "interlocuteur"}, informations cachées, objections) — non reproduit ici>`;
  }
  if (configAffichee.board) {
    configAffichee.board = "<tableau complet déjà généré (cartes, contrainte, lecture attendue) — non reproduit ici>";
  }
  // Rangés à part dans la config en base, mais ce sont des champs de l'étape
  // pour le modèle : ils sortent de "config" pour apparaître à leur place.
  // `step.skills_tested` d'abord : la passe de critique réécrit des étapes
  // encore en mémoire, qui le portent à la racine.
  const skillsTested = step.skills_tested || configAffichee.skills_tested || [];
  delete configAffichee.skills_tested;
  delete configAffichee.targets_skills;

  const etapeActuelle = JSON.stringify({
    kind: step.kind,
    title: step.title,
    prompt: step.prompt,
    response_format: step.response_format,
    sandbox_kind: step.sandbox_kind,
    ai_assistant_allowed: step.ai_assistant_allowed,
    skills_tested: skillsTested,
    skill_assessed: step.skill_assessed,
    sub_dimensions: step.criteria || [],
    config: configAffichee,
  }, null, 2);

  const voisines = autresEtapes.length
    ? autresEtapes.map((a) => `- Étape ${a.position} : [${a.kind}] « ${a.title || "sans titre"} »${a.skill_assessed ? ` — évalue : ${a.skill_assessed}` : ""}`).join("\n")
    : "Aucune autre étape.";

  // Même consigne de langue qu'à la génération complète, et pour la même
  // raison : une étape régénérée sans elle reviendrait en français au milieu
  // d'une expérience néerlandaise, alors que le recruteur ne demandait qu'une
  // retouche de fond.
  return `${consigneLangueEtapes(locale, uiLocale)}

Tu es un concepteur d'évaluations de recrutement par compétences. Tu dois RÉÉCRIRE UNE SEULE ÉTAPE d'une expérience de présélection déjà générée, et déjà relue par le recruteur.

Tu ne produis QUE cette étape. Les autres ne sont là que pour te situer : n'y touche pas, ne les reprends pas, ne les recopie pas.

${blocOffre({ title, description, criteria })}

${blocCompetencesPrompt(competences)}

CONTEXTE ENTREPRISE :
${companyBlock}

${REGLE_ANCRAGE_OFFRE}
${filRouge ? `\n${blocFilRouge(filRouge)}L'étape réécrite reste dans cette histoire : mêmes noms, mêmes chiffres, même journée.\n` : ""}
LES AUTRES ÉTAPES DE L'EXPÉRIENCE (contexte — ne les régénère pas, et évite de faire doublon avec elles) :
${voisines}

ÉTAPE À RÉÉCRIRE — numéro ${position} sur ${total}, dans sa version actuelle :
${etapeActuelle}

CONSIGNE DU RECRUTEUR — elle prime sur tout le reste :
${instruction}

COMMENT RÉÉCRIRE :
- Applique la consigne, et RIEN QUE la consigne. Tout ce qu'elle ne demande pas de changer doit être conservé à l'identique : le recruteur a déjà relu cette étape, chaque modification non demandée est une régression pour lui.
- Si la consigne ne porte que sur l'énoncé, ne retouche ni les compétences testées ni les sous-dimensions. Si elle change la nature de l'exercice, alors "skills_tested", la compétence et les sous-dimensions doivent suivre.
- Une grille encore à l'ancien format (des "bars_levels" à trois niveaux) que tu dois modifier se réécrit au format checkpoints décrit à la règle 6 — jamais l'inverse.
- Tu peux changer "kind", "response_format" et "sandbox_kind" si la consigne l'implique — jamais de ta propre initiative.
- L'étape garde sa place dans le parcours : tu ne la déplaces pas.

RÈGLES DE CONCEPTION D'UNE ÉTAPE — identiques à celles de la génération complète, dont la numérotation est reprise telle quelle :
${REGLES_ETAPE}

${REGLES_QCM}

CAS PARTICULIER DES SANDBOXES "crm", "sheet", "inbox", "board" ET "persona" :
- Si l'étape est déjà dans l'une de ces sandboxes, sa scène détaillée (pipeline CRM, données du tableur, messages de la boîte, cartes du tableau, fiche du personnage) EXISTE DÉJÀ et n'est pas reproduite ci-dessus. Laisse "config" vide : elle sera conservée telle quelle.
- Mets "regenerate_scenario": true UNIQUEMENT si la consigne impose de refaire cette scène (changer la situation, les fiches, les données, les messages, les cartes, le personnage, les champs). C'est un second appel au modèle : ne le demande pas pour une simple retouche d'énoncé.
- Si tu fais PASSER l'étape dans l'une de ces sandboxes, mets dans "config" son brief d'une phrase — "crm_brief" (avec "crm_mission"), "sheet_brief", "inbox_brief", "board_brief" (avec "board_mode") ou "persona_brief" (avec "persona_mode") — et "regenerate_scenario": true.

${REGLE_GUILLEMETS}

Réponds UNIQUEMENT avec un JSON valide décrivant CETTE SEULE étape, sans texte avant ni après :
{
  "summary": "Une phrase, à la 1re personne, disant au recruteur ce que tu as changé.",
  "regenerate_scenario": false,
${SCHEMA_STEP_CHAMPS}
}
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 } — "sub_dimensions" reste vide ([]) et "skill_assessed" aussi (""), mais "skills_tested" porte la compétence que le QCM vérifie.`;
}

// Cumule un usage dans un compteur existant. mergeUsage() ne convient pas ici :
// il pose `calls` au nombre d'usages fusionnés, ce qui remettrait le compteur à
// 2 à chaque retouche au lieu de l'incrémenter. Or c'est précisément ce
// compteur qui mesure l'économie recherchée.
function cumulerUsage(precedent, ajout) {
  if (!ajout) return precedent || null;
  if (!precedent) return { ...ajout, calls: ajout.calls || 1 };
  return {
    model: ajout.model || precedent.model,
    calls: (precedent.calls || 0) + (ajout.calls || 1),
    input_tokens: (precedent.input_tokens || 0) + (ajout.input_tokens || 0),
    output_tokens: (precedent.output_tokens || 0) + (ajout.output_tokens || 0),
    cost_usd: Number(((precedent.cost_usd || 0) + (ajout.cost_usd || 0)).toFixed(6)),
  };
}

/**
 * Réécriture d'UNE étape — la partie MODÈLE, sans base de données.
 *
 * Extraite de runStepRegeneration pour que la passe de critique puisse la
 * réemployer AVANT toute persistance : elle corrige des étapes qui n'existent
 * encore qu'en mémoire, et qui n'ont donc pas d'id à passer.
 *
 * L'intérêt du partage n'est pas d'économiser vingt lignes : c'est que la
 * correction automatique et la retouche demandée par le recruteur passent par
 * le MÊME prompt, donc par les mêmes REGLES_ETAPE que la génération complète.
 * Une correction ne peut pas produire ce que la génération s'interdit.
 *
 * @returns {Promise<{success: boolean, step?: object, usage?: object, error?: string}>}
 */
async function regenererEtapeContenu({ title, description, criteria, companyContext, step, position, total, autresEtapes, instruction, locale, uiLocale, model, filRouge }) {
  const prompt = buildStepRegenerationPrompt({
    title, description, criteria: criteria || {}, companyContext,
    step, position, total, autresEtapes,
    instruction: String(instruction || "").slice(0, 2000),
    locale, uiLocale, filRouge,
  });

  let usage = null;
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // Une seule étape avec ses grilles BARS détaillées tenait en 4000 ; 8000
      // depuis les modèles 5.5, dont la réflexion se sert dans le même budget.
      maxTokens: 8000,
      model,
    });
    usage = cumulerUsage(usage, response.usage);
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const parsed = JSON.parse(match[0]);
      if (!parsed.title && !parsed.prompt) { lastErr = "étape vide"; continue; }
      return { success: true, step: parsed, usage };
    } catch (e) { lastErr = e.message; }
  }
  return { success: false, error: `Régénération invalide (${lastErr}).`, usage };
}

/**
 * Réécrit une étape EN PLACE, à partir d'une consigne en langage libre.
 *
 * Sans nouvelle version tant qu'aucun candidat n'a commencé : c'est une
 * édition, au même titre que celle de l'écran de relecture, et le recruteur qui
 * corrige une tournure n'attend pas une v3 de son parcours. Sur une version
 * déjà commencée, la réécriture porte sur une copie (versionModifiable) : les
 * candidats engagés gardent l'énoncé qu'ils ont lu et la grille qui les note.
 *
 * @param {string} stepId
 * @param {string} instruction consigne du recruteur, telle que le chat l'a comprise
 * @returns {Promise<{success: boolean, step?: object, position?: number, resume?: string, error?: string}>}
 */
// `model` : celui de la génération par défaut ; la couverture d'une compétence
// passe le sien (COUVERTURE_MODEL) quand elle crée une étape dédiée.
export async function runStepRegeneration(stepId, instruction, { model } = {}) {
  try {
    if (!instruction || !instruction.trim()) {
      return { success: false, error: "Aucune consigne : impossible de savoir quoi changer." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Propriété vérifiée par la jointure, comme assertStepOwnership : une étape
    // n'appartient à personne directement, elle appartient à l'offre qui la porte.
    const { data: step } = await supabase
      .from("experience_steps")
      .select("*, experiences!inner(id, job_id, generated_from, jobs!inner(id, user_id, title, description, extracted_criteria, experience_locale))")
      .eq("id", stepId)
      .single();
    const job = step?.experiences?.jobs;
    // Une étape réécrite reste dans l'histoire du parcours.
    const filRouge = step?.experiences?.generated_from?.fil_rouge || null;
    if (!step || !job || job.user_id !== user.id) return { success: false, error: "Accès refusé" };

    // 1 crédit par réécriture (CREDIT_COSTS.step_regeneration) : contrôlé ici,
    // avant le modèle, débité une fois l'étape écrite.
    const solde = await checkCredits(user.id, CREDIT_COSTS.step_regeneration);
    if (!solde.allowed) return { success: false, error: solde.error || "Crédits insuffisants." };

    // Version déjà commencée par un candidat : la réécriture porte sur une
    // copie. Tout ce qui suit (voisines, écriture, coût) vise alors la copie.
    const v = await versionModifiable(supabase, step.experience_id);
    if (v.forked) {
      step.id = v.correspondance.get(step.id);
      step.experience_id = v.experienceId;
    }

    // DEUX langues, et elles ne se déduisent pas l'une de l'autre :
    //   • le parcours appartient à l'OFFRE — un recruteur en interface anglaise
    //     qui génère une offre néerlandaise obtient une expérience en
    //     néerlandais ;
    //   • la grille de correction (skill_assessed, sous-dimensions, ancres BARS)
    //     appartient au RECRUTEUR. Elle est retirée de ce que reçoit le candidat
    //     (sanitizeStepForCandidate) : il ne la lit jamais, lui la lit toujours.
    const { data: profilRecruteur } = await supabase
      .from("users").select("ui_locale").eq("id", user.id).single();
    const uiLocale = coerceUiLocale(profilRecruteur?.ui_locale);

    // Les voisines situent l'étape et évitent les doublons. La position est
    // calculée sur la MÊME liste triée que celle affichée au chat : c'est ce qui
    // garantit que « l'étape 3 » désigne la même chose des deux côtés.
    const { data: fratrie } = await supabase
      .from("experience_steps")
      .select("id, order_index, kind, title, skill_assessed")
      .eq("experience_id", step.experience_id)
      .order("order_index");
    const liste = fratrie || [];
    const position = liste.findIndex((e) => e.id === step.id) + 1;
    const autresEtapes = liste
      .map((e, i) => ({ ...e, position: i + 1 }))
      .filter((e) => e.id !== step.id);

    const { data: profile } = await supabase
      .from("users").select("company_ai_context").eq("id", user.id).single();
    const companyContext = profile?.company_ai_context || {};

    const regen = await regenererEtapeContenu({
      title: job.title,
      description: job.description,
      criteria: job.extracted_criteria || {},
      companyContext,
      step,
      position,
      total: liste.length,
      autresEtapes,
      instruction,
      locale: coerceExperienceLocale(job.experience_locale),
      uiLocale,
      model,
      filRouge,
    });
    let usage = regen.usage || null;
    if (!regen.success) return { success: false, error: regen.error };
    const regenere = regen.step;

    // ── Même contrôle que la génération complète ─────────────────────────────
    // Compétences résolues contre la liste validée, checkpoints renumérotés.
    // Une grille ABSENTE de la réponse veut dire « je n'y touche pas » : c'est
    // la grille existante qui est reprise — jamais une grille vide, qui
    // effacerait ce que le recruteur a relu parce que la consigne ne portait
    // que sur l'énoncé.
    const competences = listerCompetences(job.extracted_criteria || {});
    const grilleFournie = Array.isArray(regenere.sub_dimensions) || Array.isArray(regenere.criteria);
    const nouveau = normaliserEtape({
      ...regenere,
      skills_tested: Array.isArray(regenere.skills_tested) && regenere.skills_tested.length
        ? regenere.skills_tested
        : (step.config?.skills_tested || []),
      skill_assessed: regenere.skill_assessed || step.skill_assessed,
      sub_dimensions: grilleFournie ? (regenere.sub_dimensions || regenere.criteria) : (step.criteria || []),
    }, competences);
    const nomsCompetences = new Map(competences.map((c) => [c.id, c.name]));

    // ── config : on FUSIONNE, on ne remplace pas ─────────────────────────────
    // Le modèle ne renvoie que ce qu'il a l'intention de changer, et il a toutes
    // les raisons de laisser "config" vide quand la consigne ne parle que de
    // l'énoncé. Remplacer effacerait alors le destinataire et l'objet d'une
    // sandbox email, ou le message client d'un client_reply — un contenu que
    // personne n'a demandé à perdre, et que rien n'aurait signalé.
    // La fusion ne vaut évidemment que si le type de sandbox n'a pas changé :
    // le config d'un email n'a rien à faire dans un document.
    const memeSandbox = (step.sandbox_kind || "none") === (nouveau.sandbox_kind || "none");
    const config = {
      ...(memeSandbox ? (step.config || {}) : {}),
      ...(nouveau.config || {}),
      skills_tested: nouveau.skills_tested,
      targets_skills: nouveau.skills_tested.map((id) => nomsCompetences.get(id)).filter(Boolean),
    };

    // ── Sandbox CRM : la 2e passe n'est repayée que si elle est demandée ──────
    // `regenerate_crm_scenario` : l'ancien nom du drapeau, encore accepté.
    const refaireScene = nouveau.regenerate_scenario === true || nouveau.regenerate_crm_scenario === true;

    // ── Tableur, boîte de réception : même règle que le CRM ci-dessous ───────
    const scene = SCENES_DEUXIEME_PASSE[nouveau.sandbox_kind];
    if (scene) {
      const existant = memeSandbox ? (step.config?.[scene.cle] || null) : null;
      if (!refaireScene && existant) {
        config[scene.cle] = existant;
        for (const b of scene.briefs) delete config[b];
      } else {
        const res = await scene.generer({
          title: job.title,
          description: job.description,
          criteria: job.extracted_criteria || {},
          companyContext,
          step: { ...nouveau, config: { ...config } },
          locale: coerceExperienceLocale(job.experience_locale),
          model,
          filRouge,
        }).catch((e) => ({ success: false, error: e.message }));
        if (res.usage) usage = cumulerUsage(usage, res.usage);
        const cible = { sandbox_kind: nouveau.sandbox_kind, response_format: nouveau.response_format, prompt: nouveau.prompt, config };
        appliquerScene(cible, scene, res);
        nouveau.sandbox_kind = cible.sandbox_kind;
        nouveau.response_format = cible.response_format;
        nouveau.prompt = cible.prompt;
        for (const k of Object.keys(config)) delete config[k];
        Object.assign(config, cible.config);
        if (nouveau.sandbox_kind !== scene.cle) delete config[scene.cle];
      }
    }

    if (nouveau.sandbox_kind === "crm") {
      const crmExistant = step.config?.crm || null;
      const refaire = refaireScene || !crmExistant;

      if (!refaire) {
        config.crm = crmExistant;
      } else {
        const scenario = await generateCrmScenario({
          title: job.title,
          description: job.description,
          criteria: job.extracted_criteria || {},
          companyContext,
          // `config` fusionné : la mission et le brief peuvent venir de la
          // config existante quand la consigne ne demandait que de refaire la scène.
          step: { ...nouveau, config: { ...config, ...(nouveau.config || {}) } },
          // `locale` manquait ici, et le défaut ne se voyait pas depuis le
          // français : un scénario CRM refait sur une expérience néerlandaise
          // repartait avec des sources en français, au milieu d'un parcours qui,
          // lui, était bien en néerlandais.
          locale: coerceExperienceLocale(job.experience_locale),
          model,
          filRouge,
        });
        if (scenario.success) {
          usage = cumulerUsage(usage, scenario.usage);
          const { step_prompt, ...crmConfig } = scenario.crm;
          if (step_prompt) nouveau.prompt = step_prompt;
          config.crm = crmConfig;
        } else {
          // Même repli que la génération complète : pas de scénario, pas de
          // sandbox — plutôt une tâche texte simple qu'une fiche vide.
          console.error("generateCrmScenario (régénération) failed:", scenario.error);
          nouveau.sandbox_kind = "none";
        }
      }
      delete config.crm_brief;
      delete config.crm_mission;
      // Le repli ci-dessus a pu ramener l'étape à "none" alors que la fusion y
      // avait déjà reversé l'ancien scénario : un config.crm sans sandbox crm
      // n'est lu par personne, mais il ferait mentir la relecture.
      if (nouveau.sandbox_kind !== "crm") delete config.crm;

      if (nouveau.sandbox_kind === "crm") {
        nouveau.response_format = "text";
        // Même règle qu'à la génération : la compétence choisie dans la liste
        // validée, le libellé fixe seulement en repli.
        if (!nouveau.skill_assessed) nouveau.skill_assessed = crmSkillName(uiLocale);
        const dims = nouveau.sub_dimensions || [];
        if (!dims.some((c) => RE_CROISEMENT.test(c?.name || ""))) {
          nouveau.sub_dimensions = [...dims, critereCroisementSources(uiLocale, nouveau.skills_tested)];
        }
      }
    }

    // `order_index` absent de la mise à jour : une régénération ne déplace jamais
    // l'étape. Le déplacement a son propre geste (moveStep).
    const maj = {
      kind: nouveau.kind || step.kind,
      response_format: nouveau.response_format || step.response_format || "text",
      title: nouveau.title || step.title,
      prompt: nouveau.prompt ?? step.prompt,
      sandbox_kind: nouveau.sandbox_kind || "none",
      ai_assistant_allowed: !!nouveau.ai_assistant_allowed,
      // Un QCM n'a ni compétence ni grille : c'est la règle 6, et le modèle
      // renvoie alors "" et [] volontairement — il faut les écrire tels quels.
      // Partout ailleurs, une valeur absente veut dire « je n'y touche pas ».
      skill_assessed: nouveau.kind === "classic_qcm"
        ? null
        : (nouveau.skill_assessed || step.skill_assessed || null),
      // Nom de colonne historique : contient les sous-dimensions (cf. insertion
      // de la génération complète). Déjà résolue plus haut : la nouvelle grille
      // si le modèle en a rendu une, l'existante sinon.
      criteria: nouveau.sub_dimensions,
      config,
      updated_at: new Date().toISOString(),
    };

    const { data: stepMaj, error: majErr } = await supabase
      .from("experience_steps").update(maj).eq("id", step.id).select().single();
    if (majErr) throw majErr;

    // L'étape est réécrite : le crédit est dû. Même règle que la génération
    // complète — un échec de débit ne défait pas ce que le recruteur a obtenu.
    const facture = await factureRegenerationEtape(user.id);
    if (!facture.success) console.error("factureRegenerationEtape:", step.id, facture.error);

    // Coût comptabilisé À PART de generation_usage, qui reste l'instantané de la
    // génération complète (migration 025).
    const { data: exp } = await supabase
      .from("experiences").select("regeneration_usage").eq("id", step.experience_id).single();
    await supabase
      .from("experiences")
      .update({ regeneration_usage: cumulerUsage(exp?.regeneration_usage, usage), updated_at: new Date().toISOString() })
      .eq("id", step.experience_id);

    return {
      success: true,
      step: stepMaj,
      position,
      resume: nouveau.summary || `Étape ${position} réécrite.`,
      usage,
      forked: v.forked,
      version: v.version,
    };
  } catch (err) {
    console.error("runStepRegeneration error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Couvrir UNE compétence must-have, à la demande du recruteur ─────────────
// Le geste du panneau « Couverture des compétences », sur une expérience déjà
// enregistrée. D'abord la voie légère : une sous-dimension ajoutée à une étape
// existante dont la réponse montre déjà la compétence — même passe que celle de
// la génération complète. Si aucune ne s'y prête, un exercice dédié est créé,
// par la régénération d'étape : mêmes règles que tout le reste, et c'est elle
// qui facture son crédit.
//
// 1 crédit dans les deux cas (CREDIT_COSTS.step_regeneration) : c'est une
// retouche assistée d'une étape, au même titre qu'une réécriture.
export async function runCouvertureCompetence(experienceId, skillId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences")
      .select("id, regeneration_usage, jobs!inner(id, user_id, title, description, extracted_criteria, experience_locale)")
      .eq("id", experienceId)
      .single();
    const job = exp?.jobs;
    if (!exp || !job || job.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const competences = listerCompetences(job.extracted_criteria || {});
    const cible = competences.find((c) => c.id === skillId);
    if (!cible) return { success: false, error: "Compétence introuvable dans la liste validée de l'offre." };

    const solde = await checkCredits(user.id, CREDIT_COSTS.step_regeneration);
    if (!solde.allowed) return { success: false, error: solde.error || "Crédits insuffisants." };

    // Version déjà commencée : la couverture s'ajoute à une copie. La copie
    // n'est pas verrouillée — la réécriture d'étape appelée plus bas ne
    // recopiera donc pas une seconde fois.
    const v = await versionModifiable(supabase, experienceId);
    experienceId = v.experienceId;
    const regenerationUsage = v.forked ? null : exp.regeneration_usage;

    const { data: profile } = await supabase
      .from("users").select("company_ai_context, ui_locale").eq("id", user.id).single();
    const uiLocale = coerceUiLocale(profile?.ui_locale);
    const locale = coerceExperienceLocale(job.experience_locale);

    const { data: steps } = await supabase
      .from("experience_steps").select("*").eq("experience_id", experienceId).order("order_index");
    const liste = steps || [];
    const nomsCompetences = new Map(competences.map((c) => [c.id, c.name]));

    let usage = null;
    if (liste.length) {
      const essai = await rattacherCompetences({
        title: job.title,
        description: job.description,
        criteria: job.extracted_criteria || {},
        companyContext: profile?.company_ai_context || {},
        steps: liste,
        manquantes: [cible],
        competences,
        locale,
        uiLocale,
        model: COUVERTURE_MODEL,
      });
      usage = cumulerUsage(usage, essai.usage);
      const r = essai.rattachements[0];

      if (r?.index != null) {
        const etape = liste[r.index];
        const skills = [...new Set([...(etape.config?.skills_tested || []), cible.id])];
        const { error } = await supabase
          .from("experience_steps")
          .update({
            criteria: [...(etape.criteria || []), r.critere],
            config: {
              ...(etape.config || {}),
              skills_tested: skills,
              targets_skills: skills.map((id) => nomsCompetences.get(id)).filter(Boolean),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", etape.id);
        if (error) throw error;

        const facture = await factureRegenerationEtape(user.id);
        if (!facture.success) console.error("factureRegenerationEtape (couverture):", etape.id, facture.error);
        await supabase
          .from("experiences")
          .update({ regeneration_usage: cumulerUsage(regenerationUsage, usage), updated_at: new Date().toISOString() })
          .eq("id", experienceId);

        return { success: true, mode: "attached", position: r.index + 1, forked: v.forked, version: v.version };
      }
    }

    // ── Aucune étape ne s'y prête : un exercice dédié ────────────────────────
    // L'essai de rattachement a été payé : son coût est consigné avant que la
    // régénération n'ajoute le sien au même compteur.
    if (usage) {
      await supabase
        .from("experiences")
        .update({ regeneration_usage: cumulerUsage(regenerationUsage, usage), updated_at: new Date().toISOString() })
        .eq("id", experienceId);
    }

    const dernier = liste.length ? liste[liste.length - 1].order_index : -1;
    const { data: vide, error: insErr } = await supabase
      .from("experience_steps")
      .insert({
        experience_id: experienceId, order_index: (dernier ?? -1) + 1,
        kind: "task", response_format: "text", title: cible.name,
        prompt: "", sandbox_kind: "none", ai_assistant_allowed: false,
        skill_assessed: cible.name, criteria: [], config: { skills_tested: [cible.id], targets_skills: [cible.name] },
      })
      .select()
      .single();
    if (insErr) throw insErr;

    const regen = await runStepRegeneration(
      vide.id,
      `Cette étape vient d'être créée, VIDE, pour une raison précise : la compétence MUST-HAVE « ${cible.name} » [${cible.id}] n'est notée par aucune autre étape du parcours. Conçois-la entièrement : une tâche courte et réaliste, ancrée dans le poste et dans la même scène que le reste du parcours, qui fait la preuve de cette compétence, sans doublon avec les autres étapes. "skills_tested" commence par ${cible.id}, et au moins une sous-dimension à checkpoints note cette compétence.`,
      { model: COUVERTURE_MODEL }
    );
    if (!regen.success) {
      // Pas d'étape vide laissée derrière : le recruteur la verrait sans
      // comprendre d'où elle vient.
      await supabase.from("experience_steps").delete().eq("id", vide.id);
      return { success: false, error: regen.error };
    }
    return { success: true, mode: "new_step", position: regen.position, forked: v.forked, version: v.version };
  } catch (err) {
    console.error("runCouvertureCompetence error:", err);
    return { success: false, error: err.message };
  }
}
