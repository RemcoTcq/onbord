// Les indications de jeu de la voix ElevenLabs (17/11/2026) — module PUR,
// testé par tests/indications-jeu.test.mjs.
//
// La voix Realtime glisse dans ses répliques des indications entre crochets,
// toujours en anglais (« [impatient] », « [sighs] ») : elle les JOUE, elle ne
// les prononce pas. Affichées telles quelles dans la transcription en direct,
// elles juraient avec un appel mené en néerlandais (Remco, 17/11). Une
// indication connue s'affiche donc traduite dans la langue de l'appel, entre
// parenthèses — « (ongeduldig) » ; une inconnue disparaît. La transcription
// enregistrée, celle que lisent le correcteur et le recruteur, n'en garde
// aucune (lib/realtimeAppel.js).

const INDICATIONS = {
  impatient: { fr: "impatient", nl: "ongeduldig", en: "impatient" },
  impatiently: { fr: "impatient", nl: "ongeduldig", en: "impatient" },
  annoyed: { fr: "agacé", nl: "geïrriteerd", en: "annoyed" },
  irritated: { fr: "agacé", nl: "geïrriteerd", en: "irritated" },
  frustrated: { fr: "frustré", nl: "gefrustreerd", en: "frustrated" },
  angry: { fr: "en colère", nl: "boos", en: "angry" },
  skeptical: { fr: "sceptique", nl: "sceptisch", en: "skeptical" },
  sceptical: { fr: "sceptique", nl: "sceptisch", en: "sceptical" },
  suspicious: { fr: "méfiant", nl: "wantrouwig", en: "suspicious" },
  hesitant: { fr: "hésitant", nl: "aarzelend", en: "hesitant" },
  curious: { fr: "curieux", nl: "nieuwsgierig", en: "curious" },
  interested: { fr: "intéressé", nl: "geïnteresseerd", en: "interested" },
  thoughtful: { fr: "pensif", nl: "nadenkend", en: "thoughtful" },
  thinking: { fr: "réfléchit", nl: "denkt na", en: "thinking" },
  surprised: { fr: "surpris", nl: "verrast", en: "surprised" },
  relieved: { fr: "soulagé", nl: "opgelucht", en: "relieved" },
  pleased: { fr: "satisfait", nl: "tevreden", en: "pleased" },
  satisfied: { fr: "satisfait", nl: "tevreden", en: "satisfied" },
  happy: { fr: "content", nl: "blij", en: "happy" },
  excited: { fr: "enthousiaste", nl: "enthousiast", en: "excited" },
  friendly: { fr: "aimable", nl: "vriendelijk", en: "friendly" },
  warm: { fr: "chaleureux", nl: "hartelijk", en: "warm" },
  serious: { fr: "sérieux", nl: "serieus", en: "serious" },
  firm: { fr: "ferme", nl: "kordaat", en: "firm" },
  calm: { fr: "calme", nl: "kalm", en: "calm" },
  confused: { fr: "perplexe", nl: "verward", en: "confused" },
  sarcastic: { fr: "sarcastique", nl: "sarcastisch", en: "sarcastic" },
  tired: { fr: "fatigué", nl: "moe", en: "tired" },
  rushed: { fr: "pressé", nl: "gehaast", en: "rushed" },
  hurried: { fr: "pressé", nl: "gehaast", en: "hurried" },
  sighs: { fr: "soupire", nl: "zucht", en: "sighs" },
  sigh: { fr: "soupire", nl: "zucht", en: "sighs" },
  laughs: { fr: "rit", nl: "lacht", en: "laughs" },
  chuckles: { fr: "rit doucement", nl: "grinnikt", en: "chuckles" },
  "clears throat": { fr: "se racle la gorge", nl: "schraapt de keel", en: "clears throat" },
  pause: { fr: "pause", nl: "pauze", en: "pause" },
};

const net = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

/**
 * La réplique telle qu'elle s'affiche : chaque indication connue traduite dans
 * `langue` (fr, nl, en ; anglais à défaut) et mise entre parenthèses, les
 * autres retirées.
 */
export function afficherIndications(texte, langue) {
  const code = ["fr", "nl", "en"].includes(langue) ? langue : "en";
  return net(String(texte ?? "").replace(/\[([^\]\n]{1,40})\]/g, (_, brut) => {
    const t = INDICATIONS[net(brut).toLowerCase()];
    return t ? ` (${t[code]}) ` : " ";
  }));
}
