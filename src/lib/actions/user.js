"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getOrgContext, exigerGestion } from "@/lib/org";

export async function getRecruiterName(userId) {
  try {
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !user) return null;
    return user.user_metadata?.company_name || null;
  } catch {
    return null;
  }
}

export async function updateProfile(data) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        company_name: data.company_name,
      }
    });

    if (error) {
      throw error;
    }

    // Force la revalidation du layout pour mettre à jour la sidebar
    revalidatePath("/", "layout");
    
    return { success: true };
  } catch (error) {
    console.error("Update Profile Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateSecuritySettings(oldPassword, newPassword, newEmail) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Vérifier l'ancien mot de passe en tentant une reconnexion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (signInError) {
      return { success: false, error: "L'ancien mot de passe est incorrect." };
    }

    const updates = {};
    if (newPassword && newPassword.trim() !== "") {
      updates.password = newPassword;
    }
    if (newEmail && newEmail !== user.email) {
      updates.email = newEmail;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.auth.updateUser(
        updates,
        { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback` }
      );
      if (updateError) {
        throw updateError;
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Update Security Error:", error);
    return { success: false, error: error.message };
  }
}

// L'image de marque est celle de l'ORGANISATION (migration 035) : tous ses
// admins et managers voient et modifient la même. La description reste dans
// les métadonnées du compte, comme avant.
export async function getEmployerBranding() {
  try {
    const ctx = await getOrgContext();
    if (!ctx) return { success: false, error: "Non authentifié" };
    const { user, org } = ctx;

    return {
      success: true,
      branding: {
        orgId: ctx.orgId,
        name: org.name || user.user_metadata?.company_name || "",
        logo_url: org.logo_url || "",
        primary_color: org.brand_primary_color || "#2563eb",
        // Vide = automatique : le texte des boutons se déduit du contraste.
        text_color: org.brand_secondary_color || "",
        description: user.user_metadata?.company_description || "",
      }
    };
  } catch (error) {
    console.error("Get Branding Error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployerBranding(brandingData) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { supabase } = ctx;

    // Écrit en service_role : les membres n'ont qu'un droit de LECTURE sur
    // `organizations` (migration 035). exigerGestion() a vérifié le rôle.
    const { error } = await createAdminClient()
      .from("organizations")
      .update({
        name: brandingData.name || null,
        logo_url: brandingData.logo_url || null,
        brand_primary_color: brandingData.primary_color || null,
        // Couleur du texte sur les boutons du parcours candidat : un #RRGGBB, ou
        // rien (automatique). Une saisie invalide vaut automatique.
        brand_secondary_color: /^#[0-9a-f]{6}$/i.test(brandingData.text_color || "") ? brandingData.text_color : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ctx.orgId);

    if (error) {
      throw error;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: { 
        company_name: brandingData.name,
        company_description: brandingData.description 
      }
    });

    if (authError) throw authError;

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    console.error("Update Branding Error:", error);
    return { success: false, error: error.message };
  }
}

