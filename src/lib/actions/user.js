"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
