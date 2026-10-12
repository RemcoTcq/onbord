import { createHash } from "node:crypto";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";

// Résumé d'une étape en UNE phrase, pour les blocs de la vue d'ensemble.
//
// ── Pourquoi un modèle, et pas la première phrase de la consigne ─────────────
// Testé le 09/10/2026 sur trois simulations réelles. La consigne est écrite
// dans la langue du CANDIDAT (néerlandais, anglais), le recruteur lit dans la
// sienne ; et elle ouvre sur la situation, pas sur la tâche — « It is
// Thursday. », « Pieter agreed to a visit. ». Haiku rend une phrase qui dit
// quoi faire, face à qui, dans la langue du recruteur. Haiku 5.5, sans
// réflexion : ≈ 0,0002 $ par simulation et 1 à 2,5 s (Haiku 4.5 coûtait dix
// fois plus, pour la même qualité). Non facturé en crédits : c'est de
// l'affichage.
//
// ── Cache ───────────────────────────────────────────────────────────────────
// Rangé dans `experiences.generated_from.recaps` ({ [stepId]: { texte, cle } }),
// jamais dans l'étape : rien de ce qui part au candidat ne bouge, et l'écrire
// ne crée pas de nouvelle version. `cle` est l'empreinte de ce que le résumé
// décrit ; une étape réécrite (à la main ou par l'IA) change d'empreinte et
// son résumé est refait au prochain affichage.

export const MODELE_RESUME = "claude-haiku-5-5";

const NOMS_LANGUE = { fr: "français", en: "anglais" };

/** Empreinte de ce que le résumé décrit, dans la langue où il est rédigé. */
export function cleResume(step, uiLocale) {
  return createHash("sha1")
    .update(JSON.stringify([uiLocale, step?.title || "", step?.prompt || "", step?.sandbox_kind || "", step?.response_format || ""]))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Rédige le résumé des étapes données, en un seul appel.
 * @returns {Promise<{ resumes: Map<string, string>, usage: object|null }>}
 */
export async function rediger(steps, uiLocale) {
  const resumes = new Map();
  if (!steps.length) return { resumes, usage: null };

  const langue = NOMS_LANGUE[uiLocale] || NOMS_LANGUE.fr;
  const entree = steps.map((s, i) => ({
    n: i + 1,
    titre: s.title || "",
    outil: s.sandbox_kind || "none",
    reponse: s.response_format || "text",
    consigne: String(s.prompt || "").slice(0, 2500),
  }));

  const r = await anthropic.messages.create({
    model: MODELE_RESUME,
    max_tokens: 1500,
    // Haiku 5.5 réfléchit par défaut : sur cette consigne, il a dépensé tout
    // son budget à réfléchir et rendu zéro texte (testé le 09/10/2026). Une
    // phrase de résumé n'en a pas besoin.
    thinking: { type: "disabled" },
    system:
      `Tu résumes les étapes d'une simulation de recrutement pour le RECRUTEUR qui la relit. ` +
      `Pour chaque étape : UNE phrase en ${langue}, 90 à 130 caractères, qui dit ce que le candidat doit faire et dans quelle situation (face à qui, avec quel enjeu). ` +
      `Commence par un verbe d'action à l'infinitif. Pas de nom d'outil technique, pas de guillemets, ni « le candidat » ni « vous ». Garde les noms propres. ` +
      `Les consignes peuvent être dans une autre langue : le résumé, lui, est toujours en ${langue}. ` +
      `Réponds UNIQUEMENT en JSON : {"resumes":[{"n":1,"resume":"..."}]}`,
    messages: [{ role: "user", content: JSON.stringify(entree) }],
  });

  const texte = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const match = texte.match(/\{[\s\S]*\}/);
  if (match) {
    const parsed = JSON.parse(match[0]);
    for (const item of parsed?.resumes || []) {
      const step = steps[Number(item?.n) - 1];
      const phrase = String(item?.resume || "").trim();
      if (step && phrase) resumes.set(step.id, phrase.slice(0, 220));
    }
  }
  return { resumes, usage: { ...computeAiCost(MODELE_RESUME, r.usage), calls: 1 } };
}
