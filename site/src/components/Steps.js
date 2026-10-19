"use client";

import { useEffect, useRef, useState } from "react";
import { IcCheck, IcFile, IcLink, IcSparkle, IcUpload } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// Les trois étapes de l'accueil, CLIQUABLES.
//
// Les trois cartes étaient figées, la première allumée en dur et une maquette
// unique à côté. Elles se sélectionnent maintenant, et la maquette de droite
// suit. Trois raisons de préférer ça à trois maquettes empilées :
//
//   1. la page ne s'allonge pas de trois écrans pour trois idées ;
//   2. on lit la séquence dans l'ordre, au lieu de voir trois résultats
//      côte à côte et de devoir deviner lequel vient d'où ;
//   3. cliquer, c'est déjà manipuler l'outil. La page d'accueil a un bac à
//      sable dans son hero pour la même raison.
//
// ── L'accessibilité, et pourquoi ce n'est pas un `<button>` nu ───────────────
// C'est un vrai jeu d'onglets : `role="tablist"`, un `role="tab"` par carte,
// `aria-selected`, et le panneau lié par `aria-controls`. Au lecteur d'écran,
// ce bloc s'annonce comme trois onglets et un panneau, pas comme trois boutons
// qui font on ne sait quoi.
//
// Sans JavaScript, la première étape s'affiche avec sa maquette et les clics
// ne font rien : la page reste lisible et le contenu principal est servi dans
// le HTML. C'est le bon pire cas.
// ─────────────────────────────────────────────────────────────────────────────

// Les trois visuels sont dans le style de l'application depuis la refonte
// du 19/10 (`.app-ui`, classes `ap-*`, voir AppUi.js) : cartes arrondies,
// bleu #1B45C4, Geist. Plus de barre à trois pastilles façon macOS (règle 5).

/** 01 — L'offre qu'on dépose. */
function VizDrop({ v }) {
  return (
    <div className="sv app-ui ap-panel">
      <div className="sv__in">
        <div className="ap-drop">
          <span className="ap-dropIcon"><IcUpload size={18} /></span>
          <span className="ap-sub">{v.hint}</span>
        </div>
        <span className="ap-fileRow">
          <span className="ap-fileIcon"><IcFile size={16} /></span>
          <span className="ap-stack ap-grow">
            <b className="ap-strong">{v.file}</b>
            <span className="ap-sub">{v.size}</span>
          </span>
          <span className="ap-ok"><IcCheck size={13} /></span>
        </span>
      </div>
    </div>
  );
}

/** 02 — Ce qu'on dit à l'assistant, et ce qu'il change. */
function VizTalk({ v, chat }) {
  return (
    <div className="sv app-ui ap-panel">
      <div className="sv__in">
        <p className="ap-bubble ap-bubble--me">{chat.msgMe}</p>
        <div className="ap-bubbleRow">
          <span className="ap-aiAvatar"><IcSparkle size={14} /></span>
          <p className="ap-bubble ap-bubble--ai">{chat.msgAi}</p>
        </div>
        <span className="ap-made"><IcCheck size={13} />{v.made}</span>
      </div>
    </div>
  );
}

/** 03 — Le lien qui part aux candidats. */
function VizLink({ v }) {
  return (
    <div className="sv app-ui ap-panel">
      <div className="sv__in">
        <span className="ap-insetLabel">{v.label}</span>
        <span className="ap-linkRow">
          <span className="ap-linkField"><IcLink size={15} /><span className="ap-ell">{v.url}</span></span>
          <span className="ap-btn ap-btn--done"><IcCheck size={14} />{v.copied}</span>
        </span>
      </div>
    </div>
  );
}

export default function Steps({ steps, label, viz, chat }) {
  const [actif, setActif] = useState(0);
  const piste = useRef(null);

  // L'étape suit le DÉFILEMENT : la piste fait une hauteur d'écran par étape,
  // le bloc y reste collé, et on avance d'une étape par tranche parcourue. On
  // ne peut donc pas atteindre la section suivante sans avoir vu les trois.
  //
  // Le calcul est fait dans un `requestAnimationFrame` et n'écrit l'état que
  // si l'indice CHANGE : un `setState` à chaque pixel parcouru relancerait un
  // rendu cinquante fois par seconde pour rien.
  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    // Sous 981px la piste n'existe pas (voir globals.css) : les étapes
    // redeviennent de simples onglets, et forcer le défilement sur un
    // téléphone donnerait une section dont on ne sort plus.
    const large = window.matchMedia("(min-width: 981px)");
    if (!large.matches) return;

    let pret = true;
    const surDefilement = () => {
      if (!pret) return;
      pret = false;
      requestAnimationFrame(() => {
        pret = true;
        const r = el.getBoundingClientRect();
        const course = r.height - window.innerHeight;
        if (course <= 0) return;
        const avance = Math.min(Math.max(-r.top / course, 0), 0.999);
        const i = Math.floor(avance * steps.length);
        setActif((v) => (v === i ? v : i));
      });
    };

    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, [steps.length]);

  const maquettes = [
    <VizDrop key="drop" v={viz.drop} />,
    <VizTalk key="talk" v={viz.talk} chat={chat} />,
    <VizLink key="link" v={viz.link} />,
  ];

  return (
    <div className="stepsTrack" ref={piste}>
      <div className="stepsSticky">
    <div className="steps" style={{ textAlign: "left" }}>
      <div className="steps__list" role="tablist" aria-label={label}>
        {steps.map((st, i) => (
          <button
            type="button"
            role="tab"
            id={`step-tab-${st.n}`}
            aria-selected={i === actif}
            aria-controls="step-panel"
            className={`steps__item${i === actif ? " steps__item--on" : ""}`}
            key={st.n}
            onClick={() => setActif(i)}
          >
            <span className="steps__tag">{label} {Number(st.n)}</span>
            <span className="steps__title">{st.title}</span>
            <span className="steps__body">{st.body}</span>
          </button>
        ))}
      </div>

      <div
        className="steps__viz"
        id="step-panel"
        role="tabpanel"
        aria-labelledby={`step-tab-${steps[actif].n}`}
      >
        {maquettes[actif]}
      </div>
    </div>
      </div>
    </div>
  );
}
