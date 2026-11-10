// Ce qui arrive à une ASSIGNATION (un module assigné à un learner, migration
// 042) une fois un essai noté, et les e-mails qui en partent (phase 3).
//
// ── La règle ────────────────────────────────────────────────────────────────
// Un essai qui atteint le score minimum du module passe l'assignation à
// « passed ». C'est le MANAGER qui la valide (lib/actions/personnes.js) — sauf
// si l'organisation a activé la validation automatique
// (organizations.auto_validate) : l'essai réussi la passe alors directement à
// « validated ». Le meilleur score est retenu, jamais le dernier. Une
// assignation validée le reste : un essai raté après coup ne la défait pas.
//
// Les e-mails ne bloquent jamais rien : un envoi raté se journalise, l'essai
// et l'assignation restent enregistrés.

import { sendEmail } from "@/lib/resend";
import { traducteurServeur } from "@/lib/i18n/traduireServeur";
import { coerceUiLocale } from "@/lib/i18n/config";
import { localiserChemin } from "@/lib/i18n/routes";
import { emailNouveauxModules, emailModuleValide } from "@/lib/emailsApplication";
import { issueEssai, adresseDeTest } from "@/lib/essais";

/** Lien absolu vers une page de l'application, dans la langue du destinataire. */
function lienApp(locale, chemin) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/${locale}${localiserChemin(chemin, locale)}`;
}

/** Le learner à qui écrire, et l'organisation qui signe. */
async function destinataire(admin, learnerId, orgId) {
  const [{ data: user }, { data: org }] = await Promise.all([
    admin.from("users").select("email, first_name, ui_locale").eq("id", learnerId).maybeSingle(),
    admin.from("organizations").select("name").eq("id", orgId).maybeSingle(),
  ]);
  if (!user?.email) return null;
  const locale = coerceUiLocale(user.ui_locale);
  return { email: user.email, prenom: user.first_name || "", locale, organisation: org?.name || "Onbord" };
}

async function envoyer(dest, mail) {
  if (adresseDeTest(dest.email)) {
    console.log(`e-mail « ${mail.subject} » non envoyé : ${dest.email} est une adresse de test.`);
    return { success: true, ignore: true };
  }
  const res = await sendEmail({ to: dest.email, subject: mail.subject, html: mail.html, text: mail.text });
  if (!res?.success) console.error(`e-mail « ${mail.subject} » à ${dest.email} refusé :`, res?.error);
  return res;
}

/** « Vous avez de nouveaux modules » — après une assignation. */
export async function envoyerNouveauxModules(admin, { learnerId, orgId, moduleIds }) {
  try {
    if (!moduleIds?.length) return;
    const dest = await destinataire(admin, learnerId, orgId);
    if (!dest) return;
    const { data: modules } = await admin.from("modules").select("title").in("id", moduleIds);
    const t = await traducteurServeur(dest.locale);
    const mail = emailNouveauxModules({
      t, prenom: dest.prenom, organisation: dest.organisation,
      titres: (modules || []).map((m) => m.title), lien: lienApp(dest.locale, "/formation"),
    });
    await envoyer(dest, mail);
  } catch (e) {
    console.error("envoyerNouveauxModules :", e.message);
  }
}

/** « Module validé » — par le manager, ou automatiquement. */
export async function envoyerModuleValide(admin, assignmentId) {
  try {
    const { data: a } = await admin.from("assignments")
      .select("learner_id, organization_id, best_score, modules(title)").eq("id", assignmentId).maybeSingle();
    if (!a) return;
    const dest = await destinataire(admin, a.learner_id, a.organization_id);
    if (!dest) return;
    const t = await traducteurServeur(dest.locale);
    const mail = emailModuleValide({
      t, prenom: dest.prenom, organisation: dest.organisation,
      module: a.modules?.title || "", score: a.best_score, lien: lienApp(dest.locale, "/formation"),
    });
    await envoyer(dest, mail);
  } catch (e) {
    console.error("envoyerModuleValide :", e.message);
  }
}

/**
 * Un essai vient d'être noté (runScoring.scoreRun) : l'assignation à laquelle
 * il appartient retient le meilleur score et avance si le minimum est atteint.
 */
export async function noterEssai(admin, run, overall) {
  if (!run?.assignment_id || overall == null) return;
  try {
    const { data: a } = await admin.from("assignments")
      .select("id, status, best_score, passed_at, organization_id, modules(min_score)")
      .eq("id", run.assignment_id).maybeSingle();
    if (!a) return;

    const { data: org } = await admin.from("organizations").select("auto_validate").eq("id", a.organization_id).maybeSingle();
    const { maj, valideMaintenant } = issueEssai({
      assignation: a, overall, minScore: a.modules?.min_score ?? 70,
      autoValidate: org?.auto_validate === true, maintenant: new Date().toISOString(),
    });

    const { error } = await admin.from("assignments").update(maj).eq("id", a.id);
    if (error) throw error;
    if (valideMaintenant) await envoyerModuleValide(admin, a.id);
  } catch (e) {
    // Non bloquant : la note est écrite, le manager voit l'essai. Seule
    // l'assignation reste en retard, et le prochain essai la rattrape.
    console.error(`noterEssai ${run.id} :`, e.message);
  }
}
