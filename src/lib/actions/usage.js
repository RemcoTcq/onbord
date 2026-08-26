"use server";

import {
  checkCredits,
  deductCredits,
  hasFeature,
  getCreditInfo,
  addCredits,
  changePlan,
  checkQuota,
  incrementUsage,
} from "../utils/limits";
import { createClient, createAdminClient } from "../supabase/server";
import { isAdmin } from "../utils/admin";
import { consommer, ipDe, SEUILS } from "../rateLimit";
import { headers } from "next/headers";

/** Vérifie que l'appelant est bien admin. Renvoie l'user si oui, sinon null. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdmin(user) ? user : null;
}

/**
 * L'utilisateur connecté est-il administrateur ?
 * Seule voie pour les écrans CLIENT : la liste ADMIN_EMAILS est une variable
 * serveur, un composant navigateur ne peut pas la lire (et ne doit pas).
 * Usage strictement cosmétique — afficher ou non une entrée de menu. Les
 * actions sensibles revalident par requireAdmin(), côté serveur.
 */
export async function isCurrentUserAdmin() {
  try {
    return !!(await requireAdmin());
  } catch {
    return false;
  }
}

export { checkQuota, incrementUsage }; // rétrocompatibilité

/**
 * Vérifie si l'utilisateur connecté a suffisamment de crédits.
 */
export async function checkUserCredits(cost) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, error: "Non authentifié" };
    return await checkCredits(user.id, cost);
  } catch (error) {
    console.error("checkUserCredits error:", error);
    return { allowed: false, error: "Erreur technique" };
  }
}

/**
 * Déduit les crédits pour une action sur un candidat (idempotent).
 */
export async function deductUserCredits(candidateId, actionType) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };
    return await deductCredits(user.id, candidateId, actionType);
  } catch (error) {
    console.error("deductUserCredits error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Vérifie si l'utilisateur connecté a accès à une feature selon son plan.
 */
export async function checkUserFeature(featureName) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    return await hasFeature(user.id, featureName);
  } catch (error) {
    console.error("checkUserFeature error:", error);
    return false;
  }
}

/**
 * Retourne les informations de crédits de l'utilisateur connecté.
 */
export async function getUserCreditInfo() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return await getCreditInfo(user.id);
  } catch (error) {
    console.error("getUserCreditInfo error:", error);
    return null;
  }
}

// ─── Actions Admin ────────────────────────────────────────────────────────────

/**
 * Ajoute des crédits à un utilisateur (admin seulement).
 */
export async function adminAddCredits(targetUserId, amount) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };
    return await addCredits(targetUserId, amount);
  } catch (error) {
    console.error("adminAddCredits error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Change le plan d'un utilisateur (admin seulement).
 */
export async function adminChangePlan(targetUserId, newPlan) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };
    return await changePlan(targetUserId, newPlan);
  } catch (error) {
    console.error("adminChangePlan error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Applique le plan d'une invitation à l'utilisateur connecté (fin d'inscription).
 * Le plan fait foi côté serveur : il est relu depuis le token d'invitation (le client
 * ne choisit pas son plan). Alloue les crédits et consomme le token.
 */
export async function claimInvitePlan(tokenId) {
  try {
    // Le tokenId vient du client : sans limite de débit, cette action se
    // parcourt en force brute jusqu'à tomber sur une invitation valide — et
    // certaines portent le plan `admin`.
    const verdict = consommer(
      `invite:ip:${ipDe(await headers())}`,
      SEUILS.invitationParIp.max,
      SEUILS.invitationParIp.fenetre
    );
    if (!verdict.autorise) {
      return { success: false, error: "Trop de tentatives. Réessayez plus tard." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const admin = createAdminClient();
    const { data: token } = await admin
      .from("invite_tokens")
      .select("id, plan, used")
      .eq("id", tokenId)
      .single();

    if (!token || token.used) {
      // Définitif : réessayer ne changera rien. C'est ce que claimPendingInvite
      // attend pour cesser de repasser à chaque chargement du tableau de bord.
      return { success: false, definitif: true, error: "Invitation invalide ou déjà utilisée" };
    }

    const plan = token.plan || "core";
    const res = await changePlan(user.id, plan); // alloue plan + crédits sur user_usage
    if (!res.success) return res;

    await admin
      .from("invite_tokens")
      .update({ used: true, used_by: user.id })
      .eq("id", tokenId);

    return { success: true, definitif: true, plan };
  } catch (error) {
    console.error("claimInvitePlan error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Réclame l'invitation mise en attente à l'inscription, une fois l'e-mail confirmé.
 *
 * ── Pourquoi cette action existe ─────────────────────────────────────────────
 * /join appelait claimInvitePlan() dans la foulée de signUp(). Or, quand la
 * confirmation d'e-mail est exigée, signUp() ne rend AUCUNE session : l'action
 * répondait « Non authentifié », l'écran affichait une erreur, et le compte
 * était créé sans son plan. L'invité arrivait sur la plateforme sans les crédits
 * de l'invitation qu'on venait de lui envoyer.
 *
 * Le jeton est donc simplement mis de côté sur le compte à sa création
 * (user_metadata.pending_invite_token) et réclamé à la première session réelle.
 *
 * ── Sur la confiance accordée à user_metadata ────────────────────────────────
 * Ce champ est modifiable par son propriétaire : il ne PROUVE rien. Il ne sert
 * qu'à déclencher la tentative. Tout ce qui compte — le plan appliqué, la
 * validité du jeton, sa consommation — est relu en base par claimInvitePlan, qui
 * porte déjà sa limite de débit. La surface est celle d'aujourd'hui, où le
 * client passe lui-même l'identifiant du jeton à cette même action.
 */
export async function claimPendingInvite() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const tokenId = user.user_metadata?.pending_invite_token;
    if (!tokenId) return { success: true, claimed: false };

    const res = await claimInvitePlan(tokenId);

    // On n'efface le marqueur que sur un verdict définitif. Une coupure réseau
    // ou une limite de débit atteinte doit laisser sa chance au chargement
    // suivant — sinon l'invité perd son plan sur un incident passager.
    if (res.definitif) {
      await supabase.auth.updateUser({ data: { pending_invite_token: null } });
    }

    return { ...res, claimed: !!res.success };
  } catch (error) {
    console.error("claimPendingInvite error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

// ─── Invitations : accès serveur ──────────────────────────────────────────────
// `invite_tokens` portait « Public can read tokens » (SELECT true) et « Public
// can update tokens » (UPDATE true) : n'importe qui pouvait LISTER toutes les
// invitations avec leur plan, et en MODIFIER une. Comme le plan `admin` existe,
// c'était un chemin d'élévation de privilèges à ciel ouvert (audit §8).
//
// La table est fermée par la migration 022 ; les quatre usages légitimes passent
// désormais par ces actions, en service_role, chacune avec son garde.

/**
 * Valide un jeton d'invitation pour la page publique /join.
 * Ne renvoie JAMAIS la ligne ni la liste : seulement de quoi afficher l'écran.
 * L'appelant est un visiteur anonyme — d'où la limite de débit, la même que
 * claimInvitePlan puisque c'est le même parcours de devinette qu'on ferme.
 */
export async function validateInviteToken(token) {
  try {
    const verdict = consommer(
      `invite:ip:${ipDe(await headers())}`,
      SEUILS.invitationParIp.max,
      SEUILS.invitationParIp.fenetre
    );
    if (!verdict.autorise) {
      return { success: false, error: "Trop de tentatives. Réessayez plus tard." };
    }

    if (!token) return { success: false, error: "Lien d'invitation invalide." };

    const admin = createAdminClient();
    const { data: invitation } = await admin
      .from("invite_tokens")
      .select("id, plan, used, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!invitation) return { success: false, error: "Ce lien d'invitation est invalide." };
    if (invitation.used) return { success: false, error: "Ce lien d'invitation a déjà été utilisé." };
    if (new Date(invitation.expires_at) < new Date()) {
      return { success: false, error: "Ce lien d'invitation a expiré." };
    }

    // `id` sert à claimInvitePlan, `plan` à l'affichage. Rien d'autre ne sort.
    return { success: true, id: invitation.id, plan: invitation.plan || "core" };
  } catch (error) {
    console.error("validateInviteToken error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/** Liste des invitations, pour l'écran /admin. */
export async function adminListInviteTokens() {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };

    const { data } = await createAdminClient()
      .from("invite_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    return { success: true, tokens: data || [] };
  } catch (error) {
    console.error("adminListInviteTokens error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée une invitation. Le JETON est tiré CÔTÉ SERVEUR : il était auparavant
 * généré dans le navigateur, donc avec l'aléa du client, et le plan y était
 * choisi librement puisque l'insert partait du navigateur.
 */
export async function adminCreateInviteToken(plan) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };

    const plansValides = ["core", "pro", "custom", "admin"];
    if (!plansValides.includes(plan)) return { success: false, error: "Plan inconnu" };

    const token = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await createAdminClient()
      .from("invite_tokens")
      .insert({ token, plan, expires_at: expiresAt })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, token: data };
  } catch (error) {
    console.error("adminCreateInviteToken error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Crée un compte de A à Z, sans passer par l'inscription publique.
 *
 * ── Pourquoi cette action existe ─────────────────────────────────────────────
 * L'inscription publique est fermée dans Supabase (« Allow new users to sign
 * up » décoché). Ce réglage ferme la VRAIE porte : l'inscription ne passe pas
 * par ce serveur, le navigateur appelle directement /auth/v1/signup avec la clé
 * anon, qui est publique par construction. Retirer le formulaire n'aurait rien
 * fermé du tout.
 *
 * L'API d'administration, elle, n'est pas soumise à ce réglage : c'est le seul
 * chemin qui reste, et il est gardé par ADMIN_EMAILS.
 *
 * ── Choix de conception ──────────────────────────────────────────────────────
 * email_confirm: true — le compte est utilisable immédiatement, sans attendre
 * un mail de confirmation. C'est un compte de démonstration remis en main
 * propre, pas une inscription à vérifier, et ça évite de dépendre de la limite
 * d'envoi du SMTP.
 *
 * Le mot de passe est TIRÉ ICI et renvoyé une seule fois. Il n'est stocké nulle
 * part : Supabase n'en garde qu'un hachage, et cette action ne le journalise
 * pas. Perdu, il se remplace — il ne se retrouve pas.
 *
 * @param {{email: string, first_name?: string, last_name?: string, company_name?: string, plan: string}} champs
 * @returns {Promise<{success: boolean, email?: string, motDePasse?: string, error?: string}>}
 */
export async function adminCreerCompte({ email, first_name, last_name, company_name, plan }) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };

    const adresse = (email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adresse)) {
      return { success: false, error: "Adresse e-mail invalide" };
    }

    // Même liste que les invitations : le plan vient du serveur, jamais d'un
    // champ libre — « admin » est dans la liste, et il ouvre tout.
    const plansValides = ["core", "pro", "custom", "admin"];
    if (!plansValides.includes(plan)) return { success: false, error: "Plan inconnu" };

    const motDePasse = genererMotDePasse();
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email: adresse,
      password: motDePasse,
      email_confirm: true,
      user_metadata: {
        first_name: (first_name || "").trim(),
        last_name: (last_name || "").trim(),
        company_name: (company_name || "").trim(),
      },
    });

    // Le cas courant est une adresse déjà prise : le message de Supabase le dit
    // mieux qu'une phrase générique.
    if (error) return { success: false, error: error.message };

    // Le plan et les crédits ne viennent pas avec le compte : sans cet appel, la
    // ligne user_usage n'existe pas et le plan retombe sur Core par défaut
    // (utils/limits.js), quel que soit celui demandé ici.
    const res = await changePlan(data.user.id, plan);
    if (!res.success) {
      return { success: false, error: "Compte créé, mais plan non appliqué : " + res.error };
    }

    return { success: true, email: adresse, motDePasse };
  } catch (error) {
    console.error("adminCreerCompte error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Mot de passe aléatoire, lisible à voix haute et retapable à la main : il est
 * transmis de vive voix ou par message, pas copié-collé par une machine.
 * Alphabet sans les caractères qu'on confond (0/O, 1/l/I).
 */
function genererMotDePasse() {
  const alphabet = "abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
  const tirage = crypto.getRandomValues(new Uint8Array(15));
  const car = [...tirage].map((o) => alphabet[o % alphabet.length]);
  // Trois groupes de cinq, séparés par des tirets.
  return [car.slice(0, 5), car.slice(5, 10), car.slice(10, 15)].map((g) => g.join("")).join("-");
}

/** Supprime une invitation. */
export async function adminDeleteInviteToken(tokenId) {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };

    await createAdminClient().from("invite_tokens").delete().eq("id", tokenId);
    return { success: true };
  } catch (error) {
    console.error("adminDeleteInviteToken error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

/**
 * Consommation de tous les comptes, pour l'écran /admin/billing.
 * Cet écran lisait `user_usage` depuis le NAVIGATEUR, ce qui n'était possible
 * que par le contournement `is_admin()` posé dans la policy SQL — la fonction
 * qui testait le suffixe @onbord.be. La migration 023 la retire ; la lecture
 * passe ici, où le garde est ADMIN_EMAILS, source unique de vérité.
 */
export async function adminListUserUsage() {
  try {
    if (!(await requireAdmin())) return { success: false, error: "Accès refusé" };

    const { data } = await createAdminClient()
      .from("user_usage")
      .select("*")
      .order("credits_balance", { ascending: true });

    return { success: true, usages: data || [] };
  } catch (error) {
    console.error("adminListUserUsage error:", error);
    return { success: false, error: "Erreur technique" };
  }
}

// Rétrocompatibilité
export async function checkUserQuota(type) {
  return { allowed: true, remaining: 999999 };
}

export async function incrementUserUsage() {
  // no-op
}
