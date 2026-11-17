"use server";

// Onboarding → People (phase 2, migration 042) : les learners de
// l'organisation, ce qui leur est assigné, leurs essais, la validation des
// modules et le passage à « prêt ». Plus le tableau de bord de l'onboarding.
// Admin et manager seulement ; écritures en service_role après vérification
// du rôle.
//
// ── La validation ───────────────────────────────────────────────────────────
// Un essai qui atteint le score minimum du module passe l'assignation à
// « passed » (lib/assignations.js, après la notation). C'est le MANAGER qui la
// passe à « validated » — sauf si l'organisation a activé la validation
// automatique (organizations.auto_validate, faux par défaut).

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion, exigerAdminOrg } from "@/lib/org";
import { envoyerNouveauxModules, envoyerModuleValide } from "@/lib/assignations";
import { etapeVersClients, blocages } from "@/lib/accueil";
import { listerCompetences, normaliserNom } from "@/lib/competences";

const nomDe = (p) => [p?.first_name, p?.last_name].filter(Boolean).join(" ") || p?.email || "";

/** Le learner appartient-il à l'organisation du manager ? */
async function learnerDeLOrg(admin, orgId, userId) {
  const { data } = await admin.from("organization_members")
    .select("user_id, lifecycle, ready_at, created_at, source_candidate_id, results_reuse_accepted_at, hiring_gaps")
    .eq("organization_id", orgId).eq("user_id", userId).eq("role", "learner").maybeSingle();
  return data || null;
}

export async function listerPersonnes() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: membres } = await admin.from("organization_members")
      .select("user_id, lifecycle, ready_at, created_at")
      .eq("organization_id", ctx.orgId).eq("role", "learner");
    const ids = (membres || []).map((m) => m.user_id);
    const [{ data: profils }, { data: assig }, { data: invitations }] = await Promise.all([
      ids.length ? admin.from("users").select("id, email, first_name, last_name").in("id", ids) : { data: [] },
      ids.length ? admin.from("assignments").select("learner_id, status, best_score, updated_at").in("learner_id", ids) : { data: [] },
      admin.from("org_invitations").select("id, email, created_at, expires_at")
        .eq("organization_id", ctx.orgId).eq("role", "learner").is("accepted_at", null).is("revoked_at", null),
    ]);
    const parId = new Map((profils || []).map((p) => [p.id, p]));
    return {
      success: true,
      personnes: (membres || []).map((m) => {
        const a = (assig || []).filter((x) => x.learner_id === m.user_id);
        const notes = a.map((x) => x.best_score).filter((n) => n != null);
        return {
          userId: m.user_id,
          nom: nomDe(parId.get(m.user_id)),
          email: parId.get(m.user_id)?.email || "",
          lifecycle: m.lifecycle || "onboarding",
          depuis: m.created_at,
          assignes: a.length,
          valides: a.filter((x) => x.status === "validated").length,
          reussis: a.filter((x) => x.status === "passed").length,
          moyenne: notes.length ? Math.round(notes.reduce((s, n) => s + n, 0) / notes.length) : null,
          derniereActivite: a.map((x) => x.updated_at).sort().pop() || null,
        };
      }),
      invitations: invitations || [],
    };
  } catch (error) {
    console.error("listerPersonnes error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Un learner : ses assignations, ses essais (avec leurs checkpoints et leurs
 * citations), son état.
 */
export async function getPersonne(userId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const membre = await learnerDeLOrg(admin, ctx.orgId, userId);
    if (!membre) return { success: false, error: "Personne introuvable" };

    const [{ data: profil }, { data: assignations }, { data: runs }] = await Promise.all([
      admin.from("users").select("id, email, first_name, last_name").eq("id", userId).maybeSingle(),
      admin.from("assignments")
        .select("id, module_id, status, due_at, best_score, passed_at, validated_at, created_at, modules(title, min_score, target_role)")
        .eq("learner_id", userId).eq("organization_id", ctx.orgId).order("created_at"),
      admin.from("candidate_runs")
        .select("id, assignment_id, attempt_number, status, started_at, submitted_at, scored_at, experience_id, run_scores(overall, summary, criterion_scores)")
        .eq("learner_id", userId).order("started_at", { ascending: false }),
    ]);

    return {
      success: true,
      personne: { userId, nom: nomDe(profil), email: profil?.email || "", lifecycle: membre.lifecycle || "onboarding", readyAt: membre.ready_at, depuis: membre.created_at },
      // Venue du recrutement (phase 4) : ses lacunes, si ELLE a accepté qu'on
      // les reprenne ; sinon seulement le fait qu'elle a refusé.
      recrutement: membre.source_candidate_id
        ? (membre.results_reuse_accepted_at && membre.hiring_gaps
          ? { accepte: true, ...membre.hiring_gaps }
          : { accepte: false })
        : null,
      assignations: (assignations || []).map((a) => ({
        ...a,
        titre: a.modules?.title || "",
        minScore: a.modules?.min_score ?? 70,
        essais: (runs || []).filter((r) => r.assignment_id === a.id).length,
      })),
      essais: (runs || []).map((r) => {
        const score = Array.isArray(r.run_scores) ? r.run_scores[0] : r.run_scores;
        return {
          id: r.id,
          assignmentId: r.assignment_id,
          numero: r.attempt_number,
          statut: r.status,
          debut: r.started_at,
          fin: r.submitted_at,
          note: score?.overall ?? null,
          resume: score?.summary || "",
          criteres: score?.criterion_scores || [],
        };
      }),
    };
  } catch (error) {
    console.error("getPersonne error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Assigne des modules (et/ou un programme) à un learner. Un module déjà
 * assigné ne l'est pas deux fois ; on peut en ajouter à tout moment.
 */
export async function assigner({ learnerId, moduleIds = [], programId = null, dueAt = null }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    if (!(await learnerDeLOrg(admin, ctx.orgId, learnerId))) return { success: false, error: "Personne introuvable" };

    let ids = [...moduleIds];
    if (programId) {
      const { data: prog } = await admin.from("programs").select("id").eq("id", programId).eq("organization_id", ctx.orgId).maybeSingle();
      if (!prog) return { success: false, error: "Programme introuvable" };
      const { data: liens } = await admin.from("program_modules").select("module_id").eq("program_id", programId).order("position");
      ids = [...ids, ...(liens || []).map((l) => l.module_id)];
    }
    ids = [...new Set(ids.filter(Boolean))].slice(0, 50);
    const { data: valides } = ids.length
      ? await admin.from("modules").select("id").in("id", ids).eq("organization_id", ctx.orgId).is("archived_at", null)
      : { data: [] };
    const ok = new Set((valides || []).map((m) => m.id));
    const lignes = ids.filter((id) => ok.has(id)).map((module_id) => ({
      organization_id: ctx.orgId,
      module_id,
      learner_id: learnerId,
      program_id: programId || null,
      due_at: dueAt || null,
      assigned_by: ctx.user.id,
    }));
    if (!lignes.length) return { success: false, code: "rienAAssigner" };
    const { data, error } = await admin.from("assignments")
      .upsert(lignes, { onConflict: "module_id,learner_id", ignoreDuplicates: true })
      .select("id, module_id");
    if (error) throw error;
    // Seules les NOUVELLES assignations reviennent (ignoreDuplicates) : un
    // module déjà assigné ne déclenche pas un second e-mail.
    await envoyerNouveauxModules(admin, { learnerId, orgId: ctx.orgId, moduleIds: (data || []).map((d) => d.module_id) });
    return { success: true, nouvelles: (data || []).length, assignmentIds: (data || []).map((d) => d.id) };
  } catch (error) {
    console.error("assigner error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function retirerAssignation(assignmentId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    // Les essais déjà faits restent : la clé du passage passe à nul (042).
    const { error } = await createAdminClient().from("assignments")
      .delete().eq("id", assignmentId).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("retirerAssignation error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Le manager valide un module (ou annule sa validation). */
export async function validerAssignation(assignmentId, valider = true) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: a } = await admin.from("assignments").select("id, status, passed_at")
      .eq("id", assignmentId).eq("organization_id", ctx.orgId).maybeSingle();
    if (!a) return { success: false, error: "Assignation introuvable" };
    const maj = valider
      ? { status: "validated", validated_at: new Date().toISOString(), validated_by: ctx.user.id }
      : { status: a.passed_at ? "passed" : "in_progress", validated_at: null, validated_by: null };
    const { error } = await admin.from("assignments").update({ ...maj, updated_at: new Date().toISOString() }).eq("id", a.id);
    if (error) throw error;
    if (valider && a.status !== "validated") await envoyerModuleValide(admin, a.id);
    return { success: true };
  } catch (error) {
    console.error("validerAssignation error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Marque un learner prêt pour de vrais clients (ou le remet en onboarding). */
export async function marquerPret(userId, pret = true) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    if (!(await learnerDeLOrg(admin, ctx.orgId, userId))) return { success: false, error: "Personne introuvable" };
    const { error } = await admin.from("organization_members")
      .update(pret
        ? { lifecycle: "ready", ready_at: new Date().toISOString(), ready_by: ctx.user.id }
        : { lifecycle: "onboarding", ready_at: null, ready_by: null })
      .eq("organization_id", ctx.orgId).eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("marquerPret error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function getReglagesOnboarding() {
  const ctx = await exigerGestion();
  if (ctx.erreur) return { success: false, error: ctx.erreur };
  const { data } = await createAdminClient().from("organizations").select("auto_validate").eq("id", ctx.orgId).maybeSingle();
  return { success: true, autoValidate: !!data?.auto_validate, peutModifier: ctx.estAdminOrg };
}

/** Réglage d'organisation : valider seul un module au score minimum. Admin seulement. */
export async function reglerAutoValidation(actif) {
  try {
    const ctx = await exigerAdminOrg();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { error } = await createAdminClient().from("organizations")
      .update({ auto_validate: !!actif, updated_at: new Date().toISOString() }).eq("id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("reglerAutoValidation error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Le tableau de bord de l'onboarding : moyennes, progression par learner,
 * scores dans le temps, par compétence, essais par module, temps passé,
 * modules validés et assignés.
 */
export async function tableauOnboarding() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: membres } = await admin.from("organization_members")
      .select("user_id, lifecycle").eq("organization_id", ctx.orgId).eq("role", "learner");
    const ids = (membres || []).map((m) => m.user_id);
    if (!ids.length) return { success: true, vide: true };

    const [{ data: profils }, { data: assig }, { data: runs }, { data: modules }] = await Promise.all([
      admin.from("users").select("id, email, first_name, last_name").in("id", ids),
      admin.from("assignments").select("id, learner_id, module_id, status, best_score, due_at, created_at").eq("organization_id", ctx.orgId),
      admin.from("candidate_runs")
        .select("id, learner_id, assignment_id, status, started_at, submitted_at, run_scores(overall, criterion_scores)")
        .in("learner_id", ids),
      admin.from("modules").select("id, title, criteria, archived_at").eq("organization_id", ctx.orgId),
    ]);
    const titre = new Map((modules || []).map((m) => [m.id, m.title]));
    const moduleDe = new Map((assig || []).map((a) => [a.id, a.module_id]));
    const parId = new Map((profils || []).map((p) => [p.id, p]));
    const notes = (runs || []).map((r) => {
      const s = Array.isArray(r.run_scores) ? r.run_scores[0] : r.run_scores;
      return { ...r, note: s?.overall ?? null, criteres: s?.criterion_scores || [] };
    });
    const notees = notes.filter((r) => r.note != null);
    const moyenne = (xs) => (xs.length ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length) : null);
    const minutes = (r) => (r.submitted_at ? Math.max(0, Math.round((new Date(r.submitted_at) - new Date(r.started_at)) / 60000)) : 0);

    // Scores dans le temps : la moyenne des essais notés, par semaine.
    const semaine = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
    const parSemaine = new Map();
    for (const r of notees) parSemaine.set(semaine(r.started_at), [...(parSemaine.get(semaine(r.started_at)) || []), r.note]);

    // Par compétence : la moyenne des critères qui la notent.
    const parCompetence = new Map();
    for (const r of notees) for (const c of r.criteres) {
      const nom = c.skill_name || c.sub_dimension_name;
      if (nom && c.score != null) parCompetence.set(nom, [...(parCompetence.get(nom) || []), c.score]);
    }

    // Essais par module.
    const parModule = new Map();
    for (const r of notes) {
      const m = moduleDe.get(r.assignment_id);
      if (m) parModule.set(m, [...(parModule.get(m) || []), r]);
    }

    return {
      success: true,
      synthese: {
        learners: ids.length,
        prets: (membres || []).filter((m) => m.lifecycle === "ready").length,
        moyenne: moyenne(notees.map((r) => r.note)),
        essais: notes.length,
        minutes: notes.reduce((s, r) => s + minutes(r), 0),
        assignes: (assig || []).length,
        valides: (assig || []).filter((a) => a.status === "validated").length,
      },
      learners: ids.map((id) => {
        const a = (assig || []).filter((x) => x.learner_id === id);
        const r = notees.filter((x) => x.learner_id === id);
        const lifecycle = (membres || []).find((m) => m.user_id === id)?.lifecycle || "onboarding";
        const valides = a.filter((x) => x.status === "validated").length;
        return {
          userId: id,
          nom: nomDe(parId.get(id)),
          lifecycle,
          etape: etapeVersClients({ lifecycle, assignes: a.length, valides }),
          assignes: a.length,
          valides,
          aValider: a.filter((x) => x.status === "passed").length,
          moyenne: moyenne(r.map((x) => x.note)),
          essais: notes.filter((x) => x.learner_id === id).length,
          minutes: notes.filter((x) => x.learner_id === id).reduce((s, x) => s + minutes(x), 0),
        };
      }),
      dansLeTemps: [...parSemaine.entries()].sort().map(([semaineDu, xs]) => ({ semaineDu, moyenne: moyenne(xs), essais: xs.length })),
      // Chaque compétence, avec les simulations (non archivées) qui la notent :
      // c'est à elles qu'on renvoie la personne pour la travailler.
      competences: [...parCompetence.entries()].map(([nom, xs]) => ({
        nom, moyenne: moyenne(xs), mesures: xs.length,
        simulations: (modules || []).filter((m) => !m.archived_at && listerCompetences(m.criteria || {}).some((c) => normaliserNom(c.name) === normaliserNom(nom)))
          .map((m) => ({ id: m.id, titre: m.title })),
      })).sort((a, b) => a.moyenne - b.moyenne),
      blocages: blocages({
        learners: ids.map((id) => ({ id, nom: nomDe(parId.get(id)) })),
        assignations: assig || [],
        essais: notes.map((r) => ({ learner_id: r.learner_id, assignment_id: r.assignment_id, status: r.status, started_at: r.started_at })),
        titres: titre,
      }),
      modules: [...parModule.entries()].map(([id, rs]) => ({
        id, titre: titre.get(id) || "", essais: rs.length, moyenne: moyenne(rs.filter((x) => x.note != null).map((x) => x.note)),
      })).sort((a, b) => b.essais - a.essais),
    };
  } catch (error) {
    console.error("tableauOnboarding error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
