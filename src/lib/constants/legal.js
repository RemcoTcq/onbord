/**
 * Pages légales publiques.
 *
 * ── Pourquoi des URL absolues ────────────────────────────────────────────────
 * Ces pages ne sont PAS servies par cette application : `next build` ne déclare
 * aucune route /legal. Elles vivent sur le site public onbord.be. Un chemin
 * relatif (« /legal/terms ») pointerait donc vers l'hôte du parcours candidat —
 * localhost en développement, l'hôte de déploiement en préproduction — et
 * renverrait un 404 au candidat, au moment précis où on lui demande d'accepter
 * ce qu'il ne pourrait pas lire.
 *
 * ── Où elles servent ─────────────────────────────────────────────────────────
 * L'écran de consentement du parcours candidat (CandidateOnboardingFlow, étape
 * 4). Les trois liens y ouvraient `href="#"`, c'est-à-dire rien.
 *
 * Elles s'ouvrent dans un nouvel onglet (voir LIEN_LEGAL_PROPS) : le candidat
 * est au milieu de son parcours, avec des cases cochées qui ne sont pas encore
 * enregistrées. Le sortir de la page lui ferait tout reprendre.
 */
export const LIENS_LEGAUX = {
  /** Transparence sur l'usage de l'IA dans l'évaluation. */
  transparenceIA: "https://onbord.be/legal/ai-transparency",
  /** Conditions générales d'utilisation. */
  conditions: "https://onbord.be/legal/terms",
  /** Politique de confidentialité (RGPD). */
  confidentialite: "https://onbord.be/legal/privacy",
};

/**
 * Attributs à poser sur tout lien vers une page légale.
 * `noopener noreferrer` va avec `_blank` : sans lui, la page ouverte garde une
 * référence sur celle du parcours et peut la faire naviguer ailleurs.
 */
export const LIEN_LEGAL_PROPS = { target: "_blank", rel: "noopener noreferrer" };
