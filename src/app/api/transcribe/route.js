import { createAdminClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/transcription";
import { urlSignee } from "@/lib/storage";
import { consommer, ipDe, SEUILS } from "@/lib/rateLimit";

// Transcrit la réponse vidéo d'un step. Le client n'envoie que { token, responseId } :
// l'URL vidéo est relue depuis la DB (jamais fournie par le client), et la
// propriété est vérifiée via le token candidat. Cohérent avec le durcissement É3/É4.
export async function POST(request) {
  try {
    const { token, responseId } = await request.json();
    if (!token || !responseId) {
      return Response.json({ error: "token et responseId requis" }, { status: 400 });
    }

    // Chaque appel déclenche une transcription facturée chez AssemblyAI.
    for (const [cle, seuil] of [
      [`transcribe:token:${token}`, SEUILS.transcriptionParToken],
      [`transcribe:ip:${ipDe(request.headers)}`, SEUILS.transcriptionParIp],
    ]) {
      const verdict = consommer(cle, seuil.max, seuil.fenetre);
      if (!verdict.autorise) {
        return Response.json(
          { error: "Trop de transcriptions demandées. Patientez un instant." },
          { status: 429, headers: { "Retry-After": String(verdict.resetDans) } }
        );
      }
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

    // `video-responses` est un bucket privé : AssemblyAI télécharge l'URL qu'on
    // lui donne, il lui faut donc une URL SIGNÉE. Deux heures, le temps que la
    // file d'attente du prestataire se vide sur une vidéo longue.
    const urlVideo = await urlSignee(admin, "video-responses", resp.video_url, 7200);
    if (!urlVideo) {
      return Response.json({ error: "Vidéo introuvable dans le stockage" }, { status: 404 });
    }

    let transcript = "";
    let status = "submitted";
    try {
      transcript = await transcribeAudio(urlVideo);
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
