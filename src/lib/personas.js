// Bibliothèque de personnages — module SERVEUR, sans "use server" (phase 1
// de l'onboarding, migration 040).
//
// Une fiche de `personas` est un personnage de l'ORGANISATION, réutilisable.
// L'étape d'une simulation en garde sa COPIE (`config.persona`, la version
// figée que joue le candidat) et le LIEN (`config.persona_id`). Ce module range
// les personnages d'une simulation dans la bibliothèque après une génération,
// pour qu'un personnage généré soit aussitôt réutilisable.

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { normaliserPersona } from "@/lib/persona";

/** Empreinte d'une fiche : la même fiche n'entre qu'une fois par organisation. */
export function empreintePersona(data) {
  return createHash("md5").update(JSON.stringify(data || {})).digest("hex");
}

/**
 * Range une fiche dans la bibliothèque, ou retrouve celle qui existe déjà à
 * l'identique. Renvoie son identifiant.
 */
export async function rangerFiche(admin, { organizationId, data, userId }) {
  const fiche = normaliserPersona(data);
  if (!fiche || !organizationId) return null;
  const fingerprint = empreintePersona(fiche);
  const { data: existante } = await admin
    .from("personas").select("id")
    .eq("organization_id", organizationId).eq("fingerprint", fingerprint).maybeSingle();
  if (existante) return existante.id;
  const { data: creee, error } = await admin.from("personas").insert({
    organization_id: organizationId,
    name: fiche.name,
    role: fiche.role || null,
    company: fiche.company || null,
    data: fiche,
    fingerprint,
    created_by: userId || null,
  }).select("id").single();
  if (error) {
    // Course entre deux rangements de la même fiche : l'autre a gagné.
    const { data: autre } = await admin
      .from("personas").select("id")
      .eq("organization_id", organizationId).eq("fingerprint", fingerprint).maybeSingle();
    return autre?.id || null;
  }
  return creee.id;
}

/**
 * Après une génération ou une réécriture : chaque étape « persona » de la
 * simulation qui n'a pas encore de lien reçoit sa fiche de bibliothèque. Non
 * bloquant : une bibliothèque qui manque (migration 040 pas passée) ne casse
 * pas la génération.
 */
export async function rangerPersonasDeLaSimulation(experienceId, userId) {
  try {
    const admin = createAdminClient();
    const { data: exp } = await admin.from("experiences").select("organization_id").eq("id", experienceId).maybeSingle();
    if (!exp?.organization_id) return;
    const { data: steps } = await admin
      .from("experience_steps").select("id, config")
      .eq("experience_id", experienceId);
    for (const s of steps || []) {
      if (!s.config?.persona || s.config.persona_id) continue;
      const id = await rangerFiche(admin, { organizationId: exp.organization_id, data: s.config.persona, userId });
      if (id) await admin.from("experience_steps").update({ config: { ...s.config, persona_id: id } }).eq("id", s.id);
    }
  } catch (err) {
    console.error("rangerPersonasDeLaSimulation:", experienceId, err);
  }
}
