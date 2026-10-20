import { LEADS_EMAIL } from "@/lib/i18n/config";

// ─────────────────────────────────────────────────────────────────────────────
// L'envoi d'une demande du site vers LEADS_EMAIL (info@onbord.be), partagé
// par les DEUX routes serveur du site : /api/demo (« Book a demo ») et
// /api/simulation (« Get a free simulation »).
//
// Pas de base de données, pas de stockage : la demande part en e-mail par
// l'API de Resend, le service qui envoie déjà les e-mails de l'application,
// et c'est tout. Si l'e-mail ne part pas, la demande est perdue : d'où les
// `console.error` des routes, à lire dans les journaux Vercel.
//
// Il faut RESEND_API_KEY dans les variables d'environnement du projet Vercel
// du site (et dans site/.env.local pour tester en local).
// ─────────────────────────────────────────────────────────────────────────────

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Échappe une valeur saisie avant de la poser dans le HTML de l'e-mail. */
export function html(v) {
  return String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Lit un champ texte du corps de la requête, nettoyé et borné. */
export function lireChamp(donnees, cle, limite) {
  return typeof donnees[cle] === "string" ? donnees[cle].trim().slice(0, limite) : "";
}

/**
 * Envoie la demande. `lignes` : paires [libellé, valeur], affichées en
 * tableau. `extra` : un long bloc de texte facultatif (le texte d'une offre),
 * ajouté sous le tableau.
 *
 * @returns {Promise<{ ok: true } | { ok: false, statut: number, erreur: string }>}
 */
export async function envoyerDemande({ sujet, intro, lignes, extra, replyTo, journal }) {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    console.error(`[${journal}] RESEND_API_KEY absente : demande non transmise`, { replyTo });
    return { ok: false, statut: 503, erreur: "config" };
  }

  const texteExtra = extra ? `\n\n${extra.label}:\n${extra.value}` : "";
  const htmlExtra = extra
    ? `<p><b>${html(extra.label)}</b></p><pre style="white-space:pre-wrap;font-family:inherit">${html(extra.value)}</pre>`
    : "";

  const reponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      // Même expéditeur que les notifications de l'application : le domaine
      // est déjà vérifié chez Resend.
      from: "Onbord <notifications@onbord.be>",
      to: [LEADS_EMAIL],
      // Répondre à l'e-mail répond directement au prospect.
      reply_to: replyTo,
      subject: sujet,
      text: `${intro.join("\n")}\n\n${lignes.map(([k, v]) => `${k}: ${v}`).join("\n")}${texteExtra}`,
      html:
        `<p>${intro.map(html).join("<br>")}</p>` +
        "<table cellpadding=\"4\">" +
        lignes.map(([k, v]) => `<tr><td><b>${html(k)}</b></td><td>${html(v)}</td></tr>`).join("") +
        "</table>" +
        htmlExtra,
    }),
  }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }));

  if (!reponse.ok) {
    console.error(`[${journal}] Resend a refusé l'envoi`, reponse.status, await reponse.text(), { replyTo });
    return { ok: false, statut: 502, erreur: "envoi" };
  }
  return { ok: true };
}
