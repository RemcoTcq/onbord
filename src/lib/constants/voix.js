// Voix des personnages IA en appel — module SERVEUR (la clé et le choix de la
// voix ne quittent jamais le serveur).
//
// ── Le choix d'une voix ─────────────────────────────────────────────────────
// Un personnage a une langue (fr, nl, en…), un accent (BE, FR, NL, GB, US…) et
// un genre (f, m). Pour un client belge, l'accent n'est pas un détail : un DAF
// gantois qui parle avec l'accent d'Amsterdam sonne faux dès la première phrase.
//
// Les voix flamandes et belges viennent de la bibliothèque ElevenLabs : on les
// ajoute à « My Voices » sur le compte, puis on recopie leur identifiant dans
// les variables d'environnement ci-dessous (ELEVENLABS_VOICE_NL_BE_F, etc.).
// Aucune n'est écrite en dur : changer de voix ne demande pas de déploiement de
// code, seulement de variable.
//
// Repli, dans l'ordre : la voix exacte (langue + accent + genre) → la même
// langue et le même genre, quel que soit l'accent → une voix multilingue de
// base d'ElevenLabs, du bon genre. Le modèle Flash v2.5 lui fait parler la
// langue demandée (language_code), avec un accent neutre.

export const MODELE_VOIX = process.env.ELEVENLABS_MODEL || "eleven_flash_v2_5";

// Voix multilingues de base d'ElevenLabs — le dernier repli.
const VOIX_DE_BASE = {
  f: "EXAVITQu4vr4xnSDxMaL", // Sarah
  m: "JBFqnCBsd6RMkjVDRZzb", // George
};

// Combinaisons configurables : ELEVENLABS_VOICE_<LANGUE>_<ACCENT>_<GENRE>.
const COMBINAISONS = [
  "NL_BE", "NL_NL", "FR_BE", "FR_FR", "EN_GB", "EN_US", "DE_DE", "ES_ES", "IT_IT",
];

function voixEnv(langue, accent, genre) {
  const cle = `ELEVENLABS_VOICE_${langue}_${accent}_${genre}`.toUpperCase();
  return process.env[cle] || null;
}

/**
 * Les voix réellement configurées, par langue et accent : { "nl-BE": ["m"], … }.
 * Seules les combinaisons EXACTES comptent : une Flamande lue par une voix
 * néerlandaise des Pays-Bas sonne faux, même si la langue est la bonne.
 */
export function voixParAccent() {
  const out = {};
  for (const c of COMBINAISONS) {
    const [langue, accent] = c.split("_");
    const genres = ["F", "M"].filter((g) => voixEnv(langue, accent, g)).map((g) => g.toLowerCase());
    if (genres.length) out[`${langue.toLowerCase()}-${accent}`] = genres;
  }
  return out;
}

/**
 * Consigne pour la conception d'un personnage : le genre suit les voix
 * disponibles. S'il n'existe qu'une voix masculine flamande, le client gantois
 * est un homme — et son prénom aussi. Chaîne vide si aucune voix n'est
 * configurée (le genre reste alors libre).
 */
export function consigneVoix() {
  const dispo = voixParAccent();
  const lignes = Object.entries(dispo).map(([cle, genres]) => {
    const quoi = genres.length === 2 ? "homme ou femme" : genres[0] === "m" ? "homme UNIQUEMENT" : "femme UNIQUEMENT";
    return `   - ${cle} : ${quoi}`;
  });
  if (!lignes.length) return "";
  return `VOIX DISPONIBLES POUR L'APPEL — "language" + "accent" + "gender" doivent correspondre à l'une d'elles :
${lignes.join("\n")}
   Si la langue et l'accent de la scène n'offrent qu'un genre, le personnage est de ce genre, et son prénom le dit. Si la scène impose une langue absente de cette liste, garde-la : une voix neutre sera utilisée.`;
}

/**
 * La voix de base du genre du personnage. Sert aussi de repli quand ElevenLabs
 * refuse une voix de la bibliothèque : l'offre gratuite ne les autorise pas via
 * l'API (« paid_plan_required », constaté le 07/10/2026).
 */
export function voixDeBase(persona) {
  return VOIX_DE_BASE[persona?.gender === "m" ? "m" : "f"];
}

/** ElevenLabs est-il configuré ? Sinon, l'appel garde la voix du navigateur. */
export function voixDisponible() {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * L'identifiant de voix ElevenLabs d'un personnage.
 * @param {{language?: string, accent?: string, gender?: string, voice_id?: string}} persona
 */
export function voixDuPersonnage(persona) {
  // Une voix choisie par le recruteur dans l'éditeur l'emporte sur tout.
  if (persona?.voice_id) return persona.voice_id;
  const langue = String(persona?.language || "fr").slice(0, 2).toUpperCase();
  const accent = String(persona?.accent || "").toUpperCase();
  const genre = persona?.gender === "m" ? "M" : "F";

  if (accent) {
    const exacte = voixEnv(langue, accent, genre);
    if (exacte) return exacte;
  }
  // Même langue et même genre, quel que soit l'accent — en commençant par
  // l'accent belge, le marché d'Onbord.
  const accents = COMBINAISONS.filter((c) => c.startsWith(`${langue}_`)).map((c) => c.split("_")[1])
    .sort((a, b) => (b === "BE") - (a === "BE"));
  for (const a of accents) {
    const v = voixEnv(langue, a, genre);
    if (v) return v;
  }
  return VOIX_DE_BASE[genre.toLowerCase()];
}
