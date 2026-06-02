"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminAddCredits, adminChangePlan } from "@/lib/actions/usage";
import { Loader2, Shield, CreditCard, Plus, RefreshCw, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isAdmin as checkAdmin } from "@/lib/utils/admin";
import { PLANS, CREDIT_PACKS } from "@/lib/constants/plans";

const PLAN_COLORS = {
  beta: { bg: "#fef3c7", color: "#92400e", label: "Beta" },
  core: { bg: "#e0e7ff", color: "#4338ca", label: "Core" },
  scale: { bg: "#ede9fe", color: "#6d28d9", label: "Scale" },
  enterprise: { bg: "#dcfce7", color: "#166534", label: "Enterprise" },
};

export default function AdminBillingPage() {
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

    if (!user || !checkAdmin(user)) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setHasAccess(true);

    // Charger user_usage + email depuis auth.users via la vue admin
    const { data: usages } = await supabase
      .from("user_usage")
      .select("*")
      .order("credits_balance", { ascending: true });

    if (usages) setUsers(usages);
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
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>Accès refusé</h1>
        <p style={{ color: "var(--muted-foreground)" }}>Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CreditCard size={24} style={{ color: "var(--primary)" }} />
          Gestion des crédits &amp; plans
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Modifiez le plan ou ajoutez des crédits à vos clients.
        </p>
      </div>

      {/* Navigation Admin */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
        <a href="/admin" className="btn btn-ghost" style={{ padding: "10px 20px", border: "1px solid var(--border)" }}>
          Invitations
        </a>
        <button className="btn btn-primary" style={{ padding: "10px 20px" }}>
          Crédits &amp; Plans
        </button>
        <a href="/admin/tests" className="btn btn-ghost" style={{ padding: "10px 20px", border: "1px solid var(--border)" }}>
          Tests de compétences
        </a>
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
              {["Utilisateur", "Plan", "Crédits restants", "Alloués/mois", "Reset", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>
                  Aucun utilisateur enregistré.
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
                      ? new Date(new Date(u.last_reset_date).getFullYear(), new Date(u.last_reset_date).getMonth() + 1, 1)
                          .toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
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
        💡 Les crédits se réinitialisent automatiquement chaque mois selon le plan.
      </p>
    </div>
  );
}
