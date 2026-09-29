// Compétences d'une offre, checkpoints des grilles, couverture — module PUR.
//
// Importé des deux côtés : par le serveur (génération, notation) et par le
// navigateur (éditeur de l'expérience, rapport candidat). Aucun accès base,
// aucun appel réseau : tout se calcule à partir de ce qu'on lui passe.
//
// ── La liste canonique ──────────────────────────────────────────────────────
// C'est la liste de compétences que le recruteur a corrigée et validée à la
// création de l'offre (`jobs.extracted_criteria.hard_skills / soft_skills`).
// Chaque étape de la simulation déclare les compétences qu'elle teste PAR
// IDENTIFIANT, jamais par nom : le nom est traduit dans la langue du recruteur
// au moment de générer, et deux traductions d'un même nom ne se comparent pas.
//
// ── Pourquoi un identifiant DÉRIVÉ du nom ───────────────────────────────────
// La table `job_skills` est vidée et réécrite à chaque sauvegarde de l'offre :
// ses id changent à chaque fois. Et un identifiant stocké dans le JSON de
// l'offre ne survivrait pas au formulaire ouvert dans un autre onglet, qui
// réécrit le JSON entier sans lui. Dérivé du nom, l'identifiant est le même
// partout, sans rien écrire : tant qu'une compétence garde son nom, elle garde
// son identifiant. La renommer, c'est en créer une autre — et la couverture le
// montre, ce qui est juste : la liste a changé après la génération.

export const MUST = "must_have";
export const NICE = "nice_to_have";

// Poids d'un critère dans le score final, selon le tier de sa compétence.
// Décidé le 29/09/2026 : pondération PAR CRITÈRE, must-have compté double.
// Par critère et non par checkpoint : sinon un critère découpé en cinq
// checkpoints pèserait plus qu'un critère découpé en trois, et le poids d'une
// compétence redeviendrait un accident de génération.
export const POIDS_TIER = { [MUST]: 2, [NICE]: 1 };

// Garde-fou de durée : au-delà, le recruteur est prévenu (jamais bloqué).
export const EXERCICES_CIBLE_MAX = 5;

// Bornes d'un critère à checkpoints.
export const CHECKPOINTS_MIN = 3;
export const CHECKPOINTS_MAX = 5;

function normaliserNom(s) {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Identifiant stable d'une compétence : préfixe de type + nom normalisé. */
export function competenceId(type, name) {
  const slug = normaliserNom(name);
  if (!slug) return null;
  return `${type === "soft_skills" ? "s" : "h"}:${slug}`;
}

/**
 * Tier d'une compétence. Seul un « nice_to_have » EXPLICITE est secondaire :
 * « ambiguous », une priorité absente ou inconnue valent must-have. Sur-tester
 * une compétence secondaire coûte moins cher que ne jamais tester une
 * compétence critique mal classée par défaut.
 */
export function tierDePriorite(priority) {
  return priority === NICE ? NICE : MUST;
}

/**
 * La liste canonique de l'offre.
 * @param {object} criteria `jobs.extracted_criteria`
 * @returns {Array<{id:string, name:string, type:string, tier:string}>}
 */
export function listerCompetences(criteria) {
  const out = [];
  const vus = new Set();
  for (const type of ["hard_skills", "soft_skills"]) {
    for (const s of criteria?.[type] || []) {
      const name = String(s?.name || "").trim();
      const id = competenceId(type, name);
      if (!id || vus.has(id)) continue;
      vus.add(id);
      out.push({ id, name, type, tier: tierDePriorite(s.priority) });
    }
  }
  return out;
}

/**
 * Résout des références de compétence en identifiants de la liste. Accepte
 * l'identifiant exact ou, en repli, le nom — un modèle qui recopie le libellé au
 * lieu de l'identifiant ne doit pas faire perdre la couverture. Ce qui ne
 * correspond à rien est écarté : on n'invente jamais une compétence hors liste.
 */
export function resoudreIds(valeurs, competences) {
  const liste = competences || [];
  const parId = new Map(liste.map((c) => [c.id, c.id]));
  const parNom = new Map(liste.map((c) => [normaliserNom(c.name), c.id]));
  const out = [];
  for (const v of Array.isArray(valeurs) ? valeurs : [valeurs]) {
    if (v == null || v === "") continue;
    const brut = String(v).trim();
    const id = parId.get(brut) || parNom.get(normaliserNom(brut.replace(/^[hs]:/, "")));
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Un critère au format checkpoints (nouveau) — par opposition aux niveaux BARS. */
export function estCritereCheckpoints(c) {
  return Array.isArray(c?.checkpoints) && c.checkpoints.length > 0;
}

/**
 * Remet un critère généré dans sa forme stockée : identifiants de checkpoint
 * posés par le CODE (cp1, cp2…) et non par le modèle, compétences résolues
 * contre la liste, nombre de checkpoints borné. Un critère à l'ancien format
 * (niveaux BARS) est rendu tel quel : il reste lisible et notable.
 *
 * @param {object} c critère tel que rendu par le modèle
 * @param {string[]} skillIdsEtape compétences de l'étape, héritées par défaut
 * @param {Array} competences liste canonique
 */
export function normaliserCritere(c, skillIdsEtape, competences) {
  if (!c || typeof c !== "object") return null;
  if (!estCritereCheckpoints(c)) return c;

  const propres = resoudreIds(c.skill_ids, competences);
  const skill_ids = propres.length ? propres : [...(skillIdsEtape || [])];

  const checkpoints = c.checkpoints
    .map((cp) => {
      const description = String((typeof cp === "string" ? cp : cp?.description) || "").trim();
      if (!description) return null;
      const [propre] = resoudreIds(typeof cp === "object" ? cp?.skill_id : null, competences);
      // Un skill_id identique à l'unique compétence du critère n'apprend rien :
      // on ne le garde que s'il distingue ce checkpoint de son parent.
      const distinct = propre && !(skill_ids.length === 1 && skill_ids[0] === propre);
      return { description, ...(distinct ? { skill_id: propre } : {}) };
    })
    .filter(Boolean)
    .slice(0, CHECKPOINTS_MAX)
    .map((cp, i) => ({ id: `cp${i + 1}`, ...cp }));

  if (!checkpoints.length) return null;
  return {
    name: String(c.name || "").trim(),
    skill_ids,
    checkpoints,
    ...(c.added_for_coverage ? { added_for_coverage: c.added_for_coverage } : {}),
  };
}

/** Compétences effectivement notées par un checkpoint (le sien, sinon celles de son critère). */
export function competencesDuCheckpoint(cp, critere) {
  return cp?.skill_id ? [cp.skill_id] : (critere?.skill_ids || []);
}

/**
 * Une étape corrigée SANS grille (QCM, tests exécutés, champs factuels du CRM)
 * teste ses compétences par elle-même. Les autres ne les testent qu'à travers
 * leurs checkpoints : une compétence déclarée sur une tâche écrite, mais qu'aucun
 * checkpoint ne note, n'est pas testée — la couverture ne doit pas le cacher.
 */
export function etapeNoteeSansGrille(step) {
  if (step?.kind === "classic_qcm") return true;
  if (step?.sandbox_kind === "code" && (step?.config?.code?.tests || []).length) return true;
  if (step?.sandbox_kind === "crm" && (step?.config?.crm?.fields || []).some((f) => f?.nature === "factual")) return true;
  return false;
}

/**
 * Couverture de la liste canonique par la simulation.
 *
 * @param {Array} steps étapes, dans l'ordre (forme de la base : `criteria`, `config`)
 * @param {Array} competences liste canonique (listerCompetences)
 * @returns {{
 *   must: Array, nice: Array, manquantes: Array,
 *   nbEtapes: number, depasseDuree: boolean
 * }} `must` et `nice` : chaque compétence avec ses `refs` (où elle est testée).
 */
export function calculerCouverture(steps, competences) {
  const refs = new Map((competences || []).map((c) => [c.id, []]));
  (steps || []).forEach((s, stepIndex) => {
    const ajouter = (id, ref) => refs.get(id)?.push({ stepIndex, stepTitle: s?.title || "", ...ref });
    const viaGrille = new Set();

    for (const c of s?.criteria || []) {
      if (!estCritereCheckpoints(c)) continue;
      const parCompetence = new Map();
      for (const cp of c.checkpoints) {
        for (const id of competencesDuCheckpoint(cp, c)) {
          if (!parCompetence.has(id)) parCompetence.set(id, []);
          parCompetence.get(id).push(cp.description);
        }
      }
      for (const [id, descriptions] of parCompetence) {
        ajouter(id, { criterion: c.name || "", checkpoints: descriptions, addedForCoverage: c.added_for_coverage === id });
        viaGrille.add(id);
      }
    }

    if (etapeNoteeSansGrille(s)) {
      for (const id of s?.config?.skills_tested || []) {
        if (!viaGrille.has(id)) ajouter(id, { criterion: null, checkpoints: [], automatic: true });
      }
    }
  });

  const avecRefs = (c) => ({ ...c, refs: refs.get(c.id) || [] });
  const must = (competences || []).filter((c) => c.tier === MUST).map(avecRefs);
  const nice = (competences || []).filter((c) => c.tier === NICE).map(avecRefs);
  const nbEtapes = (steps || []).length;
  return {
    must,
    nice,
    manquantes: must.filter((c) => !c.refs.length),
    nbEtapes,
    depasseDuree: nbEtapes > EXERCICES_CIBLE_MAX,
  };
}

/**
 * Tier d'un ensemble de compétences : must-have dès qu'une l'est.
 * `null` si aucune n'est reconnue — l'appelant décide du repli.
 */
export function tierDesIds(ids, competences) {
  const parId = new Map((competences || []).map((c) => [c.id, c.tier]));
  const tiers = (ids || []).map((id) => parId.get(id)).filter(Boolean);
  if (!tiers.length) return null;
  return tiers.includes(MUST) ? MUST : NICE;
}

/** Score d'un critère à checkpoints : somme des 0/1/2, en % du maximum possible. */
export function pourcentageCheckpoints(scores) {
  const n = (scores || []).length;
  if (!n) return 0;
  const total = scores.reduce((s, v) => s + (Number(v) || 0), 0);
  return Math.round((total / (2 * n)) * 100);
}

/**
 * Score final : moyenne des critères, pondérée par le tier de leur compétence.
 * Un critère sans tier connu compte comme un must-have (même règle que
 * tierDePriorite) : sur un parcours antérieur aux tiers, tous les critères
 * pèsent alors pareil, et le score reste la moyenne qu'il était.
 */
export function moyennePonderee(entrees) {
  let somme = 0;
  let poids = 0;
  for (const e of entrees || []) {
    if (e?.score == null) continue;
    const w = POIDS_TIER[e.tier] ?? POIDS_TIER[MUST];
    somme += e.score * w;
    poids += w;
  }
  return poids ? Math.round(somme / poids) : null;
}

/**
 * Bloc de prompt listant la liste canonique, identifiants compris.
 * Le modèle recopie les identifiants entre crochets dans `skills_tested`.
 */
export function blocCompetencesPrompt(competences) {
  const ligne = (c) => `- [${c.id}] ${c.name}`;
  const must = (competences || []).filter((c) => c.tier === MUST).map(ligne);
  const nice = (competences || []).filter((c) => c.tier === NICE).map(ligne);
  return `COMPÉTENCES VALIDÉES PAR LE RECRUTEUR — la liste canonique, identifiant entre crochets :

MUST-HAVE (indispensables — CHACUNE doit être testée par au moins un checkpoint) :
${must.length ? must.join("\n") : "- (aucune)"}

NICE-TO-HAVE (atouts — jamais d'exercice dédié ; testées seulement si elles s'intègrent naturellement à un exercice déjà prévu pour un must-have) :
${nice.length ? nice.join("\n") : "- (aucune)"}`;
}
