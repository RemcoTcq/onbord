import { createHash } from "node:crypto";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { LOCALE_NAMES_FR } from "@/lib/i18n/config";

// Description d'une sous-compétence, en une ou deux phrases, pour sa carte de
// l'onglet Scoring (12/10/2026, sur le modèle d'Anthropos) : ce qu'elle évalue
// et ce qu'on attend de voir, dans la langue du recruteur.
//
// Rien de tel n'est stocké dans la grille : la description se DÉDUIT du nom et
// des checkpoints. Haiku 5.5, sans réflexion (activée par défaut, elle peut
// manger tout le budget et ne rendre aucun texte), ≈ 0,0002 $ par étape, non
// facturé. Mise en cache dans `experiences.generated_from.descriptions_criteres`
// — jamais dans l'étape : rien ne part au candidat, aucune version n'est créée.
// La clé est l'empreinte du critère : renommé ou retouché, il est redécrit.

export const MODELE_DESCRIPTION = "claude-haiku-5-5";

/** Empreinte d'un critère, dans la langue où sa description est rédigée. */
export function cleCritere(critere, uiLocale) {
  return createHash("sha1")
    .update(JSON.stringify([uiLocale, critere?.name || "", (critere?.checkpoints || []).map((cp) => cp?.description || "")]))
    .digest("hex")
    .slice(0, 16);
}

/**
 * @param {{ titreEtape, consigne, criteres: Array<{name, checkpoints}> }} p
 * @returns {Promise<{ descriptions: string[], usage: object }>} dans l'ordre des critères
 */
export async function decrire({ titreEtape, consigne, criteres }, uiLocale) {
  const nom = LOCALE_NAMES_FR[uiLocale] || LOCALE_NAMES_FR.fr;
  const entree = Object.fromEntries(criteres.map((c, i) => [`k${i}`, {
    nom: c.name || "",
    points: (c.checkpoints || []).map((cp) => cp?.description).filter(Boolean),
  }]));

  const r = await anthropic.messages.create({
    model: MODELE_DESCRIPTION,
    max_tokens: 1500,
    thinking: { type: "disabled" },
    system:
      `Tu décris, pour le recruteur, ce qu'évalue chaque critère d'une étape de simulation de recrutement. ` +
      `Pour chaque critère : deux phrases courtes en ${nom}, 35 mots AU TOTAL au maximum. La première dit ce que le critère évalue chez le candidat ; ` +
      `la seconde, ce qu'on attend concrètement de voir dans sa réponse — l'essentiel, pas la liste. Appuie-toi sur les points vérifiés, sans les recopier ni les énumérer. ` +
      // Pas d'exemple rédigé : un exemple en français tirait la sortie vers le
      // français pour un recruteur anglophone (constaté au banc le 12/10/2026).
      `Commence directement par un verbe, sans « ce critère ». Réponds UNIQUEMENT en JSON : un objet "d" avec UNE entrée par clé reçue — toutes les clés.`,
    messages: [{
      role: "user",
      content: `LANGUE DE SORTIE : ${nom}, quelle que soit la langue de l'étape ou des critères.

ÉTAPE : ${titreEtape || "(sans titre)"}
CONSIGNE (contexte) : ${String(consigne || "").slice(0, 1200)}

CRITÈRES :
${JSON.stringify(entree, null, 1)}

Réponds : {"d": {${criteres.map((_, i) => `"k${i}": "…"`).join(", ")}}}`,
    }],
  });

  const brut = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const match = brut.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Description illisible");
  const d = JSON.parse(match[0])?.d || {};
  const descriptions = criteres.map((_, i) => (typeof d[`k${i}`] === "string" ? d[`k${i}`].trim().slice(0, 400) : ""));
  return { descriptions, usage: { ...computeAiCost(MODELE_DESCRIPTION, r.usage), calls: 1 } };
}
