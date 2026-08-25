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

// Budget total d'un lot. Il doit rester SOUS le délai maximum d'une fonction
// serverless : mieux vaut rendre « temps dépassé » proprement que se faire
// couper au milieu, ce qui laisserait le candidat sans réponse du tout.
const RUN_TIMEOUT_MS = 8000;

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
      signal,
    });
  } catch (err) {
    // Notre propre abandon (budget dépassé) se présente comme une erreur fetch.
    if (err?.name === "AbortError") return { verdict: "timeout", stdout: "", stderr: "", compile_output: "" };
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
  // tourne et se trompe : la distinction doit survivre jusqu'au rapport.
  let verdict = "ok";
  if (compileOutput.trim()) verdict = "compile_error";
  // 137 = tué par SIGKILL, c'est ainsi que finit une boucle infinie.
  else if (body.signal || status === 137) verdict = "timeout";
  else if (status !== 0) verdict = "runtime_error";

  return { verdict, stdout, stderr, compile_output: compileOutput };
}

/**
 * Exécute un même code source sur plusieurs entrées.
 *
 * Les cas partent EN PARALLÈLE, sous un budget commun : en série, six tests à
 * 3 s feraient vingt secondes et la fonction serveur serait coupée avant.
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
  const controller = new AbortController();
  const budget = setTimeout(() => controller.abort(), RUN_TIMEOUT_MS);

  let raw;
  try {
    raw = await Promise.all(tests.map((test) => runOne({
      compiler, source, stdin: test.stdin, signal: controller.signal,
    })));
  } finally {
    clearTimeout(budget);
  }

  // Panne franche du fournisseur : tous les cas échouent de la même façon, et
  // ce n'est pas la faute du candidat. On remonte l'erreur plutôt que d'écrire
  // « 0/6 tests réussis » dans son rapport.
  const panne = ["provider_unreachable", "provider_error", "quota_exceeded"];
  if (raw.every((r) => panne.includes(r.verdict))) {
    return { success: false, error: raw[0].verdict };
  }

  return {
    success: true,
    results: raw.map((r, i) => ({
      ...r,
      // Un verdict de panne isolé ne doit pas se lire comme un échec du code.
      verdict: panne.includes(r.verdict) ? "error" : r.verdict,
      passed: r.verdict === "ok" && outputMatches(r.stdout, tests[i].expected_output),
      // Wandbox ne renvoie pas de durée d'exécution, et mesurer l'aller-retour
      // réseau à la place serait un chiffre faux affiché au candidat.
      time: null,
    })),
  };
}
