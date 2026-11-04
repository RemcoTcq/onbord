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
