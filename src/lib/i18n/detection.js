// Langue d'un ÉCHANGE conversationnel, tranchée SERVEUR.
//
// ── Pourquoi ne pas laisser le modèle s'en charger ───────────────────────────
// La consigne « réponds dans la langue du dernier message » a l'air suffisante.
// Elle ne l'est pas, et deux choses la contredisent en permanence :
//
//   • le prompt système fait deux mille caractères de FRANÇAIS — déroulé,
//     descriptions d'outils, état de l'expérience. Face à trois mots d'anglais
//     (« make it shorter »), cette masse l'emporte souvent ;
//
//   • après un appel d'outil, le dernier message du fil n'est PAS du recruteur :
//     c'est un tool_result rédigé en français par le client (« Expérience
//     générée avec succès… », « Étape 3 réécrite en place… »). Appliquée à la
//     lettre, la consigne ramenait alors la conversation au français —
//     exactement au moment le plus visible, la phrase de clôture qui suit une
//     génération, et pour tout le reste de l'échange ensuite.
//
// On tranche donc ici, en JavaScript, et on donne au modèle une langue plutôt
// qu'une règle : « LANGUE DE LA CONVERSATION : anglais ». Il n'a plus rien à
// déduire, et la masse de français du prompt n'a plus de prise.
//
// ── Ce que la détection regarde ──────────────────────────────────────────────
// Les mots-outils, pas le sens : articles, pronoms, auxiliaires, prépositions.
// Ce sont les mots les plus fréquents d'une langue et les plus rares dans les
// autres — deux ou trois suffisent à trancher une phrase courte.
//
// Les mots AMBIGUS entre deux langues couvertes sont volontairement absents des
// listes (« is », « was », « in », « of », « we » : anglais ET néerlandais ;
// « de », « en », « je » : français ET néerlandais ; « a », « on », « son »,
// « question », « change », « juste » : français ET anglais). Un mot qui ne
// tranche pas ne doit pas peser, sinon il ajoute du bruit des deux côtés.

const MOTS = {
  fr: [
    // Sans « je » : c'est aussi un pronom NÉERLANDAIS (« kun je… »), et il
    // faisait voter le français pour des phrases entièrement néerlandaises.
    "tu", "il", "elle", "ils", "elles", "nous", "vous", "lui", "leur", "leurs",
    "le", "la", "les", "un", "une", "des", "du", "au", "aux",
    "ce", "cet", "cette", "ces", "celui", "celle", "ceux",
    "mon", "ma", "mes", "ton", "ta", "tes", "sa", "ses", "notre", "nos", "votre", "vos",
    "et", "mais", "donc", "car", "ni", "que", "qui", "quoi", "dont",
    "où", "quand", "comment", "pourquoi", "parce",
    "pour", "avec", "sans", "dans", "sur", "sous", "chez", "vers", "entre",
    "depuis", "pendant", "selon", "ainsi", "alors",
    "est", "sont", "était", "étaient", "suis", "sommes", "êtes", "être",
    "ai", "avez", "avons", "ont", "avoir",
    "fait", "faire", "fais", "faut", "peut", "peux", "pouvez", "pouvoir",
    "veux", "veut", "voulez", "dois", "doit", "devez", "vais", "allez",
    "mettre", "mets", "rends", "rendre", "ajoute", "ajouter", "modifie", "modifier",
    "supprime", "supprimer", "refais", "refaire", "garde", "garder",
    "écris", "écrire", "dire", "montre", "montrer", "reprends",
    "pas", "plus", "très", "bien", "aussi", "encore", "tout", "tous", "toute", "toutes",
    "trop", "moins", "déjà", "jamais", "toujours", "beaucoup", "vraiment", "plutôt",
    "ça", "cela", "oui", "non", "merci", "bonjour", "salut", "plaît",
    "étape", "étapes", "énoncé", "offre", "poste", "candidat", "candidats",
    "entretien", "langue", "français", "anglais", "néerlandais",
  ],
  en: [
    "the", "are", "were", "been", "being", "be", "am",
    "i", "you", "your", "yours", "he", "she", "it", "its", "they", "them", "their",
    "this", "that", "these", "those", "and", "but", "or",
    "to", "for", "with", "without", "from", "about", "into", "under",
    "after", "before", "between", "during", "an",
    "have", "has", "had", "do", "does", "did", "done",
    "can", "could", "would", "should", "will", "shall", "must", "may", "might",
    "need", "needs", "want", "wants", "make", "makes",
    "please", "thanks", "thank", "hello", "hi", "yes", "no",
    "what", "which", "who", "whom", "when", "where", "why", "how", "whose",
    "not", "more", "most", "very", "really", "quite", "also", "too", "again",
    "still", "always", "never", "only", "much", "many", "some", "any", "every",
    "each", "all", "both", "other", "another",
    "step", "steps", "answer", "tone", "shorter", "longer", "harder", "easier",
    "rewrite", "generate", "add", "remove", "keep", "write", "show", "tell",
    "let", "get", "give", "know", "think", "look", "see",
    "english", "french", "dutch",
  ],
  nl: [
    "het", "een", "ik", "jij", "jou", "jouw", "uw", "wij", "zij", "hun", "hen",
    "deze", "dit", "dat", "die", "niet", "geen",
    "wat", "wie", "waar", "hoe", "waarom", "wanneer", "welke",
    "met", "voor", "naar", "om", "tot", "door", "uit", "bij", "aan", "van",
    "zijn", "ben", "bent", "waren", "heb", "hebt", "heeft", "hebben",
    "kan", "kunt", "kunnen", "moet", "moeten", "wil", "willen", "mag", "zou", "zal",
    "graag", "dank", "bedankt", "alsjeblieft", "hallo", "hoi", "ja", "nee",
    "nog", "wel", "ook", "maar", "als", "dan", "omdat",
    "andere", "meer", "minder", "altijd", "nooit", "alleen", "heel", "erg",
    "goed", "beter", "korter", "langer",
    "vraag", "vragen", "stap", "stappen", "opdracht", "kandidaat",
    "taal", "nederlands", "engels", "frans",
    "schrijf", "maak", "verander", "voeg",
  ],
};

const ENSEMBLES = Object.fromEntries(
  Object.entries(MOTS).map(([locale, mots]) => [locale, new Set(mots)])
);

// Accents que le français est seul à porter parmi les trois langues couvertes.
// Volontairement sans « ë » ni « ï », que le néerlandais écrit aussi
// (coördinatie, geïnteresseerd) : ils feraient voter le néerlandais pour du
// français. Le poids est de UN point, pas davantage — un message anglais qui
// cite un intitulé d'étape français ne doit pas basculer pour autant.
const ACCENTS_FR = /[éèêàâçôûùœ]/;

// Ce qu'un interlocuteur CITE n'est pas ce qu'il écrit. Le cas est fréquent et
// pas anecdotique : le recruteur reprend un intitulé d'étape pour désigner
// celle qu'il veut retoucher (« shorten « Analyse du besoin client » please »),
// et cet intitulé est rédigé dans la langue de l'OFFRE, pas dans la sienne.
// Compté avec le reste, il annulait le vote et renvoyait une égalité.
// Seuls les guillemets qui ouvrent et ferment sont retirés — jamais l'apostrophe
// simple, qui est une lettre de plus en français (« l'étape »), pas une citation.
const CITATIONS = /«[^»]*»|"[^"]*"|“[^”]*”|`[^`]*`/g;

/**
 * Langue d'un texte, parmi celles proposées. `null` quand rien ne tranche —
 * « ok », « parfait », un lien collé, un bout de code.
 *
 * La règle de décision est volontairement stricte : la langue gagnante doit
 * être SEULE en tête. Une égalité rend `null`, et l'appelant retombe alors sur
 * sa valeur par défaut plutôt que de jouer à pile ou face.
 */
export function detecterLangue(texte, langues) {
  if (typeof texte !== "string" || !texte.trim()) return null;

  const candidates = (Array.isArray(langues) ? langues : []).filter((l) => ENSEMBLES[l]);
  if (candidates.length < 2) return null;

  const propre = texte.replace(CITATIONS, " ");
  const tokens = propre.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
  if (!tokens.length) return null;

  const scores = new Map(candidates.map((l) => [l, 0]));
  for (const token of tokens) {
    for (const locale of candidates) {
      if (ENSEMBLES[locale].has(token)) scores.set(locale, scores.get(locale) + 1);
    }
  }
  if (scores.has("fr") && ACCENTS_FR.test(propre)) scores.set("fr", scores.get("fr") + 1);

  const classement = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [gagnante, meilleur] = classement[0];
  const second = classement[1][1];
  if (meilleur === 0 || meilleur === second) return null;
  return gagnante;
}

/**
 * Texte réellement écrit par l'humain dans un message de fil.
 *
 * Les blocs `tool_result` sont écartés SANS EXCEPTION : ils portent le rôle
 * `user` dans le format Anthropic, mais ce ne sont pas ses mots — ce sont des
 * notifications rédigées en français par notre propre client. Les prendre pour
 * des messages du recruteur est précisément le bug que ce module corrige.
 */
function texteHumain(message) {
  if (!message || message.role !== "user") return "";
  const contenu = message.content;
  if (typeof contenu === "string") return contenu;
  if (!Array.isArray(contenu)) return "";
  return contenu
    .filter((bloc) => bloc?.type === "text")
    .map((bloc) => bloc.text || "")
    .join(" ")
    .trim();
}

/**
 * Langue dans laquelle répondre à un interlocuteur, d'après ce qu'il a écrit.
 *
 * On remonte le fil jusqu'au dernier message QUI TRANCHE, au lieu de ne
 * regarder que le dernier. C'est ce qui donne sa continuité à l'échange : un
 * « ok » au milieu d'une conversation anglaise n'y ramène pas le français, il
 * n'apprend simplement rien et laisse parler le message d'avant. Le défaut ne
 * sert que quand rien, dans tout le fil, ne permet de trancher — au premier
 * tour, typiquement.
 *
 * @param {Array} messages fil au format Anthropic (content string ou blocs)
 * @param {{langues: string[], defaut: string}} options
 */
export function langueDeConversation(messages, { langues, defaut }) {
  const fil = Array.isArray(messages) ? messages : [];
  for (let i = fil.length - 1; i >= 0; i--) {
    const verdict = detecterLangue(texteHumain(fil[i]), langues);
    if (verdict) return verdict;
  }
  return defaut;
}
