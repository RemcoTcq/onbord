"use client";

import { useEffect, useRef, useState } from "react";
import { IcCheck, IcPanelClose, IcRotate, IcSend, IcSparkle } from "./AppUi";

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
// La carte « Modification proposée » sous chaque réponse est l'essentiel :
// le copilote ne bavarde pas, il CHANGE la simulation et dit ce qu'il a
// changé.
//
// Sans JavaScript : le message d'accueil et les demandes, inertes.
//
// Depuis le 19/10/2026, c'est la COPIE du « Simulation Copilot » de
// l'application (demande directe) : voir le rendu plus bas.
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

  // La copie du « Simulation Copilot » de l'application (ChatEtape.js, racine
  // du dépôt) : l'avatar bleu à étincelle, le statut « connaît cette
  // simulation », les réponses SANS bulle à côté de l'avatar, la carte
  // « Modification proposée », les suggestions en pilules et la zone de
  // saisie. La saisie est une IMAGE (`aria-hidden`, pas de champ) : un champ
  // libre promettrait une réponse à n'importe quoi (voir plus haut).
  return (
    <div className="copilot app-ui">
      <div className="copilot__head">
        <span className="copilot__avatar copilot__avatar--lg"><IcSparkle size={15} /></span>
        <span className="ap-stack ap-grow">
          <b className="copilot__title">{c.window}</b>
          <span className="copilot__knows"><i aria-hidden="true" />{c.knows}</span>
        </span>
        <button
          type="button"
          className="copilot__icon"
          onClick={recommencer}
          disabled={!faites.length && enCours === null}
          aria-label={c.reset}
          title={c.reset}
        >
          <IcRotate size={15} />
        </button>
        {/* « Replier le panneau » dans l'application. Ici il n'y a rien à
            replier : l'icône est là pour que l'en-tête soit le même. */}
        <span className="copilot__icon" aria-hidden="true"><IcPanelClose size={15} /></span>
      </div>

      <div className="copilot__msgs" ref={fil} aria-live="polite">
        <div className="copilot__ai">
          <Avatar />
          <p>{avecJob(c.hello, c.job)}</p>
        </div>
        {faites.map((i) => (
          <div className="copilot__turn" key={i}>
            <p className="copilot__me">{c.suggestions[i].ask}</p>
            <div className="copilot__ai">
              <Avatar />
              <div className="copilot__aiBody">
                <p>{c.suggestions[i].reply}</p>
                <div className="copilot__prop">
                  <span className="copilot__propLabel"><IcSparkle size={12} />{c.proposal}</span>
                  <p className="copilot__propText">{c.suggestions[i].changed}</p>
                  <span className="copilot__applied"><IcCheck size={12} />{c.applied}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {enCours !== null && (
          <div className="copilot__turn">
            <p className="copilot__me">{c.suggestions[enCours].ask}</p>
            <div className="copilot__ai">
              <Avatar />
              <p className="copilot__dots" aria-hidden="true"><i /><i /><i /></p>
            </div>
          </div>
        )}
      </div>

      <div className="copilot__foot">
        {restantes.length > 0 ? (
          <div className="copilot__chips" role="group" aria-label={c.try}>
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
        ) : enCours === null ? (
          <button type="button" className="copilot__chip copilot__chip--reset" onClick={recommencer}>
            {c.reset}
          </button>
        ) : null}

        <div className="copilot__input" aria-hidden="true">
          <span className="copilot__placeholder">{c.placeholder}</span>
          <span className="copilot__inputFoot">
            <span>{c.cost}</span>
            <span className="copilot__send"><IcSend size={14} /></span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Le message d'accueil, le nom du job en gras, comme dans l'application. */
function avecJob(texte, job) {
  const [avant, apres = ""] = texte.split("{job}");
  return <>{avant}<b className="copilot__job">{job}</b>{apres}</>;
}

/** L'avatar du copilote dans le fil : le carré bleu à étincelle de l'application. */
function Avatar() {
  return <span className="copilot__avatar" aria-hidden="true"><IcSparkle size={13} /></span>;
}
