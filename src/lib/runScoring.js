import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { evaluateCrm, crmBarsLevel, crmAnswerForScoring, crmTrapBriefing, crmSkillName, crmSceneForScoring } from "@/lib/crmScoring";
import { sheetReperesCalcules } from "@/lib/tableur";
import { inboxBriefing } from "@/lib/boiteReception";
import { personaBriefing } from "@/lib/persona";
import { boardBriefing } from "@/lib/tableauCartes";
import { consigneLangueRapport } from "@/lib/i18n/prompt";
import { sceneEnTexte } from "@/lib/sceneEtape";
import { coerceExperienceLocale, coerceUiLocale, DEFAULT_UI_LOCALE } from "@/lib/i18n/config";
import { factureNotationCandidat } from "@/lib/utils/limits";
import {
  listerCompetences, resoudreIds, tierDesIds, estCritereCheckpoints,
  pourcentageCheckpoints, moyennePonderee,
} from "@/lib/competences";

const SCORING_MODEL = "claude-sonnet-5-5";

// Libellés et justifications calculés en dur, pas par le modèle : QCM corrigé
// par comparaison d'index, champs factuels du CRM corrigés par comparaison de
// chaînes. Ils atterrissent dans le même rapport que les justifications
// rédigées par l'IA, et doivent donc suivre la MÊME langue — celle du
// recruteur, pas celle du candidat.
const JUSTIFICATIONS_AUTO = {
  fr: {
    qcmDimension: "QCM — Bonne réponse",
    qcmCorrect: (n) => `Bonne réponse sélectionnée (option ${n})`,
    qcmWrong: (n, correct) => `Mauvaise réponse (option ${n} choisie, option ${correct} attendue)`,
    qcmNoAnswer: "Aucune réponse sélectionnée",
    crmDimension: "Champs factuels",
    crmAllCorrect: (total) => `Les ${total} champs vérifiables sont exacts.`,
    crmPartial: (correct, total, erreurs) =>
      `${correct}/${total} champs vérifiables exacts. Erreurs : ${erreurs}.`,
    crmFieldError: (label, given, expected) =>
      `${label} (saisi « ${given ?? "vide"} », attendu « ${expected} »)`,
    crmTrapMissed: (champs) => ` Dont l'information contradictoire du brief : ${champs}.`,
    codeDimension: "Tests automatisés",
    codeAllPassed: (total, essais) => `Les ${total} cas de test passent (${essais} exécution${essais > 1 ? "s" : ""}).`,
    codePartial: (passed, total, essais, echecs) =>
      `${passed}/${total} cas de test passent (${essais} exécution${essais > 1 ? "s" : ""}). Échecs : ${echecs}.`,
    codeNeverRun: "Le candidat n'a jamais lancé les tests : la correction fonctionnelle n'a pas pu être établie.",
    codeFailure: (nom, verdict) => (verdict === "ok" ? nom : `${nom} (${verdict})`),
    codeVerdicts: {
      timeout: "temps dépassé",
      runtime_error: "erreur à l'exécution",
      compile_error: "ne compile pas",
      error: "échec d'exécution",
    },
    empty: "vide",
    recopiageCap: (pct) =>
      ` Note plafonnée : ${pct} % de la réponse est reprise mot pour mot des messages de l'assistant IA. Ce qui est évalué ici est ce que le candidat a produit.`,
    recopiageCapCheckpoints: (pct) =>
      ` Checkpoints plafonnés à « présent mais faible » : ${pct} % de la réponse est reprise mot pour mot des messages de l'assistant IA. Ce qui est évalué ici est ce que le candidat a produit.`,
    checkpointNotScored: "Non évalué par le correcteur.",
  },
  en: {
    qcmDimension: "Multiple choice — correct answer",
    qcmCorrect: (n) => `Correct answer selected (option ${n})`,
    qcmWrong: (n, correct) => `Incorrect answer (option ${n} chosen, option ${correct} expected)`,
    qcmNoAnswer: "No answer selected",
    crmDimension: "Factual fields",
    crmAllCorrect: (total) => `All ${total} verifiable fields are correct.`,
    crmPartial: (correct, total, erreurs) =>
      `${correct}/${total} verifiable fields correct. Errors: ${erreurs}.`,
    crmFieldError: (label, given, expected) =>
      `${label} (entered "${given ?? "empty"}", expected "${expected}")`,
    crmTrapMissed: (champs) => ` Including the contradictory detail from the brief: ${champs}.`,
    codeDimension: "Automated tests",
    codeAllPassed: (total, essais) => `All ${total} test cases pass (${essais} run${essais > 1 ? "s" : ""}).`,
    codePartial: (passed, total, essais, echecs) =>
      `${passed}/${total} test cases pass (${essais} run${essais > 1 ? "s" : ""}). Failures: ${echecs}.`,
    codeNeverRun: "The candidate never ran the tests, so functional correctness could not be established.",
    codeFailure: (nom, verdict) => (verdict === "ok" ? nom : `${nom} (${verdict})`),
    codeVerdicts: {
      timeout: "timed out",
      runtime_error: "runtime error",
      compile_error: "does not compile",
      error: "execution failed",
    },
    empty: "empty",
    recopiageCap: (pct) =>
      ` Score capped: ${pct}% of the answer is copied word for word from the AI assistant's messages. What is assessed here is what the candidate produced.`,
    recopiageCapCheckpoints: (pct) =>
      ` Checkpoints capped at "present but weak": ${pct}% of the answer is copied word for word from the AI assistant's messages. What is assessed here is what the candidate produced.`,
    checkpointNotScored: "Not assessed by the grader.",
  },
};

// Niveau BARS d'un taux de tests passés. Mêmes paliers que la correction CRM :
// un rapport où deux corrections déterministes se lisent côte à côte doit les
// graduer pareil, sinon "3/5" veut dire deux choses différentes selon l'étape.
function testsBarsLevel(score) {
  if (score >= 95) return 5;
  if (score >= 75) return 4;
  if (score >= 50) return 3;
  if (score >= 25) return 2;
  return 1;
}

// Verdict d'exécution rendu lisible pour le prompt de scoring et le rapport.
// Un code qui ne compile pas ne se juge PAS comme un code qui tourne et se
// trompe : la distinction doit survivre jusqu'à l'évaluateur.
function codeRunSummary(step, resp, L) {
  const code = resp?.meta?.code;
  const total = (step.config?.code?.tests || []).length;
  if (!total) return null;
  if (!code) return { never_run: true, total, passed: 0, attempts: 0, failures: [] };
  const failures = (code.executions || [])
    .filter((e) => !e.passed)
    .map((e) => L.codeFailure(e.name, L.codeVerdicts[e.verdict] || e.verdict));
  return { never_run: false, total: code.total ?? total, passed: code.passed ?? 0, attempts: code.attempts ?? 0, failures };
}

// ─── Recopiage de l'assistant ────────────────────────────────────────────────
// Le cas observé : le candidat colle l'énoncé dans l'assistant, puis recolle la
// réponse de l'assistant dans le champ. L'usage de l'IA était bien noté sévère —
// mais les sous-dimensions de la TÂCHE, elles, notaient la qualité du texte, qui
// est celle du modèle. Un candidat qui n'a rien produit repartait avec une bonne
// note sur le travail. C'est cette mesure qui rend le recopiage visible.
//
// Méthode : recouvrement par n-grammes (8 mots). On ne cherche pas une
// ressemblance de sens — reformuler la sortie d'un modèle est un vrai travail,
// et ne doit pas être puni — mais la reprise MOT POUR MOT de longues séquences.
// Huit mots consécutifs identiques n'arrivent pas par hasard.
const NGRAMME = 8;
const SEUIL_SIGNAL = 0.35;   // au-delà : l'évaluateur en est informé
const SEUIL_PLAFOND = 0.7;   // au-delà : plafond mécanique, sans appel

function normaliserTexte(s) {
  return (s || "").toLowerCase().replace(/[.,;:!?"""«»''()\[\]\-]/g, " ").replace(/\s+/g, " ").trim();
}

function ngrammes(texte) {
  const mots = normaliserTexte(texte).split(" ").filter(Boolean);
  if (mots.length < NGRAMME) return [];
  const out = [];
  for (let i = 0; i + NGRAMME <= mots.length; i++) out.push(mots.slice(i, i + NGRAMME).join(" "));
  return out;
}

/**
 * Part de la réponse du candidat reprise mot pour mot à l'assistant.
 * @returns {number} entre 0 et 1 ; 0 si la réponse est trop courte pour conclure.
 */
export function tauxRecopiage(reponse, textesAssistant) {
  const cible = ngrammes(reponse);
  if (!cible.length) return 0;
  const source = new Set(textesAssistant.flatMap(ngrammes));
  if (!source.size) return 0;
  return cible.filter((g) => source.has(g)).length / cible.length;
}

// Vérifie qu'un verbatim est une sous-chaîne réelle de la réponse du candidat
// (jamais inventé). Normalise casse/espaces/ponctuation.
function verifyVerbatim(verbatim, sourceText) {
  if (!verbatim || !sourceText) return false;
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?"""«»'']/g, "").trim();
  const v = norm(verbatim);
  return v.length >= 5 && norm(sourceText).includes(v);
}

// Ce que le correcteur doit savoir d'une scène pour la juger, et que le
// candidat ne voit pas : le piège d'une fiche CRM, ce que les données d'un
// tableur permettent de voir, le tri qu'un bon professionnel ferait d'une boîte
// de réception. Même rôle que le briefing du piège CRM, étendu aux nouvelles
// scènes — la grille et la façon de noter ne changent pas.
function briefingCorrecteur(s) {
  const c = s.config || {};
  if (s.sandbox_kind === "crm" && c.crm) {
    return [crmSceneForScoring(c.crm), crmTrapBriefing(c.crm)].filter(Boolean).join("\n");
  }
  if (s.sandbox_kind === "sheet" && c.sheet) {
    const reperes = sheetReperesCalcules(c.sheet);
    return [
      c.sheet.analysis_notes
        ? `  Ce que les données permettent de voir, selon la conception (NON communiqué au candidat) : ${String(c.sheet.analysis_notes).replace(/\s*\n\s*/g, " / ")}`
        : "",
      reperes
        ? `  Repères CALCULÉS automatiquement sur les données d'origine (exacts, NON communiqués au candidat) :\n${reperes.split("\n").map((l) => `    ${l}`).join("\n")}`
        : "",
    ].filter(Boolean).join("\n");
  }
  if (s.sandbox_kind === "inbox" && c.inbox) return inboxBriefing(c.inbox);
  if (s.sandbox_kind === "persona" && c.persona) return personaBriefing(c.persona);
  if (s.sandbox_kind === "board" && c.board) return boardBriefing(c.board);
  return "";
}

// ─── Notation étape par étape, en double ──────────────────────────────────────
// Deux changements de FONCTIONNEMENT, la méthode restant celle d'avant (mêmes
// grilles, même échelle 0/1/2, même exigence de preuve, mêmes plafonds) :
//
// 1. UNE ÉTAPE = UN APPEL, en parallèle. Le correcteur lisait tout le parcours
//    d'un coup : l'impression laissée par une étape déteignait sur la suivante,
//    l'attention se diluait sur les longs parcours (une boîte de réception, un
//    tableur et une transcription d'appel dans le même prompt), et la réponse
//    pouvait être tronquée. Chaque étape est désormais notée seule, sans voir
//    les réponses des autres — ni les échanges avec l'assistant, qui ne servent
//    qu'à la note d'usage de l'IA.
//
// 2. UN DEUXIÈME AVIS EN CAS DE DOUTE. Un correcteur IA n'est pas parfaitement
//    stable : relancé sur la même réponse, il peut donner 1 là où il avait
//    donné 2. Faire tout noter deux fois triplait le coût de la notation ;
//    la plupart des notes, pourtant, ne font pas débat. Le premier correcteur
//    signale donc les checkpoints où il HÉSITE entre deux notes, et le code
//    ajoute un signal objectif : un point accordé dont la citation est
//    introuvable dans la réponse. Seules ces étapes repassent devant un second
//    correcteur ; s'il diverge, un troisième tranche et la note MÉDIANE est
//    retenue. Doutes et désaccords sont comptés (scoring_usage.stabilite) :
//    c'est la mesure de fiabilité du correcteur.
//
// Réglage d'exploitation, ONBORD_SECOND_AVIS :
//   "doute" (défaut) · "toujours" (deux avis par étape) · "jamais" (un seul).
// L'ancien interrupteur ONBORD_DOUBLE_NOTATION=0 vaut toujours « jamais ».
const SECOND_AVIS = (() => {
  const v = process.env.ONBORD_SECOND_AVIS || (process.env.ONBORD_DOUBLE_NOTATION === "0" ? "jamais" : "doute");
  return ["doute", "toujours", "jamais"].includes(v) ? v : "doute";
})();
// Appels simultanés au plus : un parcours de six étapes notées deux fois part
// d'un coup, sans marteler l'API sur un parcours plus long.
const CONCURRENCE_NOTATION = 8;

async function avecLimite(items, limite, fn) {
  const resultats = new Array(items.length);
  let suivant = 0;
  const travail = async () => {
    while (suivant < items.length) {
      const k = suivant++;
      resultats[k] = await fn(items[k], k);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, travail));
  return resultats;
}

// Médiane BASSE : sur trois avis, la valeur du milieu ; sur deux avis qui
// divergent (le troisième a échoué), la plus basse — on ne crédite pas un
// comportement que la moitié des correcteurs n'a pas vu.
function mediane(valeurs) {
  const t = [...valeurs].sort((a, b) => a - b);
  return t[Math.floor((t.length - 1) / 2)];
}

function cumulUsages(usages) {
  const liste = usages.filter(Boolean);
  const somme = (cle) => liste.reduce((n, u) => n + (u[cle] || 0), 0);
  return {
    model: SCORING_MODEL,
    calls: liste.length,
    input_tokens: somme("input_tokens"),
    output_tokens: somme("output_tokens"),
    cost_usd: Number(somme("cost_usd").toFixed(6)),
  };
}

/** Un appel au correcteur. Ne jette jamais : renvoie { ok, data | erreur, usage }. */
async function appelCorrecteur({ system, user, maxTokens }) {
  try {
    // Effort "medium" : noter, c'est juger chaque checkpoint contre la
    // réponse, pas extraire. Pas de `temperature` (400 sur Sonnet 5.5). En
    // streaming : la réflexion se sert dans le budget de sortie, et le SDK
    // refuse un plafond haut hors streaming.
    const response = await anthropic.messages.stream({
      model: SCORING_MODEL,
      max_tokens: maxTokens,
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: user }],
    }).finalMessage();
    const usage = computeAiCost(SCORING_MODEL, response.usage);
    if (response.stop_reason === "max_tokens") return { ok: false, erreur: "réponse tronquée", usage };
    // Le premier bloc peut être un bloc de réflexion : on lit les blocs `text`.
    const texte = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const match = texte.match(/\{[\s\S]*\}/);
    if (!match) return { ok: false, erreur: "aucun JSON", usage };
    try {
      return { ok: true, data: JSON.parse(match[0]), usage };
    } catch (err) {
      return { ok: false, erreur: `JSON illisible — ${err.message}`, usage };
    }
  } catch (err) {
    return { ok: false, erreur: err.message };
  }
}

/**
 * Ce qu'un correcteur a rendu pour UNE étape, rattaché à la grille. La GRILLE
 * fait foi, pas la réponse du modèle : chaque entrée est rattachée à un critère
 * défini — par son nom, ou à défaut au premier critère du même format pas
 * encore noté (un nom reformulé ne doit pas faire tomber un critère à 0). Un id
 * de checkpoint inventé ne crée aucune note.
 * @returns {Map<object, object>} critère → lecture
 */
function lireJugement(step, entrees) {
  const normNom = (s) => String(s || "").trim().toLowerCase();
  const lectures = new Map();
  for (const c of Array.isArray(entrees) ? entrees : []) {
    const libres = (step.criteria || []).filter((k) => !lectures.has(k));
    const critere =
      libres.find((k) => normNom(k.name) === normNom(c?.sub_dimension_name)) ||
      libres.find((k) => estCritereCheckpoints(k) === Array.isArray(c?.checkpoints));
    if (!critere) continue;
    if (estCritereCheckpoints(critere)) {
      const parId = new Map();
      for (const r of Array.isArray(c.checkpoints) ? c.checkpoints : []) {
        if (!critere.checkpoints.some((cp) => String(cp.id) === String(r?.id))) continue;
        parId.set(String(r.id), {
          score: Math.max(0, Math.min(2, Math.round(Number(r.score) || 0))),
          verbatim: String(r.verbatim || ""),
          justification: String(r.justification || ""),
          doute: r.doute === true,
        });
      }
      lectures.set(critere, { checkpoints: parId, observations: String(c.observations || ""), justification: String(c.justification || "") });
    } else {
      lectures.set(critere, {
        bars_level: Math.max(1, Math.min(5, Number(c.bars_level) || 1)),
        verbatim: String(c.verbatim || ""),
        justification: String(c.justification || ""),
        doute: c.doute === true,
      });
    }
  }
  return lectures;
}

/**
 * Le premier avis sur une étape appelle-t-il une relecture ? Oui si le
 * correcteur a déclaré hésiter, si un critère ou un checkpoint n'a pas été
 * noté, ou si un point accordé s'appuie sur une citation introuvable dans la
 * réponse — le seul de ces signaux qui ne dépend pas du modèle.
 * @param {string} src la réponse du candidat, telle que le correcteur l'a lue
 */
function etapeDouteuse(step, lecture, src) {
  for (const critere of step.criteria || []) {
    const l = lecture.get(critere);
    if (!l) return true;
    if (estCritereCheckpoints(critere)) {
      for (const cp of critere.checkpoints) {
        const x = l.checkpoints.get(String(cp.id));
        if (!x || x.doute) return true;
        if (x.score > 0 && !verifyVerbatim(x.verbatim, src)) return true;
      }
    } else if (l.doute || (l.bars_level > 1 && !verifyVerbatim(l.verbatim, src))) {
      return true;
    }
  }
  return false;
}

/** Nombre de notes qui diffèrent entre deux lectures d'une même étape. */
function desaccords(step, a, b) {
  let n = 0;
  for (const critere of step.criteria || []) {
    const la = a.get(critere);
    const lb = b.get(critere);
    if (!la || !lb) continue;
    if (estCritereCheckpoints(critere)) {
      for (const cp of critere.checkpoints) {
        const x = la.checkpoints.get(String(cp.id));
        const y = lb.checkpoints.get(String(cp.id));
        if (x && y && x.score !== y.score) n++;
      }
    } else if (la.bars_level !== lb.bars_level) {
      n++;
    }
  }
  return n;
}

function candidateAnswerText(step, resp) {
  if (!resp) return "(pas de réponse)";
  // Fiche CRM : rendu qui SÉPARE les deux natures de champ et interdit à
  // l'évaluateur de noter les champs factuels (déjà corrigés en amont, sans LLM).
  if (step.sandbox_kind === "crm" && step.config?.crm) {
    return crmAnswerForScoring(step.config.crm, resp.meta?.crm);
  }
  if (step.response_format === "video") return resp.transcript || "(transcription indisponible)";
  if (step.response_format === "qcm") {
    const idx = resp.meta?.selected_index;
    const opt = (step.config?.options || [])[idx];
    return idx != null ? `Réponse choisie : ${opt ?? `option ${idx}`}` : "(pas de réponse)";
  }
  if (step.response_format === "choice") return resp.meta?.choice ? `Réponse : ${resp.meta.choice}` : "(pas de réponse)";
  // Sandbox code : l'évaluateur reçoit le code ET son résultat d'exécution. Il
  // ne doit pas juger si "ça marche" — c'est mesuré — mais comment c'est écrit.
  if (step.sandbox_kind === "code" && step.config?.code) {
    const run = resp.meta?.code;
    const verdict = run
      ? `Exécution : ${run.passed}/${run.total} cas de test passés en ${run.attempts} exécution(s).` +
        (run.executions || []).filter((e) => !e.passed).map((e) => `\n  - échec « ${e.name} » : ${e.verdict}`).join("")
      : "Exécution : le candidat n'a jamais lancé les tests.";
    return `${resp.text_answer || "(pas de code)"}\n\n[${verdict}]`;
  }
  return resp.text_answer || "(pas de réponse)";
}

// ─── Le calcul de la note, sans rien écrire ───────────────────────────────────
// Séparé de scoreRun pour pouvoir être rejoué à blanc — mesurer le coût et la
// stabilité de la notation sur de vrais parcours, sans toucher à leur note ni
// à la facturation. Renvoie la ligne run_scores prête à écrire.
export async function evaluerRun(admin, run) {
  const runId = run.id;

  // ── Les DEUX langues du scoring ──────────────────────────────────────────
  // Le rapport n'est pas rédigé dans la langue du candidat mais dans celle du
  // RECRUTEUR : c'est un outil de décision interne, lu dans le dashboard. Un
  // recruteur anglophone doit pouvoir lire le rapport d'un candidat
  // néerlandophone sans le traduire lui-même.
  //
  // La langue du candidat reste nécessaire, pour une seule chose : protéger les
  // verbatims. Le prompt exige que chaque citation soit une sous-chaîne réelle
  // de la réponse, et verifyVerbatim() le contrôle après coup — un verbatim
  // traduit échouerait cette vérification et serait rejeté à tort.
  // Deux requêtes plutôt qu'une jointure imbriquée experiences→jobs→users : la
  // clé étrangère jobs.user_id n'est pas déclarée vers public.users, et un
  // select imbriqué échouerait silencieusement — le scoring tomberait alors en
  // français pour tout le monde, sans erreur visible.
  const { data: exp } = await admin
    .from("experiences")
    .select("jobs!inner(experience_locale, user_id, extracted_criteria)")
    .eq("id", run.experience_id)
    .single();

  const contentLocale = coerceExperienceLocale(exp?.jobs?.experience_locale);

  // La liste validée de l'offre, avec le tier de chaque compétence : c'est ce
  // qui fait peser un critère must-have double dans le score final.
  const competences = listerCompetences(exp?.jobs?.extracted_criteria || {});

  let reportLocale = DEFAULT_UI_LOCALE;
  if (exp?.jobs?.user_id) {
    const { data: recruteur } = await admin
      .from("users").select("ui_locale").eq("id", exp.jobs.user_id).single();
    reportLocale = coerceUiLocale(recruteur?.ui_locale);
  }

  // Justifications produites SANS le modèle (QCM et champs factuels du CRM) :
  // elles s'affichent à côté de celles rédigées par l'IA, dans le même rapport.
  // Les laisser en français ferait un rapport bilingue.
  const L = JUSTIFICATIONS_AUTO[reportLocale];

  const [{ data: steps }, { data: responses }, { data: aiMessages }] = await Promise.all([
    admin.from("experience_steps").select("*").eq("experience_id", run.experience_id).order("order_index"),
    admin.from("run_step_responses").select("*").eq("run_id", runId),
    admin.from("run_ai_messages").select("step_id, role, content").eq("run_id", runId).order("created_at"),
  ]);

  const respByStep = Object.fromEntries((responses || []).map((r) => [r.step_id, r]));
  const aiByStep = {};
  for (const m of aiMessages || []) { (aiByStep[m.step_id] ||= []).push(m); }
  const aiUsed = (aiMessages || []).some((m) => m.role === "user");

  // Steps notables = ceux qui ont des sous-dimensions BARS (colonne `criteria`,
  // nom historique). Exclut les QCM, scorés directement plus bas.
  const scored = (steps || []).filter((s) => (s.criteria || []).length > 0 && s.kind !== "classic_qcm");

  // Compétence de regroupement d'un step. `skill_assessed` est vide sur les
  // steps générés avant la migration 016 : on retombe alors sur la 1re valeur
  // de targets_skills, puis sur rien du tout (affichage à plat côté rapport).
  const skillOf = (s) => s.skill_assessed || (s.config?.targets_skills || [])[0] || "";

  // Compétences d'une étape et de ses critères, et le tier qui en découle.
  // Une étape antérieure aux identifiants n'a que des NOMS : on tente de les
  // retrouver dans la liste, et à défaut le tier reste inconnu (null) — le
  // critère pèse alors comme un must-have (moyennePonderee), donc comme avant.
  // Il n'est pas écrit « must-have » pour autant : le rapport n'affiche pas un
  // tier que personne n'a décidé.
  const idsEtape = (s) => {
    const ids = resoudreIds(s.config?.skills_tested || [], competences);
    return ids.length ? ids : resoudreIds([s.skill_assessed, ...(s.config?.targets_skills || [])].filter(Boolean), competences);
  };
  const tierDe = (ids) => tierDesIds(ids, competences);

  // ── QCM : scoring direct (bonne/mauvaise réponse) ──
  const qcmSteps = (steps || []).filter((s) => s.kind === "classic_qcm");
  const qcmScores = qcmSteps.map((s) => {
    const resp = respByStep[s.id];
    const selectedIdx = resp?.meta?.selected_index;
    const correctIdx = s.config?.correct_index;
    const isCorrect = selectedIdx != null && correctIdx != null && selectedIdx === correctIdx;
    return {
      step_id: s.id,
      // Le QCM est regroupé sous la compétence qu'il teste, pas sous un libellé
      // générique : le rapport recruteur le range avec le reste de la compétence.
      skill_name: skillOf(s),
      skill_ids: idsEtape(s),
      tier: tierDe(idsEtape(s)),
      sub_dimension_name: L.qcmDimension,
      bars_level: isCorrect ? 5 : 1,
      score: isCorrect ? 100 : 0,
      justification: isCorrect
        ? L.qcmCorrect(selectedIdx + 1)
        : selectedIdx != null
          ? L.qcmWrong(selectedIdx + 1, correctIdx + 1)
          : L.qcmNoAnswer,
      verbatim: "",
      verbatim_verified: false,
    };
  });

  // ── Sandbox CRM : correction déterministe des champs FACTUELS ──
  // Même principe que le QCM : une vérité vérifiable ne passe pas par un LLM.
  // Les champs de JUGEMENT de la même fiche partent, eux, au scoring par grille
  // ci-dessous (le step a ses critères, il est donc aussi dans `scored`).
  const crmSteps = (steps || []).filter((s) => s.sandbox_kind === "crm" && s.config?.crm);
  const crmScores = [];
  for (const s of crmSteps) {
    const ev = evaluateCrm(s.config.crm, respByStep[s.id]?.meta?.crm);
    if (!ev.factualCount) continue; // aucun attendu défini : rien à corriger
    const missed = ev.details.filter((d) => !d.correct);
    const trapMissed = missed.filter((d) => d.is_trap);
    crmScores.push({
      step_id: s.id,
      // Même compétence que la sous-dimension "Croisement des sources" posée à la
      // génération : les deux signaux de la fiche s'affichent groupés. Le
      // libellé fixe ne sert plus que de repli, pour une étape sans compétence.
      skill_name: skillOf(s) || crmSkillName(reportLocale),
      skill_ids: idsEtape(s),
      tier: tierDe(idsEtape(s)),
      sub_dimension_name: L.crmDimension,
      bars_level: crmBarsLevel(ev.score),
      score: ev.score,
      justification: missed.length === 0
        ? L.crmAllCorrect(ev.factualCount)
        : L.crmPartial(
            ev.correctCount,
            ev.factualCount,
            missed.map((d) => L.crmFieldError(d.label, d.given, d.expected)).join(" ; ")
          )
          + (trapMissed.length ? L.crmTrapMissed(trapMissed.map((d) => d.label).join(", ")) : ""),
      verbatim: "",
      verbatim_verified: false,
      // Détail champ par champ pour le rapport recruteur.
      crm_details: ev.details,
    });
  }

  // ── Sandbox code : correction déterministe par EXÉCUTION ──
  // Même principe que le QCM et que les champs factuels du CRM : ce qui est
  // mesurable ne passe pas par un LLM. Le modèle, lui, juge la qualité du code
  // (lisibilité, cas limites, structure) sur les sous-dimensions du step.
  const codeSteps = (steps || []).filter((s) => s.sandbox_kind === "code" && (s.config?.code?.tests || []).length);
  const codeScores = [];
  for (const s of codeSteps) {
    const run = codeRunSummary(s, respByStep[s.id], L);
    if (!run) continue;
    const score = run.total ? Math.round((run.passed / run.total) * 100) : 0;
    codeScores.push({
      step_id: s.id,
      skill_name: skillOf(s),
      skill_ids: idsEtape(s),
      tier: tierDe(idsEtape(s)),
      sub_dimension_name: L.codeDimension,
      bars_level: run.never_run ? 1 : testsBarsLevel(score),
      score: run.never_run ? 0 : score,
      justification: run.never_run
        ? L.codeNeverRun
        : run.failures.length === 0
          ? L.codeAllPassed(run.total, run.attempts)
          : L.codePartial(run.passed, run.total, run.attempts, run.failures.join(" ; ")),
      verbatim: "",
      verbatim_verified: false,
    });
  }

  // ── Le bloc de chaque étape, tel que le correcteur le lit ──────────────────
  // Une étape à la fois : son énoncé, sa scène, ce que le correcteur doit en
  // savoir, la réponse et la grille. Ni les autres étapes, ni les échanges avec
  // l'assistant — ceux-là ne servent qu'à la note d'usage de l'IA, rendue à part.
  const copieParStep = {};
  const blocs = new Map();
  scored.forEach((s, i) => {
    const resp = respByStep[s.id];
    const answer = candidateAnswerText(s, resp);
    // Deux formats cohabitent : les checkpoints (générations récentes) et les
    // niveaux BARS (expériences publiées avant, qui restent notables). Le
    // format est annoncé sur chaque sous-dimension, et le JSON attendu suit.
    const subDims = (s.criteria || []).map((c) => {
      if (estCritereCheckpoints(c)) {
        const cps = c.checkpoints.map((cp) => `      [${cp.id}] ${cp.description}`).join("\n");
        return `    • ${c.name} — CHECKPOINTS (note chacun 0, 1 ou 2)\n${cps}`;
      }
      const grid = (c.bars_levels || []).map((b) => `      N${b.level} (${b.label}) : ${b.description}`).join("\n");
      return `    • ${c.name} — NIVEAUX (place le candidat de 1 à 5)\n${grid}`;
    }).join("\n");
    const skill = skillOf(s);
    // Recopiage : mesuré ici, PAS laissé au jugement du modèle. Comparer une
    // réponse à dix messages d'assistant est un travail de comptage, pas
    // d'appréciation — et un évaluateur qui compte à vue rate les cas moyens.
    const messagesAssistant = (aiByStep[s.id] || [])
      .filter((m) => m.role === "assistant")
      .map((m) => m.content || "");
    const tauxCopie = messagesAssistant.length ? tauxRecopiage(answer, messagesAssistant) : 0;
    copieParStep[s.id] = tauxCopie;
    const copie = tauxCopie >= SEUIL_SIGNAL
      ? `  RECOPIAGE MESURÉ : ${Math.round(tauxCopie * 100)} % des séquences de ${NGRAMME} mots de la réponse figurent MOT POUR MOT dans les messages de l'assistant.\n`
      : "";
    // Piège du sandbox CRM (et pipeline v2), repères du tableur, tri attendu de
    // la boîte de réception, jeu du personnage : ce que l'évaluateur doit savoir.
    const trap = briefingCorrecteur(s);
    // Le candidat a-t-il repris sa fiche après l'avertissement (qui ne lui disait
    // pas quel champ) ? Signal de rigueur, pas de justesse.
    const crmMeta = s.sandbox_kind === "crm" ? respByStep[s.id]?.meta?.crm : null;
    const revision = crmMeta?.warned
      ? `  Signal : averti une fois qu'une information ne correspondait pas aux sources (sans savoir laquelle), le candidat a ${crmMeta.revised ? "repris" : "laissé tel quel"} le contenu de sa fiche.\n`
      : "";
    // La scène que le candidat avait sous les yeux (message client, fiche du
    // prospect, contexte du document) : sans elle, le correcteur notait un
    // e-mail de prospection sans savoir à qui il s'adressait.
    const scene = sceneEnTexte(s.config, "    ");
    blocs.set(s.id, `ÉTAPE ${i + 1} sur ${scored.length} — ${s.title || s.kind}
  Énoncé : ${s.prompt}
${scene ? `  Mise en situation remise au candidat :\n${scene}\n` : ""}${trap ? `${trap}\n` : ""}${revision}${copie}  Réponse du candidat :
  """${answer}"""
  Compétence évaluée : ${skill || "(non précisée)"}
  Sous-dimensions à noter :
${subDims}`);
  });

  const systemEtape = `${consigneLangueRapport(reportLocale, contentLocale)}

Tu es un évaluateur de recrutement rigoureux ET juste. Tu notes UNE étape d'un parcours d'évaluation, sous-dimension par sous-dimension, selon des grilles DÉFINIES À L'AVANCE et validées par le recruteur. Tu ne notes QUE sur ces sous-dimensions, jamais sur des critères inventés. Tu ne vois que cette étape : juge-la pour elle-même.

DEUX FORMATS DE GRILLE — chaque sous-dimension annonce le sien :
- CHECKPOINTS : chaque checkpoint est UN comportement observable, noté SÉPARÉMENT :
    0 = absent, ou contredit par la réponse ;
    1 = présent mais faible (esquissé, partiel, maladroit) ;
    2 = présent et bien fait.
  Les checkpoints sont indépendants : en rater un n'en fait pas rater un autre, et un candidat qui en réussit deux sur trois est crédité pour ces deux-là. Écris d'abord "observations" — ce que la réponse fait et ne fait pas, en une à trois phrases —, PUIS note chaque checkpoint.
- NIVEAUX : place le candidat sur un niveau de 1 à 5 en comparant son comportement OBSERVÉ aux ancres (grille des parcours publiés avant les checkpoints).

RÈGLES ABSOLUES :
- PREUVE : un checkpoint noté 1 ou 2 cite un VERBATIM — un extrait EXACT, copié mot pour mot depuis la réponse du candidat (sous-chaîne réelle), qui montre le comportement. Pour un checkpoint qui porte sur la réponse entière (longueur, ton général), cite le passage le plus représentatif. Aucun extrait possible = aucun point : note 0. Même exigence pour une sous-dimension à niveaux : un verbatim exact, ou "" et une note basse.
- MISE EN SITUATION : quand l'étape porte une « Mise en situation remise au candidat », juge la réponse AU REGARD de cette scène — une réponse client sur ce qu'elle répond au message reçu, un e-mail de prospection sur ce qu'il fait de ce qu'on savait du prospect. Le candidat l'avait sous les yeux : un détail de la scène qu'il ignore compte, un détail qu'il invente aussi. Si l'énoncé lui demandait de répondre dans une langue donnée, une réponse dans cette langue est la réponse attendue, jamais un écart.
- REPÈRES DE CONCEPTION : quand l'étape porte des repères calculés, une lecture attendue des données ou du tri, sers-t'en pour VÉRIFIER les faits et les chiffres du candidat — un total faux annoncé avec assurance reste faux. Ce sont des repères, pas un corrigé : un autre ordre de priorité, une autre lecture des données, se créditent s'ils sont justes et justifiés.
- PORTÉE : le candidat ne connaît de l'entreprise que ce que l'énoncé et la scène lui ont dit. Ne le pénalise JAMAIS de ne pas citer un fait qui n'y figurait pas — un chiffre, un délai, une référence client, une fonctionnalité du produit. Si un checkpoint ou une ancre semble l'exiger, juge la démarche (a-t-il cherché à chiffrer, à rassurer, à s'appuyer sur un exemple ?), pas le fait. Un fait qu'il INVENTE, en revanche, compte contre lui.
- LA FONCTION, PAS LA FORME : une réponse courte qui fait ce que le checkpoint décrit le valide ; une réponse longue et bien tournée qui ne le fait pas ne le valide pas. Les fautes de frappe ne comptent que si une sous-dimension porte explicitement sur la qualité de l'écrit.
- DOUTE : mets "doute": true sur un checkpoint (ou une sous-dimension à niveaux) quand la réponse se situe à la frontière entre deux notes et qu'un autre correcteur attentif pourrait raisonnablement trancher autrement. Sois honnête : le doute déclenche une relecture par un second correcteur, il ne pénalise personne. Ne le mets pas par précaution partout, ni quand la note est nette.
- RECOPIAGE : quand, et SEULEMENT quand, l'étape porte la ligne « RECOPIAGE MESURÉ », la réponse est en partie le travail de l'assistant IA, collé. Note alors ce que le CANDIDAT a produit : un checkpoint ne vaut 2 que si l'extrait cité est un passage qu'il a écrit lui-même, sinon 1 au plus ; sur une grille à niveaux, 1 ou 2, jamais plus. Un texte excellent qu'on n'a pas écrit ne prouve aucune compétence. Dis-le dans la justification, sans détour. Sans cette ligne, n'invoque jamais de recopiage.
- Aucun emoji. Réponds UNIQUEMENT avec un JSON valide.`;

  const consigneJson = `Réponds avec ce JSON exact :
{
  "sub_dimension_scores": [
    { "sub_dimension_name": "nom exact d'une sous-dimension à CHECKPOINTS", "observations": "…", "checkpoints": [ { "id": "cp1", "score": 0, "doute": false, "verbatim": "extrait exact (vide si score 0)", "justification": "une phrase" } ], "justification": "synthèse d'une phrase" },
    { "sub_dimension_name": "nom exact d'une sous-dimension à NIVEAUX", "bars_level": 1, "doute": false, "justification": "…", "verbatim": "extrait exact de la réponse" }
  ]
}
Une entrée par sous-dimension listée, sans exception, au format qu'elle annonce : "checkpoints" (une ligne par checkpoint, avec son id exact entre crochets) pour une sous-dimension à CHECKPOINTS, "bars_level" pour une sous-dimension à NIVEAUX. Les pourcentages sont calculés automatiquement ; ne les fournis pas.`;

  // Le budget de sortie se dimensionne sur ce que le modèle rend réellement :
  // une entrée par SOUS-DIMENSION (~250 tokens, observations et justification
  // comprises), plus une ligne par CHECKPOINT (score, verbatim, une phrase),
  // plus une marge fixe pour la réflexion — qui se sert dans le même budget.
  const checkpointsDe = (s) => (s.criteria || []).reduce((m, c) => m + (estCritereCheckpoints(c) ? c.checkpoints.length : 0), 0);
  const budgetEtape = (s) => Math.min(32000, 6000 + (s.criteria || []).length * 400 + checkpointsDe(s) * 150);
  const avisEtape = (s) => appelCorrecteur({ system: systemEtape, user: `${blocs.get(s.id)}\n\n${consigneJson}`, maxTokens: budgetEtape(s) });

  let critScores = [];
  let parsed = { ai_usage: { used: aiUsed, score: null }, summary: "" };
  const usages = [];
  // La mesure de fiabilité du correcteur, enregistrée avec le coût.
  const stabilite = {
    second_avis: SECOND_AVIS,
    etapes: scored.length,
    checkpoints: scored.reduce((n, s) => n + checkpointsDe(s), 0),
    etapes_douteuses: 0,
    seconds_avis: 0,
    etapes_en_desaccord: 0,
    notes_en_desaccord: 0,
    troisiemes_avis: 0,
    avis_uniques: 0,
  };

  if (scored.length > 0) {
    const lecturesParEtape = new Map(scored.map((s) => [s.id, []]));
    // Lance un avis sur chacune des étapes données, en parallèle, et range les
    // lectures obtenues. Renvoie le nombre d'avis exploitables.
    const tour = async (etapes, libelle) => {
      const reponses = await avecLimite(etapes, CONCURRENCE_NOTATION, avisEtape);
      let reussis = 0;
      etapes.forEach((s, k) => {
        const r = reponses[k];
        usages.push(r.usage);
        if (r.ok) { lecturesParEtape.get(s.id).push(lireJugement(s, r.data?.sub_dimension_scores)); reussis += 1; }
        else console.error(`scoreRun ${runId} : ${libelle} sur l'étape ${s.id} en échec — ${r.erreur}`);
      });
      return reussis;
    };

    // ── Premier tour : un avis par étape (deux en mode « toujours ») ─────────
    await tour(SECOND_AVIS === "toujours" ? scored.flatMap((s) => [s, s]) : scored, "premier avis");
    // Un premier avis en échec se retente une fois : sans lui, l'étape n'a pas
    // de note et tout le run reste en attente.
    const sansPremier = scored.filter((s) => !lecturesParEtape.get(s.id).length);
    if (sansPremier.length) await tour(sansPremier, "premier avis (nouvel essai)");

    // ── Deuxième avis, seulement là où le premier a douté ────────────────────
    if (SECOND_AVIS === "doute") {
      const douteuses = scored.filter((s) => {
        const l = lecturesParEtape.get(s.id);
        return l.length === 1 && etapeDouteuse(s, l[0], candidateAnswerText(s, respByStep[s.id]));
      });
      stabilite.etapes_douteuses = douteuses.length;
      if (douteuses.length) stabilite.seconds_avis = await tour(douteuses, "deuxième avis");
    } else if (SECOND_AVIS === "toujours") {
      stabilite.seconds_avis = scored.filter((s) => lecturesParEtape.get(s.id).length >= 2).length;
    }

    // ── Désaccord entre les deux avis : un troisième tranche ─────────────────
    const aDepartager = scored.filter((s) => {
      const l = lecturesParEtape.get(s.id);
      if (l.length < 2) return false;
      const n = desaccords(s, l[0], l[1]);
      if (!n) return false;
      stabilite.etapes_en_desaccord += 1;
      stabilite.notes_en_desaccord += n;
      return true;
    });
    if (aDepartager.length) {
      const tiers = await avecLimite(aDepartager, CONCURRENCE_NOTATION, avisEtape);
      tiers.forEach((r, k) => {
        usages.push(r.usage);
        if (r.ok) {
          lecturesParEtape.get(aDepartager[k].id).push(lireJugement(aDepartager[k], r.data?.sub_dimension_scores));
          stabilite.troisiemes_avis += 1;
        } else {
          console.error(`scoreRun ${runId} : troisième avis sur l'étape ${aDepartager[k].id} en échec — ${r.erreur}`);
        }
      });
    }

    // Une étape restée sans aucun avis : le run RESTE en « submitted », donc
    // rejouable. Le passer à « scored » sans sa note le figerait pour de bon.
    const sansAvis = scored.filter((s) => !lecturesParEtape.get(s.id).length);
    if (sansAvis.length) {
      console.error(`scoreRun ${runId} : ${sansAvis.length} étape(s) sans aucun avis exploitable`);
      return { success: false, error: "Scoring : étape non notée" };
    }
    stabilite.avis_uniques = scored.filter((s) => lecturesParEtape.get(s.id).length === 1).length;

    // ── Consolidation : la note médiane, la preuve qui la porte ──────────────
    critScores = scored.flatMap((step) => {
      const lectures = lecturesParEtape.get(step.id);
      const src = candidateAnswerText(step, respByStep[step.id]);
      // Au-delà du seuil, le plafond ne se négocie pas : le modèle a pour
      // consigne de ne pas créditer ce que le candidat n'a pas écrit, mais il
      // lui arrive de se laisser impressionner par un texte bien tourné. Ce
      // cas-là est trop net pour dépendre d'un jugement.
      const taux = copieParStep[step.id] || 0;
      const plafonne = taux >= SEUIL_PLAFOND;

      return (step.criteria || []).map((critere) => {
        const vues = lectures.map((l) => l.get(critere)).filter(Boolean);
        if (!vues.length) return null;
        const skillIds = critere.skill_ids?.length ? critere.skill_ids : idsEtape(step);
        const commun = {
          step_id: step.id,
          // La compétence vient du step, pas du modèle : elle sert de clé de
          // regroupement à l'affichage et ne doit pas dériver d'une reformulation.
          skill_name: skillOf(step),
          skill_ids: skillIds,
          tier: tierDe(skillIds),
          sub_dimension_name: critere.name || "",
        };

        // ── Critère à checkpoints ──────────────────────────────────────────
        if (estCritereCheckpoints(critere)) {
          const checkpoints = critere.checkpoints.map((cp) => {
            const avis = vues.map((v) => v.checkpoints.get(String(cp.id))).filter(Boolean);
            // Un checkpoint qu'aucun avis n'a noté compte 0, et le dit : ne pas
            // le compter du tout gonflerait le pourcentage sur ce qu'on n'a pas vu.
            if (!avis.length) {
              return { id: cp.id, description: cp.description, score: 0, justification: L.checkpointNotScored, verbatim: "", verbatim_verified: false, not_scored: true };
            }
            let score = mediane(avis.map((a) => a.score));
            // La justification et la preuve viennent d'un avis qui a donné
            // cette note — de préférence un dont la citation est vérifiée.
            const retenu = avis.find((a) => a.score === score && verifyVerbatim(a.verbatim, src))
              || avis.find((a) => a.score === score) || avis[0];
            if (plafonne) score = Math.min(score, 1);
            const verbatim = score > 0 ? retenu.verbatim : "";
            return {
              id: cp.id,
              description: cp.description,
              ...(cp.skill_id ? { skill_id: cp.skill_id } : {}),
              score,
              justification: retenu.justification,
              verbatim,
              verbatim_verified: verifyVerbatim(verbatim, src),
              // Les notes de chaque avis, quand il y en a eu plusieurs : on voit
              // où le correcteur a hésité.
              ...(avis.length > 1 ? { avis: avis.map((a) => a.score) } : {}),
            };
          });
          // Les observations d'ensemble : celles de l'avis le plus proche des
          // notes retenues.
          const accord = (v) => critere.checkpoints.filter((cp, k) => v.checkpoints.get(String(cp.id))?.score === checkpoints[k].score).length;
          const proche = vues.reduce((meilleur, v) => (accord(v) > accord(meilleur) ? v : meilleur), vues[0]);
          return {
            ...commun,
            format: "checkpoints",
            checkpoints,
            observations: proche.observations,
            bars_level: null,
            score: pourcentageCheckpoints(checkpoints.map((cp) => cp.score)),
            justification: proche.justification + (plafonne ? L.recopiageCapCheckpoints(Math.round(taux * 100)) : ""),
            verbatim: "",
            verbatim_verified: false,
          };
        }

        // ── Critère à niveaux (ancienne grille) ────────────────────────────
        let level = mediane(vues.map((v) => v.bars_level));
        const retenu = vues.find((v) => v.bars_level === level) || vues[0];
        if (plafonne) level = Math.min(level, 2);
        return {
          ...commun,
          bars_level: level,
          score: (level - 1) * 25,
          justification: retenu.justification + (plafonne ? L.recopiageCap(Math.round(taux * 100)) : ""),
          verbatim: retenu.verbatim,
          verbatim_verified: verifyVerbatim(retenu.verbatim, src),
        };
      }).filter(Boolean);
    });

    // ── Synthèse et usage de l'IA : un dernier appel, sur les notes retenues ──
    // La synthèse s'écrit à partir des notes CONSOLIDÉES, pas d'une nouvelle
    // lecture du parcours : elle ne peut pas contredire ce qui a été noté.
    // L'usage de l'IA, lui, se juge sur l'ensemble des échanges du run.
    const resultats = [...critScores, ...qcmScores, ...crmScores, ...codeScores];
    const lignesResultats = (steps || []).map((s, i) => {
      const lignes = resultats.filter((c) => c.step_id === s.id)
        .map((c) => `    • ${c.sub_dimension_name} : ${c.score} % — ${String(c.justification || "").replace(/\s*\n\s*/g, " ")}`);
      return lignes.length ? `  Étape ${i + 1} — ${s.title || s.kind} (${skillOf(s) || "compétence non précisée"})\n${lignes.join("\n")}` : null;
    }).filter(Boolean).join("\n");
    const echanges = (steps || []).map((s, i) => {
      const msgs = aiByStep[s.id] || [];
      if (!msgs.length) return null;
      return `  Étape ${i + 1} — ${s.title || s.kind}\n${msgs.map((m) => `      ${m.role === "user" ? "Candidat" : "Assistant"}: ${m.content}`).join("\n")}`;
    }).filter(Boolean).join("\n\n");

    const systemSynthese = `${consigneLangueRapport(reportLocale, contentLocale)}

Tu rédiges la synthèse d'une évaluation de recrutement dont les notes sont DÉJÀ établies, sous-dimension par sous-dimension. Tu ne renotes rien : tu résumes.
- "summary" : 2 à 3 phrases factuelles pour le recruteur — les forces et les manques qui ressortent des notes, sans contredire aucune d'elles.
- "ai_usage" : seulement si le candidat a échangé avec l'assistant IA. Évalue COMMENT il l'a utilisé (cadrage du problème, itération, regard critique sur la sortie), pas s'il l'a utilisé, sur 0 à 100. Sa justification est lue par un recruteur qui doit comprendre la note sans relire les échanges : passe explicitement en revue les trois axes, dis pour chacun ce que le candidat a fait ou n'a pas fait, en t'appuyant sur ce qu'il a réellement écrit à l'assistant. Deux à quatre phrases.
- Aucun emoji. Réponds UNIQUEMENT avec un JSON valide.`;
    const userSynthese = `NOTES ÉTABLIES :
${lignesResultats || "  (aucune)"}

L'assistant IA a-t-il été utilisé sur ce run : ${aiUsed ? "OUI" : "NON"}.
${echanges ? `\nÉCHANGES AVEC L'ASSISTANT IA :\n${echanges}\n` : ""}
Réponds avec ce JSON exact :
{
  "ai_usage": { "used": ${aiUsed}, "score": 0-100, "justification": "…" },
  "summary": "Synthèse de 2-3 phrases, factuelle."
}
Si used=false, mets ai_usage.score à null.`;

    // Non bloquant : sans synthèse, les notes restent valables et le rapport
    // s'affiche — seul le résumé manquera.
    const synthese = await appelCorrecteur({ system: systemSynthese, user: userSynthese, maxTokens: 8000 });
    usages.push(synthese.usage);
    if (synthese.ok) parsed = synthese.data;
    else console.error(`scoreRun ${runId} : synthèse en échec (non bloquant) — ${synthese.erreur}`);
  }

  const usage = { ...cumulUsages(usages), stabilite };

  // Fusionne les scores notés par le modèle et les scores déterministes
  // (QCM + champs factuels du CRM + tests exécutés du sandbox code)
  const allScores = [...critScores, ...qcmScores, ...crmScores, ...codeScores];

  // Moyenne des critères, pondérée par le tier de leur compétence : un critère
  // must-have compte double (décision du 29/09/2026). Un critère sans tier
  // connu pèse comme un must-have — sur un parcours antérieur aux tiers, tous
  // pèsent pareil, et le score reste la moyenne qu'il était.
  const overall = moyennePonderee(allScores);
  const rawAi = parsed.ai_usage?.used ? parsed.ai_usage?.score : null;
  const aiUsageScore = rawAi == null ? null : Math.round(Math.max(0, Math.min(100, Number(rawAi))));
  // Le modèle produisait déjà cette justification, mais elle n'était pas
  // conservée : le recruteur voyait un pourcentage nu là où chaque
  // sous-dimension BARS porte, elle, son explication.
  const aiUsageJustification = parsed.ai_usage?.used ? (parsed.ai_usage?.justification || null) : null;

  return {
    success: true,
    exp,
    ligne: {
      overall,
      ai_usage_used: !!parsed.ai_usage?.used,
      ai_usage_score: aiUsageScore,
      ai_usage_justification: aiUsageJustification,
      summary: parsed.summary || "",
      criterion_scores: allScores,
      scoring_usage: usage,
    },
  };
}

// Scoring de fin de run : calcule la note (evaluerRun), l'enregistre, facture.
export async function scoreRun(runId) {
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("candidate_runs").select("id, candidate_id, experience_id, status").eq("id", runId).single();
  if (!run) return { success: false, error: "Run introuvable" };
  if (run.status === "scored") return { success: true, alreadyScored: true };

  const ev = await evaluerRun(admin, run);
  if (!ev.success) return ev;
  const { exp } = ev;
  const { overall } = ev.ligne;

  const { error: upsertError } = await admin.from("run_scores").upsert({
    run_id: runId,
    ...ev.ligne,
  }, { onConflict: "run_id" });

  // Cette écriture n'était pas contrôlée : un échec (schéma en retard sur le
  // code, contrainte, coupure) passait inaperçu et le run était tout de même
  // marqué "scored" — donc figé sans score et non rejouable. On échoue net et
  // on laisse le run en "submitted", comme pour les erreurs de scoring.
  if (upsertError) {
    console.error(`scoreRun ${runId} : écriture run_scores refusée — ${upsertError.code} ${upsertError.message}`);
    return { success: false, error: "Scoring : enregistrement refusé" };
  }

  await admin.from("candidate_runs").update({ status: "scored", scored_at: new Date().toISOString() }).eq("id", runId);

  // ── Facturation : 2 crédits, au propriétaire de l'offre ───────────────────
  // Placé APRÈS le passage en « scored », jamais avant : tous les chemins
  // d'échec au-dessus sortent en laissant le run « submitted », rejouable, et
  // ne doivent donc rien facturer. Une fois la ligne à « scored », l'entrée de
  // scoreRun() renvoie alors alreadyScored — un second passage ne re-débite
  // pas. C'est là toute l'idempotence, aucun drapeau à poser.
  if (exp?.jobs?.user_id) {
    const facture = await factureNotationCandidat(exp.jobs.user_id);
    if (!facture.success) {
      // Non bloquant : le rapport est écrit, le recruteur doit le voir. Un
      // solde insuffisant se règle sur le compte, pas en cachant un résultat
      // déjà produit.
      console.error(`scoreRun ${runId} : débit de la notation refusé (non bloquant) — ${facture.error}`);
    }
  }

  // Dénormalise le score pour la liste candidats — inconditionnel, il n'écrase
  // aucune décision du recruteur.
  if (overall != null) await admin.from("candidates").update({ score_global: overall }).eq("id", run.candidate_id);

  // Le statut, lui, ne remonte QUE depuis un état non terminal. Un candidat déjà
  // trié par le recruteur (shortlisted / rejected) ne doit jamais être ramené à
  // « Évalué » par un scoring qui se termine après coup. "soumis" est dans la
  // liste : c'est l'état que submitRun vient de poser juste avant.
  await admin.from("candidates")
    .update({ status: "scored" })
    .eq("id", run.candidate_id)
    .in("status", ["invited", "in_progress", "soumis"]);

  return { success: true, overall };
}
