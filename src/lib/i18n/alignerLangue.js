// La langue du PROFIL suit la langue dans laquelle on utilise la plateforme
// (17/11/2026).
//
// users.ui_locale décide de la langue des textes écrits SANS lecteur devant
// l'écran : le rapport d'un candidat, rédigé à la notation (lib/runScoring.js),
// le retour d'un essai d'onboarding. Mais l'interface, elle, suit l'adresse
// (/fr/…, /en/…) et un cookie : un compte créé en admin, ou arrivé par un lien
// en /fr, pouvait lire la plateforme en français et recevoir ses rapports en
// anglais (Remco, 17/11). Les layouts des deux espaces connectés appellent
// donc cette fonction : une seule requête, qui n'écrit que si la langue a changé.

import { UI_LOCALES } from "./config";

export async function alignerLangueProfil(supabase, userId, lang) {
  if (!supabase || !userId || !UI_LOCALES.includes(lang)) return;
  const { error } = await supabase
    .from("users").update({ ui_locale: lang })
    .eq("id", userId).or(`ui_locale.is.null,ui_locale.neq.${lang}`);
  if (error) console.error("alignerLangueProfil :", error.message);
}
