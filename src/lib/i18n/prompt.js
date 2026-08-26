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
 *
 * ── La langue d'interface est un DÉFAUT, pas une consigne ───────────────────
 * La version précédente épinglait la conversation sur users.ui_locale : un
 * recruteur en interface française qui écrivait en anglais se faisait répondre
 * en français, à chaque tour. C'est un dialogue, pas un document — on suit son
 * interlocuteur. La langue d'interface ne sert plus qu'à deux choses : ouvrir
 * la conversation, et trancher quand le message ne dit rien de sa langue
 * (« ok », « parfait », un lien collé).
 *
 * Même règle que l'assistant du candidat (api/run/assistant), pour la même
 * raison. Deux surfaces conversationnelles qui suivraient des règles opposées
 * finiraient par surprendre quelqu'un.
 */
export function consigneLangueConversation(uiLocale) {
  // coerceUiLocale, pas coerceExperienceLocale : la langue PAR DÉFAUT est celle
  // du dashboard, qui ne peut être que fr ou en. Le recruteur reste libre
  // d'écrire dans n'importe quelle langue, et d'être suivi.
  const nom = LOCALE_NAMES_FR[coerceUiLocale(uiLocale)];

  return `LANGUE DE LA CONVERSATION — CONSIGNE PRIORITAIRE.

Tu réponds au recruteur DANS LA LANGUE DE SON DERNIER MESSAGE. S'il t'écrit en anglais, tu réponds en anglais ; en néerlandais, en néerlandais. Cela vaut pour tout ce que tu lui montres : tes questions, tes propositions, tes récapitulatifs d'état.

Sa langue par défaut est le ${nom} : c'est celle dans laquelle tu ouvres la conversation, et celle vers laquelle tu reviens quand son message ne permet pas de trancher (« ok », « parfait », un lien collé).

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les.

EXCEPTION — les entrées d'outil restent en FRANÇAIS, quelle que soit la langue de l'échange. Les champs « brief » (generate_experience) et « consigne » (regenerate_step) sont lus par un autre prompt, en français : rédige-les en français même si vous conversez en anglais. Reprends alors le sens de ce que le recruteur a dit, pas ses mots exacts.

Les intitulés d'étapes que tu cites dans l'état actuel ne sont pas traduits : ils sont écrits dans la langue de l'offre, restitue-les tels quels.`;
}

/**
 * Bloc de consigne pour l'EXTRACTION des critères d'une offre.
 *
 * Quatrième cas. L'extraction produit deux natures de champ, et elles ne
 * suivent pas la même règle :
 *
 *   • les VALEURS D'ÉNUMÉRATION (role_type, contract_type, education_level,
 *     priority, noms de langues) sont des données stockées, comparées à des
 *     `value=` écrits en dur dans le formulaire. Elles restent en français,
 *     toujours, quelle que soit la langue de l'offre ou du recruteur — sinon
 *     le <select> ne retrouve pas la valeur et le recruteur perd en silence
 *     ce que l'IA vient d'extraire ;
 *   • le TEXTE DE L'OFFRE ELLE-MÊME — "title" et "clean_description" — suit la
 *     LANGUE DU POSTE (jobs.experience_locale, choisie avant l'analyse). Ce
 *     sont les mots de l'offre, pas une lecture qu'on en fait : un poste
 *     anglais résumé en français produisait une offre bâtarde, et le titre est
 *     de surcroît affiché au candidat.
 *   • le RESTE DU TEXTE LIBRE (category, sub_family, noms de compétences, noms
 *     des critères de sélection) suit la langue d'INTERFACE du recruteur. Ce
 *     sont des étiquettes de classement et de filtrage, qu'il est seul à lire —
 *     même raison que le rapport de scoring.
 *
 * L'evidence fait exception et reste dans la langue de l'offre : c'est une
 * citation exacte, et le prompt exige qu'elle soit un extrait réel du texte.
 * Même règle que le verbatim du scoring, pour la même raison.
 *
 * @param {string} uiLocale langue du dashboard recruteur (fr|en)
 * @param {string} contentLocale langue du poste (fr|en|nl)
 */
export function consigneLangueExtraction(uiLocale, contentLocale) {
  const ui = coerceUiLocale(uiLocale);
  const contenu = coerceExperienceLocale(contentLocale);
  const nomUi = LOCALE_NAMES_FR[ui];
  const nomContenu = LOCALE_NAMES_FR[contenu];

  const valeurs = `LES VALEURS D'ÉNUMÉRATION NE SE TRADUISENT JAMAIS. Les champs "role_type", "contract_type", "education_level", "priority" et le "name" des langues doivent être repris MOT POUR MOT dans la liste française imposée plus bas, même si l'offre est rédigée dans une autre langue. Une offre anglaise qui exige l'anglais donne "Anglais", pas "English" ; un Master donne "Master", jamais "Bac+5" ni "Master's degree".`;

  const evidence = `EXCEPTION — le champ "evidence" n'est JAMAIS traduit. C'est une citation exacte de l'offre, copiée mot pour mot : elle reste dans la langue dans laquelle l'offre a été écrite. Une evidence traduite n'est plus vérifiable.`;

  // Les deux langues coïncident : une seule consigne, sans distinguo à tenir.
  if (ui === contenu) {
    if (ui === "fr") return `LANGUE DE SORTIE : français.\n\n${evidence}\n\n${valeurs}`;
    return `LANGUE DE SORTIE — CONSIGNE PRIORITAIRE : ${nomUi}.

Tout le texte libre que tu produis est rédigé en ${nomUi}.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les, et rends le résultat en ${nomUi}.

${evidence}

${valeurs}`;
  }

  return `LANGUES DE SORTIE — CONSIGNE PRIORITAIRE. Deux champs suivent une langue, tous les autres en suivent une seconde. Ne les confonds pas.

1. LANGUE DU POSTE — ${nomContenu}. Rédige en ${nomContenu} : "title" et "clean_description". Ce sont les mots de l'offre elle-même — le poste est publié dans cette langue et le titre est affiché au candidat. Les rédiger dans une autre langue produirait une offre bâtarde, quelle que soit la langue de l'offre brute qu'on te donne à lire.

2. LANGUE DU RECRUTEUR — ${nomUi}. Rédige en ${nomUi} : "category", "sub_family", le "name" des compétences et le "name" des critères de sélection. Ce sont des étiquettes de classement, lues par le recruteur seul dans son interface.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les.

${evidence}

${valeurs}`;
}
