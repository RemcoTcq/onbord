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
import { coerceExperienceLocale } from "@/lib/i18n/config";
import { coerceCanal, normaliserBrief, criteresDepuisCompetences } from "@/lib/simulationCanal";
import { supprimerFichiersDesCandidats } from "@/lib/storage";
import { identitePersona } from "@/lib/persona";
import { langueEcran } from "@/lib/langueEcran";
import { appliquerGrille } from "@/lib/grilleModule";
import { updateStep } from "@/lib/actions/experience";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    // Création unique (16/11/2026, migration 045) : le canal de la
    // conversation, le brief de l'agent de conception, le personnage.
    channel: c.channel === undefined ? undefined : coerceCanal(c.channel),
    brief: c.brief === undefined ? undefined : normaliserBrief(c.brief),
    persona_id: c.persona_id === undefined ? undefined : (UUID.test(String(c.persona_id || "")) ? c.persona_id : null),
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
      .select("id, title, target_role, difficulty, min_score, locale, channel, archived_at, updated_at")
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
    // Le personnage de la bibliothèque, s'il existe encore.
    let personnage = null;
    if (module.persona_id) {
      const { data: p } = await admin.from("personas").select("id, data").eq("id", module.persona_id).eq("organization_id", ctx.orgId).maybeSingle();
      if (p) personnage = { id: p.id, ...identitePersona(p.data) };
    }
    const { data: assignations } = await admin.from("assignments").select("learner_id, status, best_score").eq("module_id", id);
    return { success: true, module, job: jobDepuisModule(module), experience, steps: steps || [], personnage, assignations: assignations || [] };
  } catch (error) {
    console.error("getModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée un module. Depuis la création unique (16/11/2026), il arrive avec son
 * canal, son personnage, le brief de l'agent et la grille qu'il propose
 * (`competences`) ; la situation est alors le scénario du brief.
 */
export async function creerModule(champs) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const c = champsModule(champs);
    if (c.brief && !c.situation) c.situation = c.brief.scenario || null;
    if (c.brief && !c.objective) c.objective = c.brief.objectif || null;
    if (!c.title) return { success: false, code: "titreManquant" };
    if (!c.situation) return { success: false, code: "situationManquante" };
    const admin = createAdminClient();
    if (c.persona_id) {
      const { data: p } = await admin.from("personas").select("id").eq("id", c.persona_id).eq("organization_id", ctx.orgId).maybeSingle();
      if (!p) c.persona_id = null;
    }
    if (Array.isArray(champs?.competences) && champs.competences.length) c.criteria = criteresDepuisCompetences(champs.competences);
    else if (champs?.criteres?.hard_skills?.length) c.criteria = criteresDepuisCompetences(champs.criteres.hard_skills);
    const { data, error } = await admin.from("modules")
      .insert({ ...c, organization_id: ctx.orgId, created_by: ctx.user.id })
      .select("id").single();
    // Une colonne inconnue : la base n'a pas reçu la dernière migration (045).
    // Le dire, plutôt qu'une erreur générique qui laisse croire à un bouton mort.
    if (error && ["PGRST204", "42703"].includes(error.code)) {
      console.error("creerModule : base pas à jour —", error.message);
      return { success: false, code: "basePasAJour" };
    }
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

/**
 * Enregistre la GRILLE DE NOTATION d'une simulation (16/11/2026) : ses
 * compétences (`modules.criteria`) et les critères de son étape, avec leurs
 * points de contrôle. Une version déjà jouée par quelqu'un n'est pas modifiée :
 * la retouche porte sur une copie (updateStep, lib/experienceVersion.js), et
 * les essais déjà faits restent notés sur la grille qu'ils ont eue.
 * @param {string} id le module
 * @param {string} stepId l'étape de la version courante
 * @param {{ competences: Array, criteres: Array }} grille
 */
export async function enregistrerGrille(id, stepId, grille) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("id").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!module) return { success: false, error: "Module introuvable" };
    const { data: step } = await admin.from("experience_steps").select("id, config, experiences!inner(module_id)").eq("id", stepId).maybeSingle();
    if (!step || step.experiences?.module_id !== id) return { success: false, error: "Étape introuvable" };

    const res = appliquerGrille(grille);
    if (res.erreur) return { success: false, code: res.erreur };

    const { experiences: _exp, ...etape } = step;
    const maj = await updateStep(etape.id, {
      criteria: res.stepCriteria,
      skill_assessed: res.skill_assessed,
      config: { ...(etape.config || {}), skills_tested: res.skills_tested, targets_skills: res.targets_skills },
    });
    if (!maj.success) return { success: false, error: maj.error };

    const { error } = await admin.from("modules").update({ criteria: res.criteria, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    return { success: true, nouvelleVersion: Boolean(maj.forked) };
  } catch (error) {
    console.error("enregistrerGrille error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Les rôles déjà utilisés dans l'organisation, pour les reproposer à la création. */
export async function listerRoles() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data } = await createAdminClient().from("modules").select("target_role").eq("organization_id", ctx.orgId);
    const roles = [...new Set((data || []).map((m) => String(m.target_role || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return { success: true, roles };
  } catch (error) {
    console.error("listerRoles error:", error);
    return { success: false, roles: [] };
  }
}

/**
 * Ce que supprimer un module emporte : ses essais (et de qui), ses
 * assignations. Pour le message de confirmation.
 */
export async function impactSuppressionModule(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("id").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!module) return { success: false, error: "Module introuvable" };
    const { data: exps } = await admin.from("experiences").select("id").eq("module_id", id);
    const ids = (exps || []).map((e) => e.id);
    const [{ count: essais }, { count: assignations }] = await Promise.all([
      ids.length ? admin.from("candidate_runs").select("id", { count: "exact", head: true }).in("experience_id", ids) : { count: 0 },
      admin.from("assignments").select("id", { count: "exact", head: true }).eq("module_id", id),
    ]);
    return { success: true, essais: essais || 0, assignations: assignations || 0 };
  } catch (error) {
    console.error("impactSuppressionModule error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Supprime un module POUR DE BON (16/11/2026) : ses versions de simulation,
 * leurs étapes, tous les essais et tests joués dessus avec leurs notes et
 * leurs enregistrements (stockage compris), ses assignations et sa place dans
 * les programmes. Irréversible : l'écran demande confirmation, chiffres à
 * l'appui (impactSuppressionModule).
 *
 * L'ordre suit les clés de la base : candidate_runs.experience_id est en ON
 * DELETE RESTRICT (migration 010), donc les essais d'abord — leurs fichiers
 * avant eux, puisque rien d'autre ne dit quels dossiers effacer —, puis les
 * versions (qui emportent leurs étapes), puis le module (qui emporte
 * assignations et places de programme).
 */
export async function supprimerModule(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: module } = await admin.from("modules").select("id").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!module) return { success: false, error: "Module introuvable" };

    const { data: exps } = await admin.from("experiences").select("id").eq("module_id", id);
    const idsExp = (exps || []).map((e) => e.id);
    if (idsExp.length) {
      const { data: runs } = await admin.from("candidate_runs").select("id").in("experience_id", idsExp);
      // Les enregistrements d'un essai vivent sous <id de l'essai>/ (le jeton
      // d'un essai est son identifiant, lib/passage.js).
      if (runs?.length) {
        const res = await supprimerFichiersDesCandidats(admin, runs.map((r) => ({ id: r.id })));
        if (res.erreurs.length) console.error("supprimerModule fichiers :", res.erreurs);
        const { error: errRuns } = await admin.from("candidate_runs").delete().in("id", runs.map((r) => r.id));
        if (errRuns) throw errRuns;
      }
      const { error: errExp } = await admin.from("experiences").delete().in("id", idsExp);
      if (errExp) throw errExp;
    }
    const { error } = await admin.from("modules").delete().eq("id", id).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("supprimerModule error:", error);
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
export async function proposerModules({ role, nombre = 5, learnerId = null, locale = null }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
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
      uiLocale: await langueEcran(admin, ctx.user.id, locale),
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
