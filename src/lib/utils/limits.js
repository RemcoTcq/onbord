import { createAdminClient } from "../supabase/server";
import { isAdmin } from "./admin";
import {
  PLANS,
  PLANS_ATTRIBUABLES,
  CREDIT_COSTS,
  CREDITS_ILLIMITES,
  planVisible,
} from "../constants/plans";

/**
 * Moteur de crédits.
 *
 * ── Sur QUI est facturé ──────────────────────────────────────────────────────
 * Toujours le propriétaire de l'offre, jamais l'appelant. C'est capital pour les
 * débits candidat : ils partent d'une session ANONYME (le candidat n'a pas de
 * compte). L'ancien code demandait `auth.getUser()` puis testait isAdmin() sur
 * le résultat — dans le parcours candidat, ça renvoyait toujours « pas admin »,
 * donc un recruteur de l'équipe se voyait quand même débiter. L'exonération se
 * lit désormais sur le COMPTE FACTURÉ (estExonere ci-dessous).
 *
 * ── Ce qui débite ────────────────────────────────────────────────────────────
 * Trois points d'appel, pas un de plus (barème dans constants/plans.js) :
 *   factureCreationOffre()      6 cr — actions/job.js, au lancement de l'extraction
 *   factureDemarrageCandidat()  1 cr — actions/run.js, à la création du run
 *   factureNotationCandidat()   2 cr — runScoring.js, quand le run passe « scored »
 */

const PLAN_DEFAUT = "core";

/**
 * Un compte est exonéré s'il porte le plan `admin`, ou si son adresse figure
 * dans ADMIN_EMAILS. La double lecture est délibérée : le plan en base est la
 * source de vérité de la facturation, mais un compte de l'équipe créé avant que
 * son plan ne soit posé ne doit pas se faire débiter entre-temps.
 */
async function estExonere(adminSupabase, userId, usage) {
  if (usage?.plan === "admin") return true;
  try {
    const { data } = await adminSupabase.auth.admin.getUserById(userId);
    return isAdmin(data?.user);
  } catch {
    // Sur incident de l'API d'auth, on facture : ne pas exonérer par accident
    // vaut mieux qu'ouvrir la vanne sur une erreur réseau.
    return false;
  }
}

/** Plan par défaut d'un compte qui n'a pas encore de ligne user_usage. */
async function planParDefaut(adminSupabase, userId) {
  try {
    const { data } = await adminSupabase.auth.admin.getUserById(userId);
    return isAdmin(data?.user) ? "admin" : PLAN_DEFAUT;
  } catch {
    return PLAN_DEFAUT;
  }
}

/** Récupère ou crée l'entrée user_usage d'un compte. */
async function getOrCreateUsage(adminSupabase, userId) {
  const { data: usage, error } = await adminSupabase
    .from("user_usage")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!error) return usage;

  if (error.code !== "PGRST116") {
    console.warn("getOrCreateUsage select failed, using virtual defaults:", error.message);
    return usageVirtuel(userId, PLAN_DEFAUT);
  }

  const planId = await planParDefaut(adminSupabase, userId);
  const plan = PLANS[planId];
  const { data: nouveau, error: upsertError } = await adminSupabase
    .from("user_usage")
    .upsert(
      {
        user_id: userId,
        plan: planId,
        credits_balance: plan.creditsPerMonth,
        credits_allocated: plan.creditsPerMonth,
        last_reset_date: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (upsertError) {
    console.warn("getOrCreateUsage upsert failed, using virtual defaults:", upsertError.message);
    return usageVirtuel(userId, planId);
  }
  return nouveau;
}

/**
 * Consommation en mémoire, quand la base refuse. Marquée `_virtuel` : aucun
 * débit n'est tenté dessus, sinon on retirerait des crédits à une ligne qui
 * n'existe pas et le solde affiché serait une fiction.
 */
function usageVirtuel(userId, planId) {
  const plan = PLANS[planId] || PLANS[PLAN_DEFAUT];
  return {
    user_id: userId,
    plan: planId,
    credits_balance: plan.creditsPerMonth,
    credits_allocated: plan.creditsPerMonth,
    last_reset_date: new Date().toISOString(),
    _virtuel: true,
  };
}

/** Recharge mensuelle : au changement de mois, le solde repart à l'allocation. */
async function checkAndResetMonthly(adminSupabase, usage) {
  if (usage?._virtuel) return usage;

  const dernierReset = new Date(usage.last_reset_date);
  const maintenant = new Date();
  if (
    dernierReset.getMonth() === maintenant.getMonth() &&
    dernierReset.getFullYear() === maintenant.getFullYear()
  ) {
    return usage;
  }

  const plan = PLANS[usage.plan] || PLANS[PLAN_DEFAUT];
  const { data } = await adminSupabase
    .from("user_usage")
    .update({
      credits_balance: plan.creditsPerMonth,
      credits_allocated: plan.creditsPerMonth,
      last_reset_date: maintenant.toISOString(),
    })
    .eq("user_id", usage.user_id)
    .select()
    .single();
  return data || usage;
}

/** État de facturation d'un compte : sa ligne à jour, et s'il paie. */
async function etatFacturation(userId) {
  const adminSupabase = createAdminClient();
  let usage = await getOrCreateUsage(adminSupabase, userId);
  usage = await checkAndResetMonthly(adminSupabase, usage);
  const exonere = await estExonere(adminSupabase, userId, usage);
  return { adminSupabase, usage, exonere };
}

/**
 * Le compte a-t-il de quoi payer `cost` ? Ne débite rien.
 * @returns {Promise<{ allowed: boolean, remaining: number, error?: string }>}
 */
export async function checkCredits(userId, cost) {
  const { usage, exonere } = await etatFacturation(userId);
  if (exonere) return { allowed: true, remaining: CREDITS_ILLIMITES };

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
 * Débit brut de `cost` crédits sur le compte `userId`.
 * Ne lève jamais : l'appelant décide quoi faire du verdict — bloquer avant de
 * dépenser de l'IA, ou seulement journaliser.
 */
export async function chargeCredits(userId, cost) {
  try {
    if (!cost || cost <= 0) return { success: true, deducted: false };
    if (!userId) return { success: false, deducted: false, error: "Compte à facturer inconnu" };

    const { adminSupabase, usage, exonere } = await etatFacturation(userId);
    if (exonere) return { success: true, deducted: false, remaining: CREDITS_ILLIMITES };
    if (usage._virtuel) return { success: false, deducted: false, error: "Consommation illisible" };

    if (usage.credits_balance < cost) {
      return {
        success: false,
        deducted: false,
        remaining: usage.credits_balance,
        error: `Crédits insuffisants (${usage.credits_balance} restant${usage.credits_balance > 1 ? "s" : ""}, ${cost} requis).`,
      };
    }

    const { data } = await adminSupabase
      .from("user_usage")
      .update({ credits_balance: usage.credits_balance - cost })
      .eq("user_id", userId)
      .select("credits_balance")
      .single();

    return {
      success: true,
      deducted: true,
      remaining: data?.credits_balance ?? usage.credits_balance - cost,
    };
  } catch (err) {
    console.error("chargeCredits error (non-blocking):", err.message);
    return { success: false, deducted: false, error: err.message };
  }
}

/**
 * 6 crédits — création d'une offre, au lancement de l'extraction.
 * L'appelant BLOQUE sur un refus : il doit tomber AVANT le premier appel au
 * modèle, sinon on aurait dépensé l'IA pour rien.
 */
export async function factureCreationOffre(userId) {
  return chargeCredits(userId, CREDIT_COSTS.job_creation);
}

/**
 * 1 crédit — un candidat entre réellement dans la simulation.
 * Appelé à la création du run, qui n'a lieu qu'une fois : c'est là toute
 * l'idempotence, aucun drapeau à poser sur le candidat.
 */
export async function factureDemarrageCandidat(recruteurId) {
  return chargeCredits(recruteurId, CREDIT_COSTS.candidate_start);
}

/**
 * 2 crédits — notation d'un run par le modèle.
 * Appelé une fois le run passé « scored ». scoreRun() sort immédiatement sur un
 * run déjà noté : un second passage ne re-débite pas.
 */
export async function factureNotationCandidat(recruteurId) {
  return chargeCredits(recruteurId, CREDIT_COSTS.candidate_scoring);
}

/** Le plan du compte ouvre-t-il cette fonctionnalité ? */
export async function hasFeature(userId, featureName) {
  const { usage, exonere } = await etatFacturation(userId);
  if (exonere) return true;
  const plan = PLANS[usage.plan] || PLANS[PLAN_DEFAUT];
  return plan.features?.[featureName] ?? false;
}

/**
 * Informations de crédits destinées au NAVIGATEUR du recruteur.
 * planVisible() s'applique ICI : un bêta-testeur reçoit « core », jamais
 * « beta » — ni dans l'identifiant, ni dans le libellé. C'est la seule sortie
 * du moteur vers le client, donc le seul endroit où l'appliquer.
 */
export async function getCreditInfo(userId) {
  const { usage, exonere } = await etatFacturation(userId);

  if (exonere) {
    return {
      plan: "admin",
      planLabel: PLANS.admin.label,
      credits_balance: CREDITS_ILLIMITES,
      credits_allocated: CREDITS_ILLIMITES,
      illimite: true,
      nextResetDate: null,
    };
  }

  const idVisible = planVisible(usage.plan);
  const plan = PLANS[idVisible];

  const maintenant = new Date();
  const prochainReset = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);

  return {
    plan: idVisible,
    planLabel: plan.label,
    credits_balance: usage.credits_balance,
    credits_allocated: usage.credits_allocated,
    illimite: false,
    nextResetDate: prochainReset.toISOString(),
  };
}

/** Ajoute des crédits à un compte (outil d'administration). */
export async function addCredits(userId, amount) {
  const adminSupabase = createAdminClient();
  const usage = await getOrCreateUsage(adminSupabase, userId);

  const { data } = await adminSupabase
    .from("user_usage")
    .update({ credits_balance: (usage.credits_balance || 0) + amount })
    .eq("user_id", userId)
    .select("credits_balance")
    .single();

  return { success: true, newBalance: data?.credits_balance };
}

/**
 * Change le plan d'un compte et réaligne son allocation (outil d'administration).
 * `users.plan` est tenu en phase avec `user_usage.plan` : le tableau de bord lit
 * la première colonne, la facturation la seconde.
 */
export async function changePlan(userId, newPlan) {
  if (!PLANS_ATTRIBUABLES.includes(newPlan)) return { success: false, error: "Plan inconnu" };

  const adminSupabase = createAdminClient();
  const plan = PLANS[newPlan];

  // Garantit l'existence de la ligne : sans elle, l'update ne toucherait rien
  // (cas d'un compte tout juste créé).
  await getOrCreateUsage(adminSupabase, userId);

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

  await adminSupabase.from("users").update({ plan: newPlan }).eq("id", userId);

  return { success: true, usage: data };
}
