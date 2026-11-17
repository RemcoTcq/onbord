"use server";

// L'ACCUEIL (17/11/2026) : ce qui attend une action, sur le recrutement et
// l'onboarding, et les simulations ACTIVES à suivre. Les chiffres de chaque
// métier vivent dans sa vue d'ensemble. Le calcul vit dans lib/accueil.js.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";
import { calculerAFaire, aTermine, estADecider } from "@/lib/accueil";

export async function vueAccueil() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();

    const [{ data: jobs }, { data: modules }, { data: membres }, { data: assignations }] = await Promise.all([
      admin.from("jobs").select("id, title, status, created_at").eq("organization_id", ctx.orgId).is("deleted_at", null),
      admin.from("modules").select("id, title, channel, locale, updated_at").eq("organization_id", ctx.orgId).is("archived_at", null),
      admin.from("organization_members").select("user_id, lifecycle").eq("organization_id", ctx.orgId).eq("role", "learner"),
      admin.from("assignments").select("id, learner_id, module_id, status, due_at, created_at").eq("organization_id", ctx.orgId),
    ]);
    const jobIds = (jobs || []).map((j) => j.id);
    const moduleIds = (modules || []).map((m) => m.id);
    const learnerIds = (membres || []).map((m) => m.user_id);

    const vide = { data: [] };
    const [{ data: candidats }, { data: expsJobs }, { data: expsModules }, { data: profils }, { data: runs }] = await Promise.all([
      jobIds.length ? admin.from("candidates").select("id, job_id, status, assessment_status, assessment_submitted_at, score_global").in("job_id", jobIds) : vide,
      jobIds.length ? admin.from("experiences").select("job_id, status, created_at").in("job_id", jobIds).neq("status", "archived") : vide,
      moduleIds.length ? admin.from("experiences").select("module_id, status, created_at").in("module_id", moduleIds).neq("status", "archived") : vide,
      learnerIds.length ? admin.from("users").select("id, email, first_name, last_name").in("id", learnerIds) : vide,
      learnerIds.length ? admin.from("candidate_runs").select("learner_id, assignment_id, status, started_at, run_scores(overall)").in("learner_id", learnerIds).not("assignment_id", "is", null) : vide,
    ]);

    // La version courante de chaque simulation : la plus récente non archivée.
    const courante = (exps, cle) => {
      const out = new Map();
      for (const e of exps || []) {
        const k = e[cle];
        if (!out.has(k) || e.created_at > out.get(k).created_at) out.set(k, e);
      }
      return out;
    };
    const parJob = courante(expsJobs, "job_id");
    const parModule = courante(expsModules, "module_id");
    const simulations = [
      ...(jobs || []).filter((j) => parJob.has(j.id)).map((j) => ({ status: parJob.get(j.id).status, href: `/jobs/${j.id}/experience` })),
      ...(modules || []).filter((m) => parModule.has(m.id)).map((m) => ({ status: parModule.get(m.id).status, href: `/onboarding/modules/${m.id}` })),
    ];

    const parId = new Map((profils || []).map((p) => [p.id, p]));
    const learners = (membres || []).map((m) => {
      const p = parId.get(m.user_id);
      const nom = p ? ([p.first_name, p.last_name].filter(Boolean).join(" ") || p.email) : "—";
      return { id: m.user_id, nom, lifecycle: m.lifecycle };
    });
    const essais = (runs || []).map((r) => {
      const s = Array.isArray(r.run_scores) ? r.run_scores[0] : r.run_scores;
      return { learner_id: r.learner_id, assignment_id: r.assignment_id, status: r.status, started_at: r.started_at, note: s?.overall ?? null };
    });

    // Les simulations ACTIVES, les deux usages mêlés, les plus récentes
    // d'abord : une offre ouverte qui a sa simulation, un module d'onboarding
    // dont la simulation est générée. Chacune avec de quoi la suivre.
    const actives = [
      ...(jobs || []).filter((j) => j.status === "active" && parJob.has(j.id)).map((j) => {
        const siens = (candidats || []).filter((c) => c.job_id === j.id);
        return {
          id: j.id, usage: "hiring", titre: j.title, date: j.created_at, href: `/jobs/${j.id}`, statut: parJob.get(j.id).status,
          suivi: { candidats: siens.length, termines: siens.filter(aTermine).length, aDecider: siens.filter(estADecider).length },
        };
      }),
      ...(modules || []).filter((m) => parModule.has(m.id)).map((m) => {
        const siennes = (assignations || []).filter((a) => a.module_id === m.id);
        return {
          id: m.id, usage: "onboarding", titre: m.title, date: m.updated_at, href: `/onboarding/modules/${m.id}`, statut: parModule.get(m.id).status, canal: m.channel,
          suivi: { assignes: siennes.length, valides: siennes.filter((a) => a.status === "validated").length },
        };
      }),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return {
      success: true,
      aFaire: calculerAFaire({ candidats: candidats || [], simulations, learners, assignations: assignations || [], essais }),
      actives,
      recrute: jobIds.length > 0,
    };
  } catch (error) {
    console.error("vueAccueil :", error);
    return { success: false, error: error.message };
  }
}
