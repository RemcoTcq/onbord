// Source unique de vérité : une offre est-elle prête à recevoir des candidats ?
//
// Module PUR (aucun "use server") pour pouvoir être importé partout : server
// actions du parcours candidat (run.js), création de candidature (candidate.js),
// et écrans recruteur. C'est exactement le motif de scoring.js — un bug
// historique est né de deux chemins qui calculaient la même chose différemment.
//
// Deux issues, plus le cas d'erreur :
//   "experience" : une expérience est publiée -> parcours /run ;
//   "not_ready"  : aucune -> écran d'attente, aucune candidature acceptée ;
//   "invalid"    : offre introuvable.
//
// L'ancien parcours (hub CV / tests / entretien) n'est PLUS une issue. Trois
// raisons, vérifiées avant de couper : aucune offre en production n'avait de
// module hérité actif (comptage du 13/08/2026), l'éditeur de pipeline ne permet
// plus d'en ajouter, et une offre sans expérience y produisait soit un upload de
// CV orphelin, soit un parcours vide que le candidat pouvait soumettre. Les
// composants hérités restent en place, dormants (cf. EXPERIENCE_V1_ONLY).

/** @returns {"experience"|"not_ready"|"invalid"} */
export function entryFor({ job, hasPublishedExperience }) {
  if (hasPublishedExperience) return "experience";
  return job ? "not_ready" : "invalid";
}

/** Le candidat peut-il entrer / postuler ? */
export function entryIsOpen(entry) {
  return entry === "experience";
}

// Résout l'état d'entrée d'une offre. `db` est un client Supabase déjà choisi par
// l'appelant (admin côté candidat, client authentifié côté recruteur).
export async function resolveJobEntry(db, jobId) {
  if (!jobId) return "invalid";

  const { data: exp } = await db
    .from("experiences").select("id")
    .eq("job_id", jobId).eq("status", "published").limit(1).maybeSingle();
  if (exp) return "experience";

  // L'offre existe-t-elle ? C'est ce qui distingue « pas encore prête » d'un
  // identifiant erroné, et donc le message affiché au candidat.
  const { data: job } = await db.from("jobs").select("id").eq("id", jobId).maybeSingle();

  return entryFor({ job, hasPublishedExperience: false });
}
