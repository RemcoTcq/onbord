"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { LocaleLink as Link } from "@/lib/i18n/navigation";

// /auth/callback renvoie ici avec ?error=true quand l'échange du lien de
// confirmation échoue — lien déjà utilisé, expiré, ou ouvert sur un autre
// appareil que celui qui a lancé l'inscription. Le paramètre était posé depuis
// le début et n'a jamais été lu : l'utilisateur atterrissait sur un formulaire
// de connexion muet, sans savoir si sa confirmation avait marché.
function LoginPage() {
  const t = useT();
  const callbackFailed = useSearchParams().get("error") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/accueil");
      router.refresh();
    }
  };

  return (
    <div className="ds-auth-card fade-in">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
        <img src="/logo.png" alt="Onbord" style={{ height: 28, width: "auto" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 className="ds-h1" style={{ whiteSpace: "normal" }}>{t("common.auth.loginTitle")}</h1>
          <p className="ds-sub">{t("common.auth.loginSubtitle")}</p>
        </div>
      </div>

      {callbackFailed && (
        <div className="ds-inset" style={{ background: "var(--ds-amber-bg)", borderColor: "#F3DDB8", color: "var(--ds-amber-ink)", fontSize: 13, padding: 12 }}>
          {t("common.auth.confirmLinkFailed")}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div className="ds-inset" style={{ background: "var(--ds-red-bg)", borderColor: "var(--ds-red-inset)", color: "var(--ds-red)", fontSize: 13, padding: 12 }}>
            {error}
          </div>
        )}

        <label className="ds-field" htmlFor="email-address">
          <span className="ds-label">{t("common.auth.fields.workEmail")}</span>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="ds-input"
            placeholder={t("common.auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <div className="ds-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="ds-label" htmlFor="password">{t("common.auth.fields.password")}</label>
            <Link href="#" style={{ fontSize: 12, color: "var(--ds-ink-3)" }}>{t("common.auth.forgotPassword")}</Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="ds-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="ds-btn ds-btn-primary"
          style={{ width: "100%", height: 40, marginTop: 6 }}
          disabled={loading}
        >
          {loading ? t("common.auth.loginPending") : t("common.auth.loginSubmit")}
        </button>
      </form>

      {/* Le lien vers /register est retiré : l'inscription publique est fermée
          (réglage Supabase), la page ne fait plus que rediriger ici. */}
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}

