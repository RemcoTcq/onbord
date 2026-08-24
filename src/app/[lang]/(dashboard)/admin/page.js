"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLocaleHref } from "@/lib/i18n/navigation";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Link2, Trash2, Loader2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  isCurrentUserAdmin,
  adminListInviteTokens,
  adminCreateInviteToken,
  adminDeleteInviteToken,
} from "@/lib/actions/usage";

// generateToken() vivait ici : 24 caractères tirés avec Math.random(), dont la
// suite est prédictible. Sur une invitation qui peut porter le plan `admin`,
// cela suffit à la deviner. Le jeton est désormais tiré côté serveur, avec
// crypto.randomUUID() (cf. adminCreateInviteToken).

export default function AdminPage() {
  const { t, locale } = useI18n();
  const href = useLocaleHref();
  const [plan, setPlan] = useState("core");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isCurrentUserAdmin())) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    // `invite_tokens` n'accepte plus d'accès direct (migration 022) : la lecture
    // passe par une action serveur, gardée par ADMIN_EMAILS.
    const res = await adminListInviteTokens();
    if (res.success) setTokens(res.tokens);
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);

    // Jeton tiré serveur, plan validé serveur : l'insert partait auparavant du
    // navigateur, qui choisissait donc librement le plan de l'invitation.
    const { success, token: data, error } = await adminCreateInviteToken(plan);

    if (!success) {
      toast("Erreur : " + error, "error");
    } else {
      setTokens(prev => [data, ...prev]);
      const link = `${window.location.origin}/join?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(data.id);
      toast(t("dashboard.admin.linkGenerated"));
      setTimeout(() => setCopiedId(null), 3000);
    }
    setGenerating(false);
  }

  async function handleDelete(id) {
    await adminDeleteInviteToken(id);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast(t("dashboard.admin.tokenDeleted"));
  }

  function copyLink(token, id) {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast(t("dashboard.admin.linkCopied"));
    setTimeout(() => setCopiedId(null), 3000);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: "80px 20px" }}>
        <Shield size={48} style={{ color: "var(--destructive)", margin: "0 auto 24px" }} />
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>{t("dashboard.admin.accessDenied")}</h1>
        <p style={{ color: "var(--muted-foreground)" }}>{t("dashboard.admin.adminsOnly")}</p>
      </div>
    );
  }

  const PLAN_COLORS = {
    core: { bg: "#e0e7ff", color: "#4338ca" },
    pro: { bg: "#ede9fe", color: "#6d28d9" },
    custom: { bg: "#f1f5f9", color: "#1e293b" },
    admin: { bg: "#1e293b", color: "#ffffff" },
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>{t("dashboard.admin.title")}</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>{t("dashboard.admin.subtitle")}</p>
      </div>

      {/* Tabs / Navigation */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
        <button 
          className="btn btn-primary" 
          style={{ padding: "10px 20px" }}
        >
          {t("dashboard.admin.tabInvites")}
        </button>
        <a
          href={href("/admin/couts")}
          className="btn btn-ghost"
          style={{ padding: "10px 20px", border: "1px solid var(--border)" }}
        >
          {t("dashboard.admin.tabCosts")}
        </a>
      </div>

      {/* Generator */}
      <div className="card" style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "250px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}>Plan :</label>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value)}
            style={{
              padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)",
              background: "var(--background)", fontSize: "14px", fontWeight: "600",
              color: "var(--foreground)", cursor: "pointer", flex: 1
            }}
          >
            <option value="core">Core</option>
            <option value="pro">Pro</option>
            <option value="custom">Custom</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={generating}
          style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Link2 size={18} />}
          {t("dashboard.admin.generateLink")}
        </button>
      </div>

      {/* Tokens list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.token")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.plan")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.status")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.expires")}</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>{t("dashboard.admin.noTokens")}</td></tr>
            )}
            {tokens.map(tok => {
              const expired = new Date(tok.expires_at) < new Date();
              const pc = PLAN_COLORS[tok.plan] || PLAN_COLORS.core;
              return (
                <tr key={tok.id} style={{ borderBottom: "1px solid var(--border)", opacity: tok.used || expired ? 0.5 : 1 }}>
                  <td style={{ padding: "14px 20px" }}>
                    <code style={{ fontSize: "12px", background: "var(--secondary)", padding: "4px 8px", borderRadius: "6px" }}>
                      {tok.token.substring(0, 12)}...
                    </code>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", background: pc.bg, color: pc.color }}>
                      {tok.plan.charAt(0).toUpperCase() + tok.plan.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                    {tok.used ? (
                      <span style={{ color: "#166534", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.used")}</span>
                    ) : expired ? (
                      <span style={{ color: "#991b1b", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.expired")}</span>
                    ) : (
                      <span style={{ color: "#0369a1", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.active")}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                    {formatDateLong(tok.expires_at, locale)}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      {!tok.used && !expired && (
                        <button
                          onClick={() => copyLink(tok.token, tok.id)}
                          className="btn btn-ghost btn-sm"
                          title={t("dashboard.admin.copyLink")}
                          style={{ color: copiedId === tok.id ? "#166534" : "var(--primary)" }}
                        >
                          {copiedId === tok.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tok.id)}
                        className="btn btn-ghost btn-sm"
                        title={t("dashboard.admin.delete")}
                        style={{ color: "var(--destructive)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
