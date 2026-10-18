"use server";

import { createClient } from "@/lib/supabase/server";
import { voixParAccent } from "@/lib/constants/voix";

/**
 * Les voix d'appel configurées, pour le sélecteur de l'éditeur d'étape :
 * { "nl-BE": ["m"], "fr-BE": ["f", "m"], … }. Seulement langue, accent et genre :
 * les identifiants ElevenLabs ne quittent jamais le serveur.
 */
export async function listerVoixDisponibles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié" };
  return { success: true, variantes: voixParAccent() };
}
