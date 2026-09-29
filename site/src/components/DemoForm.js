"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// La page « Book a demo », en deux temps.
//
//   1. les coordonnées : prénom, nom, entreprise, e-mail professionnel. Elles
//      partent vers /api/demo (un e-mail à info@onbord.be) DÈS le clic, avant
//      même l'affichage du calendrier. C'est la raison d'être de la page : un
//      visiteur qui ferme ensuite le calendrier sans réserver a quand même
//      laissé de quoi le recontacter ;
//   2. le calendrier Calendly, pré-rempli avec son nom et son e-mail pour qu'il
//      ne les retape pas.
//
// Si l'envoi de la demande échoue (réseau, clé Resend absente), on passe
// QUAND MÊME au calendrier : notre notification en panne ne doit jamais
// bloquer quelqu'un qui veut réserver. Seule une erreur de saisie le retient.
// ─────────────────────────────────────────────────────────────────────────────

const CALENDLY = "https://calendly.com/remco-onbord?hide_landing_page_details=1&hide_gdpr_banner=1&primary_color=1b45c4";
const SCRIPT_CALENDLY = "https://assets.calendly.com/assets/external/widget.js";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Charge le script de Calendly une seule fois, et attend qu'il soit prêt. */
function chargerCalendly() {
  if (typeof window === "undefined") return Promise.reject();
  if (window.Calendly) return Promise.resolve(window.Calendly);
  return new Promise((resolve, reject) => {
    let s = document.querySelector(`script[src="${SCRIPT_CALENDLY}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT_CALENDLY;
      s.async = true;
      document.body.appendChild(s);
    }
    s.addEventListener("load", () => resolve(window.Calendly));
    s.addEventListener("error", reject);
  });
}

export default function DemoForm({ t, locale }) {
  const [etape, setEtape] = useState("form"); // "form" | "envoi" | "calendrier"
  const [v, setV] = useState({ firstName: "", lastName: "", company: "", email: "", website: "" });
  const [erreur, setErreur] = useState("");
  const cadre = useRef(null);

  const maj = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function envoyer(e) {
    e.preventDefault();
    const d = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()]));
    if (!d.firstName || !d.lastName || !d.company || !d.email) return setErreur(t.missing);
    if (!EMAIL.test(d.email)) return setErreur(t.badEmail);
    setErreur("");
    setEtape("envoi");

    // Le plan regardé sur la page des tarifs, s'il y en a un (?plan=pro).
    const plan = new URLSearchParams(window.location.search).get("plan") || "";
    try {
      const r = await fetch("/api/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, plan, locale }),
        keepalive: true,
      });
      // Une erreur de SAISIE renvoyée par le serveur retient le visiteur ; une
      // panne de notre côté (503, 502) le laisse passer au calendrier.
      if (r.status === 400) {
        const { erreur: code } = await r.json().catch(() => ({}));
        setEtape("form");
        return setErreur(code === "email" ? t.badEmail : t.missing);
      }
    } catch {
      // réseau : on laisse passer, voir l'en-tête du fichier
    }
    setEtape("calendrier");
  }

  // Le calendrier se monte quand l'étape 2 s'affiche, pré-rempli.
  useEffect(() => {
    if (etape !== "calendrier" || !cadre.current) return;
    let annule = false;
    chargerCalendly()
      .then((Calendly) => {
        if (annule || !cadre.current) return;
        cadre.current.innerHTML = "";
        // Le pre-remplissage passe par l'ADRESSE (name, email), la methode
        // documentee par Calendly. L'option `prefill` de initInlineWidget a
        // ete essayee : elle n'arrivait pas jusqu'a l'iframe.
        const nom = `${v.firstName.trim()} ${v.lastName.trim()}`;
        const url = `${CALENDLY}&name=${encodeURIComponent(nom)}&email=${encodeURIComponent(v.email.trim())}`;
        Calendly.initInlineWidget({ url, parentElement: cadre.current });
      })
      .catch(() => {});
    return () => { annule = true; };
  }, [etape, v.firstName, v.lastName, v.email]);

  if (etape === "calendrier") {
    const lede = t.pickLede.replace("{name}", v.firstName.trim()).replace("{email}", v.email.trim());
    return (
      <div className="demo__pick">
        <div className="demo__head">
          <p className="demo__eyebrow">{t.pickEyebrow}</p>
          <h1 className="display display--page">{t.pickTitle}</h1>
          <p className="lede">{lede}</p>
          <button type="button" className="demo__edit" onClick={() => setEtape("form")}>{t.edit}</button>
        </div>
        {/* Hauteur réservée : sans elle, la page tressaute le temps que
            Calendly charge son contenu. */}
        <div className="demo__calendar" ref={cadre} />
      </div>
    );
  }

  return (
    <div className="demo__box">
      <div className="demo__head">
        <p className="demo__eyebrow">{t.eyebrow}</p>
        <h1 className="display display--page">{t.title}</h1>
        <p className="lede">{t.lede}</p>
      </div>

      <form className="demo__form" onSubmit={envoyer} noValidate>
        <div className="demo__row">
          <label className="demo__field">
            <span>{t.firstName}</span>
            <input value={v.firstName} onChange={maj("firstName")} placeholder={t.firstNamePh} autoComplete="given-name" maxLength={120} required />
          </label>
          <label className="demo__field">
            <span>{t.lastName}</span>
            <input value={v.lastName} onChange={maj("lastName")} placeholder={t.lastNamePh} autoComplete="family-name" maxLength={120} required />
          </label>
        </div>
        <label className="demo__field">
          <span>{t.company}</span>
          <input value={v.company} onChange={maj("company")} placeholder={t.companyPh} autoComplete="organization" maxLength={120} required />
        </label>
        <label className="demo__field">
          <span>{t.email}</span>
          <input type="email" value={v.email} onChange={maj("email")} placeholder={t.emailPh} autoComplete="email" maxLength={120} required />
        </label>

        {/* Piège à robots : invisible et hors du parcours clavier. Un humain
            ne le remplit jamais ; s'il l'est, la route ne transmet rien. */}
        <label className="demo__trap" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={maj("website")} />
        </label>

        {erreur ? <p className="demo__error" role="alert">{erreur}</p> : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={etape === "envoi"}>
          {etape === "envoi" ? t.sending : t.submit}
          <ArrowRight size={15} />
        </button>
        <p className="demo__privacy">{t.privacy}</p>
      </form>
    </div>
  );
}
