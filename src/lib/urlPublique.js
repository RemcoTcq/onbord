// La racine des liens envoyés PAR E-MAIL (18/11/2026) — module PUR.
//
// Les invitations d'équipe et les e-mails « nouvelles simulations » sont partis
// avec des liens http://localhost:3000 (Remco, 18/11) : NEXT_PUBLIC_APP_URL
// absente, ou réglée sur localhost parce que l'invitation partait de l'app
// locale. Or il n'y a qu'UNE base, la production : le jeton d'une invitation
// envoyée depuis le local est valable sur app.onbord.be, et un destinataire ne
// peut de toute façon rien faire d'un lien vers la machine de quelqu'un
// d'autre. Un lien envoyé par e-mail ouvre donc TOUJOURS l'application
// publique — la variable sert seulement à viser un autre domaine public
// (préproduction).

export const URL_PRODUCTION = "https://app.onbord.be";

const LOCALE = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i;

export function urlPublique(valeur = process.env.NEXT_PUBLIC_APP_URL) {
  const url = String(valeur || "").trim().replace(/\/+$/, "");
  return url && !LOCALE.test(url) ? url : URL_PRODUCTION;
}
