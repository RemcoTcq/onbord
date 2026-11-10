"use server";

// Onboarding → Programs (phase 2, migration 042). Un programme est un MODÈLE :
// une liste ordonnée de modules pour un rôle, qu'on assigne d'un coup à une
// nouvelle recrue, puis qu'on complète module par module. Facultatif.
// Admin et manager seulement ; écritures en service_role.

import { createAdminClient } from "@/lib/supabase/server";
import { exigerGestion } from "@/lib/org";

const net = (v, max) => String(v ?? "").trim().slice(0, max) || null;

export async function listerProgrammes() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { data, error } = await createAdminClient().from("programs")
      .select("id, title, target_role, description, updated_at, program_modules(module_id)")
      .eq("organization_id", ctx.orgId).is("archived_at", null)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { success: true, programmes: (data || []).map(({ program_modules, ...p }) => ({ ...p, nbModules: (program_modules || []).length })) };
  } catch (error) {
    console.error("listerProgrammes error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function getProgramme(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    const { data: programme } = await admin.from("programs").select("*").eq("id", id).eq("organization_id", ctx.orgId).maybeSingle();
    if (!programme) return { success: false, error: "Programme introuvable" };
    const { data: liens } = await admin.from("program_modules")
      .select("position, modules(id, title, target_role, difficulty, archived_at)")
      .eq("program_id", id).order("position");
    return { success: true, programme, modules: (liens || []).map((l) => l.modules).filter(Boolean) };
  } catch (error) {
    console.error("getProgramme error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée ou met à jour un programme et l'ordre de ses modules (`moduleIds`, la
 * liste complète, dans l'ordre). Seuls les modules de l'organisation entrent.
 */
export async function enregistrerProgramme({ id, title, target_role, description, moduleIds = [] }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (!net(title, 160)) return { success: false, code: "titreManquant" };
    const admin = createAdminClient();
    const champs = { title: net(title, 160), target_role: net(target_role, 160), description: net(description, 2000), updated_at: new Date().toISOString() };

    let programId = id;
    if (id) {
      const { data, error } = await admin.from("programs").update(champs).eq("id", id).eq("organization_id", ctx.orgId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return { success: false, error: "Programme introuvable" };
    } else {
      const { data, error } = await admin.from("programs").insert({ ...champs, organization_id: ctx.orgId, created_by: ctx.user.id }).select("id").single();
      if (error) throw error;
      programId = data.id;
    }

    const demandes = [...new Set((moduleIds || []).filter(Boolean))].slice(0, 50);
    const { data: valides } = demandes.length
      ? await admin.from("modules").select("id").in("id", demandes).eq("organization_id", ctx.orgId)
      : { data: [] };
    const ok = new Set((valides || []).map((m) => m.id));
    await admin.from("program_modules").delete().eq("program_id", programId);
    const lignes = demandes.filter((m) => ok.has(m)).map((module_id, position) => ({ program_id: programId, module_id, position }));
    if (lignes.length) {
      const { error } = await admin.from("program_modules").insert(lignes);
      if (error) throw error;
    }
    return { success: true, id: programId };
  } catch (error) {
    console.error("enregistrerProgramme error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

export async function archiverProgramme(id) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { error } = await createAdminClient().from("programs")
      .update({ archived_at: new Date().toISOString() }).eq("id", id).eq("organization_id", ctx.orgId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("archiverProgramme error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
