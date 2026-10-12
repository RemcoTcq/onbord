// Drapeaux de fonctionnalités — bascule douce vers la refonte "Experience" (V1).
//
// EXPERIENCE_V1_ONLY : quand true, l'UI recruteur héritée (catégorie C) est
// MASQUÉE — onglets Pipelines/Évaluations du détail d'offre, configuration
// CV/vidéo/QCM. Le code et les tables héritées restent en place (dormants) :
// remettre ce flag à false restaure l'ancienne UI sans autre changement.
// Le retrait définitif du code mort se fera dans un second temps.
export const EXPERIENCE_V1_ONLY = true;

// Mises en situation EN PAUSE (décision de Remco, 12/10/2026). L'IA ne les
// propose plus, et elles disparaissent du choix de format dans l'éditeur. Les
// simulations qui en contiennent déjà continuent de s'afficher, de se jouer et
// d'être notées : rien n'est supprimé, et retirer un type de cette liste le
// rétablit partout.
//   code : l'exercice de programmation, en attente de l'IDE réel.
//   crm  : un faux CRM teste la maîtrise d'un outil plus que le jugement ; ce
//          qu'il mesurait de bon (prioriser un pipeline, repérer une info
//          contradictoire) passe par le tableur et la boîte de réception.
export const SANDBOXES_EN_PAUSE = ["code", "crm"];

export function enPause(sandboxKind) {
  return SANDBOXES_EN_PAUSE.includes(sandboxKind);
}
