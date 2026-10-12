// Coût des appels IA « d'écran » d'une simulation — le chat de l'étape, la
// traduction des notes du recruteur, les descriptions des critères. Jamais
// facturés en crédits, mais suivis : la page Coûts de l'admin les additionne au
// coût de conception de l'offre.
//
// Rangés à part (`experiences.generated_from.ecran_usage`) et NON dans
// `regeneration_usage`, dont le compteur d'appels sert à compter les
// réécritures d'étape : un message de chat n'en est pas une.
//
// Lecture-écriture du JSON : deux appels simultanés peuvent perdre un
// incrément. C'est un compteur de suivi, pas une facture — on l'accepte.
export async function ajouterUsageEcran(supabase, experienceId, usage) {
  if (!usage || !experienceId) return;
  try {
    const { data } = await supabase.from("experiences").select("generated_from").eq("id", experienceId).single();
    const gf = data?.generated_from || {};
    const p = gf.ecran_usage || {};
    await supabase.from("experiences").update({
      generated_from: {
        ...gf,
        ecran_usage: {
          calls: (p.calls || 0) + (usage.calls || 1),
          input_tokens: (p.input_tokens || 0) + (usage.input_tokens || 0),
          output_tokens: (p.output_tokens || 0) + (usage.output_tokens || 0),
          cost_usd: Number(((p.cost_usd || 0) + (usage.cost_usd || 0)).toFixed(6)),
        },
      },
    }).eq("id", experienceId);
  } catch (err) {
    console.error("ajouterUsageEcran (non bloquant) :", err.message);
  }
}
