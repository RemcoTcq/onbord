import { createAdminClient } from "@/lib/supabase/server";
import { consommer, ipDe } from "@/lib/rateLimit";
import { normaliserPersona } from "@/lib/persona";
import { MODELE_VOIX, voixDisponible, voixDuPersonnage, voixDeBase } from "@/lib/constants/voix";

// Voix d'un personnage en appel : une phrase de texte → l'audio ElevenLabs,
// relayé en flux. La clé reste ici ; le navigateur ne reçoit que du son.
//
// Le navigateur demande chaque phrase dès qu'elle arrive du modèle, pour que le
// personnage parle pendant qu'il « réfléchit » encore à la suite. La phrase ne
// peut donc pas être vérifiée contre la conversation enregistrée (elle ne l'est
// qu'à la fin de la réplique) : la route est bornée autrement — candidat et
// étape vérifiés, appel en cours, longueur et débit plafonnés. Au pire, un
// candidat ferait lire quelques phrases de son choix ; rien qui vaille un abus.
//
// Toute impossibilité (pas de clé, voix introuvable, panne) renvoie `fallback`,
// et l'écran retombe sur la voix du navigateur : l'appel ne s'arrête jamais
// pour une question de voix.

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const MAX_CARACTERES = 600;
// Un appel de 12 répliques en 2 à 3 phrases chacune : une quarantaine de
// phrases. Le double par minute laisse la marge des relances après coupure.
const SEUIL_TOKEN = { max: 80, fenetre: 60_000 };
const SEUIL_IP = { max: 160, fenetre: 60_000 };

const repli = (status = 503) => Response.json({ fallback: true }, { status });

export async function POST(request) {
  try {
    if (!voixDisponible()) return repli();
    const { token, stepId, text } = await request.json();
    const texte = String(text || "").trim();
    if (!token || !stepId || !texte) return repli(400);
    if (texte.length > MAX_CARACTERES) return repli(413);

    for (const [cle, seuil] of [[`voix:token:${token}`, SEUIL_TOKEN], [`voix:ip:${ipDe(request.headers)}`, SEUIL_IP]]) {
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

    const langue = String(persona.language || "").slice(0, 2).toLowerCase();
    const synthese = (voix) => fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voix)}/stream?output_format=mp3_44100_64`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: texte,
          model_id: MODELE_VOIX,
          // Impose la langue : sans elle, une phrase courte (« Ja, oké ») peut
          // être lue avec l'accent d'une autre langue.
          ...(langue ? { language_code: langue } : {}),
          voice_settings: { stability: 0.45, similarity_boost: 0.8 },
        }),
      }
    );

    const voix = voixDuPersonnage(persona);
    let amont = await synthese(voix);
    // Voix de la bibliothèque refusée (offre gratuite, voix retirée) : la voix
    // de base du même genre plutôt que la voix robotique du navigateur.
    if ([402, 404].includes(amont.status) && voix !== voixDeBase(persona)) {
      console.error("voix ElevenLabs refusée, repli sur la voix de base :", amont.status, (await amont.text().catch(() => "")).slice(0, 200));
      amont = await synthese(voixDeBase(persona));
    }
    if (!amont.ok || !amont.body) {
      console.error("voix ElevenLabs :", amont.status, (await amont.text().catch(() => "")).slice(0, 300));
      return repli(502);
    }

    return new Response(amont.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("run persona voix error:", err);
    return repli(500);
  }
}
