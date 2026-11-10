"use server";

// Company Knowledge (phase 1 de l'onboarding) : les notes et les documents de
// l'organisation, lus par tous les générateurs (lib/knowledge.js, migration
// 039). Admin et manager seulement : ce que la base contient (tarifs,
// objections, politiques) nourrit les simulations, un learner ne le lit pas.
//
// Le DÉPÔT d'un fichier se fait depuis le navigateur, dans le dossier de
// l'organisation (policy « knowledge: depot gestion ») : un pitch deck
// dépasse la limite de taille d'une action serveur. Le serveur relit ensuite
// le fichier, en extrait le texte et écrit la ligne. Un fichier dont rien ne
// sort est retiré aussitôt : il ne servirait à aucun générateur.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";
import { extraireTexte } from "@/lib/extraireTexte";
import { TYPES_DOCUMENT } from "@/lib/knowledge";

const NOTES_MAX = 20_000;
const TEXTE_MAX = 200_000; // le texte stocké ; les générateurs n'en lisent qu'une part
const TAILLE_MAX = 20 * 1024 * 1024; // celle du bucket (migration 039)

export async function getKnowledge() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const [{ data: org }, { data: documents }] = await Promise.all([
      admin.from("organizations").select("website_url, ai_context, knowledge_notes").eq("id", ctx.orgId).single(),
      admin.from("knowledge_documents")
        .select("id, title, kind, mime_type, size_bytes, created_at, extracted_text")
        .eq("organization_id", ctx.orgId)
        .order("created_at", { ascending: false }),
    ]);
    return {
      success: true,
      orgId: ctx.orgId,
      site: { url: org?.website_url || "", resume: org?.ai_context || {} },
      notes: org?.knowledge_notes || "",
      // Le texte extrait ne repart pas vers le navigateur : seulement sa taille.
      documents: (documents || []).map(({ extracted_text, ...d }) => ({ ...d, caracteres: (extracted_text || "").length })),
    };
  } catch (error) {
    console.error("getKnowledge error:", error);
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
    }).select("id, title, kind, mime_type, size_bytes, created_at").single();
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
