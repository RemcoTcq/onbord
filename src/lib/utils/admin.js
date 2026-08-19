/**
 * Droits d'administration.
 *
 * L'ancienne règle était « toute adresse en @onbord.be, plus une adresse Gmail
 * personnelle codée en dur » (audit du 19/08/2026, §6). Deux problèmes : le
 * périmètre admin suivait le carnet d'adresses de l'entreprise — un prestataire,
 * un stagiaire ou un ancien collaborateur disposant d'un alias devenait
 * administrateur sans que personne ne l'ait décidé — et une adresse personnelle
 * vivait dans le code source d'un dépôt distant.
 *
 * La liste est désormais explicite, dans la variable d'environnement
 * ADMIN_EMAILS (adresses séparées par des virgules). Elle se change par
 * environnement, sans redéploiement de code, et retirer un accès consiste à
 * retirer une ligne.
 *
 * ATTENTION — module SERVEUR. `ADMIN_EMAILS` n'est pas préfixée NEXT_PUBLIC_,
 * elle est donc introuvable côté navigateur, où isAdmin() renverrait toujours
 * false. Les écrans qui ont besoin de cette information passent par l'action
 * isCurrentUserAdmin() (lib/actions/usage.js). C'est le bon sens de lecture :
 * la liste des administrateurs n'a rien à faire dans un bundle client.
 *
 * Si ADMIN_EMAILS est absente, personne n'est administrateur. C'est le défaut
 * sûr : une variable oubliée retire des accès, elle n'en accorde pas.
 */
export function isAdmin(user) {
  if (!user || !user.email) return false;

  const autorises = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return autorises.includes(user.email.toLowerCase());
}
