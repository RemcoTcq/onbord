"use client";

// Paramètres → Équipe (phase 0 de l'onboarding). Les membres de
// l'organisation, leurs rôles, les invitations en attente. Toutes les
// écritures passent par lib/actions/equipe.js, qui vérifie le rôle : l'écran
// ne fait que masquer ce que le compte n'a pas le droit de faire.

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { initials } from "@/components/ui/ds";
import { formatDateShort } from "@/lib/i18n/format";
import { UI_LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { listerEquipe, inviterMembre, revoquerInvitation, changerRole, retirerMembre } from "@/lib/actions/equipe";

const ROLES = ["learner", "manager", "admin"];

export default function TeamPage() {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [donnees, setDonnees] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("learner");
  const [langue, setLangue] = useState(locale);
  const [envoi, setEnvoi] = useState(false);

  const erreur = useCallback((res) => {
    toast(res?.code ? t(`dashboard.team.errors.${res.code}`) : (res?.error || t("dashboard.team.errors.generic")), "error");
  }, [t, toast]);

  const charger = useCallback(async () => {
    const res = await listerEquipe();
    if (res.success) setDonnees(res);
    else setDonnees({ erreur: true });
  }, []);

  useEffect(() => {
    // Chargement initial : l'état vient du serveur, pas d'un calcul local.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function inviter(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await inviterMembre({ email, role, locale: langue });
    setEnvoi(false);
    if (!res.success) return erreur(res);
    toast(t("dashboard.team.invite.sent", { email: email.trim() }), "success");
    setEmail("");
    charger();
  }

  async function agir(action) {
    const res = await action();
    if (!res.success) return erreur(res);
    charger();
  }

  if (!donnees) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }
  if (donnees.erreur) {
    return <div className="ds-panel"><p className="ds-sub" style={{ padding: 10 }}>{t("dashboard.team.errors.generic")}</p></div>;
  }

  const estAdmin = donnees.moi.orgRole === "admin";
  const rolesInvitables = estAdmin ? ROLES : ["learner"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Inviter ─────────────────────────────────────────────────────── */}
      <form onSubmit={inviter} className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
          <h2 className="ds-h2">{t("dashboard.team.invite.title")}</h2>
          <p className="ds-sub">{estAdmin ? t("dashboard.team.subtitle") : t("dashboard.team.invite.managerOnlyLearners")}</p>
        </div>
        <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr)", gap: 14 }}>
          <label className="ds-field" htmlFor="invite-email">
            <span className="ds-label">{t("dashboard.team.invite.email")}</span>
            <input id="invite-email" type="email" required className="ds-input" placeholder={t("dashboard.team.invite.emailPlaceholder")}
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="ds-field" htmlFor="invite-role">
            <span className="ds-label">{t("dashboard.team.invite.role")}</span>
            <select id="invite-role" className="ds-select" value={role} onChange={(e) => setRole(e.target.value)}>
              {rolesInvitables.map((r) => <option key={r} value={r}>{t(`dashboard.team.roles.${r}`)}</option>)}
            </select>
          </label>
          <label className="ds-field" htmlFor="invite-langue">
            <span className="ds-label">{t("dashboard.team.invite.language")}</span>
            <select id="invite-langue" className="ds-select" value={langue} onChange={(e) => setLangue(e.target.value)}>
              {UI_LOCALES.map((l) => <option key={l} value={l}>{LOCALE_LABELS[l]}</option>)}
            </select>
          </label>
          <span className="ds-help" style={{ gridColumn: "1 / -1" }}>{t(`dashboard.team.roleHints.${role}`)}</span>
        </div>
        <div className="ds-panel-foot">
          <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || !email.trim()}>
            {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {envoi ? t("dashboard.team.invite.sending") : t("dashboard.team.invite.submit")}
          </button>
        </div>
      </form>

      {/* ── Membres ─────────────────────────────────────────────────────── */}
      <section className="ds-panel">
        <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.team.members")}</h2>
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: 0 }}>
          {donnees.membres.map((m, i) => {
            const moi = m.userId === donnees.moi.userId;
            const nom = m.nom || m.email;
            return (
              <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                <span className="ds-avatar">{initials(...(m.nom || "").split(" "), m.email)}</span>
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{nom}{moi && <span className="ds-muted" style={{ fontWeight: 400 }}> ({t("dashboard.team.you")})</span>}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{m.email} · {t("dashboard.team.since", { date: formatDateShort(m.depuis, locale) })}</span>
                </span>
                {estAdmin && !moi ? (
                  <>
                    <select className="ds-select" style={{ width: 130, height: 34 }} aria-label={t("dashboard.team.changeRole", { name: nom })}
                      value={m.role} onChange={(e) => agir(() => changerRole(m.userId, e.target.value))}>
                      {ROLES.map((r) => <option key={r} value={r}>{t(`dashboard.team.roles.${r}`)}</option>)}
                    </select>
                    <button type="button" className="ds-btn" onClick={() => {
                      if (window.confirm(t("dashboard.team.removeConfirm", { name: nom }))) agir(() => retirerMembre(m.userId));
                    }}>{t("dashboard.team.remove")}</button>
                  </>
                ) : (
                  <span className="ds-chip">{t(`dashboard.team.roles.${m.role}`)}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Invitations en attente ──────────────────────────────────────── */}
      <section className="ds-panel">
        <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.team.pending")}</h2>
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: donnees.invitations.length ? 0 : 14 }}>
          {!donnees.invitations.length && <p className="ds-sub">{t("dashboard.team.noPending")}</p>}
          {donnees.invitations.map((inv, i) => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <b style={{ fontSize: 14, fontWeight: 600 }}>{inv.email}</b>
                <span className="ds-muted" style={{ fontSize: 12 }}>
                  {inv.expiree ? t("dashboard.team.expired") : t("dashboard.team.expires", { date: formatDateShort(inv.expires_at, locale) })}
                </span>
              </span>
              <span className="ds-chip">{t(`dashboard.team.roles.${inv.role}`)}</span>
              {(estAdmin || inv.role === "learner") && (
                <button type="button" className="ds-btn" onClick={() => agir(() => revoquerInvitation(inv.id))}>{t("dashboard.team.revoke")}</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
