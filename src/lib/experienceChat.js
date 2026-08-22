// Fil de conversation du chat de conception d'expérience — module PUR.
//
// Pas de "use server" : il est utilisé DES DEUX CÔTÉS de la frontière —
// par la route /api/chat/assessment (qui écrit le fil à chaque tour) et par les
// server actions de lib/actions/experienceChat.js (qui le lisent au montage du
// composant). Même motif que experienceGeneration.js, et même raison : un
// module "use server" ne peut exporter que des fonctions async, et une route
// handler ne peut pas appeler une server action en Next 16.

// ─── Bornes ───────────────────────────────────────────────────────────────────
// Le fil entier tient dans UNE ligne jsonb (table experience_chats, migration
// 025). Sans borne, cette ligne grossit à chaque tour et n'est jamais purgée.
//
// Deux bornes distinctes, parce que les deux problèmes le sont :
//   STOCKEES : la taille de la ligne en base.
//   MODELE   : ce qu'on renvoie à Claude à chaque tour, donc ce qu'on PAIE.
// La seconde est plus basse : c'est le poste de coût, et un échange de
// conception n'a jamais besoin de son propre début pour continuer — l'état
// réel de l'expérience est réinjecté à part, depuis la base, à chaque tour.
export const MAX_MESSAGES_STOCKES = 60;
export const MAX_MESSAGES_MODELE = 30;

// Garde-fou de dernier recours : un fil anormalement lourd (contenus collés,
// blocs de sandbox recopiés) est amputé par la tête jusqu'à repasser sous la
// limite, quitte à descendre sous MAX_MESSAGES_STOCKES.
const TAILLE_MAX_OCTETS = 400_000;

function contientToolResult(msg) {
  return Array.isArray(msg?.content) && msg.content.some((c) => c?.type === "tool_result");
}

/**
 * Ampute le fil par la TÊTE, sans jamais séparer un `tool_use` de son
 * `tool_result`.
 *
 * Couper au hasard n'est pas une option : l'API Anthropic refuse (400) un
 * `tool_result` dont le `tool_use` correspondant a disparu du fil, et refuse
 * un premier message qui ne soit pas de rôle `user`. On ne cherche donc pas à
 * couper À la longueur voulue, mais AU PREMIER POINT SÛR qui la respecte — le
 * premier message `user` ordinaire rencontré.
 *
 * Si aucun point de coupe sûr n'existe (un seul long échange d'outils), on
 * renvoie le fil entier : dépasser la borne coûte quelques tokens, envoyer un
 * fil incohérent casse la conversation.
 */
export function bornerFil(messages, max) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length <= max) return list.slice();

  for (let i = list.length - max; i < list.length; i++) {
    if (list[i]?.role === "user" && !contientToolResult(list[i])) return list.slice(i);
  }
  return list.slice();
}

// Applique la borne de stockage, puis celle de taille.
function bornerPourStockage(messages) {
  let out = bornerFil(messages, MAX_MESSAGES_STOCKES);
  while (out.length > 2 && JSON.stringify(out).length > TAILLE_MAX_OCTETS) {
    const reduit = bornerFil(out, out.length - 1);
    // Plus aucun point de coupe sûr en dessous : on garde ce qu'on a plutôt que
    // de boucler, ou de renvoyer un fil que l'API refusera.
    if (reduit.length === out.length) break;
    out = reduit;
  }
  return out;
}

/** Fil enregistré pour une offre. Tableau vide si aucun échange. */
export async function chargerFil(supabase, jobId) {
  const { data, error } = await supabase
    .from("experience_chats")
    .select("messages")
    .eq("job_id", jobId)
    .maybeSingle();
  if (error) {
    console.error("chargerFil error:", error.message);
    return [];
  }
  return Array.isArray(data?.messages) ? data.messages : [];
}

/**
 * Réécrit le fil EN ENTIER. Le client détient la version courante de la
 * conversation et nous la renvoie à chaque tour ; réécrire est donc à la fois
 * plus simple et plus sûr qu'un append (aucun doublon possible si un tour est
 * rejoué, aucun ordre à reconstituer).
 *
 * Ne fait JAMAIS échouer le tour de chat : perdre la mémoire d'un échange est
 * ennuyeux, perdre la réponse que le recruteur attend l'est davantage.
 */
export async function enregistrerFil(supabase, jobId, messages) {
  try {
    const { error } = await supabase
      .from("experience_chats")
      .upsert(
        { job_id: jobId, messages: bornerPourStockage(messages), updated_at: new Date().toISOString() },
        { onConflict: "job_id" }
      );
    if (error) throw error;
  } catch (err) {
    console.error("enregistrerFil error:", err.message);
  }
}

// ─── Ce que le chat doit savoir de l'expérience déjà en place ─────────────────
// Le fil de conversation ne suffit pas à rendre le chat conscient de l'existant,
// et ne doit surtout pas y suffire : le recruteur édite aussi les étapes À LA
// MAIN dans l'écran de relecture, et ces retouches-là ne passent jamais par le
// chat. Un fil qui ferait autorité serait donc périmé dès la première correction
// manuelle — le chat proposerait de réécrire un énoncé qui n'existe plus.
//
// L'état est donc relu EN BASE à chaque tour et réinjecté dans le prompt système.
// La base fait foi, le fil ne porte que l'intention.

const LIBELLES_KIND = {
  qualifying: "Question qualifiante",
  question: "Question ciblée",
  task: "Tâche (mise en situation)",
  classic_qcm: "QCM",
};
const LIBELLES_FORMAT = {
  text: "réponse écrite",
  video: "réponse vidéo",
  qcm: "QCM",
  choice: "choix oui/non",
  code: "code",
};
const LIBELLES_STATUT = {
  draft: "brouillon",
  pending_review: "en attente de relecture",
  published: "publiée (visible des candidats)",
  archived: "archivée",
};

/**
 * Résumé lisible de l'expérience en place, destiné au prompt système.
 *
 * La NUMÉROTATION est le contrat : les étapes sont listées dans l'ordre
 * d'`order_index`, et c'est ce numéro que le modèle passe à `regenerate_step`.
 * Elle doit donc être calculée exactement comme côté serveur au moment de
 * régénérer — d'où la même lecture triée des deux côtés.
 */
export function construireEtatExperience(experience, steps) {
  if (!experience || !steps?.length) {
    return {
      existe: false,
      nbEtapes: 0,
      bloc: "ÉTAT ACTUEL : aucune expérience n'a encore été générée pour cette offre. Il faut la concevoir puis appeler generate_experience.",
    };
  }

  const entete = `Version v${experience.version} · statut : ${LIBELLES_STATUT[experience.status] || experience.status} · ${steps.length} étape${steps.length > 1 ? "s" : ""}${experience.estimated_minutes ? ` · ~${experience.estimated_minutes} min` : ""}`;

  const lignes = steps.map((s, i) => {
    const attributs = [
      LIBELLES_KIND[s.kind] || s.kind,
      LIBELLES_FORMAT[s.response_format] || s.response_format,
      s.sandbox_kind && s.sandbox_kind !== "none" ? `sandbox ${s.sandbox_kind}` : null,
      s.ai_assistant_allowed ? "assistant IA autorisé" : null,
    ].filter(Boolean).join(" · ");

    const sousDims = (s.criteria || []).map((c) => c?.name).filter(Boolean);
    const enonce = (s.prompt || "").replace(/\s+/g, " ").trim();

    return [
      `Étape ${i + 1} — ${attributs}`,
      `  Titre : « ${s.title || "sans titre"} »`,
      s.skill_assessed ? `  Compétence évaluée : ${s.skill_assessed}` : null,
      sousDims.length ? `  Sous-dimensions : ${sousDims.join(", ")}` : null,
      enonce ? `  Énoncé : ${enonce.length > 220 ? `${enonce.slice(0, 220)}…` : enonce}` : null,
    ].filter(Boolean).join("\n");
  });

  return {
    existe: true,
    nbEtapes: steps.length,
    version: experience.version,
    statut: experience.status,
    titres: steps.map((s) => s.title || "sans titre"),
    bloc: `ÉTAT ACTUEL — une expérience EXISTE DÉJÀ pour cette offre. Tu l'as générée précédemment ; elle est décrite ci-dessous, telle qu'elle est EN BASE à l'instant (retouches manuelles du recruteur comprises).\n${entete}\n\n${lignes.join("\n\n")}`,
  };
}

/**
 * Charge l'expérience vivante d'une offre et ses étapes, dans l'ordre.
 * Même sélection que getExperienceForJob : la dernière version non archivée.
 */
export async function chargerExperienceCourante(supabase, jobId) {
  const { data: experience } = await supabase
    .from("experiences")
    .select("id, version, status, estimated_minutes")
    .eq("job_id", jobId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!experience) return { experience: null, steps: [] };

  const { data: steps } = await supabase
    .from("experience_steps")
    .select("id, order_index, kind, response_format, title, prompt, sandbox_kind, ai_assistant_allowed, skill_assessed, criteria")
    .eq("experience_id", experience.id)
    .order("order_index");

  return { experience, steps: steps || [] };
}
