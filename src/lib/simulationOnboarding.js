// La génération d'une simulation d'ONBOARDING — module SERVEUR, sans
// "use server" (16/11/2026, docs/PLAN.md « Création unique »).
//
// ── Ce qui la distingue du recrutement ─────────────────────────────────────
// • UNE conversation, UN canal (décision de Remco) : chat, e-mail, appel vidéo
//   (la personne est filmée, le personnage répond à la voix) ou appel
//   téléphonique. Une seule étape, donc, là où le recrutement en enchaîne
//   plusieurs.
// • Elle sert à APPRENDRE autant qu'à vérifier : la personne doit sortir de
//   l'exercice en connaissant mieux l'entreprise, son offre, ses acheteurs et
//   leurs objections ; le manager, lui, doit pouvoir juger si elle est prête à
//   prendre de vrais clients. D'où deux différences de fond :
//     – un checkpoint PEUT exiger un fait de la base de connaissances (le
//       tarif, la procédure) — l'apprendre fait partie de l'exercice ;
//     – la simulation rend « À retenir » : les points que la personne lit
//       après son essai, avec son retour.
// • Le SCÉNARIO vient de l'entreprise : c'est l'agent de conception
//   (lib/agentOnboarding.js) qui le lui fait raconter — comment ce genre de
//   conversation arrive chez elle, ce que le client objecte, ce qu'il faut
//   savoir. Ce brief (`modules.brief`) prime sur tout le reste.
// • Le PERSONNAGE est choisi (ou créé) avant : la génération écrit la situation
//   POUR lui, et son identité est reprise telle quelle.
//
// Aucun crédit n'est débité (décision du 10/11/2026).

import anthropic from "@/lib/anthropic";
import { blocEntreprise } from "@/lib/knowledge";
import { listerCompetences, blocCompetencesPrompt } from "@/lib/competences";
import { REGLES_CHECKPOINTS, normaliserEtape } from "@/lib/experienceGeneration";
import { normaliserPersona, identitePersona, appliquerIdentite } from "@/lib/persona";
import { consigneVoix } from "@/lib/constants/voix";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { coerceExperienceLocale, coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";
import { CANAUX, CANAL_PAR_DEFAUT, formeDuCanal, normaliserBrief } from "@/lib/simulationCanal";

const MODELE = "claude-opus-5-5";

const DIFFICULTES = {
  easy: "facile : un interlocuteur plutôt coopératif, une seule vraie difficulté",
  medium: "moyenne : un interlocuteur exigeant, deux ou trois difficultés réalistes",
  hard: "difficile : un interlocuteur pressé ou sceptique, des objections qui s'enchaînent",
};

const liste = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => String(x || "").trim()).filter(Boolean);

function blocBrief(brief) {
  const b = normaliserBrief(brief);
  const puces = (items) => items.map((x) => `- ${x}`).join("\n");
  return [
    b.scenario && `LE SCÉNARIO, TEL QU'IL SE VIT DANS L'ENTREPRISE :\n${b.scenario}`,
    b.objectif && `CE QUE LA PERSONNE DOIT OBTENIR :\n${b.objectif}`,
    b.objections.length && `LES OBJECTIONS QUE LE CLIENT DOIT SOULEVER :\n${puces(b.objections)}`,
    b.a_savoir.length && `CE QUE LA PERSONNE DOIT SAVOIR ET UTILISER (produit, offre, process) :\n${puces(b.a_savoir)}`,
    b.reussite.length && `À QUOI LE MANAGER RECONNAÎT UNE CONVERSATION RÉUSSIE :\n${puces(b.reussite)}`,
    b.notes && `AUTRES PRÉCISIONS DU MANAGER :\n${b.notes}`,
  ].filter(Boolean).join("\n\n");
}

/**
 * Le prompt de génération.
 * @param {{ module: object, brief: object, identite: object|null, criteres: object, companyContext: object, uiLocale: string }} p
 */
export function promptSimulationOnboarding({ module, brief, identite, criteres, companyContext, uiLocale }) {
  const canal = CANAUX.includes(module.channel) ? module.channel : CANAL_PAR_DEFAUT;
  const { mode } = formeDuCanal(canal);
  const email = canal === "email";
  const langue = coerceExperienceLocale(module.locale);
  const nomScene = LOCALE_NAMES_FR[langue];
  const nomManager = LOCALE_NAMES_FR[coerceUiLocale(uiLocale)];
  const competences = listerCompetences(criteres);
  const descriptionCanal = {
    chat: "un échange ÉCRIT dans une messagerie (chat client, messagerie professionnelle) : le personnage répond par écrit",
    call: "un APPEL VIDÉO : la personne parle et elle est filmée ; le personnage, lui, répond à la voix",
    phone: "un APPEL TÉLÉPHONIQUE, voix seule : la personne parle, le personnage répond à la voix",
    email: "un E-MAIL : la personne écrit UN e-mail (une réponse ou un premier message) au personnage",
  }[canal];

  const champsScene = email
    ? `"to": "Prénom Nom, fonction, entreprise — le destinataire", "subject": "l'objet imposé (« Re : … » pour une réponse), ou chaîne vide si c'est à la personne de l'écrire", "context": "ce que la personne sait en ouvrant sa messagerie : qui est le destinataire, ce qui s'est passé avant, pourquoi elle lui écrit — et, si c'est une réponse, le message reçu, cité en entier"`
    : `"context": "…", "opening_message": "…", "mood": "…", "goals": "…", "hidden_info": ["…"], "objections": ["…"], "red_lines": ["…"], "end_condition": "…", "success_signals": ["…"], "max_turns": 10`;
  const champsIdentite = identite
    ? ""
    : `,
    "name": "Prénom Nom", "role": "Fonction", "company": "Entreprise", "background": "…", "personality": "…", "language": "${langue}", "accent": "BE", "gender": "f"`;

  return `DEUX LECTEURS, DEUX LANGUES — CONSIGNE PRIORITAIRE :
1. Ce que voit ou entend LA PERSONNE QUI S'ENTRAÎNE est en ${nomScene} : "title", "step_prompt", "a_retenir", et dans "scene" : "context", "opening_message", "to", "subject"${identite ? "" : ", \"name\", \"role\", \"company\""}. Registre professionnel naturel (vouvoiement en français, « u » en néerlandais), jamais une traduction mot à mot.
2. Ce que lit LE MANAGER SEUL est en ${nomManager} : "skill_assessed", le "name" des sous-dimensions, la "description" des checkpoints, et dans "scene" : "mood", "goals", "hidden_info", "objections", "red_lines", "end_condition", "success_signals"${identite ? "" : ", \"background\", \"personality\""}. L'IA qui jouera le personnage les restitue d'elle-même en ${nomScene}.
Les clés du JSON restent en anglais.

Tu conçois une SIMULATION D'ONBOARDING. La personne qui la joue vient d'être embauchée (ou se forme) dans l'entreprise ci-dessous. Ce n'est PAS un recrutement : l'exercice doit lui APPRENDRE l'entreprise — ce qu'elle vend, à qui, comment, les objections de ses clients et la bonne manière d'y répondre — et permettre à son manager de juger si elle est prête à prendre de vrais clients. Elle pourra recommencer autant de fois qu'il le faut.

LA SIMULATION EST UNE SEULE CONVERSATION : ${descriptionCanal}. Pas d'autre étape, pas de question de cours, pas de QCM.

RÔLE DE LA PERSONNE QUI S'ENTRAÎNE : ${module.target_role || "non précisé"}
TITRE DE TRAVAIL : ${module.title || "—"}
DIFFICULTÉ : ${DIFFICULTES[module.difficulty] || DIFFICULTES.medium}

CONTEXTE ENTREPRISE (faits à respecter — ne rien inventer qui les contredise) :
${blocEntreprise(companyContext)}

${blocBrief(brief) || `LA SITUATION À TRAVAILLER :\n${module.situation || "—"}${module.objective ? `\nOBJECTIF : ${module.objective}` : ""}`}

${identite
    ? `LE PERSONNAGE — IMPOSÉ, il vient de la bibliothèque de l'entreprise. Ne change ni son nom, ni sa fonction, ni son entreprise, ni son caractère : écris la situation POUR lui.
${JSON.stringify({ name: identite.name, role: identite.role, company: identite.company, background: identite.background, personality: identite.personality, language: identite.language })}`
    : `LE PERSONNAGE — à créer : un vrai interlocuteur de ce métier, client plausible de l'entreprise (jamais l'entreprise elle-même). "language" : ${langue}. "accent" : son pays en deux lettres (BE, FR, NL, GB, US…). "gender" : "f" ou "m", cohérent avec le prénom.${email ? "" : `\n${consigneVoix()}`}`}

${blocCompetencesPrompt(competences)}

RÈGLES DE CONCEPTION :
1. LE SCÉNARIO DU MANAGER PRIME. Reprends ses mots, ses noms de produits, ses objections TELLES QU'IL LES A DITES, et la façon dont la conversation arrive chez lui. N'invente pas un déroulé générique (« X a vu votre profil LinkedIn… ») qu'il n'a pas décrit. Un scénario qu'on pourrait recopier chez un concurrent est raté.
2. "step_prompt" : 2 à 4 phrases lues avant la conversation — la mission et ce qui est attendu. Rien des informations cachées.
${email
    ? `3. "scene.context" : 3 à 6 phrases, plus le message reçu s'il s'agit d'une réponse. Tout ce dont la personne a besoin pour écrire, rien de ce qu'elle doit trouver elle-même.`
    : `3. "scene.context" : ce que la personne sait en entrant — 2 à 4 phrases : qui est l'interlocuteur, pourquoi cette conversation, ce qu'elle doit obtenir. "opening_message" : la première réplique du personnage s'il ouvre l'échange (1 à 2 phrases${mode === "chat" ? ", écrites" : ", parlées, sans mise en forme"}), chaîne vide si c'est à la personne de parler en premier.
4. Le personnage, dans CETTE conversation : "mood" (son humeur au début), "goals" (ce qu'il veut, qui n'est pas forcément ce que veut la personne), "hidden_info" (2 à 4 faits décisifs qu'il ne livre que si la personne pose la bonne question — chacun dit quelle question le fait sortir), "objections" (celles du manager d'abord, 2 à 5 en tout, crédibles, qui tombent face à une vraie réponse), "red_lines" (1 à 3 choses qu'il n'accepte pas), "success_signals" (3 à 5 comportements d'une conversation réussie), "max_turns" (8 à 14), "end_condition" (1 à 2 phrases : quand il accepte la suite et met fin à l'échange — dès que l'objectif du context est atteint ou clairement manqué).`}
5. LA GRILLE — 2 à 3 SOUS-DIMENSIONS observables dans cette conversation, chacune avec "skill_ids" pris dans la liste des compétences ci-dessus (identifiants entre crochets, recopiés tels quels). "skills_tested" : tous les identifiants notés ; "skill_assessed" : le nom de la compétence principale. Chaque must-have est noté par au moins un checkpoint.
${REGLES_CHECKPOINTS}
   EXCEPTION ONBOARDING à la règle e) : un checkpoint PEUT exiger un fait de l'entreprise — un élément de l'offre, un tarif, une procédure — s'il figure dans le contexte entreprise ou dans ce que le manager a dit. Connaître son entreprise fait partie de ce qu'on apprend ici. Ce fait figure alors dans "a_retenir".
6. "a_retenir" : 4 à 7 points que la personne lit APRÈS son essai, avec son retour — ce qu'il fallait savoir et faire dans cette conversation : les faits de l'entreprise à utiliser, la bonne réponse à chaque objection (en une phrase, l'argument, pas un script), les questions qui font avancer. Concrets, tirés du contexte et du brief, jamais génériques.
7. Aucun emoji. Dans les VALEURS du JSON, jamais de guillemet droit " : utilise « … » ou “…”.

Réponds UNIQUEMENT avec un JSON valide :
{
  "title": "titre court de la simulation",
  "step_prompt": "…",
  "skills_tested": ["h:identifiant"],
  "skill_assessed": "…",
  "sub_dimensions": [
    { "name": "…", "skill_ids": ["h:identifiant"], "checkpoints": [ { "description": "…" }, { "description": "…" }, { "description": "…" } ] }
  ],
  "scene": { ${champsScene}${champsIdentite} },
  "a_retenir": ["…"]
}`;
}

/** Le premier objet JSON d'un texte. */
function jsonDe(texte) {
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut < 0 || fin <= debut) throw new Error("aucun JSON dans la réponse");
  return JSON.parse(texte.slice(debut, fin + 1));
}

/**
 * L'étape de la simulation, prête à insérer (forme `lignesEtapes`), à partir
 * de la réponse du modèle.
 */
export function etapeDepuisReponse(brut, { canal, identite, ficheId, competences }) {
  const { sandbox_kind, mode } = formeDuCanal(canal);
  const scene = brut?.scene || {};
  const etape = normaliserEtape({
    kind: "task",
    title: String(brut?.title || "").trim().slice(0, 160),
    prompt: String(brut?.step_prompt || "").trim(),
    response_format: "text",
    sandbox_kind,
    ai_assistant_allowed: false,
    skills_tested: brut?.skills_tested || [],
    skill_assessed: String(brut?.skill_assessed || "").trim(),
    sub_dimensions: brut?.sub_dimensions || [],
  }, competences);

  const aRetenir = liste(brut?.a_retenir).slice(0, 8);
  if (sandbox_kind === "email") {
    const to = String(scene.to || (identite ? [identite.name, [identite.role, identite.company].filter(Boolean).join(", ")].filter(Boolean).join(" — ") : "")).trim();
    etape.config = { to, subject: String(scene.subject || "").trim(), context: String(scene.context || "").trim(), a_retenir: aRetenir };
    if (ficheId) etape.config.persona_id = ficheId;
    return etape;
  }

  let persona = normaliserPersona({ ...scene, name: scene.name || identite?.name, mode });
  if (!persona) return null;
  if (identite) persona = appliquerIdentite(persona, identite);
  persona.mode = mode;
  etape.config = { persona, a_retenir: aRetenir, ...(ficheId ? { persona_id: ficheId } : {}) };
  return etape;
}

/**
 * Génère la conversation d'un module.
 * @param {{ module: object, fiche: {id, data}|null, criteres: object, companyContext: object, uiLocale: string, onEvent?: Function }} p
 * @returns {Promise<{success: boolean, etape?: object, titre?: string, usage?: object, error?: string}>}
 */
export async function genererSimulationOnboarding({ module, fiche, criteres, companyContext, uiLocale, onEvent }) {
  const canal = CANAUX.includes(module.channel) ? module.channel : CANAL_PAR_DEFAUT;
  const identite = fiche ? identitePersona(fiche.data) : null;
  const competences = listerCompetences(criteres);
  const prompt = promptSimulationOnboarding({ module, brief: module.brief, identite, criteres, companyContext, uiLocale });
  let derniere = "";
  const usages = [];
  for (let essai = 1; essai <= 2; essai++) {
    const stream = anthropic.messages.stream({
      model: MODELE,
      max_tokens: 16000,
      thinking: { type: "adaptive", display: "omitted" },
      output_config: { effort: "medium" },
      system: "Tu conçois des simulations de conversations professionnelles pour former des équipes commerciales et support B2B. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après.",
      messages: [{ role: "user", content: prompt }],
    });
    const final = await stream.finalMessage();
    usages.push(computeAiCost(MODELE, final.usage));
    if (final.stop_reason === "max_tokens") { derniere = "réponse tronquée"; continue; }
    try {
      const texte = final.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const brut = jsonDe(texte);
      const etape = etapeDepuisReponse(brut, { canal, identite, ficheId: fiche?.id || null, competences });
      if (!etape || !etape.sub_dimensions.length) { derniere = "simulation inexploitable"; continue; }
      if (etape.config.persona) onEvent?.({ kind: "persona_ready", label: etape.config.persona.name, mode: etape.config.persona.mode });
      return { success: true, etape, titre: etape.title, usage: cumuler(usages) };
    } catch (e) {
      derniere = e.message;
    }
  }
  return { success: false, error: `Génération invalide (${derniere}).`, usage: cumuler(usages) };
}

function cumuler(usages) {
  const l = usages.filter(Boolean);
  if (!l.length) return null;
  return {
    model: l[0].model,
    calls: l.length,
    input_tokens: l.reduce((s, u) => s + (u.input_tokens || 0), 0),
    output_tokens: l.reduce((s, u) => s + (u.output_tokens || 0), 0),
    cost_usd: Number(l.reduce((s, u) => s + (u.cost_usd || 0), 0).toFixed(6)),
  };
}
