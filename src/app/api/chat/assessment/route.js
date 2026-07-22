import { Anthropic } from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';



// The tool definition for Anthropic
const SEARCH_TOOL = {
  name: "search_assessment_catalog",
  description: "Search the Onbord assessment catalog to find a test that matches the user's needs. Use this tool ONLY when you have collected the role (poste) and the specific skills (compétences).",
  input_schema: {
    type: "object",
    properties: {
      role: {
        type: "string",
        description: "The job role or title, e.g., 'Account Executive', 'Développeur React'."
      },
      skills: {
        type: "array",
        items: { type: "string" },
        description: "The list of specific skills to evaluate, e.g., ['SQL', 'Python', 'Gestion des objections']."
      }
    },
    required: ["role", "skills"]
  }
};

const PROPOSE_ADD_TOOL = {
  name: "propose_add_assessment",
  description: "Appelle cet outil UNIQUEMENT lorsque la recherche a donné un test existant parfait pour le proposer à l'utilisateur.",
  input_schema: {
    type: "object",
    properties: {
      testId: { type: "string" },
      testName: { type: "string" }
    },
    required: ["testId", "testName"]
  }
};

const PROPOSE_CUSTOM_TOOL = {
  name: "propose_custom_creation",
  description: "Appelle cet outil UNIQUEMENT lorsque la recherche n'a rien donné et que tu proposes à l'utilisateur de lancer une création de test sur-mesure.",
  input_schema: {
    type: "object",
    properties: {
      role: { type: "string" },
      skills: { type: "array", items: { type: "string" } },
      summary: { type: "string", description: "Bref résumé du besoin (1-2 phrases)" }
    },
    required: ["role", "skills", "summary"]
  }
};

const SYSTEM_PROMPT = `Tu es l'expert en évaluation (Assessment Expert) de Onbord. Ton rôle est d'aider les recruteurs à trouver ou créer le test technique/métier parfait pour leurs candidats.

RÈGLES ABSOLUES (CRITIQUES) :
1. Tu dois obligatoirement collecter 3 informations avant de chercher un test : 
   - Le poste ou la fonction (ex: "Account Executive B2B")
   - La ou les compétences précises à évaluer (ex: "gestion des objections", "React")
   - S'ils ont déjà testé ces compétences avant ou si c'est nouveau.
2. Pose UNE SEULE QUESTION de clarification à la fois. Si c'est trop vague, demande des précisions.
3. Une fois les 3 informations collectées, TU DOIS APPELER l'outil \`search_assessment_catalog\`. NE PROPOSE JAMAIS DE TEST AVANT D'AVOIR APPELÉ L'OUTIL.
4. N'INVENTE JAMAIS UN TEST. Si l'outil ne retourne rien, dis-le honnêtement : "Je n'ai rien dans la bibliothèque qui couvre précisément ça."
5. Si l'outil retourne un test, présente-le et APPELLE IMMÉDIATEMENT l'outil \`propose_add_assessment\` pour déclencher l'interface d'ajout. Ne demande pas textuellement s'il veut l'ajouter sans appeler l'outil.
6. Si aucun test ne correspond, recommande le "Sur-mesure" et APPELLE IMMÉDIATEMENT l'outil \`propose_custom_creation\` pour déclencher l'interface de confirmation. Ne pose pas la question textuellement sans appeler l'outil.
7. Si l'utilisateur demande à créer le test lui-même seul avec l'IA tout de suite, réponds : "Cette option sera bientôt disponible."
8. Ton ton est direct et utile. Pas de bla-bla commercial. N'utilise JAMAIS de formatage Markdown (pas de **, pas de liste avec astérisques). Écris uniquement du texte brut normal.`;

import { searchAvailableAssessments } from '@/lib/actions/assessment';

export async function POST(req) {
  try {
    // Route outil recruteur : exiger un utilisateur authentifié (empêche un tiers
    // non connecté de brûler le quota Anthropic ou d'interroger la bibliothèque).
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { messages, jobContext, jobId } = await req.json();

    // Si une offre est référencée, vérifier que le recruteur en est bien propriétaire
    // — sinon un client pourrait configurer/chercher des tests pour l'offre d'un autre.
    if (jobId) {
      const { data: job } = await supabase
        .from("jobs")
        .select("user_id")
        .eq("id", jobId)
        .single();
      if (job && job.user_id !== user.id) {
        return Response.json({ error: "Accès refusé à cette offre." }, { status: 403 });
      }
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (jobContext) {
      const title = jobContext.title || "Non spécifié";
      
      let allSkills = [];
      const criteria = jobContext.extracted_criteria || jobContext;

      if (Array.isArray(criteria.hard_skills)) {
        allSkills.push(...criteria.hard_skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean));
      }
      if (Array.isArray(criteria.soft_skills)) {
        allSkills.push(...criteria.soft_skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean));
      }
      if (Array.isArray(criteria.skills)) {
        allSkills.push(...criteria.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean));
      }
      
      const skillsStr = allSkills.length > 0 ? allSkills.join(', ') : 'Aucune compétence technique extraite.';

      dynamicSystemPrompt += `\n\nCONTEXTE ACTUEL DE L'OFFRE D'EMPLOI :
Le recruteur configure actuellement une évaluation technique pour l'offre d'emploi suivante :
- Poste : ${title}
- Compétences extraites de l'offre : ${skillsStr}

PUISQUE TU CONNAIS DÉJÀ le poste et les compétences :
- NE DEMANDE PLUS au recruteur pour quel poste il cherche.
- NE DEMANDE PLUS quelles sont les compétences en général.
- Demande-lui plutôt quelles compétences techniques spécifiques, parmi celles listées, il souhaite évaluer, ou propose-lui de chercher directement un test pour les compétences qui te semblent les plus techniques.
- Tu peux appeler l'outil search_assessment_catalog directement si tu estimes avoir assez d'informations techniques.`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      temperature: 0.2,
      system: dynamicSystemPrompt,
      messages: messages,
      tools: [SEARCH_TOOL, PROPOSE_ADD_TOOL, PROPOSE_CUSTOM_TOOL],
    });

    let currentResponse = response;
    let currentMessages = messages;

    while (currentResponse.stop_reason === "tool_use") {
      const toolUses = currentResponse.content.filter(c => c.type === "tool_use");
      
      // If ANY tool use is a UI action, return to frontend to handle
      if (toolUses.some(t => t.name === "propose_add_assessment" || t.name === "propose_custom_creation")) {
        return Response.json({ message: currentResponse, messages: currentMessages });
      }

      // Otherwise, process backend tools (search_assessment_catalog)
      currentMessages.push({ role: "assistant", content: currentResponse.content });
      
      const toolResults = [];
      for (const t of toolUses) {
        if (t.name === "search_assessment_catalog") {
          const { role, skills } = t.input;
          const searchResult = await searchAvailableAssessments(role, skills);
          toolResults.push({ type: "tool_result", tool_use_id: t.id, content: JSON.stringify(searchResult.tests || []) });
        } else {
          toolResults.push({ type: "tool_result", tool_use_id: t.id, content: "Tool not supported." });
        }
      }
      
      currentMessages.push({ role: "user", content: toolResults });
      
      currentResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        temperature: 0.2,
        system: dynamicSystemPrompt,
        messages: currentMessages,
        tools: [SEARCH_TOOL, PROPOSE_ADD_TOOL, PROPOSE_CUSTOM_TOOL],
      });
    }

    return Response.json({ message: currentResponse, messages: currentMessages });

  } catch (error) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
