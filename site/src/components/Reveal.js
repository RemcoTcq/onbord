"use client";

import { useEffect } from "react";

// Apparition des blocs au défilement.
//
// Le point important est l'ORDRE : la classe `.reveal`, qui rend un élément
// transparent, est posée PAR CE SCRIPT et seulement par lui. Elle n'est jamais
// dans le HTML servi.
//
// Si elle l'était, une page ouverte sans JavaScript — script bloqué, erreur
// réseau, robot d'indexation avare — resterait vide : tout le contenu serait
// masqué en attendant un observateur qui n'arriverait jamais. Ici, le pire cas
// est une page qui s'affiche d'un coup, sans animation. C'est le bon pire cas.
//
// Ce composant ne rend rien : il ne fait qu'installer l'observateur.

export default function Reveal() {
  useEffect(() => {
    const cibles = document.querySelectorAll("[data-reveal]");
    if (!cibles.length) return;

    // Respecter le réglage système « réduire les animations ». La feuille de
    // style le fait déjà de son côté ; on évite en plus d'installer
    // l'observateur pour rien.
    const sobre = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (sobre || !("IntersectionObserver" in window)) return;

    cibles.forEach((el) => el.classList.add("reveal"));

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (!entree.isIntersecting) continue;
          entree.target.classList.add("is-in");
          // Une seule apparition par élément : réanimer un bloc à chaque
          // passage donnerait le mal de mer sur un retour en arrière.
          observateur.unobserve(entree.target);
        }
      },
      // Le déclenchement se fait un peu AVANT que l'élément touche le bas de
      // l'écran, sinon l'animation commence quand le lecteur est déjà dessus.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    cibles.forEach((el) => observateur.observe(el));
    return () => observateur.disconnect();
  }, []);

  return null;
}
