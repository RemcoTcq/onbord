// Le contexte d'une conversation persona côté serveur — partagé par la route
// du mode écrit et de l'appel maison (/api/run/persona) et par celle de
// l'appel Realtime (/api/run/persona/realtime). Identité par token, étape et
// run résolus serveur ; rien de ce que le navigateur envoie n'est cru sur
// parole.

import { coerceExperienceLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";
import { normaliserPersona, repliques, toursCandidat, personaTranscript } from "@/lib/persona";

// Langue du personnage, en toutes lettres, pour sa consigne.
export const NOMS_LANGUES = { ...LOCALE_NAMES_FR, de: "allemand", es: "espagnol", it: "italien" };

export async function resolveContext(admin, token, stepId) {
  if (!token || !stepId) return { error: "token et stepId requis", status: 400 };

  const { data: candidate } = await admin
    .from("candidates").select("id").eq("interview_token", token).single();
  if (!candidate) return { error: "Lien invalide", status: 403 };

  const { data: step } = await admin
    .from("experience_steps")
    .select("id, experience_id, sandbox_kind, response_format, config")
    .eq("id", stepId).single();
  const persona = step?.sandbox_kind === "persona" ? normaliserPersona(step.config?.persona) : null;
  if (!step || !persona) return { error: "Conversation non disponible pour cette étape", status: 403 };

  // Le run du candidat sur l'expérience qui porte CETTE étape : une étape d'une
  // autre offre ne trouve pas de run, donc pas de conversation.
  const { data: run } = await admin
    .from("candidate_runs").select("id, status")
    .eq("candidate_id", candidate.id).eq("experience_id", step.experience_id).maybeSingle();
  if (!run) return { error: "Run introuvable", status: 403 };

  const { data: existing } = await admin
    .from("run_step_responses").select("meta")
    .eq("run_id", run.id).eq("step_id", step.id).maybeSingle();
  const conv = existing?.meta?.persona || { messages: [], ended: false, usage: null };

  const { data: exp } = await admin
    .from("experiences").select("jobs!inner(experience_locale)")
    .eq("id", step.experience_id).single();
  const locale = coerceExperienceLocale(exp?.jobs?.experience_locale);

  return { step, run, persona, conv, meta: existing?.meta || {}, locale };
}

export async function enregistrer(admin, ctx, conv) {
  const { error } = await admin.from("run_step_responses").upsert({
    run_id: ctx.run.id,
    step_id: ctx.step.id,
    response_format: ctx.step.response_format || "text",
    text_answer: personaTranscript(ctx.persona, conv),
    meta: { ...ctx.meta, persona: conv },
    status: "submitted",
    updated_at: new Date().toISOString(),
  }, { onConflict: "run_id,step_id" });
  if (error) throw error;
}

export function etat(ctx, conv) {
  return {
    messages: repliques(ctx.persona, conv).map((m) => ({ role: m.role, content: m.content })),
    turns: toursCandidat(conv),
    remaining: Math.max(0, ctx.persona.max_turns - toursCandidat(conv)),
    ended: !!conv.ended,
    endedBy: conv.ended_by || null,
    active: ctx.run.status === "in_progress",
    // Appel Realtime importé avant qu'ElevenLabs ne l'ait clos : la
    // transcription peut être incomplète, l'écran la fait relire.
    realtimeAReprendre: conv.realtime && conv.realtime.status !== "done" ? conv.realtime.conversation_id : null,
  };
}
