import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';

// Chat-first de conception d'expérience : le chat prend l'offre + le contexte
// entreprise en entrée, pose les questions nécessaires pour affiner, puis
// déclenche generateExperience (mises en situation, pas de tests piochés dans
// une bibliothèque). Plus de recherche de catalogue.
const GENERATE_TOOL = {
  name: "generate_experience",
  description: "Génère l'expérience de présélection complète pour l'offre, une fois que tu as clarifié le besoin avec le recruteur — au moins un échange, jamais zéro. N'appelle cet outil qu'après avoir posé au moins une question utile et obtenu une réponse qui confirme le métier réel et le type de client/interlocuteur. Ne génère pas à l'aveugle après un seul message vague, et ne génère jamais sans avoir échangé avec le recruteur, même si l'offre semble déjà complète.",
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

function buildSystemPrompt({ title, skillsStr, companyContext }) {
  const ctx = companyContext || {};
  const companyBlock = [
    ctx.description && `Description : ${ctx.description}`,
    ctx.industry && `Secteur : ${ctx.industry}`,
    ctx.target_market && `Marché cible : ${ctx.target_market}`,
    ctx.domain && `Modèle : ${ctx.domain}`,
  ].filter(Boolean).join(" | ") || "Aucun contexte entreprise renseigné.";

  return `Tu es le concepteur d'expériences de présélection de Onbord. Tu aides le recruteur à concevoir une expérience courte (5–20 min) de MISES EN SITUATION qui prouvent les compétences — pas un questionnaire théorique, pas un test pioché dans une bibliothèque.

OFFRE : ${title || "Non précisée"}
COMPÉTENCES EXTRAITES : ${skillsStr}
CONTEXTE ENTREPRISE : ${companyBlock}

DÉROULÉ :
1. Tu connais déjà l'offre et le contexte ci-dessus : ne redemande pas le poste ou les compétences générales.
2. Avant de poser une question, identifie ce que l'offre et le contexte entreprise disent déjà, et ce qui reste réellement flou ou manquant pour CE poste précis. Ne pose jamais une question dont la réponse est déjà déductible de ce que tu as. Priorise ce qui changerait concrètement le contenu de l'expérience générée, jamais une question de forme si le fond manque encore.
   Exemples de ce qui compte selon les cas : si le secteur ou le produit de l'entreprise n'est pas clair, creuse ça avant tout le reste. Si le poste touche à la vente ou au support, le type de client typique et une situation difficile fréquente comptent plus que tout le reste. Si l'offre est déjà très détaillée, il se peut qu'une seule question suffise — mais pose-la toujours. Tu ne génères jamais sans avoir posé au moins une question au recruteur, même quand l'offre semble complète.
   Plancher minimum, unique : tu dois avoir une compréhension claire du métier réel et du type de client/interlocuteur avant de pouvoir déclencher la génération — c'est ce qui détermine le fond du scénario, pas sa forme. Le ton peut être déduit par défaut si non précisé : une correction de ton se fait facilement à la relecture, une erreur sur le client ou le métier invalide tout le scénario. La façon de découvrir ce plancher doit s'adapter à ce que tu sais déjà, jamais suivre un script fixe — mais il y a toujours au moins une question à poser.
3. Ne génère PAS à l'aveugle. Après au moins un échange utile qui atteint le plancher minimum, APPELLE l'outil \`generate_experience\` avec une synthèse (brief) des précisions. Tu peux proposer de générer et attendre un accord.
4. Après génération, l'écran de relecture s'ouvre automatiquement. Dis au recruteur qu'il peut relire/éditer chaque étape, ou continuer à te demander des ajustements.

Ton direct et concret, pas de bla-bla. N'utilise JAMAIS de Markdown (pas de **, pas de listes à astérisques) — uniquement du texte brut.`;
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

    const { data: profile } = await supabase
      .from("users").select("company_ai_context").eq("id", user.id).single();

    const criteria = job.extracted_criteria || {};
    const allSkills = [];
    for (const key of ["hard_skills", "soft_skills", "skills"]) {
      if (Array.isArray(criteria[key])) allSkills.push(...criteria[key].map((s) => (typeof s === "string" ? s : s.name)).filter(Boolean));
    }
    const skillsStr = allSkills.length ? allSkills.join(", ") : "Aucune compétence extraite.";
    const system = buildSystemPrompt({ title: job.title, skillsStr, companyContext: profile?.company_ai_context });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "" });

    const currentResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1200, temperature: 0.3,
      system, messages, tools: [GENERATE_TOOL],
    });

    // Décision de générer : on NE lance PAS generateExperience ici (appeler une
    // server action "use server" depuis un route handler échoue en Next 16). On
    // renvoie le brief au client, qui déclenche la server action (chemin éprouvé)
    // et affiche le feed de génération, puis nous renvoie le tool_result.
    if (currentResponse.stop_reason === "tool_use") {
      const gen = currentResponse.content.find((c) => c.type === "tool_use" && c.name === "generate_experience");
      if (gen) {
        return Response.json({
          message: currentResponse,
          messages: [...messages, { role: "assistant", content: currentResponse.content }],
          pendingGenerate: { toolUseId: gen.id, brief: gen.input?.brief || "" },
        });
      }
    }

    return Response.json({ message: currentResponse, messages });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
