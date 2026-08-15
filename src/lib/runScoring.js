import { createAdminClient } from "@/lib/supabase/server";
import anthropic from "@/lib/anthropic";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { evaluateCrm, crmBarsLevel, crmAnswerForScoring, crmTrapBriefing, CRM_SKILL_NAME } from "@/lib/crmScoring";

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
      sub_dimension_name: "QCM — Bonne réponse",
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
      // Même compétence que la sous-dimension "Croisement des sources" posée à la
      // génération : les deux signaux de la fiche s'affichent groupés.
      skill_name: CRM_SKILL_NAME,
      sub_dimension_name: "Champs factuels",
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
    const subDims = (s.criteria || []).map((c) => {
      const grid = (c.bars_levels || []).map((b) => `      N${b.level} (${b.label}) : ${b.description}`).join("\n");
      return `    • ${c.name}\n${grid}`;
    }).join("\n");
    const skill = skillOf(s);
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
  Compétence évaluée : ${skill || "(non précisée)"}
  Sous-dimensions à noter :
${subDims}${ai ? `\n  Échanges avec l'assistant IA :\n${ai}` : ""}`;
  }).join("\n\n");

  const system = `Tu es un évaluateur de recrutement rigoureux. Tu notes un candidat sur une trajectoire d'évaluation, sous-dimension par sous-dimension, selon des grilles BARS DÉFINIES À L'AVANCE. Tu ne notes QUE sur ces sous-dimensions, jamais sur des critères inventés.

RÈGLES ABSOLUES :
- Pour chaque sous-dimension, positionne le candidat sur un niveau BARS de 1 à 5 en comparant son comportement OBSERVÉ aux ancres.
- Justifie chaque note et cite un VERBATIM : un extrait EXACT, copié mot pour mot depuis la réponse du candidat (sous-chaîne réelle). Si rien de pertinent, verbatim = "" et note basse.
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
      const level = Math.max(1, Math.min(5, Number(c.bars_level) || 1));
      const score = (level - 1) * 25;
      const step = scored.find((s) => s.id === c.step_id);
      const src = step ? candidateAnswerText(step, respByStep[step.id]) : "";
      return {
        step_id: c.step_id,
        // La compétence vient du step, pas du modèle : elle sert de clé de
        // regroupement à l'affichage et ne doit pas dériver d'une reformulation.
        skill_name: step ? skillOf(step) : (c.skill_name || ""),
        sub_dimension_name: c.sub_dimension_name || "",
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
