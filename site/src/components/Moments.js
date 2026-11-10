"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "./Icons";

// « Two moments that matter » : le recrutement, puis l'onboarding.
//
// Sur bureau, la section est plus haute que l'écran et son contenu y est
// COLLÉ (`position: sticky`). À gauche, le titre, puis les deux moments en
// TYPOGRAPHIE SEULE, sur DEUX niveaux et pas quatre : le nom du moment
// (Hiring, New hire onboarding) en titre, puis un paragraphe dont la première
// phrase, à l'encre, est l'accroche. Les deux noms restent visibles ; celui
// du moment affiché est à l'encre et déroule son texte, l'autre est gris
// pâle. (Petit nom + grand titre + texte + lien se lisaient « pas propre ».)
// Même geste que la phrase juste au-dessus (Encre.js), qui passe du gris au
// noir. Une version en cartes (fond blanc, ombre, icônes bleues, trait de
// progression) a été refusée : « ça fait trop section faite par IA ». À
// droite, la fenêtre de l'application du moment, en fondu. Le nom du moment et son texte sont donc au même endroit : la version
// précédente (trois colonnes, repères en bas à gauche, texte en bas à droite)
// se lisait mal (retour direct).
//
// Le moment affiché se déduit de la position de la section dans l'écran ; un
// clic sur un titre gris fait défiler la page jusqu'à lui.
//
// Sur téléphone (≤ 980px), rien n'est collé : tous les moments sont
// ouverts, chacun suivi de sa fenêtre.

export default function Moments({ title, items, visuals, links }) {
  const ref = useRef(null);
  const [actif, setActif] = useState(0);
  const [pile, setPile] = useState(false);
  const n = items.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const colle = el.querySelector(".moments__sticky");
    const mq = window.matchMedia("(max-width: 980px)");

    let image = 0;
    const lire = () => {
      image = 0;
      if (mq.matches) return;
      const r = el.getBoundingClientRect();
      const haut = parseFloat(getComputedStyle(colle).top) || 0;
      const course = r.height - (window.innerHeight - haut);
      const p = course > 0 ? Math.min(1, Math.max(0, (haut - r.top) / course)) : 0;
      setActif(Math.min(n - 1, Math.floor(p * n)));
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(lire);
    };
    const changer = () => {
      setPile(mq.matches);
      lire();
    };

    changer();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    mq.addEventListener("change", changer);
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      mq.removeEventListener("change", changer);
    };
  }, [n]);

  // Fait défiler jusqu'au milieu de la plage où le moment `i` est affiché.
  const aller = (i) => {
    const el = ref.current;
    const colle = el.querySelector(".moments__sticky");
    const haut = parseFloat(getComputedStyle(colle).top) || 0;
    const r = el.getBoundingClientRect();
    const course = r.height - (window.innerHeight - haut);
    const sobre = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: window.scrollY + r.top - haut + course * ((i + 0.5) / n),
      behavior: sobre ? "auto" : "smooth",
    });
  };

  return (
    <section ref={ref} className="moments" style={{ "--n": n }} aria-labelledby="moments-titre">
      <div className="moments__sticky">
        <div className="wrap moments__grid">
          <div className="moments__side">
            <h2 className="h2" id="moments-titre">{title}</h2>

            <div className="moments__list">
              {items.map((it, i) => {
                const on = pile || i === actif;
                return (
                  <div className={`moments__item${on ? " is-on" : ""}`} key={it.key}>
                    <h3 className="moments__h">
                      <button
                        type="button"
                        className="moments__itemHead"
                        aria-expanded={on}
                        onClick={() => aller(i)}
                      >
                        <span className="moments__title">{it.tag}</span>
                      </button>
                    </h3>
                    <div className="moments__itemBody" inert={!on}>
                      <div>
                        <p className="moments__lede"><b>{it.title}</b> {it.lede}</p>
                        <a className="moments__link" href={links[i]}>
                          {it.link}
                          <ChevronRight size={14} />
                        </a>
                        {/* Sur téléphone, la fenêtre suit son texte. */}
                        <div className="moments__visualPile">{visuals[i]}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="moments__visuals">
            {visuals.map((v, i) => (
              <div className={`moments__visual${i === actif ? " is-on" : ""}`} key={items[i].key}>
                {v}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
