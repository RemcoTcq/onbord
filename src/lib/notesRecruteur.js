import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { detecterLangue } from "@/lib/i18n/detection";
import { LOCALE_NAMES_FR } from "@/lib/i18n/config";

// Les notes que SEUL le recruteur lit, remises dans SA langue.
//
// Règle de Remco (09/10/2026) : ce que voit le candidat suit la langue du
// parcours (fr, en ou nl) ; tout ce que seul le recruteur voit suit la langue de
// SA plateforme (fr ou en). Les générations d'avant cette règle ont écrit ces
// notes dans la langue du parcours — voire en français dans un parcours anglais.
// La génération est corrigée ; ce module répare l'existant, et suit aussi un
// recruteur qui change de langue d'interface.
//
// La détection est GRATUITE (lib/i18n/detection.js, mots-outils, sans modèle) :
// tant que tout est déjà dans la bonne langue, rien n'est appelé. Seuls les
// champs détectés dans une autre langue partent à Haiku 5.5, en un appel.
//
// Ce qui est traduit n'est lu que par le recruteur, le correcteur et l'IA qui
// joue le personnage — qui restitue le sens dans la langue du personnage
// (consignePersona). Rien de ce que voit le candidat ne bouge.

export const MODELE_TRADUCTION = "claude-haiku-5-5";
const LANGUES = ["fr", "en", "nl"];

// Chaque champ : où le lire, où l'écrire. Un champ liste se traduit d'un bloc.
function champs(step) {
  const c = step?.config || {};
  const out = [];
  const ajouter = (lire, ecrire) => {
    const v = lire();
    if (typeof v === "string" ? v.trim() : Array.isArray(v) && v.some((x) => String(x || "").trim())) out.push({ valeur: v, ecrire });
  };

  if (step?.sandbox_kind === "persona" && c.persona) {
    for (const cle of ["personality", "goals", "hidden_info", "objections", "red_lines", "success_signals"]) {
      ajouter(() => c.persona[cle], (cfg, v) => ({ ...cfg, persona: { ...cfg.persona, [cle]: v } }));
    }
  }
  if (step?.sandbox_kind === "sheet" && c.sheet) {
    ajouter(() => c.sheet.analysis_notes, (cfg, v) => ({ ...cfg, sheet: { ...cfg.sheet, analysis_notes: v } }));
  }
  for (const cle of ["inbox", "board"]) {
    if (step?.sandbox_kind !== cle) continue;
    (c[cle]?.triage_notes || []).forEach((_, i) => {
      ajouter(() => c[cle].triage_notes[i]?.why, (cfg, v) => ({
        ...cfg, [cle]: { ...cfg[cle], triage_notes: cfg[cle].triage_notes.map((n, j) => (j === i ? { ...n, why: v } : n)) },
      }));
    });
  }
  if (step?.sandbox_kind === "crm") {
    (c.crm?.traps || []).forEach((_, i) => {
      for (const cle of ["description", "resolution", "expected_signal"]) {
        ajouter(() => c.crm.traps[i]?.[cle], (cfg, v) => ({
          ...cfg, crm: { ...cfg.crm, traps: cfg.crm.traps.map((tr, j) => (j === i ? { ...tr, [cle]: v } : tr)) },
        }));
      }
    });
  }
  return out;
}

const texte = (v) => (Array.isArray(v) ? v.join("\n") : String(v || ""));

/** Le champ est-il, à coup sûr, dans une autre langue que `cible` ? */
function horsLangue(valeur, cible) {
  const l = detecterLangue(texte(valeur), LANGUES);
  return !!l && l !== cible;
}

/**
 * Ce qu'il faut traduire dans ces étapes (et la fiche de cohérence).
 * @returns {{ aTraduire: Array<{ stepId?, valeur, ecrire? , univers? }> }}
 */
export function inventaire(steps, filRouge, cible) {
  const aTraduire = [];
  for (const s of steps || []) {
    for (const ch of champs(s)) if (horsLangue(ch.valeur, cible)) aTraduire.push({ stepId: s.id, ...ch });
  }
  if (filRouge?.univers && horsLangue(filRouge.univers, cible)) aTraduire.push({ univers: true, valeur: filRouge.univers });
  return aTraduire;
}

/**
 * Traduit les valeurs, dans l'ordre, en un appel.
 * @returns {Promise<{ traductions: Array<string|string[]>, usage: object }>}
 */
export async function traduire(valeurs, cible) {
  const nom = LOCALE_NAMES_FR[cible] || LOCALE_NAMES_FR.fr;
  const r = await anthropic.messages.create({
    model: MODELE_TRADUCTION,
    max_tokens: 8000,
    // Sans réflexion : activée par défaut sur Haiku 5.5, elle peut consommer
    // tout le budget et ne rendre aucun texte. Pas de `temperature` (400).
    thinking: { type: "disabled" },
    system:
      `Tu traduis en ${nom} des notes de conception d'une simulation de recrutement, lues par le recruteur. ` +
      "Traduction fidèle et naturelle : même sens, même niveau de détail, même structure. Garde tels quels les noms propres, les noms d'entreprise, les chiffres, les dates et les montants. " +
      "Une réplique citée entre guillemets se traduit aussi : c'est une note pour le recruteur. N'écris jamais de guillemet droit \" — utilise « … » ou “…”. " +
      "Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après.",
    messages: [{
      role: "user",
      // Une clé par élément : avec un tableau, le modèle aplatissait une liste
      // dans la liste et décalait tout ce qui suivait (constaté au banc).
      content: `Traduis en ${nom} la valeur de chaque clé. Une liste reste une liste du même nombre d'éléments, un texte reste un texte.
${JSON.stringify(Object.fromEntries(valeurs.map((v, i) => [`k${i}`, v])))}

Réponds avec les MÊMES clés : {"t": {"k0": …, "k1": …}}`,
    }],
  });

  const brut = (r.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  const match = brut.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Traduction illisible");
  const t = JSON.parse(match[0])?.t;
  if (!t || typeof t !== "object") throw new Error("Traduction illisible");

  // Chaque traduction doit garder la forme de l'original ; une clé manquante ou
  // mal formée garde l'original — elle sera retentée à la prochaine ouverture.
  const traductions = valeurs.map((v, i) => {
    const x = t[`k${i}`];
    if (Array.isArray(v)) return Array.isArray(x) && x.length ? x.map((e) => String(e ?? "").trim()) : v;
    return typeof x === "string" && x.trim() ? x.trim() : v;
  });
  return { traductions, usage: { ...computeAiCost(MODELE_TRADUCTION, r.usage), calls: 1 } };
}
