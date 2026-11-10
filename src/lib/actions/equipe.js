"use server";

// L'équipe d'une organisation : membres, rôles, invitations (phase 0 de
// l'onboarding, docs/PLAN.md). Tables de la migration 035.
//
// ── Qui peut quoi ───────────────────────────────────────────────────────────
//   voir l'équipe               admin, manager
//   inviter un learner          admin, manager
//   inviter un admin, un manager admin
//   changer un rôle, retirer    admin
// Un learner n'a rien ici : il ne voit que son propre entraînement.
//
// ── Pourquoi tout passe par le serveur ──────────────────────────────────────
// Les membres n'ont qu'un droit de LECTURE sur `organization_members`, et
// AUCUN sur `org_invitations` (dont le jeton ne doit jamais atteindre un
// navigateur). Chaque action vérifie le rôle (lib/org.js) puis écrit en
// service_role.
//
// ── L'acceptation crée le compte côté serveur ───────────────────────────────
// L'inscription publique est fermée (réglage Supabase) : un `signUp()` depuis
// le navigateur échouerait, c'est ce qui a tué /join. Ici, l'invité choisit
// son mot de passe et le SERVEUR crée le compte (`auth.admin.createUser`,
// non soumis à la fermeture), confirmé d'office : le lien reçu par e-mail
// prouve déjà l'adresse.
//
// Un compte appartient à UNE organisation (contrainte de 035) : une adresse
// qui a déjà un compte Onbord ne peut pas être invitée ailleurs.
//
// ── Du recrutement à l'onboarding (phase 4, migration 044) ──────────────────
// « Passer en onboarding » sur la fiche d'un candidat envoie une invitation de
// learner qui garde le candidat d'origine. Le manager atteste l'avoir prévenu
// que ses résultats seront réutilisés ; la recrue, elle, ACCEPTE (ou non) à
// l'activation de son compte. Seulement alors ses lacunes sont copiées sur sa
// fiche de membre (`hiring_gaps`).

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { getOrgContext, exigerGestion, exigerAdminOrg, ROLES, MOT_DE_PASSE_MIN } from "@/lib/org";
import { sendEmail } from "@/lib/resend";
import { traducteurServeur } from "@/lib/i18n/traduireServeur";
import { emailInvitation } from "@/lib/emailsApplication";
import { coerceUiLocale } from "@/lib/i18n/config";
import { lacunesDuRecrutement, adresseDeTest } from "@/lib/essais";
import { consommer, ipDe, SEUILS } from "@/lib/rateLimit";

const DUREE_INVITATION_JOURS = 7;

const hacher = (jeton) => createHash("sha256").update(jeton).digest("hex");
const adresseValide = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
const lienInvitation = (locale, jeton) =>
  `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${locale}/invitation/${jeton}`;

/** L'adresse a-t-elle déjà un compte Onbord ? (public.users porte l'e-mail.) */
async function compteExiste(admin, email) {
  const { data } = await admin.from("users").select("id").ilike("email", email).limit(1);
  return Boolean(data?.length);
}

/**
 * L'équipe : les membres (nom, e-mail, rôle) et les invitations en attente.
 * Un manager voit tout, mais ne peut agir que sur les invitations de learners.
 */
export async function listerEquipe() {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();

    const [{ data: membres }, { data: invitations }] = await Promise.all([
      admin
        .from("organization_members")
        .select("user_id, role, created_at")
        .eq("organization_id", ctx.orgId)
        .order("created_at", { ascending: true }),
      admin
        .from("org_invitations")
        .select("id, email, role, created_at, expires_at")
        .eq("organization_id", ctx.orgId)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const ids = (membres || []).map((m) => m.user_id);
    const { data: profils } = ids.length
      ? await admin.from("users").select("id, email, first_name, last_name").in("id", ids)
      : { data: [] };
    const parId = new Map((profils || []).map((p) => [p.id, p]));

    const maintenant = Date.now();
    return {
      success: true,
      moi: { userId: ctx.user.id, orgRole: ctx.orgRole },
      membres: (membres || []).map((m) => {
        const p = parId.get(m.user_id) || {};
        return {
          userId: m.user_id,
          role: m.role,
          email: p.email || "",
          nom: [p.first_name, p.last_name].filter(Boolean).join(" "),
          depuis: m.created_at,
        };
      }),
      invitations: (invitations || []).map((i) => ({
        ...i,
        expiree: new Date(i.expires_at).getTime() < maintenant,
      })),
    };
  } catch (error) {
    console.error("listerEquipe error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Invite une adresse dans l'organisation, avec un rôle. Envoie l'e-mail dans
 * la langue choisie (`locale`, fr | en : celle de l'interface de l'invité).
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export async function inviterMembre({ email, role, locale }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (!ROLES.includes(role)) return { success: false, code: "roleInvalide" };
    // Un manager n'invite que des learners : donner un rôle de gestion est
    // réservé à l'admin.
    if (role !== "learner" && !ctx.estAdminOrg) return { success: false, code: "roleInterdit" };

    const adresse = String(email || "").trim().toLowerCase();
    if (!adresseValide(adresse)) return { success: false, code: "adresseInvalide" };

    // 30 invitations par heure et par organisation : une vague d'embauche
    // passe, un envoi en boucle s'arrête.
    const verdict = consommer(`invitation-equipe:${ctx.orgId}`, SEUILS.invitationsEquipeParOrg.max, SEUILS.invitationsEquipeParOrg.fenetre);
    if (!verdict.autorise) return { success: false, code: "tropDInvitations" };

    const admin = createAdminClient();
    if (await compteExiste(admin, adresse)) return { success: false, code: "compteExistant" };
    return await envoyerInvitation(ctx, admin, { adresse, role, locale });
  } catch (error) {
    console.error("inviterMembre error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée l'invitation et envoie son e-mail. L'appelant a vérifié le rôle,
 * l'adresse et l'absence de compte. `sourceCandidateId` : l'invitation vient
 * de la fiche d'un candidat (phase 4).
 */
async function envoyerInvitation(ctx, admin, { adresse, role, locale, sourceCandidateId = null }) {
  // Une seule invitation vivante par adresse : la précédente est révoquée,
  // son lien cesse de fonctionner.
  await admin
    .from("org_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", ctx.orgId)
    .ilike("email", adresse)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const langue = coerceUiLocale(locale);
  const jeton = randomBytes(32).toString("base64url");
  const { error } = await admin.from("org_invitations").insert({
    organization_id: ctx.orgId,
    email: adresse,
    role,
    locale: langue,
    token_hash: hacher(jeton),
    invited_by: ctx.user.id,
    expires_at: new Date(Date.now() + DUREE_INVITATION_JOURS * 86_400_000).toISOString(),
    // Le manager a attesté avoir prévenu le candidat (versOnboarding).
    ...(sourceCandidateId ? { source_candidate_id: sourceCandidateId, results_reuse_informed_at: new Date().toISOString() } : {}),
  });
  if (error) throw error;

  const t = await traducteurServeur(langue);
  const meta = ctx.user.user_metadata || {};
  const invitePar = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
  const mail = emailInvitation({ t, organisation: ctx.org.name, invitePar, role, lien: lienInvitation(langue, jeton), depuisRecrutement: Boolean(sourceCandidateId) });
  // Domaine réservé aux tests (example.com…) : l'invitation existe, rien ne part.
  if (adresseDeTest(adresse)) {
    console.log(`invitation « ${mail.subject} » non envoyée : ${adresse} est une adresse de test.`);
    return { success: true };
  }
  const envoi = await sendEmail({ to: adresse, subject: mail.subject, html: mail.html, text: mail.text, replyTo: ctx.user.email });
  if (!envoi?.success) return { success: false, code: "envoiImpossible" };

  return { success: true };
}

/** Le candidat, s'il appartient à l'organisation du manager. */
async function candidatDeLOrg(admin, orgId, candidateId) {
  const { data } = await admin.from("candidates")
    .select("id, email, first_name, last_name, jobs(organization_id)")
    .eq("id", candidateId).maybeSingle();
  return data?.jobs?.organization_id === orgId ? data : null;
}

/**
 * « Passer en onboarding » : invite le candidat comme learner. `informe` : le
 * manager atteste l'avoir prévenu que ses résultats de la simulation seront
 * réutilisés pour son entraînement — sans cette case, rien ne part.
 */
export async function versOnboarding(candidateId, { email, locale, informe }) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (informe !== true) return { success: false, code: "informationRequise" };
    const verdict = consommer(`invitation-equipe:${ctx.orgId}`, SEUILS.invitationsEquipeParOrg.max, SEUILS.invitationsEquipeParOrg.fenetre);
    if (!verdict.autorise) return { success: false, code: "tropDInvitations" };

    const admin = createAdminClient();
    const candidat = await candidatDeLOrg(admin, ctx.orgId, candidateId);
    if (!candidat) return { success: false, error: "Candidat introuvable" };
    const adresse = String(email || candidat.email || "").trim().toLowerCase();
    if (!adresseValide(adresse)) return { success: false, code: "adresseInvalide" };
    if (await compteExiste(admin, adresse)) return { success: false, code: "compteExistant" };

    return await envoyerInvitation(ctx, admin, { adresse, role: "learner", locale, sourceCandidateId: candidat.id });
  } catch (error) {
    console.error("versOnboarding error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Où en est le passage en onboarding d'un candidat : aucune invitation, une
 * invitation en attente, ou un compte de learner (son id, pour la fiche).
 */
export async function etatVersOnboarding(candidateId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();
    if (!(await candidatDeLOrg(admin, ctx.orgId, candidateId))) return { success: false, error: "Candidat introuvable" };
    const { data: membre } = await admin.from("organization_members").select("user_id")
      .eq("organization_id", ctx.orgId).eq("source_candidate_id", candidateId).maybeSingle();
    if (membre) return { success: true, etat: "membre", userId: membre.user_id };
    const { data: inv } = await admin.from("org_invitations").select("email, created_at, accepted_at, expires_at")
      .eq("organization_id", ctx.orgId).eq("source_candidate_id", candidateId).is("revoked_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (inv && !inv.accepted_at && new Date(inv.expires_at).getTime() > Date.now()) {
      return { success: true, etat: "invite", email: inv.email, le: inv.created_at };
    }
    return { success: true, etat: inv?.accepted_at ? "accepte" : "aucun" };
  } catch (error) {
    console.error("etatVersOnboarding error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Ce que la recrue accepte de partager : les lacunes de sa dernière simulation
 * notée, figées avec le poste et la note. Null s'il n'y a rien de noté.
 */
async function lacunesDuCandidat(admin, candidateId) {
  const { data: run } = await admin.from("candidate_runs")
    .select("scored_at, run_scores(overall, criterion_scores), candidates(jobs(title, experience_locale))")
    .eq("candidate_id", candidateId).eq("status", "scored")
    .order("scored_at", { ascending: false }).limit(1).maybeSingle();
  const score = Array.isArray(run?.run_scores) ? run.run_scores[0] : run?.run_scores;
  if (!score) return null;
  return {
    poste: run.candidates?.jobs?.title || "",
    langue: run.candidates?.jobs?.experience_locale || null,
    score: score.overall ?? null,
    date: run.scored_at,
    lacunes: lacunesDuRecrutement(score.criterion_scores),
  };
}

/** Annule une invitation en attente : son lien cesse de fonctionner. */
export async function revoquerInvitation(invitationId) {
  try {
    const ctx = await exigerGestion();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    const admin = createAdminClient();

    let requete = admin
      .from("org_invitations")
      .update({ revoked_at: new Date().toISOString() }, { count: "exact" })
      .eq("id", invitationId)
      .eq("organization_id", ctx.orgId)
      .is("accepted_at", null);
    // Un manager ne révoque que ce qu'il a le droit d'envoyer.
    if (!ctx.estAdminOrg) requete = requete.eq("role", "learner");
    const { error, count } = await requete;
    if (error) throw error;
    if (!count) return { success: false, error: "Invitation introuvable" };
    return { success: true };
  } catch (error) {
    console.error("revoquerInvitation error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Le nombre d'admins de l'organisation : il en faut toujours au moins un. */
async function nombreAdmins(admin, orgId) {
  const { count } = await admin
    .from("organization_members")
    .select("user_id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("role", "admin");
  return count || 0;
}

/** Change le rôle d'un membre. Admin seulement ; le dernier admin le reste. */
export async function changerRole(userId, role) {
  try {
    const ctx = await exigerAdminOrg();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (!ROLES.includes(role)) return { success: false, code: "roleInvalide" };
    const admin = createAdminClient();

    const { data: membre } = await admin
      .from("organization_members").select("role")
      .eq("organization_id", ctx.orgId).eq("user_id", userId).maybeSingle();
    if (!membre) return { success: false, error: "Membre introuvable" };
    if (membre.role === "admin" && role !== "admin" && (await nombreAdmins(admin, ctx.orgId)) <= 1) {
      return { success: false, code: "dernierAdmin" };
    }

    const { error } = await admin
      .from("organization_members").update({ role })
      .eq("organization_id", ctx.orgId).eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("changerRole error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Retire un membre de l'organisation. Admin seulement.
 *
 * Son compte est DÉSACTIVÉ (connexion bloquée), pas supprimé : ses essais et
 * ses notes restent lisibles par l'organisation. Sans ce blocage, il pourrait
 * encore se connecter, et getOrgContext() lui créerait une organisation à lui.
 */
export async function retirerMembre(userId) {
  try {
    const ctx = await exigerAdminOrg();
    if (ctx.erreur) return { success: false, error: ctx.erreur };
    if (userId === ctx.user.id) return { success: false, code: "pasSoiMeme" };
    const admin = createAdminClient();

    const { data: membre } = await admin
      .from("organization_members").select("role")
      .eq("organization_id", ctx.orgId).eq("user_id", userId).maybeSingle();
    if (!membre) return { success: false, error: "Membre introuvable" };
    if (membre.role === "admin" && (await nombreAdmins(admin, ctx.orgId)) <= 1) {
      return { success: false, code: "dernierAdmin" };
    }

    const { error: banErr } = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
    if (banErr) throw banErr;
    const { error } = await admin
      .from("organization_members").delete()
      .eq("organization_id", ctx.orgId).eq("user_id", userId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("retirerMembre error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

// ── Côté invité (sans session) ──────────────────────────────────────────────

/** Ce que l'écran d'acceptation montre : l'organisation, l'adresse, le rôle. */
async function invitationValide(admin, jeton) {
  if (typeof jeton !== "string" || jeton.length < 20 || jeton.length > 100) return { code: "invalide" };
  const { data: inv } = await admin
    .from("org_invitations")
    .select("id, organization_id, email, role, locale, expires_at, accepted_at, revoked_at, source_candidate_id, organizations(name)")
    .eq("token_hash", hacher(jeton))
    .maybeSingle();
  if (!inv || inv.revoked_at) return { code: "invalide" };
  if (inv.accepted_at) return { code: "dejaAcceptee" };
  if (new Date(inv.expires_at).getTime() < Date.now()) return { code: "expiree" };
  return { inv };
}

export async function lireInvitation(jeton) {
  try {
    const verdict = consommer(`lecture-invitation:ip:${ipDe(await headers())}`, SEUILS.invitationParIp.max, SEUILS.invitationParIp.fenetre);
    if (!verdict.autorise) return { success: false, code: "tropDEssais" };
    const { inv, code } = await invitationValide(createAdminClient(), jeton);
    if (!inv) return { success: false, code };
    return {
      success: true,
      invitation: {
        email: inv.email, role: inv.role, locale: inv.locale, organisation: inv.organizations?.name || "",
        // Venue de la fiche d'un candidat : l'écran demande l'accord pour
        // réutiliser ses résultats de recrutement.
        depuisRecrutement: Boolean(inv.source_candidate_id),
      },
    };
  } catch (error) {
    console.error("lireInvitation error:", error);
    return { success: false, code: "invalide" };
  }
}

/**
 * Accepte une invitation : crée le compte, le rattache à l'organisation avec
 * son rôle, marque l'invitation utilisée. L'écran connecte ensuite l'invité
 * avec le mot de passe qu'il vient de choisir.
 */
export async function accepterInvitation({ jeton, prenom, nom, motDePasse, reutiliser = false }) {
  try {
    const verdict = consommer(`acceptation-invitation:ip:${ipDe(await headers())}`, SEUILS.invitationParIp.max, SEUILS.invitationParIp.fenetre);
    if (!verdict.autorise) return { success: false, code: "tropDEssais" };
    if (typeof motDePasse !== "string" || motDePasse.length < MOT_DE_PASSE_MIN) return { success: false, code: "motDePasseCourt" };

    const admin = createAdminClient();
    const { inv, code } = await invitationValide(admin, jeton);
    if (!inv) return { success: false, code };
    if (await compteExiste(admin, inv.email)) return { success: false, code: "compteExistant" };

    // L'invitation est RÉSERVÉE avant la création du compte : deux clics
    // simultanés ne créent qu'un compte, le second trouve accepted_at posé.
    const { data: reservee } = await admin
      .from("org_invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id)
      .is("accepted_at", null)
      .select("id");
    if (!reservee?.length) return { success: false, code: "dejaAcceptee" };

    const { data: cree, error: creeErr } = await admin.auth.admin.createUser({
      email: inv.email,
      password: motDePasse,
      email_confirm: true,
      user_metadata: {
        first_name: String(prenom || "").trim().slice(0, 80),
        last_name: String(nom || "").trim().slice(0, 80),
        company_name: inv.organizations?.name || "",
      },
    });
    if (creeErr || !cree?.user) {
      // Rien n'a été créé : l'invitation redevient utilisable.
      await admin.from("org_invitations").update({ accepted_at: null }).eq("id", inv.id);
      console.error("accepterInvitation createUser:", creeErr);
      return { success: false, code: "creationImpossible" };
    }

    const userId = cree.user.id;
    // Venue du recrutement : le lien au candidat est toujours gardé ; ses
    // résultats ne le sont QUE si la recrue vient d'accepter (case de l'écran).
    const origine = inv.source_candidate_id ? { source_candidate_id: inv.source_candidate_id } : {};
    if (inv.source_candidate_id && reutiliser === true) {
      origine.results_reuse_accepted_at = new Date().toISOString();
      origine.hiring_gaps = await lacunesDuCandidat(admin, inv.source_candidate_id);
    }
    const { error: membreErr } = await admin
      .from("organization_members")
      .insert({ organization_id: inv.organization_id, user_id: userId, role: inv.role, ...origine });
    if (membreErr) throw membreErr;

    // La langue de l'interface : celle choisie à l'invitation. Le trigger de
    // création a posé la ligne `users` ; on la complète.
    await admin.from("users").update({ ui_locale: coerceUiLocale(inv.locale) }).eq("id", userId);
    await admin.from("org_invitations").update({ accepted_by: userId }).eq("id", inv.id);

    return { success: true, email: inv.email, role: inv.role, locale: inv.locale };
  } catch (error) {
    console.error("accepterInvitation error:", error);
    return { success: false, code: "creationImpossible" };
  }
}

/** Le rôle du compte connecté, pour les écrans qui s'adaptent (onglets, menu). */
export async function monRole() {
  const ctx = await getOrgContext();
  return ctx ? { orgRole: ctx.orgRole, orgId: ctx.orgId } : null;
}
