import { createAdminClient } from "@/lib/supabase/server";
import { purgerOffresEchues, DELAI_CORBEILLE_JOURS } from "@/lib/jobPurge";

// Purge quotidienne des offres en corbeille depuis plus de 7 jours : lignes ET
// fichiers du stockage. Déclenchée par Vercel Cron (cf. vercel.json).
//
// Cette route EFFACE DÉFINITIVEMENT des données personnelles. Elle est donc
// fermée par un secret partagé, et non par une session : l'appelant est une
// machine, il n'a pas de compte.
//
// Vercel joint automatiquement `Authorization: Bearer $CRON_SECRET` aux appels
// de cron. Le même en-tête permet de la déclencher à la main en cas de besoin.
//
// Sans CRON_SECRET en environnement, la route REFUSE de s'exécuter. C'est le
// défaut sûr : une variable oubliée doit désarmer la purge, jamais l'ouvrir.

export const dynamic = "force-dynamic";
// La purge télécharge la liste des fichiers de chaque candidat avant de les
// supprimer ; sur une offre à gros volume, le défaut de 10 s ne suffit pas.
export const maxDuration = 300;

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("cron/purge : CRON_SECRET absente — purge désarmée.");
    return Response.json({ error: "Purge non configurée" }, { status: 503 });
  }

  const entete = request.headers.get("authorization");
  if (entete !== `Bearer ${secret}`) {
    return Response.json({ error: "Accès refusé" }, { status: 401 });
  }

  try {
    const debut = Date.now();
    const res = await purgerOffresEchues(createAdminClient(), DELAI_CORBEILLE_JOURS);

    // Journalisé même quand il n'y a rien à faire : sans trace, on ne distingue
    // pas « le cron tourne et n'a rien trouvé » de « le cron ne tourne plus ».
    console.log(
      `cron/purge : ${res.purgees} offre(s) purgée(s), ${res.fichiers} fichier(s), ` +
      `${res.echecs} échec(s), ${Date.now() - debut} ms`
    );
    if (res.erreurs.length) console.error("cron/purge — échecs :", res.erreurs);

    return Response.json({
      ok: res.echecs === 0,
      purgees: res.purgees,
      fichiers: res.fichiers,
      echecs: res.echecs,
    });
  } catch (error) {
    console.error("cron/purge error:", error);
    return Response.json({ error: "Erreur technique" }, { status: 500 });
  }
}
