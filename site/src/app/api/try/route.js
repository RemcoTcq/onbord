import { EMAIL, envoyerDemande, lireChamp } from "@/lib/leads";

// ─────────────────────────────────────────────────────────────────────────────
// « Try it now », le pop-up du hero de l'accueil (05/11/2026, demande
// directe) : prénom, nom, e-mail, et la FICHE DE POSTE EN FICHIER,
// obligatoire. L'équipe construit la simulation à partir de cette fiche et
// ouvre au visiteur son environnement privé sous 24 heures (promesse affichée
// à l'envoi).
//
// ⚠️ La troisième route serveur du site, avec /api/demo et /api/simulation :
// même exception à la règle 6 de AGENTS.md, même mécanique (src/lib/leads.js).
// Pas de stockage : la demande part en e-mail vers LEADS_EMAIL, la fiche de
// poste en pièce jointe, et c'est tout.
//
// Elle reçoit un `multipart/form-data` et non du JSON, à cause du fichier.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE = 120;
// ⚠️ 4 Mo, et pas plus : Vercel refuse un corps de requête au-delà de 4,5 Mo,
// et la route ne verrait jamais la demande. Le pop-up vérifie la même limite
// avant d'envoyer (ESSAI_MAX_OCTETS dans TryModal.js).
const LIMITE_FICHIER = 4 * 1024 * 1024;
const EXTENSIONS = ["pdf", "doc", "docx", "txt", "rtf", "odt"];

export async function POST(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, erreur: "format" }, { status: 400 });
  }

  // Le piège à robots, comme sur les deux autres routes.
  if (form.get("website")) return Response.json({ ok: true });

  const donnees = Object.fromEntries(
    ["firstName", "lastName", "email", "locale"].map((k) => [k, form.get(k) ?? ""]),
  );
  const champ = (k) => lireChamp(donnees, k, LIMITE);
  const prenom = champ("firstName");
  const nom = champ("lastName");
  const email = champ("email");
  const langue = champ("locale");

  if (!prenom || !nom || !email) {
    return Response.json({ ok: false, erreur: "manquant" }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return Response.json({ ok: false, erreur: "email" }, { status: 400 });
  }

  // La fiche de poste est le seul champ qui compte vraiment : sans elle, il
  // n'y a rien à construire.
  const fichier = form.get("jobDescription");
  if (!fichier || typeof fichier === "string" || !fichier.size) {
    return Response.json({ ok: false, erreur: "fichier" }, { status: 400 });
  }
  if (fichier.size > LIMITE_FICHIER) {
    return Response.json({ ok: false, erreur: "taille" }, { status: 400 });
  }
  const extension = (fichier.name.split(".").pop() || "").toLowerCase();
  if (!EXTENSIONS.includes(extension)) {
    return Response.json({ ok: false, erreur: "type" }, { status: 400 });
  }
  // Le nom du fichier part dans l'e-mail : on le borne et on le nettoie.
  const nomFichier = fichier.name.replace(/[^\w.\- ]+/g, "_").slice(-120);

  const r = await envoyerDemande({
    journal: "try",
    sujet: `Try it now: ${prenom} ${nom}`,
    intro: [
      "New \"Try it now\" request from the onbord.be home page.",
      "The visitor was told: access to their private environment within 24 hours.",
      "Their job description is attached.",
    ],
    lignes: [
      ["Name", `${prenom} ${nom}`],
      ["Email", email],
      ["Job description", nomFichier],
      ["Site language", langue || "en"],
    ],
    piecesJointes: [
      { filename: nomFichier, content: Buffer.from(await fichier.arrayBuffer()).toString("base64") },
    ],
    replyTo: email,
  });
  if (!r.ok) return Response.json({ ok: false, erreur: r.erreur }, { status: r.statut });
  return Response.json({ ok: true });
}
