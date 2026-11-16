"use server";

// Library → Personas (migration 040). Les fiches de personnage de
// l'organisation : lister, ouvrir, créer, modifier, supprimer ; proposer une
// fiche à partir d'une description ; et, depuis l'éditeur d'étape, ranger dans
// la bibliothèque le personnage d'une étape. Admin et manager seulement ;
// toutes les écritures en service_role après vérification du rôle.
//
// Depuis le 16/11/2026, une fiche est une PERSONNE (lib/persona.js,
// identitePersona) : nom, entreprise, fonction, qui il est, caractère, langue
// et voix. Ce qui dépend de la situation s'écrit avec chaque simulation.
//
// Rien n'est débité : c'est une brique de l'onboarding (décision du 10/11/2026).

import anthropic from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion, contexteEntreprise } from "@/lib/org";
import { identitePersona } from "@/lib/persona";
import { empreintePersona, rangerFiche } from "@/lib/personas";
import { blocEntreprise } from "@/lib/knowledge";
import { coerceUiLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";

const COLONNES = "id, name, role, company, data, archived_at, created_at, updated_at";

/** Toutes les fiches de l'organisation, les plus récentes d'abord. */
export async function listerPersonas() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data, error } = await createAdminClient().from("personas").select(COLONNES)
      .eq("organization_id", ctx.orgId).order("updated_at", { ascending: false });
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
    return { success: true, persona: { ...data, data: identitePersona(data.data) || data.data } };
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
    const fiche = identitePersona(data);
    if (!fiche) return { success: false, code: "nomManquant" };
    const admin = createAdminClient();
    if (id) {
      const { data: maj, error } = await admin.from("personas").update({
        name: fiche.name, role: fiche.role || null, company: fiche.company || null,
        data: fiche, fingerprint: empreintePersona(fiche), updated_at: new Date().toISOString(), archived_at: null,
      }).eq("id", id).eq("organization_id", ctx.orgId).select(COLONNES).maybeSingle();
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

/**
 * Supprime une fiche pour de bon. Les simulations qui l'utilisaient gardent
 * leur copie du personnage et continuent de se jouer ; elles perdent seulement
 * le lien vers la bibliothèque (modules.persona_id passe à null).
 */
export async function supprimerPersona(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data, error } = await createAdminClient().from("personas")
      .delete().eq("id", id).eq("organization_id", ctx.orgId).select("id");
    if (error) throw error;
    if (!data?.length) return { success: false, error: "Personnage introuvable" };
    return { success: true };
  } catch (error) {
    console.error("supprimerPersona error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Propose une fiche à partir d'une description libre (« DAF d'une PME
 * industrielle gantoise, méfiant envers les SaaS »), en s'appuyant sur ce que
 * l'entreprise sait de ses acheteurs. La langue, l'accent et le genre viennent
 * du formulaire (ils fixent la voix) ; rien n'est enregistré ici.
 * @returns {Promise<{success: boolean, data?: object, code?: string}>}
 */
export async function proposerPersona({ description, language, accent, gender }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (!String(description || "").trim()) return { success: false, code: "descriptionManquante" };
    const admin = createAdminClient();
    const { data: profil } = await admin.from("users").select("ui_locale").eq("id", ctx.user.id).maybeSingle();
    const nomUi = LOCALE_NAMES_FR[coerceUiLocale(profil?.ui_locale)];
    const langue = String(language || "fr").slice(0, 2).toLowerCase();
    const genre = gender === "m" ? "un homme" : "une femme";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1500,
      output_config: { effort: "low" },
      system: "Tu crées des fiches de personnages réalistes pour des simulations de conversations commerciales et de support B2B. Réponds UNIQUEMENT avec un JSON valide.",
      messages: [{
        role: "user",
        content: `CONTEXTE DE L'ENTREPRISE QUI S'ENTRAÎNE (ses clients, son marché) :
${blocEntreprise(await contexteEntreprise(ctx.user.id), { avecModele: true })}

DESCRIPTION DONNÉE PAR LE MANAGER :
${String(description).trim().slice(0, 1500)}

Crée UNE PERSONNE crédible : ${genre}, qui parle ${LOCALE_NAMES_FR[langue] || langue}${accent ? ` (pays : ${accent})` : ""}. Son nom et celui de son entreprise sont cohérents avec ce pays. Son entreprise est un client plausible de l'entreprise ci-dessus, jamais l'entreprise elle-même.

C'est une fiche d'IDENTITÉ, réutilisée dans des situations très différentes : n'y mets AUCUNE situation, aucune objection, aucun besoin du jour. Seulement qui il est.
- "role" : sa fonction exacte.
- "company" : le nom de son entreprise.
- "background" : 2 à 3 phrases — son entreprise (secteur, taille, marché), son parcours, ce qui compte pour lui dans son travail.
- "personality" : 1 à 2 phrases jouables — sa manière de parler et de réagir (direct, pressé, méfiant, chaleureux mais exigeant…). Pas de caricature.
"background" et "personality" sont rédigés en ${nomUi} (le manager les relit).

{"name": "Prénom Nom", "role": "…", "company": "…", "background": "…", "personality": "…"}`,
      }],
    });
    const texte = (response.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    const json = texte.slice(texte.indexOf("{"), texte.lastIndexOf("}") + 1);
    const brut = JSON.parse(json);
    const data = identitePersona({ ...brut, language: langue, accent: accent || null, gender: gender === "m" ? "m" : "f" });
    if (!data) return { success: false, code: "generation" };
    return { success: true, data };
  } catch (error) {
    console.error("proposerPersona error:", error);
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
