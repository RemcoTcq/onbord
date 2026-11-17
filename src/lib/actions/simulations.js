"use server";

// La liste des simulations (17/11/2026) : TOUTES celles de l'organisation, quel
// que soit leur usage, avec de quoi les suivre d'un coup d'œil — à quoi elles
// sont liées (l'offre, ou le rôle entraîné), leur format, combien de personnes
// les ont passées et avec quelle note. Les règles vivent dans lib/simulationsListe.js.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";
import { versionsCourantes, etatSimulation, passagesOffre, passagesModule } from "@/lib/simulationsListe";

export async function listerSimulations() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();

    const [{ data: jobs, error: e1 }, { data: modules, error: e2 }] = await Promise.all([
      admin.from("jobs").select("id, title, status, location, experience_locale, created_at").eq("organization_id", ctx.orgId).is("deleted_at", null),
      admin.from("modules").select("id, title, target_role, channel, locale, difficulty, created_at").eq("organization_id", ctx.orgId).is("archived_at", null),
    ]);
    if (e1 || e2) throw e1 || e2;
    const jobIds = (jobs || []).map((j) => j.id);
    const moduleIds = (modules || []).map((m) => m.id);

    const vide = { data: [] };
    const [{ data: expsJobs }, { data: expsModules }, { data: candidats }, { data: assignations }] = await Promise.all([
      jobIds.length ? admin.from("experiences").select("id, job_id, status, created_at, estimated_minutes").in("job_id", jobIds).neq("status", "archived") : vide,
      moduleIds.length ? admin.from("experiences").select("id, module_id, status, created_at, estimated_minutes").in("module_id", moduleIds).neq("status", "archived") : vide,
      jobIds.length ? admin.from("candidates").select("job_id, assessment_submitted_at, score_global").in("job_id", jobIds) : vide,
      moduleIds.length ? admin.from("assignments").select("module_id, status, best_score").in("module_id", moduleIds) : vide,
    ]);
    const parJob = versionsCourantes(expsJobs, "job_id");
    const parModule = versionsCourantes(expsModules, "module_id");

    // Le nombre d'étapes de chaque simulation de recrutement (une simulation
    // d'onboarding est une seule conversation : son format, c'est son canal).
    const idsRecrutement = [...parJob.values()].map((e) => e.id);
    const { data: etapes } = idsRecrutement.length
      ? await admin.from("experience_steps").select("experience_id").in("experience_id", idsRecrutement)
      : vide;
    const nbEtapes = new Map();
    for (const s of etapes || []) nbEtapes.set(s.experience_id, (nbEtapes.get(s.experience_id) || 0) + 1);

    const simulations = [
      ...(jobs || []).map((j) => {
        const exp = parJob.get(j.id) || null;
        return {
          id: j.id, usage: "hiring", titre: j.title, date: j.created_at, href: `/jobs/${j.id}`,
          lien: j.title, detail: j.location || "",
          langue: j.experience_locale || null, etapes: exp ? nbEtapes.get(exp.id) || 0 : null, minutes: exp?.estimated_minutes ?? null,
          etat: etatSimulation({ usage: "hiring", statutOffre: j.status, experience: exp }),
          passages: passagesOffre((candidats || []).filter((c) => c.job_id === j.id)),
        };
      }),
      ...(modules || []).map((m) => {
        const exp = parModule.get(m.id) || null;
        return {
          id: m.id, usage: "onboarding", titre: m.title, date: m.created_at, href: `/onboarding/modules/${m.id}`,
          lien: m.target_role || null, detail: "",
          langue: m.locale, canal: m.channel || null, difficulte: m.difficulty, minutes: exp?.estimated_minutes ?? null,
          etat: etatSimulation({ usage: "onboarding", experience: exp }),
          passages: passagesModule((assignations || []).filter((a) => a.module_id === m.id)),
        };
      }),
    ].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    return { success: true, simulations };
  } catch (error) {
    console.error("listerSimulations :", error);
    return { success: false, error: "Erreur technique" };
  }
}
