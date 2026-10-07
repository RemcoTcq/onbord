// Sandbox "crm" — correction déterministe des champs FACTUELS d'une fiche.
//
// Deux natures de champ cohabitent dans une fiche CRM :
//   - "factual"  : la réponse est vérifiable dans le brief (nom, budget, étape).
//                  Corrigée ici, sans LLM, comme le QCM (cf. runScoring).
//   - "judgment" : la réponse relève d'un arbitrage (priorité, prochaine action).
//                  Jamais corrigée ici — elle part au scoring BARS de fin de run.
//
// Module PUR (aucun accès DB / réseau) : importé côté run candidat (avertissement
// non spécifique) ET côté scoring (détail complet pour le rapport recruteur).

import { coerceUiLocale } from "@/lib/i18n/config";

// Compétence sous laquelle est regroupée toute la fiche CRM : la correction
// déterministe des champs factuels ET la sous-dimension "Croisement des
// sources". Partagée par la génération (skill_assessed du step) et le scoring
// (skill_name du score) pour que le rapport recruteur les affiche ensemble.
//
// Elle suit la langue du RECRUTEUR, pas celle du parcours : c'est un titre de
// grille de correction, retiré de ce que reçoit le candidat
// (sanitizeStepForCandidate). Elle était figée en français, ce qui posait un
// intertitre français au milieu d'un rapport anglais.
//
// Le regroupement du rapport se fait sur le skill_name des scores, tous écrits
// en un seul passage de scoring : deux appels à des moments où la langue
// d'interface diffère ne peuvent donc pas scinder un rapport en deux.
const CRM_SKILL_NAMES = {
  fr: "Extraction d'information",
  en: "Information capture",
};

/** @param {string} uiLocale langue du dashboard recruteur (fr|en) */
export function crmSkillName(uiLocale) {
  return CRM_SKILL_NAMES[coerceUiLocale(uiLocale)];
}

// Normalisation de comparaison : casse, accents, ponctuation, espaces.
export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,;:!?"'“”«»’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "30 000 €", "30k", "30.000", "1 234,50" -> nombre. null si non parsable.
export function parseNumberFr(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let s = String(value ?? "").toLowerCase().replace(/[\s ]/g, "");
  if (!s) return null;

  // Suffixe milliers ("30k", "30k€") — repéré avant le nettoyage des symboles.
  const kilo = /\d k?$|\dk/.test(s) && /\dk/.test(s);
  s = s.replace(/[^0-9,.-]/g, "");
  if (!s || !/\d/.test(s)) return null;

  // "1.234,56" : le point est alors un séparateur de milliers.
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "");
  // "30.000" / "1,234,567" : uniquement des groupes de 3 -> séparateur de milliers.
  if (/^-?\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, "");
  else s = s.replace(/,/g, ".");

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return kilo ? n * 1000 : n;
}

// Dates : format FR (jj/mm/aaaa) d'abord, sinon parsing natif.
export function parseDateValue(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const fr = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (fr) {
    const year = fr[3].length === 2 ? `20${fr[3]}` : fr[3];
    const dt = new Date(Number(year), Number(fr[2]) - 1, Number(fr[1]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

// Un champ factuel est-il correct ? Renvoie null si le champ n'est pas corrigible
// (pas d'attendu défini par le recruteur — on ne pénalise jamais dans ce cas).
function isFieldCorrect(field, given) {
  const expected = field.expected;
  if (!expected || expected.value === undefined || expected.value === null || expected.value === "") return null;
  const accepted = [expected.value, ...(expected.accept || [])];

  if (field.type === "number") {
    const g = parseNumberFr(given);
    if (g === null) return false;
    const tolerance = Number(expected.tolerance) || 0;
    return accepted.some((a) => {
      const e = parseNumberFr(a);
      return e !== null && Math.abs(g - e) <= tolerance;
    });
  }

  if (field.type === "date") {
    const g = parseDateValue(given);
    const parsedExpected = accepted.map(parseDateValue).filter(Boolean);
    // Attendu non parsable (« fin juin ») : on retombe sur la comparaison texte
    // plutôt que de recaler tout le monde. Ça arrive quand la source ne donne
    // qu'une échéance vague.
    if (parsedExpected.length && g) {
      return parsedExpected.some((e) => g.toDateString() === e.toDateString());
    }
    if (parsedExpected.length && !g) return false;
  }

  const g = normalizeText(given);
  if (!g) return false;
  // Select : égalité stricte sur l'option (les options sont fermées).
  if (field.type === "select") return accepted.some((a) => normalizeText(a) === g);
  // Texte libre : égalité, ou inclusion dans un sens ou l'autre — « Mme Dulac »
  // doit valider un attendu « Dulac », sans ouvrir la porte au n'importe quoi.
  return accepted.some((a) => {
    const e = normalizeText(a);
    return e.length >= 3 && (e === g || g.includes(e) || e.includes(g));
  });
}

// Le champ porte-t-il un piège (contradiction entre deux sources du brief) ?
function trapForField(crm, key) {
  return (crm.traps || []).find((t) => (t.fields || []).includes(key)) || null;
}

/**
 * Corrige les champs factuels d'une fiche remplie.
 * @param {object} crm    config.crm du step (fields, traps, …)
 * @param {object} answer meta.crm de la réponse candidat ({ fields, notes })
 * @returns {{ details:Array, factualCount:number, correctCount:number, score:number|null }}
 */
export function evaluateCrm(crm, answer) {
  const fields = crm?.fields || [];
  const given = answer?.fields || {};
  const details = [];

  for (const f of fields) {
    if (f.nature !== "factual") continue;
    const value = given[f.key];
    const correct = isFieldCorrect(f, value);
    if (correct === null) continue; // pas d'attendu : hors notation
    const trap = trapForField(crm, f.key);
    details.push({
      key: f.key,
      label: f.label || f.key,
      given: value === undefined || value === "" ? null : String(value),
      expected: String(f.expected.value),
      correct,
      is_trap: !!trap,
      trap_id: trap?.id || null,
    });
  }

  const factualCount = details.length;
  const correctCount = details.filter((d) => d.correct).length;
  const score = factualCount > 0 ? Math.round((correctCount / factualCount) * 100) : null;
  return { details, factualCount, correctCount, score };
}

// Niveau BARS dérivé du % de champs factuels corrects (même échelle 1-5 que
// le reste du scoring, pour que l'agrégation du score global reste homogène).
export function crmBarsLevel(score) {
  if (score >= 95) return 5;
  if (score >= 75) return 4;
  if (score >= 50) return 3;
  if (score >= 25) return 2;
  return 1;
}

// ─── Prochaine action planifiée (CRM v2) ──────────────────────────────────────
// Dans un vrai CRM, un échange se clôt par une tâche datée : rappeler, envoyer,
// rencontrer. Sans elle, une fiche « à jour » ne dit pas ce qui se passe
// ensuite — et c'est précisément ce qu'un bon commercial ne laisse pas flotter.
// Elle se note comme un champ de jugement, par la grille : il n'y a pas de bonne
// date unique.
export const TYPES_PROCHAINE_ACTION = ["call", "email", "meeting", "task"];
const LIBELLE_ACTION = { call: "Appel", email: "E-mail", meeting: "Rendez-vous", task: "Tâche" };

/** La prochaine action est-elle complète (type, date, description) ? */
export function prochaineActionComplete(ns) {
  return !!(ns?.type && String(ns?.date || "").trim() && String(ns?.text || "").trim());
}

function prochaineActionTexte(ns) {
  if (!ns || !(ns.type || ns.date || ns.text)) return null;
  return `${LIBELLE_ACTION[ns.type] || "Action"}${ns.date ? ` le ${ns.date}` : ""} — ${String(ns.text || "").trim() || "(sans description)"}`;
}

// Rendu NEUTRE de la fiche (aucune mention de la nature des champs) : c'est ce
// qui est stocké dans text_answer, et text_answer est renvoyé au candidat quand
// il reprend son run — il ne doit pas y apprendre quels champs sont corrigés.
export function crmAnswerToText(crm, answer) {
  const fields = crm?.fields || [];
  const given = answer?.fields || {};
  const lines = fields.map((f) => `${f.label || f.key} : ${given[f.key] || "(non renseigné)"}`);
  const suite = prochaineActionTexte(answer?.next_step);
  if (suite) lines.push(`Prochaine action planifiée : ${suite}`);
  const notes = (answer?.notes || "").trim();
  if (notes) lines.push("", "Notes internes :", notes);
  return lines.join("\n");
}

// Rendu POUR LE SCORING : sépare les deux natures et dit explicitement à
// l'évaluateur de ne pas noter les champs factuels (déjà corrigés en amont).
export function crmAnswerForScoring(crm, answer) {
  const fields = crm?.fields || [];
  const given = answer?.fields || {};
  const line = (f) => `  - ${f.label || f.key} : ${given[f.key] || "(non renseigné)"}`;
  const factual = fields.filter((f) => f.nature === "factual").map(line);
  const judgment = fields.filter((f) => f.nature !== "factual").map(line);
  const suite = prochaineActionTexte(answer?.next_step);
  if (suite) judgment.push(`  - Prochaine action planifiée : ${suite}`);
  const notes = (answer?.notes || "").trim();

  return [
    "FICHE CRM REMPLIE PAR LE CANDIDAT",
    "",
    "Champs d'extraction (factuels) — DÉJÀ CORRIGÉS AUTOMATIQUEMENT, NE LES NOTE PAS :",
    factual.length ? factual.join("\n") : "  (aucun)",
    "",
    "Champs de jugement — C'EST SUR EUX QUE TU NOTES :",
    judgment.length ? judgment.join("\n") : "  (aucun)",
    "",
    "Notes internes du candidat :",
    notes || "  (aucune note)",
  ].join("\n");
}

// ─── CRM v2 : un vrai espace de travail, plus une fiche isolée ────────────────
// La première version posait 2 ou 3 documents à côté d'un formulaire : de
// l'extraction d'information, pas du travail dans un CRM. La v2 met le candidat
// devant un PIPELINE — plusieurs fiches, chacune avec son historique (e-mails,
// appels, notes) — et lui confie une MISSION :
//   • "update"          mettre à jour une fiche après des échanges récents ;
//   • "pipeline_review" passer le pipeline en revue : quoi traiter, quoi est à risque ;
//   • "account_prep"    préparer un rendez-vous à partir de l'historique d'un compte.
// Le livrable reste le même objet : des champs (factuels corrigés sans IA,
// de jugement notés par la grille) et des notes. La correction ne change pas ;
// c'est le terrain qui devient réaliste.
//
// Les expériences publiées avant la v2 n'ont que `sources` : elles restent
// jouées et notées exactement comme avant.

export const CRM_MISSIONS = ["update", "pipeline_review", "account_prep"];
export const CRM_ACTIVITY_TYPES = ["email", "call_transcript", "chat", "note", "meeting"];

/** La fiche CRM est-elle au format v2 (pipeline de fiches) ? */
export function crmEstEspace(crm) {
  return Array.isArray(crm?.records) && crm.records.length > 0;
}

/**
 * Tous les documents lisibles par le candidat, quel que soit le format : les
 * sources de la v1, ou l'historique de chaque fiche de la v2. Sert au contrôle
 * « l'attendu figure-t-il dans les sources ? » de l'éditeur.
 */
export function crmToutesSources(crm) {
  if (!crmEstEspace(crm)) return crm?.sources || [];
  return crm.records.flatMap((r) => [
    // Les propriétés d'une fiche sont une source comme une autre : un effectif
    // ou un montant peut n'apparaître que là.
    { id: `${r.id}_props`, body: [r.name, r.company, r.contact, r.stage, r.amount, r.close_date, ...Object.values(r.properties || {})].filter((v) => v !== undefined && v !== null && v !== "").join(" ") },
    ...(r.timeline || []),
  ]);
}

function texteFiche(r, { detail }) {
  const props = Object.entries(r.properties || {}).map(([k, v]) => `${k} : ${v}`);
  const entete = [
    r.company && `Société : ${r.company}`,
    r.contact && `Contact : ${r.contact}`,
    r.stage && `Étape : ${r.stage}`,
    (r.amount || r.amount === 0) && `Montant : ${r.amount}${r.currency ? ` ${r.currency}` : ""}`,
    r.close_date && `Clôture prévue : ${r.close_date}`,
    r.last_activity && `Dernière activité : ${r.last_activity}`,
    ...props,
  ].filter(Boolean).join(" ; ");
  const lignes = [`  [${r.id}] ${r.name || "(sans nom)"} — ${entete}`];
  for (const a of r.timeline || []) {
    const tete = [a.type, a.date || a.received_at, a.from && `de ${a.from}`, a.subject && `« ${a.subject} »`, a.title].filter(Boolean).join(" · ");
    const corps = String(a.body || "").replace(/\s*\n\s*/g, " / ");
    lignes.push(`      (${a.id}) ${tete} : ${detail ? corps : corps.slice(0, 280) + (corps.length > 280 ? "…" : "")}`);
  }
  return lignes.join("\n");
}

/**
 * Le pipeline tel que le candidat l'avait sous les yeux, pour le CORRECTEUR.
 * Les champs de jugement d'une revue de pipeline (« quel deal traiter en
 * premier ? ») ne se notent pas sans voir les fiches. Chaîne vide en v1 : le
 * correcteur y lisait déjà la fiche et le piège, rien ne change pour elle.
 */
export function crmSceneForScoring(crm) {
  if (!crmEstEspace(crm)) return "";
  const missions = {
    update: "mettre à jour une fiche après des échanges récents",
    pipeline_review: "passer le pipeline en revue et décider quoi traiter",
    account_prep: "préparer un rendez-vous à partir de l'historique du compte",
  };
  const focus = crm.records.find((r) => r.id === crm.focus_record);
  return [
    `  Mission CRM : ${missions[crm.mission] || missions.update}${focus ? ` — fiche concernée : ${focus.name}` : ""}.`,
    `  Pipeline remis au candidat${crm.pipeline_name ? ` (« ${crm.pipeline_name} »)` : ""} :`,
    // Le détail complet pour la fiche concernée, un extrait pour les autres :
    // c'est ce qui borne la taille du prompt sans priver le correcteur de
    // l'information décisive.
    ...crm.records.map((r) => texteFiche(r, { detail: !focus || r.id === focus.id || crm.mission === "pipeline_review" })),
  ].join("\n");
}

/**
 * Remet un espace CRM généré dans une forme exploitable : identifiants de
 * fiche et d'activité uniques (les pièges les citent), types connus.
 * Renvoie le crm tel quel s'il est au format v1.
 */
export function normaliserCrm(crm) {
  if (!crm || !crmEstEspace(crm)) return crm;
  const idsActivite = new Set();
  const records = crm.records.map((r, i) => {
    const id = String(r?.id || `r${i + 1}`);
    const timeline = (Array.isArray(r?.timeline) ? r.timeline : [])
      .filter((a) => String(a?.body || "").trim())
      .map((a, k) => {
        let aid = String(a.id || `${id}_a${k + 1}`);
        if (idsActivite.has(aid)) aid = `${id}_a${k + 1}`;
        idsActivite.add(aid);
        return { ...a, id: aid, type: CRM_ACTIVITY_TYPES.includes(a.type) ? a.type : "note" };
      });
    const properties = r?.properties && typeof r.properties === "object" && !Array.isArray(r.properties) ? r.properties : {};
    return { ...r, id, timeline, properties };
  });
  const mission = CRM_MISSIONS.includes(crm.mission) ? crm.mission : "update";
  const focus = records.some((r) => r.id === crm.focus_record) ? crm.focus_record : (mission === "pipeline_review" ? null : records[0]?.id || null);
  // `sources` n'existe plus en v2 : le garder ferait deux vérités.
  const { sources: _sources, ...reste } = crm;
  return { ...reste, mission, focus_record: focus, records };
}

// Contexte d'évaluation du piège, injecté dans la trajectoire de scoring.
// Jamais montré au candidat.
export function crmTrapBriefing(crm) {
  const traps = crm?.traps || [];
  if (!traps.length) return "";
  const lines = traps.map((t) =>
    `    • ${t.description || "(contradiction non décrite)"}\n      Résolution attendue : ${t.resolution || "—"}\n      Signal recherché : ${t.expected_signal || "—"}`
  );
  return `  Incohérence volontaire placée dans le brief (NON communiquée au candidat) :\n${lines.join("\n")}`;
}
