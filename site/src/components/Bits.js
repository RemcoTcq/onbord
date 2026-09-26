import Link from "next/link";
import { ArrowRight, Info } from "./Icons";

// Petites briques partagées par toutes les pages. Elles existent pour une
// raison précise : le titre à mot accentué, l'intitulé de section et le bloc
// d'appel final reviennent sur chaque page. Réécrits à la main à chaque fois,
// ils divergeraient à la troisième.

/** Filet horizontal lumineux, qui s'éteint sur les bords. */
export function Hr() {
  return <div className="hr" aria-hidden="true" />;
}

/** Intitulé de section : un point lumineux, puis le mot. */
export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}

/**
 * Titre à trois morceaux, avec le mot accentué en dégradé.
 * Trois morceaux plutôt qu'une chaîne balisée : le mot mis en valeur ne tombe
 * pas au même endroit d'une langue à l'autre, et une traduction n'a pas à
 * manipuler du HTML.
 */
export function Title({ a, em, b, className = "h2" }) {
  return (
    <h2 className={className}>
      {a} <em className="em">{em}</em>{b ? ` ${b}` : ""}
    </h2>
  );
}

/**
 * Idem, en <h1>. Une seule par page.
 * `size="page"` bascule sur la taille des pages intérieures (`.display--page`,
 * plus petite que le hero) : Simulations, Scoring et Pricing l'utilisent, la
 * page d'accueil garde la taille par défaut, son seul vrai moment de grand
 * titre. `size` omis = taille du hero, sans avoir à le préciser partout.
 */
// `coupe` force le retour a la ligne AVANT la fin du titre, au lieu de
// laisser `text-wrap: balance` decider. Le hero s en sert : sa premiere
// ligne doit etre la promesse entiere (« Hire on real skills. ») et la
// seconde la chute (« Not CVs. »). Equilibre automatiquement, le titre
// coupait au milieu de la promesse, et la chute perdait son effet de
// contre-pied. Ailleurs, on laisse le navigateur equilibrer.
export function TitleH1({ a, em, b, size, coupe }) {
  // Quand le titre est coupe a un endroit choisi, sa ligne la plus longue
  // est connue d'avance : on passe son nombre de caracteres a la feuille de
  // style (--car), qui en deduit une taille de police qui la fait tenir. Voir
  // .display--ajuste dans globals.css.
  const car = coupe
    ? Math.max(`${a}${em ? ` ${em}` : ""}`.length, (b || "").length)
    : null;
  return (
    <h1
      className={`display${size === "page" ? " display--page" : ""}${car ? " display--ajuste" : ""}`}
      style={car ? { "--car": car } : undefined}
    >
      {a}
      {em ? <> <em className="em">{em}</em></> : null}
      {b ? (coupe ? <><br />{b}</> : ` ${b}`) : ""}
    </h1>
  );
}

/** Note discrète, avec son icône. */
export function Note({ children }) {
  return (
    <p className="note">
      <Info size={14} />
      <span>{children}</span>
    </p>
  );
}

/** Règle de conception citée telle quelle — le bloc qui cite le produit. */
export function RuleBox({ label, children }) {
  return (
    <div className="ruleBox">
      <p className="ruleBox__label">{label}</p>
      <p className="ruleBox__text">« {children} »</p>
    </div>
  );
}

/** Lien « suite », avec sa flèche. */
export function More({ href: to, children }) {
  return (
    <Link className="more" href={to}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}

/**
 * Bloc d'appel final, commun à toutes les pages.
 * Une grande surface bleue arrondie, posée juste au-dessus du pied de page :
 * c'est le dernier point lumineux de la page, et donc le dernier endroit où
 * l'œil s'arrête.
 */
export function Cta({ title, em, titleB, body, primary, primaryHref, secondary, secondaryHref }) {
  // `section--tail` ouvre la BANDE FINALE : la trame du hero, en pleine
  // largeur, qui descend sans interruption jusqu au bas du pied de page.
  return (
    <section className="section section--tail">
      <span className="colonnes colonnes--tail" aria-hidden="true" />
      <div className="wrap">
        <div className="cta">
          <div className="cta__in">
            {em ? <Title a={title} em={em} b={titleB} /> : <h2 className="h2">{title}</h2>}
            <p className="body">{body}</p>
            <div className="cta__actions">
              <a className="btn btn--primary" href={primaryHref}>
                {primary}
                <ArrowRight size={15} />
              </a>
              {secondary ? (
                <a className="btn btn--ghost" href={secondaryHref}>{secondary}</a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Bloc de page intérieure : intitulé et titre à gauche, contenu à droite. */
export function Split({ eyebrow, title, children, sticky = true }) {
  return (
    <div className="split">
      <div className={sticky ? "split__aside" : ""}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}
