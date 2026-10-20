"use client";

import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Check } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// « Get a free simulation » (20/10/2026) : le visiteur envoie UNE offre
// d'emploi, l'équipe en construit la simulation gratuitement et revient vers
// lui sous 24 heures. C'est l'appel principal du site ; « Book a demo » reste
// en second, pour qui veut parler d'abord.
//
// Ce qu'on demande, et pas plus : prénom, nom, entreprise, e-mail
// professionnel, l'offre (un lien, ou son texte collé si elle n'est pas en
// ligne) et un téléphone FACULTATIF. Chaque champ obligatoire de plus fait
// perdre des demandes.
//
// Un échec d'envoi n'est pas silencieux (contrairement à DemoForm, qui a un
// calendrier derrière) : le visiteur reçoit l'adresse à laquelle envoyer son
// offre à la main, avec un lien qui ouvre l'e-mail tout prêt.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Le plan regardé sur la page des tarifs, s'il y en a un (?plan=pro). */
function lirePlan() {
  const p = new URLSearchParams(window.location.search).get("plan") || "";
  return /^[a-z]{2,12}$/.test(p) ? p : "";
}
const rienAEcouter = () => () => {};

const VIDE = { firstName: "", lastName: "", company: "", email: "", phone: "", postingUrl: "", postingText: "", website: "" };

export default function SimulationForm({ t, locale, fallbackHref, fallbackEmail, demoHref }) {
  const [etape, setEtape] = useState("form"); // "form" | "envoi" | "fait"
  const [v, setV] = useState(VIDE);
  const [coller, setColler] = useState(false); // le texte de l'offre plutôt que son lien
  const [erreur, setErreur] = useState("");
  const [echec, setEchec] = useState(false);
  // Lu dans l'adresse côté navigateur, vide côté serveur : la page est
  // statique, le paramètre n'existe qu'à l'affichage.
  const plan = useSyncExternalStore(rienAEcouter, lirePlan, () => "");

  const maj = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function envoyer(e) {
    e.preventDefault();
    const d = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()]));
    // On n'envoie que la forme choisie de l'offre : un lien saisi puis
    // abandonné pour le texte ne doit pas partir avec.
    if (coller) d.postingUrl = ""; else d.postingText = "";
    if (!d.firstName || !d.lastName || !d.company || !d.email) return setErreur(t.missing);
    if (!EMAIL.test(d.email)) return setErreur(t.badEmail);
    if (!d.postingUrl && !d.postingText) return setErreur(t.noPosting);
    setErreur("");
    setEchec(false);
    setEtape("envoi");

    try {
      const r = await fetch("/api/simulation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, plan, locale }),
      });
      if (r.ok) {
        // La confirmation est plus courte que le formulaire : sans ça, la page
        // restait défilée au niveau du bouton, sur du vide.
        window.scrollTo({ top: 0 });
        return setEtape("fait");
      }
      if (r.status === 400) {
        const { erreur: code } = await r.json().catch(() => ({}));
        setEtape("form");
        return setErreur(code === "email" ? t.badEmail : code === "offre" ? t.noPosting : t.missing);
      }
    } catch {
      // réseau : traité comme une panne, juste en dessous
    }
    // Panne de notre côté : la demande n'est pas partie, on le dit.
    setEtape("form");
    setEchec(true);
  }

  if (etape === "fait") {
    const lede = t.doneLede.replace("{email}", v.email.trim());
    return (
      <div className="demo__box">
        <div className="demo__head">
          <span className="sim__done" aria-hidden="true"><Check size={20} /></span>
          <h1 className="display display--page">{t.doneTitle.replace("{name}", v.firstName.trim())}</h1>
          <p className="lede">{lede}</p>
          <p className="demo__privacy">
            {t.doneDemo} <a href={demoHref}>{t.doneDemoLink}</a>
          </p>
        </div>
      </div>
    );
  }

  const nomPlan = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "";

  return (
    <div className="demo__box">
      <div className="demo__head">
        <p className="demo__eyebrow">{t.eyebrow}</p>
        <h1 className="display display--page">{t.title}</h1>
        <p className="lede">{t.lede}</p>
        {nomPlan ? <p className="sim__plan">{t.planNote.replace("{plan}", nomPlan)}</p> : null}
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
        <div className="demo__row">
          <label className="demo__field">
            <span>{t.email}</span>
            <input type="email" value={v.email} onChange={maj("email")} placeholder={t.emailPh} autoComplete="email" maxLength={120} required />
          </label>
          <label className="demo__field">
            <span>{t.phone} <i className="sim__optional">{t.optional}</i></span>
            <input type="tel" value={v.phone} onChange={maj("phone")} placeholder={t.phonePh} autoComplete="tel" maxLength={40} />
          </label>
        </div>

        {/* L'offre : un lien par défaut, son texte si elle n'est pas en ligne. */}
        {coller ? (
          <label className="demo__field">
            <span>{t.postingText}</span>
            <textarea value={v.postingText} onChange={maj("postingText")} placeholder={t.postingTextPh} rows={7} maxLength={20000} required />
          </label>
        ) : (
          <label className="demo__field">
            <span>{t.postingUrl}</span>
            <input type="url" value={v.postingUrl} onChange={maj("postingUrl")} placeholder={t.postingUrlPh} inputMode="url" maxLength={600} required />
          </label>
        )}
        <button type="button" className="sim__switch" onClick={() => setColler((c) => !c)}>
          {coller ? t.useLink : t.useText}
        </button>

        {/* Piège à robots : invisible et hors du parcours clavier. */}
        <label className="demo__trap" aria-hidden="true">
          Website
          <input tabIndex={-1} autoComplete="off" value={v.website} onChange={maj("website")} />
        </label>

        {erreur ? <p className="demo__error" role="alert">{erreur}</p> : null}
        {echec ? (
          <p className="demo__error" role="alert">
            {t.failed} <a href={fallbackHref}>{fallbackEmail}</a>
          </p>
        ) : null}

        <button type="submit" className="btn btn--primary btn--block" disabled={etape === "envoi"}>
          {etape === "envoi" ? t.sending : t.submit}
          <ArrowRight size={15} />
        </button>
        <p className="demo__privacy">{t.privacy}</p>
      </form>
    </div>
  );
}
