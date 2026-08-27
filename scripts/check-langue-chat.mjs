// Contrôle de la détection de langue des chats.
//
//   node scripts/check-langue-chat.mjs
//
// Pourquoi un contrôle et pas un simple essai à la main : lib/i18n/detection.js
// est une liste de mots. Une liste de mots, ça se complète — et le jour où
// quelqu'un ajoute « je » au français (c'est aussi un pronom néerlandais) ou
// « is » à l'anglais (c'est aussi du néerlandais), plus rien ne le signale.
// Le bug ne réapparaît qu'à l'usage, sur une conversation d'un client.
//
// Le cas le plus important du fichier est le dernier : une conversation
// anglaise suivie du tool_result FRANÇAIS que le client insère après une
// génération. C'est le scénario exact qui ramenait la conversation au français,
// deux corrections de suite.
//
// Sort en code 1 au premier écart — utilisable en CI ou en pre-commit.

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const { detecterLangue, langueDeConversation } = await import(
  pathToFileURL(join(RACINE, "src", "lib", "i18n", "detection.js")).href
);

const UI = ["fr", "en"];          // surface recruteur : fr | en
const EXP = ["fr", "en", "nl"];   // surface candidat : fr | en | nl

// [texte, langues candidates, verdict attendu] — null = « ne tranche pas »,
// l'appelant retombe alors sur sa langue par défaut.
const TEXTES = [
  // Recruteur, anglais.
  ["Can you make step 3 shorter and more direct?", UI, "en"],
  ["make it harder", UI, "en"],
  ["I want a sales role for a B2B SaaS company, the typical client is a CFO", UI, "en"],
  ["regenerate step 1", UI, "en"],
  ["yes", UI, "en"],
  ["Thanks!", UI, "en"],

  // Recruteur, français.
  ["Modifie l'énoncé de l'étape 2, ton plus direct", UI, "fr"],
  ["Rends l'etape 3 plus courte", UI, "fr"],   // sans accents : la détection ne doit pas en dépendre
  ["Le client type est un DRH d'une PME de 50 personnes", UI, "fr"],
  ["oui", UI, "fr"],
  ["Merci !", UI, "fr"],

  // Un intitulé d'étape cité ne vote pas : il est écrit dans la langue de
  // l'OFFRE, qui n'est pas forcément celle du recruteur.
  ["shorten « Analyse du besoin client » please", UI, "en"],
  ["raccourcis « Handling a difficult client » s'il te plaît", UI, "fr"],

  // Rien à en tirer : on ne devine pas, on laisse le défaut décider.
  ["ok", UI, null],
  ["parfait", UI, null],
  ["https://example.com/job/1234", UI, null],
  ["const x = [1,2,3].map(f)", EXP, null],

  // Candidat : le néerlandais existe sur cette surface, et pas sur l'autre.
  ["Kun je stap 2 korter maken?", EXP, "nl"],
  ["Ik wil graag een vraag over klantcontact", EXP, "nl"],
  ["What is the best way to structure this answer?", EXP, "en"],
  ["Comment je dois structurer ma réponse ?", EXP, "fr"],

  // Le même message néerlandais côté RECRUTEUR, où le néerlandais n'est pas
  // candidat : il ne doit pas être pris pour du français.
  ["Kun je stap 2 korter maken?", UI, null],
];

// [libellé, fil, langues, défaut, attendu]
const FIL_ANGLAIS = [
  { role: "assistant", content: [{ type: "text", text: "Let's design the screening experience together." }] },
  { role: "user", content: [{ type: "text", text: "I need a B2B sales screening, the client is a CFO" }] },
  { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "generate_experience", input: { brief: "…" } }] },
  { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "Expérience générée avec succès. L'écran de relecture est maintenant ouvert pour le recruteur." }] },
];

const FILS = [
  ["conversation anglaise + tool_result français", FIL_ANGLAIS, UI, "fr", "en"],
  ["… puis « ok » du recruteur", [...FIL_ANGLAIS, { role: "user", content: [{ type: "text", text: "ok" }] }], UI, "fr", "en"],
  ["fil vide, interface anglaise", [], UI, "en", "en"],
  ["fil vide, interface française", [], UI, "fr", "fr"],
  ["message candidat en clair (content string)", [{ role: "user", content: "hoe moet ik dit aanpakken?" }], EXP, "fr", "nl"],
];

let problemes = 0;
const echec = (msg) => { console.error(`✗ ${msg}`); problemes++; };

for (const [texte, langues, attendu] of TEXTES) {
  const obtenu = detecterLangue(texte, langues);
  if (obtenu !== attendu) {
    echec(`« ${texte} » [${langues.join("|")}] → ${obtenu ?? "aucune"}, attendu ${attendu ?? "aucune"}`);
  }
}

for (const [libelle, fil, langues, defaut, attendu] of FILS) {
  const obtenu = langueDeConversation(fil, { langues, defaut });
  if (obtenu !== attendu) echec(`${libelle} → ${obtenu}, attendu ${attendu}`);
}

if (problemes === 0) {
  console.log(`✓ détection de langue — ${TEXTES.length} messages, ${FILS.length} fils vérifiés`);
} else {
  console.error(`\n${problemes} problème(s). La détection de langue des chats est cassée.`);
  process.exit(1);
}
