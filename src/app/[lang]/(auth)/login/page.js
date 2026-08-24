"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { LocaleLink as Link } from "@/lib/i18n/navigation";

export default function LoginPage() {
  const t = useT();
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
    <div className="auth-card fade-in">
      <div className="auth-header">
        <div className="auth-logo">
          <img src="/logo.png" alt="Onbord" style={{ height: "40px", width: "auto" }} />
        </div>
        <h2 className="auth-title">{t("common.auth.loginTitle")}</h2>
        <p className="auth-subtitle">{t("common.auth.loginSubtitle")}</p>
      </div>

      <form onSubmit={handleLogin}>
        {error && (
          <div style={{ color: 'var(--destructive)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}
        
        <div className="auth-form-group">
          <label className="form-label" htmlFor="email-address">{t("common.auth.fields.workEmail")}</label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder={t("common.auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="auth-form-group" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>{t("common.auth.fields.password")}</label>
            <Link href="#" style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>{t("common.auth.forgotPassword")}</Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px' }}
          disabled={loading}
        >
          {loading ? t("common.auth.loginPending") : t("common.auth.loginSubmit")}
        </button>
      </form>
      
      <div className="auth-footer">
        {t("common.auth.noAccountYet")}{" "}
        <Link href="/register" className="auth-link">
          {t("common.auth.createAccount")}
        </Link>
      </div>
    </div>
  );
}

