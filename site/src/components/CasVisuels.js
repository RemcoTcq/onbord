import { Cam, Check, FileText, Mail, Message } from "./Icons";
import { IcMail, IcMessage, IcPhone, IcSend, Statut } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// Les visuels des pages « Solutions » (10/11/2026, demande directe) : le
// recrutement, l'onboarding et le SaaS B2B. Chacun est une CARTE au style de
// la plateforme, posée dans le cadre clair des étapes de « How it works »
// (`.cas__cadre`), et réutilise ses briques (`fl-*`, `ap-*`). Les écrans
// entiers de la plateforme (candidats classés, modules d'une recrue) sont la
// fenêtre de Moments (`AppFenetre`), pas un composant d'ici.
//
// Décoratifs : la carte est `aria-hidden`, le cadre porte la description
// (`role="img"`), rien n'est cliquable. Les libellés repris de l'application
// sont ceux de ses dictionnaires (« Situation: », « Online », « Your message
// to… », « To », « Subject », « Sent on… »).
//
// ⚠️ Règle 2 : l'ONBOARDING N'EXISTE PAS ENCORE dans l'application. Les
// cartes de module (ModuleCarte, Recrues) sont des projections, comme
// l'écran d'onboarding de Moments.
// ─────────────────────────────────────────────────────────────────────────────

const ICONES = { call: IcPhone, email: IcMail, chat: IcMessage };
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

/** Un module d'onboarding : son format, ses réglages, et ce sur quoi il est
 *  construit. `t.updated` : la pastille « Updated » (page SaaS). */
export function ModuleCarte({ t }) {
  const Icone = ICONES[t.kind] || IcPhone;
  return (
    <div className="fl-card" aria-hidden="true">
      <div className="fl-persona">
        <span className="mc__ic"><Icone size={17} /></span>
        <p><b>{t.title}</b><span>{t.sub}</span></p>
        <span className={`fl-tag${t.updated ? " mc__updated" : ""}`}>{t.tag}</span>
      </div>
      <div className="fl-props">
        {t.rows.map((r) => (
          <p key={r.label}><span>{r.label}</span><b>{r.value}</b></p>
        ))}
      </div>
      <p className="fl-from">{t.builtFrom}</p>
      <p className="fl-sources">
        {t.sources.map((x) => <span key={x}><FileText size={12} />{x}</span>)}
      </p>
    </div>
  );
}

/** Les nouvelles recrues et où elles en sont : la carte de Lucas en tête,
 *  avec sa barre « Ready for day one », puis deux autres. */
export function Recrues({ t }) {
  return (
    <div className="fl-card rc" aria-hidden="true">
      <p className="rc__title">{t.title}</p>
      {t.people.map((p) => (
        <div className={`rc__row${p.main ? " rc__row--main" : ""}`} key={p.name}>
          <span className="ap-avatar">{p.initials}</span>
          <span className="rc__who">
            <b>{p.name}</b>
            <span>{p.role}</span>
          </span>
          <Statut t={p.tone}>{p.state}</Statut>
          <span className="rc__prog">
            <span className="rc__line"><b>{p.label}</b><span>{p.modules}</span></span>
            <span className="rc__track"><i style={{ width: `${p.pct}%` }} /></span>
          </span>
        </div>
      ))}
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
