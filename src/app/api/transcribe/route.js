import { createAdminClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/transcription";

// Transcrit la réponse vidéo d'un step. Le client n'envoie que { token, responseId } :
// l'URL vidéo est relue depuis la DB (jamais fournie par le client), et la
// propriété est vérifiée via le token candidat. Cohérent avec le durcissement É3/É4.
export async function POST(request) {
  try {
    const { token, responseId } = await request.json();
    if (!token || !responseId) {
      return Response.json({ error: "token et responseId requis" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Candidat propriétaire du run auquel appartient cette réponse ?
    const { data: candidate } = await admin
      .from("candidates").select("id").eq("interview_token", token).single();
    if (!candidate) return Response.json({ error: "Lien invalide" }, { status: 403 });

    const { data: resp } = await admin
      .from("run_step_responses")
      .select("id, video_url, run_id, candidate_runs!inner(candidate_id)")
      .eq("id", responseId)
      .single();
    if (!resp || resp.candidate_runs?.candidate_id !== candidate.id) {
      return Response.json({ error: "Accès refusé" }, { status: 403 });
    }
    if (!resp.video_url) {
      return Response.json({ error: "Aucune vidéo à transcrire" }, { status: 400 });
    }

    let transcript = "";
    let status = "submitted";
    try {
      transcript = await transcribeAudio(resp.video_url);
      if (!transcript || transcript.trim().length < 10) status = "manual_review";
    } catch (err) {
      console.error("transcribe failed:", err);
      transcript = "[Transcription indisponible]";
      status = "manual_review";
    }

    await admin
      .from("run_step_responses")
      .update({ transcript, status, updated_at: new Date().toISOString() })
      .eq("id", responseId);

    return Response.json({ success: true, status });
  } catch (error) {
    console.error("transcribe route error:", error);
    return Response.json({ error: error.message || "Erreur transcription" }, { status: 500 });
  }
}
