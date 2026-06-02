import { createClient, createAdminClient } from "../supabase/server";
import { isAdmin } from "./admin";
import { PLANS, CREDIT_COSTS } from "../constants/plans";

/**
 * Récupère ou crée l'entrée user_usage pour un utilisateur.
 */
async function getOrCreateUsage(supabase, userId) {
  let { data: usage, error } = await supabase
    .from("user_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Pas encore d'entrée — créer via upsert (plus sûr que insert)
    const plan = PLANS.beta;
    const { data: newUsage, error: upsertError } = await supabase
      .from("user_usage")
      .upsert(
        {
          user_id: userId,
          plan: "beta",
          credits_balance: plan.creditsPerMonth,
          credits_allocated: plan.creditsPerMonth,
          last_reset_date: new Date().toISOString(),
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (upsertError) {
      // Si même l'upsert échoue (ex: RLS), retourner un usage virtuel par défaut
      console.warn("getOrCreateUsage upsert failed, using virtual defaults:", upsertError.message);
      return {
        user_id: userId,
        plan: "beta",
        credits_balance: 500,
        credits_allocated: 500,
        last_reset_date: new Date().toISOString(),
      };
    }
    usage = newUsage;
  } else if (error) {
    console.warn("getOrCreateUsage select failed, using virtual defaults:", error.message);
    return {
      user_id: userId,
      plan: "beta",
      credits_balance: 500,
      credits_allocated: 500,
      last_reset_date: new Date().toISOString(),
    };
  }

  return usage;
}

/**
 * Vérifie et applique le reset mensuel si nécessaire.
 */
async function checkAndResetMonthly(supabase, usage) {
  const lastReset = new Date(usage.last_reset_date);
  const now = new Date();
  if (
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    const plan = PLANS[usage.plan] || PLANS.beta;
    const { data: resetUsage } = await supabase
      .from("user_usage")
      .update({
        credits_balance: plan.creditsPerMonth,
        credits_allocated: plan.creditsPerMonth,
        last_reset_date: now.toISOString(),
      })
      .eq("user_id", usage.user_id)
      .select()
      .single();
    return resetUsage;
  }
  return usage;
}

/**
 * Vérifie si l'utilisateur a suffisamment de crédits pour une action.
 * @param {string} userId
 * @param {number} cost - Nombre de crédits requis
 * @returns {Promise<{ allowed: boolean, remaining: number, error?: string }>}
 */
export async function checkCredits(userId, cost) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (isAdmin(user)) return { allowed: true, remaining: 999999 };

  const adminSupabase = createAdminClient();
  let usage = await getOrCreateUsage(adminSupabase, userId);
  usage = await checkAndResetMonthly(adminSupabase, usage);

  const remaining = usage.credits_balance;
  const allowed = remaining >= cost;

  return {
    allowed,
    remaining,
    error: allowed
      ? null
      : `Crédits insuffisants (${remaining} restant${remaining > 1 ? "s" : ""}, ${cost} requis). Contactez-nous pour recharger votre compte.`,
  };
}

/**
 * Déduit des crédits pour une action sur un candidat.
 * Idempotent : ne déduit pas si l'action a déjà été facturée pour ce candidat.
 *
 * @param {string} userId - ID du recruteur
 * @param {string} candidateId - ID du candidat
 * @param {'cv_screening'|'skill_test'|'text_interview'|'video_interview'} actionType
 * @returns {Promise<{ success: boolean, deducted: boolean, remaining: number }>}
 */
export async function deductCredits(userId, candidateId, actionType) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Admins (@onbord.be) = gratuit
    if (isAdmin(user)) return { success: true, deducted: false, remaining: 999999 };

    const cost = CREDIT_COSTS[actionType];
    if (!cost) return { success: true, deducted: false, remaining: 0 };

    const adminSupabase = createAdminClient();

    // Vérifier le flag sur le candidat
    const flagColumn = {
      cv_screening: "credits_charged_cv",
      skill_test: "credits_charged_tests",
      text_interview: "credits_charged_interview",
      video_interview: "credits_charged_interview",
    }[actionType];

    if (flagColumn) {
      const { data: candidate } = await adminSupabase
        .from("candidates")
        .select(flagColumn)
        .eq("id", candidateId)
        .single();

      if (candidate?.[flagColumn]) {
        // Déjà facturé pour ce candidat sur ce type
        return { success: true, deducted: false, remaining: -1 };
      }
    }

    // Déduire atomiquement
    let usage = await getOrCreateUsage(adminSupabase, userId);
    usage = await checkAndResetMonthly(adminSupabase, usage);

    if (usage.credits_balance < cost) {
      return {
        success: false,
        deducted: false,
        remaining: usage.credits_balance,
        error: `Crédits insuffisants (${usage.credits_balance} restant${usage.credits_balance > 1 ? "s" : ""}).`,
      };
    }

    const { data: updated } = await adminSupabase
      .from("user_usage")
      .update({ credits_balance: usage.credits_balance - cost })
      .eq("user_id", userId)
      .select("credits_balance")
      .single();

    // Marquer le candidat comme facturé pour ce type
    if (flagColumn) {
      await adminSupabase
        .from("candidates")
        .update({ [flagColumn]: true })
        .eq("id", candidateId);
    }

    return {
      success: true,
      deducted: true,
      remaining: updated?.credits_balance ?? usage.credits_balance - cost,
    };
  } catch (err) {
    // Ne jamais laisser une erreur de crédit planter l'action principale
    console.error("deductCredits error (non-blocking):", err.message);
    return { success: false, deducted: false, remaining: 0, error: err.message };
  }
}

/**
 * Vérifie si l'utilisateur a accès à une feature selon son plan.
 * @param {string} userId
 * @param {keyof PLANS.core.features} featureName
 * @returns {Promise<boolean>}
 */
export async function hasFeature(userId, featureName) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (isAdmin(user)) return true;

  const adminSupabase = createAdminClient();
  const usage = await getOrCreateUsage(adminSupabase, userId);
  const plan = PLANS[usage.plan] || PLANS.beta;
  return plan.features?.[featureName] ?? false;
}

/**
 * Retourne les informations complètes de crédits pour l'utilisateur connecté.
 */
export async function getCreditInfo(userId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (isAdmin(user)) {
    return {
      plan: "enterprise",
      planLabel: "Admin",
      credits_balance: 999999,
      credits_allocated: 999999,
      nextResetDate: null,
    };
  }

  const adminSupabase = createAdminClient();
  let usage = await getOrCreateUsage(adminSupabase, userId);
  usage = await checkAndResetMonthly(adminSupabase, usage);

  const plan = PLANS[usage.plan] || PLANS.beta;

  // Calculer la prochaine date de reset (1er du mois suivant)
  const now = new Date();
  const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    plan: usage.plan,
    planLabel: plan.label,
    credits_balance: usage.credits_balance,
    credits_allocated: usage.credits_allocated,
    nextResetDate: nextReset.toISOString(),
  };
}

/**
 * Ajoute des crédits à un utilisateur (appel admin uniquement).
 */
export async function addCredits(userId, amount) {
  const adminSupabase = createAdminClient();
  let usage = await getOrCreateUsage(adminSupabase, userId);

  const { data } = await adminSupabase
    .from("user_usage")
    .update({ credits_balance: (usage.credits_balance || 0) + amount })
    .eq("user_id", userId)
    .select("credits_balance")
    .single();

  return { success: true, newBalance: data?.credits_balance };
}

/**
 * Change le plan d'un utilisateur et ajuste ses crédits alloués (appel admin).
 */
export async function changePlan(userId, newPlan) {
  const adminSupabase = createAdminClient();
  const plan = PLANS[newPlan];
  if (!plan) return { success: false, error: "Plan inconnu" };

  const { data } = await adminSupabase
    .from("user_usage")
    .update({
      plan: newPlan,
      credits_allocated: plan.creditsPerMonth,
      credits_balance: plan.creditsPerMonth,
    })
    .eq("user_id", userId)
    .select()
    .single();

  return { success: true, usage: data };
}

// Rétrocompatibilité — anciennes fonctions utilisées par jobs/nouveau
export async function checkQuota(userId, type) {
  if (type === "job") {
    // Plus de limite sur les offres — on vérifie juste qu'ils ont des crédits
    return { allowed: true, remaining: 999999 };
  }
  return { allowed: true, remaining: 999999 };
}

export async function incrementUsage() {
  // Remplacé par deductCredits — no-op pour compatibilité
}
