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
import { crmSkillName } from "@/lib/crmScoring";
import { estimerMinutes } from "@/lib/experienceDuree";
import { consigneLangueContenu, consigneLangueEtapes } from "@/lib/i18n/prompt";
import { coerceExperienceLocale, coerceUiLocale } from "@/lib/i18n/config";
import { CODE_LANGUAGES, DEFAULT_LANGUAGE } from "@/lib/constants/codeLanguages";

const GENERATION_MODEL = "claude-sonnet-4-6";

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

// Interrupteur d'exploitation : la réflexion se coupe par variable
// d'environnement, sans toucher au code. Elle change le comportement de TOUTES
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
const REGLES_ETAPE = `3. INTERDICTION des questions rétrospectives auto-déclaratives ("décrivez une situation où vous avez…", "racontez une expérience passée…", "parlez-moi d'une fois où…"). Elles recréent le biais du CV déclaratif que ce produit doit éviter : on mesure ce que le candidat FAIT maintenant, pas ce qu'il dit avoir fait.
4. Pour un signal oral/relationnel, utilise une MISE EN SITUATION JOUÉE EN DIRECT : place le candidat dans une scène concrète et fais-le RÉPONDRE DANS L'INSTANT, comme s'il y était (ex. : "Un prospect vous dit en visio : '…'. Répondez-lui maintenant, directement."). Jamais un récit après coup.
5. Pour CHAQUE étape, propose "response_format" par défaut :
   - "text" pour l'écrit (emails, analyses, réponses techniques),
   - "video" pour l'oral/le relationnel — TOUJOURS sous forme de mise en situation jouée en direct (règle 4),
   - "qcm" pour un QCM,
   - "code" uniquement si le poste est technique et qu'une tâche de code est pertinente.
   Le recruteur pourra changer ce défaut ; propose le plus pertinent.
6. Pour CHAQUE étape de type "question" ou "task", identifie la compétence principale ciblée (reprise des COMPÉTENCES TECHNIQUES ou du SAVOIR-ÊTRE ci-dessus) dans "skill_assessed", et décompose-la en 2 à 3 SOUS-DIMENSIONS observables — pas une liste de critères plats, une vraie décomposition de ce que "bien réussir cette compétence" veut dire concrètement dans ce contexte. Chaque sous-dimension reçoit sa propre grille à 3 niveaux (1 Insuffisant, 3 Attendu, 5 Excellent), avec des descriptions COMPORTEMENTALES et OBSERVABLES.
   Exemple de décomposition : la compétence "Travail d'équipe" se décompose en sous-dimensions "Collaboration", "Soutien aux collègues", "Communication" — chacune notée séparément, pas fondue en un seul critère générique "travail d'équipe".
   IMPORTANT pour les niveaux de chaque sous-dimension :
   - Chaque description DOIT inclure un exemple concret de ce que le candidat fait ou écrit (un mini-verbatim fictif illustratif entre guillemets).
   - Exemple pour la sous-dimension "Clarté de communication" niveau 3 : "Le candidat structure sa réponse avec des paragraphes logiques, ex. : « Je propose de procéder en 3 étapes : d'abord…, ensuite…, enfin… »"
   - Ne JAMAIS écrire de descriptions vagues comme "bonne qualité" ou "réponse adéquate".
   Une étape de type "classic_qcm" n'a pas de sous-dimensions (corrigée automatiquement, pas par grille).
7. Propose "ai_assistant_allowed" = true sur AU MOINS DEUX étapes de type "task" (le recruteur pourra désactiver ; on veut plusieurs points de mesure de l'usage de l'IA). Mets false pour les questions de connaissance pure et les QCM.
8. "sandbox_kind" : "email" | "client_reply" | "document" | "code" | "crm" pour les tâches, sinon "none".
   Quand sandbox_kind != "none", enrichis "config" avec le contexte de la sandbox :
   - Pour "email" : config.to, config.subject, config.context
   - Pour "client_reply" : config.client_message (le message client auquel le candidat doit répondre, rédigé de manière réaliste)
   - Pour "document" : config.document_context
   - Pour "crm" : config.crm_brief — UNE SEULE PHRASE décrivant la situation. Le scénario détaillé sera produit dans un second temps ; ne génère PAS les sources ni les champs ici.
   - Pour "code" : config.code_brief — UNE SEULE PHRASE décrivant la tâche de programmation. L'exercice complet (langage, squelette, cas de test) sera produit dans un second temps ; ne génère PAS les tests ici.
   QUAND CHOISIR "crm" : le poste consiste, au moins en partie, à RECEVOIR de l'information non structurée d'un tiers et à la CONSIGNER correctement dans un outil — vente, SDR, business developer, support/SAV, ADV, ops, office management, assistanat.
   NE PAS choisir "crm" pour un poste purement technique, créatif ou managérial. AU PLUS UN step "crm" par expérience, et son "response_format" doit être "text".`;

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
function blocOffre({ title, description, criteria }) {
  const crit = criteria || {};
  const missions = String(crit.clean_description || "").trim();
  const famille = [crit.category, crit.sub_family].filter(Boolean).join(" · ");

  return [
    `POSTE : ${title || "Non précisé"}${famille ? ` — ${famille}` : ""}`,
    missions
      ? `MISSIONS ET PROFIL (résumé de l'offre, relu et corrigé par le recruteur — c'est la source la plus fiable) :\n${missions.slice(0, 1500)}`
      : null,
    `OFFRE D'EMPLOI (texte d'origine) :\n${(description || "").slice(0, 3500) || "Non fournie"}`,
  ].filter(Boolean).join("\n\n");
}

// Ce que l'offre apporte et que les compétences n'apportent pas. Placé juste
// avant les règles de conception, donc lu après l'offre elle-même.
const REGLE_ANCRAGE_OFFRE = `ANCRAGE DANS CETTE OFFRE-CI — à lire avant de concevoir la moindre étape :
Les compétences listées disent CE QU'IL FAUT MESURER. L'offre dit DANS QUEL MONDE : à qui le candidat s'adresse, ce qu'il cherche à obtenir d'eux, ce que l'entreprise vend, et à quoi ressemble une journée. Les deux sont indispensables et l'une ne remplace pas l'autre.
NE RETOMBE JAMAIS SUR LA VERSION GÉNÉRIQUE DU MÉTIER. Un poste de vente peut viser des PARTENAIRES et non des clients ; un poste de support peut être interne ; un poste marketing peut ne jamais toucher au grand public ; un poste de recrutement peut ne sourcer que des profils techniques. Si l'offre parle de partenariats, les mises en situation mettent en scène des partenaires à convaincre de collaborer — jamais des prospects à qui vendre.
Avant d'écrire la première étape, repère dans l'offre : à qui le candidat parle, ce qu'il attend d'eux, et ce qui rend CE poste différent d'un autre portant le même intitulé. Si une étape que tu viens d'écrire resterait vraie pour n'importe quelle offre du même intitulé, elle est à refaire.`;

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
      "sandbox_kind": "none|email|client_reply|document|code|crm",
      "ai_assistant_allowed": true,
      "targets_skills": ["Compétence ciblée"],
      "config": {},
      "skill_assessed": "Nom de la compétence principale ciblée par cette étape — RENDU DANS LA LANGUE DU RECRUTEUR (voir la consigne de langue en tête), en TRADUISANT le nom repris de la liste des compétences si celle-ci est dans une autre langue",
      "sub_dimensions": [
        { "name": "Nom de la sous-dimension", "bars_levels": [
          { "level": 1, "label": "Insuffisant", "description": "..." },
          { "level": 3, "label": "Attendu", "description": "..." },
          { "level": 5, "label": "Excellent", "description": "..." }
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
  const hard = (criteria.hard_skills || []).map((s) => `- ${s.name}${s.priority ? ` (${s.priority})` : ""}`).join("\n");
  const soft = (criteria.soft_skills || []).map((s) => `- ${s.name}`).join("\n");
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

COMPÉTENCES TECHNIQUES À MESURER :
${hard || "Non précisées"}

SAVOIR-ÊTRE À MESURER :
${soft || "Non précisés"}

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
1. 3 à 6 étapes au total, durée cumulée 5–20 min.
2. Inclus AU MOINS DEUX "task" réalistes ancrées dans le métier et le contexte entreprise. C'est le cœur de la preuve.
${REGLES_ETAPE}
9. DIVERSITÉ DES KINDS : ne génère JAMAIS plus de 2 étapes du même kind "question" d'affilée. Varie entre task, question et classic_qcm.

${REGLES_QCM}

Réponds UNIQUEMENT avec un JSON valide :
{
  "estimated_minutes": 12,
  "steps": [
${SCHEMA_STEP}
  ]
}
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 } — "skill_assessed" et "sub_dimensions" restent vides ([] et "").`;
}

// ─── Prompt de la 2e passe : scénario complet d'un step "crm" ─────────────────
// Passe séparée à dessein : un config.crm complet (deux sources rédigées) pèse
// 600-900 tokens et refait dérailler la passe principale, qui a déjà été
// tronquée par le passé (d'où max_tokens 8000). On isole le risque.
function buildCrmScenarioPrompt({ title, description, criteria, companyContext, step, locale }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
  ].filter(Boolean).join("\n") || "Aucun contexte entreprise fourni.";

  // Les sources CRM sont le cœur de l'exercice : de faux emails et
  // retranscriptions d'appels. Ils doivent sonner comme des vrais documents
  // dans la langue du candidat — d'où la consigne en tête, ici aussi.
  return `${consigneLangueContenu(locale)}

Tu conçois une MISE EN SITUATION "fiche CRM" pour une évaluation de recrutement.

Le candidat reçoit un brief réaliste et EN DÉSORDRE (comme dans la vraie vie), puis doit structurer cette information dans une fiche type CRM. On mesure sa capacité à EXTRAIRE et ORGANISER l'information — pas sa communication.

${blocOffre({ title, description, criteria })}
CONTEXTE ENTREPRISE :
${companyBlock}

ÉNONCÉ DE L'ÉTAPE (déjà écrit, lu au candidat) :
${step.prompt || "(non fourni)"}
SITUATION À METTRE EN SCÈNE : ${step.config?.crm_brief || "À toi de la choisir, cohérente avec le poste."}

RÈGLES DE CONCEPTION :
1. SOURCES : exactement 2 ou 3, de FORMATS DIFFÉRENTS (email, retranscription d'appel, message entrant). Elles doivent être RÉALISTES et DÉSORDONNÉES : l'information utile est noyée dans du bavardage, des digressions, des politesses. Pas de liste à puces qui donne les réponses. 120 à 250 mots par source.
2. CHAMPS : 5 à 7. Chaque champ a une "nature" :
   - "factual" : la réponse est une valeur COURTE (5 mots maximum) recopiable TELLE QUELLE depuis une source — nom du contact, société, effectif, montant, date, intitulé de poste, nom d'un concurrent. Fournis "expected" : { "value": …, "accept": [variantes acceptables] }, et "tolerance" pour les nombres si pertinent. L'"expected.value" doit apparaître MOT POUR MOT dans une source : il est corrigé par comparaison automatique, sans IA.
   - "judgment" : tout le reste — ce qui suppose de reformuler, résumer, synthétiser ou arbitrer (besoin exprimé, enjeu, priorité, étape du pipeline, prochaine action). PAS de "expected".
   RÈGLE DE TRANCHAGE : si deux bons candidats peuvent formuler la réponse différemment, le champ est "judgment", jamais "factual".
   Il faut AU MOINS 2 champs "factual" et AU MOINS 2 champs "judgment".
3. PIÈGE OBLIGATOIRE — exactement UN : une information CONTRADICTOIRE entre deux sources (l'email annonce un chiffre, l'appel plus récent en annonce un autre). Elle doit porter sur un champ "factual", et l'"expected" de ce champ doit être la valeur RÉSOLUE (celle qui fait foi). La règle de résolution doit être déductible des sources (une date, une mention "finalement", "après arbitrage", "je corrige"), jamais arbitraire.
4. Les valeurs attendues doivent être TEXTUELLEMENT PRÉSENTES dans les sources. N'invente jamais un attendu que le candidat ne pourrait pas trouver.
5. Pour un champ "select", les options doivent être un vocabulaire métier plausible (4 à 5 options), et l'attendu doit être EXACTEMENT l'une des options.
6. Le type "date" est réservé aux échéances DATÉES ; son "expected" doit alors être au format jj/mm/aaaa et cette date doit figurer dans une source. Si la source ne donne qu'une échéance vague ("fin juin", "avant l'été"), utilise le type "text".
7. ÉNONCÉ : réécris l'énoncé de l'étape ("step_prompt"). Il doit être COURT (2 à 3 phrases), poser la scène et demander de compléter la fiche à partir des documents affichés. Il ne doit SURTOUT PAS contenir les informations à extraire (ni le nom, ni les chiffres, ni l'échéance) : tout doit se trouver uniquement dans les sources, sinon l'exercice n'a plus d'objet. Il ne doit pas non plus mentionner qu'il y a une contradiction.
8. Aucun emoji. Vouvoiement. Français professionnel.

Réponds UNIQUEMENT avec un JSON valide :
{
  "step_prompt": "Énoncé court lu au candidat, sans aucune information à extraire.",
  "record_title": "Titre de la fiche, ex: Fiche prospect — nouvelle opportunité",
  "sources": [
    { "id": "s1", "type": "email", "from": "prenom.nom@societe.fr", "subject": "…", "received_at": "Lundi 14:32", "body": "…" },
    { "id": "s2", "type": "call_transcript", "title": "Appel — mardi 9h10", "body": "…" }
  ],
  "fields": [
    { "key": "contact_name", "label": "Contact", "type": "text", "nature": "factual", "expected": { "value": "…", "accept": ["…"] } },
    { "key": "budget", "label": "Budget annoncé", "type": "number", "unit": "€", "nature": "factual", "expected": { "value": 30000, "tolerance": 0 } },
    { "key": "priority", "label": "Priorité", "type": "select", "options": ["Basse","Moyenne","Haute"], "nature": "judgment" },
    { "key": "next_action", "label": "Prochaine action", "type": "textarea", "nature": "judgment" }
  ],
  "notes_field": true,
  "traps": [
    { "id": "…", "kind": "contradiction", "fields": ["budget"], "sources": ["s1","s2"],
      "description": "Ce que dit chaque source et en quoi elles se contredisent.",
      "resolution": "Quelle valeur fait foi et pourquoi.",
      "expected_signal": "Ce que fait un bon candidat (retient la bonne valeur ET/OU signale l'écart dans ses notes)." }
  ]
}
Types de champ autorisés : "text", "number", "select", "textarea", "date".`;
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

  return `${consigneLangueContenu(locale)}

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
      temperature: 0.4,
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
// doit donc être traduit ici, sans quoi une expérience néerlandaise se
// retrouverait avec une grille BARS française au milieu — visible par le
// recruteur dans l'éditeur, et injectée telle quelle dans le prompt de scoring.
const CRM_CROSS_CHECK_CRITERION = {
  fr: {
    name: "Croisement des sources",
    bars_levels: [
      { level: 1, label: "Insuffisant", description: "Recopie une valeur d'une seule source sans voir qu'une autre la contredit, et ne mentionne aucun écart, ex. : notes vides ou « RAS, fiche complétée »." },
      { level: 3, label: "Attendu", description: "Retient la bonne valeur (celle qui fait foi) : il a lu les deux sources et tranché, même sans l'expliciter, ex. : le budget saisi correspond à l'information la plus récente." },
      { level: 5, label: "Excellent", description: "Retient la bonne valeur ET signale l'écart en indiquant laquelle fait foi, ex. : « Attention : 45 k€ annoncés par mail le 12, ramenés à 30 k€ lors de l'appel du 14 — je retiens 30 k€ »." },
    ],
  },
  en: {
    name: "Cross-checking sources",
    bars_levels: [
      { level: 1, label: "Below expectations", description: "Copies a value from a single source without noticing that another contradicts it, and flags no discrepancy — e.g. empty notes, or \"nothing to report, record completed\"." },
      { level: 3, label: "Meets expectations", description: "Records the correct value (the one that stands): they read both sources and made a call, even without saying so — e.g. the budget entered matches the more recent information." },
      { level: 5, label: "Excellent", description: "Records the correct value AND flags the discrepancy, stating which one stands — e.g. \"Note: €45k quoted by email on the 12th, revised down to €30k on the call of the 14th — going with €30k\"." },
    ],
  },
  nl: {
    name: "Bronnen kruislings controleren",
    bars_levels: [
      { level: 1, label: "Onvoldoende", description: "Neemt een waarde uit één bron over zonder te zien dat een andere bron die tegenspreekt, en meldt geen enkel verschil — bijv. lege notities of \"niets te melden, fiche ingevuld\"." },
      { level: 3, label: "Zoals verwacht", description: "Noteert de juiste waarde (die welke geldt): heeft beide bronnen gelezen en een keuze gemaakt, ook al wordt dat niet expliciet gezegd — bijv. het ingevulde budget komt overeen met de meest recente informatie." },
      { level: 5, label: "Uitstekend", description: "Noteert de juiste waarde ÉN signaleert het verschil met vermelding van wat geldt — bijv. \"Let op: €45k aangekondigd per mail op de 12e, bijgesteld naar €30k tijdens het gesprek van de 14e — ik hou €30k aan\"." },
    ],
  },
};

// Génère le scénario complet d'un step "crm" (2e passe).
async function generateCrmScenario({ title, description, criteria, companyContext, step, locale, onEvent }) {
  const prompt = buildCrmScenarioPrompt({ title, description, criteria, companyContext, step, locale });
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const scan = onEvent ? makeCrmScanner(onEvent) : null;
    const response = await streamCompletion({
      system: "Tu conçois des mises en situation de recrutement. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      maxTokens: 4000,
      temperature: 0.5,
      onText: scan || undefined,
    });
    const usage = response.usage;
    if (response.stop_reason === "max_tokens") { lastErr = "réponse tronquée"; continue; }
    const match = (response.text || "").match(/\{[\s\S]*\}/);
    if (!match) { lastErr = "aucun JSON dans la réponse"; continue; }
    try {
      const crm = JSON.parse(match[0]);
      if (!Array.isArray(crm.fields) || !crm.fields.length) { lastErr = "aucun champ généré"; continue; }
      return { success: true, crm, usage };
    } catch (e) {
      lastErr = e.message;
    }
  }
  return { success: false, error: `Scénario CRM invalide (${lastErr}).` };
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
// `reflexion` : laisse le modèle raisonner avant d'écrire. DEUX pièges, tous
// deux constatés sur l'API réelle et non déduits de la documentation :
//
//  1. `thinking` et `temperature` NE COHABITENT PAS. L'API refuse (400 :
//     « temperature may only be set to 1 when thinking is enabled »). On laisse
//     donc tomber la température sur les passes qui réfléchissent : entre une
//     température calibrée à 0.4 et un raisonnement, c'est le raisonnement qui
//     porte la qualité. Les passes sans réflexion gardent la leur, inchangée.
//  2. Les tokens de réflexion se prélèvent sur `max_tokens`. Chaque appelant
//     qui active la réflexion doit relever son plafond, sinon le modèle
//     consomme son budget à réfléchir et rend un JSON tronqué — la panne que
//     `stop_reason === "max_tokens"` rattrape, au prix d'un appel entier.
async function streamCompletion({ system, prompt, maxTokens, temperature, onText, reflexion = false }) {
  const reflechit = reflexion && REFLEXION_ACTIVE;
  const stream = anthropic.messages.stream({
    model: GENERATION_MODEL,
    max_tokens: maxTokens,
    ...(reflechit
      ? { thinking: REFLEXION, output_config: { effort: EFFORT_REFLEXION } }
      : { temperature }),
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
    usage: computeAiCost(GENERATION_MODEL, final.usage),
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

// 2e passe CRM : sources, champs de la fiche, puis l'incohérence volontaire.
function makeCrmScanner(onEvent) {
  return makeScanner(
    [
      { key: "source", re: `"type"\\s*:\\s*"(email|call_transcript|chat|note)"` },
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
      const niveaux = (c?.bars_levels || []).map((n) => `      [${n.level}] ${n.description || ""}`).join("\n");
      return `    • ${c?.name || "sans nom"}\n${niveaux}`;
    }).join("\n");

    return [
      `ÉTAPE ${i + 1} — ${s.kind} · ${s.response_format || "text"}${s.sandbox_kind && s.sandbox_kind !== "none" ? ` · sandbox ${s.sandbox_kind}` : ""}`,
      `  Titre : ${s.title || "sans titre"}`,
      s.skill_assessed ? `  Compétence évaluée : ${s.skill_assessed}` : null,
      `  Énoncé : ${(s.prompt || "").replace(/\s+/g, " ").trim()}`,
      s.config?.client_message ? `  Message client : ${String(s.config.client_message).replace(/\s+/g, " ").trim()}` : null,
      s.config?.crm_brief ? `  Situation CRM prévue : ${s.config.crm_brief}` : null,
      s.config?.code_brief ? `  Tâche de code prévue : ${s.config.code_brief}` : null,
      sousDims ? `  Sous-dimensions :\n${sousDims}` : null,
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function buildCritiquePrompt({ title, description, criteria, companyContext, additionalContext, steps }) {
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
LE PARCOURS À RELIRE :
${rendreEtapesPourCritique(steps)}

CE QUI EST BLOQUANT — et rien d'autre :
1. RÔLE TRAHI — le défaut le plus grave, vérifie-le en premier : la mise en situation met en scène la version GÉNÉRIQUE du métier au lieu de ce que dit l'offre. Des clients à qui vendre là où l'offre parle de PARTENAIRES à convaincre de collaborer, du grand public là où elle parle de B2B, des utilisateurs externes là où le support est interne. Relis à qui le candidat s'adresse dans l'offre, puis à qui il s'adresse dans l'étape : si ce n'est pas la même personne, c'est bloquant.
2. SCÉNARIO FADE : la mise en situation pourrait être recopiée telle quelle sur n'importe quelle offre du même intitulé. Aucun détail qui vienne de CE poste, de CETTE entreprise, de CE marché.
3. SCÉNARIO INVRAISEMBLABLE : la situation ne se produit pas dans ce métier, ou pas comme ça. Un professionnel du secteur froncerait les sourcils.
${additionalContext ? `4. MATÉRIAU IGNORÉ : le recruteur a donné une situation vécue, des noms de produits, une objection dans ses mots — et rien de tout cela n'apparaît dans le parcours. Il reconnaîtra son métier ou il ne le reconnaîtra pas.\n` : `4. ÉNONCÉ CREUX : la tâche est posée si vaguement que le candidat ne sait pas ce qu'on attend de lui.\n`}5. GRILLE INDISTINCTE : les niveaux 3 et 5 d'une sous-dimension décrivent la même chose en d'autres mots, ou restent si vagues ("bonne qualité", "réponse adéquate") qu'ils ne permettent de trancher aucun cas réel.
6. QUESTION QUI NE PROUVE RIEN : la réponse est devinable, ou récite une définition, sans rien montrer de ce que le candidat sait FAIRE.

CE QUI N'EST PAS BLOQUANT : une tournure perfectible, une longueur, une préférence de ton, un choix de format discutable, une orthographe. Ne les signale pas.

RÈGLES DE JUGEMENT — lis-les avant de répondre :
- Un parcours correct est le cas NORMAL. Si rien n'est bloquant, dis-le : "publiable", liste vide. Ne cherche pas un défaut pour en trouver un — faire réécrire une étape correcte est un dommage, pas une amélioration.
- Signale AU PLUS ${CRITIQUE_MAX_REECRITURES} étapes. Si tu en vois plus, garde les plus graves : celles qu'un candidat remarquerait.
- Pour CHAQUE problème, "extrait_fautif" doit être un passage RECOPIÉ MOT POUR MOT depuis l'étape (énoncé, titre, ou description d'un niveau). Ne le traduis pas, ne le reformule pas, ne l'abrège pas : il est vérifié automatiquement contre le texte de l'étape, et un extrait introuvable fait écarter ton signalement.
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
  ]);
  return normaliserPourCitation([
    step.title, step.prompt,
    step.config?.client_message, step.config?.crm_brief, step.config?.code_brief,
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
export async function critiquerExperience({ title, description, criteria, companyContext, additionalContext, steps }) {
  const prompt = buildCritiquePrompt({ title, description, criteria, companyContext, additionalContext, steps });

  const response = await streamCompletion({
    system: "Tu relis des évaluations de recrutement avant publication. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
    prompt,
    maxTokens: 4000,
    // Juger demande de peser plusieurs lectures d'un même énoncé : c'est le
    // genre de tâche pour laquelle cette passe existe.
    reflexion: true,
    temperature: 0.3,
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
    targets_skills: nouvelle.targets_skills || ancienne.targets_skills,
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
async function relireEtCorriger({ title, description, criteria, companyContext, additionalContext, steps, locale, uiLocale, onEvent }) {
  const usages = [];
  onEvent?.({ kind: "critique_start" });

  const { problemes, usage } = await critiquerExperience({
    title, description, criteria, companyContext, additionalContext, steps,
  });
  if (usage) usages.push(usage);

  if (!problemes.length) {
    onEvent?.({ kind: "critique_ok" });
    return { steps, usages };
  }

  const corrigees = steps.slice();
  for (const pb of problemes) {
    const etape = corrigees[pb.index];
    onEvent?.({ kind: "critique_fix", n: pb.index + 1, label: etape.title || null });

    const fix = await regenererEtapeContenu({
      title, description, criteria, companyContext,
      // Forme attendue par le prompt de régénération : il lit les
      // sous-dimensions sous le nom de colonne `criteria` (celui de la base).
      step: { ...etape, criteria: etape.sub_dimensions || etape.criteria || [] },
      position: pb.index + 1,
      total: corrigees.length,
      autresEtapes: corrigees
        .map((e, i) => ({ position: i + 1, kind: e.kind, title: e.title, skill_assessed: e.skill_assessed }))
        .filter((_, i) => i !== pb.index),
      instruction: pb.consigne,
      locale, uiLocale,
    });

    // L'usage est comptabilisé même quand la réécriture échoue : l'appel a bien
    // été payé, et la page Coûts doit le voir.
    if (fix.usage) usages.push(fix.usage);

    // Réécriture ratée : on garde l'étape d'origine. Une passe de qualité qui
    // dégrade le résultat serait pire que pas de passe du tout.
    if (!fix.success) {
      console.error("critique — réécriture échouée:", fix.error);
      continue;
    }
    corrigees[pb.index] = fusionnerEtapeReecrite(etape, fix.step);
  }

  return { steps: corrigees, usages };
}

// ─── Génération pure (appelable hors DB pour tests/démo) ──────────────────────
export async function generateExperienceContent({ title, description, criteria, companyContext, additionalContext, locale, uiLocale, onEvent }) {
  const prompt = buildExperienceGenerationPrompt({ title, description, criteria: criteria || {}, companyContext, additionalContext, locale, uiLocale });

  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) onEvent?.({ kind: "retry" });
    const scan = onEvent ? makeExperienceScanner(onEvent) : null;
    // La réflexion se voit dans le feed : sans cette ligne, le recruteur regarde
    // un curseur immobile pendant les dizaines de secondes où le modèle répartit
    // les compétences — et le feed a justement pour raison d'être de montrer le
    // travail réel plutôt qu'une barre de progression fictive.
    if (REFLEXION_ACTIVE) onEvent?.({ kind: "reflexion" });
    const response = await streamCompletion({
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // 24000 : c'était 8000, déjà relevé une fois parce qu'une expérience
      // complète (3-6 étapes + grilles BARS avec exemples) se faisait tronquer.
      // La réflexion se sert dans le MÊME budget, et le banc l'a montré sans
      // douceur : à 16000, effort par défaut, les DEUX tentatives sont sorties
      // tronquées et la génération était perdue. Le plafond monte, et l'effort
      // est borné plus haut (EFFORT_REFLEXION) — les deux ensemble, parce que
      // relever le plafond seul ne fait que payer plus longtemps.
      // On est en streaming : un plafond haut ne coûte que ce qui sort.
      maxTokens: 24000,
      temperature: 0.4,
      reflexion: true,
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
        // 2e passe : les steps "crm" n'ont qu'un brief d'une phrase ; on génère
        // maintenant leur scénario complet (sources, champs, piège).
        onEvent?.({
          kind: "design_done",
          nbEtapes: (parsed.steps || []).length,
          minutes: parsed.estimated_minutes || null,
        });

        const extraUsages = [];

        // ── 2e regard, AVANT les passes CRM/code ────────────────────────────
        // Enveloppé : une critique qui échoue laisse passer le parcours tel
        // quel. C'est un supplément de qualité, jamais un point de panne.
        if (CRITIQUE_ACTIVE && (parsed.steps || []).length) {
          try {
            const relu = await relireEtCorriger({
              title, description, criteria: criteria || {}, companyContext, additionalContext,
              steps: parsed.steps, locale, uiLocale, onEvent,
            });
            parsed.steps = relu.steps;
            extraUsages.push(...relu.usages);
          } catch (e) {
            console.error("relireEtCorriger failed:", e.message);
          }
        }

        for (const s of parsed.steps || []) {
          // Sandbox code : 2e passe elle aussi, pour la même raison que le CRM.
          if (s.sandbox_kind === "code") {
            onEvent?.({ kind: "code_start", label: s.title || null });
            const exercice = await generateCodeExercise({ title, description, criteria, companyContext, step: s, locale, onEvent });
            if (!exercice.success) {
              // Pas d'exercice exécutable = pas de sandbox code. L'étape retombe
              // en tâche texte plutôt que d'afficher un éditeur sans tests.
              console.error("generateCodeExercise failed:", exercice.error);
              s.sandbox_kind = "none";
              s.response_format = "text";
              continue;
            }
            extraUsages.push(exercice.usage);
            s.response_format = "code";
            const { step_prompt, ...codeConfig } = exercice.code;
            // L'énoncé de la 1re passe ne connaissait ni le format d'entrée ni
            // celui de sortie : celui-ci les spécifie, il fait donc foi.
            if (step_prompt) s.prompt = step_prompt;
            s.config = { ...(s.config || {}), code: codeConfig };
            delete s.config.code_brief;
            continue;
          }
          if (s.sandbox_kind !== "crm") continue;
          onEvent?.({ kind: "crm_start", label: s.title || null });
          const scenario = await generateCrmScenario({ title, description, criteria, companyContext, step: s, locale, onEvent });
          if (!scenario.success) {
            // Pas de scénario = pas de sandbox : l'étape retombe en tâche texte
            // simple plutôt que d'exposer une fiche vide au candidat.
            console.error("generateCrmScenario failed:", scenario.error);
            s.sandbox_kind = "none";
            continue;
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
          // La fiche CRM est structurée sous une compétence fixe : c'est elle qui
          // regroupe à la fois la correction déterministe des champs factuels et
          // la sous-dimension "Croisement des sources" ci-dessous (décision D).
          s.skill_assessed = crmSkillName(uiLocale);
          // La détection se fait sur les trois langues : en néerlandais le
          // modèle écrit "bronnen", pas "sources", et le critère serait ajouté
          // en double.
          const hasCrossCheck = (s.sub_dimensions || []).some((c) =>
            /crois|source|cross.?check|bronn/i.test(c.name || "")
          );
          if (!hasCrossCheck) {
            const critere = CRM_CROSS_CHECK_CRITERION[coerceUiLocale(uiLocale)];
            s.sub_dimensions = [...(s.sub_dimensions || []), critere];
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
        generated_from: { criteria: job.extracted_criteria || {}, company_ai_context: profile?.company_ai_context || {} },
        generation_usage: gen.usage,
      })
      .select()
      .single();
    if (expErr) throw expErr;

    // Insère les steps (le format de réponse est bien une colonne par step)
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
      config: { ...(s.config || {}), targets_skills: s.targets_skills || [] },
    }));
    if (rows.length > 0) {
      const { error: stepsErr } = await supabase.from("experience_steps").insert(rows);
      if (stepsErr) throw stepsErr;
    }

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
function buildStepRegenerationPrompt({ title, description, criteria, companyContext, step, position, total, autresEtapes, instruction, locale, uiLocale }) {
  const hard = (criteria.hard_skills || []).map((sk) => `- ${sk.name}${sk.priority ? ` (${sk.priority})` : ""}`).join("\n");
  const soft = (criteria.soft_skills || []).map((sk) => `- ${sk.name}`).join("\n");
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
    configAffichee.crm = "<scénario CRM complet déjà généré (sources, champs, incohérence volontaire) — non reproduit ici>";
  }

  const etapeActuelle = JSON.stringify({
    kind: step.kind,
    title: step.title,
    prompt: step.prompt,
    response_format: step.response_format,
    sandbox_kind: step.sandbox_kind,
    ai_assistant_allowed: step.ai_assistant_allowed,
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

COMPÉTENCES TECHNIQUES À MESURER :
${hard || "Non précisées"}

SAVOIR-ÊTRE À MESURER :
${soft || "Non précisés"}

CONTEXTE ENTREPRISE :
${companyBlock}

${REGLE_ANCRAGE_OFFRE}

LES AUTRES ÉTAPES DE L'EXPÉRIENCE (contexte — ne les régénère pas, et évite de faire doublon avec elles) :
${voisines}

ÉTAPE À RÉÉCRIRE — numéro ${position} sur ${total}, dans sa version actuelle :
${etapeActuelle}

CONSIGNE DU RECRUTEUR — elle prime sur tout le reste :
${instruction}

COMMENT RÉÉCRIRE :
- Applique la consigne, et RIEN QUE la consigne. Tout ce qu'elle ne demande pas de changer doit être conservé à l'identique : le recruteur a déjà relu cette étape, chaque modification non demandée est une régression pour lui.
- Si la consigne ne porte que sur l'énoncé, ne retouche ni la compétence évaluée ni les sous-dimensions. Si elle change la nature de l'exercice, alors la compétence et les sous-dimensions doivent suivre.
- Tu peux changer "kind", "response_format" et "sandbox_kind" si la consigne l'implique — jamais de ta propre initiative.
- L'étape garde sa place dans le parcours : tu ne la déplaces pas.

RÈGLES DE CONCEPTION D'UNE ÉTAPE — identiques à celles de la génération complète, dont la numérotation est reprise telle quelle :
${REGLES_ETAPE}

${REGLES_QCM}

CAS PARTICULIER DU SANDBOX "crm" :
- Si l'étape est déjà en sandbox "crm", son scénario détaillé (sources, champs, incohérence volontaire) EXISTE DÉJÀ et n'est pas reproduit ci-dessus. Laisse "config" vide : il sera conservé tel quel.
- Mets "regenerate_crm_scenario": true UNIQUEMENT si la consigne impose de refaire ce scénario (changer la situation mise en scène, les sources, les champs de la fiche). C'est un second appel au modèle : ne le demande pas pour une simple retouche d'énoncé.
- Si tu fais PASSER l'étape en sandbox "crm" alors qu'elle ne l'était pas, mets "config": { "crm_brief": "…une phrase…" } et "regenerate_crm_scenario": true.

Réponds UNIQUEMENT avec un JSON valide décrivant CETTE SEULE étape, sans texte avant ni après :
{
  "summary": "Une phrase, à la 1re personne, disant au recruteur ce que tu as changé.",
  "regenerate_crm_scenario": false,
${SCHEMA_STEP_CHAMPS}
}
Pour "classic_qcm", mets dans "config": { "options": ["A","B","C","D"], "correct_index": 0 } — "skill_assessed" et "sub_dimensions" restent vides ([] et "").`;
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
async function regenererEtapeContenu({ title, description, criteria, companyContext, step, position, total, autresEtapes, instruction, locale, uiLocale }) {
  const prompt = buildStepRegenerationPrompt({
    title, description, criteria: criteria || {}, companyContext,
    step, position, total, autresEtapes,
    instruction: String(instruction || "").slice(0, 2000),
    locale, uiLocale,
  });

  let usage = null;
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    const response = await streamCompletion({
      system: "Tu es un concepteur d'évaluations par compétences. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      prompt,
      // 4000 : une seule étape avec ses grilles BARS détaillées, là où la
      // génération complète en demande 16000 pour trois à six étapes.
      maxTokens: 4000,
      temperature: 0.4,
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
 * Volontairement SANS versionnage : c'est une édition, au même titre que celle
 * de l'écran de relecture. Le recruteur qui corrige une tournure n'attend pas
 * une v3 de son parcours, et les runs candidat déjà commencés restent sur la
 * même expérience — avec l'avertissement `locked_at` déjà affiché à l'écran.
 *
 * @param {string} stepId
 * @param {string} instruction consigne du recruteur, telle que le chat l'a comprise
 * @returns {Promise<{success: boolean, step?: object, position?: number, resume?: string, error?: string}>}
 */
export async function runStepRegeneration(stepId, instruction) {
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
      .select("*, experiences!inner(id, job_id, jobs!inner(id, user_id, title, description, extracted_criteria, experience_locale))")
      .eq("id", stepId)
      .single();
    const job = step?.experiences?.jobs;
    if (!step || !job || job.user_id !== user.id) return { success: false, error: "Accès refusé" };

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
    });
    let usage = regen.usage || null;
    if (!regen.success) return { success: false, error: regen.error };
    const nouveau = regen.step;

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
      targets_skills: nouveau.targets_skills || step.config?.targets_skills || [],
    };

    // ── Sandbox CRM : la 2e passe n'est repayée que si elle est demandée ──────
    if (nouveau.sandbox_kind === "crm") {
      const crmExistant = step.config?.crm || null;
      const refaire = nouveau.regenerate_crm_scenario === true || !crmExistant;

      if (!refaire) {
        config.crm = crmExistant;
      } else {
        const scenario = await generateCrmScenario({
          title: job.title,
          description: job.description,
          criteria: job.extracted_criteria || {},
          companyContext,
          step: { ...nouveau, config: nouveau.config || {} },
          // `locale` manquait ici, et le défaut ne se voyait pas depuis le
          // français : un scénario CRM refait sur une expérience néerlandaise
          // repartait avec des sources en français, au milieu d'un parcours qui,
          // lui, était bien en néerlandais.
          locale: coerceExperienceLocale(job.experience_locale),
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
      // Le repli ci-dessus a pu ramener l'étape à "none" alors que la fusion y
      // avait déjà reversé l'ancien scénario : un config.crm sans sandbox crm
      // n'est lu par personne, mais il ferait mentir la relecture.
      if (nouveau.sandbox_kind !== "crm") delete config.crm;

      if (nouveau.sandbox_kind === "crm") {
        nouveau.response_format = "text";
        nouveau.skill_assessed = crmSkillName(uiLocale);
        const dims = nouveau.sub_dimensions || [];
        if (!dims.some((c) => /crois|source|cross.?check|bronn/i.test(c?.name || ""))) {
          nouveau.sub_dimensions = [...dims, CRM_CROSS_CHECK_CRITERION[coerceUiLocale(uiLocale)]];
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
      // Partout ailleurs, une valeur absente veut dire « je n'y touche pas » :
      // on garde l'existante plutôt que d'effacer une grille BARS que le
      // recruteur a relue parce que la consigne ne portait que sur l'énoncé.
      skill_assessed: nouveau.kind === "classic_qcm"
        ? null
        : (nouveau.skill_assessed || step.skill_assessed || null),
      // Nom de colonne historique : contient les sous-dimensions (cf. insertion
      // de la génération complète).
      criteria: Array.isArray(nouveau.sub_dimensions)
        ? nouveau.sub_dimensions
        : (Array.isArray(nouveau.criteria) ? nouveau.criteria : (step.criteria || [])),
      config,
      updated_at: new Date().toISOString(),
    };

    const { data: stepMaj, error: majErr } = await supabase
      .from("experience_steps").update(maj).eq("id", step.id).select().single();
    if (majErr) throw majErr;

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
    };
  } catch (err) {
    console.error("runStepRegeneration error:", err);
    return { success: false, error: err.message };
  }
}
