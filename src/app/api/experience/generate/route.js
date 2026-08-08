import { runExperienceGeneration } from "@/lib/experienceGeneration";

// Une génération complète (2 appels Claude + persistance) dure ~1 à 2 minutes,
// mesuré. Sans ce plafond relevé, l'hébergeur coupe la requête en plein flux.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Génération d'expérience en STREAMING (NDJSON, une ligne JSON par événement).
//
// Pourquoi une route et pas la server action : une server action ne peut
// renvoyer qu'une valeur, à la fin. Ici on veut pousser chaque étape du pipeline
// AU MOMENT où elle se produit. Un ReadableStream de route handler est le moyen
// le plus direct dans ce projet — pas de dépendance à ajouter, et le client lit
// avec fetch + getReader().
//
// NDJSON plutôt que SSE : on n'a besoin ni de reconnexion automatique ni de
// typage d'événements côté navigateur, et une ligne = un JSON.parse.
//
// L'authentification et l'ownership de l'offre sont vérifiées par
// runExperienceGeneration lui-même (mêmes contrôles que la server action).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { jobId, additionalContext } = body || {};
  if (!jobId) return Response.json({ error: "jobId requis" }, { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true; // client parti : on laisse la génération finir côté serveur
        }
      };

      try {
        const res = await runExperienceGeneration(
          jobId,
          (additionalContext || "").slice(0, 4000),
          (event) => send({ type: "event", ...event, at: Date.now() })
        );
        send(res.success
          ? { type: "result", success: true, experienceId: res.experienceId }
          : { type: "result", success: false, error: res.error || "Échec de la génération" });
      } catch (err) {
        console.error("stream generate error:", err);
        send({ type: "result", success: false, error: err.message || "Erreur inattendue" });
      } finally {
        closed = true;
        try { controller.close(); } catch { /* déjà fermé */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Désactive le buffering des proxies : sans ça le flux arrive d'un bloc à
      // la fin, ce qui annulerait tout l'intérêt.
      "X-Accel-Buffering": "no",
    },
  });
}
