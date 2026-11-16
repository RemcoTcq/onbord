"use server";

// Le TEST d'une simulation par celui qui la construit (16/11/2026). Un admin
// ou un manager joue la simulation en entier — offre ou module, brouillon ou
// publiée — sur l'écran du parcours, puis lit son retour, avant de la publier
// ou de l'assigner.
//
// Un test est un passage (`candidate_runs`) au nom de son compte, sans
// assignation ni numéro d'essai (lib/essais.js, estUnTest). Il emprunte le
// chemin de l'essai d'un learner : même écran, même notation, rien de facturé,
// aucun candidat créé. Il ne verrouille PAS la version : on teste pour
// retoucher. Un seul test par simulation, toutes versions confondues.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";
import { droitDeTester, estUnTest, parCompetence, TESTS_PAR_SIMULATION } from "@/lib/essais";
import { SOURCE_EMBARQUEE, sourceDe } from "@/lib/simulationSource";
import { aRetenirDe } from "@/lib/assignations";

const scoreDe = (r) => (Array.isArray(r?.run_scores) ? r.run_scores[0] : r?.run_scores) || null;

/**
 * La simulation à tester (sa version courante) et les tests déjà faits, pour
 * une offre ou un module de l'organisation. `null` si la source n'est pas à elle.
 */
async function simulationEtTests(admin, ctx, { moduleId = null, jobId = null }) {
  const colonne = moduleId ? "module_id" : "job_id";
  const id = moduleId || jobId;
  if (!id) return null;
  const { data: source } = await admin.from(moduleId ? "modules" : "jobs")
    .select("id, title").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
  if (!source) return null;

  const { data: versions } = await admin.from("experiences")
    .select("id, status, created_at").eq(colonne, id).order("created_at", { ascending: false });
  const courante = (versions || []).find((v) => v.status !== "archived") || null;
  const ids = (versions || []).map((v) => v.id);
  const { data: runs } = ids.length
    ? await admin.from("candidate_runs")
      .select("id, learner_id, assignment_id, attempt_number, status, started_at, run_scores(overall)")
      .in("experience_id", ids).not("learner_id", "is", null).is("assignment_id", null)
      .order("started_at", { ascending: false })
    : { data: [] };
  return { source, courante, tests: (runs || []).filter(estUnTest) };
}

/** Où en est le test d'une simulation : le dernier test, et s'il en reste un. */
export async function etatTest(cible) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const etat = await simulationEtTests(createAdminClient(), ctx, cible || {});
    if (!etat) return { success: false, code: "introuvable" };
    const droit = droitDeTester(etat.tests, ctx.user.id);
    const dernier = etat.tests[0] || null;
    return {
      success: true,
      pret: Boolean(etat.courante),
      max: TESTS_PAR_SIMULATION,
      restants: droit.restants,
      reprendre: droit.reprendre,
      dernier: dernier ? { id: dernier.id, statut: dernier.status, note: scoreDe(dernier)?.overall ?? null, date: dernier.started_at } : null,
    };
  } catch (error) {
    console.error("etatTest error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Lance le test — ou rend celui qui est en cours.
 * @returns {Promise<{success: boolean, runId?: string, code?: string}>}
 */
export async function demarrerTest(cible) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const etat = await simulationEtTests(admin, ctx, cible || {});
    if (!etat) return { success: false, code: "introuvable" };
    const droit = droitDeTester(etat.tests, ctx.user.id);
    if (droit.reprendre) return { success: true, runId: droit.reprendre };
    if (!etat.courante) return { success: false, code: "pasPrete" };
    if (!droit.autorise) return { success: false, code: "dejaTeste" };

    const { data: run, error } = await admin.from("candidate_runs").insert({
      learner_id: ctx.user.id,
      experience_id: etat.courante.id,
      status: "in_progress",
    }).select("id").single();
    if (error) throw error;
    return { success: true, runId: run.id };
  } catch (error) {
    console.error("demarrerTest error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Le retour d'un test, pour tout admin ou manager de l'organisation de la simulation. */
export async function getTest(runId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: run } = await admin.from("candidate_runs")
      .select("id, learner_id, assignment_id, attempt_number, experience_id, status, started_at, submitted_at, run_scores(overall, summary, criterion_scores)")
      .eq("id", runId).maybeSingle();
    if (!run || !estUnTest(run)) return { success: false, error: "Test introuvable" };
    const { data: exp } = await admin.from("experiences")
      .select(`id, job_id, module_id, ${SOURCE_EMBARQUEE}`).eq("id", run.experience_id).maybeSingle();
    const source = sourceDe(exp);
    if (!source || source.organization_id !== ctx.orgId) return { success: false, error: "Test introuvable" };

    const score = scoreDe(run);
    return {
      success: true,
      essai: {
        id: run.id,
        statut: run.status,
        aMoi: run.learner_id === ctx.user.id,
        debut: run.started_at,
        fin: run.submitted_at,
        note: score?.overall ?? null,
        resume: score?.summary || "",
        competences: parCompetence(score?.criterion_scores),
        aRetenir: run.status === "in_progress" ? [] : await aRetenirDe(admin, run.experience_id),
      },
      simulation: {
        titre: source.title || "",
        minScore: exp.modules?.min_score ?? null,
        // La page d'où le test est parti : celle du module, ou de la simulation de l'offre.
        retour: exp.module_id ? `/onboarding/modules/${exp.module_id}` : `/jobs/${exp.job_id}/experience`,
      },
    };
  } catch (error) {
    console.error("getTest error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
