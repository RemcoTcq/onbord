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
      toast(`Erreur : ${result.error}`, "error");
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <Loader2 className="spin" size={24} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)" }}>
          {t("dashboard.account.security")}
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          {t("dashboard.account.securityIntro")}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Vérification de sécurité obligatoire */}
        <div style={{ padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <label className="form-label" htmlFor="oldPassword" style={{ color: "#334155", fontWeight: "600" }}>{t("dashboard.account.currentPassword")}</label>
          <input 
            id="oldPassword"
            type="password" 
            className="input-field" 
            placeholder={t("dashboard.account.currentPasswordHint")}
            value={oldPassword} 
            onChange={(e) => setOldPassword(e.target.value)} 
            required
            style={{ background: "white" }}
          />
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          <label className="form-label" htmlFor="email">{t("dashboard.account.email")}</label>
          <input 
            id="email"
            type="email" 
            className="input-field" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
          />
          {email !== currentEmail && (
            <p style={{ fontSize: "12px", color: "var(--accent-foreground)", marginTop: "4px" }}>
              {t("dashboard.account.emailHint")}
            </p>
          )}
        </div>

        <div>
          <label className="form-label" htmlFor="newPassword">{t("dashboard.account.newPassword")}</label>
          <input 
            id="newPassword"
            type="password" 
            className="input-field" 
            placeholder={t("dashboard.account.newPasswordHint")}
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving || !oldPassword}
            style={{ width: "fit-content" }}
          >
            {saving ? <><Loader2 size={16} className="spin" /> {t("common.states.saving")}</> : t("dashboard.account.updateSecurity")}
          </button>
        </div>
      </form>
    </div>
  );
}
