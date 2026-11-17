"use client";

// La frise des étapes d'une création (17/11/2026) : où l'on en est, ce qui est
// fait, ce qui vient. Une étape faite se rouvre d'un clic (`onAller`), ou mène
// à une autre page (`href`) quand elle s'est faite ailleurs — l'usage choisi
// sur « Créer une simulation », vu depuis la création d'offre.

import { Fragment } from "react";
import { Check } from "lucide-react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";

export default function EtapesCreation({ etapes, courante, onAller, label }) {
  return (
    <nav aria-label={label} className="etapes-creation">
      <ol>
        {etapes.map((e, i) => {
          const faite = i < courante;
          const active = i === courante;
          const contenu = (
            <>
              <span className="etapes-creation-num" data-etat={faite ? "faite" : active ? "active" : "a-venir"}>
                {faite ? <Check size={13} strokeWidth={2.6} /> : i + 1}
              </span>
              <span className="etapes-creation-label">{e.label}</span>
            </>
          );
          let element = <span className="etapes-creation-item">{contenu}</span>;
          if (faite && e.href) element = <Link href={e.href} className="etapes-creation-item etapes-creation-lien">{contenu}</Link>;
          else if (faite && onAller) element = <button type="button" className="etapes-creation-item etapes-creation-lien" onClick={() => onAller(i)}>{contenu}</button>;
          return (
            <Fragment key={e.cle}>
              {i > 0 && <li aria-hidden="true" className="etapes-creation-trait" data-fait={i <= courante ? "1" : undefined} />}
              <li aria-current={active ? "step" : undefined}>{element}</li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
