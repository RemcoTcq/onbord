import { LEADS_EMAIL } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────────────────────
// La demande de démo : ce que le visiteur a laissé sur /demo, AVANT de choisir
// un créneau. C'est tout l'intérêt de la page : même quelqu'un qui ferme le
// calendrier sans réserver a laissé son nom, son entreprise et son e-mail.
//
// ⚠️ C'EST LA SEULE ROUTE SERVEUR DU SITE, et elle est une exception assumée à
// la règle « pas de serveur, pas de secret » (règle 6 de AGENTS.md). Elle ne
// fait qu'une chose : relayer la demande en e-mail vers LEADS_EMAIL, par
// l'API de Resend, le service qui envoie déjà les e-mails de l'application.
// Pas de base de données, pas de stockage : si l'e-mail ne part pas, la
// demande est perdue, d'où les journaux ci-dessous.
//
// Il lui faut RESEND_API_KEY dans les variables d'environnement du projet
// Vercel du site. Sans elle, la route répond 503 et le formulaire laisse
// quand même passer au calendrier : un visiteur ne doit jamais rester bloqué
// parce que notre notification est en panne.
// ─────────────────────────────────────────────────────────────────────────────

const LIMITE = 120; // caractères par champ : un nom de 500 caractères est un robot
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Échappe une valeur saisie avant de la poser dans le HTML de l'e-mail. */
function html(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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

  const champ = (k) => (typeof donnees[k] === "string" ? donnees[k].trim().slice(0, LIMITE) : "");
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

  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error("[demo] RESEND_API_KEY absente : demande non transmise", { email, entreprise });
    return Response.json({ ok: false, erreur: "config" }, { status: 503 });
  }

  const lignes = [
    ["Name", `${prenom} ${nom}`],
    ["Company", entreprise],
    ["Email", email],
    ["Plan viewed", plan || "none"],
    ["Site language", langue || "en"],
  ];

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Même expéditeur que les notifications de l'application : le domaine
      // est déjà vérifié chez Resend.
      from: "Onbord <notifications@onbord.be>",
      to: [LEADS_EMAIL],
      // Répondre à l'e-mail répond directement au prospect.
      reply_to: email,
      subject: `Demo request: ${prenom} ${nom}, ${entreprise}`,
      text:
        "New demo request from onbord.be/demo.\n" +
        "They may or may not have booked a slot in Calendly yet.\n\n" +
        lignes.map(([k, v]) => `${k}: ${v}`).join("\n"),
      html:
        "<p>New demo request from onbord.be/demo.<br>" +
        "They may or may not have booked a slot in Calendly yet.</p>" +
        "<table cellpadding=\"4\">" +
        lignes.map(([k, v]) => `<tr><td><b>${html(k)}</b></td><td>${html(v)}</td></tr>`).join("") +
        "</table>",
    }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));

  if (!reponse.ok) {
    console.error("[demo] Resend a refusé l'envoi", reponse.status, await reponse.text(), { email, entreprise });
    return Response.json({ ok: false, erreur: "envoi" }, { status: 502 });
  }
  return Response.json({ ok: true });
}
