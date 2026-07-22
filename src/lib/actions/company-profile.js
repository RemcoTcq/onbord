"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import anthropic from "@/lib/anthropic";

/**
 * Reads the company profile (AI context) for the current user.
 */
export async function getCompanyProfile() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data, error } = await supabase
      .from("users")
      .select("company_website_url, company_ai_context")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return {
      success: true,
      profile: {
        website_url: data?.company_website_url || "",
        description: data?.company_ai_context?.description || "",
        target_market: data?.company_ai_context?.target_market || "",
        industry: data?.company_ai_context?.industry || "",
        domain: data?.company_ai_context?.domain || "",
        recruitment_habits: data?.company_ai_context?.recruitment_habits || "",
        observed_trends: data?.company_ai_context?.observed_trends || "",
      },
    };
  } catch (error) {
    console.error("getCompanyProfile error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves the company profile (AI context fields).
 */
export async function updateCompanyProfile(profileData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { error } = await supabase
      .from("users")
      .update({
        company_website_url: profileData.website_url || null,
        company_ai_context: {
          description: profileData.description || "",
          target_market: profileData.target_market || "",
          industry: profileData.industry || "",
          domain: profileData.domain || "",
          recruitment_habits: profileData.recruitment_habits || "",
          observed_trends: profileData.observed_trends || "",
        },
      })
      .eq("id", user.id);

    if (error) throw error;

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("updateCompanyProfile error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches a company website server-side and uses AI to extract structured context.
 * @param {string} url - The company website URL
 * @returns {{ success: boolean, context?: object, error?: string }}
 */
export async function fetchAndAnalyzeWebsite(url) {
  if (!url || !url.trim()) {
    return { success: false, error: "URL manquante." };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url.trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return { success: false, error: "URL invalide." };
    }
  } catch {
    return { success: false, error: "URL invalide. Vérifiez le format (ex: https://acme.com)." };
  }

  // --- 1. Fetch the website ---
  let rawHtml;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
      },
      redirect: "follow",
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Le site a retourné une erreur (${response.status}). Remplissez les champs manuellement.`,
      };
    }
    rawHtml = await response.text();
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, error: "Le site met trop de temps à répondre. Remplissez les champs manuellement." };
    }
    return { success: false, error: "Impossible d'accéder au site. Remplissez les champs manuellement." };
  }

  // --- 2. Strip HTML to plain text ---
  const text = extractTextFromHtml(rawHtml).substring(0, 6000);

  if (!text || text.trim().length < 50) {
    return {
      success: false,
      error: "Contenu insuffisant sur la page d'accueil. Remplissez les champs manuellement.",
    };
  }

  // --- 3. AI analysis ---
  try {
    const prompt = `Tu es un expert en analyse d'entreprise. Voici le contenu textuel du site web d'une entreprise :

<website_content>
${text}
</website_content>

Analyse ce contenu et extrait les informations suivantes. Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après.

{
  "description": "Description de l'entreprise en 3 à 5 phrases claires : ce qu'elle fait, sa valeur ajoutée, ses produits/services principaux.",
  "target_market": "Le marché cible principal de l'entreprise (ex: PME françaises, grandes entreprises européennes, startups tech, grand public, etc.)",
  "industry": "L'industrie ou le secteur d'activité (ex: SaaS RH, E-commerce, Fintech, Santé digitale, Conseil IT, etc.)",
  "domain": "Le modèle commercial principal (ex: B2B SaaS, B2C, Marketplace, Services professionnels, B2B2C, etc.)"
}

Si une information n'est pas clairement identifiable dans le contenu, laisse la valeur vide "".`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 600,
      temperature: 0.1,
      system: "Tu es un assistant expert en analyse d'entreprises. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{ role: "user", content: prompt }],
    });

    const textResponse = response.content[0].text;
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Réponse IA invalide");

    const context = JSON.parse(jsonMatch[0]);
    return { success: true, context };
  } catch (err) {
    console.error("fetchAndAnalyzeWebsite AI error:", err);
    return {
      success: false,
      error: "L'analyse IA a échoué. Remplissez les champs manuellement ou réessayez.",
    };
  }
}

/**
 * Strips HTML tags and extracts readable text.
 */
function extractTextFromHtml(html) {
  let text = html;
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
  text = text.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, " ");
  text = text.replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, " ");
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, " ");
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");
  text = text.replace(/<\/(p|div|li|h[1-6]|section|article)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");
  text = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
