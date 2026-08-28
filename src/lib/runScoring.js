import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { evaluateCrm, crmBarsLevel, crmAnswerForScoring, crmTrapBriefing, crmSkillName } from "@/lib/crmScoring";
import { consigneLangueRapport } from "@/lib/i18n/prompt";
import { coerceExperienceLocale, coerceUiLocale, DEFAULT_UI_LOCALE } from "@/lib/i18n/config";

const SCORING_MODEL = "claude-sonnet-4-6";

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

// Scoring UNIQUE de fin de run : un seul appel qui relit toute la trajectoire.
export async function scoreRun(runId) {
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("candidate_runs").select("id, candidate_id, experience_id, status").eq("id", runId).single();
  if (!run) return { success: false, error: "Run introuvable" };
  if (run.status === "scored") return { success: true, alreadyScored: true };

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
    .select("jobs!inner(experience_locale, user_id)")
    .eq("id", run.experience_id)
    .single();

  const contentLocale = coerceExperienceLocale(exp?.jobs?.experience_locale);

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
  // Les champs de JUGEMENT de la même fiche partent, eux, au scoring BARS
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
      // génération : les deux signaux de la fiche s'affichent groupés.
      skill_name: crmSkillName(reportLocale),
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

  // ── Construit la trajectoire pour le prompt (uniquement les steps non-QCM) ──
  const copieParStep = {};
  const traj = scored.map((s, i) => {
    const resp = respByStep[s.id];
    const answer = candidateAnswerText(s, resp);
    const subDims = (s.criteria || []).map((c) => {
      const grid = (c.bars_levels || []).map((b) => `      N${b.level} (${b.label}) : ${b.description}`).join("\n");
      return `    • ${c.name}\n${grid}`;
    }).join("\n");
    const skill = skillOf(s);
    const ai = (aiByStep[s.id] || []).map((m) => `      ${m.role === "user" ? "Candidat" : "Assistant"}: ${m.content}`).join("\n");
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
    // Piège du sandbox CRM : l'évaluateur doit connaître la contradiction placée
    // dans le brief pour juger si le candidat a croisé les sources.
    const trap = s.sandbox_kind === "crm" && s.config?.crm ? crmTrapBriefing(s.config.crm) : "";
    // Le candidat a-t-il repris sa fiche après l'avertissement (qui ne lui disait
    // pas quel champ) ? Signal de rigueur, pas de justesse.
    const crmMeta = s.sandbox_kind === "crm" ? respByStep[s.id]?.meta?.crm : null;
    const revision = crmMeta?.warned
      ? `  Signal : averti une fois qu'une information ne correspondait pas aux sources (sans savoir laquelle), le candidat a ${crmMeta.revised ? "repris" : "laissé tel quel"} le contenu de sa fiche.\n`
      : "";
    return `ÉTAPE ${i + 1} — ${s.title || s.kind} (step_id: ${s.id})
  Énoncé : ${s.prompt}
${trap ? `${trap}\n` : ""}${revision}${copie}  Réponse du candidat :
  """${answer}"""
  Compétence évaluée : ${skill || "(non précisée)"}
  Sous-dimensions à noter :
${subDims}${ai ? `\n  Échanges avec l'assistant IA :\n${ai}` : ""}`;
  }).join("\n\n");

  const system = `${consigneLangueRapport(reportLocale, contentLocale)}

Tu es un évaluateur de recrutement rigoureux. Tu notes un candidat sur une trajectoire d'évaluation, sous-dimension par sous-dimension, selon des grilles BARS DÉFINIES À L'AVANCE. Tu ne notes QUE sur ces sous-dimensions, jamais sur des critères inventés.

RÈGLES ABSOLUES :
- Pour chaque sous-dimension, positionne le candidat sur un niveau BARS de 1 à 5 en comparant son comportement OBSERVÉ aux ancres.
- Justifie chaque note et cite un VERBATIM : un extrait EXACT, copié mot pour mot depuis la réponse du candidat (sous-chaîne réelle). Si rien de pertinent, verbatim = "" et note basse.
- RECOPIAGE : quand une étape porte la ligne « RECOPIAGE MESURÉ », la réponse n'est pas le travail du candidat, c'est celui de l'assistant, collé. Note alors les sous-dimensions sur CE QUE LE CANDIDAT A PRODUIT — c'est-à-dire rien, ou presque : niveau 1 ou 2, jamais plus, quelle que soit la qualité apparente du texte. Un texte excellent qu'on n'a pas écrit ne prouve aucune compétence. Dis-le explicitement dans la justification, sans détour.
- La note d'usage de l'IA n'est calculée QUE si le candidat a échangé avec l'assistant : évalue COMMENT il l'a utilisé (cadrage du problème, itération, regard critique sur la sortie), pas s'il l'a utilisé. Absente sinon.
- Sa justification est lue par un recruteur qui doit comprendre la note sans relire les échanges : passe explicitement en revue les trois axes (cadrage, itération, regard critique), dis pour chacun ce que le candidat a fait ou n'a pas fait, et appuie-toi sur ce qu'il a réellement écrit à l'assistant. Deux à quatre phrases.
- Aucun emoji. Réponds UNIQUEMENT avec un JSON valide.`;

  const user = `TRAJECTOIRE DU CANDIDAT :

${traj}

L'assistant IA a-t-il été utilisé sur ce run : ${aiUsed ? "OUI" : "NON"}.

Réponds avec ce JSON exact :
{
  "sub_dimension_scores": [
    { "step_id": "id exact", "skill_name": "nom exact de la compétence évaluée à cette étape", "sub_dimension_name": "nom exact de la sous-dimension", "bars_level": 1-5, "justification": "…", "verbatim": "extrait exact de la réponse" }
  ],
  "ai_usage": { "used": ${aiUsed}, "score": 0-100, "justification": "…" },
  "summary": "Synthèse de 2-3 phrases, factuelle."
}
Une entrée par sous-dimension listée, sans exception. Le champ score sera calculé automatiquement à partir du bars_level ; ne le fournis pas. Si used=false, mets ai_usage.score à null.`;

  let critScores = [];
  let parsed = { ai_usage: { used: aiUsed, score: null }, summary: "" };
  let usage = {};

  // Le budget de sortie se dimensionne sur le nombre de SOUS-DIMENSIONS, pas de
  // steps : le modèle rend une entrée JSON par sous-dimension (justification +
  // verbatim), ~250 tokens mesurés. Compter les steps sous-évaluait le besoin
  // d'un facteur 3 et tronquait la réponse au milieu du JSON.
  const subDimCount = scored.reduce((n, s) => n + (s.criteria || []).length, 0);

  // Appeler Claude seulement s'il y a des steps BARS à évaluer
  if (scored.length > 0) {
    const response = await anthropic.messages.create({
      model: SCORING_MODEL, max_tokens: Math.min(16000, 1000 + subDimCount * 400), temperature: 0.1,
      system, messages: [{ role: "user", content: user }],
    });
    usage = computeAiCost(SCORING_MODEL, response.usage);

    // Sur échec, le run RESTE en "submitted". Le passer à "scored" sans ligne
    // run_scores le rendrait définitivement irrécupérable : le garde-fou en tête
    // de fonction sort immédiatement sur status === "scored", donc plus aucune
    // relance ne pourrait aboutir.
    if (response.stop_reason === "max_tokens") {
      console.error(`scoreRun ${runId} : réponse tronquée (max_tokens) sur ${subDimCount} sous-dimensions`);
      return { success: false, error: "Scoring : réponse tronquée" };
    }
    const match = response.content[0].text.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error(`scoreRun ${runId} : aucun JSON dans la réponse du modèle`);
      return { success: false, error: "Scoring : JSON invalide" };
    }
    // Un JSON tronqué passe la regex (elle s'arrête au dernier `}` présent) :
    // c'est ici que l'échec se matérialisait, en exception non rattrapée.
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      console.error(`scoreRun ${runId} : JSON illisible — ${err.message}`);
      return { success: false, error: "Scoring : JSON illisible" };
    }

    // Post-traitement : score dérivé du niveau BARS + vérification verbatim
    critScores = (parsed.sub_dimension_scores || []).map((c) => {
      const step = scored.find((s) => s.id === c.step_id);
      // Au-delà du seuil, le plafond ne se négocie pas : le modèle a pour
      // consigne de descendre à 1 ou 2, mais il lui arrive de se laisser
      // impressionner par un texte bien tourné. Ce cas-là est trop net pour
      // dépendre d'un jugement — et c'est exactement celui qu'on veut sanctionner.
      const taux = copieParStep[c.step_id] || 0;
      const plafonne = taux >= SEUIL_PLAFOND;
      let level = Math.max(1, Math.min(5, Number(c.bars_level) || 1));
      if (plafonne) level = Math.min(level, 2);
      const score = (level - 1) * 25;
      const src = step ? candidateAnswerText(step, respByStep[step.id]) : "";
      return {
        step_id: c.step_id,
        // La compétence vient du step, pas du modèle : elle sert de clé de
        // regroupement à l'affichage et ne doit pas dériver d'une reformulation.
        skill_name: step ? skillOf(step) : (c.skill_name || ""),
        sub_dimension_name: c.sub_dimension_name || "",
        bars_level: level,
        score,
        justification: (c.justification || "") + (plafonne ? L.recopiageCap(Math.round(taux * 100)) : ""),
        verbatim: c.verbatim || "",
        verbatim_verified: verifyVerbatim(c.verbatim, src),
      };
    });
  }

  // Fusionne les scores BARS (Claude) et les scores déterministes
  // (QCM + champs factuels du CRM + tests exécutés du sandbox code)
  const allScores = [...critScores, ...qcmScores, ...crmScores, ...codeScores];

  const overall = allScores.length
    ? Math.round(allScores.reduce((s, c) => s + c.score, 0) / allScores.length)
    : null;
  const rawAi = parsed.ai_usage?.used ? parsed.ai_usage?.score : null;
  const aiUsageScore = rawAi == null ? null : Math.round(Math.max(0, Math.min(100, Number(rawAi))));
  // Le modèle produisait déjà cette justification, mais elle n'était pas
  // conservée : le recruteur voyait un pourcentage nu là où chaque
  // sous-dimension BARS porte, elle, son explication.
  const aiUsageJustification = parsed.ai_usage?.used ? (parsed.ai_usage?.justification || null) : null;

  const { error: upsertError } = await admin.from("run_scores").upsert({
    run_id: runId,
    overall,
    ai_usage_used: !!parsed.ai_usage?.used,
    ai_usage_score: aiUsageScore,
    ai_usage_justification: aiUsageJustification,
    summary: parsed.summary || "",
    criterion_scores: allScores,
    scoring_usage: usage,
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
