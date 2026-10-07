// ─────────────────────────────────────────────────────────────────────────────
// Les TARIFS et le BARÈME DE CRÉDITS.
//
// Ces chiffres ne sont pas décoratifs : ils sont recopiés de
// `src/lib/constants/plans.js` de l'APPLICATION (à la racine du dépôt), qui est
// la source de vérité — c'est ce fichier-là qui débite réellement les comptes.
// Un écart entre les deux, et le site vend un tarif que la facturation ignore.
//
// À RESYNCHRONISER à la main à chaque changement de barème. Les deux projets ne
// partagent pas de code exprès (voir AGENTS.md à la racine) ; le prix de cette
// indépendance est cette recopie-ci, et c'est le seul endroit où elle existe.
//
// Ils ne sont pas non plus dans les dictionnaires : un prix n'est pas une
// traduction. 199 € est 199 € en néerlandais.
// ─────────────────────────────────────────────────────────────────────────────

/** Plans vendus. `annual` est le prix MENSUEL sous engagement annuel.
 *
 *  ⚠️ PAS DE CREDITS A L'UNITE. Il y avait un prix de credit supplementaire
 *  par plan (`extraCredit`, 3 € et 2,50 €) : l'achat de credits en plus a
 *  ete retire de l'offre. A la place, sur un plan annuel, les credits non
 *  utilises se REPORTENT d'un mois sur l'autre et le solde repart a zero au
 *  renouvellement de l'annee (texte : `rollover` et la FAQ de la page).
 *  Applique par l'application depuis le 26/09/2026 : `CYCLES` dans
 *  src/lib/constants/plans.js, `calculerRecharge` dans src/lib/utils/limits.js.
 *
 *  BAREME DU 7 OCTOBRE 2026 : Core 120 € au mois ou 100 € a l'annee, Pro
 *  360 € ou 300 € — soit deux mois offerts sur douze (le badge `save` de la
 *  page le dit, il est a changer avec ces chiffres). 150 et 500 credits :
 *  les memes credits qu'avant, le meme usage pour le client. La hausse du
 *  mensuel finance la marge une fois la voix des appels payee a l'usage.
 *  Reporte le meme jour dans l'application (src/lib/constants/plans.js). */
export const PLANS = [
  {
    id: "core",
    monthly: 120,
    annual: 100,      // 10 mois payés sur 12
    credits: 150,
    featured: false,
  },
  {
    id: "pro",
    monthly: 360,
    annual: 300,      // 10 mois payés sur 12
    credits: 500,
    featured: true,
  },
  {
    id: "custom",
    monthly: null,
    annual: null,
    credits: null,
    featured: false,
  },
];

/**
 * Ce qui consomme un crédit, et combien. Quatre points de débit, pas un de plus.
 * Recopié de CREDIT_COSTS (application).
 */
export const CREDIT_COSTS = {
  // La cle garde le nom de l'application (`job`), dont ce fichier est une
  // recopie. Ce qu'elle facture, c'est la CREATION D'UNE SIMULATION : c'est le
  // vocabulaire de la page des tarifs, et c'est ce qui declenche le debit.
  job: 6,             // generer une simulation : a chaque generation complete reussie
  stepRegeneration: 1, // l'agent reecrit une etape
  candidateStart: 1,  // le candidat entre réellement dans la simulation
  candidateScoring: 2, // la notation, à la soumission
};

/** Coût complet d'un candidat mené jusqu'à sa note. */
export const COST_PER_CANDIDATE =
  CREDIT_COSTS.candidateStart + CREDIT_COSTS.candidateScoring;

/**
 * Combien de candidats un plan permet d'évaluer, une fois `simulations` créées.
 * Affiché tel quel sur la page des tarifs : mieux vaut une règle que le
 * visiteur peut refaire de tête qu'un « jusqu'à 75 candidats » dont personne ne
 * sait d'où il sort.
 */
export function candidatesFor(credits, simulations = 1) {
  if (!credits) return null;
  const reste = credits - simulations * CREDIT_COSTS.job;
  return Math.max(0, Math.floor(reste / COST_PER_CANDIDATE));
}

/** Formate un prix en euros dans la convention de la locale.
 *  « €199 » en anglais, « 199 € » en français, « € 199 » en néerlandais. */
export function formatPrice(amount, locale) {
  if (amount == null) return null;
  const tag = { en: "en-GB", fr: "fr-BE", nl: "nl-BE" }[locale] || "en-GB";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
