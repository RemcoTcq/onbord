"use client";

// Onboarding → People (phase 2). Les nouvelles recrues (learners) : leur
// avancée, et l'invitation d'une nouvelle personne — un compte learner, par
// e-mail (lib/actions/equipe.js). Chaque personne s'ouvre sur sa fiche :
// assignations, essais, validation, « prête ».
//
// L'invitation (20/11/2026, Remco) : un bouton en haut à droite, comme
// « Créer une simulation », qui ouvre une fenêtre — l'adresse, la langue du
// compte, puis « Inviter ». `?inviter=1` l'ouvre d'emblée (action rapide de
// l'accueil).

import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus, Send, X, Search, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { initials, scoreTone } from "@/components/ui/ds";
import { formatDateShort } from "@/lib/i18n/format";
import { UI_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { listerPersonnes } from "@/lib/actions/personnes";
import { inviterMembre } from "@/lib/actions/equipe";
import Select from "@/components/ui/Select";

const ETAPES_PERSONNE = ["onboarding", "training", "ready", "invited"];
const TON_ETAPE = { onboarding: "blue", training: "amber", ready: "green" };
const ENCRE_SCORE = { high: "var(--ds-green-ink)", mid: "var(--ds-amber-ink)", low: "var(--ds-red)" };
const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** La fenêtre d'invitation : adresse, langue du compte, envoi. */
function FenetreInvitation({ onFermer, onInvitee }) {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.onb.people.${cle}`, vars);
  const [email, setEmail] = useState("");
  const [langue, setLangue] = useState(locale);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const echap = (e) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer]);

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const res = await inviterMembre({ email, role: "learner", locale: langue });
    setEnvoi(false);
    if (!res.success) return setErreur(res.code ? t(`dashboard.team.errors.${res.code}`) : t("dashboard.team.errors.generic"));
    onInvitee(email.trim());
  }

  return (
    <div className="ds-overlay" onMouseDown={onFermer}>
      <form role="dialog" aria-modal="true" aria-labelledby="ds-inviter" className="ds-modal" onSubmit={envoyer} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h2 id="ds-inviter" className="ds-h2">{k("invite")}</h2>
          <button type="button" onClick={onFermer} className="ds-icon-btn ds-icon-btn-outline" aria-label={k("cancel")}><X size={15} /></button>
        </div>
        <div className="ds-modal-body">
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.team.invite.email")}</span>
            <input className="ds-input" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("dashboard.team.invite.emailPlaceholder")} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{k("accountLanguage")}</span>
            <Select className="ds-select" value={langue} onChange={(e) => setLangue(e.target.value)}>
              {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
            </Select>
          </label>
          {erreur && <p role="alert" style={{ margin: 0, color: "var(--ds-red)", fontSize: 13 }}>{erreur}</p>}
        </div>
        <div className="ds-modal-foot">
          <button type="button" className="ds-btn" onClick={onFermer}>{k("cancel")}</button>
          <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !email.trim()}>
            {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />} {k("inviteSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PersonnesPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.people.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [onglet, setOnglet] = useState("onboarding");
  const [recherche, setRecherche] = useState("");

  const charger = useCallback(async () => {
    const res = await listerPersonnes();
    setDonnees(res.success ? res : { personnes: [], invitations: [] });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
    if (new URLSearchParams(window.location.search).get("inviter") === "1") setOuvert(true);
  }, [charger]);

  // Un onglet par étape (20/11/2026, Remco) : une personne prête ne se mélange
  // plus à celles encore en onboarding ; « En formation » n'apparaît que s'il y
  // a quelqu'un, « Invitées » que s'il y a une invitation en attente. Le
  // tableau est celui des candidats.
  const personnes = donnees?.personnes || [];
  const invitations = donnees?.invitations || [];
  const compte = (l) => (l === "invited" ? invitations.length : personnes.filter((p) => (p.lifecycle || "onboarding") === l).length);
  const onglets = ETAPES_PERSONNE.filter((l) => (l !== "training" && l !== "invited") || compte(l) > 0);
  const terme = sansAccent(recherche.trim());
  const visibles = personnes
    .filter((p) => (p.lifecycle || "onboarding") === onglet && (!terme || sansAccent(`${p.nom} ${p.email}`).includes(terme)))
    .sort((a, b) => String(a.nom || a.email).localeCompare(String(b.nom || b.email), locale));
  const invitationsVisibles = invitations.filter((x) => !terme || sansAccent(x.email).includes(terme));

  const fermer = useCallback(() => setOuvert(false), []);
  function invitee(adresse) {
    setOuvert(false);
    toast(t("dashboard.team.invite.sent", { email: adresse }), "success");
    charger();
  }

  const vide = onglet === "invited" ? !invitationsVisibles.length : !visibles.length;

  return (
    <>
      <PageHeader title={k("title")} actions={
        <button type="button" className="ds-btn ds-btn-primary" onClick={() => setOuvert(true)}>
          <UserPlus size={15} strokeWidth={2.2} /> {k("inviteButton")}
        </button>
      } />
      <div className="ds-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div role="tablist" aria-label={k("tabsLabel")} className="ds-seg" style={{ height: 34 }}>
            {onglets.map((l) => (
              <button key={l} type="button" role="tab" aria-selected={onglet === l} onClick={() => setOnglet(l)} className="ds-seg-item" style={{ height: 28, fontSize: 13 }}>
                {k(`tabs.${l}`)}
                <span className="ds-seg-count">{compte(l)}</span>
              </button>
            ))}
          </div>
          <label className="ds-search" style={{ minWidth: 280, flex: "0 1 360px" }}>
            <Search size={15} strokeWidth={2} />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={k("search")} aria-label={k("search")} />
          </label>
        </div>

        {!donnees ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : vide ? (
          <div className="ds-empty" style={{ padding: "48px 20px" }}>
            <span className="ds-empty-title">{!personnes.length && !invitations.length ? k("empty") : terme ? t("dashboard.search.noResults") : k(`tabsEmpty.${onglet}`)}</span>
          </div>
        ) : onglet === "invited" ? (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th scope="col">{k("colPerson")}</th>
                  <th scope="col" style={{ width: 150 }}>{k("colStage")}</th>
                  <th scope="col" style={{ width: 130 }}>{k("colInvitedOn")}</th>
                  <th scope="col" style={{ width: 130 }}>{k("colExpires")}</th>
                </tr>
              </thead>
              <tbody>
                {invitationsVisibles.map((x) => (
                  <tr key={x.id}>
                    <th scope="row">
                      <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span className="ds-avatar">{initials(x.email)}</span>
                        <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{x.email}</span>
                      </span>
                    </th>
                    <td><span className="ds-chip ds-chip-blue"><span className="ds-dot ds-dot-blue" /> {k("tabs.invited")}</span></td>
                    <td style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{formatDateShort(x.created_at, locale)}</td>
                    <td style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{x.expires_at ? formatDateShort(x.expires_at, locale) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 760 }}>
              <thead>
                <tr>
                  <th scope="col">{k("colPerson")}</th>
                  <th scope="col" style={{ width: 150 }}>{k("colStage")}</th>
                  <th scope="col" style={{ width: 190 }}>{k("colProgress")}</th>
                  <th scope="col" style={{ width: 110 }}>{k("colAverage")}</th>
                  <th scope="col" style={{ width: 110 }}>{k("colSince")}</th>
                  <th scope="col" style={{ width: 40 }}><span className="sr-only">—</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p) => {
                  const href = `/onboarding/personnes/${p.userId}`;
                  const ton = TON_ETAPE[p.lifecycle] || "blue";
                  const pct = p.assignes ? Math.round((p.valides / p.assignes) * 100) : 0;
                  return (
                    <tr key={p.userId}>
                      <th scope="row">
                        <Link href={href} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <span className="ds-avatar">{initials(...String(p.nom || "").split(" "), p.email)}</span>
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>{p.nom || p.email}</span>
                            <span style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{p.email || "—"}</span>
                          </span>
                        </Link>
                      </th>
                      <td><span className={`ds-chip ds-chip-${ton}`}><span className={`ds-dot ds-dot-${ton}`} /> {k(`lifecycle.${p.lifecycle}`)}</span></td>
                      <td>
                        {p.assignes ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="ds-meter ds-meter-thin" style={{ flex: 1, maxWidth: 90 }}><span style={{ width: `${pct}%` }} /></span>
                            <span className="ds-mono" style={{ fontSize: 13, color: "var(--ds-ink-2)" }}>{p.valides} / {p.assignes}</span>
                          </span>
                        ) : <span style={{ fontSize: 13, color: "var(--ds-ink-5)" }}>{k("nothingAssigned")}</span>}
                      </td>
                      <td>
                        {p.moyenne != null
                          ? <span className="ds-mono" style={{ fontWeight: 500, color: ENCRE_SCORE[scoreTone(p.moyenne)] }}>{p.moyenne} %</span>
                          : <span style={{ color: "var(--ds-ink-5)" }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13, color: "var(--ds-ink-3)" }}>{formatDateShort(p.depuis, locale)}</td>
                      <td><Link href={href} aria-label={p.nom || p.email} style={{ color: "var(--ds-ink-4)", display: "flex" }}><ChevronRight size={16} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {ouvert && <FenetreInvitation onFermer={fermer} onInvitee={invitee} />}
    </>
  );
}
