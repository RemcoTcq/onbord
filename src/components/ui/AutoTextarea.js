"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// useLayoutEffect n'existe pas au rendu serveur et React le signale bruyamment.
// Le composant est bien un composant client, mais Next le pré-rend quand même.
const useEffetDeMiseEnPage = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Zone de texte qui s'ajuste toujours à son contenu.
 *
 * Pourquoi elle existe : l'éditeur d'expérience affiche des textes ÉCRITS PAR
 * LE MODÈLE — énoncés de tâche, ancres BARS, sources CRM de 120 à 250 mots. Le
 * `rows={2}` ou `rows={4}` d'origine était calibré sur une saisie à la main ;
 * appliqué à ces textes, il obligeait le recruteur à scroller à l'intérieur de
 * chaque encadré, ou à les redimensionner un par un, pour relire ce qu'il est
 * précisément censé relire avant de publier.
 *
 * L'attribut `rows` reste le PLANCHER, et n'est pas contourné : à hauteur
 * `auto`, le navigateur dimensionne d'abord la zone d'après `rows`, si bien que
 * `scrollHeight` ne descend jamais en dessous. Un champ vide garde donc sa
 * taille, un champ long s'ouvre en entier.
 */
export default function AutoTextarea({ onChange, style, ...rest }) {
  const ref = useRef(null);

  const ajuster = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // `box-sizing: border-box` est global (globals.css) : la hauteur inclut donc
    // les bordures, que `scrollHeight` ignore. Sans ce rattrapage, il reste deux
    // pixels de défilement résiduel — le défaut même qu'on corrige ici.
    el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
  }, []);

  // Avant peinture : le contenu vient du serveur et est déjà là au premier
  // rendu. Ajusté dans un effet ordinaire, le champ s'afficherait tronqué le
  // temps d'une frame, puis sauterait à sa taille.
  useEffetDeMiseEnPage(ajuster);

  // La largeur commande le retour à la ligne, donc la hauteur : une fenêtre
  // rétrécie sans ce rappel ramène le défilement intérieur.
  useEffect(() => {
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, [ajuster]);

  return (
    <textarea
      ref={ref}
      onChange={(e) => { ajuster(); onChange?.(e); }}
      style={{ ...style, overflowY: "hidden", resize: "none" }}
      {...rest}
    />
  );
}
