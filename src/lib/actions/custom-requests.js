"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

export async function createCustomRequestAndNotify(role, skills, summary) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Vous devez être connecté pour faire cette demande.");
    }

    // 1. Insertion en base (Statut: 'new')
    // L'insertion ne doit pas échouer si l'email échoue.
    const { data: newRequest, error } = await supabase
      .from('custom_assessment_requests')
      .insert({
        company_id: user.id,
        role: role,
        skills: skills,
        conversation_summary: summary,
        status: 'new',
        email_sent: false
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      throw new Error("Erreur lors de l'enregistrement de la demande.");
    }

    // 2. Déclenchement de la notification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://onbord.be";
    const actionLink = `${appUrl}/admin/custom-requests/${newRequest.id}`;
    let emailSent = false;

    try {
      await sendEmail({
        from: "Onbord <notifications@onbord.be>",
        to: "remco@onbord.be",
        subject: `🚨 Nouvelle demande sur-mesure : ${role}`,
        html: `
          <h2>Nouvelle demande de test sur-mesure</h2>
          <p><strong>Poste visé :</strong> ${role}</p>
          <p><strong>Compétences requises :</strong> ${skills.join(', ')}</p>
          <p><strong>Résumé du besoin :</strong><br/> ${summary}</p>
          <p><strong>ID Entreprise / Utilisateur :</strong> ${user.id}</p>
          <p><strong>Date :</strong> ${new Date().toLocaleString('fr-FR')}</p>
          <br/>
          <a href="${actionLink}" style="padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">
            Ouvrir la fiche pour traiter la demande
          </a>
        `
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
      // On continue, on ne throw pas pour que la demande reste valide côté frontend
    }

    // Mise à jour du statut d'email si réussi
    if (emailSent) {
      await supabase
        .from('custom_assessment_requests')
        .update({ email_sent: true })
        .eq('id', newRequest.id);
    }

    return { success: true, requestId: newRequest.id, emailSent };
  } catch (err) {
    console.error("createCustomRequestAndNotify Error:", err);
    return { success: false, error: err.message };
  }
}
