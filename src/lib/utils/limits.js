import { createClient } from "../supabase/server";
import { isAdmin } from "./admin";
import { PLANS } from "../constants/plans";

/**
 * Vérifie si l'utilisateur a atteint ses limites.
 * @param {string} userId 
 * @param {'job' | 'candidate'} type 
 * @returns {Promise<{ allowed: boolean, remaining: number, error?: string }>}
 */
export async function checkQuota(userId, type) {
  const supabase = await createClient();
  
  // 1. Récupérer l'utilisateur pour vérifier s'il est admin
  const { data: { user } } = await supabase.auth.getUser();
  if (isAdmin(user)) {
    return { allowed: true, remaining: 999999 };
  }

  // 2. Récupérer l'usage actuel
  let { data: usage, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Créer l'entrée si elle n'existe pas
    const { data: newUsage, error: insertError } = await supabase
      .from('user_usage')
      .insert({ user_id: userId, plan: 'core' })
      .select()
      .single();
    
    if (insertError) throw insertError;
    usage = newUsage;
  } else if (error) {
    throw error;
  }

  // 3. Vérifier le reset mensuel (si on est dans un nouveau mois)
  const lastReset = new Date(usage.last_reset_date);
  const now = new Date();
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    const { data: resetUsage } = await supabase
      .from('user_usage')
      .update({ 
        jobs_count: 0, 
        candidates_count: 0, 
        last_reset_date: now.toISOString() 
      })
      .eq('user_id', userId)
      .select()
      .single();
    usage = resetUsage;
  }

  const plan = PLANS[usage.plan] || PLANS.core;
  
  if (type === 'job') {
    const remaining = plan.maxJobs - usage.jobs_count;
    return { 
      allowed: remaining > 0, 
      remaining, 
      error: remaining <= 0 ? `Limite d'offres atteinte (${plan.maxJobs}/mois). Passez au plan supérieur !` : null 
    };
  } else if (type === 'candidate') {
    const remaining = plan.maxCandidates - usage.candidates_count;
    return { 
      allowed: remaining > 0, 
      remaining, 
      error: remaining <= 0 ? `Limite de candidats atteinte (${plan.maxCandidates}/mois).` : null 
    };
  }

  return { allowed: false, remaining: 0 };
}

/**
 * Incrémente le compteur d'usage.
 */
export async function incrementUsage(userId, type, amount = 1) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (isAdmin(user)) return; // Pas d'incrément pour les admins

  const column = type === 'job' ? 'jobs_count' : 'candidates_count';
  
  // Utiliser la fonction RPC pour un incrément atomique
  await supabase.rpc('increment_usage', { 
    user_id_param: userId, 
    column_name: column, 
    amount: amount 
  });
}
