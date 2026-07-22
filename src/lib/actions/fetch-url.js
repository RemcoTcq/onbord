"use server";

/**
 * Fetches a job posting URL server-side (no CORS issues) and extracts plain text.
 * Works well with company career pages and ATS like Greenhouse, Lever, Workable.
 * May fail with LinkedIn/Indeed due to their anti-bot protections.
 *
 * @param {string} url - The URL to fetch
 * @returns {{ success: boolean, text?: string, error?: string }}
 */
export async function fetchJobFromUrl(url) {
  if (!url || !url.trim()) {
    return { success: false, error: "URL manquante." };
  }

  // Basic URL validation
  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { success: false, error: "URL invalide. Utilisez une adresse http:// ou https://." };
    }
  } catch {
    return { success: false, error: "URL invalide. Vérifiez le format (ex: https://careers.acme.com/poste)." };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
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
      redirect: "follow",
    });

    clearTimeout(timeoutId);

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

    const html = await response.text();
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
