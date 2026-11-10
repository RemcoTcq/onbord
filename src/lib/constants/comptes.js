// Réglages des comptes créés par invitation — lus par le serveur
// (lib/actions/equipe.js, qui applique) ET par l'écran d'acceptation (qui
// annonce). Un seul chiffre, pour qu'ils ne divergent pas.

// 10 caractères, et non les 6 de Supabase laissés sur /join (audit d'août, S5).
export const MOT_DE_PASSE_MIN = 10;
