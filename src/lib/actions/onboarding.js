"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * État du guide d'activation : où en est le recruteur dans sa prise en main.
 *
 * ── Pourquoi une action serveur, et pas trois requêtes depuis le composant ───
 * Le guide d'origine interrogeait `jobs` et `candidates` directement depuis le
 * navigateur, toutes les dix secondes. Deux raisons de tout remonter ici :
 *
 *  1. Les étapes ne portent plus sur les mêmes tables. L'expérience candidat se
 *     lit dans `experiences`, qui n'appartient au recruteur que par jointure sur
 *     `jobs` — une condition qu'on ne veut pas écrire trois fois dans un
 *     composant client.
 *  2. Le guide dit au recruteur ce qu'il lui reste à faire. Ce verdict se
 *     calcule à UN endroit, sinon l'écran et la réalité se désaccordent.
 *
 * Lecture en service_role avec filtre explicite sur `user_id` : même motif que
 * listDeletedJobs (lib/actions/candidate.js). Le filtre n'est pas un second
 * rideau, c'est LA protection — ne jamais le retirer.
 *
 * @returns {Promise<{success: boolean, status?: object, firstJobId?: string|null, error?: string}>}
 */
export async function getOnboardingStatus() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const admin = createAdminClient();

    const [profil, offres, candidats] = await Promise.all([
      admin
        .from("users")
        .select("company_ai_context, company_logo_url, brand_primary_color")
        .eq("id", user.id)
        .maybeSingle(),
      // La corbeille est exclue : une offre supprimée ne prouve plus rien.
      admin
        .from("jobs")
        .select("id, extracted_criteria, created_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true }),
      admin
        .from("candidates")
        .select("id, jobs!inner(user_id)", { count: "exact", head: true })
        .eq("jobs.user_id", user.id),
    ]);

    const ctx = profil.data?.company_ai_context || {};
    // « Profil rempli » = le contexte que l'IA utilisera existe vraiment. Une
    // ligne créée mais vide ne rend service à personne, surtout pas à la
    // génération d'expérience qui s'en nourrit.
    const profilRempli = Boolean(
      (ctx.description || "").trim() || (ctx.industry || "").trim() || (ctx.target_market || "").trim()
    );
    // « Branding posé » = le formulaire a été enregistré au moins une fois. Les
    // deux colonnes sont nulles tant qu'on n'y a pas touché.
    const brandingPose = Boolean(profil.data?.company_logo_url || profil.data?.brand_primary_color);

    const jobs = offres.data || [];
    // Une offre ANALYSÉE, pas seulement créée : `extracted_criteria` est écrit
    // par l'analyse de l'offre, celle qui produit les compétences à valider.
    // C'est ce moment-là que le recruteur reconnaît comme « j'ai fait mon offre ».
    const offreAnalysee = jobs.some((j) => {
      const c = j.extracted_criteria;
      return c && ((c.hard_skills || []).length > 0 || (c.soft_skills || []).length > 0);
    });

    let experienceCreee = false;
    if (jobs.length) {
      const { count } = await admin
        .from("experiences")
        .select("id", { count: "exact", head: true })
        .in("job_id", jobs.map((j) => j.id));
      experienceCreee = (count || 0) > 0;
    }

    return {
      success: true,
      firstJobId: jobs[0]?.id || null,
      status: {
        compte: true,               // franchie par définition : il est connecté
        entreprise: profilRempli && brandingPose,
        offre: offreAnalysee,
        experience: experienceCreee,
        candidat: (candidats.count || 0) > 0,
      },
    };
  } catch (error) {
    console.error("getOnboardingStatus error:", error);
    return { success: false, error: "Erreur technique" };
  }
}
