import { Message, Mail, Cam, Check, Close, FileText } from "./Icons";
import { IcPhone } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// « How it works » (09/11/2026, demande directe). Le titre a la typographie
// de « Two moments that matter » juste au-dessus, et son sous-titre dit que
// ces trois étapes valent pour tous les usages, sans nommer le recrutement
// ni l'onboarding.
//
// Trois étapes côte à côte, chacune dans un GRAND CADRE HAUT, aux couleurs
// d'Onbord (l'aplat clair des fenêtres de Moments), avec son visuel au
// centre ; le titre et le texte sont DESSOUS, sur le blanc, hors du cadre :
//
//   1. construire la simulation : le personnage IA, son canal, sa langue, sa
//      difficulté, et ce sur quoi il est construit (l'offre, le contexte) ;
//   2. utiliser les canaux de l'équipe : les quatre, et DEUX sélectionnés
//      (l'appel vidéo ET l'e-mail) : une même simulation en combine
//      plusieurs, comme le travail de l'équipe (demande directe) ;
//   3. évaluer : la méthode de notation de l'application, des points de
//      contrôle atteints ou manqués et la phrase qui le prouve.
//
// Les mêmes trois étapes pour le recrutement et pour l'onboarding. Les trois
// visuels racontent la même scène (Daniel Visser, l'appel vidéo de
// découverte), pour qu'on lise une suite et pas trois exemples.
//
// ⚠️ La mise en page vient d'un modèle fourni par Remco (grands blocs, texte
// dessous), PAS ses couleurs : une version en bleu, rose et pêche, avec des
// visuels refaits à l'image du modèle, a été refusée le jour même (« les
// couleurs doivent rester les couleurs Onbord », et les visuels d'avant).
// Retenue le 09/11/2026 contre une section des quatre canaux (« Every
// conversation of the job, simulated »), supprimée.
//
// Les visuels sont décoratifs et décrits d'un bloc (`role="img"`) : rien n'y
// est cliquable. ⚠️ Règle 2 : voir le commentaire de `home.flow`.
// ─────────────────────────────────────────────────────────────────────────────

// Le gabarit de photo de WorkScenes.js (la personne EN FACE), à écraser par
// une vraie photo dans public/people/.
const PHOTO_PERSONA = "/people/portrait-1.jpg";

const ICONES = { video: Cam, phone: IcPhone, chat: Message, email: Mail };

// Les ancres « Simulations » et « Scoring » de la barre et du pied de page
// visaient les sections `#work` et `#proof`, retirées de l'accueil le
// 09/11/2026 : elles mènent maintenant à la 2e et à la 3e étape.
const ANCRES = { channels: "work", evaluate: "proof" };

export default function Etapes({ f }) {
  const visuels = [<Persona key="build" t={f.persona} />, <Canaux key="channels" t={f.channels} />, <Rapport key="evaluate" t={f.report} />];
  return (
    <>
      <div className="wrap parcours__head">
        <h2 className="h2" id="flow-titre">{f.title}</h2>
        <p className="lede">{f.lede}</p>
      </div>
      <ol className="wrap parcours__grid">
        {f.steps.map((s, i) => (
          <li className="parcours__step" key={s.key} id={ANCRES[s.key]}>
            <div className="parcours__frame app-ui" role="img" aria-label={s.alt}>{visuels[i]}</div>
            <h3 className="parcours__title">{s.title}</h3>
            <p className="parcours__body">{s.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

// 1. Le personnage et ses réglages, puis ce sur quoi il est construit.
function Persona({ t }) {
  return (
    <div className="fl-card" aria-hidden="true">
      <div className="fl-persona">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTO_PERSONA} alt="" />
        <p><b>{t.name}</b></p>
        <span className="fl-tag">{t.tag}</span>
      </div>
      <div className="fl-props">
        {t.rows.map((r) => (
          <p key={r.label}>
            <span>{r.label}</span>
            <b>
              {r.level ? (
                <span className="fl-level">{[1, 2, 3].map((n) => <i key={n} className={n <= r.level ? "is-on" : ""} />)}</span>
              ) : null}
              {r.value}
            </b>
          </p>
        ))}
      </div>
      <p className="fl-from">{t.builtFrom}</p>
      <p className="fl-sources">
        {t.sources.map((x) => <span key={x}><FileText size={12} />{x}</span>)}
      </p>
    </div>
  );
}

// 2. Les quatre canaux, ceux de la simulation sélectionnés.
export function Canaux({ t }) {
  return (
    <div className="fl-channels" aria-hidden="true">
      {t.map((c) => {
        const Icone = ICONES[c.key];
        return (
          <div className={`fl-channel${c.on ? " is-on" : ""}`} key={c.key}>
            <span className="fl-channel__ic"><Icone size={15} /></span>
            {c.on ? <span className="fl-channel__ok"><Check size={10} /></span> : null}
            <b>{c.name}</b>
          </div>
        );
      })}
    </div>
  );
}

// 3. La note : un critère, puis chaque point de contrôle avec, juste sous
// son énoncé, l'extrait de l'appel qui le prouve (atteint) ou le dément
// (manqué). Une seule citation en bas de carte ne prouvait qu'un point sur
// trois : retirée, sur demande directe.
export function Rapport({ t }) {
  return (
    <div className="fl-card" aria-hidden="true">
      <div className="fl-report__head">
        <span className="fl-report__name">{t.name}</span>
        <b className="fl-report__pct">{t.pct}</b>
      </div>
      <div className="fl-crit">
        <b>{t.criterion}</b>
        <span className="fl-bar"><i style={{ width: `${t.critPct}%` }} /></span>
      </div>
      <ul className="fl-checks">
        {t.checks.map((c) => (
          <li key={c.text} className={c.ok ? "is-ok" : "is-miss"}>
            <span>{c.ok ? <Check size={10} /> : <Close size={10} />}</span>
            <p>
              {c.text}
              {/* « Passed » / « Missed », sur les pages Solutions seulement. */}
              {t.passed ? <em className={`fl-state fl-state--${c.ok ? "ok" : "miss"}`}>{c.ok ? t.passed : t.missed}</em> : null}
              <span className="fl-said">{c.said}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
