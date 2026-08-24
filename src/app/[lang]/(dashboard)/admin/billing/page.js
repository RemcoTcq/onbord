"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLocaleHref } from "@/lib/i18n/navigation";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminAddCredits, adminChangePlan, adminListUserUsage } from "@/lib/actions/usage";
import { Loader2, Shield, CreditCard, Plus, RefreshCw, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isCurrentUserAdmin } from "@/lib/actions/usage";
import { PLANS, CREDIT_PACKS } from "@/lib/constants/plans";

const PLAN_COLORS = {
  core: { bg: "#e0e7ff", color: "#4338ca", label: "Core" },
  pro: { bg: "#ede9fe", color: "#6d28d9", label: "Pro" },
  custom: { bg: "#dcfce7", color: "#166534", label: "Custom" },
  admin: { bg: "#1e293b", color: "#ffffff", label: "Admin" },
};

export default function AdminBillingPage() {
  const { t, locale } = useI18n();
  const href = useLocaleHref();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const { toast } = useToast();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isCurrentUserAdmin())) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setHasAccess(true);

    // Cette lecture depuis le navigateur ne fonctionnait que grâce au
    // contournement `is_admin()` posé dans la policy SQL de user_usage — la
    // fonction qui testait le suffixe @onbord.be. La migration 023 la retire :
    // la lecture passe par une action serveur, gardée par ADMIN_EMAILS.
    const res = await adminListUserUsage();
    if (res.success) setUsers(res.usages);
    setLoading(false);
  }

  async function handleChangePlan(userId, newPlan) {
    setActionLoading(prev => ({ ...prev, [`plan_${userId}`]: true }));
    const res = await adminChangePlan(userId, newPlan);
    if (res.success) {
      setUsers(prev => prev.map(u =>
        u.user_id === userId
          ? { ...u, plan: newPlan, credits_balance: PLANS[newPlan]?.creditsPerMonth || u.credits_balance, credits_allocated: PLANS[newPlan]?.creditsPerMonth || u.credits_allocated }
          : u
      ));
      toast(`Plan mis à jour → ${PLANS[newPlan]?.label || newPlan}`);
    } else {
      toast("Erreur : " + res.error, "error");
    }
    setActionLoading(prev => ({ ...prev, [`plan_${userId}`]: false }));
  }

  async function handleAddCredits(userId, amount) {
    setActionLoading(prev => ({ ...prev, [`credits_${userId}`]: true }));
    const res = await adminAddCredits(userId, amount);
    if (res.success) {
      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, credits_balance: res.newBalance } : u
      ));
      toast(`+${amount} crédits ajoutés ✓`);
    } else {
      toast("Erreur : " + res.error, "error");
    }
    setActionLoading(prev => ({ ...prev, [`credits_${userId}`]: false }));
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

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CreditCard size={24} style={{ color: "var(--primary)" }} />
          {t("dashboard.admin.creditsTitle")}
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          {t("dashboard.admin.creditsSubtitle")}
        </p>
      </div>

      {/* Navigation Admin */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
        <a href={href("/admin")} className="btn btn-ghost" style={{ padding: "10px 20px", border: "1px solid var(--border)" }}>
          {t("dashboard.admin.tabInvites")}
        </a>
        <button className="btn btn-primary" style={{ padding: "10px 20px" }}>
          {t("dashboard.admin.tabCredits")}
        </button>
      </div>

      {/* Résumé */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {Object.entries(PLANS).map(([key, p]) => {
          const count = users.filter(u => u.plan === key).length;
          const pc = PLAN_COLORS[key] || PLAN_COLORS.core;
          return (
            <div key={key} className="card" style={{ padding: "1rem", textAlign: "center" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", padding: "3px 10px", borderRadius: "99px", background: pc.bg, color: pc.color }}>
                {p.label}
              </span>
              <div style={{ fontSize: "2rem", fontWeight: "900", marginTop: "8px" }}>{count}</div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>utilisateur{count !== 1 ? "s" : ""}</div>
            </div>
          );
        })}
      </div>

      {/* Table utilisateurs */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
              {[
                t("dashboard.admin.columns.user"),
                t("dashboard.admin.columns.plan"),
                t("dashboard.admin.columns.creditsLeft"),
                t("dashboard.admin.columns.allocatedPerMonth"),
                t("dashboard.admin.columns.reset"),
                t("dashboard.admin.columns.actions"),
              ].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>
                  {t("dashboard.admin.noUsers")}
                </td>
              </tr>
            )}
            {users.map(u => {
              const pc = PLAN_COLORS[u.plan] || PLAN_COLORS.core;
              const isPlanLoading = actionLoading[`plan_${u.user_id}`];
              const isCreditsLoading = actionLoading[`credits_${u.user_id}`];
              const creditPct = u.credits_allocated > 0
                ? Math.min(100, Math.round((u.credits_balance / u.credits_allocated) * 100))
                : 0;
              const creditColor = creditPct > 50 ? "#166534" : creditPct > 20 ? "#92400e" : "#991b1b";

              return (
                <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Utilisateur */}
                  <td style={{ padding: "14px 16px" }}>
                    <code style={{ fontSize: "11px", color: "var(--muted-foreground)", background: "var(--secondary)", padding: "2px 6px", borderRadius: "4px" }}>
                      {u.user_id.substring(0, 8)}…
                    </code>
                  </td>

                  {/* Plan */}
                  <td style={{ padding: "14px 16px" }}>
                    <select
                      value={u.plan}
                      onChange={e => handleChangePlan(u.user_id, e.target.value)}
                      disabled={isPlanLoading}
                      style={{
                        padding: "5px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700",
                        background: pc.bg, color: pc.color, border: "none", cursor: "pointer",
                        appearance: "none", paddingRight: "20px",
                      }}
                    >
                      {Object.entries(PLANS).map(([key, p]) => (
                        <option key={key} value={key}>{p.label}</option>
                      ))}
                    </select>
                    {isPlanLoading && <Loader2 size={12} style={{ marginLeft: "6px", animation: "spin 1s linear infinite", display: "inline" }} />}
                  </td>

                  {/* Crédits restants */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "700", color: creditColor, fontSize: "14px" }}>{u.credits_balance}</span>
                      <div style={{ width: "60px", height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: `${creditPct}%`, height: "100%", background: creditColor }} />
                      </div>
                    </div>
                  </td>

                  {/* Alloués/mois */}
                  <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                    {u.credits_allocated}
                  </td>

                  {/* Reset */}
                  <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                    {u.last_reset_date
                      ? formatDateShort(
                          new Date(new Date(u.last_reset_date).getFullYear(), new Date(u.last_reset_date).getMonth() + 1, 1),
                          locale
                        )
                      : "—"}
                  </td>

                  {/* Actions — Ajout de crédits */}
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {CREDIT_PACKS.map(pack => (
                        <button
                          key={pack.id}
                          onClick={() => handleAddCredits(u.user_id, pack.credits)}
                          disabled={isCreditsLoading}
                          title={`+${pack.credits} crédits (${pack.price}€)`}
                          style={{
                            padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700",
                            background: "var(--secondary)", color: "var(--foreground)",
                            border: "1px solid var(--border)", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "3px",
                          }}
                        >
                          {isCreditsLoading ? <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={10} />}
                          {pack.credits}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "1rem", textAlign: "center" }}>
        {t("dashboard.admin.creditsResetNote")}
      </p>
    </div>
  );
}
