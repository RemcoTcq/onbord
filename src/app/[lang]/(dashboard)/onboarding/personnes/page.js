"use client";

// Onboarding → People (phase 2). Les nouvelles recrues (learners) : leur
// avancée, et l'invitation d'une nouvelle personne — un compte learner, par
// e-mail (lib/actions/equipe.js). Chaque personne s'ouvre sur sa fiche :
// assignations, essais, validation, « prête ».

import { useState, useEffect, useCallback } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { initials } from "@/components/ui/ds";
import { formatDateShort } from "@/lib/i18n/format";
import { UI_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { listerPersonnes } from "@/lib/actions/personnes";
import { inviterMembre } from "@/lib/actions/equipe";
import Select from "@/components/ui/Select";

export default function PersonnesPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.people.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [email, setEmail] = useState("");
  const [langue, setLangue] = useState(locale);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const res = await listerPersonnes();
    setDonnees(res.success ? res : { personnes: [], invitations: [] });
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function inviter(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await inviterMembre({ email, role: "learner", locale: langue });
    setEnvoi(false);
    if (!res.success) return toast(res.code ? t(`dashboard.team.errors.${res.code}`) : t("dashboard.team.errors.generic"), "error");
    toast(t("dashboard.team.invite.sent", { email: email.trim() }), "success");
    setEmail("");
    charger();
  }

  return (
    <>
      <PageHeader title={k("title")} />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">{k("subtitle")}</p>

        <form onSubmit={inviter} className="ds-panel">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, padding: 10 }}>
            <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 2 }}>
              <h2 className="ds-h2">{k("invite")}</h2>
              <p className="ds-sub">{k("inviteHint")}</p>
            </div>
            <input className="ds-input" type="email" required style={{ flex: "0 1 260px" }} value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t("dashboard.team.invite.emailPlaceholder")} aria-label={t("dashboard.team.invite.email")} />
            <Select className="ds-select" style={{ width: 130 }} value={langue} onChange={(e) => setLangue(e.target.value)} aria-label={t("dashboard.team.invite.language")}>
              {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
            </Select>
            <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !email.trim()}>
              {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />} {k("inviteSubmit")}
            </button>
          </div>
        </form>

        <section className="ds-panel">
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: donnees?.personnes?.length ? 0 : 14 }}>
            {!donnees && <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />}
            {donnees?.personnes?.length === 0 && <p className="ds-sub">{k("empty")}</p>}
            {(donnees?.personnes || []).map((p, i) => (
              <Link key={p.userId} href={`/onboarding/personnes/${p.userId}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none", textDecoration: "none", color: "inherit" }}>
                <span className="ds-avatar">{initials(...String(p.nom).split(" "), p.email)}</span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{p.nom}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{p.email} · {k("since", { date: formatDateShort(p.depuis, locale) })}</span>
                </span>
                <span className={`ds-chip ${p.lifecycle === "ready" ? "ds-chip-green" : ""}`}>{k(`lifecycle.${p.lifecycle}`)}</span>
                <span className="ds-muted" style={{ fontSize: 12, minWidth: 150, textAlign: "right" }}>
                  {k("progress", { valides: p.valides, assignes: p.assignes })}{p.moyenne != null ? ` · ${p.moyenne} %` : ""}
                </span>
              </Link>
            ))}
          </div>
          {donnees?.invitations?.length > 0 && (
            <div className="ds-inset" style={{ fontSize: 13 }}>
              <b style={{ fontWeight: 600 }}>{k("pending")} : </b>{donnees.invitations.map((x) => x.email).join(", ")}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
