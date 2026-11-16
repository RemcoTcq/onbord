import { runModuleGeneration } from "@/lib/moduleGeneration";

// La génération d'un MODULE d'onboarding (phase 2, lib/moduleGeneration.js),
// en flux NDJSON, comme celle d'une offre : voir app/api/experience/generate
// pour les raisons du flux et du plafond.
//
// 300 : le PLAFOND du plan Vercel « hobby ». Au-delà, Vercel refuse EN
// SILENCE tous les déploiements (« invalid_max_duration »). Ne pas remonter.
//
// L'authentification et le rôle sont vérifiés par runModuleGeneration (le
// module est lu sous RLS : admin ou manager de son organisation). Aucun
// crédit n'est débité : c'est de l'onboarding (décision du 10/11/2026).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }

  const { moduleId, personaId } = body || {};
  if (!moduleId) return Response.json({ error: "moduleId requis" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (obj) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          closed = true; // client parti : la génération finit côté serveur
        }
      };

      try {
        const res = await runModuleGeneration(moduleId, (event) => send({ type: "event", ...event, at: Date.now() }), { personaId: personaId || null });
        send(res.success
          ? { type: "result", success: true, experienceId: res.experienceId }
          : { type: "result", success: false, error: res.error || "Échec de la génération" });
      } catch (err) {
        console.error("stream module generate error:", err);
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
      "X-Accel-Buffering": "no",
    },
  });
}
