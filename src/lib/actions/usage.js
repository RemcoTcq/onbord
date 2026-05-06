"use server";

import { checkQuota as check, incrementUsage as increment } from "../utils/limits";
import { createClient } from "../supabase/server";

export async function checkUserQuota(type) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, error: "Non authentifié" };

    return await check(user.id, type);
  } catch (error) {
    console.error("Check Quota Error:", error);
    return { allowed: false, error: "Erreur technique" };
  }
}

export async function incrementUserUsage(type, amount = 1) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await increment(user.id, type, amount);
  } catch (error) {
    console.error("Increment Usage Error:", error);
  }
}
