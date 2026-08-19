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
