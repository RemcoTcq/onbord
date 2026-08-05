// Tarifs Claude en USD par million de tokens. Source : grille Anthropic.
// À mettre à jour si la tarification change. Les compteurs de tokens stockés
// (generation_usage, scoring_usage, run_ai_messages) sont la vérité de terrain ;
// le coût est dérivé de ces tarifs et donc ajustable a posteriori.
export const AI_PRICING = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
};

/**
 * Calcule le coût d'un appel à partir de l'usage renvoyé par l'API Anthropic.
 * @param {string} model
 * @param {{input_tokens?:number, output_tokens?:number}} usage
 * @returns {{ model:string, input_tokens:number, output_tokens:number, cost_usd:number|null }}
 */
export function computeAiCost(model, usage) {
  const inputTokens = usage?.input_tokens || 0;
  const outputTokens = usage?.output_tokens || 0;
  const rate = AI_PRICING[model];
  const cost_usd = rate
    ? Number(((inputTokens / 1e6) * rate.input + (outputTokens / 1e6) * rate.output).toFixed(6))
    : null;
  return { model, input_tokens: inputTokens, output_tokens: outputTokens, cost_usd };
}
