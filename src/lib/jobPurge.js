// Purge définitive des offres en corbeille.
//
// Module PUR, sans "use server" : il est appelé depuis une route API (le cron)
// et pourrait l'être depuis un script d'exploitation. Le motif est celui de
// candidateEntry.js et scoring.js — deux chemins qui recalculeraient la même
// chose différemment finissent toujours par diverger.
//
// C'est le seul endroit du code qui efface réellement une offre. deleteJob() ne
// fait plus que poser `deleted_at` ; tout ce qui est irréversible est ici.

import { supprimerFichiersDesCandidats } from "@/lib/storage";

// Sept jours : assez pour rattraper une fausse manœuvre repérée le lundi suivant,
// assez court pour que des données personnelles supprimées ne traînent pas.
export const DELAI_CORBEILLE_JOURS = 7;

/**
 * Efface définitivement une offre : fichiers du stockage, puis lignes.
 *
 * L'ordre n'est pas cosmétique, et se lit à l'envers de l'intuition :
 *   - les FICHIERS d'abord, car une fois les candidats supprimés plus rien ne
 *     dit quels dossiers effacer — c'est exactement ainsi que 145 Mo de CV et de
 *     vidéos sont devenus orphelins ;
 *   - les CANDIDATS ensuite, dont la suppression cascade vers candidate_runs et
 *     tout le run ;
 *   - l'OFFRE en dernier, car candidate_runs.experience_id est en ON DELETE
 *     RESTRICT (migration 010) : tant qu'un run existe, supprimer l'offre — qui
 *     cascade vers experiences — est refusé par la base.
 *
 * @param {object} admin client service_role
 * @param {string} jobId
 * @returns {Promise<{ok: boolean, fichiers: number, erreurs: string[]}>}
 */
export async function purgerOffre(admin, jobId) {
  const erreurs = [];

  const { data: candidats } = await admin
    .from("candidates")
    .select("id, interview_token")
    .eq("job_id", jobId);

  let fichiers = 0;
  if (candidats?.length) {
    const res = await supprimerFichiersDesCandidats(admin, candidats);
    fichiers = res.supprimes;
    erreurs.push(...res.erreurs);
  }

  const { error: errCandidats } = await admin.from("candidates").delete().eq("job_id", jobId);
  if (errCandidats) {
    // On s'arrête : effacer l'offre en laissant ses candidats produirait des
    // lignes orphelines, l'inverse exact de ce que cette purge doit obtenir.
    return { ok: false, fichiers, erreurs: [...erreurs, `candidates: ${errCandidats.message}`] };
  }

  await admin.from("job_skills").delete().eq("job_id", jobId);

  const { error: errOffre } = await admin.from("jobs").delete().eq("id", jobId);
  if (errOffre) return { ok: false, fichiers, erreurs: [...erreurs, `jobs: ${errOffre.message}`] };

  return { ok: erreurs.length === 0, fichiers, erreurs };
}

/**
 * Purge toutes les offres dont la mise en corbeille dépasse le délai.
 * Une offre en échec n'interrompt pas les autres : elle sera reprise au passage
 * suivant, puisque son `deleted_at` reste en place.
 */
export async function purgerOffresEchues(admin, delaiJours = DELAI_CORBEILLE_JOURS) {
  const limite = new Date(Date.now() - delaiJours * 24 * 60 * 60 * 1000).toISOString();

  const { data: offres, error } = await admin
    .from("jobs")
    .select("id, title, deleted_at")
    .not("deleted_at", "is", null)
    .lt("deleted_at", limite);

  if (error) return { purgees: 0, echecs: 0, fichiers: 0, erreurs: [error.message] };
  if (!offres?.length) return { purgees: 0, echecs: 0, fichiers: 0, erreurs: [] };

  let purgees = 0, echecs = 0, fichiers = 0;
  const erreurs = [];

  for (const offre of offres) {
    const res = await purgerOffre(admin, offre.id);
    fichiers += res.fichiers;
    if (res.ok) purgees++;
    else {
      echecs++;
      erreurs.push(`${offre.id} (${offre.title}) : ${res.erreurs.join(" ; ")}`);
    }
  }

  return { purgees, echecs, fichiers, erreurs };
}
