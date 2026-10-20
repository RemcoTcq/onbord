import { CONTACT_EMAIL } from "./i18n/config";
import { href } from "./i18n/routes";

// ─────────────────────────────────────────────────────────────────────────────
// Tous les appels à l'action du site aboutissent ICI, et c'est une décision,
// pas un raccourci.
//
// L'inscription publique de l'application est FERMÉE : les comptes sont créés à
// la main depuis /admin. Un bouton « Choisir Core » qui pointerait vers un
// formulaire d'inscription enverrait donc le visiteur dans un mur — le pire
// endroit où se casser, juste après avoir décidé d'acheter.
//
// Un simple `mailto:` est le plus court chemin qui fonctionne vraiment
// aujourd'hui. Le jour où un formulaire de demande de démo existe (page de
// contact, Cal.com, Tally…), c'est le SEUL fichier à changer : rien d'autre
// dans le site ne connaît l'adresse de destination.
// ─────────────────────────────────────────────────────────────────────────────

const SUJETS = {
  fr: {
    demo: "Demande de démo Onbord",
    plan: "Demande de démo Onbord, offre",
    offre: "Une offre d'emploi à transformer en simulation",
    parler: "Parler à quelqu'un d'Onbord",
  },
  nl: {
    demo: "Demoaanvraag Onbord",
    plan: "Demoaanvraag Onbord, plan",
    offre: "Een vacature om in een simulatie om te zetten",
    parler: "Iemand spreken bij Onbord",
  },
  en: {
    demo: "Onbord demo request",
    plan: "Onbord demo request, plan",
    offre: "A job posting to turn into a simulation",
    parler: "Talking to someone at Onbord",
  },
};

/**
 * Lien « Get a free simulation » (20/10/2026) : L'APPEL PRINCIPAL DU SITE.
 * Le visiteur envoie une offre sur /free-simulation, l'équipe en construit la
 * simulation gratuitement et revient vers lui sous 24 heures. La démo
 * (`demoHref`) passe en second, pour qui veut parler d'abord.
 * @param {string} locale
 * @param {string} [plan]  le plan regardé sur /pricing, s'il y en a un.
 */
export function simulationHref(locale, plan) {
  const base = href("/free-simulation", locale);
  return plan ? `${base}?plan=${encodeURIComponent(plan)}` : base;
}

/**
 * Lien de demande de démo.
 * @param {string} locale  fr | nl | en
 * @param {string} [plan]  identifiant du plan quand la demande part d'une carte
 *                         de tarif : le sujet de l'e-mail le mentionne, ce qui
 *                         évite un aller-retour pour savoir ce que la personne
 *                         regardait.
 */
export function demoHref(locale, plan) {
  // ⚠️ Ce n'est plus un mailto : la demande passe par la page /demo, qui
  // recueille les coordonnees AVANT d'ouvrir le calendrier (voir
  // DemoForm.js). Le plan suit en parametre, et part avec la demande.
  const base = href("/demo", locale);
  return plan ? `${base}?plan=${encodeURIComponent(plan)}` : base;
}

/**
 * Un e-mail « voici une offre » tout prêt, vers CONTACT_EMAIL. Il ne sert plus
 * que de SECOURS : quand l'envoi du formulaire /free-simulation échoue, c'est
 * le lien qu'on propose au visiteur pour envoyer son offre à la main.
 *
 * @param {string} locale
 * @param {string} [description]  repris en corps de l'e-mail.
 */
export function postingHref(locale, description) {
  const s = SUJETS[locale] || SUJETS.fr;
  const corps = description ? `?subject=${encodeURIComponent(s.offre)}&body=${encodeURIComponent(description)}`
                            : `?subject=${encodeURIComponent(s.offre)}`;
  return `mailto:${CONTACT_EMAIL}${corps}`;
}

/** Lien « parler à quelqu'un », pour qui n'a pas d'offre sous la main. */
export function talkHref(locale) {
  const s = SUJETS[locale] || SUJETS.fr;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(s.parler)}`;
}

