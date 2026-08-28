// Contrôles de langue : détection dans les chats, et marquage des champs dans
// le prompt d'extraction d'offre.
//
//   node scripts/check-langue.mjs
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

import { readFileSync } from "node:fs";
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

// ─── Marquage des champs du prompt d'extraction ──────────────────────────────
// Contrôle de TEXTE, volontairement : charger le module demanderait de résoudre
// l'alias "@/" hors de Next, ce qui n'a pas sa place dans un hook. Ce qu'on
// vérifie tient de toute façon à la lettre du prompt.
//
// L'histoire : le schéma portait des exemples de valeurs écrits en dur en
// français (« ex: Vente, Engineering, Finance »), et le modèle les recopiait
// pour une offre anglaise analysée en interface anglaise — « category » sortait
// à « Vente ». La consigne de langue en tête ne pesait rien face à cinquante
// lignes de schéma français. Chaque champ porte donc désormais sa langue, et
// c'est cette marque que l'on vérifie ici : la retirer ramène le bug.
const SOURCE_EXTRACTION = join(RACINE, "src", "lib", "jobExtractionPrompt.js");
const texteExtraction = readFileSync(SOURCE_EXTRACTION, "utf8");

// Champ → variable de langue qui doit apparaître sur sa ligne.
const CHAMPS_MARQUES = [
  ["title", "nomContenu"],
  ["clean_description", "nomContenu"],
  ["category", "nomUi"],
  ["sub_family", "nomUi"],
  ["hard_skills.name", "nomUi"],
  ["soft_skills.name", "nomUi"],
  ["selection_criteria.name", "nomUi"],
];

// On raisonne ligne à ligne : c'est la ligne du champ qui doit porter la marque,
// pas le fichier en général. Et on ne reconnaît qu'une DÉCLARATION de champ du
// schéma (`"clé":` en début de ligne) — sinon on tombe sur la prose qui cite
// « clean_description » plus haut, qui n'a évidemment pas à porter de langue.
const lignes = texteExtraction.split(/\r?\n/);
const estDeclaration = (ligne, cle) => new RegExp(`^\\s*(\\{\\s*)?"${cle}"\\s*:`).test(ligne);

const ligneDuChamp = (champ) => {
  if (!champ.includes(".")) return lignes.find((l) => estDeclaration(l, champ));

  // Champ imbriqué : la clé du tableau ouvre, l'objet suit sur les lignes
  // d'après. On ne cherche la sous-clé que dans cette fenêtre.
  const [cle, sousCle] = champ.split(".");
  const debut = lignes.findIndex((l) => estDeclaration(l, cle));
  if (debut === -1) return undefined;
  return lignes.slice(debut, debut + 4).find((l) => estDeclaration(l, sousCle));
};

for (const [champ, variable] of CHAMPS_MARQUES) {
  const ligne = ligneDuChamp(champ);
  if (!ligne) echec(`prompt d'extraction — champ "${champ}" introuvable dans le schéma`);
  else if (!ligne.includes(`\${${variable}}`)) {
    echec(`prompt d'extraction — le champ "${champ}" ne porte plus sa langue (\${${variable}} attendu sur sa ligne)`);
  }
}

// ─── Répartition candidat / recruteur dans la génération d'étapes ────────────
// La règle du produit : ce que voit le recruteur suit la langue de la
// plateforme, ce que voit le candidat suit la langue choisie avant l'import.
// Une étape générée porte les deux, et le partage n'est pas discutable — il est
// déjà fait par sanitizeStepForCandidate, qui retire skill_assessed et les
// grilles BARS de ce qui part vers le navigateur du candidat.
//
// On vérifie que la consigne à deux langues nomme bien chaque champ. En oublier
// un le fait basculer du côté du candidat par défaut, et le recruteur récupère
// une grille de correction dans une langue qu'il ne lit pas.
const texteConsignes = readFileSync(join(RACINE, "src", "lib", "i18n", "prompt.js"), "utf8");
const blocEtapes = texteConsignes.slice(
  texteConsignes.indexOf("export function consigneLangueEtapes"),
  texteConsignes.indexOf("export function consigneLangueRapport")
);

if (!blocEtapes) {
  echec("consigneLangueEtapes introuvable dans lib/i18n/prompt.js");
} else {
  const ATTENDUS = [
    ['"title"', "champ candidat"],
    ['"prompt"', "champ candidat"],
    ['"config"', "champ candidat"],
    ['"skill_assessed"', "champ recruteur"],
    ["sous-dimension", "champ recruteur"],
    ["BARS", "champ recruteur"],
  ];
  for (const [marque, role] of ATTENDUS) {
    if (!blocEtapes.includes(marque)) {
      echec(`consigneLangueEtapes ne mentionne plus ${marque} (${role}) : ce champ n'est plus réparti`);
    }
  }
}

if (problemes === 0) {
  console.log(
    `✓ langue — ${TEXTES.length} messages et ${FILS.length} fils de chat, ` +
    `${CHAMPS_MARQUES.length} champs d'extraction marqués, ` +
    `répartition candidat/recruteur vérifiée`
  );
} else {
  console.error(`\n${problemes} problème(s). La langue de sortie des prompts est compromise.`);
  process.exit(1);
}
