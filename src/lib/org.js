// L'organisation du compte connecté — module SERVEUR.
//
// Depuis la migration 035, l'entreprise n'est plus une poignée de colonnes de
// `users` mais une ligne de `organizations`, dont plusieurs comptes sont
// membres avec un rôle :
//
//   admin    tout, y compris l'équipe et les réglages de l'organisation
//   manager  le recrutement et l'onboarding, pas l'équipe
//   learner  son propre entraînement, rien d'autre
//
// ⚠️ « admin » ici est le rôle CLIENT, dans son organisation. Le mot seul
// désigne ailleurs l'équipe Onbord (ADMIN_EMAILS, /admin, utils/admin.js).
// Dans le code, le rôle client s'appelle toujours `orgRole`.
//
// Tout ce qui a besoin de « qui est connecté, dans quelle entreprise, avec quel
// droit » passe par getOrgContext() : une seule lecture, et un seul endroit où
// le repli et l'auto-réparation vivent.

import { createClient, createAdminClient } from "@/lib/supabase/server";

export const ROLES = ["admin", "manager", "learner"];
export const ROLES_GESTION = ["admin", "manager"];

export { MOT_DE_PASSE_MIN } from "@/lib/constants/comptes";

const COLONNES_ORG =
  "id, name, website_url, ai_context, logo_url, brand_primary_color, brand_secondary_color, created_by, legacy_user_id";

/**
 * Crée l'organisation d'un compte qui n'en a pas, à partir de ses colonnes
 * company_* d'avant, et l'en fait admin. Rattache ses offres et simulations.
 *
 * Deux cas : un compte créé par l'ancien code (avant le déploiement de la
 * branche, `adminCreerCompte` ne créait pas d'organisation), et la sécurité
 * d'un compte dont la ligne d'appartenance aurait disparu. Un learner invité,
 * lui, est TOUJOURS créé avec son appartenance : il ne passe jamais ici.
 */
async function creerOrganisationPour(admin, userId) {
  const { data: profil } = await admin
    .from("users")
    .select("company_name, company_website_url, company_ai_context, company_logo_url, brand_primary_color, brand_secondary_color")
    .eq("id", userId)
    .maybeSingle();

  // `legacy_user_id` est unique : deux requêtes simultanées ne créent qu'une
  // organisation, la seconde la relit.
  const { data: creee } = await admin
    .from("organizations")
    .upsert({
      name: profil?.company_name || null,
      website_url: profil?.company_website_url || null,
      ai_context: profil?.company_ai_context || {},
      logo_url: profil?.company_logo_url || null,
      brand_primary_color: profil?.brand_primary_color || null,
      brand_secondary_color: profil?.brand_secondary_color || null,
      created_by: userId,
      legacy_user_id: userId,
    }, { onConflict: "legacy_user_id", ignoreDuplicates: false })
    .select("id")
    .single();
  if (!creee) return null;

  await admin
    .from("organization_members")
    .upsert({ organization_id: creee.id, user_id: userId, role: "admin" }, { onConflict: "user_id", ignoreDuplicates: true });
  await admin.from("jobs").update({ organization_id: creee.id }).eq("user_id", userId).is("organization_id", null);
  return creee.id;
}

/**
 * Le contexte du compte connecté, ou null s'il n'y a pas de session.
 *
 * @returns {Promise<null | {
 *   user: object, supabase: object,
 *   orgId: string, orgRole: "admin"|"manager"|"learner",
 *   org: object, billingUserId: string,
 *   peutGerer: boolean, estAdminOrg: boolean
 * }>}
 */
export async function getOrgContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  let { data: membre } = await admin
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membre) {
    const orgId = await creerOrganisationPour(admin, user.id);
    if (!orgId) return null;
    membre = { organization_id: orgId, role: "admin" };
  }

  const { data: org } = await admin
    .from("organizations")
    .select(COLONNES_ORG)
    .eq("id", membre.organization_id)
    .single();

  return {
    user,
    supabase,
    orgId: membre.organization_id,
    orgRole: membre.role,
    org: org || { id: membre.organization_id },
    // Les crédits restent ceux d'UN compte (utils/limits.js n'est pas
    // modifié, la facturation est hors périmètre) : celui qui a créé
    // l'organisation. Un manager invité consomme donc le solde de
    // l'entreprise, pas un solde à lui.
    billingUserId: org?.created_by || org?.legacy_user_id || user.id,
    peutGerer: ROLES_GESTION.includes(membre.role),
    estAdminOrg: membre.role === "admin",
  };
}

/**
 * Pour les actions du recrutement et de la gestion de l'onboarding : un admin
 * ou un manager. Renvoie le contexte, ou `{ erreur }` à renvoyer tel quel.
 */
export async function exigerGestion() {
  const ctx = await getOrgContext();
  if (!ctx) return { erreur: "Non authentifié" };
  if (!ctx.peutGerer) return { erreur: "Accès refusé" };
  return ctx;
}

/** Pour l'équipe et les réglages de l'organisation : un admin seulement. */
export async function exigerAdminOrg() {
  const ctx = await getOrgContext();
  if (!ctx) return { erreur: "Non authentifié" };
  if (!ctx.estAdminOrg) return { erreur: "Accès refusé" };
  return ctx;
}

/**
 * L'image de marque montrée au CANDIDAT, dans la forme que le parcours lit
 * depuis toujours (`company_name`, `company_logo_url`, `brand_primary_color`,
 * `brand_secondary_color`). Lue en service_role : le candidat est anonyme.
 * Liste de champs ÉCRITE ICI, comme `getPublicJobAndBranding` : rien d'autre
 * de l'organisation ne sort. Repli sur les colonnes de `users` pour une offre
 * encore sans organisation.
 */
export async function brandingPublic(admin, { organizationId, userId }) {
  if (organizationId) {
    const { data: org } = await admin
      .from("organizations")
      .select("name, logo_url, brand_primary_color, brand_secondary_color")
      .eq("id", organizationId)
      .maybeSingle();
    if (org) {
      return {
        company_name: org.name || null,
        company_logo_url: org.logo_url || null,
        brand_primary_color: org.brand_primary_color || null,
        brand_secondary_color: org.brand_secondary_color || null,
      };
    }
  }
  if (!userId) return null;
  const { data } = await admin
    .from("users")
    .select("company_name, company_logo_url, brand_primary_color, brand_secondary_color")
    .eq("id", userId)
    .maybeSingle();
  return data || null;
}

/**
 * Le compte qui porte les crédits d'une organisation, quand on ne part pas
 * d'une session (scoring, démarrage d'un candidat : serveur, service_role).
 * Repli sur `userId` si l'organisation est inconnue : c'est le comportement
 * d'avant la migration 035.
 */
export async function compteFacturationDeOrg(organizationId, userId) {
  if (!organizationId) return userId;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("created_by, legacy_user_id")
    .eq("id", organizationId)
    .maybeSingle();
  return data?.created_by || data?.legacy_user_id || userId;
}

/**
 * Le contexte d'entreprise que lisent les générateurs (analyse du site,
 * `ai_context`), celui de l'ORGANISATION du membre. Repli sur l'ancienne
 * colonne `users.company_ai_context`. C'est le point d'entrée unique que la
 * phase 1 étend au Company Knowledge (documents et notes).
 */
export async function contexteEntreprise(userId) {
  if (!userId) return {};
  const admin = createAdminClient();
  const { data: membre } = await admin
    .from("organization_members")
    .select("organizations(ai_context)")
    .eq("user_id", userId)
    .maybeSingle();
  const duOrg = membre?.organizations?.ai_context;
  if (duOrg && Object.keys(duOrg).length) return duOrg;
  const { data: profil } = await admin.from("users").select("company_ai_context").eq("id", userId).maybeSingle();
  return profil?.company_ai_context || {};
}

/**
 * Idem depuis un membre : le compte qui porte les crédits de SON organisation.
 * Pour les appels qui ne connaissent que `user.id` (génération, réécriture
 * d'étape, analyse d'offre). Repli sur le membre lui-même.
 */
export async function compteFacturationDuMembre(userId) {
  if (!userId) return userId;
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  return compteFacturationDeOrg(data?.organization_id, userId);
}
