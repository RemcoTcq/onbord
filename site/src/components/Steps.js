"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Bot, Link as LinkIcon, Check } from "./Icons";

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

/** 01 — L'offre qu'on dépose. */
function VizDrop({ v }) {
  return (
    <div className="sv sv--drop">
      <div className="sv__chrome" aria-hidden="true"><i /><i /><i /></div>
      <div className="sv__in">
      <div className="sv__drop">
        <span className="sv__file">
          <FileText size={15} />
          <span>
            <b>{v.file}</b>
            <i>{v.size}</i>
          </span>
        </span>
        <p className="sv__hint">{v.hint}</p>
      </div>
      </div>
    </div>
  );
}

/** 02 — Ce qu'on dit à l'assistant, et ce qu'il change. */
function VizTalk({ v, chat }) {
  return (
    <div className="sv">
      <div className="sv__chrome" aria-hidden="true"><i /><i /><i /></div>
      <div className="sv__in">
        <p className="bubble bubble--me" style={{ marginLeft: "auto" }}>{chat.msgMe}</p>
        <p className="bubble bubble--ai">{chat.msgAi}</p>
        <p className="sv__made">
          <Bot size={13} />
          {v.made}
        </p>
      </div>
    </div>
  );
}

/** 03 — Le lien qui part aux candidats. */
function VizLink({ v }) {
  return (
    <div className="sv">
      <div className="sv__chrome" aria-hidden="true"><i /><i /><i /></div>
      <div className="sv__in">
        <p className="sv__label">{v.label}</p>
        <div className="sv__link">
          <LinkIcon size={13} />
          <span>{v.url}</span>
          <span className="sv__copied"><Check size={11} />{v.copied}</span>
        </div>
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
