"use client";

import { useEffect, useRef } from "react";

// Une phrase qui passe du gris au noir, mot après mot, au fil du défilement.
//
// Le HTML servi est la phrase en gris, entière et lisible : sans JavaScript,
// elle reste grise, et c'est le bon pire cas. Le script ne fait qu'allumer
// les mots (`.is-on`) au rythme de la position de la phrase dans l'écran :
// rien d'allumé quand son haut entre par le bas (85 % de la hauteur), tout
// allumé quand son bas atteint le milieu. On remonte, ça se rééteint : la
// couleur suit le défilement, elle ne se déclenche pas une fois pour toutes.
//
// Sous « réduire les animations », la phrase s'affiche directement en noir.

export default function Encre({ texte, className }) {
  const ref = useRef(null);
  const mots = texte.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spans = el.querySelectorAll(".encre__mot");

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      spans.forEach((s) => s.classList.add("is-on"));
      return;
    }

    let image = 0;
    const peindre = () => {
      image = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      const debut = h * 0.85;
      const fin = h * 0.5 - r.height;
      const p = Math.min(1, Math.max(0, (debut - r.top) / (debut - fin)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle("is-on", i < n));
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(peindre);
    };

    peindre();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
    };
  }, []);

  return (
    <p ref={ref} className={className}>
      {mots.map((m, i) => (
        <span className="encre__mot" key={i}>
          {m}
          {i < mots.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
