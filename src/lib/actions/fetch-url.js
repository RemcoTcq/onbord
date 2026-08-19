"use server";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@/lib/supabase/server";

// Cette action fait émettre une requête HTTP PAR LE SERVEUR vers une adresse
// fournie par l'appelant, et lui en renvoie le contenu : c'est la définition
// d'une SSRF si elle n'est pas bridée. Elle ne l'était pas (audit du 19/08/2026,
// §5) — ni authentification, ni filtrage de destination, redirections suivies
// aveuglément. Une server action est invocable par POST depuis n'importe quelle
// route publique de l'application (/apply, /join) : elle était donc offerte à
// des anonymes, qui pouvaient lire la réponse de n'importe quel service interne.
//
// Trois verrous, tous nécessaires :
//   1. session recruteur obligatoire (le seul appelant réel est l'écran de
//      création d'offre) ;
//   2. destination vérifiée APRÈS résolution DNS — un nom public peut pointer
//      vers 127.0.0.1 ou 169.254.169.254 ;
//   3. redirections suivies à la main, chaque saut revalidé : sans cela, un
//      hôte public répondant « 302 vers http://169.254.169.254/ » contourne
//      entièrement le point 2.
//
// Pas de liste blanche de domaines : l'usage réel est de coller l'URL d'une page
// carrière quelconque (Greenhouse, Lever, Workable, site propre de l'entreprise).
// Une liste fermée rendrait la fonction inutile.

const MAX_REDIRECTIONS = 3;
const TAILLE_MAX = 2 * 1024 * 1024; // 2 Mo de HTML : au-delà, ce n'est pas une offre.

/** Une adresse IP appartient-elle à une plage privée, locale ou de métadonnées ? */
function ipInterdite(ip) {
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
 * Valide une URL et la résout en IP. Renvoie { ok } ou { erreur }.
 * La résolution DNS est le cœur du contrôle : le nom d'hôte ne dit rien.
 */
async function destinationAutorisee(parsedUrl) {
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { erreur: "URL invalide. Utilisez une adresse http:// ou https://." };
  }

  const hote = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  // Noms locaux qui ne passent parfois même pas par le résolveur.
  if (/^(localhost|.*\.localhost|.*\.local|.*\.internal|metadata\.google\.internal)$/i.test(hote)) {
    return { erreur: "Cette adresse pointe vers le réseau interne et ne peut pas être chargée." };
  }

  let adresses;
  if (isIP(hote)) {
    adresses = [{ address: hote }];
  } else {
    try {
      adresses = await lookup(hote, { all: true });
    } catch {
      return { erreur: "Nom de domaine introuvable. Vérifiez l'URL." };
    }
  }

  // Une seule adresse interdite suffit à refuser : un nom peut résoudre vers
  // plusieurs IP et le client choisirait ensuite librement.
  if (!adresses.length || adresses.some((a) => ipInterdite(a.address))) {
    return { erreur: "Cette adresse pointe vers le réseau interne et ne peut pas être chargée." };
  }

  return { ok: true };
}

/**
 * Fetches a job posting URL server-side (no CORS issues) and extracts plain text.
 * Works well with company career pages and ATS like Greenhouse, Lever, Workable.
 * May fail with LinkedIn/Indeed due to their anti-bot protections.
 *
 * Réservée aux recruteurs authentifiés (cf. commentaire en tête de fichier).
 *
 * @param {string} url - The URL to fetch
 * @returns {{ success: boolean, text?: string, error?: string }}
 */
export async function fetchJobFromUrl(url) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Session expirée. Reconnectez-vous pour importer une offre." };
  }

  if (!url || !url.trim()) {
    return { success: false, error: "URL manquante." };
  }

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
  } catch {
    return { success: false, error: "URL invalide. Vérifiez le format (ex: https://careers.acme.com/poste)." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    // Redirections suivies à la main : chaque saut est revalidé avant d'être
    // pris. `redirect: "manual"` est ce qui rend ce contrôle possible.
    let response;
    let cible = parsedUrl;
    try {
      for (let saut = 0; ; saut++) {
        const verdict = await destinationAutorisee(cible);
        if (verdict.erreur) {
          clearTimeout(timeoutId);
          return { success: false, error: verdict.erreur };
        }

        response = await fetch(cible.toString(), {
          signal: controller.signal,
          redirect: "manual",
          headers: {
            // Mimic a real browser to avoid simple bot detection
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        const emplacement = response.headers.get("location");
        if (![301, 302, 303, 307, 308].includes(response.status) || !emplacement) break;

        if (saut >= MAX_REDIRECTIONS) {
          clearTimeout(timeoutId);
          return { success: false, error: "Trop de redirections. Copiez-collez le texte de l'offre directement." };
        }
        cible = new URL(emplacement, cible);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        return {
          success: false,
          error:
            "Accès refusé par le site (erreur 403). Cette page est protégée contre le chargement externe. Copiez-collez le texte de l'offre directement.",
        };
      }
      if (response.status === 404) {
        return { success: false, error: "Page introuvable (404). Vérifiez que le lien est correct." };
      }
      return {
        success: false,
        error: `Le site a retourné une erreur (${response.status}). Copiez-collez le texte de l'offre directement.`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return {
        success: false,
        error: "Le lien ne pointe pas vers une page web. Vérifiez l'URL et réessayez.",
      };
    }

    // Plafond de taille : sans lui, une URL pointant vers un gros fichier fait
    // gonfler la mémoire du serveur autant que l'appelant le souhaite.
    const annonce = Number(response.headers.get("content-length") || 0);
    if (annonce > TAILLE_MAX) {
      return { success: false, error: "Cette page est trop volumineuse. Copiez-collez le texte de l'offre directement." };
    }

    const html = (await response.text()).slice(0, TAILLE_MAX);
    const text = extractTextFromHtml(html);

    if (!text || text.trim().length < 100) {
      return {
        success: false,
        error:
          "Impossible d'extraire le contenu de cette page. Elle est peut-être générée dynamiquement (JavaScript). Copiez-collez le texte de l'offre directement.",
      };
    }

    // Limit to ~8000 chars to avoid token overload in the AI analysis
    const truncated = text.trim().substring(0, 8000);
    return { success: true, text: truncated };
  } catch (err) {
    if (err.name === "AbortError") {
      return {
        success: false,
        error: "La page met trop de temps à répondre (timeout). Vérifiez l'URL ou copiez-collez le texte.",
      };
    }
    console.error("fetchJobFromUrl error:", err);
    return {
      success: false,
      error: "Impossible de charger cette page. Vérifiez l'URL ou copiez-collez le texte de l'offre directement.",
    };
  }
}

/**
 * Extracts readable text from raw HTML.
 * Removes scripts, styles, nav, header, footer, and cleans up whitespace.
 */
function extractTextFromHtml(html) {
  let text = html;

  // Remove <script> blocks
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  // Remove <style> blocks
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  // Remove <noscript> blocks
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
  // Remove <nav> blocks
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");
  // Remove <header> blocks
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ");
  // Remove <footer> blocks
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");
  // Remove SVG
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");

  // Replace block-level tags with newlines for readability
  text = text.replace(/<\/(p|div|li|h[1-6]|section|article|tr|td|th)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&#\d+;/g, " ");

  // Collapse multiple whitespace / newlines
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
