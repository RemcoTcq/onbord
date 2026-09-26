import { Check, Globe, Mail, Bot } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Les vignettes de « Comment ça marche ».
//
// Elles ne sont PAS des maquettes d'interface comme celles de `Mocks.js`. Une
// maquette montre un écran ; celles-ci montrent une IDÉE, en trois ou quatre
// éléments. Sur une page qui déroule huit étapes, huit écrans détaillés côte à
// côte deviennent un mur : on ne lit plus ni le texte ni les images.
//
// La règle de ce fichier : une vignette = quatre éléments au maximum, pas de
// paragraphe, pas de bandeau, et on comprend sans lire. Si une vignette a
// besoin d'une légende pour s'expliquer, elle est ratée.
//
// Le texte vient de `pages.how.viz` dans les dictionnaires, pas de
// `common.mocks` : ces vignettes ne servent que sur cette page.
// ─────────────────────────────────────────────────────────────────────────────

/** Coquille commune : le panneau, sans étiquette au-dessus. */
function Viz({ tag, children, label }) {
  return (
    <figure className="ui viz" role="img" aria-label={label || tag}>
      <div className="viz__body">{children}</div>
    </figure>
  );
}

/** 01 — Le profil d'entreprise, rempli depuis le site web. */
export function VizProfile({ v }) {
  return (
    <Viz tag={v.tag}>
      <p className="viz__field">
        <Globe size={13} />
        {v.url}
      </p>

      <div className="viz__rows">
        {v.rows.map((r) => (
          <p className="viz__row" key={r.k}>
            <span>{r.k}</span>
            <b>{r.v}</b>
          </p>
        ))}
      </div>
    </Viz>
  );
}

/** 02 — L'offre, sous la forme qu'on a sous la main. */
export function VizImport({ v }) {
  return (
    <Viz tag={v.tag}>
      <div className="viz__opts">
        {v.options.map((o, i) => (
          <span className={`viz__opt${i === 0 ? " viz__opt--on" : ""}`} key={o}>
            {i === 0 ? <Check size={12} /> : null}
            {o}
          </span>
        ))}
      </div>
    </Viz>
  );
}

/** 03 — Les compétences, triées, et la phrase de l'offre qui les justifie. */
export function VizSkills({ v }) {
  return (
    <Viz tag={v.tag}>
      <div>
        <p className="viz__label">{v.mustLabel}</p>
        <div className="skills">
          {v.must.map((s) => (
            <span className="skill skill--must" key={s}>{s}</span>
          ))}
        </div>
      </div>

      <div>
        <p className="viz__label">{v.niceLabel}</p>
        <div className="skills">
          {v.nice.map((s) => (
            <span className="skill" key={s}>{s}</span>
          ))}
        </div>
      </div>

      {/* La preuve : l'extraction rend une citation exacte de l'offre pour
          chaque compétence (`evidence`, voir jobExtractionPrompt.js à la racine
          du dépôt). C'est ce qui distingue une extraction d'une devinette. */}
      <p className="viz__quote">{v.evidence}</p>
    </Viz>
  );
}

/** 05 — Les questions de présélection, avec la réponse attendue.
 *  La réponse est affichée telle quelle, sans code couleur : c'est une
 *  consigne de filtrage, pas une note. « Non » est parfois la bonne réponse. */
export function VizQuestions({ v }) {
  return (
    <Viz tag={v.tag}>
      <div className="viz__rows">
        {v.rows.map((r) => (
          <p className="viz__row viz__row--q" key={r.q}>
            <span>{r.q}</span>
            <b className="viz__exp">{r.a}</b>
          </p>
        ))}
      </div>
    </Viz>
  );
}

/** 06 — On dit ce qu'on veut, la simulation s'écrit. */
export function VizChat({ v }) {
  return (
    <Viz tag={v.tag}>
      <p className="bubble bubble--me" style={{ marginLeft: "auto" }}>{v.msg}</p>

      <p className="viz__made">
        <Bot size={13} />
        {v.result}
      </p>
    </Viz>
  );
}

/** 07 — Validé, prêt à partir. */
export function VizReady({ v }) {
  return (
    <Viz tag={v.tag}>
      <p className="viz__ready">
        <span className="viz__check" aria-hidden="true"><Check size={16} /></span>
        <span>
          <b>{v.title}</b>
          <i>{v.sub}</i>
        </span>
      </p>

      <p className="viz__field">
        <Mail size={13} />
        {v.invite}
      </p>
    </Viz>
  );
}
