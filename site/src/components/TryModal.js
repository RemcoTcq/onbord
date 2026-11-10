"use client";

import { useRef, useState } from "react";
import { Check, Close, FileText } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// « Try it now », le second bouton du hero de l'accueil (05/11/2026, demande
// directe). Il n'ouvre pas une page : il ouvre un POP-UP, avec ce qu'on
// demande et rien de plus, prénom, nom, e-mail, et la fiche de poste EN
// FICHIER, obligatoire. À l'envoi : « sous 24 heures, vous aurez accès à votre
// environnement privé », que l'équipe prépare à la main avec la simulation
// déjà construite sur cette fiche.
//
// Un vrai <dialog> ouvert par showModal() : le navigateur s'occupe du fond
// inerte, du focus gardé dans la fenêtre et de la touche Échap. Un clic sur le
// voile, autour de la fenêtre, la ferme aussi.
//
// Un échec d'envoi n'est pas silencieux, comme sur /free-simulation : le
// visiteur reçoit l'adresse à laquelle envoyer sa fiche à la main.
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// La même limite que la route (src/app/api/try/route.js), vérifiée AVANT
// l'envoi : au-delà, Vercel refuse la requête sans que la route la voie.
const ESSAI_MAX_OCTETS = 4 * 1024 * 1024;
const ACCEPTE = ".pdf,.doc,.docx,.txt,.rtf,.odt";
const VIDE = { firstName: "", lastName: "", email: "", website: "" };

export default function TryModal({ t, locale, fallbackHref, fallbackEmail }) {
  const dialogue = useRef(null);
  const [etape, setEtape] = useState("form"); // "form" | "envoi" | "fait"
  const [v, setV] = useState(VIDE);
  const [fichier, setFichier] = useState(null);
  const [erreur, setErreur] = useState("");
  const [echec, setEchec] = useState(false);

  const maj = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const ouvrir = () => dialogue.current?.showModal();
  const fermer = () => dialogue.current?.close();
  // Une fois la demande partie, rouvrir le pop-up repart d'un formulaire vide.
  const apresFermeture = () => {
    if (etape !== "fait") return;
    setEtape("form");
    setV(VIDE);
    setFichier(null);
  };

  function choisir(e) {
    const f = e.target.files?.[0] || null;
    if (f && f.size > ESSAI_MAX_OCTETS) {
      e.target.value = "";
      setFichier(null);
      return setErreur(t.tooBig);
    }
    setErreur("");
    setFichier(f);
  }

  async function envoyer(e) {
    e.preventDefault();
    const d = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x.trim()]));
    if (!d.firstName || !d.lastName || !d.email) return setErreur(t.missing);
    if (!EMAIL.test(d.email)) return setErreur(t.badEmail);
    if (!fichier) return setErreur(t.noFile);
    setErreur("");
    setEchec(false);
    setEtape("envoi");

    const corps = new FormData();
    for (const [k, x] of Object.entries(d)) corps.append(k, x);
    corps.append("locale", locale);
    corps.append("jobDescription", fichier);

    try {
      const r = await fetch("/api/try", { method: "POST", body: corps });
      if (r.ok) return setEtape("fait");
      if (r.status === 400) {
        const { erreur: code } = await r.json().catch(() => ({}));
        setEtape("form");
        return setErreur(
          code === "email" ? t.badEmail
            : code === "fichier" ? t.noFile
            : code === "taille" ? t.tooBig
            : code === "type" ? t.badType
            : t.missing,
        );
      }
    } catch {
      // réseau : traité comme une panne, juste en dessous
    }
    // Panne de notre côté : la demande n'est pas partie, on le dit.
    setEtape("form");
    setEchec(true);
  }

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={ouvrir}>
        {t.button}
      </button>

      <dialog
        ref={dialogue}
        className="essai"
        aria-labelledby="essai-titre"
        onClose={apresFermeture}
        onClick={(e) => e.target === dialogue.current && fermer()}
      >
        <div className="essai__in">
          <button type="button" className="essai__close" aria-label={t.close} onClick={fermer}>
            <Close size={16} />
          </button>

          {etape === "fait" ? (
            <div className="essai__done">
              <span className="sim__done" aria-hidden="true"><Check size={20} /></span>
              <h2 className="essai__title" id="essai-titre">{t.doneTitle.replace("{name}", v.firstName.trim())}</h2>
              <p className="essai__lede">{t.doneLede.replace("{email}", v.email.trim())}</p>
              <button type="button" className="btn btn--primary" onClick={fermer}>{t.doneClose}</button>
            </div>
          ) : (
            <>
              <div className="essai__head">
                <p className="essai__eyebrow">{t.eyebrow}</p>
                <h2 className="essai__title" id="essai-titre">{t.title}</h2>
                <p className="essai__lede">{t.lede}</p>
              </div>

              <form className="demo__form essai__form" onSubmit={envoyer} noValidate>
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
                  <span>{t.email}</span>
                  <input type="email" value={v.email} onChange={maj("email")} placeholder={t.emailPh} autoComplete="email" maxLength={120} required />
                </label>

                {/* La fiche de poste : une zone cliquable, le champ fichier
                    natif caché dedans. Le nom du fichier choisi la remplace. */}
                <div className="demo__field">
                  <span>{t.file}</span>
                  <label className={`essai__file${fichier ? " essai__file--ok" : ""}`}>
                    <input type="file" accept={ACCEPTE} onChange={choisir} required />
                    <FileText size={18} />
                    <span className="essai__fileText">
                      <b>{fichier ? fichier.name : t.filePick}</b>
                      <small>{fichier ? t.fileChange : t.fileHint}</small>
                    </span>
                  </label>
                </div>

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
                </button>
                <p className="demo__privacy">{t.privacy}</p>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
