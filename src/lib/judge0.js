// Client Judge0 (via RapidAPI) — exécution du code candidat.
//
// POURQUOI RAPIDAPI ET PAS DU SELF-HOSTED : faire tourner du code arbitraire
// écrit par un inconnu demande un isolement sérieux (cgroups, seccomp, quotas).
// C'est un métier à part entière, et ce n'est pas le nôtre. Judge0 exécute chez
// lui, dans son conteneur ; notre infra ne voit jamais que du JSON.
//
// LIMITES ASSUMÉES : un fichier, un stdin, pas de système de fichiers
// persistant, pas d'installation de dépendances. C'est l'exercice court
// ("écris une fonction qui…"), pas le projet de 90 minutes sur un vrai dépôt —
// celui-là demandera un tout autre substrat.
//
// La clé n'existe que côté serveur : ce module ne doit JAMAIS être importé
// depuis un composant client.

import { languageInfo } from "@/lib/constants/codeLanguages";

const HOST = process.env.JUDGE0_RAPIDAPI_HOST || "judge0-ce.p.rapidapi.com";
const BASE = `https://${HOST}`;

// Le catalogue des langages vit dans lib/constants/codeLanguages.js : il est
// aussi lu par l’éditeur recruteur, qui est un composant client et n’a pas à
// embarquer ce module-ci.
export { CODE_LANGUAGES, DEFAULT_LANGUAGE, languageInfo } from "@/lib/constants/codeLanguages";

// Statuts Judge0 utiles. 1/2 = en cours, 3 = exécution terminée sans erreur,
// le reste est un échec dont la NATURE compte pour le candidat comme pour le
// scoring : une compilation qui casse ne se juge pas comme un mauvais résultat.
const STATUS = {
  IN_QUEUE: 1,
  PROCESSING: 2,
  ACCEPTED: 3,
  WRONG_ANSWER: 4,
  TIME_LIMIT: 5,
  COMPILE_ERROR: 6,
};

export function isJudge0Configured() {
  return !!process.env.JUDGE0_RAPIDAPI_KEY;
}

const b64 = (s) => Buffer.from(String(s ?? ""), "utf8").toString("base64");
const unb64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

function headers() {
  return {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": process.env.JUDGE0_RAPIDAPI_KEY,
    "X-RapidAPI-Host": HOST,
  };
}

// Comparaison de sortie tolérante à ce qui n'est pas du signal : espaces en fin
// de ligne, ligne vide finale, \r\n de Windows. Un candidat ne doit pas échouer
// sur un `\n` de trop. Le reste (casse, ponctuation) est significatif.
export function outputMatches(actual, expected) {
  const norm = (s) => String(s ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n").map((line) => line.replace(/\s+$/, "")).join("\n")
    .replace(/\n+$/, "");
  return norm(actual) === norm(expected);
}

// Catégorie d'échec exploitable côté UI et côté scoring, sans exposer les
// entrailles de Judge0.
function verdictOf(statusId) {
  if (statusId === STATUS.ACCEPTED) return "ok";
  if (statusId === STATUS.COMPILE_ERROR) return "compile_error";
  if (statusId === STATUS.TIME_LIMIT) return "timeout";
  if (statusId >= 7 && statusId <= 12) return "runtime_error";
  return "error";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fenêtre de polling. Judge0 propose bien un mode synchrone (?wait=true), mais
// il est déconseillé en production et s'effondre dès qu'on enchaîne plusieurs
// cas de test : on dépasserait le timeout de la fonction serverless avant
// d'avoir un résultat. On soumet donc le lot, puis on relit.
const POLL_INTERVAL_MS = 700;
const POLL_TIMEOUT_MS = 20000;

/**
 * Exécute un même code source sur plusieurs entrées, en un seul lot.
 *
 * @param {object} p
 * @param {string} p.source        code du candidat
 * @param {string} p.language      clé de JUDGE0_LANGUAGES
 * @param {Array}  p.tests         [{ stdin, expected_output }]
 * @returns {Promise<{success: boolean, error?: string, results?: Array}>}
 *   results[i] = { verdict, passed, stdout, stderr, compile_output, time }
 */
export async function executeBatch({ source, language, tests }) {
  if (!isJudge0Configured()) return { success: false, error: "not_configured" };
  if (!tests?.length) return { success: false, error: "no_tests" };

  const languageId = languageInfo(language).judge0_id;
  const submissions = tests.map((test) => ({
    language_id: languageId,
    source_code: b64(source),
    stdin: b64(test.stdin ?? ""),
    // On ne délègue PAS la comparaison à Judge0 (expected_output) : sa règle de
    // normalisation nous échappe et le verdict deviendrait inexpliquable au
    // candidat. On compare nous-mêmes, avec outputMatches().
    cpu_time_limit: 5,
    wall_time_limit: 10,
    memory_limit: 128000,
  }));

  let tokens;
  try {
    const res = await fetch(`${BASE}/submissions/batch?base64_encoded=true`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ submissions }),
    });
    if (!res.ok) {
      // 429 = quota RapidAPI épuisé. C'est le cas d'erreur le plus probable en
      // production, et le seul que le candidat doit pouvoir distinguer.
      const detail = await res.text().catch(() => "");
      console.error("judge0 batch submit failed:", res.status, detail.slice(0, 300));
      return { success: false, error: res.status === 429 ? "quota_exceeded" : "provider_error" };
    }
    tokens = (await res.json()).map((s) => s.token).filter(Boolean);
  } catch (err) {
    console.error("judge0 batch submit error:", err);
    return { success: false, error: "provider_unreachable" };
  }

  if (tokens.length !== tests.length) return { success: false, error: "provider_error" };

  const fields = "token,status,stdout,stderr,compile_output,time";
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    let batch;
    try {
      const res = await fetch(
        `${BASE}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=${fields}`,
        { headers: headers() },
      );
      if (!res.ok) {
        console.error("judge0 batch poll failed:", res.status);
        return { success: false, error: res.status === 429 ? "quota_exceeded" : "provider_error" };
      }
      batch = (await res.json()).submissions || [];
    } catch (err) {
      console.error("judge0 batch poll error:", err);
      return { success: false, error: "provider_unreachable" };
    }

    const pending = batch.some((s) => (s?.status?.id ?? 0) <= STATUS.PROCESSING);
    if (pending) continue;

    const results = batch.map((s, i) => {
      const statusId = s?.status?.id ?? 0;
      const stdout = unb64(s?.stdout);
      const verdict = verdictOf(statusId);
      return {
        verdict,
        passed: verdict === "ok" && outputMatches(stdout, tests[i].expected_output),
        stdout,
        stderr: unb64(s?.stderr),
        compile_output: unb64(s?.compile_output),
        time: s?.time ? Number(s.time) : null,
      };
    });
    return { success: true, results };
  }

  return { success: false, error: "timeout" };
}
