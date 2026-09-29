// Versionnage d'une expérience à la première retouche — module serveur, pas
// "use server" (il n'expose aucun point d'entrée).
//
// ── Le défaut qu'il corrige ─────────────────────────────────────────────────
// Toutes les retouches (édition à la relecture, réécriture par l'assistant,
// ajout, suppression, déplacement d'étape, couverture d'une compétence)
// écrivaient EN PLACE, même sur une expérience que des candidats avaient déjà
// commencée. Or tout le parcours relit ces étapes en direct :
//   • la page du candidat — un candidat en cours voyait l'énoncé changer sous
//     ses yeux, ou disparaître ;
//   • le scoring, qui relit la grille au moment de noter : deux candidats d'une
//     même offre étaient notés sur deux grilles différentes, et un candidat
//     pouvait l'être sur un énoncé qu'il n'avait jamais lu ;
//   • et une étape supprimée effaçait en cascade les réponses déjà données.
// L'écran promettait pourtant « pour les prochains candidats uniquement ».
//
// ── La règle ────────────────────────────────────────────────────────────────
// Une version qu'un candidat a commencée (`locked_at`, posé par startRun) ne se
// modifie plus. La première retouche en fait une COPIE — nouvelle version,
// mêmes étapes — sur laquelle porte la modification. Les candidats déjà engagés
// gardent la leur jusqu'au bout, et sont notés sur SA grille
// (resolveCandidateAndRun les y ramène) ; les suivants entrent sur la nouvelle.
// Les retouches suivantes, tant qu'aucun candidat n'a commencé la copie,
// continuent de s'écrire en place : pas une version par faute de frappe.
//
// Aucune migration : tout tient dans les colonnes existantes.

/**
 * Renvoie une version modifiable de l'expérience : elle-même si aucun candidat
 * ne l'a commencée, sinon une copie fraîche.
 *
 * @param {object} supabase client du recruteur (la RLS vérifie la propriété)
 * @param {string} experienceId
 * @returns {Promise<{experienceId: string, correspondance: Map<string,string>|null, forked: boolean, version?: number}>}
 *   `correspondance` : id d'étape de l'ancienne version → id dans la copie.
 */
export async function versionModifiable(supabase, experienceId) {
  const { data: exp, error: expErr } = await supabase
    .from("experiences").select("*").eq("id", experienceId).single();
  if (expErr || !exp) throw new Error("Expérience introuvable");
  if (!exp.locked_at) return { experienceId, correspondance: null, forked: false };

  const { data: derniere } = await supabase
    .from("experiences").select("version").eq("job_id", exp.job_id)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (derniere?.version ?? exp.version ?? 0) + 1;
  const maintenant = new Date().toISOString();

  // Tout est recopié, sauf ce qui appartient à la version d'origine : son
  // verrou, ses dates, et ses coûts — la page Coûts les additionne, les
  // recopier les compterait deux fois.
  const {
    id, created_at, updated_at, locked_at, generation_usage, regeneration_usage,
    version: _ancienne, published_at, ...reste
  } = exp;
  const publiee = exp.status === "published";

  const { data: copie, error: insErr } = await supabase
    .from("experiences")
    .insert({ ...reste, version, published_at: publiee ? maintenant : null, updated_at: maintenant })
    .select("id, version")
    .single();
  if (insErr || !copie) throw insErr || new Error("Copie de l'expérience impossible");

  const { data: etapes } = await supabase
    .from("experience_steps").select("*").eq("experience_id", experienceId).order("order_index");
  const liste = etapes || [];
  const correspondance = new Map();

  // Une étape à la fois : l'appariement ancienne → nouvelle ne dépend ainsi ni
  // de l'ordre de retour d'un insert groupé, ni de l'unicité de order_index,
  // qu'aucune contrainte ne garantit. Une expérience compte moins de dix étapes.
  for (const { id: ancienId, experience_id: _e, created_at: _c, updated_at: _u, ...champs } of liste) {
    const { data: nouvelle, error: stepErr } = await supabase
      .from("experience_steps").insert({ ...champs, experience_id: copie.id }).select("id").single();
    if (stepErr || !nouvelle) {
      // Pas de copie à moitié faite : elle serait la version courante d'une
      // offre publiée, avec des étapes manquantes. Archivée et non supprimée :
      // la RLS ne donne pas au recruteur le droit de supprimer une expérience
      // (migration 011), un delete échouerait sans rien dire.
      await supabase.from("experiences").update({ status: "archived", updated_at: maintenant }).eq("id", copie.id);
      throw stepErr || new Error("Copie des étapes incomplète");
    }
    correspondance.set(ancienId, nouvelle.id);
  }

  // L'ancienne version publiée passe en archive : c'est la copie que les
  // nouveaux candidats rencontreront. Ses runs restent intacts (FK restrict) —
  // on ne change qu'un statut, on ne supprime rien.
  if (publiee) {
    await supabase
      .from("experiences")
      .update({ status: "archived", updated_at: maintenant })
      .eq("id", experienceId);
  }

  return { experienceId: copie.id, correspondance, forked: true, version: copie.version };
}
