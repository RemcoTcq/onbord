"use client";

import { useState } from "react";
import { IcMail } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// Le retour écrit envoyé au candidat, en deux onglets.
//
// Il n'y en avait qu'un : celui d'un candidat refusé. Le message passait donc à
// moitié, parce qu'on pouvait croire que le retour est la politesse qu'on
// réserve au « non ». Les deux onglets disent l'inverse : RETENU ou REFUSÉ,
// tout le monde reçoit la même chose, et cette chose n'est pas une réponse,
// c'est un retour.
//
// C'est pour ça que les deux e-mails citent des faits précis de la simulation.
// Un « merci de votre candidature, nous avons retenu un autre profil » dans
// l'onglet de gauche ruinerait la démonstration : ce qu'on montre ici, c'est
// qu'il y a quelque chose à dire, et qu'on le dit.
//
// Sans JavaScript, le premier onglet s'affiche et les boutons ne font rien : la
// page reste lisible et le contenu principal est servi dans le HTML.
// ─────────────────────────────────────────────────────────────────────────────

export default function FeedbackTabs({ m }) {
  const [actif, setActif] = useState(0);
  const onglet = m.tabs[actif];

  // Dans le style de l'application depuis le 19/10 : un sélecteur à deux
  // cases sur un fond gris, et l'e-mail dans une carte arrondie. Le VERT et
  // le ROUGE restent : c'est le seul endroit du site où le rouge veut dire
  // « refusé » (règle 5 bis de site/AGENTS.md).
  return (
    <div className="app-ui">
      {/* `role="tablist"` et les `aria-selected` : au clavier et au lecteur
          d'écran, ce bloc s'annonce comme deux onglets, pas comme deux boutons
          qui font on ne sait quoi. */}
      <div className="ap-seg" role="tablist" aria-label={m.window}>
        {m.tabs.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`fb-tab-${t.id}`}
            aria-selected={i === actif}
            aria-controls={`fb-panel-${t.id}`}
            className={`ap-segBtn ap-segBtn--${t.id}${i === actif ? " ap-segBtn--on" : ""}`}
            onClick={() => setActif(i)}
          >
            <i aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`fb-panel-${onglet.id}`}
        aria-labelledby={`fb-tab-${onglet.id}`}
        className="ap-panel ap-mail"
      >
        <span className="ap-mailHead">
          <span className="ap-fileIcon"><IcMail size={16} /></span>
          <span className={`ap-status ap-status--${onglet.id === "next" ? "ok" : "no"}`}><i />{onglet.tag}</span>
        </span>
        <div className="ap-mailBody">
          {onglet.body.map((p) => <p key={p}>{p}</p>)}
        </div>
      </div>
    </div>
  );
}
