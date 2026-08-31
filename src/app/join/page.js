"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter, LocaleLink as Link } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { claimInvitePlan, validateInviteToken } from "@/lib/actions/usage";
import ConfirmEmailNotice from "@/components/auth/ConfirmEmailNotice";

function JoinForm() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aConfirmer, setAConfirmer] = useState(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!token) {
      setError(t("common.auth.joinInvalidToken"));
      setLoading(false);
      return;
    }

    async function validateToken() {
      // Cette page interrogeait `invite_tokens` directement, avec la clé anon.
      // La policy « Public can read tokens » (SELECT true) qui le permettait
      // rendait AUSSI la table listable en entier : un simple
      // GET /rest/v1/invite_tokens?select=* renvoyait toutes les invitations en
      // attente avec leur jeton et leur plan — dont le plan `admin`.
      //
      // La validation passe désormais par le serveur, qui ne renvoie que de quoi
      // afficher l'écran : validité, plan, et l'identifiant que réclame
      // claimInvitePlan. Jamais la ligne, jamais la liste.
      const res = await validateInviteToken(token);

      if (!res.success) setError(res.error);
      else setTokenData({ id: res.id, plan: res.plan });

      setLoading(false);
    }

    validateToken();
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Création du compte. Le jeton d'invitation est MIS DE CÔTÉ sur le
      // compte : quand la confirmation d'e-mail est exigée, la réclamation ne
      // peut pas avoir lieu maintenant — il n'y a pas encore de session — et
      // c'est ainsi que des invités arrivaient sans le plan de leur invitation.
      // claimPendingInvite() le reprendra à leur première connexion réelle.
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
            company_name: form.company_name,
            pending_invite_token: tokenData.id,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Confirmation exigée : on s'arrête là, l'écran explique la suite.
      if (!authData.session) {
        setAConfirmer(form.email);
        setSubmitting(false);
        return;
      }

      // 3. Session immédiate (confirmation désactivée) : le plan s'applique tout
      // de suite, et le marqueur posé ci-dessus devient sans objet.
      const res = await claimInvitePlan(tokenData.id);
      if (!res.success) {
        throw new Error(res.error || t("common.auth.joinPlanError"));
      }

      // 4. Redirect to dashboard
      router.push("/accueil");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const PLAN_LABELS = {
    core: { label: "Core", color: "var(--primary)" },
    pro: { label: "Pro", color: "#8b5cf6" },
    custom: { label: "Custom", color: "#1e293b" },
    admin: { label: "Admin", color: "#1e293b" },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "48px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fee2e2", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "28px" }}>!</div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>{t("common.auth.joinInvalidTitle")}</h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "32px" }}>{error}</p>
          <Link href="/login" style={{ color: "var(--primary)", fontWeight: "600", fontSize: "14px" }}>
            {t("common.auth.alreadyHaveAccount")} {t("common.auth.signIn")}
          </Link>
        </div>
      </div>
    );
  }

  if (aConfirmer) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
        <div style={{ maxWidth: "480px", width: "100%" }}>
          <ConfirmEmailNotice email={aConfirmer} />
        </div>
      </div>
    );
  }

  const planInfo = PLAN_LABELS[tokenData?.plan] || PLAN_LABELS.core;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
      <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "48px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>{t("common.auth.joinTitle")}</h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "16px" }}>
            {t("common.auth.joinSubtitle")}
          </p>
          <span style={{
            display: "inline-block", padding: "4px 16px", borderRadius: "20px",
            fontSize: "13px", fontWeight: "700",
            background: planInfo.color + "18", color: planInfo.color,
          }}>
            {t("common.auth.planNamed", { plan: planInfo.label })}
          </span>
        </div>

        {error && (
          <div style={{ color: "#991b1b", background: "#fee2e2", padding: "12px", borderRadius: "10px", fontSize: "13px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>{t("common.auth.fields.firstName")}</label>
              <input className="input-field" required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder={t("common.auth.fields.firstName")} />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>{t("common.auth.fields.lastName")}</label>
              <input className="input-field" required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder={t("common.auth.fields.lastName")} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>{t("common.auth.fields.company")}</label>
            <input className="input-field" required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder={t("common.auth.fields.companyPlaceholder")} />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>{t("common.auth.fields.email")}</label>
            <input className="input-field" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={t("common.auth.fields.emailPlaceholder")} />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>{t("common.auth.fields.password")}</label>
            <input className="input-field" type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t("common.auth.fields.passwordHint")} />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", marginTop: "8px" }}
            disabled={submitting}
          >
            {submitting ? t("common.auth.registerPending") : t("common.auth.registerSubmit")}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--muted-foreground)" }}>
          {t("common.auth.alreadyHaveAccount")} <Link href="/login" style={{ color: "var(--primary)", fontWeight: "600" }}>{t("common.auth.signIn")}</Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
