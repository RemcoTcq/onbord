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
import { createClient } from "../supabase/server";

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
    return await changePlan(targetUserId, newPlan);
  } catch (error) {
    console.error("adminChangePlan error:", error);
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
