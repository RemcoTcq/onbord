"use client";

// Acceptation d'une invitation d'équipe (phase 0 de l'onboarding). Page
// PUBLIQUE (proxy.js) : l'invité n'a pas encore de compte. Il choisit son
// mot de passe, le serveur crée le compte (lib/actions/equipe.js), puis la
// page le connecte et l'envoie dans l'application.

import { useState, useEffect, use } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/I18nProvider";
import { useRouter, LocaleLink as Link } from "@/lib/i18n/navigation";
import { lireInvitation, accepterInvitation } from "@/lib/actions/equipe";
import { MOT_DE_PASSE_MIN } from "@/lib/constants/comptes";

export default function InvitationPage({ params }) {
  const { token } = use(params);
  const t = useT();
  const router = useRouter();
  const [invitation, setInvitation] = useState(null);
  const [code, setCode] = useState(null);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    let annule = false;
    lireInvitation(token).then((res) => {
      if (annule) return;
      if (res.success) setInvitation(res.invitation);
      else setCode(res.code || "invalide");
    });
    return () => { annule = true; };
  }, [token]);

  async function activer(e) {
    e.preventDefault();
    setErreur(null);
    if (motDePasse !== confirmation) return setErreur(t("dashboard.invitation.mismatch"));
    setEnvoi(true);
    const res = await accepterInvitation({ jeton: token, prenom, nom, motDePasse });
    if (!res.success) {
      setEnvoi(false);
      return setErreur(t(`dashboard.invitation.errors.${res.code || "creationImpossible"}`, { min: MOT_DE_PASSE_MIN }));
    }
    const { error } = await createClient().auth.signInWithPassword({ email: res.email, password: motDePasse });
    if (error) {
      // Le compte existe : la connexion manuelle suffira.
      router.push("/login");
      return;
    }
    router.push("/accueil");
    router.refresh();
  }

  const carte = (contenu) => (
    <div className="ds-auth-card fade-in">
      <div style={{ display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Onbord" style={{ height: 28, width: "auto" }} />
      </div>
      {contenu}
    </div>
  );

  if (code) {
    return carte(
      <>
        <p className="ds-sub" style={{ textAlign: "center" }}>{t(`dashboard.invitation.errors.${code}`, { min: MOT_DE_PASSE_MIN })}</p>
        <Link href="/login" className="ds-btn ds-btn-primary" style={{ width: "100%", height: 40, justifyContent: "center" }}>
          {t("dashboard.invitation.toLogin")}
        </Link>
      </>
    );
  }

  if (!invitation) {
    return carte(
      <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return carte(
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "center" }}>
        <h1 className="ds-h1" style={{ whiteSpace: "normal" }}>{t("dashboard.invitation.title", { organisation: invitation.organisation || "Onbord" })}</h1>
        <p className="ds-sub">{t("dashboard.invitation.subtitle", { role: t(`dashboard.team.roles.${invitation.role}`) })}</p>
      </div>

      <form onSubmit={activer} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {erreur && (
          <div className="ds-inset" style={{ background: "var(--ds-red-bg)", borderColor: "var(--ds-red-inset)", color: "var(--ds-red)", fontSize: 13, padding: 12 }}>
            {erreur}
          </div>
        )}
        <label className="ds-field">
          <span className="ds-label">{t("dashboard.invitation.email")}</span>
          <input className="ds-input" type="email" value={invitation.email} readOnly disabled />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.invitation.firstName")}</span>
            <input className="ds-input" autoComplete="given-name" required value={prenom} onChange={(e) => setPrenom(e.target.value)} />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.invitation.lastName")}</span>
            <input className="ds-input" autoComplete="family-name" required value={nom} onChange={(e) => setNom(e.target.value)} />
          </label>
        </div>
        <label className="ds-field">
          <span className="ds-label">{t("dashboard.invitation.password")}</span>
          <input className="ds-input" type="password" autoComplete="new-password" required minLength={MOT_DE_PASSE_MIN}
            value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
          <span className="ds-help">{t("dashboard.invitation.passwordHint", { min: MOT_DE_PASSE_MIN })}</span>
        </label>
        <label className="ds-field">
          <span className="ds-label">{t("dashboard.invitation.confirm")}</span>
          <input className="ds-input" type="password" autoComplete="new-password" required minLength={MOT_DE_PASSE_MIN}
            value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
        </label>
        <button type="submit" className="ds-btn ds-btn-primary" style={{ width: "100%", height: 40, marginTop: 6 }} disabled={envoi}>
          {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {envoi ? t("dashboard.invitation.pending") : t("dashboard.invitation.submit")}
        </button>
      </form>
    </>
  );
}
