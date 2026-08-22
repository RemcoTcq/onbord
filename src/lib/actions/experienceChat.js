"use server";

import { createClient } from "@/lib/supabase/server";
import { chargerFil, chargerExperienceCourante, construireEtatExperience } from "@/lib/experienceChat";

// Server actions du fil de conception. La logique vit dans lib/experienceChat.js
// (module pur), parce que la route /api/chat/assessment en a besoin elle aussi
// et qu'une route handler ne peut pas appeler une server action en Next 16.

/**
 * Fil enregistré + état de l'expérience, pour le montage du chat.
 *
 * Les deux en un seul aller-retour : le composant a besoin des deux au même
 * moment — l'un pour réafficher la conversation, l'autre pour ouvrir sur le bon
 * message quand il n'y a pas encore de conversation.
 */
export async function getExperienceChat(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // La RLS suffirait, mais un accès refusé doit se lire comme tel plutôt que
    // comme un fil vide — sinon le chat rouvre en « aucune conversation » sur
    // une offre qui ne nous appartient pas.
    const { data: job } = await supabase
      .from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).maybeSingle();
    if (!job) return { success: false, error: "Accès refusé" };

    const [messages, { experience, steps }] = await Promise.all([
      chargerFil(supabase, jobId),
      chargerExperienceCourante(supabase, jobId),
    ]);
    const etat = construireEtatExperience(experience, steps);

    return {
      success: true,
      messages,
      etat: { existe: etat.existe, nbEtapes: etat.nbEtapes, version: etat.version, statut: etat.statut, titres: etat.titres || [] },
    };
  } catch (err) {
    console.error("getExperienceChat error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Efface le fil. L'expérience générée n'est PAS touchée : on repart d'une
 * conversation vierge sur un parcours qui existe toujours, ce qui est
 * exactement l'usage — le fil est devenu long ou part dans une mauvaise
 * direction, le travail déjà produit reste.
 */
export async function resetExperienceChat(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error } = await supabase.from("experience_chats").delete().eq("job_id", jobId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("resetExperienceChat error:", err);
    return { success: false, error: err.message };
  }
}
