"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/utils/admin";
import { computeAiCost } from "@/lib/constants/aiPricing";

// Modèle utilisé par l'assistant candidat (run_ai_messages ne stocke que les
// tokens) — sert à recalculer le coût des échanges.
const ASSISTANT_MODEL = "claude-sonnet-4-6";

// Statistiques de coût API agrégées (admin uniquement). Lit les usages déjà
// tracké : experiences.generation_usage, run_scores.scoring_usage, tokens de
// run_ai_messages. La transcription (AssemblyAI, à la minute) n'est pas incluse.
export async function getCostStats(periodDays = null) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdmin(user)) return { success: false, error: "Accès réservé aux administrateurs." };

    const admin = createAdminClient();
    const cutoff = periodDays ? new Date(Date.now() - periodDays * 86400000).toISOString() : null;

    let expQ = admin.from("experiences").select("id, job_id, generation_usage, regeneration_usage, created_at, jobs(title)");
    if (cutoff) expQ = expQ.gte("created_at", cutoff);
    let runQ = admin.from("candidate_runs").select("id, experience_id, started_at");
    if (cutoff) runQ = runQ.gte("started_at", cutoff);

    const [{ data: exps }, { data: runs }, { data: scores }, { data: msgs }] = await Promise.all([
      expQ,
      runQ,
      admin.from("run_scores").select("run_id, scoring_usage"),
      admin.from("run_ai_messages").select("run_id, role, input_tokens, output_tokens"),
    ]);

    const experiences = exps || [];
    const runList = runs || [];
    const runIds = new Set(runList.map((r) => r.id));
    const expById = Object.fromEntries(experiences.map((e) => [e.id, e]));

    // Coût assistant par run (tokens -> $), sur les runs de la période.
    const assistantByRun = {};
    for (const m of msgs || []) {
      if (m.role !== "assistant" || !runIds.has(m.run_id)) continue;
      const c = computeAiCost(ASSISTANT_MODEL, { input_tokens: m.input_tokens || 0, output_tokens: m.output_tokens || 0 }).cost_usd;
      assistantByRun[m.run_id] = (assistantByRun[m.run_id] || 0) + c;
    }
    // Scoring par run.
    const scoringByRun = {};
    for (const s of scores || []) {
      if (!runIds.has(s.run_id)) continue;
      scoringByRun[s.run_id] = s.scoring_usage?.cost_usd || 0;
    }

    // Génération complète + retouches d'étapes : même poste de coût (concevoir
    // le parcours), deux gestes distincts. Le total les additionne, les
    // compteurs les gardent séparés — c'est le rapport entre les deux qui dit si
    // la régénération ciblée fait son travail.
    const genTotal = experiences.reduce(
      (sum, e) => sum + (e.generation_usage?.cost_usd || 0) + (e.regeneration_usage?.cost_usd || 0),
      0,
    );
    const regenCalls = experiences.reduce((n, e) => n + (e.regeneration_usage?.calls || 0), 0);
    const regenTotal = experiences.reduce((sum, e) => sum + (e.regeneration_usage?.cost_usd || 0), 0);
    const scoringTotal = Object.values(scoringByRun).reduce((a, b) => a + b, 0);
    const assistantTotal = Object.values(assistantByRun).reduce((a, b) => a + b, 0);
    const nRuns = runList.length;
    const nScored = Object.keys(scoringByRun).length;
    const nWithAssistant = Object.keys(assistantByRun).length;
    const genCount = experiences.filter((e) => e.generation_usage?.cost_usd != null).length;

    // Répartition par poste.
    const perJob = {};
    const jobTitle = {};
    for (const e of experiences) {
      const jid = e.job_id;
      jobTitle[jid] = e.jobs?.title || "Poste supprimé";
      (perJob[jid] ||= { generation: 0, scoring: 0, assistant: 0, runs: 0 });
      perJob[jid].generation += (e.generation_usage?.cost_usd || 0) + (e.regeneration_usage?.cost_usd || 0);
    }
    for (const r of runList) {
      const jid = expById[r.experience_id]?.job_id;
      if (!jid) continue;
      (perJob[jid] ||= { generation: 0, scoring: 0, assistant: 0, runs: 0 });
      perJob[jid].scoring += scoringByRun[r.id] || 0;
      perJob[jid].assistant += assistantByRun[r.id] || 0;
      perJob[jid].runs += 1;
    }
    const perJobArr = Object.entries(perJob).map(([jid, v]) => ({
      jobId: jid, title: jobTitle[jid] || "—",
      ...v, total: v.generation + v.scoring + v.assistant,
    })).sort((a, b) => b.total - a.total);

    const div = (a, b) => (b ? a / b : 0);

    return {
      success: true,
      period: periodDays,
      totals: { generation: genTotal, regeneration: regenTotal, scoring: scoringTotal, assistant: assistantTotal, all: genTotal + scoringTotal + assistantTotal },
      counts: {
        experiences: experiences.length, generated: genCount, runs: nRuns,
        scoredRuns: nScored, runsWithAssistant: nWithAssistant,
        stepRegenerations: regenCalls,
      },
      avg: {
        generationPerExperience: div(genTotal, genCount),
        scoringPerRun: div(scoringTotal, nRuns),
        assistantPerRun: div(assistantTotal, nRuns),
        // Coût marginal par candidat (hors génération, amortie) :
        marginalPerParcours: div(scoringTotal, nRuns) + div(assistantTotal, nRuns),
        // Coût complet par parcours, génération amortie sur tous les runs :
        fullPerParcours: div(scoringTotal + assistantTotal + genTotal, nRuns),
      },
      perJob: perJobArr,
    };
  } catch (err) {
    console.error("getCostStats error:", err);
    return { success: false, error: err.message };
  }
}
