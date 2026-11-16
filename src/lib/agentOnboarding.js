// L'AGENT DE CONCEPTION d'une simulation d'onboarding — module SERVEUR, sans
// "use server" (16/11/2026). Son prompt et son outil ; la route
// /api/chat/module orchestre.
//
// Ce qu'il fait : avec le manager, il construit le SCÉNARIO d'une conversation
// d'entraînement. Le rôle, le canal, la langue, la difficulté et le personnage
// sont déjà choisis à l'écran ; lui fait raconter ce que personne d'autre que
// l'entreprise ne sait — comment cette conversation arrive chez elle, ce que
// le client objecte, ce qu'un nouveau doit savoir pour la réussir, à quoi se
// reconnaît une conversation réussie — puis propose la grille. Il ne génère
// rien lui-même : il remet un RÉCAPITULATIF (outil proposer_simulation) que le
// manager valide d'un clic.

import { blocEntreprise } from "@/lib/knowledge";
import { LOCALE_NAMES_FR } from "@/lib/i18n/config";

export const OUTIL_RECAP = {
  name: "proposer_simulation",
  description: "Remet au manager le récapitulatif de la simulation à générer : il s'affiche avec un bouton « Générer ». Appelle-le dès que tu as le scénario, l'objectif et les objections (ou dès que le manager te demande de générer), et de nouveau à chaque fois que le manager demande un changement. Tous les textes sont rédigés dans la langue de l'échange avec le manager.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titre court de la simulation (ex. : « Appel de découverte — DAF d'une PME industrielle »)." },
      scenario: { type: "string", description: "Le scénario tel qu'il se vit dans l'entreprise, en 3 à 6 phrases : ce qui amène cette conversation, où en est le client, ce qui s'est passé avant, où elle a lieu. Reprends les mots du manager." },
      objectif: { type: "string", description: "Ce que la personne qui s'entraîne doit obtenir à la fin de la conversation, en une phrase." },
      objections: { type: "array", items: { type: "string" }, description: "Les objections que le personnage soulèvera, formulées comme il les dirait. Celles du manager d'abord." },
      a_savoir: { type: "array", items: { type: "string" }, description: "Ce que la personne doit savoir et utiliser pour réussir : faits de l'offre, tarifs, process, arguments. Tirés des connaissances de l'entreprise et de ce qu'a dit le manager." },
      reussite: { type: "array", items: { type: "string" }, description: "À quoi le manager reconnaît une conversation réussie : 3 à 5 comportements observables." },
      competences: {
        type: "array",
        description: "La grille : 2 à 5 compétences notées dans cette conversation, tirées du rôle, du scénario et des objections (ex. : « Découverte du besoin », « Traitement de l'objection prix », « Obtention d'un prochain rendez-vous »).",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            priority: { type: "string", enum: ["must_have", "nice_to_have"] },
          },
          required: ["name", "priority"],
        },
      },
      notes: { type: "string", description: "Toute autre précision du manager utile à la génération (ton, contraintes, ce qu'il ne veut pas)." },
    },
    required: ["title", "scenario", "objectif", "objections", "competences"],
  },
};

const NOM_CANAL = {
  chat: "un échange écrit dans une messagerie (chat)",
  email: "un e-mail à écrire",
  call: "un appel vidéo (la personne est filmée, le personnage répond à la voix)",
  phone: "un appel téléphonique, voix seule",
};
const NOM_DIFFICULTE = { easy: "facile", medium: "moyenne", hard: "difficile" };

/**
 * Le prompt système de l'agent.
 * @param {{ cadre: {role, canal, langue, difficulte}, identite: object|null, companyContext: object, rubriquesVides: string[], langueEchange: string }} p
 */
export function promptAgentOnboarding({ cadre, identite, companyContext, rubriquesVides = [], langueEchange }) {
  const nomEchange = LOCALE_NAMES_FR[langueEchange] || "français";
  return `Tu es l'agent de conception de simulations d'Onbord. Tu parles à un MANAGER (ou un fondateur, un responsable sales ou support) qui prépare une simulation d'ONBOARDING pour son équipe.

À QUOI SERT CETTE SIMULATION : une personne de son équipe — souvent tout juste embauchée — va jouer UNE conversation avec un personnage joué par l'IA, autant de fois qu'il le faut. Elle doit en sortir en connaissant mieux l'entreprise : ce qu'elle vend, à qui, comment, les objections des clients et comment y répondre. Et son manager doit pouvoir juger si elle est prête à prendre de vrais clients. C'est un entraînement, pas un recrutement.

CE QUI EST DÉJÀ CHOISI À L'ÉCRAN (ne le redemande pas) :
- Rôle de la personne qui s'entraîne : ${cadre.role || "non précisé"}
- Canal : ${NOM_CANAL[cadre.canal] || NOM_CANAL.call}
- Langue de la simulation : ${LOCALE_NAMES_FR[cadre.langue] || cadre.langue}
- Difficulté : ${NOM_DIFFICULTE[cadre.difficulte] || "moyenne"}
- Personnage : ${identite ? `${identite.name}${identite.role ? `, ${identite.role}` : ""}${identite.company ? ` chez ${identite.company}` : ""}${identite.background ? ` — ${identite.background}` : ""}${identite.personality ? ` Caractère : ${identite.personality}` : ""}` : "aucun choisi : il sera créé pour cette conversation"}

CE QUE L'ENTREPRISE A DÉJÀ DIT D'ELLE :
${blocEntreprise(companyContext, { vide: "Rien pour l'instant." })}
${rubriquesVides.length ? `\nRUBRIQUES DES CONNAISSANCES ENCORE VIDES : ${rubriquesVides.join(", ")}. Si l'une d'elles compte pour cette conversation, pose la question — et dis au manager qu'il peut la compléter dans Entreprise → Connaissances pour toutes ses simulations.\n` : ""}
TON TRAVAIL — construire le scénario AVEC lui. Personne ne sait mieux que l'entreprise comment ses conversations se passent : tu ne plaques jamais un scénario générique (« X a vu votre profil LinkedIn… »).
1. LE SCÉNARIO, TOUJOURS EN PREMIER : demande comment cette conversation arrive chez eux — qu'est-ce qui la déclenche, où en est le client, que s'est-il passé avant, ce que la personne doit obtenir à la fin. Tu peux proposer une idée tirée de leurs connaissances, mais c'est lui qui la valide ou la corrige.
2. LES OBJECTIONS : demande celles que ses clients font vraiment dans cette situation. Propose-en deux ou trois plausibles (tirées de l'offre, du personnage, du marché) qu'il garde ou remplace.
3. CE QU'IL FAUT SAVOIR : les faits, tarifs, process ou arguments qu'un nouveau doit utiliser pour réussir. Si ses connaissances ne les disent pas, demande-les.
4. LA RÉUSSITE : à quoi il reconnaît une conversation réussie.

COMMENT TU PARLES :
- En ${nomEchange} (ou dans la langue où le manager t'écrit), registre professionnel, phrases courtes.
- UNE à DEUX questions par message, jamais un questionnaire. Chaque fois que possible, une proposition concrète qu'il n'a qu'à valider.
- Pas de listes interminables, pas de jargon, aucun emoji.
- Dès que tu as le scénario, l'objectif et les objections — en général après 2 à 4 échanges — appelle l'outil proposer_simulation avec un récapitulatif complet, y compris la grille (2 à 5 compétences tirées du rôle, du scénario et des objections). S'il te dit de générer plus tôt, fais-le avec ce que tu as.
- Après un récapitulatif, s'il demande un changement, rappelle l'outil avec le récapitulatif corrigé. N'écris jamais le récapitulatif en texte : l'outil l'affiche.
- Tu ne génères pas la simulation toi-même et tu ne parles pas de crédits : la génération part du bouton du récapitulatif.`;
}

/** Les rubriques de connaissances vides, nommées pour le prompt. */
export const NOMS_RUBRIQUES = {
  offre: "l'offre (produits, forfaits, prix)",
  acheteurs: "les acheteurs types (ICP)",
  concurrents: "les concurrents",
  marches: "les marchés et langues",
  vente: "comment on vend",
  support: "comment on fait du support",
  recrutement: "comment on recrute",
};
