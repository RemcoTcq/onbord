"use server";

import { createClient } from "@/lib/supabase/server";
import { extraireTexte } from "@/lib/extraireTexte";

// Import d'une offre par fichier (écran de création d'offre). L'extraction vit
// dans lib/extraireTexte.js, partagée avec la base de connaissances.
//
// Réservée à un compte connecté (10/11/2026) : une server action est
// appelable par POST depuis n'importe quelle page publique, et celle-ci
// faisait lire au serveur n'importe quel fichier envoyé par un anonyme.
export async function parseFile(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Session expirée. Reconnectez-vous pour importer un fichier." };

  const file = formData.get("file");
  if (!file) {
    return { success: false, error: "Aucun fichier fourni." };
  }

  try {
    const { texte, code } = await extraireTexte(await file.arrayBuffer(), { type: file.type, name: file.name });
    if (code === "format") {
      return { success: false, error: "Format de fichier non supporté. Veuillez utiliser un PDF, DOCX ou TXT." };
    }
    if (code === "vide") {
      return { success: false, error: "Le fichier semble vide ou le texte n'a pas pu être extrait." };
    }
    return { success: true, text: texte };
  } catch (error) {
    console.error("Erreur lors de l'extraction du fichier:", error);
    return { success: false, error: error.message || "Erreur lors de la lecture du fichier." };
  }
}
