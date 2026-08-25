// Exécution du code candidat — fournisseur : Wandbox.
//
// POURQUOI PAS CHEZ NOUS : faire tourner du code arbitraire écrit par un
// inconnu demande un isolement sérieux (cgroups, seccomp, quotas). C'est un
// métier à part entière, et ce n'est pas le nôtre. Le code s'exécute chez le
// fournisseur ; notre infra ne voit passer que du JSON.
//
// POURQUOI WANDBOX ET PAS JUDGE0 : Judge0 est facturé à l'exécution. Wandbox
// est gratuit et ne demande aucune clé — c'était la contrainte posée. Piston,
// l'autre candidat gratuit, est passé en accès sur liste blanche le 15/02/2026
// (son API publique répond 401) : il n'est plus une option.
//
// CE QU'ON PAIE À LA PLACE, ET QU'IL FAUT ASSUMER : service communautaire, sans
// engagement de disponibilité, 2 à 4 s par exécution, et aucun réglage de
// délai côté serveur — une boucle infinie n'y est tuée qu'au bout de ~32 s,
// bien après le délai d'une fonction serverless. D'où le budget ci-dessous,
// tenu par nous et pas par eux.
//
// LIMITES ASSUMÉES : un fichier, une entrée standard, pas de dépendances, rien
// qui persiste. C'est l'exercice court, pas le projet sur dépôt.
//
// Changer de fournisseur = réécrire ce seul fichier : rien d'autre dans
// l'application ne sait qui exécute.

import { languageInfo } from "@/lib/constants/codeLanguages";

const ENDPOINT = process.env.CODE_RUNNER_URL || "https://wandbox.org/api/compile.json";

// Délai d'UNE exécution. Le fournisseur ne tue une boucle infinie qu'au bout
// de ~32 s : on coupe avant, sinon un candidat attend une demi-minute pour
// apprendre que son code boucle.
const RUN_TIMEOUT_MS = 15000;

// Budget de l'ENSEMBLE du lot. Le segment /run porte maxDuration = 300, on a
// donc de la marge ; ce plafond n'est là que pour ne jamais rester pendu.
const BATCH_TIMEOUT_MS = 90000;

// Combien de cas tournent EN MÊME TEMPS.
//
// C'EST LE RÉGLAGE LE PLUS DÉLICAT DU FICHIER — ne pas l'augmenter sans mesurer.
// Lancer les 8 cas d'un coup a fait tomber le fournisseur en production le
// 25/08/2026 : « OCI runtime error: crun: clone: Resource temporarily
// unavailable », c'est-à-dire son hôte incapable de créer autant de conteneurs
// d'un coup. C'est un service gratuit et partagé : on l'utilise doucement.
const CONCURRENCE = 3;

// Une panne d'infrastructure du fournisseur ARRIVE dans le champ des erreurs de
// compilation. Sans cette liste, elle est affichée au candidat comme « ne
// compile pas » et comptée comme un test échoué : on lui reproche une panne qui
// n'est pas la sienne, et ça entre dans son score.
const SIGNATURES_INFRA = /OCI runtime|\bcrun\b|\brunc\b|Resource temporarily unavailable|Cannot allocate memory|No space left on device/i;

const dors = (ms) => new Promise((r) => setTimeout(r, ms));

export function isCodeRunnerConfigured() {
  return !!ENDPOINT;
}

// Comparaison de sortie tolérante à ce qui n'est pas du signal : espaces en fin
// de ligne, ligne vide finale, \r\n de Windows. Un candidat ne doit pas échouer
// sur un saut de ligne de trop. Le reste (casse, ponctuation) est significatif.
export function outputMatches(actual, expected) {
  const norm = (s) => String(s ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n").map((line) => line.replace(/\s+$/, "")).join("\n")
    .replace(/\n+$/, "");
  return norm(actual) === norm(expected);
}

// Une exécution. Renvoie toujours un résultat exploitable : un échec réseau est
// un verdict comme un autre, pas une exception qui ferait tomber tout le lot.
async function runOne({ compiler, source, stdin, signal }) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ compiler, code: source, stdin: stdin ?? "" }),
      // Deux raisons d'abandonner : ce cas-ci traîne (boucle infinie), ou le
      // lot entier a dépassé son budget.
      signal: AbortSignal.any([signal, AbortSignal.timeout(RUN_TIMEOUT_MS)]),
    });
  } catch (err) {
    // Nos propres abandons se présentent comme des erreurs fetch : AbortError
    // pour le budget du lot, TimeoutError pour le délai de ce cas-ci.
    if (err?.name === "AbortError" || err?.name === "TimeoutError") {
      return { verdict: "timeout", stdout: "", stderr: "", compile_output: "" };
    }
    console.error("codeRunner fetch error:", err);
    return { verdict: "provider_unreachable", stdout: "", stderr: "", compile_output: "" };
  }

  if (!res.ok) {
    console.error("codeRunner HTTP", res.status);
    return {
      verdict: res.status === 429 ? "quota_exceeded" : "provider_error",
      stdout: "", stderr: "", compile_output: "",
    };
  }

  let body;
  try {
    body = await res.json();
  } catch {
    return { verdict: "provider_error", stdout: "", stderr: "", compile_output: "" };
  }

  const compileOutput = body.compiler_error || "";
  const stdout = body.program_output || "";
  const stderr = body.program_error || "";
  const status = Number(body.status);

  // L'ORDRE COMPTE. Un code qui ne compile pas ne se juge pas comme un code qui
  // tourne et se trompe : la distinction doit survivre jusqu'au rapport. Et
  // avant tout le reste, une panne de leur infrastructure n'est pas une erreur
  // du candidat — elle se déguise en erreur de compilation, on la démasque ici.
  let verdict = "ok";
  if (SIGNATURES_INFRA.test(compileOutput) || SIGNATURES_INFRA.test(stderr)) verdict = "provider_busy";
  else if (compileOutput.trim()) verdict = "compile_error";
  // 137 = tué par SIGKILL, c'est ainsi que finit une boucle infinie.
  else if (body.signal || status === 137) verdict = "timeout";
  else if (status !== 0) verdict = "runtime_error";

  return { verdict, stdout, stderr, compile_output: compileOutput };
}

// Verdicts qui ne disent RIEN du code du candidat : ils ne doivent jamais être
// comptés comme un test échoué.
const VERDICTS_PANNE = ["provider_busy", "provider_unreachable", "provider_error", "quota_exceeded"];

// Une saturation du fournisseur est passagère par nature : on redonne sa chance
// au cas, une fois, après une pause. Inutile d'insister davantage — si le
// service est à genoux, autant le dire au candidat que le marteler.
async function runOneAvecReprise(args) {
  const premier = await runOne(args);
  if (!VERDICTS_PANNE.includes(premier.verdict)) return premier;
  await dors(1500);
  return runOne(args);
}

// Exécute les cas par vagues de CONCURRENCE, jamais tous d'un coup.
async function executeAvecConcurrence(tests, fabriqueArgs) {
  const resultats = new Array(tests.length);
  let curseur = 0;
  const ouvrier = async () => {
    while (curseur < tests.length) {
      const i = curseur++;
      resultats[i] = await runOneAvecReprise(fabriqueArgs(tests[i]));
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCE, tests.length) }, ouvrier));
  return resultats;
}

/**
 * Exécute un même code source sur plusieurs entrées.
 *
 * @param {object} p
 * @param {string} p.source    code du candidat
 * @param {string} p.language  clé de CODE_LANGUAGES
 * @param {Array}  p.tests     [{ stdin, expected_output }]
 * @returns {Promise<{success: boolean, error?: string, results?: Array}>}
 *   results[i] = { verdict, passed, stdout, stderr, compile_output, time }
 */
export async function executeBatch({ source, language, tests }) {
  if (!isCodeRunnerConfigured()) return { success: false, error: "not_configured" };
  if (!tests?.length) return { success: false, error: "no_tests" };

  const compiler = languageInfo(language).wandbox;
  const budgetLot = new AbortController();
  const minuteurLot = setTimeout(() => budgetLot.abort(), BATCH_TIMEOUT_MS);

  let raw;
  try {
    raw = await executeAvecConcurrence(tests, (test) => ({
      compiler, source, stdin: test.stdin, signal: budgetLot.signal,
    }));
  } finally {
    clearTimeout(minuteurLot);
  }

  // UN SEUL cas en panne suffit à invalider le lot. Rendre un score partiel
  // serait pire que ne rien rendre : « 4/8 » partirait dans meta.code, puis
  // dans le rapport recruteur, comme si le candidat avait raté la moitié des
  // cas — alors que quatre d'entre eux n'ont jamais tourné.
  const enPanne = raw.filter((r) => VERDICTS_PANNE.includes(r.verdict));
  if (enPanne.length) return { success: false, error: enPanne[0].verdict };

  return {
    success: true,
    results: raw.map((r, i) => ({
      ...r,
      passed: r.verdict === "ok" && outputMatches(r.stdout, tests[i].expected_output),
      // Wandbox ne renvoie pas de durée d'exécution, et mesurer l'aller-retour
      // réseau à la place serait un chiffre faux affiché au candidat.
      time: null,
    })),
  };
}
