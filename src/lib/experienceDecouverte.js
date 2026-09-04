// Fiche de découverte du chat de conception — module PUR (pas "use server").
//
// Le problème qu'il résout : un chat qui doit, dans le même appel et le même
// budget de tokens, tenir la comptabilité de ce qu'il a appris ET décider quoi
// demander ensuite, fait la comptabilité en diagonale. Il retombe alors sur une
// liste implicite de questions — le comportement scripté qu'on veut supprimer —
// et il redemande ce que le recruteur vient de lui dire.
//
// On sépare donc les deux métiers, comme les passes CRM et code ont été
// séparées de la conception dans experienceGeneration.js, et pour la même
// raison : « une rigueur que la passe principale, occupée à concevoir tout un
// parcours, ne tient pas ». Ici la passe principale est occupée à converser.
//
//   1. EXTRAIRE (ce module, modèle rapide) : à chaque message du recruteur, on
//      dépouille tout ce qu'il contient — y compris ce qui répond à une
//      question qu'on n'a pas posée. Inconditionnel : un outil de prise de
//      notes que le modèle choisirait d'appeler serait sauté exactement quand
//      il est pressé, c'est-à-dire dans le cas qu'on corrige.
//   2. CONVERSER (route de chat) : le modèle lit une fiche DÉJÀ à jour et
//      décide de la suite. Il n'a plus à se souvenir, seulement à écouter.
//
// ── Le partage des rôles, à l'intérieur même de l'extraction ────────────────
// Le modèle fait la SÉMANTIQUE (qu'est-ce que ce message dit, dans quel
// emplacement ça va, quelles sont ses citations exactes). Le serveur fait la
// COMPTABILITÉ (combien de fois cet emplacement a été demandé, a-t-on encore le
// droit de relancer). C'est ce qui rend la règle « une seule relance »
// inviolable : elle n'est pas une consigne qu'un prompt peut oublier, c'est une
// ligne calculée qui s'affiche en INTERDIT dans le prompt système.

import anthropic from "@/lib/anthropic";

// Modèle rapide : recopier des citations mot pour mot et ranger un fait dans
// l'un de cinq emplacements ne demande pas le modèle de conception. Cette passe
// tourne AVANT chaque réponse du chat, donc sa latence s'ajoute à celle du
// tour — c'est le critère qui a tranché.
const EXTRACTION_MODEL = "claude-haiku-4-5";

// Interrupteur d'exploitation, comme ceux de la génération : sans extraction,
// la fiche cesse de se remplir et le chat retombe sur son comportement d'avant.
const DECOUVERTE_ACTIVE = process.env.ONBORD_DECOUVERTE !== "0";

// ─── Les emplacements ────────────────────────────────────────────────────────
// Cinq, pas plus : chacun change quelque chose au parcours généré. Un
// emplacement de plus serait une question de plus à poser, donc un recruteur de
// moins à aller au bout.
//
// `plancher` : ce sans quoi le scénario ne peut pas être écrit sans être
// inventé. Le reste enrichit, mais ne bloque jamais la génération.
export const SLOTS = {
  situation_ideale: {
    libelle: "La mise en situation idéale selon lui — ce qu'il aimerait vraiment voir un candidat gérer",
    plancher: false,
  },
  situation_reelle: {
    libelle: "Une situation réelle et récente qu'il a vécue (le cas concret, pas le type de cas)",
    plancher: true,
  },
  distinction_bon_moyen: {
    libelle: "Ce qui sépare un excellent d'un moyen sur ce poste, concrètement",
    plancher: false,
  },
  metier_reel: {
    libelle: "Le métier réel au quotidien — ce que la personne fera vraiment de ses journées",
    plancher: true,
  },
  interlocuteur: {
    libelle: "À qui le candidat aura affaire (client, prospect, collègue, patient…) et ce que ces gens veulent",
    plancher: true,
  },
};

const CLES_SLOTS = Object.keys(SLOTS);

// Une réponse pauvre relancée une fois ne se relance pas deux. Le compteur est
// tenu par le serveur, pas par le modèle.
const MAX_DEMANDES = 2;

const RANG_RICHESSE = { pauvre: 1, moyenne: 2, riche: 3 };

// Bornes de stockage : la fiche vit dans la même ligne que le fil, déjà
// plafonnée à 400 ko. Rien ici ne doit pouvoir croître sans fin.
const MAX_CITATIONS = 4;
const MAX_VOCABULAIRE = 24;
const MAX_HORS_SLOTS = 12;
const MAX_CONTENU = 700;

export function ficheVide() {
  const slots = {};
  for (const cle of CLES_SLOTS) {
    slots[cle] = { statut: "vide", richesse: null, contenu: "", citations: [], demandes: 0 };
  }
  return { v: 1, slots, vocabulaire: [], hors_slots: [], tours: 0 };
}

/** Rend une fiche lue en base utilisable, quelle que soit sa forme d'origine. */
export function normaliserFiche(brute) {
  const base = ficheVide();
  if (!brute || typeof brute !== "object") return base;
  for (const cle of CLES_SLOTS) {
    const s = brute.slots?.[cle];
    if (!s || typeof s !== "object") continue;
    base.slots[cle] = {
      statut: ["vide", "partiel", "rempli", "clos"].includes(s.statut) ? s.statut : "vide",
      richesse: RANG_RICHESSE[s.richesse] ? s.richesse : null,
      contenu: String(s.contenu || "").slice(0, MAX_CONTENU),
      citations: Array.isArray(s.citations)
        ? s.citations.filter((c) => typeof c === "string").slice(0, MAX_CITATIONS)
        : [],
      demandes: Number.isInteger(s.demandes) ? s.demandes : 0,
    };
  }
  base.vocabulaire = Array.isArray(brute.vocabulaire)
    ? brute.vocabulaire.filter((v) => v && typeof v.terme === "string").slice(0, MAX_VOCABULAIRE)
    : [];
  base.hors_slots = Array.isArray(brute.hors_slots)
    ? brute.hors_slots.filter((h) => typeof h === "string").slice(0, MAX_HORS_SLOTS)
    : [];
  base.tours = Number.isInteger(brute.tours) ? brute.tours : 0;
  return base;
}

// ─── Lecture du fil ──────────────────────────────────────────────────────────
// Deux besoins distincts : ce que le recruteur vient de dire (à dépouiller), et
// la question à laquelle il répondait (pour savoir quel emplacement était visé).

function texteDesBlocs(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.filter((c) => c?.type === "text").map((c) => c.text || "").join("\n").trim();
}

/**
 * Le dernier message qui est VRAIMENT du recruteur.
 *
 * Les `tool_result` que le client insère portent le rôle "user" sans être ses
 * mots — même piège que la détection de langue, qui a déjà coûté une version.
 * Un message qui en contient n'est pas une parole : c'est une notification de
 * notre propre plateforme, et la dépouiller remplirait la fiche de nos phrases.
 */
export function dernierMessageRecruteur(fil) {
  for (let i = (fil?.length || 0) - 1; i >= 0; i--) {
    const m = fil[i];
    if (m?.role !== "user") continue;
    if (Array.isArray(m.content) && m.content.some((c) => c?.type === "tool_result")) return null;
    const texte = texteDesBlocs(m.content);
    return texte ? texte : null;
  }
  return null;
}

/** La dernière question posée par l'assistant — le message d'accueil compris. */
export function derniereQuestionAssistant(fil) {
  for (let i = (fil?.length || 0) - 1; i >= 0; i--) {
    const m = fil[i];
    if (m?.role !== "assistant") continue;
    const texte = texteDesBlocs(m.content);
    if (texte) return texte.slice(-600);
  }
  return null;
}

// ─── L'appel d'extraction ────────────────────────────────────────────────────

function ficheCompacte(fiche) {
  return CLES_SLOTS.map((cle) => {
    const s = fiche.slots[cle];
    const etat = s.statut === "vide" ? "rien" : `${s.statut}${s.richesse ? `/${s.richesse}` : ""}`;
    return `- ${cle} [${etat}] : ${s.contenu || "—"}`;
  }).join("\n");
}

function buildExtractionPrompt({ fiche, question, message, titrePoste }) {
  return `Tu dépouilles la réponse d'un recruteur qui décrit son métier à un concepteur d'évaluations. Tu ne lui parles pas : tu remplis une fiche.

POSTE CONCERNÉ : ${titrePoste || "non précisé"}

FICHE ACTUELLE (état avant ce message) :
${ficheCompacte(fiche)}

DERNIÈRE QUESTION POSÉE PAR LE CONCEPTEUR :
${question || "(aucune — c'est le premier message du recruteur)"}

CE QUE LE RECRUTEUR VIENT D'ÉCRIRE :
"""
${String(message).slice(0, 4000)}
"""

LES EMPLACEMENTS :
${CLES_SLOTS.map((cle) => `- ${cle} : ${SLOTS[cle].libelle}`).join("\n")}

RÈGLES :
1. PRENDS TOUT. Un message répond souvent à des questions qu'on ne lui a pas posées : s'il raconte une situation vécue alors qu'on l'interrogeait sur son métier, remplis LES DEUX emplacements. Ne te limite jamais à celui que visait la question.
2. "citations" : des passages RECOPIÉS MOT POUR MOT depuis son message, dans SA langue — jamais traduits, jamais reformulés, jamais abrégés. Ce sont eux qui serviront à le relancer et à écrire le scénario ; un extrait retouché n'est plus une citation. Prends ce qui a de la chair : un nom de produit, une phrase de client, un chiffre, une objection telle qu'elle se dit. Zéro à quatre par emplacement.
3. "contenu" : ce que ça t'apprend, en français, en une à trois phrases. Factuel, sans interprétation.
4. "richesse", et sois sévère :
   - "riche" : un fait SITUÉ — un client reconnaissable, un moment, ce qui a coincé. On pourrait écrire un scénario avec ça.
   - "moyenne" : une orientation vraie, mais sans prise. Rien de citable.
   - "pauvre" : une catégorie ou un adjectif ("des clients exigeants", "plutôt technique", "ça dépend").
5. "statut" :
   - "rempli" : il y a de quoi travailler (richesse riche, ou moyenne bien fournie).
   - "partiel" : il a répondu, mais ça ne suffit pas.
   - "clos" : il DÉCLINE — "à toi de proposer", "je ne sais pas", "je te laisse voir", "pas d'idée précise". C'est une réponse valide, pas un trou : ne la note jamais "partiel", sinon on le harcèlera avec une question à laquelle il a déjà répondu.
   N'invente rien : un emplacement que ce message n'aborde pas ne figure PAS dans ta réponse.
6. "vocabulaire" : ses mots à lui — nom exact d'un produit, d'un outil, d'un segment de clientèle, une objection dans sa formulation, un terme maison. Recopiés tels quels, sans traduction. Seulement les NOUVEAUX, ceux qui ne sont pas déjà dans la fiche.
7. "hors_slots" : les faits utiles qui n'entrent dans aucun emplacement et qui changeraient le scénario (une contrainte, un outil imposé, une saisonnalité).
8. "slot_vise" : l'emplacement sur lequel portait la dernière question posée, ou null si elle n'en visait aucun.

Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après :
{
  "slot_vise": "situation_reelle",
  "slots": {
    "situation_reelle": { "statut": "rempli", "richesse": "riche", "contenu": "…", "citations": ["…"] }
  },
  "vocabulaire": [ { "terme": "…", "nature": "produit|outil|segment|objection|jargon", "citation": "…" } ],
  "hors_slots": ["…"]
}`;
}

function normaliserPourCitation(s) {
  return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Met la fiche à jour à partir du dernier message du recruteur.
 *
 * Ne fait JAMAIS échouer le tour : une extraction ratée rend la fiche
 * inchangée. Le chat continue avec ce qu'il savait — dégradé, jamais
 * interrompu. Même principe qu'enregistrerFil, et même raison : perdre une
 * note est ennuyeux, perdre la réponse que le recruteur attend l'est plus.
 */
export async function extraireDecouverte({ fiche, fil, titrePoste }) {
  const courante = normaliserFiche(fiche);
  if (!DECOUVERTE_ACTIVE) return courante;

  const message = dernierMessageRecruteur(fil);
  if (!message) return courante; // un tool_result n'est pas une parole du recruteur

  const question = derniereQuestionAssistant(fil);

  let extrait;
  try {
    const reponse = await anthropic.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 1500,
      temperature: 0,
      system: "Tu extrais des faits d'un message et tu remplis une fiche. Réponds UNIQUEMENT avec un JSON valide, sans texte avant ni après, sans bloc de code Markdown.",
      messages: [{ role: "user", content: buildExtractionPrompt({ fiche: courante, question, message, titrePoste }) }],
    });
    const texte = reponse.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const match = texte.match(/\{[\s\S]*\}/);
    if (!match) return courante;
    extrait = JSON.parse(match[0]);
  } catch (err) {
    console.error("extraireDecouverte error:", err.message);
    return courante;
  }

  return fusionnerFiche(courante, extrait, message);
}

/**
 * Fusionne l'extraction dans la fiche. C'est ici que vit la comptabilité, et
 * elle n'est négociable par aucun prompt.
 */
export function fusionnerFiche(fiche, extrait, messageBrut) {
  const suivante = normaliserFiche(fiche);
  suivante.tours += 1;

  // Le compteur de demandes, tenu par le serveur à partir de l'emplacement que
  // la question visait. C'est lui qui plafonne les relances.
  const vise = extrait?.slot_vise;
  if (vise && suivante.slots[vise]) suivante.slots[vise].demandes += 1;

  const source = normaliserPourCitation(messageBrut);
  // Une citation absente du message est une reformulation, donc plus une
  // citation. Même contrôle que le verbatim du scoring et l'evidence de
  // l'extraction d'offre — ici il protège ce qui partira vers la génération.
  const citationsValides = (liste) => (Array.isArray(liste) ? liste : [])
    .filter((c) => typeof c === "string" && c.trim().length >= 3)
    .filter((c) => source.includes(normaliserPourCitation(c)))
    .slice(0, MAX_CITATIONS);

  for (const [cle, maj] of Object.entries(extrait?.slots || {})) {
    const slot = suivante.slots[cle];
    if (!slot || !maj || typeof maj !== "object") continue;

    // "clos" prime sur tout sauf sur un emplacement déjà rempli : quand le
    // recruteur laisse la main, on ne le relance plus, jamais.
    if (maj.statut === "clos") {
      if (slot.statut !== "rempli") slot.statut = "clos";
      continue;
    }

    const nouvelleRichesse = RANG_RICHESSE[maj.richesse] || 0;
    const ancienneRichesse = RANG_RICHESSE[slot.richesse] || 0;
    // On n'écrase que vers le haut : un message qui effleure un sujet déjà bien
    // renseigné ne doit pas appauvrir la fiche.
    if (nouvelleRichesse < ancienneRichesse) continue;

    const contenu = String(maj.contenu || "").trim();
    if (contenu) slot.contenu = contenu.slice(0, MAX_CONTENU);
    if (RANG_RICHESSE[maj.richesse]) slot.richesse = maj.richesse;
    const citations = citationsValides(maj.citations);
    if (citations.length) slot.citations = citations;
    if (maj.statut === "rempli" || maj.statut === "partiel") slot.statut = maj.statut;
  }

  const dejaVus = new Set(suivante.vocabulaire.map((v) => String(v.terme).toLowerCase()));
  for (const v of Array.isArray(extrait?.vocabulaire) ? extrait.vocabulaire : []) {
    const terme = String(v?.terme || "").trim();
    if (!terme || dejaVus.has(terme.toLowerCase())) continue;
    if (!source.includes(normaliserPourCitation(terme))) continue; // ses mots, pas les nôtres
    dejaVus.add(terme.toLowerCase());
    suivante.vocabulaire.push({
      terme,
      nature: String(v?.nature || "").slice(0, 20),
      citation: String(v?.citation || "").slice(0, 300),
    });
    if (suivante.vocabulaire.length >= MAX_VOCABULAIRE) break;
  }

  for (const h of Array.isArray(extrait?.hors_slots) ? extrait.hors_slots : []) {
    const fait = String(h || "").trim();
    if (!fait || suivante.hors_slots.includes(fait)) continue;
    suivante.hors_slots.push(fait.slice(0, 300));
    if (suivante.hors_slots.length >= MAX_HORS_SLOTS) break;
  }

  return suivante;
}

// ─── Ce que le chat a le droit de faire, calculé et non déduit ───────────────

/**
 * Trois listes, dérivées de la fiche par le serveur :
 *   aDemander — jamais abordé, question franche permise ;
 *   aRelancer — abordé, réponse trop maigre, UNE relance encore permise ;
 *   interdits — renseigné, clos, ou déjà relancé : on n'y revient pas.
 *
 * C'est la traduction en règles de « ne relance jamais pour compléter la
 * liste » et de « si le recruteur reste laconique, respecte-le ».
 */
export function etatDemandes(fiche) {
  const f = normaliserFiche(fiche);
  const aDemander = [];
  const aRelancer = [];
  const interdits = [];

  for (const cle of CLES_SLOTS) {
    const s = f.slots[cle];
    if (s.statut === "rempli" || s.statut === "clos") { interdits.push(cle); continue; }
    if (s.demandes === 0) { aDemander.push(cle); continue; }
    if (s.demandes < MAX_DEMANDES) { aRelancer.push(cle); continue; }
    interdits.push(cle);
  }

  // Le plancher dit « j'ai fait ce qu'il fallait pour l'obtenir », pas « je
  // l'ai obtenu ». Un emplacement demandé jusqu'à épuisement en fait donc
  // partie, même vide : sans ça, un recruteur qui ne s'étend pas se retrouve
  // devant un chat à qui l'on interdit de redemander ET qui refuse de générer
  // — une porte fermée des deux côtés, constatée au test.
  const manquePlancher = CLES_SLOTS.filter(
    (cle) => SLOTS[cle].plancher
      && f.slots[cle].statut !== "rempli"
      && f.slots[cle].statut !== "clos"
      && f.slots[cle].demandes < MAX_DEMANDES
  );

  return { aDemander, aRelancer, interdits, manquePlancher, plancherAtteint: manquePlancher.length === 0 };
}

const ETIQUETTE_STATUT = {
  vide: "JAMAIS ABORDÉ",
  partiel: "ABORDÉ, MAIS TROP MAIGRE",
  rempli: "RENSEIGNÉ",
  clos: "CLOS PAR LE RECRUTEUR — il a laissé la main, ne le redemande JAMAIS",
};

/**
 * Le bloc injecté dans le prompt système à chaque tour.
 *
 * Même rôle que construireEtatExperience pour les étapes : l'image de ce que le
 * chat sait, relue en base plutôt que reconstituée de mémoire. Ce qui le
 * distingue d'un simple résumé tient dans les trois dernières lignes — elles ne
 * décrivent pas un état, elles ferment des portes.
 */
export function construireFicheDecouverte(fiche) {
  const f = normaliserFiche(fiche);
  const { aDemander, aRelancer, interdits, manquePlancher, plancherAtteint } = etatDemandes(f);

  const lignes = CLES_SLOTS.map((cle) => {
    const s = f.slots[cle];
    const entete = `${SLOTS[cle].libelle}\n  État : ${ETIQUETTE_STATUT[s.statut]}${s.richesse ? ` (${s.richesse})` : ""}${s.demandes ? ` · demandé ${s.demandes} fois` : ""}`;
    const corps = [
      s.contenu ? `  Ce que tu sais : ${s.contenu}` : null,
      s.citations.length ? `  Ses mots : ${s.citations.map((c) => `« ${c} »`).join(" · ")}` : null,
    ].filter(Boolean).join("\n");
    return corps ? `${entete}\n${corps}` : entete;
  }).join("\n\n");

  const nommer = (cles) => cles.map((c) => SLOTS[c].libelle.split(" —")[0]).join(" ; ");

  const vocab = f.vocabulaire.length
    ? `\nSON VOCABULAIRE — à réemployer TEL QUEL, jamais reformulé :\n${f.vocabulaire.map((v) => `  « ${v.terme} »${v.nature ? ` (${v.nature})` : ""}`).join("\n")}`
    : "";
  const autres = f.hors_slots.length
    ? `\nAUTRES FAITS UTILES :\n${f.hors_slots.map((h) => `  - ${h}`).join("\n")}`
    : "";

  return `FICHE DE DÉCOUVERTE — ce que tu sais déjà de ce recruteur. Elle est TENUE À JOUR : son dernier message y a été dépouillé avant que tu ne lises ceci. Elle fait foi, pas tes souvenirs de la conversation, et surtout pas ce que tu crois avoir demandé.

${lignes}
${vocab}${autres}

CE QUE TU PEUX DEMANDER FRANCHEMENT (jamais abordé) : ${aDemander.length ? nommer(aDemander) : "rien, tout a été abordé"}
CE QUE TU PEUX RELANCER UNE FOIS, ET UNE SEULE (réponse trop maigre) : ${aRelancer.length ? nommer(aRelancer) : "rien"}
INTERDIT DE REDEMANDER (renseigné, clos, ou déjà relancé) : ${interdits.length ? nommer(interdits) : "rien"}
PLANCHER DE GÉNÉRATION : ${plancherAtteint ? "ATTEINT — tu peux proposer de générer" : `NON ATTEINT — il manque : ${nommer(manquePlancher)}`}`;
}

// ─── Ce qui part vers la génération ─────────────────────────────────────────

/**
 * Le matériau transmis à P04, construit À PARTIR DE LA FICHE et non réécrit de
 * mémoire par le modèle au moment de générer.
 *
 * C'est le point où le levier tient sa promesse. Une synthèse produite à la
 * volée diluait les détails — c'est l'étape qui transformait la formulation
 * exacte d'une objection en « objections sur les fonctionnalités ». Ici les
 * citations arrivent recopiées d'un JSON stocké.
 *
 * Borné par construction (500 caractères par emplacement, 12 termes) : ce texte
 * est concaténé au brief puis coupé en amont de la génération, et une coupe
 * tomberait sur la fin, donc en silence.
 */
export function construireBriefDecouverte(fiche) {
  const f = normaliserFiche(fiche);
  const blocs = [];

  for (const cle of CLES_SLOTS) {
    const s = f.slots[cle];
    if (!s.contenu && !s.citations.length) continue;
    blocs.push([
      `${SLOTS[cle].libelle} :`,
      s.contenu ? `  ${s.contenu.slice(0, 500)}` : null,
      s.citations.length ? `  Ses mots exacts : ${s.citations.map((c) => `« ${c.slice(0, 300)} »`).join(" · ")}` : null,
    ].filter(Boolean).join("\n"));
  }

  if (f.vocabulaire.length) {
    blocs.push(`Vocabulaire du recruteur, à réemployer TEL QUEL dans les énoncés et les mises en situation :\n${f.vocabulaire.slice(0, 12).map((v) => `  « ${v.terme} »`).join("\n")}`);
  }
  if (f.hors_slots.length) {
    blocs.push(`Contraintes et détails du terrain :\n${f.hors_slots.slice(0, 8).map((h) => `  - ${h}`).join("\n")}`);
  }

  if (!blocs.length) return "";
  return `CE QUE LE RECRUTEUR A RACONTÉ DE SON MÉTIER (recueilli en entretien — ses mots sont entre guillemets, reprends-les tels quels) :\n\n${blocs.join("\n\n")}`;
}
