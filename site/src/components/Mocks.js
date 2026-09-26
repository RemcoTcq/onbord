import { Check, Close, Bot, Mail, ArrowRight } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Les maquettes d'interface.
//
// Elles sont écrites en HTML et en CSS, pas importées en image, et c'est la
// décision la plus structurante du site. Trois raisons, dans l'ordre :
//
//   1. elles se TRADUISENT. Une capture anglaise sur la version néerlandaise
//      dit au visiteur qu'on lui montre le produit de quelqu'un d'autre ;
//   2. elles restent NETTES partout, et pèsent quelques kilo-octets ;
//   3. elles ne MENTENT pas par vieillissement. Une capture prise une fois finit
//      par montrer un produit qui n'existe plus ; celles-ci se corrigent en
//      éditant une phrase.
//
// Toutes partagent le même chrome (`.ui`) : elles doivent avoir l'air de venir
// du même logiciel, sans quoi personne n'y croit. Toutes sont décoratives au
// sens des lecteurs d'écran — le texte qui les entoure dit déjà ce qu'elles
// montrent — d'où le `role="img"` et une étiquette par maquette.
// ─────────────────────────────────────────────────────────────────────────────

function Frame({ label, children }) {
  return (
    <figure className="ui" role="img" aria-label={label}>
      {children}
    </figure>
  );
}

/** La note d'une sous-dimension, en pourcentage.
 *  L'application convertit un niveau BARS en pourcentage — (niveau − 1) × 25,
 *  voir runScoring.js à la racine — et c'est ce pourcentage que le recruteur
 *  lit dans son rapport. Le site montrait « 3 sur 5 », une échelle interne que
 *  personne n'a en tête ; il montre maintenant le même chiffre que l'écran. */
function Pct({ value, warn = false }) {
  return (
    <span className="pct" aria-hidden="true">
      <span className={`pct__bar${warn ? " pct__bar--warn" : ""}`}>
        <i style={{ width: `${value}%` }} />
      </span>
      <b className="pct__n">{value}%</b>
    </span>
  );
}

// La maquette du hero a disparu d'ici : ce n'est plus une maquette. Le visiteur
// écrit lui-même ce qu'il cherche et la construction se déroule sous ses yeux,
// donc le bloc est devenu un composant client — voir `Playground.js`. Les
// classes `.prompt` et `.gen` qu'il utilise vivent toujours dans globals.css, et
// `.gen` sert encore ici, à `GenMock`.

// ── Fiche de notation ───────────────────────────────────────────────────────
/** `compact` : la note et ses lignes, SANS les citations ni les
 *  justifications. Sur l'accueil, la fiche sert à montrer la FORME d'un
 *  rapport, pas à le faire lire ; les citations y ajoutaient douze lignes de
 *  texte que personne ne lit en survolant. La version complète reste celle de
 *  /scoring, où c'est justement le sujet. */
export function ScoreCard({ m, compact = false }) {
  return (
    <Frame label={`${m.skill} — ${m.score}${m.outOf}`}>
      <div className="ui__body">
        <div className="score__head">
          <div>
            <p className="score__skill">{m.skill}</p>
          </div>
          <p className="score__total">{m.score}<small>{m.outOf}</small></p>
        </div>

        <div>
          {m.dims.map((d) => (
            <div className="dim" key={d.name}>
              <div className="dim__row">
                <span className="dim__name">{d.name}</span>
                <Pct value={d.pct} />
              </div>
              {compact ? null : (
                <>
                  <p className="quote">{d.quote}</p>
                  <p className="dim__why">{d.why}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Ce que le rapport dit de l'IA ────────────────────────────────────────────
// L'usage de l'IA est SA PROPRE note (`ai_usage_score` dans runScoring.js,
// racine du dépôt), qui ne juge pas SI l'assistant a été utilisé mais
// COMMENT — cadrage du problème, itération sur la réponse, regard critique
// sur ce qui revient. Le plafond de recopiage existe aussi dans l'application
// (il touche une compétence précise, pas cette note), mais reste hors de
// cette maquette : un seul mécanisme montré, plus simple à lire d'un coup
// d'œil qu'une comparaison entre deux notes.
export function AiUsageMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <div className="assist__msgs" style={{ padding: 0 }}>
          <p className="bubble bubble--me">{m.msgMe}</p>
          <p className="bubble bubble--ai">{m.msgAi}</p>
        </div>

        <div className="dim" style={{ marginTop: 18 }}>
          <div className="dim__row">
            <span className="dim__name">{m.ai.name}</span>
            <Pct value={m.ai.pct} />
          </div>
          <p className="dim__why">{m.ai.why}</p>
        </div>
      </div>
    </Frame>
  );
}

// ── Composeur d'e-mail, avec l'assistant à côté ─────────────────────────────
export function EmailMock({ m, withAssistant = true }) {
  return (
    <Frame label={m.subjectValue}>
      <div className="ui__body">
        <p className="brief"><b>{m.briefLabel}</b>{m.brief}</p>

        {/* Plus de ligne « À » : le destinataire a quitté le dictionnaire, et le
            composant dessinait une ligne vide à sa place. L'objet suffit, il
            porte le contexte ; l'adresse e-mail n'apprenait rien. */}
        <dl style={{ display: "grid", gap: 9 }}>
          <div className="fld"><dt>{m.subject}</dt><dd>{m.subjectValue}</dd></div>
        </dl>

        {/* Le curseur clignotant fait la différence entre « une capture d'un
            e-mail » et « quelqu'un est en train d'écrire ». */}
        <p className="compose">
          {m.body}
          <span className="caret" aria-hidden="true" />
        </p>

        {withAssistant && (
          <div className="assist">
            <div className="assist__head">
              <Bot size={13} />
              <span className="ui__title">{m.assistant}</span>
            </div>
            <div className="assist__msgs">
              <p className="bubble bubble--me">{m.msgMe}</p>
              <p className="bubble bubble--ai">{m.msgAi}</p>
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

// ── Fiche CRM ───────────────────────────────────────────────────────────────
// La contradiction plantée dans le brief est le détail que personne d'autre ne
// raconte. Elle mérite d'être montrée, pas décrite.
export function CrmMock({ m }) {
  return (
    <Frame label={m.flag}>
      <div className="ui__body">
        <p className="brief"><b>{m.sourceLabel}</b>{m.source}</p>

        <div>
          {m.rows.map((r) => (
            <div className="crm__row" key={r.k}>
              <span className="crm__k">{r.k}</span>
              <span className={`crm__v${r.ok ? "" : " crm__v--bad"}`}>{r.v}</span>
              {r.ok ? (
                <Check size={13} style={{ color: "var(--ok)" }} />
              ) : (
                <span className="tag tag--bad"><Close size={10} />{m.missed}</span>
              )}
            </div>
          ))}
        </div>

        <p className="brief" style={{ background: "rgba(180,83,9,0.06)", borderColor: "rgba(180,83,9,0.22)" }}>
          <b style={{ color: "var(--warn)" }}>{m.flagLabel}</b>
          {m.flag}
        </p>
      </div>
    </Frame>
  );
}

// ── Exercice de code ────────────────────────────────────────────────────────
// Le bloc de code est écrit en dur, en anglais, et ne se traduit pas : du code
// se lit en anglais dans toutes les langues. Seuls les noms de tests et le
// libellé de la tâche viennent du dictionnaire.
//
// La fonction elle-même est ancrée dans un vrai geste commercial (nettoyer des
// leads dupliqués), pas un exercice d'algorithme générique : un recruteur qui
// regarde cette maquette doit reconnaître le métier, pas un manuel de code.
export const SNIPPET = `import { normalizeEmail } from "./format";

const SOURCES = ["import", "form", "event", "referral"];

export function flagDuplicateLeads(leads) {
  const seen = new Map();
  const flagged = [];

  for (const lead of leads) {
    if (!SOURCES.includes(lead.source)) continue;

    const key = normalizeEmail(lead.email);
    const previous = seen.get(key);

    if (!previous) {
      seen.set(key, lead);
      continue;
    }

    flagged.push({
      keep: previous.id,
      drop: lead.id,
      reason: "same email, later entry",
    });
  }

  return { kept: [...seen.values()], flagged };
}`;

export function CodeMock({ m }) {
  return (
    <Frame label={m.task}>
      <div className="ui__body" style={{ paddingBottom: 14 }}>
        <p className="brief"><b>Task</b>{m.task}</p>
      </div>
      <pre className="code"><code>{SNIPPET}</code></pre>
      <div className="ui__body">
        <div className="tests">
          {m.tests.map((t) => (
            <p className="test" key={t.name}>
              <i className={`test__dot test__dot--${t.ok ? "ok" : "bad"}`} />
              {t.name}
              {t.verdict ? <em>{t.verdict}</em> : null}
            </p>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Mise en situation jouée en direct ───────────────────────────────────────
export function LiveMock({ m }) {
  return (
    <figure className="ui" role="img" aria-label={m.line}>
      <div className="live">
        <div>
          <p className="live__who">{m.who}</p>
          <p className="live__line">“{m.line}”</p>
        </div>
        <p style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>{m.instruction}</p>
        <div className="live__bar">
          <span className="rec" aria-hidden="true"><i /></span>
          <span className="live__time">{m.time}</span>
          {/* Retards différents d'une barre à l'autre : douze barres identiques
              ressemblent à un chargement, pas à une voix. */}
          <span className="live__wave" aria-hidden="true">
            {[0.0, 0.18, 0.36, 0.1, 0.5, 0.28, 0.44, 0.06, 0.32, 0.2, 0.48, 0.14].map((d, i) => (
              <i key={i} style={{ animationDelay: `${d}s` }} />
            ))}
          </span>
        </div>
      </div>
    </figure>
  );
}

// ── Journal de génération, seul ─────────────────────────────────────────────
export function GenMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <div className="gen">
          {m.lines.map((l) => (
            <div className={`gen__line gen__line--${l.state}`} key={l.text}>
              <span className="gen__mark" aria-hidden="true">
                {l.state === "done" ? "✓" : l.state === "now" ? <span className="spin" /> : "·"}
              </span>
              <span>{l.text}</span>
              <span className="gen__t">{l.t}</span>
              {l.note ? <p className="gen__note">{l.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Grille de notation, une sous-dimension ──────────────────────────────────
export function GridMock({ m }) {
  return (
    <Frame label={m.dim}>
      <div className="ui__body">
        <div className="score__head" style={{ paddingBottom: 12 }}>
          <div>
            <p className="score__skill">{m.dim}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {m.levels.map((lv) => (
            <div key={lv.n} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr)", gap: 14 }}>
              <Pct value={Number(lv.pct)} />
              <div>
                <p style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{lv.label}</p>
                <p className="dim__why" style={{ marginTop: 3 }}>{lv.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// Le retour écrit au candidat a quitté ce fichier : il montre désormais DEUX
// e-mails, celui d'un candidat retenu et celui d'un refusé, et il lui faut donc
// un état. Voir `FeedbackTabs.js`.

export { Pct, Frame };

// ═══════════════════════════════════════════════════════════════════════════
// Les trois maquettes du DÉBUT du parcours, ajoutées quand l'accueil est
// devenu chronologique. Avant, la page montrait le candidat au travail et le
// rapport, mais jamais ce que le RECRUTEUR fait : coller l'offre, valider les
// compétences, cadrer la simulation. Le produit commençait donc au milieu.
//
// Leur contenu suit le vocabulaire réel de l'application (`dashboard.js` :
// « Hard skills », « Must have », « Screening questions », « Candidate
// experience ») : une maquette qui invente des libellés promet une interface
// que la démo ne montrera pas.
// ═══════════════════════════════════════════════════════════════════════════

// ── L'offre lue, les compétences extraites ──────────────────────────────────
export function SkillsMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <p className="brief"><b>{m.familyLabel}</b>{m.family}</p>

        {[
          { label: m.hardLabel, items: m.hard },
          { label: m.softLabel, items: m.soft },
        ].map((groupe) => (
          <div key={groupe.label}>
            <p className="skills__label">{groupe.label}</p>
            <div className="skills">
              {groupe.items.map((s) => (
                <span className={`skill${s.must ? " skill--must" : ""}`} key={s.name}>
                  {s.name}
                  <i>{s.must ? m.must : m.nice}</i>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

// ── Le pipeline de recrutement ──────────────────────────────────────────────
// `on` distingue ce qu'Onbord fait de ce que l'entreprise continue de faire
// elle-même (l'entretien, la rencontre sur site). Tout colorer laisserait
// croire que le produit prend la main sur le recrutement entier, ce qui est
// faux et, commercialement, effrayant.
export function PipelineMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <ol className="pipe">
          {m.nodes.map((n, i) => (
            <li className={`pipe__node${n.on ? " pipe__node--on" : ""}`} key={n.name}>
              <span className="pipe__n">{String(i + 1).padStart(2, "0")}</span>
              <div style={{ minWidth: 0 }}>
                <p className="pipe__name">{n.name}</p>
                <p className="pipe__meta">{n.meta}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Frame>
  );
}

// ── Le chat de cadrage ──────────────────────────────────────────────────────
// La ligne du bas est l'essentiel : le chat ne répond pas, il MODIFIE la
// simulation et dit ce qu'il a changé.
export function ChatMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <div className="assist__msgs" style={{ padding: 0 }}>
          <p className="bubble bubble--me">{m.msgMe}</p>
          <p className="bubble bubble--ai">{m.msgAi}</p>
        </div>

        <p className="brief" style={{ background: "rgba(37,99,235,0.05)", borderColor: "rgba(37,99,235,0.2)" }}>
          <b style={{ color: "var(--text)" }}>{m.changedLabel}</b>
          {m.changed}
        </p>
      </div>
    </Frame>
  );
}

// ── Le CV en gris, la preuve en couleur ─────────────────────────────────────
// Un seul panneau, coupé en deux par une ligne verticale — plus les deux
// cartes empilées d'avant, qui se chevauchaient (la preuve posée sur le coin
// du CV) et devenaient illisibles l'une sans l'autre en dessous de 1080px.
// Ici les deux moitiés se lisent indépendamment, et une flèche fine traverse
// la ligne du milieu pour porter, à elle seule, le sens « ça devient ça ».
//
// Ce qui relie les deux : c'est la MÊME personne et la MÊME compétence. Le CV
// affirme « à l'aise avec les clients exigeants » ; vingt minutes plus tard, on
// lit la phrase qu'elle a écrite à un client exigeant, et son pourcentage.
//
// Chaque ligne du CV porte un « ? » plutôt qu'une étiquette à lire
// (« unverifiable ») : un point d'interrogation se comprend d'un coup d'œil,
// une étiquette technique demande qu'on s'arrête pour la lire cinq fois.
//
// La citation et sa justification viennent de `score.dims[0]`, pas d'une copie
// dans le dictionnaire : le site raconte le même moment à deux endroits, et une
// deuxième version du texte finirait par diverger.
//
// Ce que ce bloc ne fait pas : se moquer du candidat. Les lignes du CV sont des
// phrases honnêtes, que n'importe qui écrirait. Le reproche porte sur ce qu'un
// CV ne peut pas montrer, jamais sur la personne qui l'a écrit.
export function CvProof({ cv, score, labels }) {
  const d = score.dims[0];
  return (
    <figure className="ui cvp" role="img" aria-label={`${cv.window} — ${d.quote}`}>
      <div className="cvp__col cvp__col--cv">
        <p className="cvp__head">{labels.cvLabel}</p>

        <div className="cv__head">
          <span className="cv__avatar" aria-hidden="true">{cv.initials}</span>
          <div style={{ minWidth: 0 }}>
            <p className="cv__name">{cv.name}</p>
            <p className="cv__role">{cv.role}</p>
          </div>
          <span className="tag">{cv.match}</span>
        </div>

        <div>
          {cv.lines.map((l) => (
            <div className="cv__line" key={l}>
              <span>{l}</span>
              <span className="cv__q" aria-hidden="true">?</span>
            </div>
          ))}
        </div>
      </div>

      <div className="cvp__divider" aria-hidden="true">
        <span className="cvp__arrow"><ArrowRight size={13} /></span>
      </div>

      <div className="cvp__col cvp__col--proof">
        <p className="cvp__head cvp__head--proof">{labels.proofLabel}</p>

        <div className="dim__row">
          <span className="dim__name">{d.name}</span>
          <Pct value={d.pct} />
        </div>
        <p className="quote">{d.quote}</p>
        <p className="dim__why">{d.why}</p>
      </div>
    </figure>
  );
}

// ── La liste courte, classée ────────────────────────────────────────────────
// Ce que le recruteur RÉCUPÈRE. Le site montrait par le menu comment la
// simulation se fabrique et jamais ce qu'on obtient au bout ; c'est pourtant la
// seule image qu'un recruteur pressé cherche.
//
// La dernière ligne n'a pas de note, et c'est voulu : un candidat invité qui
// n'a pas commencé ne coûte rien et n'invente pas de score. Une liste où tout
// le monde a un chiffre serait une liste truquée.
export function ShortlistMock({ m }) {
  return (
    <Frame label={m.window}>
      <div className="ui__body">
        <div>
          {m.rows.map((r) => (
            <div className={`sl__row${r.top ? " sl__row--top" : ""}`} key={r.name}>
              <span className="sl__n">{r.n}</span>
              <span className="sl__avatar" aria-hidden="true">{r.initials}</span>
              <span className="sl__name">{r.name}</span>
              {r.score ? (
                <>
                  {/* `score` est déjà un pourcentage (0–100), pas une note sur
                      5 : diviser par 5 avant de le remultiplier par 100
                      faisait déborder la barre à chaque fois, qui rendait
                      alors pleine quel que soit le score réel. */}
                  <span className="sl__bar" aria-hidden="true">
                    <i style={{ width: `${r.score}%` }} />
                  </span>
                  <span className="sl__score">{r.score}%</span>
                </>
              ) : (
                // Pas de barre du tout pour un candidat qui n'a pas terminé :
                // une barre vide se confond avec un score à 0 %.
                <span className="sl__wait" style={{ gridColumn: "span 2" }}>{m.waiting}</span>
              )}
              <span className={`tag${r.score ? " tag--ok" : ""}`}>{r.state}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}
