/**
 * Test script for Phase 1: Verify the improved taxonomy mapping.
 * Tests the B1 deterministic matching with real examples from the user.
 * 
 * Run with: node --experimental-vm-modules testMapping.mjs
 * (or simply: node testMapping.mjs if using Node 20+)
 */

// We can't directly import the server action (it uses "use server" + dynamic imports),
// so we replicate the normalisation + B1 logic here for unit-testing.

const STOP_WORDS = new Set([
  'de', 'du', 'des', 'd', 'l', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'à', 'a', 'au', 'aux'
]);

function normalizeForComparison(str) {
  if (!str) return { normalized: '', tokens: [] };
  const stripped = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const tokens = stripped
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOP_WORDS.has(t))
    .map(t => {
      if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us') && !t.endsWith('is')) {
        return t.slice(0, -1);
      }
      return t;
    });

  return {
    normalized: tokens.join(' '),
    tokens: [...tokens].sort(),
  };
}

function tokenOverlap(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  const common = tokensA.filter(t => setB.has(t)).length;

  // Subset check: if all tokens of the shorter set are in the longer, it's a strong match
  const shorter = tokensA.length <= tokensB.length ? tokensA : tokensB;
  const longerSet = tokensA.length <= tokensB.length ? setB : setA;
  const isSubset = shorter.every(t => longerSet.has(t));
  if (isSubset && shorter.length > 0) return 1.0;

  return common / Math.max(tokensA.length, tokensB.length);
}

// Subset of taxonomy entries relevant to our test cases
const TAXONOMY_SUBSET = [
  { ID: "C019", Compétence: "Démonstration produit", "Compétences proches": "Demo, présentation produit" },
  { ID: "C032", Compétence: "Gestion du pipeline", "Compétences proches": "Pipeline management" },
  { ID: "C093", Compétence: "Maîtrise d'un CRM (Salesforce, HubSpot)", "Compétences proches": "CRM, Salesforce, HubSpot" },
  { ID: "C049", Compétence: "Persévérance / ténacité", "Compétences proches": "Grit, persistance" },
  { ID: "C084", Compétence: "Esprit d'équipe / collaboration", "Compétences proches": "Collaboration" },
  { ID: "C057", Compétence: "Écoute active", "Compétences proches": "Active listening" },
  { ID: "C025", Compétence: "Négociation commerciale", "Compétences proches": "Négociation, deal" },
  { ID: "C050", Compétence: "Orientation résultats", "Compétences proches": "Results-driven" },
  { ID: "C069", Compétence: "Adaptabilité", "Compétences proches": "Flexibilité" },
  { ID: "C010", Compétence: "Découverte des besoins", "Compétences proches": "Discovery, questionnement" },
];

const TAXONOMY_NORMALIZED = TAXONOMY_SUBSET.map(c => ({
  entry: c,
  comp: normalizeForComparison(c.Compétence),
  synonyms: (c['Compétences proches'] || '')
    .split(',')
    .map(s => normalizeForComparison(s.trim()))
    .filter(s => s.normalized.length > 0),
}));

function findMatch(skillName) {
  const skillNorm = normalizeForComparison(skillName);

  // Pass 1: Exact normalized
  let match = TAXONOMY_NORMALIZED.find(t => t.comp.normalized === skillNorm.normalized);

  // Pass 2: Token overlap ≥ 70%
  if (!match) {
    let bestScore = 0;
    let bestMatch = null;
    for (const t of TAXONOMY_NORMALIZED) {
      const score = tokenOverlap(skillNorm.tokens, t.comp.tokens);
      if (score >= 0.7 && score > bestScore) {
        bestScore = score;
        bestMatch = t;
      }
    }
    match = bestMatch;
  }

  // Pass 3: Synonym match
  if (!match) {
    match = TAXONOMY_NORMALIZED.find(t =>
      t.synonyms.some(syn => {
        if (syn.normalized === skillNorm.normalized) return true;
        if (syn.tokens.length > 0 && skillNorm.tokens.length > 0) {
          if (tokenOverlap(skillNorm.tokens, syn.tokens) >= 0.7) return true;
        }
        // Single-token synonym contained in skill tokens (e.g. "CRM" in "Gestion CRM")
        if (syn.tokens.length === 1 && skillNorm.tokens.includes(syn.tokens[0])) return true;
        // Single-token skill contained in synonym tokens
        if (skillNorm.tokens.length === 1 && syn.tokens.includes(skillNorm.tokens[0])) return true;
        return false;
      })
    );
  }

  return match ? match.entry : null;
}

// ─── Test cases ──────────────────────────────────────────────────────────────
const TEST_CASES = [
  { input: "Démonstrations produits",        expected: "C019", note: "Pluriel → singulier" },
  { input: "Gestion de pipeline commercial", expected: "C032", note: "Article + mot extra" },
  { input: "Gestion CRM",                   expected: "C093", note: "Sous-ensemble (CRM dans synonymes)" },
  { input: "Persévérance",                   expected: "C049", note: "Mot contenu dans libellé avec /" },
  { input: "Esprit d'équipe",               expected: "C084", note: "Apostrophe + libellé long" },
  { input: "Écoute active",                 expected: "C057", note: "Accents (doit être exact)" },
  { input: "Négociation commerciale",        expected: "C025", note: "Exact match après normalisation" },
  { input: "Orientation résultats",          expected: "C050", note: "Accent" },
  { input: "Adaptabilité",                  expected: "C069", note: "Accents" },
  { input: "Découverte des besoins",         expected: "C010", note: "Article 'des'" },
];

console.log("\n════════════════════════════════════════════════════");
console.log("  Phase 1 — Test B1 Mapping Déterministe");
console.log("════════════════════════════════════════════════════\n");

let passed = 0;
let failed = 0;

for (const tc of TEST_CASES) {
  const result = findMatch(tc.input);
  const ok = result?.ID === tc.expected;
  const icon = ok ? "✅" : "❌";
  
  if (ok) passed++;
  else failed++;
  
  console.log(`${icon} "${tc.input}"`);
  console.log(`   → ${result ? `${result.ID} (${result.Compétence})` : "NO MATCH"}`);
  console.log(`   Attendu: ${tc.expected} | ${tc.note}`);
  if (!ok) {
    const norm = normalizeForComparison(tc.input);
    console.log(`   [DEBUG] Normalized: "${norm.normalized}" | Tokens: [${norm.tokens.join(', ')}]`);
  }
  console.log();
}

console.log("────────────────────────────────────────────────────");
console.log(`  Résultat: ${passed}/${TEST_CASES.length} passed, ${failed} failed`);
console.log("────────────────────────────────────────────────────\n");

process.exit(failed > 0 ? 1 : 0);
