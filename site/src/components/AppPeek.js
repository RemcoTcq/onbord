"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Icons";
import { IcCap, IcFile, IcInbox, IcPhone, IcArrow, IcCalendar, IcCheckDone, IcChevron, IcChevronDown, IcExpand, IcGear, IcHome, IcJobs, IcLink, IcMail, IcMessage, IcPanel, IcPlus, IcSearch, IcTrash, IcUsers, Note, PASTILLES, Statut, ton } from "./AppUi";

// ─────────────────────────────────────────────────────────────────────────────
// La fenêtre de la plateforme, dans le hero. Ses écrans défilent tout seuls.
//
// ── Ce que c'est (19/10/2026) ────────────────────────────────────────────────
// Une reproduction FIDÈLE de l'interface recruteur, telle qu'elle est sortie
// de la refonte du 19/10 : mêmes couleurs (#1B45C4, fond #EEF1F7, encre
// #14204A), même police (Geist), mêmes rayons, mêmes libellés. Quatre écrans
// qui se relaient toutes les cinq secondes : le tableau de bord, les
// candidats classés, le rapport d'un candidat. (L'écran de la simulation a
// été retiré, demande directe.) Modèle de
// départ : le hero de spott.io, une grande fenêtre droite du produit. Les
// onglets de ce modèle ont été essayés puis retirés (demande directe).
//
// Elle remplace deux choses à la fois :
//   • la barre de saisie (Playground.js), retirée sur demande directe ;
//   • l'ancienne fenêtre, qui montrait en barres grises l'interface d'AVANT
//     la refonte, pipeline comprise, alors que la pipeline n'existe plus.
//
// ── Pourquoi du HTML et pas une capture ──────────────────────────────────────
// Les raisons de la règle 5 (site/AGENTS.md) valent ici plus qu'ailleurs :
// la fenêtre se TRADUIT (une capture en anglais sur la version néerlandaise
// dirait qu'on montre le produit de quelqu'un d'autre), reste NETTE à toutes
// les tailles d'écran, et pèse quelques kilo-octets.
//
// ── L'échelle : une vraie mise en page d'application, réduite par `zoom` ─────
// L'écran est dessiné à la taille réelle de l'application (DESIGN px de large,
// texte à 14px) puis réduit d'un bloc par `zoom` pour tenir dans la colonne,
// exactement comme une capture qu'on rapetisse, mais sans perte. Toutes les
// tailles de `.peek__win` sont donc en px : elles décrivent l'application, pas
// le site. Sur téléphone, le menu de gauche disparaît et la largeur de
// référence tombe à DESIGN_PETIT, sinon le texte deviendrait microscopique.
//
// ── Depuis le 05/11/2026 ─────────────────────────────────────────────────────
// La fenêtre est ENTIÈRE, dans le cadre de `Vitrine.js`, qui pose au-dessus
// le choix Recrutement / Onboarding. Le titre ne passe plus dessous.
//
// Les candidats et leurs notes viennent de `common.mocks` (shortlist, score),
// comme partout sur le site : deux jeux de faux noms sur la même page
// finiraient par se contredire.
// ─────────────────────────────────────────────────────────────────────────────

const DESIGN = 1200;
const DESIGN_PETIT = 880;

// Les écrans, dans l'ordre où ils défilent, et le temps passé sur chacun.
const ECRANS = ["home", "cands", "report"];
const ROTATION = 5000;

// ── Les morceaux communs à tous les écrans ──────────────────────────────────

/** Le menu de gauche. `actif` : "home" (tableau de bord), "onboarding" ou
 *  l'indice du job. `onboarding` : le libellé de l'entrée Onboarding, posée
 *  seulement dans les fenêtres de « Two moments that matter » (AppFenetre). */
function Menu({ a, actif, onboarding }) {
  return (
    <aside className="ap-side">
      <div className="ap-brand">
        <span className="ap-logo"><Logo height={19} /><b>onbord</b></span>
        <span className="ap-ghost"><IcPanel size={17} /></span>
      </div>
      <div className="ap-search">
        <IcSearch size={15} />
        <span>{a.nav.search}</span>
        <kbd>⌘K</kbd>
      </div>
      <div className="ap-group">
        <span className="ap-label">{a.nav.menu}</span>
        <span className={`ap-nav${actif === "home" ? " ap-nav--on" : ""}`}><IcHome />{a.nav.home}</span>
        <span className="ap-nav"><IcJobs /><span className="ap-grow">{a.nav.jobs}</span><span className="ap-count">{a.jobs.length}</span></span>
        {onboarding ? <span className={`ap-nav${actif === "onboarding" ? " ap-nav--on" : ""}`}><IcCap />{onboarding}</span> : null}
      </div>
      <div className="ap-group">
        <span className="ap-label">{a.nav.recent}</span>
        {a.jobs.map((j, i) => (
          <span className={`ap-nav ap-nav--job${actif === i ? " ap-nav--cur" : ""}`} key={j.title}>
            <i style={{ background: PASTILLES[i % PASTILLES.length] }} />
            <span className="ap-ell">{j.title}</span>
          </span>
        ))}
      </div>
      <span className="ap-grow" />
      <span className="ap-nav"><IcGear />{a.nav.settings}</span>
    </aside>
  );
}

/** L'en-tête d'un écran : fil d'Ariane (ou titre), actions, avatar. */
function Tete({ a, chemin = [], titre, children }) {
  return (
    <header className="ap-head">
      <span className="ap-crumbs">
        {chemin.map((c) => (
          <span className="ap-crumb" key={c}>{c}<IcChevron size={16} /></span>
        ))}
        <b className="ap-h1">{titre}</b>
      </span>
      <span className="ap-actions">
        {children}
        <span className="ap-sep" />
        <span className="ap-me">{a.me}</span>
      </span>
    </header>
  );
}

// ── Écran : les candidats classés ─────────────────────────────────────────
function EcranCandidats({ a, liste }) {
  const c = a.cands;
  return (
    <>
      <Tete a={a} chemin={[a.nav.jobs]} titre={a.jobs[0].title}>
        <span className="ap-btn ap-btn--blue"><IcLink size={15} />{a.job.copy}</span>
      </Tete>
      <div className="ap-tabs">
        <span className="ap-tabsList">
          {a.job.tabs.map((t, i) => (
            <span className={`ap-tab${i === 1 ? " ap-tab--on" : ""}`} key={t}>
              {t}
              {i === 1 ? <span className="ap-tabCount">{liste.window.replace(/\D+/g, "")}</span> : null}
            </span>
          ))}
        </span>
        <span className="ap-chips">
          {a.job.chips.map((x) => <span className="ap-chip" key={x}>{x}</span>)}
          <span className="ap-chip ap-chip--ok"><i />{a.job.open}</span>
        </span>
      </div>

      <div className="ap-body">
        <div className="ap-toolbar">
          <span className="ap-field"><IcSearch size={14} />{c.search}</span>
          <span className="ap-select">{c.sort}<b>{c.sortBy}</b><IcChevronDown size={14} /></span>
        </div>
        <div className="ap-table">
          <div className="ap-tr ap-tr--head">
            <span className="ap-box" />
            <span>{c.colCandidate}</span>
            <span>{c.colScore}</span>
            <span>{c.colStatus}</span>
            <span />
          </div>
          {liste.rows.map((r, i) => {
            const note = r.score !== "";
            return (
              <div className="ap-tr" key={r.name}>
                <span className="ap-box" />
                <span className="ap-who">
                  <span className="ap-avatar">{r.initials}</span>
                  <span className="ap-stack">
                    <b className="ap-strong">{r.name}</b>
                    <span className="ap-sub">{c.subs[i]}</span>
                  </span>
                </span>
                <span className="ap-bar">
                  {note ? (
                    <>
                      <Note fmt={a.pct} n={r.score} />
                      <span className={`ap-meter ap-meter--${ton(r.score)}`}><i style={{ width: `${r.score}%` }} /></span>
                    </>
                  ) : <span className="ap-dash">-</span>}
                </span>
                <span><Statut t={note ? "ok" : "wait"}>{r.state}</Statut></span>
                <span className="ap-rowActions">
                  {note ? <span className="ap-btn ap-btn--soft">{c.view}<IcArrow size={13} /></span> : null}
                  <span className="ap-icon"><IcTrash size={15} /></span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Écran : le rapport d'un candidat ──────────────────────────────────────
function EcranRapport({ a, liste, score }) {
  const r = a.report;
  // Sarah D., troisième de la liste à 67 % : c'est elle dont
  // `common.mocks.score` détaille les critères (75, 50, 75, moyenne 67). Même
  // personne, même note partout sur la page (règle 5 de site/AGENTS.md).
  const cand = liste.rows[2];
  const n = Number(cand.score);
  const C = 2 * Math.PI * 36;
  return (
    <>
      <Tete a={a} chemin={[a.jobs[0].title, r.candidates]} titre={cand.name}>
        <span className="ap-btn ap-btn--ghost"><IcChevronDown size={15} />{r.expand}</span>
        <span className="ap-btn ap-btn--ghost"><IcMessage size={15} />{r.feedback}</span>
      </Tete>

      <div className="ap-report">
        <div className="ap-colL">
          <div className="ap-card">
            <span className="ap-who ap-who--big">
              <span className="ap-avatar ap-avatar--big">{cand.initials}</span>
              <span className="ap-stack">
                <b className="ap-name">{cand.name}</b>
                <span className="ap-sub">{a.jobs[0].title}</span>
              </span>
            </span>
            <span className="ap-inset">
              <span className="ap-row"><span>{r.status}</span><Statut>{cand.state}</Statut></span>
              <span className="ap-row"><span>{r.invited}</span><span className="ap-val">{r.invitedOn}</span></span>
              <span className="ap-row"><span>{r.completed}</span><span className="ap-val">{r.completedOn}</span></span>
              <span className="ap-row"><span>{r.gdpr}</span><span className="ap-val ap-val--ok">{r.granted}</span></span>
            </span>
            <span className="ap-buttons">
              <span className="ap-btn ap-btn--blue ap-btn--full">{r.shortlist}</span>
              <span className="ap-btn ap-btn--ghost ap-btn--full">{r.next}</span>
              <span className="ap-btn ap-btn--ghost ap-btn--full">{r.reject}</span>
            </span>
          </div>
        </div>

        <div className="ap-colR">
          <div className="ap-card">
            <span className="ap-cardHead">
              <span className="ap-stack">
                <b className="ap-h2">{r.score}</b>
                <span className="ap-sub">{r.scoreSub}</span>
              </span>
            </span>
            <span className="ap-inset ap-inset--row">
              <span className={`ap-ring ap-ring--${ton(n)}`}>
                <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                  <circle cx="42" cy="42" r="36" fill="none" strokeWidth="7" className="ap-ringTrack" />
                  <circle cx="42" cy="42" r="36" fill="none" strokeWidth="7" strokeLinecap="round" className="ap-ringFill" strokeDasharray={`${(C * n) / 100} ${C}`} transform="rotate(-90 42 42)" />
                </svg>
                <b>{a.pct.replace("{n}", n)}</b>
              </span>
              <span className="ap-stack">
                <b className="ap-strong">{r.scoreLine}</b>
                <span className="ap-sub">{r.scoreNote}</span>
              </span>
            </span>
          </div>

          <div className="ap-card">
            <span className="ap-cardHead">
              <span className="ap-stepName">
                <span className="ap-num">1</span>
                <b className="ap-h2">{score.skill}</b>
                <span className="ap-chip"><IcMail size={13} />{r.stepType}</span>
              </span>
              <Note fmt={a.pct} n={n} />
            </span>
            <span className="ap-inset">
              <span className="ap-insetLabel">{r.criteria}</span>
              {score.dims.map((d, i) => (
                <span className="ap-crit" key={d.name}>
                  <span className="ap-critHead">
                    <span className="ap-critName">
                      <b>{d.name}</b>
                      <span className="ap-must">{r.must}</span>
                    </span>
                    <span className="ap-critScore">
                      <span className={`ap-meter ap-meter--${ton(d.pct)} ap-meter--short`}><i style={{ width: `${d.pct}%` }} /></span>
                      <Note fmt={a.pct} n={d.pct} />
                      <IcChevronDown size={14} />
                    </span>
                  </span>
                  {i === 0 ? (
                    <span className="ap-critBody">
                      <span className="ap-why">{d.why}</span>
                      <span className="ap-quote">{r.quote.replace("{q}", d.quote)}</span>
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Écran : le tableau de bord ────────────────────────────────────────────
function EcranAccueil({ a, liste }) {
  const h = a.home;
  const fonds = ["#1B45C4", "#4C74E0", "#7FA0F0"];
  const icones = [IcJobs, IcUsers, IcCheckDone];
  const invites = [4, 2, 5, 3, 3, 0, 1];
  const finies = [2, 1, 3, 1, 2, 0, 0];
  const max = 6;
  return (
    <>
      <Tete a={a} titre={h.title}>
        <span className="ap-btn ap-btn--blue"><IcPlus size={15} />{h.newJob}</span>
      </Tete>

      <section className="ap-sec">
        <span className="ap-hello"><i />{h.hello}</span>
        <div className="ap-figures">
          {h.figures.map((f, i) => {
            const Icone = icones[i];
            return (
              <div className="ap-figure" key={f.label}>
                <span className="ap-figLabel"><span style={{ background: fonds[i] }}><Icone size={13} /></span>{f.label}</span>
                <span className="ap-figN"><b>{f.n}</b>{f.unit}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="ap-sec">
        <div className="ap-secHead">
          <b className="ap-h2">{h.yourJobs}</b>
          <span className="ap-icon ap-icon--line"><IcExpand size={15} /></span>
        </div>
        <div className="ap-jobs">
          {a.jobs.slice(0, 3).map((j, i) => (
            <div className="ap-card" key={j.title}>
              <span className="ap-jobTop">
                <span className="ap-stack ap-grow">
                  <b className="ap-strong ap-jobTitle"><i style={{ background: PASTILLES[i] }} />{j.title}</b>
                  <span className="ap-sub ap-indent">{j.meta}</span>
                </span>
                <span className="ap-icon ap-icon--mute"><IcLink size={15} /></span>
              </span>
              <span className="ap-inset">
                <span className="ap-row"><span>{h.status}</span><Statut>{h.open}</Statut></span>
                <span className="ap-row"><span>{h.candidates}</span><span className="ap-val">{h.candidatesN.replace("{n}", j.invited)}</span></span>
                <span className="ap-row">
                  <span>{h.completed}</span>
                  <span className="ap-val">
                    <span className="ap-mini"><i style={{ width: `${Math.round((j.done / j.invited) * 100)}%` }} /></span>
                    {j.done}/{j.invited}
                  </span>
                </span>
                <span className="ap-row"><span>{h.created}</span><span className="ap-val">{j.date}</span></span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="ap-split">
        <div className="ap-card ap-card--pad">
          <b className="ap-h2">{h.latest}</b>
          {liste.rows.slice(0, 4).map((r) => (
            <span className="ap-latest" key={r.name}>
              <span className="ap-avatar">{r.initials}</span>
              <span className="ap-stack ap-grow">
                <b className="ap-strong">{r.name}</b>
                <span className="ap-sub">{a.jobs[0].title}</span>
              </span>
              <Note fmt={a.pct} n={r.score} />
            </span>
          ))}
        </div>
        <div className="ap-card ap-card--pad ap-card--wide">
          <span className="ap-secHead">
            <b className="ap-h2">{h.activity}</b>
            <span className="ap-period"><span><IcCalendar size={14} />{h.week}</span><span>{h.range}</span></span>
          </span>
          <span className="ap-secHead">
            <span className="ap-figN"><b>{h.doneN}</b>{h.doneLabel}</span>
            <span className="ap-legend"><span><i className="ap-legInv" />{h.legendInvited}</span><span><i className="ap-legDone" />{h.legendDone}</span></span>
          </span>
          <span className="ap-chart">
            {h.days.map((d, i) => (
              <span className="ap-day" key={d}>
                <span className="ap-bars">
                  <i className="ap-legInv" style={{ height: `${(invites[i] / max) * 100}%` }} />
                  <i className="ap-legDone" style={{ height: `${(finies[i] / max) * 100}%` }} />
                </span>
                <span className="ap-dayLabel">{d}</span>
              </span>
            ))}
          </span>
        </div>
      </div>
    </>
  );
}

// ── Écran : le parcours d'onboarding d'une nouvelle recrue ────────────────
// ⚠️ Cet écran N'EXISTE PAS ENCORE dans l'application (règle 2 de
// site/AGENTS.md) : c'est une projection, construite avec les briques de
// l'interface recruteur (en-tête, carte, tableau) pour qu'elle ait l'air de
// venir du même logiciel. Les FORMATS des modules existent tous.
const OB_ICONES = { call: IcPhone, email: IcMail, inbox: IcInbox, document: IcFile, chat: IcMessage };
const OB_STATUT = { done: "ok", current: "cur", todo: "wait" };

function EcranOnboarding({ a, o }) {
  const faits = o.modules.filter((x) => x.state === "done").length;
  const total = o.modules.length;
  return (
    <>
      <Tete a={a} chemin={[o.nav]} titre={o.name}>
        <Statut t="ok">{o.onTrack}</Statut>
      </Tete>
      <div className="ap-body">
        <div className="ap-card ap-card--pad ob__summary">
          <span className="ap-who">
            <span className="ap-avatar ap-avatar--big">{o.initials}</span>
            <span className="ap-stack">
              <b className="ap-strong">{o.role}</b>
              <span className="ap-sub">{o.starts}</span>
            </span>
          </span>
          <div className="ob__progress">
            <span className="ob__progLine">
              <b>{o.ready}</b>
              <span className="ap-sub">{o.progress.replace("{done}", faits).replace("{total}", total)}</span>
            </span>
            <span className="ob__track"><i style={{ width: `${(faits / total) * 100}%` }} /></span>
          </div>
        </div>
        <div className="ap-table">
          <div className="ap-tr ap-tr--head ob__tr">
            <span />
            <span>{o.colModule}</span>
            <span>{o.colStatus}</span>
            <span>{o.colScore}</span>
          </div>
          {o.modules.map((x) => {
            const Icone = OB_ICONES[x.kind];
            return (
              <div className={`ap-tr ob__tr ob__tr--${x.state}`} key={x.title}>
                <span className="ob__icon"><Icone size={16} /></span>
                <span className="ap-stack">
                  <b className="ap-strong ap-ell">{x.title}</b>
                  <span className="ap-sub">{x.format} · {x.min}</span>
                </span>
                <span><Statut t={OB_STATUT[x.state]}>{o.states[x.state]}</Statut></span>
                <span>{x.score ? <Note fmt={o.pct} n={x.score} /> : <span className="ap-dash">-</span>}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Une fenêtre FIXE, pour « Two moments that matter » (Moments.js) ─────────
// La même fenêtre que celle du hero (menu, page, briques), sur UN écran et
// sans rotation, posée dans un cadre clair qui la COUPE à droite et en bas,
// à la manière du modèle de spott.io fourni par Remco. Le cadre a une taille
// fixe : les deux moments ont donc exactement la même, et rien ne saute au
// passage de l'un à l'autre (retour direct). Le menu porte l'entrée
// Onboarding dans les DEUX fenêtres, pour la même raison.
// --k : on montre VISIBLE px de l'application dans la largeur du cadre.
const VISIBLE = 690;
const VISIBLE_PETIT = 520;

export function AppFenetre({ a, ecran, shortlist, o, label }) {
  const ref = useRef(null);
  useEffect(() => {
    const cadre = ref.current;
    if (!cadre) return;
    const petit = window.matchMedia("(max-width: 760px)");
    const ajuster = () => {
      const k = cadre.clientWidth / (petit.matches ? VISIBLE_PETIT : VISIBLE);
      if (k > 0) cadre.style.setProperty("--k", k.toFixed(4));
    };
    ajuster();
    const suivi = new ResizeObserver(ajuster);
    suivi.observe(cadre);
    petit.addEventListener("change", ajuster);
    return () => {
      suivi.disconnect();
      petit.removeEventListener("change", ajuster);
    };
  }, []);

  return (
    <div className="mo-frame" ref={ref} role="img" aria-label={label}>
      <div className="peek__win" aria-hidden="true">
        <Menu a={a} actif={ecran === "onboarding" ? "onboarding" : 0} onboarding={o.nav} />
        <div className="ap-main">
          {ecran === "onboarding" ? <EcranOnboarding a={a} o={o} /> : <EcranCandidats a={a} liste={shortlist} />}
        </div>
      </div>
    </div>
  );
}

export default function AppPeek({ a, shortlist, score }) {
  const [actif, setActif] = useState(0);
  const scene = useRef(null);
  const survol = useRef(false);

  // ── L'ÉCHELLE ────────────────────────────────────────────────────────────
  // La fenêtre est dessinée à la taille de l'application (DESIGN, ou
  // DESIGN_PETIT sur téléphone, où le menu de gauche disparaît) et c'est
  // son `zoom` qui la ramène à la largeur de la colonne. Le rapport ne
  // s'écrit pas en CSS (une longueur divisée par une longueur), d'où ce
  // calcul ; la feuille de style a un repli pour le premier affichage.
  //
  // ⚠️ Il n'y a plus de titre qui passe sous la fenêtre (05/11/2026) : le
  // hero est blanc et la fenêtre y est entière. Ce script ne pose plus que
  // --k, sur la racine du composant.
  //
  // ⚠️ Il suit la LARGEUR DU BLOC (ResizeObserver), pas celle de l'écran.
  // Avec le seul `resize` de la fenêtre, un bloc élargi par la feuille de
  // style gardait l'ancien rapport : la fenêtre restait à son ancienne
  // largeur, collée à gauche dans un bloc plus large, et semait le doute
  // (« ce n'est pas élargi, c'est juste pas centré »).
  useEffect(() => {
    const racine = scene.current;
    const fenetre = racine?.querySelector(".peek");
    if (!fenetre) return;

    const petit = window.matchMedia("(max-width: 760px)");
    const ajuster = () => {
      const base = petit.matches ? DESIGN_PETIT : DESIGN;
      const k = fenetre.clientWidth / base;
      if (k > 0) racine.style.setProperty("--k", k.toFixed(4));
    };
    ajuster();
    const suivi = new ResizeObserver(ajuster);
    suivi.observe(fenetre);
    petit.addEventListener("change", ajuster);
    return () => {
      suivi.disconnect();
      petit.removeEventListener("change", ajuster);
    };
  }, []);

  // ── LES ÉCRANS DÉFILENT TOUT SEULS (19/10/2026) ──────────────────────────
  // Il y avait quatre onglets au-dessus de la fenêtre ; retirés sur demande
  // directe. Les écrans passent maintenant l'un après l'autre, toutes les
  // ROTATION ms, en commençant par le tableau de bord. Le survol de la
  // fenêtre suspend le défilement : on peut lire un écran sans qu'il parte
  // sous les yeux. Sous « réduire les animations », rien ne bouge : le
  // tableau de bord reste affiché.
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const minuteur = setInterval(() => {
      if (!survol.current) setActif((i) => (i + 1) % ECRANS.length);
    }, ROTATION);
    return () => clearInterval(minuteur);
  }, []);

  const id = ECRANS[actif];
  const ecrans = {
    home: <EcranAccueil a={a} liste={shortlist} />,
    cands: <EcranCandidats a={a} liste={shortlist} />,
    report: <EcranRapport a={a} liste={shortlist} score={score} />,
  };

  return (
    <div className="vitrine__scene" ref={scene}>
      {/* Pour un lecteur d'écran, la fenêtre est UNE image, décrite en une
          phrase. Elle imite des boutons et des champs qui ne font rien, et
          change toute seule : lue élément par élément, elle serait
          incompréhensible. */}
      <div
        className="peek"
        role="img"
        aria-label={a.alt}
        onMouseEnter={() => { survol.current = true; }}
        onMouseLeave={() => { survol.current = false; }}
      >
        <div className="peek__win" aria-hidden="true">
          <Menu a={a} actif={id === "home" ? "home" : 0} />
          <div className="ap-main" key={id}>{ecrans[id]}</div>
        </div>
      </div>
    </div>
  );
}
