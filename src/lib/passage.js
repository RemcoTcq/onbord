// Le passage désigné par un JETON — partagé par tout le parcours (/run, ses
// actions serveur, l'assistant, le personnage, la voix, la transcription).
//
// Deux sortes de passages empruntent le même écran (phase 3 de l'onboarding) :
//   • le CANDIDAT, sans compte : son jeton est `candidates.interview_token`, et
//     il donne le candidat, qui donne le passage ;
//   • le LEARNER, connecté : son jeton est l'identifiant de son ESSAI
//     (`candidate_runs.id`, avec `learner_id`). L'identifiant seul ne suffit
//     pas — il apparaît dans des URL —, il faut aussi être connecté avec le
//     compte qui fait l'essai.
//
// Le candidat est cherché d'abord : c'est le chemin historique, et le seul qui
// existe en production avant la mise en ligne de l'onboarding.

import { createClient } from "@/lib/supabase/server";
import { coerceExperienceLocale } from "@/lib/i18n/config";
import { SOURCE_EMBARQUEE, sourceDe } from "@/lib/simulationSource";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** L'utilisateur connecté (cookies de session), ou null. */
async function utilisateurConnecte() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

/**
 * L'essai d'un learner désigné par ce jeton, s'il appartient à l'utilisateur
 * connecté. Sinon null : un jeton d'essai sans la bonne session ne vaut rien.
 */
export async function essaiDuLearner(admin, token) {
  if (typeof token !== "string" || !UUID.test(token)) return null;
  const { data: run } = await admin
    .from("candidate_runs").select("*")
    .eq("id", token).not("learner_id", "is", null).maybeSingle();
  if (!run) return null;
  const user = await utilisateurConnecte();
  return user && user.id === run.learner_id ? run : null;
}

/**
 * Le passage (`{ id, status }`) que ce jeton ouvre sur cette simulation, ou
 * null. Une étape d'une autre simulation ne trouve pas de passage, donc rien.
 */
export async function passageDuJeton(admin, token, experienceId) {
  if (!token || !experienceId) return null;
  const { data: candidate } = await admin
    .from("candidates").select("id").eq("interview_token", token).maybeSingle();
  if (candidate) {
    const { data: run } = await admin
      .from("candidate_runs").select("id, status")
      .eq("candidate_id", candidate.id).eq("experience_id", experienceId).maybeSingle();
    return run || null;
  }
  const essai = await essaiDuLearner(admin, token);
  return essai && essai.experience_id === experienceId ? { id: essai.id, status: essai.status } : null;
}

/** La langue d'une simulation : celle de son offre, ou de son module. */
export async function langueDeSimulation(admin, experienceId) {
  const { data: exp } = await admin
    .from("experiences").select(SOURCE_EMBARQUEE).eq("id", experienceId).maybeSingle();
  return coerceExperienceLocale(sourceDe(exp)?.experience_locale);
}
