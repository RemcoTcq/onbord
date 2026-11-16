"use server";

// Company Knowledge : les rubriques (offre, acheteurs, concurrents, marchés,
// comment on vend, fait du support, recrute — migration 045), les notes et les
// documents de l'organisation, lus par tous les générateurs (lib/knowledge.js).
// Admin et manager seulement : ce que la base contient (tarifs, politiques)
// nourrit les simulations, un learner ne le lit pas. Seuls les documents
// ACTIFS servent ; un document mis de côté reste là, prêt à resservir.
//
// Le DÉPÔT d'un fichier se fait depuis le navigateur, dans le dossier de
// l'organisation (policy « knowledge: depot gestion ») : un pitch deck
// dépasse la limite de taille d'une action serveur. Le serveur relit ensuite
// le fichier, en extrait le texte et écrit la ligne. Un fichier dont rien ne
// sort est retiré aussitôt : il ne servirait à aucun générateur.

import anthropic from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";
import { extraireTexte } from "@/lib/extraireTexte";
import { TYPES_DOCUMENT, RUBRIQUES_DU_SITE, normaliserRubriques } from "@/lib/knowledge";
import { fetchSur } from "@/lib/requeteSure";
import { extractTextFromHtml } from "@/lib/texteHtml";
import { coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

const NOTES_MAX = 20_000;
const TEXTE_MAX = 200_000; // le texte stocké ; les générateurs n'en lisent qu'une part
const TAILLE_MAX = 20 * 1024 * 1024; // celle du bucket (migration 039)

export async function getKnowledge() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const [{ data: org }, { data: documents }] = await Promise.all([
      admin.from("organizations").select("website_url, ai_context, knowledge_notes, knowledge_sections").eq("id", ctx.orgId).single(),
      admin.from("knowledge_documents")
        .select("id, title, kind, mime_type, size_bytes, created_at, extracted_text, active")
        .eq("organization_id", ctx.orgId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      success: true,
      orgId: ctx.orgId,
      site: { url: org?.website_url || "", resume: org?.ai_context || {} },
      notes: org?.knowledge_notes || "",
      rubriques: normaliserRubriques(org?.knowledge_sections),
      // Le texte extrait ne repart pas vers le navigateur : seulement sa taille.
      documents: (documents || []).map(({ extracted_text, ...d }) => ({ ...d, caracteres: (extracted_text || "").length })),
    };
  } catch (error) {
    console.error("getKnowledge error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Enregistre les rubriques. Une rubrique absente de l'envoi garde sa valeur. */
export async function saveKnowledgeSections(rubriques) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: org } = await admin.from("organizations").select("knowledge_sections").eq("id", ctx.orgId).single();
    const fusion = normaliserRubriques({ ...(org?.knowledge_sections || {}), ...(rubriques || {}) });
    const { error } = await admin.from("organizations")
      .update({ knowledge_sections: fusion, updated_at: new Date().toISOString() })
      .eq("id", ctx.orgId);
    if (error) throw error;
    return { success: true, rubriques: fusion };
  } catch (error) {
    console.error("saveKnowledgeSections error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Des brouillons des rubriques qui se lisent sur un site : l'offre, les
 * acheteurs types, les concurrents, les marchés. Rien n'est enregistré : le
 * manager relit, corrige, puis enregistre. L'adresse est celle du profil de
 * l'entreprise, ou celle donnée.
 * @returns {Promise<{success: boolean, brouillons?: object, code?: string}>}
 */
export async function brouillonsDuSite(url) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const [{ data: org }, { data: profil }] = await Promise.all([
      admin.from("organizations").select("website_url, ai_context").eq("id", ctx.orgId).single(),
      admin.from("users").select("ui_locale").eq("id", ctx.user.id).maybeSingle(),
    ]);
    const adresse = String(url || org?.website_url || "").trim();
    let cible;
    try {
      cible = new URL(/^https?:\/\//i.test(adresse) ? adresse : `https://${adresse}`);
    } catch {
      return { success: false, code: "url" };
    }
    if (!adresse) return { success: false, code: "url" };

    const controle = new AbortController();
    const minuterie = setTimeout(() => controle.abort(), 12_000);
    let html = "";
    try {
      const sur = await fetchSur(cible, {
        signal: controle.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Onbord/1.0)", Accept: "text/html,application/xhtml+xml" },
      });
      if (!sur.response?.ok) return { success: false, code: "site" };
      html = await sur.response.text();
    } catch {
      return { success: false, code: "site" };
    } finally {
      clearTimeout(minuterie);
    }
    const texte = extractTextFromHtml(html).slice(0, 9000);
    if (texte.length < 50) return { success: false, code: "site" };

    const nom = LOCALE_NAMES_FR[coerceUiLocale(profil?.ui_locale)];
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 3000,
      output_config: { effort: "low" },
      system: "Tu prépares la base de connaissances d'une entreprise B2B pour des simulations de conversations commerciales et de support. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{
        role: "user",
        content: `CE QUE L'ON SAIT DÉJÀ : ${JSON.stringify(org?.ai_context || {})}

TEXTE DU SITE :
<site>
${texte}
</site>

Rédige, en ${nom}, des brouillons que l'entreprise relira. Seulement ce que le site dit ou laisse clairement entendre : n'invente ni prix, ni client, ni concurrent. Une rubrique sur laquelle le site ne dit rien reste une chaîne vide. Phrases courtes ou puces « - ».
- "offre" : les produits ou services, les forfaits et les prix s'ils sont affichés, ce qui différencie l'offre.
- "acheteurs" : les clients visés — secteurs, tailles d'entreprise, fonctions des décideurs et des utilisateurs, leurs problèmes.
- "concurrents" : les alternatives que le site cite ou auxquelles il se compare, et ce qui distingue l'entreprise.
- "marches" : pays et langues servis, implantation.

{"offre": "…", "acheteurs": "…", "concurrents": "…", "marches": "…"}`,
      }],
    });
    const brut = (response.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const json = JSON.parse(brut.slice(brut.indexOf("{"), brut.lastIndexOf("}") + 1));
    const brouillons = {};
    for (const r of RUBRIQUES_DU_SITE) brouillons[r] = String(json?.[r] || "").trim().slice(0, 4000);
    return { success: true, brouillons };
  } catch (error) {
    console.error("brouillonsDuSite error:", error);
    return { success: false, code: "generation" };
  }
}

/** Met un document de côté (ou le remet en service) sans le supprimer. */
export async function setKnowledgeDocumentActive(documentId, active) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data, error } = await createAdminClient().from("knowledge_documents")
      .update({ active: Boolean(active) })
      .eq("id", documentId).eq("organization_id", ctx.orgId).select("id");
    if (error) throw error;
    if (!data?.length) return { success: false, error: "Document introuvable" };
    return { success: true };
  } catch (error) {
    console.error("setKnowledgeDocumentActive error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function saveKnowledgeNotes(notes) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { error } = await createAdminClient()
      .from("organizations")
      .update({ knowledge_notes: String(notes || "").slice(0, NOTES_MAX), updated_at: new Date().toISOString() })
      .eq("id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("saveKnowledgeNotes error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Enregistre un document déjà déposé dans le bucket `knowledge`.
 * @returns {Promise<{success: boolean, code?: "chemin"|"introuvable"|"taille"|"format"|"vide", document?: object}>}
 */
export async function addKnowledgeDocument({ path, title, kind }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };

    // Le chemin vient du navigateur : il doit être dans le dossier de
    // l'organisation, sans remontée.
    const prefixe = `${ctx.orgId}/`;
    if (typeof path !== "string" || !path.startsWith(prefixe) || path.includes("..") || path.slice(prefixe.length).includes("/")) {
      return { success: false, code: "chemin" };
    }
    const admin = createAdminClient();
    const { data: fichier, error: dlErr } = await admin.storage.from("knowledge").download(path);
    if (dlErr || !fichier) return { success: false, code: "introuvable" };
    if (fichier.size > TAILLE_MAX) {
      await admin.storage.from("knowledge").remove([path]);
      return { success: false, code: "taille" };
    }

    const nomFichier = path.slice(prefixe.length);
    const { texte, code } = await extraireTexte(await fichier.arrayBuffer(), { type: fichier.type, name: nomFichier });
    if (!texte) {
      await admin.storage.from("knowledge").remove([path]);
      return { success: false, code };
    }

    const { data: doc, error } = await admin.from("knowledge_documents").insert({
      organization_id: ctx.orgId,
      title: String(title || nomFichier).trim().slice(0, 160) || nomFichier,
      kind: TYPES_DOCUMENT.includes(kind) ? kind : "other",
      storage_path: path,
      mime_type: fichier.type || null,
      size_bytes: fichier.size,
      extracted_text: texte.slice(0, TEXTE_MAX),
      created_by: ctx.user.id,
    }).select("id, title, kind, mime_type, size_bytes, created_at, active").single();
    if (error) throw error;
    return { success: true, document: { ...doc, caracteres: Math.min(texte.length, TEXTE_MAX) } };
  } catch (error) {
    console.error("addKnowledgeDocument error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function deleteKnowledgeDocument(documentId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: doc } = await admin
      .from("knowledge_documents").select("id, storage_path")
      .eq("id", documentId).eq("organization_id", ctx.orgId).maybeSingle();
    if (!doc) return { success: false, error: "Document introuvable" };
    await admin.storage.from("knowledge").remove([doc.storage_path]);
    const { error } = await admin.from("knowledge_documents").delete().eq("id", doc.id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("deleteKnowledgeDocument error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
