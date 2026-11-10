// Requêtes HTTP émises PAR LE SERVEUR vers une adresse fournie par un
// utilisateur — module SERVEUR, sans "use server" (rien ici ne doit devenir
// une action appelable depuis un navigateur).
//
// C'est la définition d'une SSRF si rien ne bride la destination (audit du
// 19/08/2026, §5). Les deux fonctions de contrôle vivaient dans
// actions/fetch-url.js (import d'une offre par URL) ; l'analyse du site web de
// l'entreprise (actions/company-profile.js) téléchargeait, elle, n'importe
// quelle adresse en suivant les redirections à l'aveugle (audit du
// 10/11/2026, S1). Les deux passent maintenant par ici.
//
// Trois verrous, tous nécessaires :
//   1. destination vérifiée APRÈS résolution DNS — un nom public peut pointer
//      vers 127.0.0.1 ou 169.254.169.254 ;
//   2. une seule adresse interdite suffit à refuser (un nom peut en résoudre
//      plusieurs, et le client choisirait ensuite librement) ;
//   3. redirections suivies à la main, chaque saut revalidé.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Une adresse IP appartient-elle à une plage privée, locale ou de métadonnées ? */
export function ipInterdite(ip) {
  const v = isIP(ip);

  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||                          // 0.0.0.0/8
      a === 10 ||                         // privé
      a === 127 ||                        // loopback
      (a === 169 && b === 254) ||         // link-local + métadonnées cloud (169.254.169.254)
      (a === 172 && b >= 16 && b <= 31) || // privé
      (a === 192 && b === 168) ||         // privé
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 192 && b === 0) ||           // IETF
      a >= 224                            // multicast + réservé
    );
  }

  if (v === 6) {
    const ipv6 = ip.toLowerCase();
    // ::1 (loopback), fc00::/7 (unique local), fe80::/10 (link-local), :: (indéterminé)
    if (ipv6 === "::1" || ipv6 === "::") return true;
    if (/^f[cd]/.test(ipv6)) return true;
    if (/^fe[89ab]/.test(ipv6)) return true;
    // ::ffff:127.0.0.1 — IPv4 encapsulée
    const v4 = ipv6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) return ipInterdite(v4[1]);
    return false;
  }

  return true; // ni IPv4 ni IPv6 : on refuse par défaut
}

/**
 * Valide une URL et la résout en IP. Renvoie { ok } ou { erreur, code }.
 * La résolution DNS est le cœur du contrôle : le nom d'hôte ne dit rien.
 * `code` : interne | introuvable | protocole (pour les écrans qui traduisent).
 */
export async function destinationAutorisee(parsedUrl) {
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { code: "protocole", erreur: "URL invalide. Utilisez une adresse http:// ou https://." };
  }

  const hote = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  // Noms locaux qui ne passent parfois même pas par le résolveur.
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(hote)) {
    return { code: "interne", erreur: "Cette adresse pointe vers le réseau interne et ne peut pas être chargée." };
  }

  let adresses;
  if (isIP(hote)) {
    adresses = [{ address: hote }];
  } else {
    try {
      adresses = await lookup(hote, { all: true });
    } catch {
      return { code: "introuvable", erreur: "Nom de domaine introuvable. Vérifiez l'URL." };
    }
  }

  if (!adresses.length || adresses.some((a) => ipInterdite(a.address))) {
    return { code: "interne", erreur: "Cette adresse pointe vers le réseau interne et ne peut pas être chargée." };
  }

  return { ok: true };
}

/**
 * `fetch` avec les trois verrous. Renvoie { response } ou { code } :
 * interne | introuvable | protocole | redirections.
 * Les exceptions réseau (dont l'abandon par `signal`) remontent telles quelles.
 */
export async function fetchSur(url, { signal, headers, maxRedirections = 3 } = {}) {
  let cible = url instanceof URL ? url : new URL(url);
  for (let saut = 0; ; saut++) {
    const verdict = await destinationAutorisee(cible);
    if (!verdict.ok) return { code: verdict.code };

    const response = await fetch(cible.toString(), { signal, redirect: "manual", headers });
    const emplacement = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !emplacement) return { response };
    if (saut >= maxRedirections) return { code: "redirections" };
    cible = new URL(emplacement, cible);
  }
}
