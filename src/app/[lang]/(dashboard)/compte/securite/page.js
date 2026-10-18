"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateSecuritySettings } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n/I18nProvider";
import { Loader2 } from "lucide-react";

export default function SecurityPage() {
  const t = useT();
  const { toast } = useToast();
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email || "");
        setEmail(user.email || "");
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!oldPassword) {
      toast(t("dashboard.account.currentPasswordRequired"), "error");
      return;
    }

    setSaving(true);

    const result = await updateSecuritySettings(oldPassword, newPassword, email);

    if (result.success) {
      if (email !== currentEmail) {
        toast(t("dashboard.account.emailConfirmationSent"), "success");
      } else {
        toast(t("dashboard.account.securityUpdated"), "success");
      }
      setOldPassword("");
      setNewPassword("");
      // We do NOT set currentEmail to email immediately because Supabase requires clicking the link first.
    } else {
      toast(result.error || t("dashboard.jobDetail.error"), "error");
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="ds-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
        <h2 className="ds-h2">{t("dashboard.account.security")}</h2>
        <p className="ds-sub">{t("dashboard.account.securityIntro")}</p>
      </div>

      {/* Vérification de sécurité obligatoire */}
      <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="ds-field" htmlFor="oldPassword">
          <span className="ds-label">{t("dashboard.account.currentPassword")}</span>
          <input
            id="oldPassword"
            type="password"
            className="ds-input"
            placeholder={t("dashboard.account.currentPasswordHint")}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </label>
      </div>

      <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <label className="ds-field" htmlFor="email">
          <span className="ds-label">{t("dashboard.account.email")}</span>
          <input id="email" type="email" className="ds-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {email !== currentEmail && <span className="ds-help" style={{ color: "var(--ds-blue)" }}>{t("dashboard.account.emailHint")}</span>}
        </label>
        <label className="ds-field" htmlFor="newPassword">
          <span className="ds-label">{t("dashboard.account.newPassword")}</span>
          <input
            id="newPassword"
            type="password"
            className="ds-input"
            placeholder={t("dashboard.account.newPasswordHint")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
      </div>

      <div className="ds-panel-foot">
        <button type="submit" className="ds-btn ds-btn-primary" disabled={saving || !oldPassword}>
          {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {saving ? t("common.states.saving") : t("dashboard.account.updateSecurity")}
        </button>
      </div>
    </form>
  );
}
