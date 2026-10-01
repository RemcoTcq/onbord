// Noms de lieux dans la langue du CANDIDAT.
//
// Le lieu d'une offre est stocké tel qu'il a été écrit : souvent dans la
// langue de l'annonce, pas dans celle du parcours. Or en Belgique, une ville a
// couramment trois noms. Une offre flamande analysée pour un parcours anglais
// demandait « Are you available to work in Gent? » — Ghent, en anglais.
//
// Ce module ne sert qu'à RÉDIGER ce que lit le candidat (les questions
// qualifiantes, lib/recommendationEngine.js). Le lieu stocké, lui, ne change
// pas : c'est une donnée, comparée et affichée telle quelle au recruteur.
//
// ── Ce que la table couvre, et pourquoi pas plus ────────────────────────────
// Les villes belges dont le nom change d'une langue à l'autre, les provinces,
// les régions, la Belgique et ses voisins. Une ville absente de la table
// traverse inchangée : c'est le comportement d'avant, jamais pire.
//
// `match` liste les formes RECONNUES. Certaines formes sont volontairement
// absentes, parce qu'elles désignent aussi autre chose : « Bergen » (Mons en
// néerlandais) est d'abord une ville norvégienne, « Hal » un mot courant,
// « Luxembourg » à la fois un pays et une province belge — on ne traduit pas
// ce qu'on ne peut pas désambiguïser.
//
// `fr_prep` : la préposition française devant le lieu QUAND il constitue tout
// le champ. « travailler à Gand », mais « en Wallonie », « au Luxembourg »,
// « dans le Hainaut ». Par défaut « à ».

const LIEUX = [
  // ── Villes ──
  { fr: "Bruxelles", en: "Brussels", nl: "Brussel", match: ["Bruxelles", "Brussels", "Brussel"] },
  { fr: "Anvers", en: "Antwerp", nl: "Antwerpen", match: ["Anvers", "Antwerp", "Antwerpen"] },
  { fr: "Gand", en: "Ghent", nl: "Gent", match: ["Gand", "Ghent", "Gent"] },
  { fr: "Bruges", en: "Bruges", nl: "Brugge", match: ["Bruges", "Brugge"] },
  { fr: "Louvain", en: "Leuven", nl: "Leuven", match: ["Louvain", "Leuven"] },
  { fr: "Liège", en: "Liège", nl: "Luik", match: ["Liège", "Liege", "Luik", "Lüttich"] },
  { fr: "Namur", en: "Namur", nl: "Namen", match: ["Namur", "Namen"] },
  { fr: "Mons", en: "Mons", nl: "Bergen", match: ["Mons"] },
  { fr: "Malines", en: "Mechelen", nl: "Mechelen", match: ["Malines", "Mechelen"] },
  { fr: "Courtrai", en: "Kortrijk", nl: "Kortrijk", match: ["Courtrai", "Kortrijk"] },
  { fr: "Tournai", en: "Tournai", nl: "Doornik", match: ["Tournai", "Doornik"] },
  { fr: "Ostende", en: "Ostend", nl: "Oostende", match: ["Ostende", "Ostend", "Oostende"] },
  { fr: "Ypres", en: "Ypres", nl: "Ieper", match: ["Ypres", "Ieper"] },
  { fr: "Alost", en: "Aalst", nl: "Aalst", match: ["Alost", "Aalst"] },
  { fr: "Saint-Nicolas", en: "Sint-Niklaas", nl: "Sint-Niklaas", match: ["Saint-Nicolas", "Sint-Niklaas"] },
  { fr: "Termonde", en: "Dendermonde", nl: "Dendermonde", match: ["Termonde", "Dendermonde"] },
  { fr: "Audenarde", en: "Oudenaarde", nl: "Oudenaarde", match: ["Audenarde", "Oudenaarde"] },
  { fr: "Roulers", en: "Roeselare", nl: "Roeselare", match: ["Roulers", "Roeselare"] },
  { fr: "Saint-Trond", en: "Sint-Truiden", nl: "Sint-Truiden", match: ["Saint-Trond", "Sint-Truiden"] },
  { fr: "Tongres", en: "Tongeren", nl: "Tongeren", match: ["Tongres", "Tongeren"] },
  { fr: "Vilvorde", en: "Vilvoorde", nl: "Vilvoorde", match: ["Vilvorde", "Vilvoorde"] },
  { fr: "Lierre", en: "Lier", nl: "Lier", match: ["Lierre"] },
  { fr: "Wavre", en: "Wavre", nl: "Waver", match: ["Wavre", "Waver"] },
  { fr: "Nivelles", en: "Nivelles", nl: "Nijvel", match: ["Nivelles", "Nijvel"] },
  { fr: "Arlon", en: "Arlon", nl: "Aarlen", match: ["Arlon", "Aarlen"] },
  { fr: "Braine-l'Alleud", en: "Braine-l'Alleud", nl: "Eigenbrakel", match: ["Braine-l'Alleud", "Eigenbrakel"] },
  { fr: "Ath", en: "Ath", nl: "Aat", match: ["Aat"] },
  { fr: "Mouscron", en: "Mouscron", nl: "Moeskroen", match: ["Mouscron", "Moeskroen"] },
  { fr: "Enghien", en: "Enghien", nl: "Edingen", match: ["Enghien", "Edingen"] },

  // ── Provinces ──
  { fr: "Brabant wallon", en: "Walloon Brabant", nl: "Waals-Brabant", fr_prep: "dans le", match: ["Brabant wallon", "Walloon Brabant", "Waals-Brabant"] },
  { fr: "Brabant flamand", en: "Flemish Brabant", nl: "Vlaams-Brabant", fr_prep: "dans le", match: ["Brabant flamand", "Flemish Brabant", "Vlaams-Brabant"] },
  { fr: "Flandre-Orientale", en: "East Flanders", nl: "Oost-Vlaanderen", fr_prep: "en", match: ["Flandre-Orientale", "Flandre orientale", "East Flanders", "Oost-Vlaanderen"] },
  { fr: "Flandre-Occidentale", en: "West Flanders", nl: "West-Vlaanderen", fr_prep: "en", match: ["Flandre-Occidentale", "Flandre occidentale", "West Flanders", "West-Vlaanderen"] },
  { fr: "Hainaut", en: "Hainaut", nl: "Henegouwen", fr_prep: "dans le", match: ["Hainaut", "Henegouwen"] },
  { fr: "Limbourg", en: "Limburg", nl: "Limburg", fr_prep: "dans le", match: ["Limbourg", "Limburg"] },
  { fr: "province de Liège", en: "Liège province", nl: "provincie Luik", fr_prep: "dans la", match: ["province de Liège", "provincie Luik"] },

  // ── Régions ──
  { fr: "Wallonie", en: "Wallonia", nl: "Wallonië", fr_prep: "en", match: ["Wallonie", "Wallonia", "Wallonië", "Wallonien"] },
  { fr: "Flandre", en: "Flanders", nl: "Vlaanderen", fr_prep: "en", match: ["Flandres", "Flandre", "Flanders", "Vlaanderen"] },
  { fr: "Région de Bruxelles-Capitale", en: "Brussels-Capital Region", nl: "Brussels Hoofdstedelijk Gewest", fr_prep: "dans la", match: ["Région de Bruxelles-Capitale", "Brussels-Capital Region", "Brussels Hoofdstedelijk Gewest"] },

  // ── Pays ──
  { fr: "Belgique", en: "Belgium", nl: "België", fr_prep: "en", match: ["Belgique", "Belgium", "België", "Belgien"] },
  { fr: "Pays-Bas", en: "Netherlands", nl: "Nederland", fr_prep: "aux", match: ["Pays-Bas", "Netherlands", "Nederland", "Niederlande"] },
  { fr: "Allemagne", en: "Germany", nl: "Duitsland", fr_prep: "en", match: ["Allemagne", "Germany", "Duitsland", "Deutschland"] },
  { fr: "France", en: "France", nl: "Frankrijk", fr_prep: "en", match: ["France", "Frankrijk", "Frankreich"] },
  { fr: "Suisse", en: "Switzerland", nl: "Zwitserland", fr_prep: "en", match: ["Suisse", "Switzerland", "Zwitserland", "Schweiz"] },
  { fr: "Royaume-Uni", en: "United Kingdom", nl: "Verenigd Koninkrijk", fr_prep: "au", match: ["Royaume-Uni", "United Kingdom", "Verenigd Koninkrijk"] },
];

// Les formes longues d'abord : « Région de Bruxelles-Capitale » doit être
// reconnue avant « Bruxelles », sinon elle deviendrait « Région de Brussels-Capitale ».
const FORMES = LIEUX
  .flatMap((lieu) => lieu.match.map((forme) => ({ forme, lieu })))
  .sort((a, b) => b.forme.length - a.forme.length);

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Frontières de mot Unicode : \b ne connaît pas les lettres accentuées, et
// « Liège » se terminerait au milieu. Le trait d'union et l'apostrophe font
// partie du nom (« Sint-Niklaas », « Braine-l'Alleud ») : ils ne doivent pas
// servir de frontière, sinon « Gent » serait trouvé dans « Gentbrugge ».
const MOTIF = new RegExp(
  `(?<![\\p{L}\\-'’])(${FORMES.map((f) => echapper(f.forme)).join("|")})(?![\\p{L}\\-'’])`,
  "giu"
);

const PAR_FORME = new Map(FORMES.map(({ forme, lieu }) => [forme.toLocaleLowerCase("fr"), lieu]));

function lieuDe(forme) {
  return PAR_FORME.get(forme.toLocaleLowerCase("fr")) || null;
}

/**
 * Le lieu, réécrit dans la langue du candidat. Ce qui n'est pas dans la table
 * traverse tel quel : « Gent, België » → « Ghent, Belgium » ; « Zaventem » →
 * « Zaventem ».
 * @param {string} texte lieu stocké (jobs.extracted_criteria.location)
 * @param {"fr"|"en"|"nl"} locale langue du parcours candidat
 */
export function nomLieu(texte, locale) {
  if (!texte) return texte;
  return String(texte).replace(MOTIF, (trouve) => lieuDe(trouve)?.[locale] || trouve);
}

/**
 * « à Gand », « en Wallonie », « au Royaume-Uni », « dans le Hainaut ».
 * La préposition n'est ajustée que si le lieu est TOUT le champ : devant
 * « Gand, Belgique », c'est le premier mot qui compte, et c'est une ville.
 * @param {string} lieuFr lieu déjà rendu en français
 */
export function avecPrepositionFr(lieuFr) {
  const lieu = lieuDe(String(lieuFr || "").trim());
  return `${lieu?.fr_prep || "à"} ${lieuFr}`;
}
