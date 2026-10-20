import { EMAIL, envoyerDemande, lireChamp } from "@/lib/leads";

// ─────────────────────────────────────────────────────────────────────────────
// La demande de simulation gratuite : ce que le visiteur a laissé sur
// /free-simulation (20/10/2026). Son offre d'emploi, en lien ou en texte, et
// de quoi le recontacter. L'équipe construit la simulation à partir de cette
// offre et revient vers lui sous 24 heures (promesse affichée sur la page).
//
// ⚠️ La seconde route serveur du site, avec /api/demo : même exception à la
// règle 6 de AGENTS.md, même mécanique (src/lib/leads.js). Pas de stockage :
// la demande part en e-mail vers LEADS_EMAIL, et c'est tout.
//
// À la différence de la démo, un échec d'envoi n'est PAS silencieux : il n'y a
// pas de calendrier derrière qui rattraperait la demande. Le formulaire
// affiche alors l'adresse à laquelle envoyer l'offre à la main.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE = 120;          // nom, entreprise, e-mail, téléphone
const LIMITE_LIEN = 600;     // une URL d'offre peut être longue (paramètres de suivi)
const LIMITE_TEXTE = 20000;  // le texte collé d'une offre, largement

export async function POST(request) {
  let donnees;
  try {
    donnees = await request.json();
  } catch {
    return Response.json({ ok: false, erreur: "format" }, { status: 400 });
  }

  // Le piège à robots, comme sur /api/demo.
  if (donnees.website) return Response.json({ ok: true });

  const champ = (k) => lireChamp(donnees, k, LIMITE);
  const prenom = champ("firstName");
  const nom = champ("lastName");
  const entreprise = champ("company");
  const email = champ("email");
  const telephone = champ("phone");
  const plan = champ("plan");
  const langue = champ("locale");
  const lien = lireChamp(donnees, "postingUrl", LIMITE_LIEN);
  const texte = lireChamp(donnees, "postingText", LIMITE_TEXTE);

  if (!prenom || !nom || !entreprise || !email) {
    return Response.json({ ok: false, erreur: "manquant" }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return Response.json({ ok: false, erreur: "email" }, { status: 400 });
  }
  // L'offre est le seul champ qui compte vraiment : sans elle, il n'y a rien
  // à construire. Un lien OU un texte.
  if (!lien && !texte) {
    return Response.json({ ok: false, erreur: "offre" }, { status: 400 });
  }

  const r = await envoyerDemande({
    journal: "simulation",
    sujet: `Free simulation request: ${prenom} ${nom}, ${entreprise}`,
    intro: [
      "New free simulation request from onbord.be/free-simulation.",
      "The page promises an answer within 24 hours.",
    ],
    lignes: [
      ["Name", `${prenom} ${nom}`],
      ["Company", entreprise],
      ["Email", email],
      ["Phone", telephone || "not given"],
      ["Job posting link", lien || "none, text pasted below"],
      ["Plan viewed", plan || "none"],
      ["Site language", langue || "en"],
    ],
    extra: texte ? { label: "Job posting (pasted)", value: texte } : null,
    replyTo: email,
  });
  if (!r.ok) return Response.json({ ok: false, erreur: r.erreur }, { status: r.statut });
  return Response.json({ ok: true });
}
