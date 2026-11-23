"use client";

import { useState } from "react";
import AppPeek from "./AppPeek";
import { UserSearch, GradCap } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Le bas du hero : le choix Recrutement / Onboarding, et la plateforme dans
// son cadre (05/11/2026, demande directe).
//
// Chaque onglet a ses écrans, qui défilent dans la même fenêtre (AppPeek.js) :
// le recrutement (vue d'ensemble, candidats, rapport) et, depuis le
// 23/11/2026, l'onboarding (vue d'ensemble, personnes, fiche d'une recrue),
// recopiés de l'application. Avant, l'onglet Onboarding montrait la fenêtre
// du recrutement : l'onboarding n'était pas encore construit.
//
// C'est un vrai jeu d'onglets (même motif que Steps.js) : `role="tablist"`,
// `aria-selected`, panneau lié par `aria-controls`. Changer d'onglet remonte
// la fenêtre (`key`), qui reprend donc son défilement au premier écran.
// ─────────────────────────────────────────────────────────────────────────────

const VUES = ["recruitment", "onboarding"];
const ICONES = { recruitment: UserSearch, onboarding: GradCap };

export default function Vitrine({ tabs, a, o, shortlist, score }) {
  const [vue, setVue] = useState(VUES[0]);

  return (
    <>
      <div className="vitrine__tabs" role="tablist" aria-label={tabs.label}>
        {VUES.map((v) => {
          const Icone = ICONES[v];
          return (
            <button
              key={v}
              type="button"
              role="tab"
              id={`vitrine-${v}`}
              aria-selected={vue === v}
              aria-controls="vitrine-panneau"
              className="vitrine__tab"
              onClick={() => setVue(v)}
            >
              <Icone size={16} />
              {tabs[v]}
            </button>
          );
        })}
      </div>
      <div className="vitrine__cadre" role="tabpanel" id="vitrine-panneau" aria-labelledby={`vitrine-${vue}`}>
        <AppPeek key={vue} vue={vue} a={a} o={o} shortlist={shortlist} score={score} />
      </div>
    </>
  );
}
