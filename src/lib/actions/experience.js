"use server";

import { createClient } from "@/lib/supabase/server";
import { chargeCredits } from "@/lib/utils/limits";
import { CREDIT_COSTS } from "@/lib/constants/plans";
import { runExperienceGeneration, generateExperienceContent as runGenerationContent, runStepRegeneration } from "@/lib/experienceGeneration";
import { chargerExperienceCourante } from "@/lib/experienceChat";

// ─── Génération ───────────────────────────────────────────────────────────────
// Le pipeline (prompts, appels Claude, versionnage, insertion) vit dans
// lib/experienceGeneration.js : il doit être appelable aussi bien depuis cette
// server action que depuis la route de streaming, qui a besoin d'un callback
// pour pousser chaque étape réelle au client. Un module "use server" ne peut
// exporter que des fonctions async — d'où la séparation.
export async function generateExperience(jobId, additionalContext = "") {
  return runExperienceGeneration(jobId, additionalContext, null);
}

// Génération sans persistance (tests / démo hors repo).
export async function generateExperienceContent(args) {
  return runGenerationContent(args);
}

// ─── Régénération ciblée d'une étape ──────────────────────────────────────────
// Le pendant assisté de updateStep : même écriture EN PLACE, même absence de
// versionnage. La seule différence est qu'un modèle rédige le contenu à partir
// d'une consigne, là où updateStep reçoit les champs déjà saisis.
export async function regenerateStep(stepId, instruction) {
  return runStepRegeneration(stepId, instruction);
}

/**
 * Variante appelée par le chat, qui ne connaît pas les identifiants d'étape :
 * il désigne « l'étape 3 », telle qu'elle lui a été présentée.
 *
 * La résolution du numéro se fait ICI, sur la même lecture triée que celle qui a
 * produit la liste envoyée au modèle. Lui faire recopier un identifiant aurait
 * été plus direct — et aurait réécrit l'étape d'une autre offre le jour où il en
 * invente un.
 */
export async function regenerateStepByNumber(jobId, stepNumber, instruction) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: job } = await supabase
      .from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).maybeSingle();
    if (!job) return { success: false, error: "Accès refusé" };

    const { experience, steps } = await chargerExperienceCourante(supabase, jobId);
    if (!experience || !steps.length) {
      return { success: false, error: "Aucune expérience à modifier : il faut d'abord la générer." };
    }

    const index = Number(stepNumber) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      return { success: false, error: `L'étape ${stepNumber} n'existe pas : le parcours en compte ${steps.length}.` };
    }

    return runStepRegeneration(steps[index].id, instruction);
  } catch (err) {
    console.error("regenerateStepByNumber error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Lecture d'une expérience + ses steps (recruteur propriétaire) ────────────
export async function getExperienceForJob(jobId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    // Ownership vérifiée via le job
    const { data: job } = await supabase.from("jobs").select("id").eq("id", jobId).eq("user_id", user.id).single();
    if (!job) return { success: false, error: "Accès refusé" };

    const { data: experience } = await supabase
      .from("experiences")
      .select("*")
      .eq("job_id", jobId)
      .neq("status", "archived")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (!experience) return { success: true, experience: null, steps: [] };

    const { data: steps } = await supabase
      .from("experience_steps")
      .select("*")
      .eq("experience_id", experience.id)
      .order("order_index");

    return { success: true, experience, steps: steps || [] };
  } catch (err) {
    console.error("getExperienceForJob error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Vérifie que l'appelant possède le step (via experience → job) ────────────
async function assertStepOwnership(supabase, userId, stepId) {
  const { data } = await supabase
    .from("experience_steps")
    .select("id, experience_id, experiences!inner(id, job_id, jobs!inner(user_id))")
    .eq("id", stepId)
    .single();
  const ownerId = data?.experiences?.jobs?.user_id;
  return ownerId && ownerId === userId ? data : null;
}

// ─── Édition d'un step à la relecture ─────────────────────────────────────────
export async function updateStep(stepId, updates) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    // Champs éditables uniquement (dont response_format, choisi par step)
    // `criteria` : colonne historique, contient les sous-dimensions de skill_assessed.
    const allowed = ["title", "prompt", "response_format", "sandbox_kind", "ai_assistant_allowed", "skill_assessed", "criteria", "config", "order_index"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    safe.updated_at = new Date().toISOString();

    const { error } = await supabase.from("experience_steps").update(safe).eq("id", stepId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateStep error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Messages paramétrables de l'expérience (accueil + remerciements) ─────────
export async function updateExperienceMessages(experienceId, updates) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences").select("id, jobs!inner(user_id)").eq("id", experienceId).single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const allowed = ["welcome_message", "thank_you_message"];
    const safe = {};
    for (const k of allowed) if (updates[k] !== undefined) safe[k] = updates[k];
    safe.updated_at = new Date().toISOString();

    const { error } = await supabase.from("experiences").update(safe).eq("id", experienceId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("updateExperienceMessages error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Publication (gate de validation : rien n'est visible candidat avant ça) ──
export async function publishExperience(experienceId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences")
      .select("id, job_id, jobs!inner(user_id)")
      .eq("id", experienceId)
      .single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    // Setup facturé UNE fois par offre : vrai seulement si aucune autre version
    // de cette offre n'a jamais été publiée (regénérer/republier ne re-facture pas).
    const { count: priorPublished } = await supabase
      .from("experiences")
      .select("id", { count: "exact", head: true })
      .eq("job_id", exp.job_id)
      .not("published_at", "is", null)
      .neq("id", experienceId);
    const isFirstPublish = (priorPublished || 0) === 0;

    const { error } = await supabase
      .from("experiences")
      .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", experienceId);
    if (error) throw error;

    if (isFirstPublish) {
      // Non-bloquant : ne fait jamais échouer la publication.
      await chargeCredits(user.id, CREDIT_COSTS.experience_setup);
    }

    // Une seule version publiée à la fois pour une offre : on archive les autres
    // versions publiées. Leurs runs candidat existants restent intacts (FK
    // on delete restrict) — on ne fait que changer le statut, jamais supprimer.
    await supabase
      .from("experiences")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("job_id", exp.job_id)
      .eq("status", "published")
      .neq("id", experienceId);

    return { success: true };
  } catch (err) {
    console.error("publishExperience error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Ajout d'un step vide (relecture) ─────────────────────────────────────────
export async function addStep(experienceId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const { data: exp } = await supabase
      .from("experiences").select("id, jobs!inner(user_id)").eq("id", experienceId).single();
    if (!exp || exp.jobs?.user_id !== user.id) return { success: false, error: "Accès refusé" };

    const { data: last } = await supabase
      .from("experience_steps").select("order_index")
      .eq("experience_id", experienceId).order("order_index", { ascending: false }).limit(1).maybeSingle();
    const nextIndex = (last?.order_index ?? -1) + 1;

    const { data: step, error } = await supabase.from("experience_steps").insert({
      experience_id: experienceId, order_index: nextIndex,
      kind: "question", response_format: "text", title: "Nouvelle étape",
      prompt: "", sandbox_kind: "none", ai_assistant_allowed: false,
      skill_assessed: "", criteria: [], config: {},
    }).select().single();
    if (error) throw error;
    return { success: true, step };
  } catch (err) {
    console.error("addStep error:", err);
    return { success: false, error: err.message };
  }
}

// ─── Suppression d'un step (relecture) ────────────────────────────────────────
export async function deleteStep(stepId) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    const { error } = await supabase.from("experience_steps").delete().eq("id", stepId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    console.error("deleteStep error:", err);
    return { success: false, error: err.message };
  }
}

// Le rapport de preuves est désormais intégré à la fiche candidat
// (candidats/[candidatId]) via getCandidateDetail ; le scoring est déclenché à
// la soumission du run (submitRun). Plus de route/écran de rapport séparés.

// ─── Déplacement d'un step (échange l'order_index avec le voisin) ─────────────
export async function moveStep(stepId, direction) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    if (!(await assertStepOwnership(supabase, user.id, stepId))) return { success: false, error: "Accès refusé" };

    const { data: current } = await supabase
      .from("experience_steps").select("id, order_index, experience_id").eq("id", stepId).single();

    let neighborQuery = supabase
      .from("experience_steps").select("id, order_index").eq("experience_id", current.experience_id);
    neighborQuery = direction === "up"
      ? neighborQuery.lt("order_index", current.order_index).order("order_index", { ascending: false })
      : neighborQuery.gt("order_index", current.order_index).order("order_index", { ascending: true });
    const { data: neighbor } = await neighborQuery.limit(1).maybeSingle();
    if (!neighbor) return { success: true }; // déjà en bout de liste

    await supabase.from("experience_steps").update({ order_index: neighbor.order_index }).eq("id", current.id);
    await supabase.from("experience_steps").update({ order_index: current.order_index }).eq("id", neighbor.id);
    return { success: true };
  } catch (err) {
    console.error("moveStep error:", err);
    return { success: false, error: err.message };
  }
}
