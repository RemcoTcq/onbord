// Feedback candidat automatique — la rédaction.
//
// ── Le principe ─────────────────────────────────────────────────────────────
// Rien n'est réanalysé. Le scoring (runScoring.js) a déjà noté chaque
// checkpoint 0 / 1 / 2 et cité, pour chaque point accordé, un extrait EXACT de
// la réponse, contrôlé par verifyVerbatim(). Ce module CHOISIT dans cette
// matière, en code, de quoi parler — puis demande au modèle de l'écrire, sans
// rien lui donner d'autre à relire que les points retenus.
//
// Le choix n'est pas laissé au modèle : c'est lui qui garantit qu'un retour de
// refus nomme les vraies raisons (les must-have manqués) et qu'un retour
// positif contient toujours un axe d'amélioration réel.
//
// ── Rédigé à la décision, jamais avant ──────────────────────────────────────
// Décision de Remco (01/10/2026) : ne rien payer pour un candidat sur lequel
// l'entreprise ne tranche jamais. La rédaction part au clic sur Valider,
// Étape suivante ou Rejeter, et ne produit QUE la version de cette décision :
// `negative` (rejeté) ou `positive` (validé, étape suivante). Un recruteur qui
// change d'avis déclenche l'autre version ; revenir en arrière ne coûte rien,
// la première reste en base. Rien ne part tant que le recruteur n'a pas cliqué
// sur « Envoyer ».
//
// ── Un checkpoint manqué n'a pas d'extrait ──────────────────────────────────
// Par construction du scoring : « aucun extrait possible = aucun point ». Un
// must-have à 0 est donc cité par ce qu'il attendait, précisément, et par le
// constat du correcteur — jamais par une citation inventée. Un must-have à 1,
// lui, porte un extrait réel : c'est la matière la plus concrète d'un refus,
// d'où sa place juste après les manques francs.
//
// ── Le contrôle après coup ──────────────────────────────────────────────────
// Le texte rendu est relu en code : tout passage entre guillemets doit se
// retrouver dans un extrait fourni (ou un titre d'exercice), le tiret cadratin
// est interdit, les formules typiques d'un texte généré aussi. Un défaut
// relance UNE fois la rédaction en le nommant ; s'il persiste, le brouillon est
// gardé avec un avertissement, que le recruteur voit avant d'envoyer.

import anthropic from "./anthropic";
import { createAdminClient } from "@/lib/supabase/server";
import { coerceExperienceLocale, LOCALE_NAMES_FR } from "@/lib/i18n/config";
import { computeAiCost } from "@/lib/constants/aiPricing";
import { MUST, NICE } from "@/lib/competences";

// Sonnet : le choix de quoi dire est fait en code, plus haut ; le modèle ne
// fait que l'écrire. Si le contrôle après coup (citations, formules
// interdites) se met à échouer plus souvent, c'est ici qu'on revient à Opus.
const FEEDBACK_MODEL = "claude-sonnet-5-5";

// La décision du recruteur → la version du brouillon. Tout autre statut
// (invité, soumis, évalué…) n'est pas une décision : pas de feedback.
const VERSION_PAR_STATUT = {
  shortlisted: "positive",
  next_step: "positive",
  rejected: "negative",
};

export function versionPourStatut(status) {
  return VERSION_PAR_STATUT[status] || null;
}

// Longueur visée : ~150 mots. En dehors de cette fourchette, on relance.
const MOTS_MIN = 100;
const MOTS_MAX = 210;

const OBJET = {
  fr: (poste) => `Votre candidature pour le poste de ${poste}`,
  en: (poste) => `Your application for the ${poste} role`,
  nl: (poste) => `Je sollicitatie voor de functie ${poste}`,
};

const REGISTRE = {
  fr: "Vouvoie le candidat. Salutation : « Bonjour <prénom>, ».",
  en: "Address the candidate as \"you\". Greeting: \"Hi <first name>,\".",
  nl: "Spreek de kandidaat aan met « je », niet met « u ». Begroeting: « Hallo <voornaam>, ».",
};

// Formules qui trahissent un texte généré. Contrôlées en minuscules.
const FORMULES_INTERDITES = {
  fr: ["n'hésitez pas", "n’hésitez pas", "il est important de noter", "en conclusion", "d'une part", "d’une part", "nous tenons à vous remercier", "votre intérêt pour", "nous vous remercions pour l'intérêt", "en somme", "force est de constater"],
  en: ["don't hesitate", "do not hesitate", "it is important to note", "it's important to note", "in conclusion", "on the one hand", "we would like to thank you for your interest", "thank you for your interest in", "feel free to", "we appreciate your interest"],
  nl: ["aarzel niet", "het is belangrijk op te merken", "concluderend", "enerzijds", "wij danken u voor uw interesse", "bedankt voor je interesse in"],
};

// ─── 1. La matière ─────────────────────────────────────────────────────────

const rangTier = (tier) => (tier === MUST ? 0 : tier === NICE ? 2 : 1);

/**
 * Les checkpoints réellement notés, à plat. Les grilles à niveaux (parcours
 * publiés avant les checkpoints) n'en ont pas : elles ne produisent aucune
 * matière, et le feedback le dit plutôt que de broder.
 */
function extraireCheckpoints(criterionScores, titresEtapes) {
  const out = [];
  for (const c of criterionScores || []) {
    if (c.format !== "checkpoints") continue;
    for (const cp of c.checkpoints || []) {
      if (cp.not_scored) continue;
      const extrait = cp.score > 0 && cp.verbatim_verified ? String(cp.verbatim || "").trim() : "";
      out.push({
        competence: c.skill_name || c.sub_dimension_name || "",
        critere: c.sub_dimension_name || "",
        exercice: titresEtapes[c.step_id] || "",
        tier: c.tier || null,
        attendu: cp.description || "",
        constat: cp.justification || "",
        score: cp.score,
        extrait,
      });
    }
  }
  return out;
}

const parTier = (a, b) => rangTier(a.tier) - rangTier(b.tier);

/**
 * Choisit, pour chaque version, les points dont le mail parlera.
 * Un point ne sort que s'il est étayé : un extrait vérifié pour une force ou un
 * manque partiel, la description exacte du checkpoint pour un manque franc.
 */
export function selectionnerMatiere(criterionScores, titresEtapes = {}) {
  const tous = extraireCheckpoints(criterionScores, titresEtapes);
  const forces = tous.filter((p) => p.score === 2 && p.extrait).sort(parTier);
  const partiels = tous.filter((p) => p.score === 1 && p.extrait).sort(parTier);
  const manques = tous.filter((p) => p.score === 0).sort(parTier);

  // ── Refus : les must-have manqués d'abord — ce sont les vraies raisons —,
  // puis les must-have à moitié atteints. Un nice-to-have ne sert de raison
  // que si aucun must-have n'a été manqué.
  const mustManques = manques.filter((p) => rangTier(p.tier) < 2);
  const mustPartiels = partiels.filter((p) => rangTier(p.tier) < 2);
  let raisons = [...mustManques, ...mustPartiels].slice(0, 2);
  if (!raisons.length) raisons = [...manques, ...partiels].slice(0, 2);
  const forceRefus = forces.slice(0, 1);

  // ── Validé / étape suivante : les forces, must-have en tête, et TOUJOURS un
  // axe réel. Un partiel avec extrait d'abord (il montre ce qui a été fait et
  // ce qui manquait), sinon un manque franc.
  const forcesPositif = forces.slice(0, 2);
  const axe = [...partiels, ...manques].sort((a, b) => parTier(a, b) || b.score - a.score).slice(0, 1);

  const avertissements = { negative: [], positive: [] };
  if (!forceRefus.length) avertissements.negative.push("noStrength");
  if (!raisons.length) avertissements.negative.push("noReason");
  if (!axe.length) avertissements.positive.push("noImprovement");
  if (!forcesPositif.length) avertissements.positive.push("noStrength");

  const etiqueter = (liste, role) => liste.map((p) => ({ ...p, role }));
  const negative = [...etiqueter(raisons, "raison"), ...etiqueter(forceRefus, "force")];
  const positive = [...etiqueter(forcesPositif, "force"), ...etiqueter(axe, "axe")];

  return {
    negative: negative.length ? negative : null,
    positive: positive.length ? positive : null,
    avertissements,
  };
}

// ─── 2. La rédaction ───────────────────────────────────────────────────────

function decrirePoints(points) {
  return points.map((p, i) => {
    const nature =
      p.role === "force" ? "POINT FORT"
      : p.score === 0 ? "MANQUE : le comportement attendu n'apparaît pas dans la réponse"
      : "MANQUE PARTIEL : fait en partie seulement";
    const lignes = [
      `P${i + 1} · ${nature}${p.tier === MUST ? " (compétence indispensable au poste)" : ""}`,
      p.exercice && `  Exercice : ${p.exercice}`,
      `  Compétence : ${p.competence}`,
      `  Ce qui était attendu : ${p.attendu}`,
      p.extrait ? `  Extrait exact de la réponse du candidat : ${p.extrait}` : "  Extrait : aucun. Ne cite rien pour ce point : nomme précisément ce qui était attendu et n'a pas été fait.",
      p.role !== "force" && p.constat && `  Constat du correcteur : ${p.constat}`,
    ];
    return lignes.filter(Boolean).join("\n");
  }).join("\n\n");
}

// Ce que l'e-mail annonce, selon la décision. Les deux consignes partagent
// tout le reste du prompt : c'est ce qui tient le même ton d'une issue à
// l'autre.
const CONSIGNE_VERSION = {
  negative: "Le candidat n'est pas retenu pour ce poste. Annonce-le dès le début, simplement. Puis les points ci-dessous : les manques sont les vraies raisons de la décision ; le point fort est réel, dis-le sans le gonfler.",
  positive: "Le recruteur souhaite poursuivre avec le candidat et reviendra vers lui pour la suite. Annonce-le dès le début. Puis les points ci-dessous : les points forts, et l'axe d'amélioration, présenté comme ce qu'il gagnerait à travailler, pas comme une réserve.",
};

function construirePrompt({ locale, prenom, poste, entreprise, version, points, corrections }) {
  const langue = LOCALE_NAMES_FR[locale];

  return `LANGUE DE SORTIE : ${langue}. L'e-mail est rédigé entièrement en ${langue}. ${REGISTRE[locale]}
Les descriptions et constats ci-dessous peuvent être dans une autre langue : reformule-les en ${langue}. Les extraits, eux, se citent tels quels, dans leur langue d'origine, mot pour mot.

Tu écris au nom de ${entreprise}, qui recrute pour le poste de ${poste}. Le candidat, ${prenom}, a passé une mise en situation pratique. Le recruteur a pris sa décision ; tu rédiges le court retour écrit qui l'accompagne. Il le relira, mais il ne devrait pas avoir à y toucher.

Rédige le corps de l'e-mail seulement : pas d'objet, pas de signature (elle est ajoutée après).

LA DÉCISION : ${CONSIGNE_VERSION[version]}

LES POINTS
${decrirePoints(points)}

RÈGLES DE FOND
- Utilise TOUS ces points, et RIEN d'autre. Aucune qualité, aucun défaut, aucune impression qui ne viendrait pas de ces points.
- Chaque point s'appuie sur du concret : soit un extrait cité entre guillemets, soit, pour un manque sans extrait, ce qui était attendu dit précisément et SANS guillemets (par exemple : la question du budget n'a jamais été posée au client). Jamais de formule générique du genre bonne communication, ou structure à travailler.
- Un extrait se cite mot pour mot : tu peux en garder seulement une partie, jamais en changer un mot. Rien d'autre que des extraits fournis entre guillemets, hormis le titre d'un exercice.
- Aucun score, note, pourcentage, niveau, « critère », « checkpoint », « évaluation automatique » ou mention d'une IA.
- Parle de ce que la réponse fait ou ne fait pas, pas de la personne.
- Le ton est le même que la décision soit positive ou négative : direct, chaleureux sans effusion. Ni consolation appuyée, ni enthousiasme débordant.

RÈGLES D'ÉCRITURE : ça doit se lire comme écrit par un recruteur pressé, pas par une IA
- Environ 150 mots, salutation comprise (entre ${MOTS_MIN} et ${MOTS_MAX}).
- AUCUN tiret cadratin ni demi-cadratin (— ou –). Virgule, point, deux-points.
- Pas de liste à puces, pas de titres, pas de gras : des paragraphes courts.
- Phrases de longueurs inégales. Certaines très courtes. Pas de construction symétrique (« d'une part… d'autre part », trois adjectifs alignés, chaque paragraphe bâti pareil).
- Pas de formule creuse ni de tournure corporate : pas de « n'hésitez pas », « il est important de noter », « en conclusion », « nous tenons à vous remercier pour votre intérêt ». Un merci, s'il y en a un, porte sur quelque chose de précis (le temps passé sur l'exercice).
- Termine sur une phrase simple, pas sur une maxime ni un encouragement générique.${corrections ? `

CORRECTIONS : une première rédaction avait ces défauts, ne les reproduis pas :
${corrections}` : ""}`;
}

const SCHEMA = {
  type: "object",
  properties: { body: { type: "string" } },
  required: ["body"],
  additionalProperties: false,
};

async function appelerModele(prompt) {
  // Repli côté serveur : si le modèle décline (classifieurs de sécurité), l'API
  // rejoue la même requête sur un autre modèle dans le même appel.
  const response = await anthropic.beta.messages.create({
    model: FEEDBACK_MODEL,
    max_tokens: 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("Rédaction refusée par le modèle");
  if (response.stop_reason === "max_tokens") throw new Error("Rédaction tronquée (max_tokens)");
  const texte = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = JSON.parse(texte);
  return { parsed, usage: computeAiCost(response.model || FEEDBACK_MODEL, response.usage) };
}

// ─── 3. Le contrôle ────────────────────────────────────────────────────────

const normaliser = (s) => String(s || "")
  .toLowerCase()
  .normalize("NFKC")
  .replace(/[’‘`´]/g, "'")
  .replace(/[^\p{L}\p{N}']+/gu, " ")
  .trim();

// Passages entre guillemets : « … », “ … ”, „ … “, " … ".
function passagesCites(texte) {
  const out = [];
  const re = /«\s*([^»]+?)\s*»|“([^”]+)”|„([^“”]+)[“”]|"([^"]+)"/g;
  let m;
  while ((m = re.exec(texte))) out.push(m[1] || m[2] || m[3] || m[4]);
  return out;
}

function citationVerifiee(passage, sources) {
  // Une coupe « … » ou « [...] » dans la citation : chaque morceau doit exister.
  const morceaux = passage.split(/…|\.\.\.|\[\s*\.\.\.\s*\]/).map(normaliser).filter((m) => m.length > 0);
  if (!morceaux.length) return true;
  return morceaux.every((m) => sources.some((s) => s.includes(m)));
}

function controler(texte, locale, sources) {
  const defauts = [];
  if (/[—–]/.test(texte)) defauts.push("tiret cadratin ou demi-cadratin présent");
  if (/^\s*([-•*]|\d+[.)])\s+/m.test(texte)) defauts.push("liste à puces ou numérotée dans le corps");
  const bas = texte.toLowerCase();
  for (const f of FORMULES_INTERDITES[locale] || []) {
    if (bas.includes(f)) defauts.push(`formule interdite : « ${f} »`);
  }
  const mots = texte.split(/\s+/).filter(Boolean).length;
  if (mots < MOTS_MIN || mots > MOTS_MAX) defauts.push(`${mots} mots, hors de la fourchette ${MOTS_MIN}–${MOTS_MAX}`);
  const inventees = passagesCites(texte).filter((p) => !citationVerifiee(p, sources));
  for (const p of inventees) defauts.push(`citation introuvable dans les extraits fournis : « ${p} »`);
  return { defauts, citationsInventees: inventees.length > 0 };
}

// Dernier filet : le tiret cadratin ne passe jamais, même si la relance a
// échoué à l'éviter. Le remplacer par une virgule est presque toujours juste.
const sansTiret = (t) => t.replace(/\s*[—–]\s*/g, ", ").replace(/,\s*,/g, ",");

// ─── 4. Le point d'entrée ──────────────────────────────────────────────────

// Durée au-delà de laquelle un verrou de rédaction est tenu pour abandonné
// (fonction coupée en cours de route). Une rédaction relancée une fois dure
// rarement plus d'une minute.
const VERROU_MS = 150_000;

/**
 * Rédige et enregistre UNE version du feedback : celle de la décision prise.
 * Service_role : appelé après le clic sur Valider / Étape suivante / Rejeter
 * (updateCandidateStatus), ou depuis la fenêtre Feedback si le brouillon
 * manque — dans les deux cas APRÈS une vérification de propriété.
 *
 * Idempotent : une version déjà rédigée n'est jamais repayée, un feedback déjà
 * envoyé n'est jamais touché, et deux appels simultanés n'en font qu'un (le
 * second rend `inProgress`).
 *
 * @param {string} candidateId
 * @param {"positive"|"negative"} version
 * @returns {Promise<{ success: boolean, error?: string }>}
 *   error vaut "notScored" (notation pas terminée) ou "inProgress" (une
 *   rédaction tourne déjà) quand ce n'est pas une panne.
 */
export async function genererBrouillonFeedback(candidateId, version) {
  if (version !== "positive" && version !== "negative") return { success: false, error: "Version inconnue" };
  const admin = createAdminClient();
  const champ = `draft_${version}`;

  const { data: candidat } = await admin
    .from("candidates")
    .select("id, first_name, jobs!inner(title, experience_locale, user_id)")
    .eq("id", candidateId)
    .single();
  if (!candidat) return { success: false, error: "Candidat introuvable" };
  const locale = coerceExperienceLocale(candidat.jobs.experience_locale);

  // La ligne doit exister pour porter le verrou. Sans effet si elle existe.
  const { error: creationErr } = await admin.from("candidate_feedback")
    .upsert({ candidate_id: candidateId, locale }, { onConflict: "candidate_id", ignoreDuplicates: true });
  if (creationErr) return { success: false, error: `candidate_feedback illisible : ${creationErr.message}` };

  const { data: ligne } = await admin.from("candidate_feedback")
    .select(`sent_at, generation_usage, ${champ}`).eq("candidate_id", candidateId).single();
  if (ligne?.sent_at || ligne?.[champ]) return { success: true };

  const { data: run } = await admin
    .from("candidate_runs")
    .select("id, experience_id, run_scores(criterion_scores)")
    .eq("candidate_id", candidateId)
    .maybeSingle();
  const rs = Array.isArray(run?.run_scores) ? run.run_scores[0] : run?.run_scores;
  if (!rs) return { success: false, error: "notScored" };

  const { data: etapes } = await admin
    .from("experience_steps").select("id, title").eq("experience_id", run.experience_id);
  const titresEtapes = Object.fromEntries((etapes || []).map((s) => [s.id, s.title || ""]));

  const matiere = selectionnerMatiere(rs.criterion_scores, titresEtapes);
  const points = matiere[version];
  const maintenant = () => new Date().toISOString();

  // Rien d'étayé à dire : on l'enregistre, sans appel au modèle.
  if (!points) {
    await admin.from("candidate_feedback")
      .update({ [champ]: { no_material: true }, generated_at: maintenant(), updated_at: maintenant() })
      .eq("candidate_id", candidateId);
    return { success: true };
  }

  // Verrou : posé seulement s'il n'y en a pas, ou s'il est périmé.
  const perime = new Date(Date.now() - VERROU_MS).toISOString();
  const { data: verrou } = await admin.from("candidate_feedback")
    .update({ generation_started_at: maintenant() })
    .eq("candidate_id", candidateId)
    .is("sent_at", null)
    .or(`generation_started_at.is.null,generation_started_at.lt."${perime}"`)
    .select("candidate_id");
  if (!verrou?.length) return { success: false, error: "inProgress" };

  const liberer = (champs) => admin.from("candidate_feedback")
    .update({ ...champs, generation_started_at: null, updated_at: maintenant() })
    .eq("candidate_id", candidateId);

  // Signature : le prénom du propriétaire de l'offre et son entreprise. Le nom
  // d'entreprise vit dans public.users, le prénom dans les métadonnées auth.
  const [{ data: profil }, { data: auth }] = await Promise.all([
    admin.from("users").select("company_name").eq("id", candidat.jobs.user_id).single(),
    admin.auth.admin.getUserById(candidat.jobs.user_id),
  ]);
  const meta = auth?.user?.user_metadata || {};
  const entreprise = (profil?.company_name || meta.company_name || "").trim() || "Onbord";
  const prenomRecruteur = (meta.first_name || "").trim();
  const signature = [prenomRecruteur, entreprise].filter(Boolean).join("\n");

  const prenom = (candidat.first_name || "").trim();
  const poste = candidat.jobs.title || "";
  const sources = [...points.map((p) => p.extrait), ...Object.values(titresEtapes), poste, entreprise]
    .filter(Boolean).map(normaliser);

  const usage = [];
  const usageCumule = () => ({ ...(ligne?.generation_usage || {}), [version]: usage });
  let texte = "";
  let controle;
  try {
    let corrections = "";
    for (let essai = 0; essai < 2; essai++) {
      const { parsed, usage: u } = await appelerModele(
        construirePrompt({ locale, prenom, poste, entreprise, version, points, corrections }),
      );
      usage.push(u);
      texte = String(parsed.body || "").trim();
      controle = controler(texte, locale, sources);
      if (!controle.defauts.length) break;
      console.warn(`genererBrouillonFeedback ${candidateId} (${version}) — essai ${essai + 1} : ${controle.defauts.join(" ; ")}`);
      corrections = controle.defauts.map((d) => `- ${d}`).join("\n");
    }
    if (!texte) throw new Error("Rédaction vide");
  } catch (e) {
    console.error(`genererBrouillonFeedback ${candidateId} (${version}) :`, e.message);
    await liberer({ generation_error: e.message.slice(0, 500), generation_usage: usageCumule() });
    return { success: false, error: e.message };
  }

  const avertissements = [...matiere.avertissements[version]];
  if (controle.citationsInventees) avertissements.push("unverifiedQuote");

  const { error } = await liberer({
    [champ]: {
      subject: OBJET[locale](poste),
      body: `${sansTiret(texte)}\n\n${signature}`,
      warnings: avertissements,
      sources: points.map(({ role, score, tier, competence, attendu, extrait }) =>
        ({ role, score, tier, competence, attendu, extrait })),
    },
    locale,
    generated_at: maintenant(),
    generation_usage: usageCumule(),
    generation_error: null,
  });
  if (error) {
    console.error(`genererBrouillonFeedback ${candidateId} : écriture refusée — ${error.message}`);
    return { success: false, error: error.message };
  }
  return { success: true };
}
