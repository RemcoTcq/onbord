import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { generateExperience } from '@/lib/actions/experience';

// Chat-first de conception d'expérience : le chat prend l'offre + le contexte
// entreprise en entrée, pose les questions nécessaires pour affiner, puis
// déclenche generateExperience (mises en situation, pas de tests piochés dans
// une bibliothèque). Plus de recherche de catalogue.
const GENERATE_TOOL = {
  name: "generate_experience",
  description: "Génère l'expérience de présélection complète pour l'offre, une fois que tu as clarifié le besoin avec le recruteur (au moins un ou deux échanges). N'appelle cet outil qu'après avoir posé les questions utiles (ton souhaité, type de client/candidat visé, spécificités du poste non couvertes par l'offre). Ne génère pas à l'aveugle après un seul message vague.",
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
2. Pose des questions de CADRAGE, une à la fois, pour affiner ce qui n'est pas dans l'offre : ton souhaité (formel/direct), type de client ou d'interlocuteur typique, spécificités du poste ou pièges à éviter, contraintes de durée. Reste bref.
3. Ne génère PAS à l'aveugle. Après un ou deux échanges utiles, quand tu as de quoi personnaliser, APPELLE l'outil \`generate_experience\` avec une synthèse (brief) des précisions. Tu peux proposer de générer et attendre un accord.
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

    let currentResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 1200, temperature: 0.3,
      system, messages, tools: [GENERATE_TOOL],
    });

    let currentMessages = messages;
    let generated = false;

    while (currentResponse.stop_reason === "tool_use") {
      currentMessages = [...currentMessages, { role: "assistant", content: currentResponse.content }];
      const toolResults = [];
      for (const t of currentResponse.content.filter((c) => c.type === "tool_use")) {
        if (t.name === "generate_experience") {
          const res = await generateExperience(jobId, t.input?.brief || "");
          generated = res.success;
          toolResults.push({
            type: "tool_result", tool_use_id: t.id, is_error: !res.success,
            content: res.success
              ? "Expérience générée avec succès. L'écran de relecture va s'ouvrir pour le recruteur."
              : `Échec de la génération : ${res.error || "erreur inconnue"}.`,
          });
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: t.id, content: "Outil non supporté." });
        }
      }
      currentMessages = [...currentMessages, { role: "user", content: toolResults }];
      currentResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 1200, temperature: 0.3,
        system, messages: currentMessages, tools: [GENERATE_TOOL],
      });
    }

    return Response.json({ message: currentResponse, messages: currentMessages, generated });
  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
