"use client";

import { useEffect, useRef, useState } from "react";
import { postingHref, talkHref } from "@/lib/contact";
import { Plus, ArrowUp, ArrowRight } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Le bac à sable du hero.
//
// C'était une maquette figée : une phrase écrite d'avance, et un journal de
// génération qui se déroulait tout seul. Le visiteur regardait. Maintenant il
// ÉCRIT : il décrit le poste qu'il a réellement à pourvoir, il envoie, la
// construction se déroule, et elle débouche sur l'envoi de son offre.
//
// Ce que ce composant ne fait PAS, et pourquoi :
//
//   • il n'appelle aucun serveur. Le site est statique (règle 6 du guide), et
//     construire une vraie simulation ici, ce serait mettre le produit dans la
//     vitrine. Les étapes sont une ANIMATION, pas une génération ;
//   • il ne dit jamais « on a lu votre offre » : on ne l'a pas. Les étapes
//     décrivent ce qui se passerait, au futur, jamais un résultat qu'on aurait
//     obtenu. Une vitrine qui simule un calcul qu'elle ne fait pas ment ;
//   • il n'ouvre pas la messagerie tout seul à la fin. Un `mailto:` déclenché
//     sans clic, c'est une fenêtre qui s'ouvre par surprise. Le dernier écran
//     pose le bouton ; c'est le visiteur qui l'actionne — et ce qu'il a écrit
//     part avec, en corps de l'e-mail, pour qu'il ne le retape pas.
// ─────────────────────────────────────────────────────────────────────────────

/** Durée d'une étape. Assez lent pour qu'on lise, assez court pour qu'on reste. */
const PAS = 900;

// Vitesses de la machine à écrire du placeholder, en millisecondes.
const TAPE = 45;    // par caractère, à l'écriture
const EFFACE = 25;  // par caractère, à l'effacement — plus vif, sinon l'attente
                     // avant la phrase suivante se sent deux fois plus longue
const PAUSE_PLEINE = 1800; // phrase entière affichée, avant de l'effacer
const PAUSE_VIDE = 350;    // entre l'effacement et la phrase suivante

export default function Playground({ m, locale }) {
  // "idle" → "run" → "done". Une seule variable : trois états, pas trois booléens
  // qui pourraient se contredire.
  const [etat, setEtat] = useState("idle");
  const [texte, setTexte] = useState("");
  const [fait, setFait] = useState(0); // nombre d'étapes terminées
  const minuteries = useRef([]);

  const champ = useRef(null);

  // Les minuteries en cours sont annulées au démontage : sans ça, un
  // changement de page en pleine animation ferait écrire un composant parti.
  useEffect(() => () => minuteries.current.forEach(clearTimeout), []);

  // Le placeholder défile, une phrase à la fois, en boucle : trois métiers
  // différents, pour qu'on comprenne d'un coup d'œil que N'IMPORTE QUEL poste
  // peut être décrit ici — pas seulement l'exemple qu'on voit passer. Ça
  // tourne tant que le champ est vide ; dès que quelqu'un écrit, sa saisie
  // recouvre le placeholder et l'anime pour rien, donc l'effet s'arrête.
  const phrases = m.placeholders;
  const [ph, setPh] = useState({ i: 0, n: 0, efface: false });

  useEffect(() => {
    if (texte) return; // le champ a du texte : le placeholder ne s'affiche pas

    const phrase = phrases[ph.i % phrases.length];
    let delai;
    let suivant;

    if (!ph.efface && ph.n < phrase.length) {
      delai = TAPE;
      suivant = { ...ph, n: ph.n + 1 };
    } else if (!ph.efface) {
      delai = PAUSE_PLEINE;
      suivant = { ...ph, efface: true };
    } else if (ph.n > 0) {
      delai = EFFACE;
      suivant = { ...ph, n: ph.n - 1 };
    } else {
      delai = PAUSE_VIDE;
      suivant = { i: ph.i + 1, n: 0, efface: false };
    }

    const id = setTimeout(() => setPh(suivant), delai);
    return () => clearTimeout(id);
  }, [ph, texte, phrases]);

  // Le lien « collez une offre » du hero pointe sur `#brief`. Le navigateur y
  // fait défiler, mais il ne DONNE PAS le focus au champ : un fragment n'active
  // sa cible que dans certains cas, et un <input> n'en fait pas partie partout.
  // Sans ce raccord, la personne clique, la page bouge, et elle doit cliquer une
  // seconde fois dans le champ. L'écouteur est délégué au document pour que le
  // lien reste un simple <a> dans un composant serveur.
  useEffect(() => {
    const surClic = (e) => {
      if (!e.target.closest?.('a[href="#brief"]')) return;
      // Après le défilement du navigateur, sinon il le reprend à zéro.
      requestAnimationFrame(() => champ.current?.focus({ preventScroll: true }));
    };
    document.addEventListener("click", surClic);
    return () => document.removeEventListener("click", surClic);
  }, []);

  function lancer(e) {
    e.preventDefault();
    if (!texte.trim() || etat === "run") return;

    setEtat("run");
    setFait(0);

    minuteries.current.forEach(clearTimeout);
    minuteries.current = m.steps.map((_, i) =>
      setTimeout(() => {
        setFait(i + 1);
        if (i === m.steps.length - 1) setEtat("done");
      }, PAS * (i + 1))
    );
  }

  function recommencer() {
    minuteries.current.forEach(clearTimeout);
    setEtat("idle");
    setFait(0);
  }

  const enCours = etat === "run";

  return (
    <form className="prompt" onSubmit={lancer}>
      <div className="prompt__in">
        {etat === "idle" && (
        <div className="prompt__row">
          <span className="prompt__plus" aria-hidden="true"><Plus size={14} /></span>

          {/* `id="brief"` : la cible du lien « collez une offre » du hero. Le
              focus, lui, est posé par l'écouteur ci-dessus. */}
          <input
            id="brief"
            ref={champ}
            className="prompt__field"
            type="text"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder={phrases[ph.i % phrases.length].slice(0, ph.n)}
            aria-label={m.label}
            disabled={enCours}
            maxLength={280}
          />

          <button
            className="prompt__go"
            type="submit"
            disabled={!texte.trim() || enCours}
            aria-label={m.send}
          >
            <ArrowUp size={16} />
          </button>
        </div>
        )}

        {/* Il n'y a plus de pastilles d'exemples sous le champ. Elles
            proposaient trois métiers, donc elles répondaient à la place du
            visiteur ; le champ vide et son invite posent mieux la question.
            Les exemples vivent maintenant dans le `placeholder`. */}

        {/* UNE SEULE ÉTAPE À LA FOIS, à la place de la ligne de saisie.
            Les cinq s'empilaient : le cadre devait faire trois fois la
            hauteur d'un champ pour les contenir, et cette hauteur restait
            réservée même au repos, ce qui donnait la grosse barre qu'on
            voulait justement affiner. Une seule ligne qui se remplace tient
            dans la hauteur d'un champ. */}
        {etat !== "idle" && etat !== "done" && (
          <p className="play__step" aria-live="polite">
            <span className="spin" aria-hidden="true" />
            <span>{m.steps[Math.min(fait, m.steps.length - 1)]}</span>
          </p>
        )}

        {etat === "done" && (
          <div className="play__done" data-reveal>
            <p className="play__title">{m.done.title}</p>
            <p className="play__body">{m.done.body}</p>

            <div className="play__actions">
              <a className="btn btn--primary" href={postingHref(locale, texte)}>
                {m.done.primary}
                <ArrowRight size={15} />
              </a>
              <a className="btn btn--ghost" href={talkHref(locale)}>
                {m.done.secondary}
              </a>
            </div>

            <button type="button" className="play__again" onClick={recommencer}>
              {m.done.again}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
