import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";

// Assistant IA intégré au candidat, pour un step qui l'autorise.
// - identité par token candidat (jamais candidateId/prompt du client) ;
// - prompt système reconstruit serveur (cadrage "aide, ne fais pas à sa place") ;
// - plafond d'échanges appliqué SERVEUR (ai_assistant_config.max_messages) ;
// - chaque message loggé dans run_ai_messages (usage tokens compris).
export async function POST(request) {
  try {
    const { token, stepId, message } = await request.json();
    if (!token || !stepId || !message) {
      return Response.json({ error: "token, stepId et message requis" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: candidate } = await admin
      .from("candidates").select("id").eq("interview_token", token).single();
    if (!candidate) return Response.json({ error: "Lien invalide" }, { status: 403 });

    const { data: step } = await admin
      .from("experience_steps")
      .select("id, prompt, ai_assistant_allowed, experience_id, experiences!inner(ai_assistant_config)")
      .eq("id", stepId).single();
    if (!step || !step.ai_assistant_allowed) {
      return Response.json({ error: "Assistant non disponible pour cette étape" }, { status: 403 });
    }

    const { data: run } = await admin
      .from("candidate_runs").select("id, status")
      .eq("candidate_id", candidate.id).eq("experience_id", step.experience_id).maybeSingle();
    if (!run || run.status !== "in_progress") {
      return Response.json({ error: "Run non actif" }, { status: 403 });
    }

    const cfg = step.experiences?.ai_assistant_config || {};
    const maxMessages = cfg.max_messages ?? 10;
    const model = cfg.model || "claude-haiku-4-5";

    // Plafond appliqué serveur : nombre de messages candidat déjà envoyés sur ce run.
    const { count: usedCount } = await admin
      .from("run_ai_messages").select("id", { count: "exact", head: true })
      .eq("run_id", run.id).eq("role", "user");
    if ((usedCount || 0) >= maxMessages) {
      return Response.json({ limitReached: true, remaining: 0 });
    }

    // Historique de l'assistant sur CE step (contexte de la conversation).
    const { data: history } = await admin
      .from("run_ai_messages").select("role, content, created_at")
      .eq("run_id", run.id).eq("step_id", stepId).order("created_at", { ascending: true });

    const system = `Tu es un assistant de travail intégré, disponible pendant une évaluation de recrutement. Le candidat réalise la tâche suivante :
"""
${step.prompt || ""}
"""
Aide-le comme le ferait un collègue compétent : clarifie la consigne, propose des angles, donne un retour critique, explique un concept. RÈGLE ABSOLUE : ne réalise JAMAIS la tâche à sa place et ne rédige pas la réponse finale pour lui — tu l'accompagnes, il produit. Reste concis et concret. Réponds en français.`;

    const messages = [
      ...(history || []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const response = await anthropic.messages.create({
      model, max_tokens: 600, temperature: 0.4, system, messages,
    });
    const reply = response.content[0].text;
    const usage = computeAiCost(model, response.usage);

    // Log des deux messages (le user ne porte pas de coût ; l'assistant porte l'usage).
    await admin.from("run_ai_messages").insert([
      { run_id: run.id, step_id: stepId, role: "user", content: message },
      { run_id: run.id, step_id: stepId, role: "assistant", content: reply, input_tokens: usage.input_tokens, output_tokens: usage.output_tokens },
    ]);

    return Response.json({ reply, remaining: Math.max(0, maxMessages - (usedCount || 0) - 1) });
  } catch (error) {
    console.error("run assistant error:", error);
    return Response.json({ error: error.message || "Erreur assistant" }, { status: 500 });
  }
}
