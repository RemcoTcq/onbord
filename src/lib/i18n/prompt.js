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
//     scénarios CRM) → langue du CANDIDAT (jobs.experience_locale).
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
 * La LANGUE DE LA SCÈNE — une troisième langue dans le contenu candidat, et la
 * seule que le code ne connaît pas : elle se lit dans l'offre.
 *
 * ── Le cas qui l'a fait naître ──────────────────────────────────────────────
 * Une startup belge qui travaille en anglais recrute un Account Executive pour
 * attaquer le marché francophone. Offre en anglais, parcours en anglais — à
 * raison, c'est la langue de l'entreprise. Mais l'objection que le prospect
 * opposait au candidat, l'entreprise qu'il devait prospecter par e-mail : tout
 * était en anglais aussi. On mesurait sa vente en anglais, alors que le poste
 * consiste à vendre en français.
 *
 * D'où deux couches dans une mise en situation. La CONSIGNE (titre, énoncé, ce
 * qu'on attend) reste dans la langue du parcours : c'est ainsi que l'entreprise
 * briefe ses équipes. La SCÈNE — ce que disent les interlocuteurs, et ce à quoi
 * le candidat répond — passe dans la langue du terrain.
 *
 * ── Pourquoi aucun champ en base ────────────────────────────────────────────
 * La langue du terrain n'est pas une propriété qu'on fige à la création de
 * l'offre comme experience_locale : c'est une lecture de son contenu, et un
 * même poste peut viser deux marchés. On la fait lire au modèle, avec les
 * langues exigées sous les yeux (blocOffre, lib/experienceGeneration.js), et la
 * passe de critique vérifie qu'il ne l'a pas ignorée.
 *
 * Placée dans la consigne de langue, en TÊTE de prompt, et pas parmi les règles
 * de conception : c'est une exception à la consigne de langue, elle doit se lire
 * avec elle. Reléguée plus bas, elle perdrait contre « tout le texte destiné au
 * candidat est rédigé en … », marqué prioritaire.
 */
function consigneLangueScene(nomParcours) {
  return `EXCEPTION — LA LANGUE DE LA SCÈNE. Le parcours est en ${nomParcours}, mais le métier ne s'exerce pas forcément en ${nomParcours}. Une entreprise qui travaille en anglais peut recruter un commercial pour attaquer le marché francophone : on le briefe en anglais, mais ses prospects lui parlent français, et c'est en français qu'il devra les convaincre. Mesurer sa vente en anglais, ce serait mesurer autre chose que le poste.

Avant d'écrire, lis dans l'offre — et dans les langues qu'elle exige — la langue dans laquelle le candidat exercera ce qu'on lui fait faire : celle de ses INTERLOCUTEURS (clients, prospects, partenaires, fournisseurs, patients…). Pas celle de l'équipe, ni celle dans laquelle l'offre est rédigée.
- Si c'est la langue du parcours, cette exception ne s'applique pas.
- Si c'en est une autre, sépare deux couches dans chaque mise en situation qui met en scène ces interlocuteurs :
  • LA CONSIGNE reste en ${nomParcours} : le titre, l'énoncé qui pose la scène et dit ce qu'on attend du candidat, les libellés des champs d'une fiche.
  • LA SCÈNE passe dans la langue du terrain : les paroles citées d'un interlocuteur (l'objection qu'il formule, la question qu'il pose — entre guillemets dans l'énoncé), le message client auquel répondre, le contenu des sources et documents remis au candidat, et la fiche du prospect ou du partenaire à contacter — qui il est, où il se trouve, pourquoi l'approcher —, destinataire et objet compris. Cette fiche passe dans la langue du terrain MÊME quand elle a l'air d'un brief interne (le "context" d'un e-mail à écrire) : le candidat doit comprendre la situation dans la langue où il va écrire, c'est une partie de l'épreuve.
  • L'énoncé dit EXPLICITEMENT, en ${nomParcours}, dans quelle langue répondre : le candidat répond dans la langue du terrain, puisque c'est elle que le poste met à l'épreuve.
- Si l'offre vise plusieurs marchés linguistiques (des clients francophones ET néerlandophones, par exemple), répartis les mises en situation entre ces langues.
- Ne l'applique QUE si l'offre le justifie. Une langue seulement « appréciée », ou des interlocuteurs qui parlent la langue du parcours, ne changent rien. Et cette exception ne crée jamais d'étape consacrée à tester la langue : elle habille les mises en situation, elle ne s'évalue pas à part.`;
}

/**
 * Bloc de consigne pour le CONTENU destiné au candidat.
 * À insérer en tête de prompt : une consigne de langue placée après 40 lignes
 * de règles se fait recouvrir par les exemples français qui la précèdent.
 *
 * @param {string} locale langue du parcours candidat (fr|en|nl)
 * @param {{scene?: boolean}} [options] `scene: false` retire l'exception de la
 *   langue de la scène, pour un contenu sans interlocuteur (exercice de code).
 */
export function consigneLangueContenu(locale, { scene = true } = {}) {
  const loc = coerceExperienceLocale(locale);
  const nom = LOCALE_NAMES_FR[loc];
  const exception = scene ? `\n\n${consigneLangueScene(nom)}` : "";

  if (loc === "fr") {
    return `LANGUE DE SORTIE : français. Tous les textes que tu génères sont en français${scene ? ", à l'exception décrite ci-dessous près" : ""}. ${REGISTRE.fr}${exception}`;
  }

  return `LANGUE DE SORTIE — CONSIGNE PRIORITAIRE : ${nom}.

Tout le texte destiné au candidat est rédigé en ${nom} : titres d'étapes, énoncés, briefs de tâche, options de QCM, contenu des sources et des champs dans les mises en situation${scene ? " — à l'exception de la langue de la scène, décrite plus bas" : ""}.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les, et rends le résultat en ${nom}.

Les clés du JSON restent en anglais, telles qu'indiquées dans le schéma — seules les VALEURS textuelles sont en ${nom}. Les identifiants techniques (kind, response_format, sandbox_kind, step_id, identifiants de compétence entre crochets) ne sont jamais traduits.

Rédige en ${nom} naturel et idiomatique, pas en traduction mot à mot depuis le français : le candidat doit lire un texte écrit dans sa langue, pas un texte traduit.

REGISTRE : ${REGISTRE[loc]} Si le schéma JSON plus bas mentionne « vouvoiement », ignore cette mention — elle ne vaut que pour le français.${exception}`;
}

/**
 * Bloc de consigne pour la GÉNÉRATION D'ÉTAPES, qui produit DEUX natures de
 * texte à la fois, pour deux lecteurs différents.
 *
 * ── La règle, énoncée par le produit ────────────────────────────────────────
 * Ce que voit le RECRUTEUR suit la langue de la plateforme (users.ui_locale).
 * Ce que voit le CANDIDAT suit la langue choisie avant l'import de l'offre
 * (jobs.experience_locale). Une étape générée contient les deux.
 *
 * Et le partage n'est pas une question d'appréciation : il est déjà tranché
 * dans le code. `sanitizeStepForCandidate` (lib/actions/run.js) ne laisse
 * partir vers le navigateur du candidat que `title`, `prompt` et `config`.
 * `skill_assessed` et `criteria` (les sous-dimensions et leurs checkpoints)
 * sont RETIRÉS : ce sont des outils de correction, lus dans le tableau de bord
 * et nulle part ailleurs. Ils suivent donc le recruteur.
 *
 * Cas courant : les deux langues coïncident (un recruteur en français qui
 * recrute en français). Le bloc reste alors simple — pas de distinguo à tenir
 * quand il n'y a rien à distinguer — mais il nomme quand même les deux rôles,
 * pour que le schéma puisse y renvoyer sans ambiguïté.
 *
 * @param {string} experienceLocale langue du parcours candidat (fr|en|nl)
 * @param {string} uiLocale langue du dashboard recruteur (fr|en)
 */
export function consigneLangueEtapes(experienceLocale, uiLocale) {
  const candidat = coerceExperienceLocale(experienceLocale);
  const recruteur = coerceUiLocale(uiLocale);
  const nomCandidat = LOCALE_NAMES_FR[candidat];
  const nomRecruteur = LOCALE_NAMES_FR[recruteur];

  // La liste des compétences injectée plus bas dans le prompt vient de
  // l'extraction de l'offre, donc de la langue du RECRUTEUR. Sur les offres
  // analysées avant la correction de l'extraction, elle peut être en français
  // alors que tout le reste ne l'est pas : d'où l'ordre de traduire plutôt que
  // de recopier, qui vaut dans les deux branches.
  const competences = `Le champ "skill_assessed" est repris de la liste des compétences fournie plus bas. Si cette liste est rédigée dans une autre langue que celle attendue pour ce champ, TRADUIS-LA : ne recopie jamais un nom de compétence tel quel. Une compétence laissée dans sa langue d'origine met un titre étranger au-dessus d'une grille qui, elle, est dans la bonne langue — c'est le défaut le plus visible du parcours généré.`;

  if (candidat === recruteur) {
    // L'exception de la scène vient APRÈS le paragraphe sur le recruteur : lu
    // juste derrière elle, « cela vaut aussi pour… » l'aurait étendue aux
    // grilles de correction, qui restent dans la langue du recruteur quoi qu'il arrive.
    const base = candidat === "fr"
      ? `LANGUE DE SORTIE : français. Tout ce que tu génères est en français — ce que lit le candidat ("title", "prompt", contenu de "config") comme ce que lit le recruteur seul ("skill_assessed", "name" des sous-dimensions, "description" des checkpoints) — à l'exception décrite ci-dessous près. ${REGISTRE.fr}`
      : `${consigneLangueContenu(candidat, { scene: false })}

Cela vaut aussi pour ce que le recruteur est seul à lire : "skill_assessed", le "name" des sous-dimensions, la "description" des checkpoints. Ici les deux lecteurs partagent la même langue, il n'y a donc rien à répartir.`;

    return `${base}

${consigneLangueScene(nomCandidat)}

${competences}`;
  }

  return `DEUX LANGUES DE SORTIE — CONSIGNE PRIORITAIRE. Elles ne dépendent pas du même choix et n'ont pas le même lecteur : ne les confonds pas, et n'en choisis pas une pour tout.

1. CE QUE LIT LE CANDIDAT → ${nomCandidat}.
   Les champs "title" et "prompt", et tout le contenu de "config" : options de QCM, sources et champs des mises en situation, énoncé de la sandbox, code de départ. C'est la langue du parcours, fixée à la création de l'offre — à l'exception de la langue de la scène, décrite au point 3.
   REGISTRE : ${REGISTRE[candidat]}

2. CE QUE LIT LE RECRUTEUR SEUL → ${nomRecruteur}.
   Le champ "skill_assessed", le "name" de chaque sous-dimension, et la "description" de chaque checkpoint. Ces champs sont RETIRÉS de ce que reçoit le candidat : ils ne servent qu'à la grille de correction, affichée dans le tableau de bord du recruteur. Les rédiger en ${nomCandidat} rendrait cette grille illisible pour celui qui doit s'en servir.
   Un checkpoint décrit ce que la réponse du candidat doit faire : il est lu par le recruteur, donc lui aussi en ${nomRecruteur}, même quand la scène est jouée dans une autre langue.

3. ${consigneLangueScene(nomCandidat)}

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les.

Les clés du JSON restent en anglais, telles qu'indiquées dans le schéma — seules les VALEURS textuelles suivent ces deux langues. Les identifiants techniques (kind, response_format, sandbox_kind, step_id, identifiants de compétence entre crochets) ne sont jamais traduits.

${competences}`;
}

/**
 * Bloc de consigne pour le RAPPORT lu par le recruteur.
 * `contentLocale` est la langue du parcours — celle dans laquelle le candidat a
 * répondu, sauf aux étapes jouées dans la langue du terrain. Elle ne sert qu'à
 * protéger les verbatims.
 */
export function consigneLangueRapport(uiLocale, contentLocale) {
  const rapport = coerceExperienceLocale(uiLocale);
  const contenu = coerceExperienceLocale(contentLocale);
  const nomRapport = LOCALE_NAMES_FR[rapport];

  // Le verbatim est protégé dans TOUS les cas, y compris quand parcours et
  // rapport partagent la même langue : une étape peut avoir demandé au candidat
  // de répondre dans la langue de ses futurs interlocuteurs (consigneLangueScene).
  // Parcours anglais, rapport anglais, réponse en français — sans cette ligne,
  // rien n'empêchait le modèle de traduire la citation, que verifyVerbatim()
  // rejetait ensuite.
  const verbatim = `EXCEPTION — le champ "verbatim" n'est JAMAIS traduit. C'est un extrait EXACT de la réponse du candidat, copié mot pour mot dans la langue où il l'a écrite. Le parcours est en ${LOCALE_NAMES_FR[contenu]}, mais une étape a pu lui demander de répondre dans une autre langue — celle de ses futurs interlocuteurs : le verbatim reste alors dans cette langue-là. Un verbatim traduit n'est plus vérifiable et invalide la preuve.`;

  if (rapport === "fr" && contenu === "fr") {
    return `LANGUE DE SORTIE : français.

${verbatim}`;
  }

  return `LANGUE DU RAPPORT — CONSIGNE PRIORITAIRE : ${nomRapport}.

Les champs "observations", "justification" (y compris celle de chaque checkpoint) et "summary" sont rédigés en ${nomRapport}, quelle que soit la langue dans laquelle le candidat a répondu. Ce rapport est lu par un recruteur, pas par le candidat.

${verbatim}`;
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
 * ── La langue est TRANCHÉE EN AMONT, elle n'est plus déduite ────────────────
 * Deux versions ont échoué avant celle-ci, et pour des raisons opposées.
 * La première épinglait la conversation sur users.ui_locale : un recruteur en
 * interface française qui écrivait en anglais se faisait répondre en français,
 * à chaque tour. La seconde a corrigé le tir en demandant au modèle de suivre
 * « la langue du dernier message » — et le français est revenu, parce que le
 * dernier message n'est pas toujours celui du recruteur : après une génération,
 * c'est un tool_result que NOTRE client rédige en français.
 *
 * On ne demande donc plus au modèle de déduire quoi que ce soit. La langue est
 * calculée serveur à partir des seuls messages humains du fil
 * (lib/i18n/detection.js) et arrive ici déjà tranchée : `locale` est la langue
 * dans laquelle répondre, point. Le paramètre n'est plus un défaut.
 *
 * Même mécanique que l'assistant du candidat (api/run/assistant), pour la même
 * raison. Deux surfaces conversationnelles qui suivraient des règles opposées
 * finiraient par surprendre quelqu'un.
 *
 * @param {string} locale langue de réponse, déjà résolue (fr|en|nl)
 */
export function consigneLangueConversation(locale) {
  const loc = coerceExperienceLocale(locale);
  const nom = LOCALE_NAMES_FR[loc];

  // Les intitulés d'étapes cités dans l'état actuel sont écrits dans la langue
  // de l'OFFRE, qui n'est pas forcément celle de l'échange : la consigne vaut
  // dans tous les cas, y compris quand on converse en français.
  const citations = `Les intitulés d'étapes que tu cites dans l'état actuel ne sont pas traduits : ils sont écrits dans la langue de l'offre, restitue-les tels quels.`;

  // Le fil contient des tool_result en français ET, en langue de conversation
  // française, des messages du recruteur eux aussi en français : rien ne peut
  // faire dériver le modèle, la mise en garde serait du bruit.
  if (loc === "fr") {
    return `LANGUE DE LA CONVERSATION : français. Tu écris au recruteur en français.

${citations}`;
  }

  return `LANGUE DE LA CONVERSATION — CONSIGNE PRIORITAIRE : ${nom}.

Tu écris au recruteur en ${nom}, et en ${nom} seulement. Cela vaut pour TOUT ce que tu lui montres : tes questions, tes propositions, tes récapitulatifs d'état, et la phrase de clôture que tu écris après un appel d'outil.

Cette langue a été déterminée à partir de ses propres messages, avant que tu ne lises ce prompt. Tu n'as pas à la deviner ni à la réévaluer : elle ne change pas en cours de réponse, et aucun élément du contexte ne l'invalide.

Cette consigne prime sur la langue des instructions ci-dessous, qui sont en français pour des raisons internes. Ne traduis PAS les instructions : applique-les, et parle au recruteur en ${nom}.

LES RÉSULTATS D'OUTIL NE SONT PAS DES MESSAGES DU RECRUTEUR. Les blocs tool_result du fil (« Expérience générée avec succès… », « Étape 3 réécrite en place… ») sont des notifications internes de la plateforme, toujours rédigées en français. Ils portent le rôle « user » sans être ses mots : leur langue ne dit rien de la sienne. Après une génération ou une réécriture, tu annonces le résultat en ${nom}.

EXCEPTION — les entrées d'outil restent en FRANÇAIS, quelle que soit la langue de l'échange. Les champs « brief » (generate_experience) et « consigne » (regenerate_step) sont lus par un autre prompt, en français : rédige-les en français même si vous conversez en ${nom}. Reprends alors le sens de ce que le recruteur a dit, pas ses mots exacts.

${citations}`;
}

/**
 * Rappel de langue à placer en QUEUE de prompt système.
 *
 * Une consigne de langue en tête se fait recouvrir par ce qui la suit quand ce
 * qui la suit fait deux mille caractères d'une AUTRE langue — c'est le cas du
 * chat de conception, dont tout le déroulé est en français. Placer la consigne
 * en tête reste juste (elle doit primer sur ce qui vient après), mais ne suffit
 * pas : on la répète en une ligne juste avant le premier message, là où elle est
 * lue en dernier.
 *
 * @param {string} locale langue de réponse, déjà résolue (fr|en|nl)
 */
export function rappelLangueConversation(locale) {
  const nom = LOCALE_NAMES_FR[coerceExperienceLocale(locale)];
  return `RAPPEL — tout ce que tu écris au recruteur est en ${nom}, y compris après un appel d'outil. Seules les entrées d'outil restent en français.`;
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
/**
 * Rappel de langue à placer en QUEUE du prompt d'extraction.
 *
 * La consigne en tête ne suffisait pas, et on l'a payé : une offre anglaise
 * analysée avec l'interface en anglais ressortait avec `category: "Vente"` et
 * des compétences en français. Deux causes, toutes deux corrigées :
 *   • le schéma JSON portait des exemples de valeurs EN FRANÇAIS (« ex: Vente,
 *     Engineering, Finance »), et le modèle les recopiait tels quels — c'est
 *     littéralement « Vente » qui sortait ;
 *   • entre la consigne et les champs qu'elle gouverne, il y a cinquante lignes
 *     de schéma en français. La dernière ligne lue pèse le plus au moment de
 *     rédiger, et ce n'était pas la consigne.
 *
 * Même remède que pour les chats : la langue est nommée en tête, marquée sur
 * chaque champ concerné, et rappelée en queue.
 *
 * @param {string} uiLocale langue du dashboard recruteur (fr|en)
 * @param {string} contentLocale langue du poste (fr|en|nl)
 */
export function rappelLangueExtraction(uiLocale, contentLocale) {
  const ui = coerceUiLocale(uiLocale);
  const contenu = coerceExperienceLocale(contentLocale);
  const nomUi = LOCALE_NAMES_FR[ui];
  const nomContenu = LOCALE_NAMES_FR[contenu];

  const invariants = `Les valeurs d'énumération ("role_type", "contract_type", "education_level", "priority", le "name" des langues) et le champ "evidence" échappent à cette règle : elles ne se traduisent jamais.`;

  if (ui === contenu) {
    return `RAPPEL DE LANGUE — tout le texte libre que tu produis est rédigé en ${nomUi} : "title", "category", "sub_family", "clean_description", et le "name" des compétences comme des critères de sélection. Aucun mot français ne doit subsister dans ces champs si ${nomUi} n'est pas le français.

${invariants}`;
  }

  return `RAPPEL DE LANGUE — deux langues, ne les confonds pas :
  • "title" et "clean_description" en ${nomContenu} ;
  • "category", "sub_family", le "name" des compétences et des critères de sélection en ${nomUi}.

${invariants}`;
}

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
