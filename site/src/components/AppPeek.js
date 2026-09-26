"use client";

import { useEffect, useRef } from "react";
import { Logo, Search, Bell } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// La fenêtre de l'application, sous la barre de saisie du hero.
//
// Ce n'est PAS une maquette au sens de `Mocks.js` : celles-là prouvent quelque
// chose et se lisent mot à mot. Celle-ci imite une CAPTURE D'ÉCRAN du produit,
// prise d'assez loin pour qu'on n'en lise qu'une partie. Elle situe.
//
// ── Ce qu'elle montre, et pourquoi CETTE page ───────────────────────────────
// L'EXPÉRIENCE CANDIDAT EN TRAIN DE S'ÉCRIRE : les étapes de la simulation,
// leur format, leur durée, et celle que l'assistant est en train de rédiger.
//
// Trois pages étaient possibles, et le choix n'est pas neutre :
//
//   • une conversation avec l'assistant — écartée, ça se confond avec
//     n'importe quel outil de chat ;
//   • la liste classée des candidats — écartée, et c'est le piège le plus
//     tentant : c'est joli, mais la page la montre DÉJÀ plus bas, dans
//     « voici ce que vous récupérez ». La mettre ici aussi, c'est dépenser le
//     hero pour répéter une section ;
//   • l'expérience en train d'être construite — retenue. Juste au-dessus, la
//     barre dit « je veux une simulation pour… ». La fenêtre montre le
//     résultat direct de cette phrase. L'une répond à l'autre, et c'est ça
//     qui fait comprendre Onbord en une image : on décrit un poste, un
//     exercice s'écrit.
//
// ── Ce qui est lisible, et ce qui ne l'est pas ───────────────────────────────
// Lisible : le nom de l'offre, les noms des candidats et leurs notes.
// Illisible : la navigation de gauche, les méta-données secondaires, rendues
// en barres grises. Une fenêtre entièrement lisible demande à être lue, et
// vole alors l'attention de la barre de saisie juste au-dessus, qui est le
// vrai sujet du hero.
//
// Des barres plutôt que du vrai texte flouté : un `filter: blur()` coûte une
// couche de composition à chaque image, pour un rendu que trois rectangles
// arrondis donnent gratuitement.
//
// ── Le survol ────────────────────────────────────────────────────────────────
// La fenêtre s'incline très légèrement vers le curseur. C'est le seul endroit
// du site qui réagit à la souris, et ça tient en deux variables CSS posées
// par le pointeur — pas de librairie, pas d'état React, donc aucun rendu
// déclenché pendant le mouvement. Désactivé si la personne a demandé moins
// d'animations (voir `globals.css`).
// ─────────────────────────────────────────────────────────────────────────────

/** Une ligne de faux texte. `w` en pourcentage de la colonne. */
function Bar({ w, dim = false }) {
  return <span className={`peek__bar${dim ? " peek__bar--dim" : ""}`} style={{ width: `${w}%` }} />;
}

export default function AppPeek({ m, skills }) {
  const cadre = useRef(null);

  // ── L'ARRIVÉE SUR LA PAGE ────────────────────────────────────────────────
  // La fenêtre est PENCHÉE EN ARRIÈRE au chargement (le haut s'éloigne), puis
  // se redresse à mesure qu'on descend. En même temps, le titre, le
  // sous-titre et le bouton glissent vers le haut ET PASSENT DERRIÈRE elle.
  //
  // Les trois valeurs sont écrites en variables CSS sur la section du hero,
  // pas en état React : le défilement en produirait des dizaines par seconde,
  // et chacune relancerait un rendu de l'arbre entier pour déplacer deux
  // éléments. Ici le navigateur ne fait que recomposer, sans rien recalculer.
  useEffect(() => {
    const el = cadre.current;
    const hero = el?.closest(".hero--full");
    if (!hero) return;

    // Le réglage système « réduire les animations » désactive tout : une page
    // dont le contenu bascule et glisse est précisément ce que ce réglage
    // demande d'éviter.
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const texte = hero.querySelector(".hero__in");
    const fenetre = hero.querySelector(".peek");
    if (!texte || !fenetre) return;

    let pret = true;
    const suivre = () => {
      if (!pret) return;
      pret = false;
      requestAnimationFrame(() => {
        pret = true;

        // Le redressement de la fenetre. Saute sous « reduire les
        // animations » : c'est le seul vrai mouvement de l'effet.
        if (!reduit) {
          // 18deg a l arrivee, contre 11 avant : la fenetre doit se voir
          // COUCHEE au premier coup d oeil, sinon l inclinaison passe pour
          // un defaut de cadrage.
          //
          // Le redressement se fait sur 130px de defilement, et surtout PAS
          // en ligne droite : le carre de la progression demarre lentement
          // puis accelere, donc les premiers pixels ne redressent presque
          // rien et la fenetre finit de se lever d un coup. Un rapport
          // lineaire donnait un mouvement plat, qui se lit comme un reglage
          // plutot que comme un geste.
          const av = Math.min(Math.max(window.scrollY / 130, 0), 1);
          hero.style.setProperty("--lean", ((1 - av * av) * 18).toFixed(2) + "deg");
        }

        // LE FONDU. Le texte est colle sous l'en-tete et la fenetre remonte
        // par-dessus : le haut de la fenetre balaie le bloc de haut en bas.
        // On mesure ou en est ce balayage, et le texte s'efface exactement
        // pendant qu'il se fait recouvrir.
        //
        // Sans ce fondu, le sous-titre et le bouton RESSORTENT sous le bord
        // bas de la fenetre une fois qu'elle est montee assez haut : ils
        // etaient caches, ils reapparaissent, et l'effet se defait.
        // ⚠️ LE FONDU EST CALE SUR LE BORD BAS DE LA FENETRE.
        //
        // Le titre passe bien DERRIERE la fenetre : elle est au-dessus dans
        // l ordre de peinture, c est verifie. Mais le bloc de texte est plus
        // haut que la fenetre : le sous-titre et le bouton finissent par
        // depasser SOUS son bord bas, et la ils se revoient.
        //
        // On mesure donc la marge restante entre le bas de la fenetre et le
        // bas du texte, et le fondu est fini avant qu elle s annule. Le
        // texte reste ainsi NET pendant tout le temps ou il glisse
        // reellement sous la fenetre — c est ca, l effet — et il est parti
        // au moment ou il ressortirait.
        //
        // Le masque du bas de la fenetre a ete resserre a 2% en meme temps :
        // a 8%, le bouton transparaissait par cette bande semi-opaque alors
        // meme qu il etait DERRIERE. Le defaut etait la, pas dans l ordre
        // d empilement.
        // ⚠️ Sur telephone la fenetre est masquee (display: none) : son
        // rectangle vaut zero partout, la « marge » calculee devient
        // negative et le titre du hero disparaissait des l'arrivee. Sans
        // fenetre, il n'y a rien sous quoi passer : le texte reste plein.
        if (!fenetre.getClientRects().length) {
          hero.style.setProperty("--fade", "1");
          texte.style.visibility = "";
          return;
        }
        const t = texte.getBoundingClientRect();
        const w = fenetre.getBoundingClientRect();
        const marge = (w.bottom - 40) - t.bottom;
        const f = Math.min(Math.max(marge / 120, 0), 1);
        hero.style.setProperty("--fade", f.toFixed(3));
        texte.style.visibility = f === 0 ? "hidden" : "";
      });
    };

    suivre();
    window.addEventListener("scroll", suivre, { passive: true });
    return () => window.removeEventListener("scroll", suivre);
  }, []);

  // ⚠️ LA FENETRE NE SUIT PLUS LA SOURIS, et ce n est pas un oubli.
  //
  // Elle s inclinait sous le pointeur (deux variables CSS, --tx et --ty,
  // posees par onMouseMove). C etait le seul element du site qui reagissait
  // a la souris. Retire sur demande directe : une carte qui bascule au
  // survol est l effet le plus repandu des gabarits, et il entrait en
  // conflit avec le VRAI mouvement de cette fenetre, son redressement au
  // defilement. Deux inclinaisons sur le meme objet, l une sous la souris et
  // l autre sous le scroll, se contrarient des qu on approche le curseur.
  //
  // Ne le remettez pas pour « rendre le hero vivant » : il l est deja, au
  // defilement.

  return (
    <div className="peek" aria-hidden="true">
      <div className="peek__win" ref={cadre}>
        <div className="peek__chrome">
          <span className="peek__dots"><i /><i /><i /></span>
        </div>

        <div className="peek__body">
          <aside className="peek__side">
            <span className="peek__brand"><Logo height={14} /></span>
            <span className="peek__navOn" />
            <Bar w={70} dim />
            <Bar w={52} dim />
            <Bar w={61} dim />
            <Bar w={44} dim />
          </aside>

          <div className="peek__main">
            {/* L'en-tête de l'offre : le seul titre plein de la fenêtre. */}
            <div className="peek__head">
              <div>
                <p className="peek__job">{m.job}</p>
                <Bar w={38} dim />
              </div>
              <span className="peek__icons"><Search size={12} /><Bell size={12} /></span>
            </div>

            {/* Le bandeau de l'expérience : ce qu'on construit, et sa durée. */}
            <div className="peek__meta">
              <span className="peek__tag">{m.experience}</span>
              <span className="peek__dur">{m.duration}</span>
            </div>

            {/* Les étapes. La dernière est EN COURS d'écriture : c'est elle
                qui dit que la page est vivante, ce qu'une capture figée ne
                dit jamais. */}
            <div className="peek__steps">
              {m.steps.map((st, i) => (
                <div className={`peek__step${i === m.steps.length - 1 ? " peek__step--now" : ""}`} key={st.name}>
                  <span className="peek__num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="peek__stepName">{st.name}</span>
                  <span className="peek__fmt">{st.format}</span>
                  {i === m.steps.length - 1
                    ? <span className="peek__writing"><i className="spin" />{m.writing}</span>
                    : <span className="peek__min">{st.min}</span>}
                </div>
              ))}
            </div>

            {/* Les competences que l offre a donnees. Du contenu REEL et
                traduit (il vient de common.mocks.skills), pas des cadres
                vides : trois rectangles gris ne disent rien du produit. */}
            <div className="peek__grid">
              <span className="peek__gridLabel">{skills.hardLabel}</span>
              <div className="peek__chips">
                {skills.hard.map((s) => (
                  <span className={`peek__chip${s.must ? " peek__chip--must" : ""}`} key={s.name}>{s.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
