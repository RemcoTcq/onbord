"use server";

import {
  checkCredits,
  deductCredits,
  hasFeature,
  getCreditInfo,
  addCredits,
  changePlan,
  checkQuota,
  incrementUsage,
} from "../utils/limits";
import { createClient, createAdminClient } from "../supabase/server";
import { isAdmin } from "../utils/admin";
import { consommer, ipDe, SEUILS } from "../rateLimit";
import { headers } from "next/headers";

/** Vérifie que l'appelant est bien admin. Renvoie l'user si oui, sinon null. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdmin(user) ? user : null;
}

export { checkQuota, incrementUsage }; // rétrocompatibilité

/**
 * Vérifie si l'utilisateur connecté a suffisamment de crédits.
 */
export async function checkUserCredits(cost) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, error: "Non authentifié" };
    return await checkCredits(user.id, cost);
  } catch (error) {
    console.error("checkUserCredits error:", error);
    return { allowed: false, error: "Erreur technique" };
  }
}

/**
 * Déduit les crédits pour une action sur un candidat (idempotent).
 */
export async function deductUserCredits(candidateId, actionType) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    return await deductCredits(user.id, candidateId, actionType);
  } catch (error) {
    console.error("deductUserCredits error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Vérifie si l'utilisateur connecté a accès à une feature selon son plan.
 */
export async function checkUserFeature(featureName) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    return await hasFeature(user.id, featureName);
  } catch (error) {
    console.error("checkUserFeature error:", error);
    return false;
  }
}

/**
 * Retourne les informations de crédits de l'utilisateur connecté.
 */
export async function getUserCreditInfo() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return await getCreditInfo(user.id);
  } catch (error) {
    console.error("getUserCreditInfo error:", error);
    return null;
  }
}

// ─── Actions Admin ────────────────────────────────────────────────────────────

/**
 * Ajoute des crédits à un utilisateur (admin seulement).
 */
export async function adminAddCredits(targetUserId, amount) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };
    return await addCredits(targetUserId, amount);
  } catch (error) {
    console.error("adminAddCredits error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Change le plan d'un utilisateur (admin seulement).
 */
export async function adminChangePlan(targetUserId, newPlan) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };
    return await changePlan(targetUserId, newPlan);
  } catch (error) {
    console.error("adminChangePlan error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Applique le plan d'une invitation à l'utilisateur connecté (fin d'inscription).
 * Le plan fait foi côté serveur : il est relu depuis le token d'invitation (le client
 * ne choisit pas son plan). Alloue les crédits et consomme le token.
 */
export async function claimInvitePlan(tokenId) {
  try {
    // Le tokenId vient du client : sans limite de débit, cette action se
    // parcourt en force brute jusqu'à tomber sur une invitation valide — et
    // certaines portent le plan `admin`.
    const verdict = consommer(
      `invite:ip:${ipDe(await headers())}`,
      SEUILS.invitationParIp.max,
      SEUILS.invitationParIp.fenetre
    );
    if (!verdict.autorise) {
      return { success: false, error: "Trop de tentatives. Réessayez plus tard." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const admin = createAdminClient();
    const { data: token } = await admin
      .from("invite_tokens")
      .select("id, plan, used")
      .eq("id", tokenId)
      .single();

    if (!token || token.used) {
      return { success: false, error: "Invitation invalide ou déjà utilisée" };
    }

    const plan = token.plan || "core";
    const res = await changePlan(user.id, plan); // alloue plan + crédits sur user_usage
    if (!res.success) return res;

    await admin
      .from("invite_tokens")
      .update({ used: true, used_by: user.id })
      .eq("id", tokenId);

    return { success: true, plan };
  } catch (error) {
    console.error("claimInvitePlan error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

// Rétrocompatibilité
export async function checkUserQuota(type) {
  return { allowed: true, remaining: 999999 };
}

export async function incrementUserUsage() {
  // no-op
}
