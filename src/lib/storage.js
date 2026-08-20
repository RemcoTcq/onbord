// Accès aux fichiers candidats (CV, vidéos) une fois les buckets passés en privé.
//
// Historiquement, `resumes` et `video-responses` étaient des buckets PUBLICS et le
// client stockait en base l'URL publique renvoyée par getPublicUrl(). N'importe qui
// pouvait alors lister le bucket avec la clé anon et télécharger les CV sans aucune
// authentification (audit du 19/08/2026, §1). Les buckets deviennent privés : plus
// aucune URL n'est utilisable telle quelle, il faut une URL SIGNÉE à durée limitée,
// émise côté serveur après vérification de la légitimité de l'appelant.
//
// Deux formes coexistent en base et coexisteront tant que les anciennes lignes
// vivent : une URL publique complète (lignes créées avant ce commit) et un chemin
// d'objet nu (lignes créées après). `cheminObjet` ramène les deux au chemin, ce qui
// évite une migration de données et un backfill sur des colonnes libres.

/**
 * Ramène une valeur stockée en base au chemin de l'objet dans son bucket.
 * Accepte un chemin nu ("<id>/cv.pdf"), une URL publique ou une URL signée.
 * @returns {string|null} chemin relatif au bucket, ou null si rien d'exploitable.
 */
export function cheminObjet(bucket, urlOuChemin) {
  if (!urlOuChemin || typeof urlOuChemin !== "string") return null;
  const valeur = urlOuChemin.trim();
  if (!valeur) return null;

  if (!/^https?:\/\//i.test(valeur)) {
    // Déjà un chemin. On retire un éventuel préfixe de bucket redondant.
    return valeur.replace(new RegExp(`^/?${bucket}/`), "").replace(/^\/+/, "") || null;
  }

  let chemin;
  try {
    chemin = decodeURIComponent(new URL(valeur).pathname);
  } catch {
    return null;
  }

  // /storage/v1/object/public/<bucket>/<chemin>  (URL publique)
  // /storage/v1/object/sign/<bucket>/<chemin>    (URL signée)
  // /storage/v1/object/<bucket>/<chemin>         (accès authentifié)
  const m = chemin.match(
    new RegExp(`/storage/v1/object/(?:public/|sign/|authenticated/)?${bucket}/(.+)$`)
  );
  return m ? m[1] : null;
}

// Une heure : le recruteur consulte un rapport, il ne le garde pas ouvert une
// journée. Assez court pour qu'une URL qui fuite (historique, presse-papier,
// capture d'écran) ne soit plus exploitable, assez long pour lire un dossier.
export const DUREE_URL_SIGNEE = 3600;

/**
 * Liste RÉCURSIVEMENT les objets sous un préfixe.
 * `list` de Supabase ne descend pas dans les sous-dossiers : il renvoie les
 * entrées du niveau, celles sans `id` étant des dossiers. Or les vidéos du
 * parcours hérité vivent sous `<candidate_id>/<job_id>/…`, un cran plus bas.
 * Sans récursion, elles ne sont jamais vues — donc jamais supprimées.
 */
async function listerRecursif(admin, bucket, prefixe, profondeur = 0) {
  if (profondeur > 3) return []; // garde-fou, l'arborescence réelle a 2 niveaux

  const { data, error } = await admin.storage.from(bucket).list(prefixe, { limit: 1000 });
  if (error || !data) return [];

  const chemins = [];
  for (const entree of data) {
    const complet = prefixe ? `${prefixe}/${entree.name}` : entree.name;
    if (entree.id) chemins.push(complet);
    else chemins.push(...(await listerRecursif(admin, bucket, complet, profondeur + 1)));
  }
  return chemins;
}

/**
 * Supprime TOUS les fichiers appartenant à une liste de candidats.
 *
 * Trois défauts corrigés ici, qui laissaient 28 CV sur 28 orphelins dans le
 * stockage — des données personnelles survivant à la suppression de la
 * candidature (audit du 19/08/2026, point 11) :
 *
 *   1. les suppressions passaient par le client soumis à RLS, or `resumes` et
 *      `video-responses` n'ont JAMAIS eu de policy DELETE : chaque appel
 *      échouait, et le résultat n'était pas vérifié. Silence complet.
 *   2. elles ciblaient `cv_storage_path`, qui ne retient que le DERNIER CV
 *      déposé. Un candidat ayant téléversé sept fois laissait six fichiers.
 *   3. elles ignoraient les vidéos du parcours Experience
 *      (`run_step_responses`), qui n'étaient donc jamais effacées.
 *
 * D'où le choix de vider les DOSSIERS plutôt que de suivre les chemins connus :
 * ce qui doit disparaître, c'est tout ce qui porte l'identité du candidat, pas
 * seulement ce dont la base a gardé la trace.
 *
 * @param {object} admin client service_role — seul à pouvoir supprimer
 * @param {Array<{id: string, interview_token?: string}>} candidats
 * @returns {Promise<{supprimes: number, erreurs: string[]}>}
 */
export async function supprimerFichiersDesCandidats(admin, candidats) {
  const erreurs = [];
  let supprimes = 0;

  // Les dossiers portent tantôt l'id du candidat (CV, parcours hérité), tantôt
  // son interview_token (parcours run). On ratisse les deux dans les deux
  // buckets : un préfixe absent ne coûte qu'un listing vide.
  const prefixes = [];
  for (const c of candidats) {
    if (c?.id) prefixes.push(c.id);
    if (c?.interview_token) prefixes.push(c.interview_token);
  }
  if (!prefixes.length) return { supprimes: 0, erreurs };

  for (const bucket of ["resumes", "video-responses"]) {
    const chemins = [];
    for (const prefixe of prefixes) {
      chemins.push(...(await listerRecursif(admin, bucket, prefixe)));
    }
    if (!chemins.length) continue;

    // `remove` accepte un lot ; on borne pour ne pas construire une requête
    // démesurée sur la suppression d'une offre à gros volume.
    for (let i = 0; i < chemins.length; i += 100) {
      const lot = chemins.slice(i, i + 100);
      const { data, error } = await admin.storage.from(bucket).remove(lot);
      // Le résultat est VÉRIFIÉ, contrairement à l'ancien code : une suppression
      // de fichiers qui échoue sans le dire est précisément ce qui a produit les
      // orphelins.
      if (error) erreurs.push(`${bucket}: ${error.message}`);
      else supprimes += data?.length ?? lot.length;
    }
  }

  return { supprimes, erreurs };
}

/**
 * URL signée à durée limitée pour un objet d'un bucket privé.
 * `admin` doit être un client service_role : la signature n'est jamais déléguée
 * au navigateur, sans quoi l'appelant pourrait signer n'importe quel chemin.
 * @returns {Promise<string|null>} null si l'objet est introuvable ou la valeur vide.
 */
export async function urlSignee(admin, bucket, urlOuChemin, expiresIn = DUREE_URL_SIGNEE) {
  const chemin = cheminObjet(bucket, urlOuChemin);
  if (!chemin) return null;

  const { data, error } = await admin.storage.from(bucket).createSignedUrl(chemin, expiresIn);
  if (error) {
    // Un fichier absent est un cas courant (suppression manuelle, run de test) :
    // il ne doit pas faire échouer l'affichage de tout le dossier candidat.
    console.error(`urlSignee(${bucket}/${chemin}) :`, error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}
