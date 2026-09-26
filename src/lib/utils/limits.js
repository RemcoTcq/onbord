import { createAdminClient } from "../supabase/server";
import { isAdmin } from "./admin";
import {
  PLANS,
  PLANS_ATTRIBUABLES,
  CREDIT_COSTS,
  CREDITS_ILLIMITES,
  CYCLES,
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
 * Quatre points d'appel, pas un de plus (barème dans constants/plans.js) :
 *   factureGenerationSimulation() 6 cr — experienceGeneration.js, à chaque génération complète
 *   factureRegenerationEtape()    1 cr — experienceGeneration.js, à chaque réécriture d'étape
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

// ── La recharge mensuelle ────────────────────────────────────────────────────
// Paresseuse : elle s'applique au premier accès du mois, pas par un cron. Un
// compte resté trois mois sans se connecter reçoit donc ses trois mois d'un
// coup — ce qui, en annuel, veut dire trois allocations reportées (sauf
// renouvellement entre-temps). D'où la boucle mois par mois ci-dessous.
//
// `credits_allocated` ne veut plus dire « allocation du plan » mais « crédits
// disponibles au début de la période » : allocation + report. Tous les
// affichages divisent le solde par ce nombre (« 650 / 800 », jauge, crédits
// utilisés ce mois-ci) ; en mensuel les deux sens coïncident, en annuel c'est
// le seul qui garde ces affichages justes. L'allocation du plan, elle, se lit
// dans PLANS[plan].creditsPerMonth.

/** Rang d'un mois dans le calendrier : deux dates du même mois ont le même. */
function rangMois(date) {
  return date.getFullYear() * 12 + date.getMonth();
}

/** Premier jour du mois de rang `rang`. */
function debutDuMois(rang) {
  return new Date(Math.floor(rang / 12), rang % 12, 1);
}

function estAnnuel(usage, plan) {
  return usage?.billing_cycle === "annual" && !!usage?.cycle_start && !plan?.illimite;
}

/**
 * Ce que devient une ligne user_usage au changement de mois. Fonction PURE :
 * aucune écriture, pour pouvoir la vérifier mois par mois sans base.
 *
 * @returns {null | { credits_balance: number, credits_allocated: number, last_reset_date: string }}
 *   null s'il n'y a rien à recharger (même mois).
 */
export function calculerRecharge(usage, maintenant = new Date()) {
  const depuis = rangMois(new Date(usage.last_reset_date));
  const cible = rangMois(maintenant);
  if (!(cible > depuis)) return null;

  const plan = PLANS[usage.plan] || PLANS[PLAN_DEFAUT];
  const allocation = plan.creditsPerMonth;
  let solde = allocation;

  if (estAnnuel(usage, plan)) {
    const debutCycle = rangMois(new Date(usage.cycle_start));
    solde = Math.max(0, usage.credits_balance ?? 0);
    for (let mois = depuis + 1; mois <= cible; mois++) {
      const avantLAnnee = mois <= debutCycle;
      const renouvellement = mois > debutCycle && (mois - debutCycle) % 12 === 0;
      // Avant le début de l'année (compte passé à l'annuel entre-temps) ou au
      // renouvellement : pas de report, on repart de l'allocation seule.
      solde = avantLAnnee || renouvellement ? allocation : solde + allocation;
    }
  }

  return {
    credits_balance: solde,
    credits_allocated: solde,
    last_reset_date: maintenant.toISOString(),
  };
}

/** Date du prochain renouvellement d'un abonnement annuel, ou null. */
export function prochainRenouvellement(usage, maintenant = new Date()) {
  const plan = PLANS[usage?.plan] || PLANS[PLAN_DEFAUT];
  if (!estAnnuel(usage, plan)) return null;
  const debutCycle = rangMois(new Date(usage.cycle_start));
  const courant = rangMois(maintenant);
  const annees = Math.max(1, Math.floor((courant - debutCycle) / 12) + 1);
  return debutDuMois(debutCycle + 12 * annees);
}

/** Applique la recharge du mois si elle est due. */
async function checkAndResetMonthly(adminSupabase, usage) {
  if (usage?._virtuel) return usage;
  const recharge = calculerRecharge(usage);
  if (!recharge) return usage;

  const { data } = await adminSupabase
    .from("user_usage")
    .update(recharge)
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

// ── La simulation : 6 crédits par génération complète ────────────────────────
// Chaque génération complète réussie débite 6 crédits — la première comme les
// régénérations complètes. Une seule exception, transitoire : les offres
// analysées sous l'ancien barème (débit à l'extraction) et jamais générées ont
// déjà payé leur première simulation. La migration 031 les inscrit dans
// `simulations_prepayees` ; leur première génération CONSOMME cette ligne au
// lieu de débiter.
//
// Cette table ne peut pas vivre sur `jobs` : le recruteur écrit sa propre ligne
// d'offre avec la clé anon (RLS), il pourrait s'offrir des générations. RLS
// activée, AUCUNE policy : seul service_role la lit et l'écrit.
//
// La consommation est un DELETE … RETURNING : deux générations simultanées ne
// peuvent pas supprimer la même ligne deux fois, donc une seule est offerte.
//
// Table absente (code déployé avant la migration) : pas de prépaiement, on
// débite normalement.
// PostgREST répond PGRST205 pour une table inconnue de son cache de schéma
// (constaté en production avant la migration) ; 42P01 est le code Postgres.
const TABLES_ABSENTES = ["PGRST205", "42P01"];
const tableAbsente = (error) => TABLES_ABSENTES.includes(error?.code);

/** La prochaine génération de cette offre est-elle déjà payée (ancien barème) ? */
export async function simulationPrepayee(jobId) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("simulations_prepayees")
    .select("job_id")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) {
    if (!tableAbsente(error)) console.error("simulationPrepayee:", error.message);
    return false;
  }
  return !!data;
}

/** Consomme le prépaiement d'une offre. true si c'était bien la sienne à consommer. */
async function consommerPrepaiement(jobId) {
  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("simulations_prepayees")
    .delete()
    .eq("job_id", jobId)
    .select("job_id");
  if (error) {
    if (!tableAbsente(error)) console.error("consommerPrepaiement:", error.message);
    return false;
  }
  return (data || []).length > 0;
}

/**
 * 6 crédits — l'agent a créé (ou recréé) la simulation d'une offre.
 * Appelée APRÈS l'enregistrement de la nouvelle version : on facture ce que le
 * recruteur a obtenu. Le contrôle de solde, lui, se fait AVANT de lancer le
 * modèle (checkCredits), pour ne pas faire tourner l'IA sur un compte à sec.
 *
 * @returns {Promise<{ success: boolean, deducted: boolean, prepayee?: boolean, remaining?: number, error?: string }>}
 */
export async function factureGenerationSimulation(userId, jobId) {
  if (!userId || !jobId) return { success: false, deducted: false, error: "Offre ou compte inconnu" };
  if (await consommerPrepaiement(jobId)) return { success: true, deducted: false, prepayee: true };
  return chargeCredits(userId, CREDIT_COSTS.simulation_generation);
}

/**
 * 1 crédit — l'agent a réécrit une étape à la demande du recruteur.
 * Appelée après l'écriture de l'étape, comme la génération. La relecture
 * automatique (passe de critique) ne passe PAS par ici : elle est comprise
 * dans les 6 crédits de la génération.
 */
export async function factureRegenerationEtape(userId) {
  return chargeCredits(userId, CREDIT_COSTS.step_regeneration);
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

  const renouvellement = prochainRenouvellement(usage, maintenant);

  return {
    plan: idVisible,
    planLabel: plan.label,
    credits_balance: usage.credits_balance,
    credits_allocated: usage.credits_allocated,
    illimite: false,
    nextResetDate: prochainReset.toISOString(),
    // Un compte dont le cycle n'a pas de date de début est traité en mensuel
    // par calculerRecharge : on l'affiche comme tel, pour ne rien promettre.
    cycle: renouvellement ? "annual" : "monthly",
    renewalDate: renouvellement ? renouvellement.toISOString() : null,
  };
}

/** Ajoute des crédits à un compte (outil d'administration). */
export async function addCredits(userId, amount) {
  const adminSupabase = createAdminClient();
  const usage = await getOrCreateUsage(adminSupabase, userId);

  // `credits_allocated` suit : il compte les crédits disponibles sur la
  // période. Sans ça, un ajout affichait « 550 / 500 » et une jauge à 110 %.
  const { data } = await adminSupabase
    .from("user_usage")
    .update({
      credits_balance: (usage.credits_balance || 0) + amount,
      credits_allocated: (usage.credits_allocated || 0) + amount,
    })
    .eq("user_id", userId)
    .select("credits_balance, credits_allocated")
    .single();

  return { success: true, newBalance: data?.credits_balance, newAllocated: data?.credits_allocated };
}

/**
 * Passe un compte en facturation mensuelle ou annuelle (outil d'administration).
 * Ne touche pas au solde : le report commence à la prochaine recharge.
 *
 * @param {string} userId
 * @param {"monthly"|"annual"} cycle
 * @param {string} [debut] mois de souscription « AAAA-MM » (annuel seulement).
 *   Par défaut, le mois en cours. Sert à reprendre un client qui a signé à
 *   l'année avant que l'application ne le sache.
 */
export async function changeCycle(userId, cycle, debut) {
  if (!CYCLES.includes(cycle)) return { success: false, error: "Cycle inconnu" };

  let cycleStart = null;
  if (cycle === "annual") {
    const m = /^(\d{4})-(\d{2})$/.exec(debut || "");
    const maintenant = new Date();
    // Le 1er du mois à MIDI UTC : minuit local deviendrait la veille en UTC
    // (1er janvier 00:00 à Bruxelles = 31 décembre 23:00 UTC), donc le mauvais
    // mois une fois relu. Midi reste le bon mois dans tous les fuseaux usuels.
    cycleStart = m
      ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1, 12))
      : new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1, 12));
    if (Number.isNaN(cycleStart.getTime()) || Number(m?.[2] ?? 1) > 12 || rangMois(cycleStart) > rangMois(maintenant)) {
      return { success: false, error: "Mois de début invalide (pas dans le futur)" };
    }
  }

  const adminSupabase = createAdminClient();
  await getOrCreateUsage(adminSupabase, userId);
  const { data, error } = await adminSupabase
    .from("user_usage")
    .update({ billing_cycle: cycle, cycle_start: cycleStart ? cycleStart.toISOString() : null })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    // 42703 : colonne absente — le code est déployé, la migration 031 pas encore.
    if (error.code === "42703") return { success: false, error: "Migration 031 non appliquée : cycle indisponible" };
    return { success: false, error: error.message };
  }
  return { success: true, usage: data, renewalDate: prochainRenouvellement(data)?.toISOString() || null };
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
