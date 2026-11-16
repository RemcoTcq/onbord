"use server";

// Onboarding → Modules (phase 2, migration 042). Un module est une simulation
// d'entraînement de l'organisation : on le crée en quelques champs (ou depuis
// des suggestions), le moteur génère sa simulation (lib/moduleGeneration.js,
// route /api/modules/generate), on la relit et la retouche avec l'éditeur
// d'étape habituel, on la publie. Admin et manager seulement ; écritures en
// service_role après vérification du rôle. Aucun crédit.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion, contexteEntreprise } from "@/lib/org";
import { suggererModules } from "@/lib/moduleGeneration";
import { jobDepuisModule } from "@/lib/simulationSource";
import { coerceExperienceLocale, coerceUiLocale } from "@/lib/i18n/config";

const DIFFICULTES = ["easy", "medium", "hard"];

/** Les champs d'un module, nettoyés et bornés. */
function champsModule(c = {}) {
  const net = (v, max) => (v === undefined ? undefined : String(v ?? "").trim().slice(0, max) || null);
  const sortie = {
    title: net(c.title, 160),
    objective: net(c.objective, 1000),
    target_role: net(c.target_role, 160),
    situation: net(c.situation, 2000),
    difficulty: c.difficulty === undefined ? undefined : DIFFICULTES.includes(c.difficulty) ? c.difficulty : "medium",
    min_score: c.min_score === undefined ? undefined : Math.max(0, Math.min(100, Math.round(Number(c.min_score) || 70))),
    locale: c.locale === undefined ? undefined : coerceExperienceLocale(c.locale),
  };
  return Object.fromEntries(Object.entries(sortie).filter(([, v]) => v !== undefined));
}

/** La version courante de la simulation d'un module : la plus récente non archivée. */
async function simulationCourante(admin, moduleId) {
  const { data } = await admin
    .from("experiences").select("*")
    .eq("module_id", moduleId).neq("status", "archived")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

export async function listerModules({ archives = false } = {}) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    let q = admin.from("modules")
      .select("id, title, target_role, difficulty, min_score, locale, archived_at, updated_at")
      .eq("organization_id", ctx.orgId).order("updated_at", { ascending: false });
    q = archives ? q.not("archived_at", "is", null) : q.is("archived_at", null);
    const { data: modules, error } = await q;
    if (error) throw error;

    const ids = (modules || []).map((m) => m.id);
    const [{ data: exps }, { data: assig }] = ids.length ? await Promise.all([
      admin.from("experiences").select("module_id, status, created_at, estimated_minutes").in("module_id", ids).neq("status", "archived"),
      admin.from("assignments").select("module_id, status").in("module_id", ids),
    ]) : [{ data: [] }, { data: [] }];

    return {
      success: true,
      modules: (modules || []).map((m) => {
        const sim = (exps || []).filter((e) => e.module_id === m.id).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
        const a = (assig || []).filter((x) => x.module_id === m.id);
        return {
          ...m,
          simulation: sim ? { status: sim.status, minutes: sim.estimated_minutes } : null,
          assignes: a.length,
          valides: a.filter((x) => x.status === "validated").length,
        };
      }),
    };
  } catch (error) {
    console.error("listerModules error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Un module, sa simulation courante et ses étapes. `job` : le module sous la
 * forme « offre » que lisent l'éditeur et le calcul de la note.
 */
export async function getModule(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("*").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!module) return { success: false, error: "Module introuvable" };
    const experience = await simulationCourante(admin, id);
    const { data: steps } = experience
      ? await admin.from("experience_steps").select("*").eq("experience_id", experience.id).order("order_index")
      : { data: [] };
    return { success: true, module, job: jobDepuisModule(module), experience, steps: steps || [] };
  } catch (error) {
    console.error("getModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function creerModule(champs) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const c = champsModule(champs);
    if (!c.title) return { success: false, code: "titreManquant" };
    if (!c.situation) return { success: false, code: "situationManquante" };
    const { data, error } = await createAdminClient().from("modules")
      .insert({ ...c, organization_id: ctx.orgId, created_by: ctx.user.id })
      .select("id").single();
    if (error) throw error;
    return { success: true, id: data.id };
  } catch (error) {
    console.error("creerModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Modifie un module. Changer la situation ou le rôle ne régénère rien : c'est un bouton. */
export async function majModule(id, champs) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const c = champsModule(champs);
    if (c.title === null) return { success: false, code: "titreManquant" };
    const { error } = await createAdminClient().from("modules")
      .update({ ...c, updated_at: new Date().toISOString() })
      .eq("id", id).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("majModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function archiverModule(id, archiver = true) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { error } = await createAdminClient().from("modules")
      .update({ archived_at: archiver ? new Date().toISOString() : null })
      .eq("id", id).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("archiverModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Des modules proposés pour un rôle, tirés du Company Knowledge (rien n'est créé). */
export async function proposerModules({ role, nombre = 5, learnerId = null }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: profil } = await admin.from("users").select("ui_locale").eq("id", ctx.user.id).maybeSingle();
    // Pour une recrue venue du recrutement (phase 4) : ses lacunes, si elle a
    // accepté qu'on les reprenne, orientent les propositions.
    let lacunes = [];
    if (learnerId) {
      const { data: membre } = await admin.from("organization_members")
        .select("results_reuse_accepted_at, hiring_gaps")
        .eq("organization_id", ctx.orgId).eq("user_id", learnerId).eq("role", "learner").maybeSingle();
      if (membre?.results_reuse_accepted_at) {
        lacunes = membre.hiring_gaps?.lacunes || [];
        role = role || membre.hiring_gaps?.poste;
      }
    }
    // Les modules déjà là, pour les réutiliser plutôt que les réécrire.
    const { data: existants } = await admin.from("modules")
      .select("id, title, situation, objective, difficulty")
      .eq("organization_id", ctx.orgId).is("archived_at", null)
      .order("updated_at", { ascending: false }).limit(40);
    const propositions = await suggererModules({
      lacunes,
      existants: existants || [],
      role: String(role || "").trim().slice(0, 160),
      nombre: Math.max(1, Math.min(10, Number(nombre) || 5)),
      uiLocale: coerceUiLocale(profil?.ui_locale),
      companyContext: await contexteEntreprise(ctx.user.id),
    });
    return { success: true, propositions };
  } catch (error) {
    console.error("proposerModules error:", error);
    return { success: false, code: "suggestion" };
  }
}

/** Crée les modules retenus parmi les propositions. Renvoie leurs identifiants, dans l'ordre. */
export async function creerModulesRetenus({ propositions, role, locale, min_score }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    // Une proposition qui désigne un module déjà là ne se recrée pas.
    const lignes = (Array.isArray(propositions) ? propositions : []).filter((p) => !p?.existing_id).slice(0, 10)
      .map((p) => champsModule({ ...p, target_role: role, locale, min_score: min_score ?? 70 }))
      .filter((c) => c.title && c.situation)
      .map((c) => ({ ...c, organization_id: ctx.orgId, created_by: ctx.user.id }));
    if (!lignes.length) return { success: false, code: "rienARetenir" };
    const { data, error } = await createAdminClient().from("modules").insert(lignes).select("id, title");
    if (error) throw error;
    // L'ordre d'insertion n'est pas garanti au retour : on le refait par titre.
    const parTitre = new Map((data || []).map((d) => [d.title, d.id]));
    return { success: true, ids: lignes.map((l) => parTitre.get(l.title)).filter(Boolean) };
  } catch (error) {
    console.error("creerModulesRetenus error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
