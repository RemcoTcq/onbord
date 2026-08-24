// Consigne de langue de sortie pour les prompts IA.
//
// ── Pourquoi les prompts restent en français ────────────────────────────────
// Les prompts de génération et de scoring sont longs, finement calibrés, et
// leur formulation porte des garde-fous durement acquis (interdiction des
// questions rétrospectives, règles anti-biais des QCM, obligation de verbatim).
// Les traduire, c'est rejouer ce calibrage trois fois et risquer de perdre en
// route un garde-fou qui ne se voit qu'à l'usage.
//
// Or le modèle n'a aucun besoin qu'on lui parle dans la langue de sortie : il
// lit des instructions en français et rédige en néerlandais sans difficulté.
// On ajoute donc une consigne de langue, et rien d'autre.
//
// ── Les deux langues ne sortent pas au même endroit ─────────────────────────
//   • CONTENU DE L'EXPÉRIENCE (titres d'étapes, énoncés, options de QCM,
//     ancres BARS, scénarios CRM) → langue du CANDIDAT (jobs.experience_locale).
//   • RAPPORT DE SCORING (justifications, synthèse) → langue du RECRUTEUR
//     (users.ui_locale). C'est un outil de décision interne : un recruteur
//     anglophone doit pouvoir lire le rapport d'un candidat néerlandophone.
//
// Le verbatim fait exception et reste dans la langue du candidat : c'est une
// citation exacte, la traduire la rendrait invérifiable — et le prompt de
// scoring exige justement que le verbatim soit une sous-chaîne réelle de la
// réponse.

import { LOCALE_NAMES_FR, coerceExperienceLocale, coerceUiLocale } from "./config";

// Registre d'adresse au candidat, par langue. Le schéma des prompts porte la
// mention « (vouvoiement) », qui n'a de sens qu'en français : appliquée telle
// quelle au néerlandais elle produirait du « u », trop formel pour un parcours
// de recrutement en Belgique, et en anglais elle n'a aucun équivalent.
const REGISTRE = {
  fr: "Vouvoie le candidat.",
  en: "Address the candidate directly as \"you\", in a warm and professional tone.",
  nl: "Spreek de kandidaat aan met « je / jij », niet met « u » : het register is warm en professioneel, niet formeel.",
};

/**
 * Bloc de consigne pour le CONTENU destiné au candidat.
 * À insérer en tête de prompt : une consigne de langue placée après 40 lignes
 * de règles se fait recouvrir par les exemples français qui la précèdent.
 */
export function consigneLangueContenu(locale) {
  const loc = coerceExperienceLocale(locale);
  const nom = LOCALE_NAMES_FR[loc];

  if (loc === "fr") {
    return `LANGUE DE SORTIE : français. Tous les textes que tu génères sont en français. ${REGISTRE.fr}`;
  }

  return `LANGUE DE SORTIE — CONSIGNE PRIORITAIRE : ${nom}.

Tout le texte destiné au candidat est rédigé en ${nom} : titres d'étapes, énoncés, briefs de tâche, options de QCM, libellés et descriptions des ancres BARS, contenu des sources et des champs dans les mises en situation.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les, et rends le résultat en ${nom}.

Les clés du JSON restent en anglais, telles qu'indiquées dans le schéma — seules les VALEURS textuelles sont en ${nom}. Les identifiants techniques (kind, response_format, sandbox_kind, step_id) ne sont jamais traduits.

Rédige en ${nom} naturel et idiomatique, pas en traduction mot à mot depuis le français : le candidat doit lire un texte écrit dans sa langue, pas un texte traduit.

REGISTRE : ${REGISTRE[loc]} Si le schéma JSON plus bas mentionne « vouvoiement », ignore cette mention — elle ne vaut que pour le français.`;
}

/**
 * Bloc de consigne pour le RAPPORT lu par le recruteur.
 * `contentLocale` est la langue dans laquelle le candidat a répondu — elle sert
 * uniquement à protéger les verbatims.
 */
export function consigneLangueRapport(uiLocale, contentLocale) {
  const rapport = coerceExperienceLocale(uiLocale);
  const contenu = coerceExperienceLocale(contentLocale);
  const nomRapport = LOCALE_NAMES_FR[rapport];

  if (rapport === "fr" && contenu === "fr") {
    return `LANGUE DE SORTIE : français.`;
  }

  const base = `LANGUE DU RAPPORT — CONSIGNE PRIORITAIRE : ${nomRapport}.

Les champs "justification" et "summary" sont rédigés en ${nomRapport}, quelle que soit la langue dans laquelle le candidat a répondu. Ce rapport est lu par un recruteur, pas par le candidat.`;

  if (contenu === rapport) return base;

  return `${base}

EXCEPTION — le champ "verbatim" n'est JAMAIS traduit. Le candidat a répondu en ${LOCALE_NAMES_FR[contenu]} : le verbatim doit rester un extrait EXACT de sa réponse, copié mot pour mot, donc en ${LOCALE_NAMES_FR[contenu]}. Un verbatim traduit n'est plus vérifiable et invalide la preuve.`;
}

/**
 * Bloc de consigne pour une CONVERSATION avec le recruteur (chat de conception).
 *
 * Troisième cas, distinct des deux précédents : ici le modèle ne produit ni du
 * contenu candidat, ni un rapport, mais un dialogue. Et il produit AUSSI des
 * entrées d'outil (`brief`, `consigne`) qui repartent vers les prompts de
 * génération, lesquels sont en français. D'où la double consigne : parle au
 * recruteur dans sa langue, mais rédige les entrées d'outil en français.
 *
 * Sans cette séparation, un recruteur anglophone obtiendrait un brief anglais
 * inséré dans un prompt français — ce qui marche, mais fait dériver le
 * calibrage du générateur sans qu'on puisse le constater.
 */
export function consigneLangueConversation(uiLocale) {
  // coerceUiLocale, pas coerceExperienceLocale : le chat suit la langue du
  // recruteur, qui ne peut être que fr ou en. Le néerlandais est une langue
  // de parcours candidat, jamais une langue de dashboard.
  const loc = coerceUiLocale(uiLocale);
  if (loc === "fr") return `LANGUE DE SORTIE : français.`;

  const nom = LOCALE_NAMES_FR[loc];
  return `LANGUE DE LA CONVERSATION — CONSIGNE PRIORITAIRE : ${nom}.

Tu t'adresses au recruteur en ${nom} : toutes tes réponses visibles sont en ${nom}, y compris les questions que tu poses et les récapitulatifs d'état.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les, et réponds en ${nom}.

EXCEPTION — les entrées d'outil restent en FRANÇAIS. Les champs « brief » (generate_experience) et « consigne » (regenerate_step) sont lus par un autre prompt, en français : rédige-les en français même si l'échange se déroule en ${nom}. Reprends alors le sens de ce que le recruteur a dit, pas ses mots exacts.

Les intitulés d'étapes que tu cites dans l'état actuel ne sont pas traduits : ils sont écrits dans la langue de l'offre, restitue-les tels quels.`;
}
