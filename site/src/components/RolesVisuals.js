import { FileText, Building, Check, Sparkle, ArrowRight } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Les visuels de /business-roles (14/10/2026). Composants serveur : ils ne
// réagissent à rien ; le seul bloc qui se manipule, le copilote, a son propre
// fichier client (Copilot.js).
//
// Même règle que les maquettes (règle 5) : du HTML, en noir et blanc, sans
// étiquette flottante au-dessus du panneau. Le texte d'à côté dit déjà ce
// qu'on regarde.
// ─────────────────────────────────────────────────────────────────────────────

// Des barres grises de largeurs différentes : ce que le personnage garde pour
// lui ne s'écrit pas, même dans une maquette. C'est aussi ce qu'on ne dévoile
// pas sur la vitrine.
const CACHE = [[46, 22, 30], [34, 40], [28, 18, 36]];

/**
 * Les personnages. DEUX fiches, décalées l'une de l'autre, et choisies
 * aussi différentes que possible (un acheteur sceptique dehors, un collègue
 * débordé dedans). Il y en a eu trois : la troisième doublait la première et
 * prenait la place. Les noms sont des personnages, pas des candidats : rien à voir
 * avec `mocks.shortlist`.
 */
export function Cast({ c }) {
  return (
    <figure className="cast" role="img" aria-label={c.title}>
      {c.people.map((p, i) => (
        <div className="cast__card" key={p.name}>
          <span className="cast__avatar" aria-hidden="true">
            {p.name.split(" ").map((m) => m[0]).join("")}
          </span>
          <div className="cast__body">
            <p className="cast__top">
              <b className="cast__name">{p.name}</b>
              <span className="tag">{p.mood}</span>
            </p>
            <p className="cast__role">{p.role}</p>
            <dl className="cast__rows">
              <div className="cast__row">
                <dt>{c.wantsLabel}</dt>
                <dd>{p.wants}</dd>
              </div>
              <div className="cast__row">
                <dt>{c.hiddenLabel}</dt>
                <dd className="cast__redact">
                  {CACHE[i % CACHE.length].map((w, j) => <i key={j} style={{ width: w }} />)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ))}
    </figure>
  );
}

const ICONES_SOURCES = { company: Building, posting: FileText, skills: Check };

/**
 * Ce qu'on donne, et ce qui en sort. Les compétences cochées à droite sont
 * CELLES de gauche, pas une seconde liste : c'est la couverture des
 * compétences requises, qui existe dans l'application (chaque must-have
 * observé au moins une fois).
 */
export function Feed({ c }) {
  const competences = c.inputs.find((s) => s.chips)?.chips ?? [];
  return (
    <figure className="feed" role="img" aria-label={c.title}>
      <div className="feed__in">
        {c.inputs.map((s) => {
          const Ico = ICONES_SOURCES[s.id];
          return (
            <div className="feed__src" key={s.id}>
              <p className="feed__label">{Ico ? <Ico size={13} /> : null}{s.label}</p>
              {s.chips ? (
                <p className="feed__chips">
                  {s.chips.map((ch) => <span className="tag" key={ch}>{ch}</span>)}
                </p>
              ) : (
                <p className="feed__value">{s.value}</p>
              )}
            </div>
          );
        })}
      </div>

      <span className="feed__arrow" aria-hidden="true"><ArrowRight size={18} /></span>

      <div className="feed__out">
        <p className="feed__label"><Sparkle size={13} />{c.output.label}</p>
        <p className="feed__title">{c.output.title}</p>
        <p className="feed__meta">{c.output.meta}</p>
        <ul className="feed__checks">
          {competences.map((ch) => (
            <li key={ch}>
              <Check size={13} />
              <span>{ch}</span>
              <i>{c.output.covered}</i>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
