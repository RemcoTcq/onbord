import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import {
  chargerFil, enregistrerFil, bornerFil, MAX_MESSAGES_MODELE,
  chargerExperienceCourante, construireEtatExperience,
} from '@/lib/experienceChat';
import { consigneLangueConversation, rappelLangueConversation } from '@/lib/i18n/prompt';
import { langueDeConversation } from '@/lib/i18n/detection';
import { UI_LOCALES, coerceUiLocale } from '@/lib/i18n/config';

// Chat-first de conception d'expérience : le chat prend l'offre + le contexte
// entreprise en entrée, pose les questions nécessaires pour affiner, puis
// déclenche generateExperience (mises en situation, pas de tests piochés dans
// une bibliothèque). Plus de recherche de catalogue.
//
// Il fait ensuite le second métier, celui qui manquait : AJUSTER une expérience
// déjà générée, étape par étape. Deux choses le rendent possible —
//   - le fil de conversation est PERSISTÉ (table experience_chats, migration
//     025) : rouvrir le panneau ne remet plus le chat à zéro ;
//   - l'état réel des étapes est relu EN BASE à chaque tour et réinjecté dans le
//     prompt système, ce qui le rend juste même après une retouche manuelle du
//     recruteur, et même sur un fil vide.
// Sans le second, le premier ne suffirait pas : un chat qui ne connaît
// l'expérience que par ses propres souvenirs propose de corriger des énoncés
// qui n'existent plus.
const GENERATE_TOOL = {
  name: "generate_experience",
  description: "Génère l'expérience de présélection COMPLÈTE pour l'offre, une fois que tu as clarifié le besoin avec le recruteur — au moins un échange, jamais zéro. N'appelle cet outil qu'après avoir posé au moins une question utile et obtenu une réponse qui confirme le métier réel et le type de client/interlocuteur. Ne génère pas à l'aveugle après un seul message vague, et ne génère jamais sans avoir échangé avec le recruteur, même si l'offre semble déjà complète. ATTENTION : si une expérience existe déjà, cet outil en crée une NOUVELLE VERSION et remplace toutes les étapes que le recruteur a pu relire et corriger à la main. Ne l'appelle alors que si le recruteur demande explicitement de tout refaire ; pour toute demande qui ne vise qu'une ou deux étapes, utilise regenerate_step.",
  input_schema: {
    type: "object",
    properties: {
      brief: {
        type: "string",
        description: "Synthèse en français des précisions recueillies auprès du recruteur (ton, type de client typique, spécificités du poste, contraintes) qui doivent guider la génération. 3 à 8 phrases.",
      },
    },
    required: ["brief"],
  },
};

// Le geste courant, et de loin : le recruteur relit son parcours et fait
// retoucher une étape. Il ne devient possible que parce que le prompt système
// porte la liste numérotée des étapes — sans elle, aucun numéro à viser.
const REGENERATE_STEP_TOOL = {
  name: "regenerate_step",
  description: "Réécrit UNE SEULE étape de l'expérience déjà générée, en place, à partir d'une consigne. C'est l'outil à utiliser pour toute demande d'ajustement qui ne vise pas la refonte totale du parcours : changer un énoncé, durcir ou adoucir le ton, changer le format de réponse, remplacer la mise en situation, revoir les sous-dimensions évaluées. Il ne crée pas de nouvelle version et ne touche à aucune autre étape — les étapes que le recruteur a déjà validées restent intactes. Appelle-le une fois par étape à modifier ; tu peux enchaîner plusieurs appels si le recruteur en vise plusieurs. Si tu n'es pas certain de l'étape visée, demande-lui avant d'appeler l'outil : la réécriture écrase l'étape.",
  input_schema: {
    type: "object",
    properties: {
      step_number: {
        type: "integer",
        description: "Numéro de l'étape à réécrire, tel qu'il apparaît dans ÉTAT ACTUEL (1 = première étape du parcours).",
      },
      instruction: {
        type: "string",
        description: "Consigne de réécriture en français, rédigée pour un concepteur qui ne voit PAS votre conversation. Dis ce qui doit changer ET ce qui doit être conservé. Reprends les mots du recruteur quand ils sont précis, et ajoute le contexte utile de l'échange. 2 à 6 phrases.",
      },
    },
    required: ["step_number", "instruction"],
  },
};

function buildSystemPrompt({ title, skillsStr, companyContext, blocEtat, experienceExiste, langue }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
    ctx.domain && `Modèle : ${ctx.domain}`,
  ].filter(Boolean).join(" | ") || "Aucun contexte entreprise renseigné.";

  // Deux déroulés exclusifs. On n'envoie QUE celui qui s'applique : donner les
  // deux, c'est laisser le modèle choisir de « concevoir » un parcours qui
  // existe déjà — l'erreur exacte qu'on corrige ici.
  const deroule = experienceExiste ? `DÉROULÉ — AJUSTEMENT (l'expérience existe déjà, voir ÉTAT ACTUEL) :
1. Tu as déjà généré cette expérience. Ne fais jamais comme si tu la découvrais, ne redemande pas le poste, et ne propose pas de la concevoir : elle est là, tu la connais, elle est décrite ci-dessus.
2. Si le recruteur ouvre la conversation sans demande précise, dis-lui en une phrase où en est le parcours (nombre d'étapes, statut) et demande-lui ce qu'il veut ajuster.
3. Presque toutes les demandes ne portent que sur UNE étape. Pour celles-là, appelle \`regenerate_step\` avec son numéro et une consigne de réécriture. Une étape à la fois, un appel par étape ; tu peux en enchaîner plusieurs.
4. Si l'étape visée est ambiguë (le recruteur dit « la question sur le client » et deux étapes peuvent correspondre), demande laquelle AVANT d'appeler l'outil. La réécriture écrase l'étape, elle ne se rattrape pas.
5. N'appelle \`generate_experience\` QUE si le recruteur demande explicitement de repartir de zéro. Préviens-le alors que cela crée une nouvelle version et remplace toutes les étapes qu'il a relues.
6. Une demande qui ne concerne pas le contenu des étapes (l'ordre, une suppression, une note à la virgule près) se fait plus vite à la main : renvoie-le vers l'édition directe de l'écran de relecture plutôt que de régénérer.
7. Après chaque réécriture, dis en une phrase ce qui a changé, puis demande si autre chose doit bouger.` : `DÉROULÉ — CONCEPTION (rien n'a encore été généré) :
1. Tu connais déjà l'offre et le contexte ci-dessus : ne redemande pas le poste ou les compétences générales.
2. Avant de poser une question, identifie ce que l'offre et le contexte entreprise disent déjà, et ce qui reste réellement flou ou manquant pour CE poste précis. Ne pose jamais une question dont la réponse est déjà déductible de ce que tu as. Priorise ce qui changerait concrètement le contenu de l'expérience générée, jamais une question de forme si le fond manque encore.
   Exemples de ce qui compte selon les cas : si le secteur ou le produit de l'entreprise n'est pas clair, creuse ça avant tout le reste. Si le poste touche à la vente ou au support, le type de client typique et une situation difficile fréquente comptent plus que tout le reste. Si l'offre est déjà très détaillée, il se peut qu'une seule question suffise — mais pose-la toujours. Tu ne génères jamais sans avoir posé au moins une question au recruteur, même quand l'offre semble complète.
   Plancher minimum, unique : tu dois avoir une compréhension claire du métier réel et du type de client/interlocuteur avant de pouvoir déclencher la génération — c'est ce qui détermine le fond du scénario, pas sa forme. Le ton peut être déduit par défaut si non précisé : une correction de ton se fait facilement à la relecture, une erreur sur le client ou le métier invalide tout le scénario. La façon de découvrir ce plancher doit s'adapter à ce que tu sais déjà, jamais suivre un script fixe — mais il y a toujours au moins une question à poser.
3. Ne génère PAS à l'aveugle. Après au moins un échange utile qui atteint le plancher minimum, APPELLE l'outil \`generate_experience\` avec une synthèse (brief) des précisions. Tu peux proposer de générer et attendre un accord.
4. Après génération, l'écran de relecture s'ouvre automatiquement. Dis au recruteur qu'il peut relire/éditer chaque étape, ou continuer à te demander des ajustements — tu pourras alors reprendre les étapes une par une, sans tout regénérer.`;

  // La consigne de langue passe EN TÊTE : placée après les huit points du
  // déroulé, elle se fait recouvrir par les exemples français qui la précèdent.
  // Et elle est REPRISE EN QUEUE : entre les deux il y a deux mille caractères
  // de français, et c'est la dernière ligne lue qui pèse le plus au moment de
  // rédiger. Une seule des deux positions ne suffisait pas.
  return `${consigneLangueConversation(langue)}

Tu es le concepteur d'expériences de présélection de Onbord. Tu aides le recruteur à concevoir une expérience courte (5–20 min) de MISES EN SITUATION qui prouvent les compétences — pas un questionnaire théorique, pas un test pioché dans une bibliothèque.

OFFRE : ${title || "Non précisée"}
COMPÉTENCES EXTRAITES : ${skillsStr}
CONTEXTE ENTREPRISE : ${companyBlock}

${blocEtat}

${deroule}

Ton direct et concret, pas de bla-bla. N'utilise JAMAIS de Markdown (pas de **, pas de listes à astérisques) — uniquement du texte brut.

${rappelLangueConversation(langue)}`;
}

export async function POST(req) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Authentification requise." }, { status: 401 });

    const { messages, jobId } = await req.json();
    if (!jobId) return Response.json({ error: "jobId requis." }, { status: 400 });

    // Ownership + contexte offre
    const { data: job } = await supabase
      .from("jobs").select("id, user_id, title, extracted_criteria").eq("id", jobId).single();
    if (!job || job.user_id !== user.id) return Response.json({ error: "Accès refusé à cette offre." }, { status: 403 });

    // Un client qui rouvre le panneau sans avoir chargé le fil (ou après un
    // rechargement à mi-parcours) n'envoie rien : on repart de ce qui est en
    // base plutôt que d'ouvrir une conversation amnésique.
    const filClient = Array.isArray(messages) ? messages : [];
    const fil = filClient.length ? filClient : await chargerFil(supabase, jobId);
    if (!fil.length) return Response.json({ error: "Aucun message à traiter." }, { status: 400 });

    const { data: profile } = await supabase
      .from("users").select("company_ai_context, ui_locale").eq("id", user.id).single();

    const criteria = job.extracted_criteria || {};
    const allSkills = [];
    for (const key of ["hard_skills", "soft_skills", "skills"]) {
      if (Array.isArray(criteria[key])) allSkills.push(...criteria[key].map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean));
    }
    const skillsStr = allSkills.length ? allSkills.join(", ") : "Aucune compétence extraite.";

    // Relu à CHAQUE tour, jamais mémorisé dans le fil : c'est ce qui garde le
    // chat juste quand le recruteur édite une étape à la main entre deux messages.
    const { experience, steps } = await chargerExperienceCourante(supabase, jobId);
    const etat = construireEtatExperience(experience, steps);

    // Le chat de conception s'adresse au RECRUTEUR, pas au candidat : il suit
    // la langue dans laquelle CELUI-CI écrit, pas celle de l'offre. Un recruteur
    // anglophone conçoit en anglais une expérience qui sortira en néerlandais —
    // la langue du parcours généré, elle, ne se décide pas ici : elle est lue en
    // base (jobs.experience_locale) au moment de générer.
    //
    // La détection ne regarde QUE les messages humains du fil : les tool_result
    // que le client y insère sont rédigés en français, et les prendre pour la
    // parole du recruteur ramenait tout l'échange au français dès la première
    // génération. Le fil complet est passé, pas seulement son extrémité : la
    // langue de l'échange ne doit pas changer parce qu'on a rogné le contexte.
    //
    // Deux langues candidates seulement, celles de l'interface : le recruteur
    // conçoit en français ou en anglais. Un message néerlandais ne trompe pas la
    // détection pour autant, il ne tranche simplement pas — et on retombe sur sa
    // langue d'interface.
    const langue = langueDeConversation(fil, {
      langues: UI_LOCALES,
      defaut: coerceUiLocale(profile?.ui_locale),
    });

    const system = buildSystemPrompt({
      title: job.title,
      skillsStr,
      companyContext: profile?.company_ai_context,
      blocEtat: etat.bloc,
      experienceExiste: etat.existe,
      langue,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

    // L'outil de régénération n'est proposé que s'il y a quelque chose à
    // régénérer : exposer un outil inapplicable, c'est s'exposer à le voir
    // appelé sur une étape 1 qui n'existe pas.
    const tools = etat.existe ? [REGENERATE_STEP_TOOL, GENERATE_TOOL] : [GENERATE_TOOL];

    const currentResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1200, temperature: 0.3,
      system,
      // Le fil complet est conservé en base, mais seul son extrémité est
      // renvoyée au modèle : c'est ce qui est facturé à chaque tour, et l'état
      // qui compte vraiment (les étapes) est réinjecté ci-dessus depuis la base.
      messages: bornerFil(fil, MAX_MESSAGES_MODELE),
      tools,
    });

    const filApres = [...fil, { role: "assistant", content: currentResponse.content }];
    await enregistrerFil(supabase, jobId, filApres);

    // Décision d'agir : on N'EXÉCUTE PAS ici (appeler une server action
    // "use server" depuis un route handler échoue en Next 16). On renvoie
    // l'intention au client, qui déclenche la server action et nous renvoie le
    // tool_result. Chemin éprouvé par la génération complète, réemployé tel quel
    // pour la régénération d'étape.
    if (currentResponse.stop_reason === "tool_use") {
      const gen = currentResponse.content.find((c) => c.type === "tool_use" && c.name === "generate_experience");
      if (gen) {
        return Response.json({
          message: currentResponse,
          messages: filApres,
          pendingGenerate: { toolUseId: gen.id, brief: gen.input?.brief || "" },
        });
      }
      const regen = currentResponse.content.find((c) => c.type === "tool_use" && c.name === "regenerate_step");
      if (regen) {
        return Response.json({
          message: currentResponse,
          messages: filApres,
          pendingRegenerate: {
            toolUseId: regen.id,
            stepNumber: regen.input?.step_number,
            instruction: regen.input?.instruction || "",
          },
        });
      }
    }

    return Response.json({ message: currentResponse, messages: filApres });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
