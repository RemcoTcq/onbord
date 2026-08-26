// Réglages par défaut d'une expérience candidat.
//
// Ils vivent ici, et pas en littéral dans le code, parce qu'ils sont lus à DEUX
// endroits qui doivent s'accorder : le serveur qui applique le plafond, et
// l'éditeur recruteur qui affiche la valeur retenue quand rien n'est configuré.
// La divergence s'est déjà produite — l'écran annonçait un chiffre, le serveur
// en appliquait un autre.

/**
 * Nombre d'échanges avec l'assistant IA autorisés par étape, quand le recruteur
 * n'a rien fixé (`config.ai_max_messages`).
 *
 * 15, et pas davantage : au-delà, l'exercice cesse de mesurer ce qu'il prétend
 * mesurer — on n'observe plus comment le candidat cadre un problème, mais
 * combien de temps il peut tâtonner. Une préselection de 5 à 20 minutes n'a de
 * toute façon pas la place pour cinquante allers-retours.
 */
export const DEFAUT_ECHANGES_IA = 15;
