// Les règles PURES d'une simulation d'onboarding (16/11/2026) : ses canaux, son
// brief de conception, sa grille. Sans import : testées par
// tests/onboarding.test.mjs, lues par le générateur (lib/simulationOnboarding.js),
// l'agent de conception et les actions des modules.

// Une simulation d'onboarding = UNE conversation, sur UN canal.
//   chat   un échange écrit dans une messagerie
//   email  un e-mail à écrire
//   call   un appel vidéo : la personne est filmée, le personnage répond à la voix
//   phone  un appel téléphonique, voix seule
export const CANAUX = ["chat", "email", "call", "phone"];
export const CANAL_PAR_DEFAUT = "call";

/** Le canal, ramené à l'un des quatre. */
export const coerceCanal = (c) => (CANAUX.includes(c) ? c : CANAL_PAR_DEFAUT);

/** L'étape que joue un canal : sa mise en situation et le mode du personnage. */
export function formeDuCanal(canal) {
  switch (canal) {
    case "email": return { sandbox_kind: "email", mode: null };
    case "chat": return { sandbox_kind: "persona", mode: "chat" };
    case "phone": return { sandbox_kind: "persona", mode: "phone" };
    default: return { sandbox_kind: "persona", mode: "call" };
  }
}

const liste = (v) => (Array.isArray(v) ? v : String(v || "").split("\n")).map((x) => String(x || "").trim()).filter(Boolean);

/**
 * Le brief de conception, nettoyé : ce que le manager a dit à l'agent. Il est
 * gardé dans `modules.brief` et relu à chaque (re)génération.
 */
export function normaliserBrief(b = {}) {
  return {
    scenario: String(b?.scenario || "").trim().slice(0, 3000),
    objectif: String(b?.objectif || "").trim().slice(0, 1000),
    objections: liste(b?.objections).slice(0, 8),
    a_savoir: liste(b?.a_savoir).slice(0, 10),
    reussite: liste(b?.reussite).slice(0, 8),
    notes: String(b?.notes || "").trim().slice(0, 2000),
  };
}

/** Les compétences de la grille proposées par l'agent, dans la forme de `jobs.extracted_criteria`. */
export function criteresDepuisCompetences(competences) {
  const propres = (Array.isArray(competences) ? competences : [])
    .map((c) => (typeof c === "string" ? { name: c } : c))
    .filter((c) => String(c?.name || "").trim())
    .slice(0, 6)
    .map((c) => ({
      name: String(c.name).trim().slice(0, 120),
      priority: c.priority === "nice_to_have" ? "nice_to_have" : "must_have",
      evidence: String(c.evidence || "").trim().slice(0, 300),
    }));
  return { hard_skills: propres, soft_skills: [] };
}
