import { createAdminClient } from "@/lib/supabase/server";
import { consommer, ipDe } from "@/lib/rateLimit";
import { normaliserPersona } from "@/lib/persona";
import { voixDisponible } from "@/lib/constants/voix";

// Transcription d'un tour de parole du candidat pendant un appel (sandbox
// « persona »), par ElevenLabs Scribe.
//
// ── Pourquoi pas seulement la reconnaissance du navigateur ──────────────────
// Elle est gratuite et instantanée — parfaite pour les sous-titres en direct
// et pour savoir quand le candidat s'arrête de parler. Mais elle comprend mal
// les accents, le flamand surtout, et un mot mal entendu fausse deux choses à
// la fois : la réponse du personnage, et la transcription que le correcteur
// note. Le navigateur garde donc le direct ; ce qui part au personnage et au
// correcteur est la transcription de l'audio du tour, faite ici.
//
// Toute impossibilité renvoie `fallback` : l'écran garde alors le texte du
// navigateur. Un appel ne s'arrête jamais pour une question de transcription.

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// scribe_v2 : vérifié le 07/10/2026 sur un extrait néerlandais (transcription
// exacte, langue imposée respectée). scribe_v1 fonctionne aussi.
const MODELE_TRANSCRIPTION = process.env.ELEVENLABS_STT_MODEL || "scribe_v2";
const TAILLE_MAX = 8 * 1024 * 1024; // un tour de parole tient en quelques centaines de Ko
const SEUIL_TOKEN = { max: 30, fenetre: 60_000 };
const SEUIL_IP = { max: 60, fenetre: 60_000 };

const repli = (status = 503) => Response.json({ fallback: true }, { status });

export async function POST(request) {
  try {
    if (!voixDisponible()) return repli();
    const form = await request.formData();
    const token = String(form.get("token") || "");
    const stepId = String(form.get("stepId") || "");
    const audio = form.get("audio");
    if (!token || !stepId || !audio || typeof audio === "string") return repli(400);
    if (audio.size > TAILLE_MAX) return repli(413);

    for (const [cle, seuil] of [[`stt:token:${token}`, SEUIL_TOKEN], [`stt:ip:${ipDe(request.headers)}`, SEUIL_IP]]) {
      if (!consommer(cle, seuil.max, seuil.fenetre).autorise) return repli(429);
    }

    const admin = createAdminClient();
    const { data: candidate } = await admin.from("candidates").select("id").eq("interview_token", token).single();
    if (!candidate) return repli(403);
    const { data: step } = await admin
      .from("experience_steps").select("id, experience_id, sandbox_kind, config").eq("id", stepId).single();
    const persona = step?.sandbox_kind === "persona" ? normaliserPersona(step.config?.persona) : null;
    if (!persona || persona.mode === "chat") return repli(403);
    const { data: run } = await admin
      .from("candidate_runs").select("id, status")
      .eq("candidate_id", candidate.id).eq("experience_id", step.experience_id).maybeSingle();
    if (!run || run.status !== "in_progress") return repli(403);

    const envoi = new FormData();
    envoi.append("model_id", MODELE_TRANSCRIPTION);
    envoi.append("file", audio, audio.name || "tour.webm");
    // La langue de la conversation, imposée : sur une phrase courte, une
    // détection automatique hésite entre néerlandais et allemand, ou entre
    // français et anglais pour un « OK, d'accord ».
    const langue = String(persona.language || "").slice(0, 2).toLowerCase();
    if (langue) envoi.append("language_code", langue);
    envoi.append("tag_audio_events", "false");

    const amont = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
      body: envoi,
    });
    if (!amont.ok) {
      console.error("transcription ElevenLabs :", amont.status, (await amont.text().catch(() => "")).slice(0, 300));
      return repli(502);
    }
    const data = await amont.json();
    return Response.json({ text: String(data?.text || "").trim() });
  } catch (err) {
    console.error("run persona transcrire error:", err);
    return repli(500);
  }
}
