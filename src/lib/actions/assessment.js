"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Enregistre la configuration du parcours d'une offre (`jobs.assessment_config`).
 *
 * Il n'y reste que les questions de présélection et l'ordre du parcours : les
 * modules de l'ancien parcours (analyse de CV, banque de tests, entretien IA,
 * entretien vidéo) ont été retirés. Les questions elles-mêmes vivent dans
 * `saved_flow_nodes`, lu en premier par lib/actions/run.js ; cette copie n'est
 * que le repli qu'il lit ensuite.
 */
export async function saveAssessmentConfig(jobId, config) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");

    // Configurer le parcours ne facture rien.
    const { error } = await supabase
      .from("jobs")
      .update({ assessment_config: config })
      .eq("id", jobId)
      .eq("user_id", user.id);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("saveAssessmentConfig error:", err);
    return { success: false, error: err.message };
  }
}
