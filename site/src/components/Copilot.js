"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Check } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Le copilote de simulation, sur /business-roles (14/10/2026) : le chat avec
// lequel le recruteur construit et retouche sa simulation, qu'on peut ici
// MANIPULER.
//
// Comme le bac à sable du hero (règle 5 bis), c'est une ANIMATION, pas une
// génération : le site est statique, sans clé ni serveur. Les demandes sont
// des boutons, pas un champ libre, et chaque réponse est écrite d'avance dans
// le dictionnaire. Un champ libre promettrait une réponse à n'importe quoi, et
// la page mentirait au premier essai.
//
// La ligne « Modifié » sous chaque réponse est l'essentiel, comme dans
// ChatMock : le copilote ne bavarde pas, il CHANGE la simulation et dit ce
// qu'il a changé.
//
// Sans JavaScript : le message d'accueil et les demandes, inertes.
// ─────────────────────────────────────────────────────────────────────────────

const ATTENTE_MS = 750;

export default function Copilot({ c }) {
  const [faites, setFaites] = useState([]); // indices des demandes envoyées, dans l'ordre
  const [enCours, setEnCours] = useState(null); // la demande dont la réponse « s'écrit »
  const minuteur = useRef(null);
  const fil = useRef(null);

  useEffect(() => () => clearTimeout(minuteur.current), []);

  // Le fil a une hauteur FIXE et défile en interne : sans ça, chaque réponse
  // allongeait le panneau, et le texte d'à côté (centré verticalement dans le
  // `.duo`) glissait sous le pointeur au moment du clic. On descend le fil
  // lui-même, jamais la page : un scrollIntoView ferait sauter tout l'écran.
  useEffect(() => {
    const el = fil.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [faites, enCours]);

  const demander = (i) => {
    if (enCours !== null) return;
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (calme) { setFaites((v) => [...v, i]); return; }
    setEnCours(i);
    minuteur.current = setTimeout(() => {
      setFaites((v) => [...v, i]);
      setEnCours(null);
    }, ATTENTE_MS);
  };

  const recommencer = () => {
    clearTimeout(minuteur.current);
    setEnCours(null);
    setFaites([]);
  };

  const restantes = c.suggestions.map((s, i) => i).filter((i) => !faites.includes(i) && i !== enCours);

  return (
    <div className="copilot">
      <div className="copilot__head">
        <Bot size={15} />
        <span>{c.window}</span>
      </div>

      <div className="copilot__msgs" ref={fil} aria-live="polite">
        <p className="bubble bubble--ai">{c.hello}</p>
        {faites.map((i) => (
          <div className="copilot__turn" key={i}>
            <p className="bubble bubble--me">{c.suggestions[i].ask}</p>
            <p className="bubble bubble--ai">{c.suggestions[i].reply}</p>
            <p className="copilot__changed">
              <Check size={12} />
              <b>{c.changedLabel}</b>
              {c.suggestions[i].changed}
            </p>
          </div>
        ))}
        {enCours !== null && (
          <div className="copilot__turn">
            <p className="bubble bubble--me">{c.suggestions[enCours].ask}</p>
            <p className="copilot__dots" aria-hidden="true"><i /><i /><i /></p>
          </div>
        )}
      </div>

      <div className="copilot__foot">
        {restantes.length > 0 ? (
          <>
            <p className="copilot__try">{c.try}</p>
            <div className="copilot__chips">
              {restantes.map((i) => (
                <button
                  type="button"
                  key={i}
                  className="copilot__chip"
                  disabled={enCours !== null}
                  onClick={() => demander(i)}
                >
                  {c.suggestions[i].ask}
                </button>
              ))}
            </div>
          </>
        ) : enCours === null ? (
          <button type="button" className="copilot__chip copilot__chip--reset" onClick={recommencer}>
            {c.reset}
          </button>
        ) : null}
      </div>
    </div>
  );
}
