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

// Rendu NEUTRE de la fiche (aucune mention de la nature des champs) : c'est ce
// qui est stocké dans text_answer, et text_answer est renvoyé au candidat quand
// il reprend son run — il ne doit pas y apprendre quels champs sont corrigés.
export function crmAnswerToText(crm, answer) {
  const fields = crm?.fields || [];
  const given = answer?.fields || {};
  const lines = fields.map((f) => `${f.label || f.key} : ${given[f.key] || "(non renseigné)"}`);
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
