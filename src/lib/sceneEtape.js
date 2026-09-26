// La SCÈNE d'une étape — ce qu'une mise en situation met sous les yeux du
// candidat EN PLUS de l'énoncé : le message du client auquel il répond, la
// fiche du prospect à qui il écrit, le contexte du document qu'il rédige.
//
// ── Pourquoi un module à part ───────────────────────────────────────────────
// Ce matériau vit dans `config`, et chaque lecteur de l'étape l'ignorait à sa
// façon : le correcteur (lib/runScoring.js) et l'assistant du candidat
// (api/run/assistant) ne recevaient que l'énoncé, et la page du candidat
// n'affichait que le message client — la fiche d'un e-mail et le contexte d'un
// document étaient générés, stockés, et lus par personne. Le correcteur notait
// donc un e-mail de prospection sans savoir à qui il était adressé.
//
// Un seul endroit décrit la scène, pour que tous ceux qui la lisent lisent la
// même chose que le candidat : ni plus (pas le corrigé d'un CRM), ni moins.
//
// Les sources d'une fiche CRM n'en font pas partie : elles ont leur propre
// rendu côté candidat (CrmSandbox) et côté correcteur (crmTrapBriefing), qui
// sait ce qu'il ne doit pas dévoiler.
//
// Les libellés sont en français : ce texte n'entre que dans des prompts, qui le
// sont tous. Les valeurs, elles, restent dans la langue où la scène est jouée.

function net(v) {
  return String(v ?? "").trim();
}

// L'objet d'un e-mail à écrire est parfois généré comme un emplacement à
// remplir (« [To be written by the candidate] ») : ce n'est pas un objet, et
// l'afficher au candidat lui ferait croire qu'on attend ce texte-là.
export function objetEmailReel(subject) {
  const s = net(subject);
  return s && !/^\[.*\]$/.test(s) ? s : "";
}

/**
 * Les éléments de la scène d'une étape, dans l'ordre où le candidat les lit.
 * @param {object} config `experience_steps.config`
 * @returns {{libelle: string, texte: string}[]}
 */
export function elementsScene(config) {
  const c = config || {};
  return [
    { libelle: "Message de l'interlocuteur", texte: net(c.client_message) },
    { libelle: "Destinataire de l'e-mail", texte: net(c.to) },
    { libelle: "Objet de l'e-mail", texte: objetEmailReel(c.subject) },
    { libelle: "Contexte remis au candidat", texte: net(c.context) },
    { libelle: "Contexte du document", texte: net(c.document_context) },
  ].filter((e) => e.texte);
}

/**
 * La scène en texte, prête à insérer dans un prompt. Chaîne vide s'il n'y en a
 * pas — l'appelant n'a rien à tester.
 * @param {object} config
 * @param {string} [retrait] préfixe de chaque ligne
 */
export function sceneEnTexte(config, retrait = "") {
  return elementsScene(config)
    .map((e) => `${retrait}${e.libelle} : ${e.texte.replace(/\s*\n\s*/g, " / ")}`)
    .join("\n");
}
