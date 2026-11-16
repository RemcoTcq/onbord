"use client";

// « Passer en onboarding » sur la fiche d'un candidat (phase 4) : le bouton, et
// la fenêtre qui envoie l'invitation de learner. Le manager doit attester avoir
// prévenu la personne que ses résultats seront réutilisés ; la personne, elle,
// l'accepte ou non en activant son compte (lib/actions/equipe.js).
//
// Le bouton suit l'état : rien d'envoyé, invitation en attente, ou compte de
// learner créé — il mène alors à sa fiche dans Onboarding → Personnes.

import { useEffect, useState } from "react";
import { X, Loader2, GraduationCap, Send, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { UI_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { versOnboarding, etatVersOnboarding } from "@/lib/actions/equipe";
import Select from "@/components/ui/Select";

export default function VersOnboarding({ candidateId, nom, email }) {
  const { t, locale } = useI18n();
  const k = (cle, vars) => t(`dashboard.candidateDetail.toOnboarding.${cle}`, vars);
  const [etat, setEtat] = useState(null);
  const [ouvert, setOuvert] = useState(false);
  const [adresse, setAdresse] = useState(email || "");
  const [langue, setLangue] = useState(locale);
  const [informe, setInforme] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    etatVersOnboarding(candidateId).then((res) => { if (!annule && res.success) setEtat(res); });
    return () => { annule = true; };
  }, [candidateId]);

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const res = await versOnboarding(candidateId, { email: adresse, locale: langue, informe });
    setEnvoi(false);
    if (!res.success) return setErreur(k(`errors.${res.code || "generic"}`));
    setOuvert(false);
    setEtat({ etat: "invite", email: adresse });
  }

  if (!etat) return null;
  if (etat.etat === "membre") {
    return (
      <Link href={`/onboarding/personnes/${etat.userId}`} className="ds-btn">
        <GraduationCap size={15} /> {k("member")} <ArrowRight size={14} />
      </Link>
    );
  }
  if (etat.etat === "invite") {
    return <span className="ds-chip ds-chip-blue" title={etat.email} style={{ alignSelf: "center" }}><GraduationCap size={13} /> {k("invited")}</span>;
  }

  return (
    <>
      <button type="button" className="ds-btn" onClick={() => setOuvert(true)}>
        <GraduationCap size={15} /> {k("button")}
      </button>
      {ouvert && (
        <div className="ds-overlay" onMouseDown={() => setOuvert(false)}>
          <form role="dialog" aria-modal="true" aria-labelledby="ds-vers-onboarding" className="ds-modal" onSubmit={envoyer} onMouseDown={(e) => e.stopPropagation()}>
            <div className="ds-modal-head">
              <h2 id="ds-vers-onboarding" className="ds-h2">{k("title", { name: nom })}</h2>
              <button type="button" onClick={() => setOuvert(false)} className="ds-icon-btn ds-icon-btn-outline" aria-label={k("cancel")}><X size={15} /></button>
            </div>
            <div className="ds-modal-body">
              <p className="ds-sub" style={{ lineHeight: 1.55 }}>{k("intro", { name: nom })}</p>
              <label className="ds-field">
                <span className="ds-label">{k("email")}</span>
                <input className="ds-input" type="email" required value={adresse} onChange={(e) => setAdresse(e.target.value)} />
              </label>
              <label className="ds-field">
                <span className="ds-label">{k("language")}</span>
                <Select className="ds-select" value={langue} onChange={(e) => setLangue(e.target.value)}>
                  {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
                </Select>
              </label>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5, cursor: "pointer" }}>
                <input type="checkbox" checked={informe} onChange={(e) => setInforme(e.target.checked)} style={{ marginTop: 3 }} />
                <span>
                  {k("informed", { name: nom })}
                  <span className="ds-help" style={{ display: "block", marginTop: 4 }}>{k("informedHint")}</span>
                </span>
              </label>
              {erreur && <p role="alert" style={{ color: "var(--ds-red)", fontSize: 13 }}>{erreur}</p>}
            </div>
            <div className="ds-modal-foot">
              <button type="button" className="ds-btn" onClick={() => setOuvert(false)}>{k("cancel")}</button>
              <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !informe || !adresse}>
                {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />} {k("submit")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
