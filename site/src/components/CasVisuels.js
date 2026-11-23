import { Cam, Check, FileText, Mail, Message } from "./Icons";
import { IcCheck, IcChevron, IcPhone, IcRotate, IcSend, Statut } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// Les visuels des pages « Solutions » (10/11/2026, demande directe) : le
// recrutement, l'onboarding et le SaaS B2B. Chacun est une CARTE au style de
// la plateforme, posée dans le cadre clair des étapes de « How it works »
// (`.cas__cadre`), et réutilise ses briques (`fl-*`, `ap-*`). Les écrans
// entiers de la plateforme (candidats classés, fiche d'une recrue, tableau
// des personnes) sont la fenêtre de Moments (`AppFenetre`), pas un composant
// d'ici.
//
// Décoratifs : la carte est `aria-hidden`, le cadre porte la description
// (`role="img"`), rien n'est cliquable. Les libellés repris de l'application
// sont ceux de ses dictionnaires (« Situation: », « Online », « Your message
// to… », « To », « Subject », « Sent on… »).
// ─────────────────────────────────────────────────────────────────────────────

const CANAUX = { video: Cam, phone: IcPhone, chat: Message, email: Mail };

/** La conversation du candidat avec le client simulé, en cours (chat). */
export function Conversation({ t }) {
  return (
    <div className="fl-card cv" aria-hidden="true">
      <div className="cv__head">
        <span className="ap-avatar">{t.initials}</span>
        <span className="cv__who">
          <b>{t.name}</b>
          <span className="cv__online"><i />{t.status}</span>
        </span>
        <span className="cv__step">{t.step}</span>
      </div>
      <p className="cv__context"><b>{t.contextLabel}</b> {t.context}</p>
      <div className="cv__fil">
        {t.messages.map((m) => (
          <p key={m.text} className={`cv__msg cv__msg--${m.from}`}>{m.text}</p>
        ))}
        <p className="cv__typing">{t.typing}</p>
      </div>
      <div className="cv__input">
        <span>{t.placeholder}</span>
        <i><IcSend size={13} /></i>
      </div>
    </div>
  );
}

/** Le retour envoyé à un candidat : l'e-mail, ses champs, son statut. */
export function Retour({ t, body }) {
  return (
    <div className="fl-card rt" aria-hidden="true">
      <div className="rt__head">
        <b>{t.title}</b>
        <Statut t="ok">{t.sent}</Statut>
      </div>
      <p className="rt__field"><span>{t.toLabel}</span>{t.to}</p>
      <p className="rt__field"><span>{t.subjectLabel}</span>{t.subject}</p>
      <div className="rt__body">
        {body.map((p) => <p key={p}>{p}</p>)}
      </div>
    </div>
  );
}

// ── L'onboarding, recopié de l'application (23/11/2026) ─────────────────────
// Trois cartes, chacune la copie d'un bloc d'une vraie page (racine du dépôt) :
//   • Documents → Entreprise › Connaissances, le bloc « Documents »
//     (app/[lang]/(dashboard)/entreprise/connaissances/page.js) ;
//   • Module    → la page d'un module (onboarding/modules/[id]/page.js) :
//     ses pastilles, « Régénérer », puis l'étape et son personnage ;
//   • Essai     → ce que la recrue voit après un essai
//     (components/essai/RetourEssai.js) : score face au seuil, compétence par
//     compétence, chaque point attendu noté 0, 1 ou 2 avec sa phrase.

/** Les documents de l'entreprise : utilisés, ou mis de côté. */
export function Documents({ t }) {
  return (
    <div className="fl-card obc" aria-hidden="true">
      <div className="obc__head">
        <b>{t.title}</b>
        <span className="obc__small">{t.count}</span>
      </div>
      <div className="obc__inset">
        {t.docs.map((d) => (
          <div className={`obc__doc${d.on ? "" : " obc__doc--off"}`} key={d.title}>
            <FileText size={17} />
            <span className="obc__stack">
              <b>{d.title}</b>
              <span className="obc__small">{d.meta}</span>
            </span>
            <span className="obc__check"><i className={d.on ? "is-on" : ""}>{d.on ? <IcCheck size={10} /> : null}</i>{d.on ? t.inUse : t.aside}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** La page d'un module : pastilles, « Régénérer », l'étape et son personnage. */
export function Module({ t }) {
  const Icone = CANAUX[t.channel] || IcPhone;
  return (
    <div className="fl-card obc" aria-hidden="true">
      <div className="obc__head">
        <span className="obc__crumb">{t.crumb}<IcChevron size={14} /></span>
        <b className="obc__h1">{t.title}</b>
      </div>
      <div className="obc__chips">
        <span className="obc__chip"><Icone size={12} />{t.channelName}</span>
        {t.chips.map((c) => <span className="obc__chip" key={c}>{c}</span>)}
        <span className="obc__chip obc__chip--green">{t.state}</span>
      </div>
      <span className="obc__btn"><IcRotate size={13} />{t.regenerate}</span>
      <div className="obc__inset obc__step">
        <span className="obc__eyebrow"><Icone size={12} />{t.step}</span>
        <b>{t.stepTitle}</b>
        <span className="obc__persona">
          <span className="ap-avatar">{t.persona.initials}</span>
          <span className="obc__stack">
            <b>{t.persona.name}</b>
            <span className="obc__small">{t.persona.role}</span>
            <span>{t.persona.personality}</span>
          </span>
        </span>
      </div>
    </div>
  );
}

/** Ce que la recrue voit après un essai noté. */
export function Essai({ t }) {
  return (
    <div className="fl-card obc" aria-hidden="true">
      <div className="obc__head">
        <span className="obc__eyebrowGrey">{t.attempt}</span>
        <b className="obc__h1">{t.title}</b>
      </div>
      <div className="obc__inset obc__score">
        <span className="obc__stack">
          <span className="obc__small">{t.scoreLabel}</span>
          <b className="obc__stat">{t.score} %</b>
        </span>
        <span className="obc__meterCol">
          <span className="obc__meter"><i style={{ width: `${t.score}%` }} /></span>
          <span className="obc__small">{t.passMark}</span>
        </span>
        <span className="obc__chip obc__chip--green">{t.passed}</span>
      </div>
      <div className="obc__head obc__head--sub">
        <b>{t.skills}</b>
        <span className="obc__small">{t.hint}</span>
      </div>
      <div className="obc__inset">
        <span className="obc__skill">
          <b>{t.skill}</b>
          <span className="obc__meter obc__meter--thin"><i style={{ width: `${t.skillScore}%` }} /></span>
          <span className="obc__mono">{t.skillScore} %</span>
        </span>
        {t.points.map((p) => (
          <span className="obc__pt" key={p.d}>
            <span className={`obc__mono obc__pt--${p.s}`}>{p.s}/2</span>
            <span className="obc__stack">
              {p.d}
              <i>{p.v}</i>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Les quatre canaux côte à côte, tous pris en charge (page SaaS). */
export function QuatreCanaux({ t }) {
  return (
    <div className="fl-channels qc" aria-hidden="true">
      {t.map((c) => {
        const Icone = CANAUX[c.key];
        return (
          <div className="fl-channel is-on" key={c.key}>
            <span className="fl-channel__ic"><Icone size={15} /></span>
            <span className="fl-channel__ok"><Check size={10} /></span>
            <b>{c.name}</b>
            <span>{c.use}</span>
          </div>
        );
      })}
    </div>
  );
}
