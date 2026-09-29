"use client";

import { useState } from "react";
import { PLANS, formatPrice } from "@/lib/pricing";
import { Check, ArrowRight } from "./Icons";

// La grille des plans. Composant client pour une seule raison : la bascule
// annuel / mensuel.
//
// Les PRIX viennent de lib/pricing.js, recopié du barème de l'application — pas
// du dictionnaire. Un montant n'est pas une traduction, et le dupliquer en
// trois langues garantissait qu'un jour l'une des trois afficherait l'ancien
// tarif. Le dictionnaire ne porte que ce qui se traduit : le nom du plan, la
// phrase qui dit à qui il s'adresse, ses puces.

export default function PlanTable({ dict, locale, demoHref, talkHref }) {
  const [annuel, setAnnuel] = useState(true);

  return (
    <>
      {/* Centre, sous l'en-tete de la page qui l'est aussi. */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div className="toggle" role="group" aria-label={dict.eyebrow}>
          {/* Le curseur glissant est un élément à part : une transition de
              couleur de fond sur le bouton actif ne se verrait pas. */}
          <span
            className={`toggle__thumb${annuel ? "" : " toggle__thumb--right"}`}
            aria-hidden="true"
          />
          <button type="button" aria-pressed={annuel} onClick={() => setAnnuel(true)}>
            {dict.annual}
          </button>
          <button type="button" aria-pressed={!annuel} onClick={() => setAnnuel(false)}>
            {dict.monthly}
          </button>
        </div>
        {/* La hauteur de cette ligne est réservée en CSS même quand elle est
            vide : sans ça, toute la grille sautait d'un cran à chaque bascule. */}
        <p className="toggle__hint">{annuel ? dict.save : ""}</p>
      </div>

      <div className="plans">
        {PLANS.map((plan) => {
          const t = dict.plans[plan.id];
          const montant = annuel ? plan.annual : plan.monthly;

          return (
            <article
              className={`card plan${plan.featured ? " plan--featured" : ""}`}
              key={plan.id}
              data-reveal
            >
              <div>
                <div className="plan__head">
                  <h2 className="plan__name">{t.name}</h2>
                  {plan.featured && <span className="tag tag--ink">{dict.popular}</span>}
                </div>
                <p className="plan__for" style={{ marginTop: 6 }}>{t.for}</p>
              </div>

              <div>
                <p className="plan__price">
                  {montant == null ? (
                    dict.onQuote
                  ) : (
                    <>
                      {formatPrice(montant, locale)}
                      <span>{dict.perMonth}</span>
                    </>
                  )}
                </p>
                {/* La ligne de facturation existe sur les TROIS cartes, vide sur
                    Custom (qui est sur devis) : sa hauteur est reservee pour que
                    les rangees suivantes tombent a la meme hauteur d'une carte a
                    l'autre. */}
                <p className="plan__billed" style={{ marginTop: 8 }} aria-hidden={montant == null || undefined}>
                  {montant == null ? " " : annuel ? dict.billedAnnually : dict.billedMonthly}
                </p>
              </div>

              <div>
                <p className="plan__credits">
                  {plan.credits ? (
                    <>
                      <b>{plan.credits}</b>{" "}
                      <span>{dict.creditsPerMonth}</span>
                    </>
                  ) : (
                    <span>{dict.tailored}</span>
                  )}
                </p>
                {/* Le report des credits, a la place de l'ancien prix du credit
                    supplementaire (retire). Il ne vaut que pour l'engagement
                    ANNUEL : la ligne s'affiche quand la bascule est sur « Annuel »
                    et reste vide sinon, comme sur Custom. Sa hauteur est gardee
                    dans tous les cas, pour que les boutons des trois cartes
                    restent alignes. */}
                <p className="plan__extra" style={{ marginTop: 10 }} aria-hidden={!(annuel && plan.credits) || undefined}>
                  {annuel && plan.credits ? dict.rollover : " "}
                </p>
              </div>

              {/* ⚠️ LE BOUTON EST SOUS LE PRIX, PAS EN BAS DE LA CARTE.

                  Il etait colle en bas (margin-top: auto). Les trois cartes ont
                  la meme hauteur, celle de Core, la plus longue : Pro et Custom,
                  plus courtes, avaient donc 180 a 210px de vide entre leur
                  derniere puce et leur bouton. C'est ce vide qui donnait l'air
                  d'une carte inachevee.

                  Remonte sous le prix, le bouton tombe a la meme hauteur sur les
                  trois cartes, avec tout ce qui concerne ce qu'on PAIE au-dessus
                  de lui et tout ce qu'on OBTIENT en dessous. Les listes de puces
                  s'arretent alors a des hauteurs differentes, comme n'importe
                  quelle liste, et plus rien ne pend au bas d'une carte vide.

                  Aucun bouton ne mene a une inscription : celle de
                  l'application est FERMEE (les comptes sont crees a la main).

                  CUSTOM EST UN CAS A PART, ET ASSUME. Son bouton dit « Talk to
                  sales » et ouvre un e-mail au sujet « parler a quelqu'un »,
                  pas « demo ». Sur ce plan, il faut d'abord fixer un tarif avec
                  un commercial : il n'y a rien a montrer avant. Ne l'alignez pas
                  sur les boutons des deux autres plans. */}
              <a
                className={`btn btn--block ${plan.featured ? "btn--blue" : "btn--line"}`}
                href={plan.id === "custom" ? talkHref : `${demoHref}?plan=${plan.id}`}
              >
                {t.cta}
                <ArrowRight size={14} />
              </a>

              <div>
                {t.includes ? <p className="plan__includes" style={{ marginBottom: 14 }}>{t.includes}</p> : null}
                <ul className="ticks">
                  {t.features.map((f) => (
                    <li key={f} style={{ fontSize: "0.875rem" }}>
                      <Check size={13} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
