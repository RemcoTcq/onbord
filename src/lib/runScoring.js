import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { evaluateCrm, crmBarsLevel, crmAnswerForScoring, crmTrapBriefing } from "@/lib/crmScoring";

const SCORING_MODEL = "claude-sonnet-4-6";

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
  return resp.text_answer || "(pas de réponse)";
}

// Scoring UNIQUE de fin de run : un seul appel qui relit toute la trajectoire.
export async function scoreRun(runId) {
  const admin = createAdminClient();

  const { data: run } = await admin
    .from("candidate_runs").select("id, candidate_id, experience_id, status").eq("id", runId).single();
  if (!run) return { success: false, error: "Run introuvable" };
  if (run.status === "scored") return { success: true, alreadyScored: true };

  const [{ data: steps }, { data: responses }, { data: aiMessages }] = await Promise.all([
    admin.from("experience_steps").select("*").eq("experience_id", run.experience_id).order("order_index"),
    admin.from("run_step_responses").select("*").eq("run_id", runId),
    admin.from("run_ai_messages").select("step_id, role, content").eq("run_id", runId).order("created_at"),
  ]);

  const respByStep = Object.fromEntries((responses || []).map((r) => [r.step_id, r]));
  const aiByStep = {};
  for (const m of aiMessages || []) { (aiByStep[m.step_id] ||= []).push(m); }
  const aiUsed = (aiMessages || []).some((m) => m.role === "user");

  // Steps notables = ceux qui ont des critères BARS (exclut QCM qui sont scorés directement)
  const scored = (steps || []).filter((s) => (s.criteria || []).length > 0 && s.kind !== "classic_qcm");

  // ── QCM : scoring direct (bonne/mauvaise réponse) ──
  const qcmSteps = (steps || []).filter((s) => s.kind === "classic_qcm");
  const qcmScores = qcmSteps.map((s) => {
    const resp = respByStep[s.id];
    const selectedIdx = resp?.meta?.selected_index;
    const correctIdx = s.config?.correct_index;
    const isCorrect = selectedIdx != null && correctIdx != null && selectedIdx === correctIdx;
    return {
      step_id: s.id,
      criterion_name: "QCM — Bonne réponse",
      bars_level: isCorrect ? 5 : 1,
      score: isCorrect ? 100 : 0,
      justification: isCorrect
        ? `Bonne réponse sélectionnée (option ${selectedIdx + 1})`
        : selectedIdx != null
          ? `Mauvaise réponse (option ${selectedIdx + 1}, attendue : ${correctIdx + 1})`
          : "Pas de réponse",
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
      criterion_name: "Extraction d'information (champs factuels)",
      bars_level: crmBarsLevel(ev.score),
      score: ev.score,
      justification: missed.length === 0
        ? `Les ${ev.factualCount} champs vérifiables sont exacts.`
        : `${ev.correctCount}/${ev.factualCount} champs vérifiables exacts. Erreurs : ${missed.map((d) => `${d.label} (saisi « ${d.given ?? "vide"} », attendu « ${d.expected} »)`).join(" ; ")}.`
          + (trapMissed.length ? ` Dont l'information contradictoire du brief : ${trapMissed.map((d) => d.label).join(", ")}.` : ""),
      verbatim: "",
      verbatim_verified: false,
      // Détail champ par champ pour le rapport recruteur.
      crm_details: ev.details,
    });
  }

  // ── Construit la trajectoire pour le prompt (uniquement les steps non-QCM) ──
  const traj = scored.map((s, i) => {
    const resp = respByStep[s.id];
    const answer = candidateAnswerText(s, resp);
    const crits = (s.criteria || []).map((c) => {
      const grid = (c.bars_levels || []).map((b) => `      N${b.level} (${b.label}) : ${b.description}`).join("\n");
      return `    • ${c.name}\n${grid}`;
    }).join("\n");
    const ai = (aiByStep[s.id] || []).map((m) => `      ${m.role === "user" ? "Candidat" : "Assistant"}: ${m.content}`).join("\n");
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
${trap ? `${trap}\n` : ""}${revision}  Réponse du candidat :
  """${answer}"""
  Critères à noter :
${crits}${ai ? `\n  Échanges avec l'assistant IA :\n${ai}` : ""}`;
  }).join("\n\n");

  const system = `Tu es un évaluateur de recrutement rigoureux. Tu notes un candidat sur une trajectoire d'évaluation, critère par critère, selon des grilles BARS DÉFINIES À L'AVANCE. Tu ne notes QUE sur ces critères, jamais sur des critères inventés.

RÈGLES ABSOLUES :
- Pour chaque critère, positionne le candidat sur un niveau BARS de 1 à 5 en comparant son comportement OBSERVÉ aux ancres.
- Justifie chaque note et cite un VERBATIM : un extrait EXACT, copié mot pour mot depuis la réponse du candidat (sous-chaîne réelle). Si rien de pertinent, verbatim = "" et note basse.
- La note d'usage de l'IA n'est calculée QUE si le candidat a échangé avec l'assistant : évalue COMMENT il l'a utilisé (cadrage du problème, itération, regard critique sur la sortie), pas s'il l'a utilisé. Absente sinon.
- Aucun emoji. Réponds UNIQUEMENT avec un JSON valide.`;

  const user = `TRAJECTOIRE DU CANDIDAT :

${traj}

L'assistant IA a-t-il été utilisé sur ce run : ${aiUsed ? "OUI" : "NON"}.

Réponds avec ce JSON exact :
{
  "criterion_scores": [
    { "step_id": "id exact", "criterion_name": "nom exact", "bars_level": 1-5, "justification": "…", "verbatim": "extrait exact de la réponse" }
  ],
  "ai_usage": { "used": ${aiUsed}, "score": 0-100, "justification": "…" },
  "summary": "Synthèse de 2-3 phrases, factuelle."
}
Le champ score de chaque critère sera calculé automatiquement à partir du bars_level ; ne le fournis pas. Si used=false, mets ai_usage.score à null.`;

  let critScores = [];
  let parsed = { ai_usage: { used: aiUsed, score: null }, summary: "" };
  let usage = {};

  // Appeler Claude seulement s'il y a des steps BARS à évaluer
  if (scored.length > 0) {
    const response = await anthropic.messages.create({
      model: SCORING_MODEL, max_tokens: Math.min(4000, 600 + scored.length * 500), temperature: 0.1,
      system, messages: [{ role: "user", content: user }],
    });
    usage = computeAiCost(SCORING_MODEL, response.usage);
    const match = response.content[0].text.match(/\{[\s\S]*\}/);
    if (!match) {
      await admin.from("candidate_runs").update({ status: "scored", scored_at: new Date().toISOString() }).eq("id", runId);
      return { success: false, error: "Scoring : JSON invalide" };
    }
    parsed = JSON.parse(match[0]);

    // Post-traitement : score dérivé du niveau BARS + vérification verbatim
    critScores = (parsed.criterion_scores || []).map((c) => {
      const level = Math.max(1, Math.min(5, Number(c.bars_level) || 1));
      const score = (level - 1) * 25;
      const step = scored.find((s) => s.id === c.step_id);
      const src = step ? candidateAnswerText(step, respByStep[step.id]) : "";
      return {
        step_id: c.step_id,
        criterion_name: c.criterion_name,
        bars_level: level,
        score,
        justification: c.justification || "",
        verbatim: c.verbatim || "",
        verbatim_verified: verifyVerbatim(c.verbatim, src),
      };
    });
  }

  // Fusionne les scores BARS (Claude) et les scores déterministes (QCM + CRM)
  const allScores = [...critScores, ...qcmScores, ...crmScores];

  const overall = allScores.length
    ? Math.round(allScores.reduce((s, c) => s + c.score, 0) / allScores.length)
    : null;
  const rawAi = parsed.ai_usage?.used ? parsed.ai_usage?.score : null;
  const aiUsageScore = rawAi == null ? null : Math.round(Math.max(0, Math.min(100, Number(rawAi))));

  await admin.from("run_scores").upsert({
    run_id: runId,
    overall,
    ai_usage_used: !!parsed.ai_usage?.used,
    ai_usage_score: aiUsageScore,
    summary: parsed.summary || "",
    criterion_scores: allScores,
    scoring_usage: usage,
  }, { onConflict: "run_id" });

  await admin.from("candidate_runs").update({ status: "scored", scored_at: new Date().toISOString() }).eq("id", runId);
  // Dénormalise pour l'affichage liste candidats
  if (overall != null) await admin.from("candidates").update({ score_global: overall }).eq("id", run.candidate_id);

  return { success: true, overall };
}
