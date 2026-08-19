// Limitation de débit sur les points d'entrée ouverts.
//
// Aucune limite n'existait (audit du 19/08/2026, §4) : l'assistant IA candidat,
// la transcription AssemblyAI, la candidature publique et la réclamation
// d'invitation étaient tous appelables en rafale. Le plafond de messages de
// l'assistant est un plafond PAR RUN, pas par unité de temps — il ne protège
// ni la facture IA ni la base.
//
// Compteur EN MÉMOIRE, fenêtre glissante. C'est un choix assumé, avec une limite
// qu'il faut connaître : en hébergement serverless, chaque instance a son propre
// compteur, donc la limite réelle vaut (seuil × nombre d'instances actives). Cela
// coupe l'abus automatisé depuis une source unique — le cas qui fait exploser la
// facture — sans prétendre à un quota exact. Un compteur partagé (Redis/Upstash)
// serait le pas suivant, mais il ajoute une dépendance et un service à exploiter ;
// ce garde-fou-ci ne coûte rien et ferme la porte dès maintenant.

const compteurs = new Map();

// Purge des fenêtres expirées : sans elle, la Map grossit indéfiniment sur une
// instance à longue durée de vie (un tour par appel suffit, il n'y a pas de
// volumétrie ici).
let dernierNettoyage = Date.now();
function nettoyer(maintenant) {
  if (maintenant - dernierNettoyage < 60_000) return;
  dernierNettoyage = maintenant;
  for (const [cle, horodatages] of compteurs) {
    if (!horodatages.length || horodatages[horodatages.length - 1] < maintenant - 3_600_000) {
      compteurs.delete(cle);
    }
  }
}

/**
 * Consomme un jeton pour `cle`. À appeler UNE fois par requête à limiter.
 * @param {string} cle identifiant de la fenêtre (préfixe + IP, ou préfixe + token)
 * @param {number} max nombre d'appels autorisés dans la fenêtre
 * @param {number} fenetreMs durée de la fenêtre en millisecondes
 * @returns {{autorise: boolean, restant: number, resetDans: number}} resetDans en secondes
 */
export function consommer(cle, max, fenetreMs) {
  const maintenant = Date.now();
  nettoyer(maintenant);

  const debut = maintenant - fenetreMs;
  const horodatages = (compteurs.get(cle) || []).filter((t) => t > debut);

  if (horodatages.length >= max) {
    compteurs.set(cle, horodatages);
    return {
      autorise: false,
      restant: 0,
      resetDans: Math.ceil((horodatages[0] + fenetreMs - maintenant) / 1000),
    };
  }

  horodatages.push(maintenant);
  compteurs.set(cle, horodatages);
  return { autorise: true, restant: max - horodatages.length, resetDans: Math.ceil(fenetreMs / 1000) };
}

/**
 * IP de l'appelant, derrière le proxy de l'hébergeur.
 * `x-forwarded-for` est une liste ; la PREMIÈRE entrée est le client d'origine.
 * En-tête falsifiable dans l'absolu, mais réécrit par Vercel — et de toute
 * façon, mieux vaut une clé imparfaite que pas de limite du tout.
 */
export function ipDe(headers) {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "ip-inconnue";
}

// Seuils, par usage. Chacun est calé sur l'usage HUMAIN maximal plausible, avec
// une marge : il s'agit de couper l'automatisation, pas de gêner un candidat.
export const SEUILS = {
  // Un candidat qui discute vraiment avec l'assistant envoie un message toutes
  // les quelques dizaines de secondes.
  assistantParToken: { max: 12, fenetre: 60_000 },
  assistantParIp: { max: 30, fenetre: 60_000 },

  // Une transcription par réponse vidéo enregistrée ; 5/min laisse de la place
  // aux reprises après échec réseau.
  transcriptionParToken: { max: 5, fenetre: 60_000 },
  transcriptionParIp: { max: 20, fenetre: 60_000 },

  // Postuler est un acte rare. 5 par heure et par IP laisse passer une famille
  // ou un cybercafé, et arrête net la création massive de candidats.
  candidatureParIp: { max: 5, fenetre: 3_600_000 },

  // Réclamation d'invitation : brute force du token d'invitation.
  invitationParIp: { max: 10, fenetre: 3_600_000 },
};
