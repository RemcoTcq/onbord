import { SNIPPET } from "./Mocks";
import { Mic, MicOff, Cam, Hangup } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Ce que fait le candidat, en UNE image composée.
//
// Trois objets qui se chevauchent, et rien d'autre :
//
//   1. le CODE, derrière, en haut. Quelques lignes et des tests qui passent ;
//   2. l'E-MAIL, au milieu, avec la réponse en train de s'écrire ;
//   3. l'APPEL, devant : la personne en face en grand, le candidat en
//      médaillon, et les commandes.
//
// Le chevauchement est le sujet : trois panneaux alignés proprement auraient dit
// « voici trois fonctionnalités », alors que trois panneaux qui se marchent
// dessus disent « il se passe plusieurs choses, dans la même demi-heure ».
//
// ── Pourquoi les symboles d'appel ────────────────────────────────────────────
// Deux visages côte à côte, ce n'est pas un appel : c'est une photo de deux
// personnes. Ce qui fait l'appel, ce sont les SIGNES — les pastilles de nom, le
// micro barré sur celui qui écoute, le point rouge d'enregistrement, et surtout
// la barre de commandes avec son bouton rouge. On les reconnaît sans les lire,
// et c'est exactement ce qu'on demande à une image dans une page qu'on survole.
//
// Ces commandes ne pilotent rien : ce sont des `<span>`, pas des boutons. Un
// vrai bouton dans une image décorative promettrait une action qui n'existe pas,
// et un lecteur d'écran l'annoncerait comme cliquable.
// ─────────────────────────────────────────────────────────────────────────────

// ⚠️ LES DEUX PHOTOS DE L'APPEL. Les fichiers livrés sont des GABARITS : une
// silhouette ne vend rien, ce qu'il faut ici, ce sont deux vraies photos de
// personnes en visio.
//
// Ils sont en .jpg et pas en .svg exprès : pour les remplacer, on ÉCRASE les
// deux fichiers de public/people/ avec de vraies photos, et il n'y a pas une
// ligne de code à toucher. Cadrage portrait 3/4, regard vers l'objectif, la
// grande pour la personne EN FACE, le médaillon pour le candidat.
const PHOTOS = {
  grande: "/people/portrait-1.jpg",
  medaillon: "/people/portrait-2.jpg",
};

export default function WorkScenes({ m, s }) {
  return (
    <div className="compo" role="img" aria-label={s.label}>
      {/* Le code, derrière. Coupé par le bord du panneau : on n'a pas besoin de
          lire la fonction, on a besoin de voir que du code s'écrit. */}
      <figure className="compo__code">
        {/* L'onglet de fichier et les pastilles : sans eux, un bloc de code
            gris sur fond blanc pouvait aussi bien être une citation. Avec
            eux, on reconnaît un éditeur en une demi-seconde. */}
        <div className="compo__tabs">
          <span className="compo__dots" aria-hidden="true"><i /><i /><i /></span>
          <span className="compo__tab">{s.codeFile}</span>
        </div>
        <pre className="code"><code>{SNIPPET}</code></pre>
        {/* Les résultats des tests. C'ÉTAIT quatre tirets de couleur sans un
            mot : l'information était là (trois tests passent, celui de
            performance échoue) mais rien ne permettait de la lire, et on
            pouvait la prendre pour une décoration. Le compte est écrit à
            côté maintenant. C'est une des affirmations du site — « du vrai
            code, de vrais tests » — elle mérite d'être lisible. */}
        <div className="compo__tests" aria-hidden="true">
          {m.code.tests.map((t, i) => (
            <i key={i} className={t.ok ? undefined : "ko"} />
          ))}
          <span className="compo__testCount">
            {m.code.tests.filter((t) => t.ok).length}/{m.code.tests.length} {s.testsLabel}
          </span>
        </div>
      </figure>

      {/* L'e-mail. Le curseur clignotant fait la différence entre une capture
          et quelqu'un qui écrit. */}
      <figure className="compo__mail">
        {/* Une vraie fenêtre de rédaction : la barre « Nouveau message », le
            destinataire, l'objet, le corps en train de s'écrire, et le bouton
            d'envoi en bas. La pastille d'initiales et le rôle du destinataire
            ont sauté : c'était une FICHE CONTACT posée sur un e-mail, et on ne
            voit ça dans aucune messagerie. */}
        <p className="compo__bar">{s.compose}</p>

        <div className="compo__fields">
          <p className="compo__field"><span>{s.to}</span>{s.fromName}</p>
          <p className="compo__field"><span>{s.subject}</span>{m.email.subjectValue}</p>
        </div>

        {/* Le corps, PUIS la formule de politesse et la signature. Le mail
            s'arrêtait au milieu d'un paragraphe : dans une simulation
            commerciale, la clôture fait partie de ce qui est noté, et un
            e-mail sans elle n'est pas un e-mail fini. */}
        <p className="compo__type">
          {m.email.body}
          <span className="caret" aria-hidden="true" />
        </p>

        <p className="compo__sign">
          {s.signOff}
          <b>{s.meName}</b>
        </p>

        <div className="compo__send">
          <span className="compo__sendBtn">{s.send}</span>
          {/* Les outils de mise en forme, en gris : c'est le détail qui fait
              « fenêtre de rédaction » plutôt que « bloc de texte ». */}
          <span className="compo__tools" aria-hidden="true">
            <b>B</b><i>I</i><u>U</u>
          </span>
        </div>
      </figure>

      {/* L'appel, devant. */}
      <figure className="compo__call">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="compo__video" src={PHOTOS.grande} alt="" aria-hidden="true" />

        {/* L'enregistrement : le point rouge et le minuteur. */}
        <span className="compo__rec" aria-hidden="true"><i />{m.live.time}</span>

        {/* La grande vignette, c'est la personne EN FACE : dans un appel, on
            regarde l'autre, et on se voit soi-même en médaillon. Il vient de
            poser son objection, son micro est coupé, il écoute la réponse. */}
        <span className="compo__who compo__who--them" aria-hidden="true">
          <MicOff size={10} />
          {s.themName}
        </span>

        {/* Le candidat, en médaillon : c'est lui qui répond, micro ouvert. */}
        <span className="compo__pipWrap" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="compo__pip" src={PHOTOS.medaillon} alt="" />
          <span className="compo__who compo__who--me">
            <Mic size={10} />
            {s.meName}
          </span>
        </span>

        {/* Les commandes. Le rouge est le seul point chaud de la composition :
            c'est lui qui dit « appel » avant même qu'on lise un mot. */}
        <span className="compo__ctrl" aria-hidden="true">
          <span className="compo__btn"><Mic size={12} /></span>
          <span className="compo__btn"><Cam size={12} /></span>
          <span className="compo__btn compo__btn--end"><Hangup size={12} /></span>
        </span>
      </figure>
    </div>
  );
}
