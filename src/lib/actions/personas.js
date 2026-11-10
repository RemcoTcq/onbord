"use server";

// Library → Personas (phase 1 de l'onboarding, migration 040). Les fiches de
// personnage de l'organisation : lister, ouvrir, modifier, générer à partir
// d'une phrase, archiver ; et, depuis l'éditeur d'étape, prendre une fiche de
// la bibliothèque ou y ranger celle de l'étape. Admin et manager seulement ;
// toutes les écritures en service_role après vérification du rôle.
//
// La génération d'une fiche ne débite aucun crédit : c'est une brique de
// l'onboarding (décision de Remco du 10/11/2026, docs/PLAN.md).

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion, contexteEntreprise } from "@/lib/org";
import { normaliserPersona, MODES_PERSONA } from "@/lib/persona";
import { empreintePersona, rangerFiche } from "@/lib/personas";
import { genererPersonaLibre } from "@/lib/experienceGeneration";
import { coerceExperienceLocale, coerceUiLocale } from "@/lib/i18n/config";

const COLONNES = "id, name, role, company, data, archived_at, created_at, updated_at";

export async function listerPersonas({ archives = false } = {}) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    let q = createAdminClient().from("personas").select(COLONNES)
      .eq("organization_id", ctx.orgId).order("updated_at", { ascending: false });
    q = archives ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    const { data, error } = await q;
    if (error) throw error;
    return { success: true, personas: data || [] };
  } catch (error) {
    console.error("listerPersonas error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function getPersona(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data } = await createAdminClient().from("personas").select(COLONNES)
      .eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!data) return { success: false, error: "Personnage introuvable" };
    return { success: true, persona: data };
  } catch (error) {
    console.error("getPersona error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée (`id` absent) ou met à jour une fiche. Les simulations qui l'utilisent
 * gardent LEUR copie : elles ne changent pas sans qu'on le leur demande.
 */
export async function enregistrerPersona({ id, data }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const fiche = normaliserPersona(data);
    if (!fiche) return { success: false, code: "nomManquant" };
    const admin = createAdminClient();
    const champs = {
      name: fiche.name, role: fiche.role || null, company: fiche.company || null,
      data: fiche, fingerprint: empreintePersona(fiche), updated_at: new Date().toISOString(),
    };
    if (id) {
      const { data: maj, error } = await admin.from("personas").update(champs)
        .eq("id", id).eq("organization_id", ctx.orgId).select(COLONNES).maybeSingle();
      // Une fiche identique existe déjà (même empreinte) : on le dit.
      if (error?.code === "23505") return { success: false, code: "doublon" };
      if (error) throw error;
      if (!maj) return { success: false, error: "Personnage introuvable" };
      return { success: true, persona: maj };
    }
    const nouvelId = await rangerFiche(admin, { organizationId: ctx.orgId, data: fiche, userId: ctx.user.id });
    if (!nouvelId) throw new Error("création impossible");
    const { data: cree } = await admin.from("personas").select(COLONNES).eq("id", nouvelId).single();
    return { success: true, persona: cree };
  } catch (error) {
    console.error("enregistrerPersona error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function archiverPersona(id, archiver = true) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { error } = await createAdminClient().from("personas")
      .update({ archived_at: archiver ? new Date().toISOString() : null })
      .eq("id", id).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("archiverPersona error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Génère une fiche à partir d'une phrase (la situation), pour un rôle et une
 * langue, avec le Company Knowledge de l'organisation. Elle est rangée dans la
 * bibliothèque et reste entièrement modifiable.
 */
export async function genererPersona({ brief, role, mode, langue }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (!String(brief || "").trim()) return { success: false, code: "briefManquant" };
    const admin = createAdminClient();
    const { data: profil } = await admin.from("users").select("ui_locale").eq("id", ctx.user.id).maybeSingle();

    const res = await genererPersonaLibre({
      brief: String(brief).trim().slice(0, 1500),
      role: String(role || "").trim().slice(0, 160),
      mode: MODES_PERSONA.includes(mode) ? mode : "call",
      locale: coerceExperienceLocale(langue),
      uiLocale: coerceUiLocale(profil?.ui_locale),
      companyContext: await contexteEntreprise(ctx.user.id),
    });
    if (!res.success) return { success: false, code: "generation" };

    const id = await rangerFiche(admin, { organizationId: ctx.orgId, data: res.persona, userId: ctx.user.id });
    const { data: cree } = await admin.from("personas").select(COLONNES).eq("id", id).single();
    return { success: true, persona: cree };
  } catch (error) {
    console.error("genererPersona error:", error);
    return { success: false, code: "generation" };
  }
}

/** Range le personnage d'une étape dans la bibliothèque (bouton de l'éditeur). */
export async function rangerPersonaEtape(data) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const id = await rangerFiche(createAdminClient(), { organizationId: ctx.orgId, data, userId: ctx.user.id });
    if (!id) return { success: false, code: "nomManquant" };
    return { success: true, id };
  } catch (error) {
    console.error("rangerPersonaEtape error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
