"use server";

// Feedback candidat — ce que la fiche candidat lit et envoie.
//
// La propriété se vérifie TOUJOURS par une lecture RLS de `candidates` (elle ne
// renvoie la ligne que si le recruteur possède l'offre). Tout ce qui suit
// passe en service_role : `candidate_feedback` n'a aucune policy (migration
// 032), précisément pour que le navigateur ne puisse ni réécrire un brouillon
// ni effacer la date d'un envoi.

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { genererBrouillonFeedback, versionPourStatut } from "@/lib/candidateFeedback";
import { coerceExperienceLocale } from "@/lib/i18n/config";

// Adresse d'envoi sur le domaine vérifié d'Onbord. L'entreprise apparaît dans
// le NOM d'expéditeur, et les réponses du candidat vont au recruteur
// (Reply-To) : aucune configuration DNS demandée au client.
const ADRESSE_ENVOI = "notifications@onbord.be";

const OBJET_MAX = 200;
const CORPS_MAX = 6000;

async function candidatDuRecruteur(candidateId) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { erreur: "Non authentifié" };
  const { data: candidat } = await supabase
    .from("candidates")
    .select("id, job_id, first_name, last_name, email, status, jobs(user_id, experience_locale)")
    .eq("id", candidateId)
    .single();
  if (!candidat) return { erreur: "Candidat introuvable" };
  return { user, candidat, supabase };
}

// Nom d'expéditeur : une valeur d'en-tête, saisie par le client. On retire
// tout ce qui pourrait la casser ou y glisser un second en-tête.
function nomExpediteur(entreprise) {
  const propre = String(entreprise || "").replace(/[<>"\r\n,;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  return propre ? `${propre} via Onbord` : "Onbord";
}

async function entrepriseDe(admin, userId) {
  const { data } = await admin.from("users").select("company_name").eq("id", userId).single();
  return data?.company_name || "";
}

function vueEnvoye(row) {
  return {
    at: row.sent_at,
    version: row.sent_version,
    subject: row.sent_subject,
    body: row.sent_body,
    to: row.sent_to,
  };
}

/** Date d'envoi seule — pour le libellé du bouton, sans rien générer. */
export async function getFeedbackSentAt(candidateId) {
  const ctx = await candidatDuRecruteur(candidateId);
  if (ctx.erreur) return { success: false, error: ctx.erreur };
  const { data } = await createAdminClient()
    .from("candidate_feedback").select("sent_at").eq("candidate_id", candidateId).maybeSingle();
  return { success: true, sentAt: data?.sent_at || null };
}

/**
 * Ce que la fenêtre Feedback affiche. Un seul de ces états à la fois :
 *   sent          déjà envoyé : le texte réellement parti, en lecture seule
 *   needsDecision aucune décision enregistrée : rien n'est montré
 *   notScored     la notation n'est pas terminée
 *   generating    la rédaction lancée par la décision tourne encore : la
 *                 fenêtre redemande dans quelques secondes
 *   noMaterial    aucun checkpoint noté avec preuve : rien d'honnête à dire
 *   draft         le brouillon de la version qui correspond à la décision
 *
 * Le brouillon est normalement rédigé au clic sur la décision. S'il manque
 * (décision prise avant ce déploiement, rédaction en échec, ou notation
 * terminée après la décision), il est rédigé ici, à la demande — à partir des
 * mêmes checkpoints, sans relire la simulation.
 */
export async function getCandidateFeedback(candidateId) {
  try {
    const ctx = await candidatDuRecruteur(candidateId);
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { user, candidat } = ctx;
    const admin = createAdminClient();

    const lire = () => admin.from("candidate_feedback").select("*").eq("candidate_id", candidateId).maybeSingle();
    let { data: row, error } = await lire();
    if (error) throw new Error(`candidate_feedback illisible : ${error.message}`);

    if (row?.sent_at) return { success: true, state: "sent", sent: vueEnvoye(row) };

    const version = versionPourStatut(candidat.status);
    if (!version) return { success: true, state: "needsDecision" };

    if (!row?.[`draft_${version}`]) {
      const gen = await genererBrouillonFeedback(candidateId, version);
      if (!gen.success) {
        if (gen.error === "notScored") return { success: true, state: "notScored" };
        if (gen.error === "inProgress") return { success: true, state: "generating" };
        return { success: false, error: gen.error };
      }
      ({ data: row } = await lire());
      if (row?.sent_at) return { success: true, state: "sent", sent: vueEnvoye(row) };
    }

    const draft = row?.[`draft_${version}`];
    if (!draft || draft.no_material) return { success: true, state: "noMaterial", version };

    return {
      success: true,
      state: "draft",
      version,
      locale: coerceExperienceLocale(row.locale),
      subject: draft.subject,
      body: draft.body,
      warnings: draft.warnings || [],
      to: candidat.email || null,
      from: nomExpediteur(await entrepriseDe(admin, candidat.jobs?.user_id)),
      replyTo: user.email,
    };
  } catch (error) {
    console.error("getCandidateFeedback :", error);
    return { success: false, error: error.message };
  }
}

/**
 * Envoie le feedback, avec les retouches du recruteur. Le SEUL endroit d'où
 * il part : ni le scoring ni la décision n'envoient quoi que ce soit.
 *
 * L'envoi est réservé AVANT l'appel à Resend (sent_at posé sous condition
 * `sent_at is null`) : un double clic, ou deux onglets, n'envoient qu'une fois.
 * Si Resend refuse, la réservation est levée et le recruteur peut réessayer.
 */
export async function sendCandidateFeedback(candidateId, { subject, body }) {
  try {
    const ctx = await candidatDuRecruteur(candidateId);
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const { user, candidat, supabase } = ctx;

    const version = versionPourStatut(candidat.status);
    if (!version) return { success: false, error: "needsDecision" };
    if (!candidat.email) return { success: false, error: "noEmail" };

    const objet = String(subject || "").trim();
    const corps = String(body || "").trim();
    if (!objet || !corps) return { success: false, error: "empty" };
    if (objet.length > OBJET_MAX || corps.length > CORPS_MAX) return { success: false, error: "tooLong" };

    const admin = createAdminClient();
    const maintenant = new Date().toISOString();

    // Réservation. Exige un brouillon existant : on n'envoie pas un texte
    // libre à un candidat dont le feedback n'a jamais été rédigé.
    const { data: reserve, error: reserveErr } = await admin
      .from("candidate_feedback")
      .update({
        sent_at: maintenant,
        sent_version: version,
        sent_subject: objet,
        sent_body: corps,
        sent_to: candidat.email,
        sent_by: user.id,
        updated_at: maintenant,
      })
      .eq("candidate_id", candidateId)
      .is("sent_at", null)
      .not(`draft_${version}`, "is", null)
      .is(`draft_${version}->no_material`, null)
      .select("candidate_id");
    if (reserveErr) throw reserveErr;
    if (!reserve?.length) return { success: false, error: "alreadySentOrNoDraft" };

    const entreprise = await entrepriseDe(admin, candidat.jobs?.user_id);
    const envoi = await sendEmail({
      from: `${nomExpediteur(entreprise)} <${ADRESSE_ENVOI}>`,
      to: candidat.email,
      subject: objet,
      text: corps,
      html: texteVersHtml(corps),
      replyTo: user.email,
    });

    if (!envoi.success) {
      await admin.from("candidate_feedback").update({
        sent_at: null, sent_version: null, sent_subject: null, sent_body: null,
        sent_to: null, sent_by: null, updated_at: new Date().toISOString(),
      }).eq("candidate_id", candidateId);
      return { success: false, error: "sendFailed" };
    }

    const resendId = envoi.data?.id || null;
    if (resendId) {
      await admin.from("candidate_feedback").update({ resend_id: resendId }).eq("candidate_id", candidateId);
    }

    // Historique des mails de la fiche. Non bloquant : l'e-mail est parti.
    const { error: logErr } = await supabase.from("mail_logs").insert({
      candidate_id: candidateId,
      job_id: candidat.job_id,
      user_id: user.id,
      mail_type: "feedback",
    });
    if (logErr) console.error("sendCandidateFeedback — mail_logs :", logErr.message);

    return {
      success: true,
      sent: { at: maintenant, version, subject: objet, body: corps, to: candidat.email },
    };
  } catch (error) {
    console.error("sendCandidateFeedback :", error);
    return { success: false, error: error.message };
  }
}

// Le texte du recruteur est échappé : il passe dans un e-mail HTML, et rien de
// ce qu'il tape ne doit devenir une balise.
function texteVersHtml(texte) {
  const echappe = texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const paragraphes = echappe.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br>")}</p>`);
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:600px">${paragraphes.join("")}</div>`;
}
