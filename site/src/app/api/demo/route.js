import { EMAIL, envoyerDemande, lireChamp } from "@/lib/leads";

// ─────────────────────────────────────────────────────────────────────────────
// La demande de démo : ce que le visiteur a laissé sur /demo, AVANT de choisir
// un créneau. C'est tout l'intérêt de la page : même quelqu'un qui ferme le
// calendrier sans réserver a laissé son nom, son entreprise et son e-mail.
//
// ⚠️ L'une des DEUX routes serveur du site (avec /api/simulation), exceptions
// assumées à la règle « pas de serveur, pas de secret » (règle 6 de
// AGENTS.md). Elle ne fait que relayer la demande en e-mail : voir
// src/lib/leads.js, partagé par les deux.
//
// Sans RESEND_API_KEY, la route répond 503 et le formulaire laisse quand même
// passer au calendrier : un visiteur ne doit jamais rester bloqué parce que
// notre notification est en panne.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE = 120; // caractères par champ : un nom de 500 caractères est un robot

export async function POST(request) {
  let donnees;
  try {
    donnees = await request.json();
  } catch {
    return Response.json({ ok: false, erreur: "format" }, { status: 400 });
  }

  // Le piège à robots : un champ invisible pour un humain. S'il est rempli, on
  // répond « ok » sans rien envoyer, pour ne pas apprendre au robot qu'il a
  // été repéré.
  if (donnees.website) return Response.json({ ok: true });

  const champ = (k) => lireChamp(donnees, k, LIMITE);
  const prenom = champ("firstName");
  const nom = champ("lastName");
  const entreprise = champ("company");
  const email = champ("email");
  const plan = champ("plan");
  const langue = champ("locale");

  if (!prenom || !nom || !entreprise || !email) {
    return Response.json({ ok: false, erreur: "manquant" }, { status: 400 });
  }
  if (!EMAIL.test(email)) {
    return Response.json({ ok: false, erreur: "email" }, { status: 400 });
  }

  const r = await envoyerDemande({
    journal: "demo",
    sujet: `Demo request: ${prenom} ${nom}, ${entreprise}`,
    intro: ["New demo request from onbord.be/demo.", "They may or may not have booked a slot in Calendly yet."],
    lignes: [
      ["Name", `${prenom} ${nom}`],
      ["Company", entreprise],
      ["Email", email],
      ["Plan viewed", plan || "none"],
      ["Site language", langue || "en"],
    ],
    replyTo: email,
  });
  if (!r.ok) return Response.json({ ok: false, erreur: r.erreur }, { status: r.statut });
  return Response.json({ ok: true });
}
