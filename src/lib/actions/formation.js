"use server";

// L'espace du LEARNER (phase 3 de l'onboarding) : ses modules assignés, ses
// essais, son retour après chaque essai, son historique.
//
// Chaque action part de la SESSION : le learner ne lit et ne lance que ce qui
// lui est assigné (`assignments.learner_id = lui`). Les lectures passent en
// service_role après cette vérification — `run_scores` n'a pas de policy pour
// lui, et n'a pas à en avoir : seul ce que ces actions choisissent sort.
//
// Un essai est un `candidate_runs` avec `learner_id` et `assignment_id`
// (migration 041) : il se joue sur l'écran du parcours (/run/<id de l'essai>),
// le même que celui des candidats. Rien n'est facturé (décision du 10/11/2026).

import { createAdminClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { parCompetence, progressionCompetences } from "@/lib/essais";
import { aRetenirDe } from "@/lib/assignations";

const ORDRE_STATUT = { in_progress: 0, assigned: 1, passed: 2, validated: 3 };

async function exigerLearner() {
  const ctx = await getOrgContext();
  if (!ctx) return { erreur: "Non authentifié" };
  return ctx;
}

const scoreDe = (r) => (Array.isArray(r?.run_scores) ? r.run_scores[0] : r?.run_scores) || null;

/** La simulation publiée la plus récente d'un module, ou null. */
async function simulationPubliee(admin, moduleId) {
  const { data } = await admin.from("experiences").select("id, locked_at")
    .eq("module_id", moduleId).eq("status", "published")
    .order("published_at", { ascending: false }).limit(1).maybeSingle();
  return data || null;
}

/**
 * L'accueil : les modules assignés (le prochain à faire en tête), la
 * progression, et pour chacun le dernier essai.
 */
export async function maFormation() {
  try {
    const ctx = await exigerLearner();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const [{ data: assignations }, { data: runs }] = await Promise.all([
      admin.from("assignments")
        .select("id, module_id, status, due_at, best_score, passed_at, validated_at, created_at, modules(title, objective, situation, difficulty, min_score, locale, archived_at)")
        .eq("learner_id", ctx.user.id).eq("organization_id", ctx.orgId),
      admin.from("candidate_runs")
        .select("id, assignment_id, attempt_number, status, started_at, submitted_at, run_scores(overall)")
        .eq("learner_id", ctx.user.id).order("started_at", { ascending: false }),
    ]);
    const moduleIds = (assignations || []).map((a) => a.module_id);
    const { data: publiees } = moduleIds.length
      ? await admin.from("experiences").select("module_id").in("module_id", moduleIds).eq("status", "published")
      : { data: [] };
    const jouables = new Set((publiees || []).map((e) => e.module_id));

    const modules = (assignations || []).map((a) => {
      const essais = (runs || []).filter((r) => r.assignment_id === a.id);
      const dernier = essais[0] || null;
      return {
        id: a.id,
        moduleId: a.module_id,
        titre: a.modules?.title || "",
        objectif: a.modules?.objective || "",
        situation: a.modules?.situation || "",
        difficulte: a.modules?.difficulty || "medium",
        minScore: a.modules?.min_score ?? 70,
        statut: a.status,
        echeance: a.due_at,
        meilleur: a.best_score,
        jouable: jouables.has(a.module_id),
        essais: essais.length,
        enCours: dernier?.status === "in_progress" ? dernier.id : null,
        dernier: dernier ? { id: dernier.id, statut: dernier.status, note: scoreDe(dernier)?.overall ?? null, date: dernier.submitted_at || dernier.started_at } : null,
        creeLe: a.created_at,
      };
    }).sort((x, y) =>
      (ORDRE_STATUT[x.statut] ?? 9) - (ORDRE_STATUT[y.statut] ?? 9)
      || String(x.echeance || "9999").localeCompare(String(y.echeance || "9999"))
      || String(x.creeLe).localeCompare(String(y.creeLe)));

    const faits = modules.filter((m) => m.statut === "passed" || m.statut === "validated").length;
    const meta = ctx.user.user_metadata || {};
    return {
      success: true,
      prenom: meta.first_name || "",
      organisation: ctx.org?.name || "",
      modules,
      prochain: modules.find((m) => m.jouable && (m.statut === "assigned" || m.statut === "in_progress"))?.id || null,
      progression: { faits, valides: modules.filter((m) => m.statut === "validated").length, total: modules.length },
    };
  } catch (error) {
    console.error("maFormation error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Lance un essai sur un module assigné — ou rend celui qui est en cours.
 * @returns {Promise<{success: boolean, runId?: string, code?: string}>}
 */
export async function demarrerEssai(assignmentId) {
  try {
    const ctx = await exigerLearner();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: a } = await admin.from("assignments").select("id, module_id, status, organization_id")
      .eq("id", assignmentId).eq("learner_id", ctx.user.id).maybeSingle();
    if (!a) return { success: false, code: "introuvable" };

    // Un essai commencé se reprend : on n'en ouvre pas un second à côté.
    const { data: enCours } = await admin.from("candidate_runs").select("id")
      .eq("assignment_id", a.id).eq("learner_id", ctx.user.id).eq("status", "in_progress")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (enCours) return { success: true, runId: enCours.id };

    const exp = await simulationPubliee(admin, a.module_id);
    if (!exp) return { success: false, code: "pasPrete" };

    const { count } = await admin.from("candidate_runs").select("id", { count: "exact", head: true })
      .eq("assignment_id", a.id);
    const { data: run, error } = await admin.from("candidate_runs").insert({
      learner_id: ctx.user.id,
      assignment_id: a.id,
      attempt_number: (count || 0) + 1,
      experience_id: exp.id,
      status: "in_progress",
    }).select("id").single();
    if (error) throw error;

    // Même verrou qu'au premier candidat : la version jouée ne se réécrit plus
    // (une retouche du manager crée une nouvelle version, lib/experienceVersion.js).
    if (!exp.locked_at) await admin.from("experiences").update({ locked_at: new Date().toISOString() }).eq("id", exp.id);
    if (a.status === "assigned") {
      await admin.from("assignments").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", a.id);
    }
    return { success: true, runId: run.id };
  } catch (error) {
    console.error("demarrerEssai error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Le retour d'un essai : sa note, le seuil, la synthèse, le détail. */
export async function getEssai(runId) {
  try {
    const ctx = await exigerLearner();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: run } = await admin.from("candidate_runs")
      .select("id, assignment_id, attempt_number, experience_id, status, started_at, submitted_at, scored_at, run_scores(overall, summary, criterion_scores)")
      .eq("id", runId).eq("learner_id", ctx.user.id).maybeSingle();
    if (!run) return { success: false, error: "Essai introuvable" };
    const aRetenir = run.status === "in_progress" ? [] : await aRetenirDe(admin, run.experience_id);
    const { data: a } = run.assignment_id
      ? await admin.from("assignments").select("id, status, best_score, modules(title, min_score)").eq("id", run.assignment_id).maybeSingle()
      : { data: null };
    const score = scoreDe(run);
    return {
      success: true,
      essai: {
        id: run.id,
        assignmentId: run.assignment_id,
        numero: run.attempt_number,
        statut: run.status,
        debut: run.started_at,
        fin: run.submitted_at,
        note: score?.overall ?? null,
        resume: score?.summary || "",
        competences: parCompetence(score?.criterion_scores),
        aRetenir,
      },
      module: a ? { titre: a.modules?.title || "", minScore: a.modules?.min_score ?? 70, statut: a.status, meilleur: a.best_score } : null,
    };
  } catch (error) {
    console.error("getEssai error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * L'historique : tous les essais notés, et la progression de chaque
 * compétence d'un essai à l'autre.
 */
export async function mesResultats() {
  try {
    const ctx = await exigerLearner();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: runs } = await admin.from("candidate_runs")
      .select("id, assignment_id, attempt_number, status, started_at, submitted_at, run_scores(overall, criterion_scores), assignments(modules(title, min_score))")
      .eq("learner_id", ctx.user.id).order("started_at", { ascending: true });

    const essais = (runs || []).map((r) => {
      const score = scoreDe(r);
      return {
        id: r.id,
        module: r.assignments?.modules?.title || "",
        minScore: r.assignments?.modules?.min_score ?? 70,
        numero: r.attempt_number,
        statut: r.status,
        date: r.submitted_at || r.started_at,
        note: score?.overall ?? null,
        competences: parCompetence(score?.criterion_scores).map((c) => ({ nom: c.nom, score: c.score })),
      };
    });

    // Calculée dans l'ordre des essais, AVANT que la liste ne soit retournée.
    const competences = progressionCompetences(essais);
    return { success: true, essais: essais.reverse(), competences };
  } catch (error) {
    console.error("mesResultats error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
