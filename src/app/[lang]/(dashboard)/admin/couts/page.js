"use client";
import { useLocaleHref } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { isCurrentUserAdmin } from "@/lib/actions/usage";
import { getCostStats } from "@/lib/actions/costs";
import { Loader2, Shield, Sparkles, ClipboardCheck, Bot } from "lucide-react";

// Seules les VALEURS sont ici : le libellé se résout au rendu, sinon il serait
// figé en français au chargement du module.
const PERIODS = [7, 30, null];

const periodLabel = (t, days) =>
  days === null ? t("dashboard.admin.periodAll") : t("dashboard.admin.periodDays", { count: days });

const usd = (n) => "$" + (n || 0).toFixed(n < 0.1 ? 4 : 3);

export default function AdminCostsPage() {
  const href = useLocaleHref();
  const { t } = useI18n();
  const [hasAccess, setHasAccess] = useState(null);
  const [period, setPeriod] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await isCurrentUserAdmin())) { setHasAccess(false); setLoading(false); return; }
      setHasAccess(true);
      load(period);
    })();
  }, []);

  async function load(p) {
    setLoading(true);
    const res = await getCostStats(p);
    if (res.success) setStats(res);
    setLoading(false);
  }

  function changePeriod(p) { setPeriod(p); load(p); }

  if (hasAccess === false) {
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
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>{t("dashboard.admin.costsTitle")}</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>{t("dashboard.admin.costsSubtitle")}</p>
      </div>

      {/* Nav admin */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <a href={href("/admin")} className="btn btn-ghost" style={{ padding: "10px 20px", border: "1px solid var(--border)" }}>{t("dashboard.admin.tabInvites")}</a>
        <button className="btn btn-primary" style={{ padding: "10px 20px" }}>{t("dashboard.admin.costsTitle")}</button>
      </div>

      {/* Sélecteur de période */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
        {PERIODS.map((p) => (
          <button key={String(p)} onClick={() => changePeriod(p)}
            className={`btn btn-sm ${period === p ? "btn-primary" : "btn-outline"}`}>{periodLabel(t, p)}</button>
        ))}
      </div>

      {loading || !stats ? (
        <div style={{ padding: "3rem", textAlign: "center" }}><Loader2 size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} /></div>
      ) : (
        <>
          {/* KPI principaux */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "1.5rem" }}>
            <Kpi title={t("dashboard.admin.avgMarginalCost")} value={usd(stats.avg.marginalPerParcours)} hint={t("dashboard.admin.avgMarginalCostHelp")} big />
            <Kpi title={t("dashboard.admin.fullCost")} value={usd(stats.avg.fullPerParcours)} hint={t("dashboard.admin.fullCostHelp")} />
            <Kpi title={t("dashboard.admin.totalPeriod")} value={usd(stats.totals.all)} hint={`${stats.counts.runs} parcours · ${stats.counts.experiences} expériences`} />
          </div>

          {/* Répartition */}
          <div className="card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)", marginBottom: "1rem" }}>{t("dashboard.admin.breakdown")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Row icon={<Sparkles size={16} style={{ color: "#f59e0b" }} />} label={t("dashboard.admin.generationCost")} total={stats.totals.generation}
                sub={`${stats.counts.generated} générations · moy ${usd(stats.avg.generationPerExperience)}/expérience (une fois par poste, amortie)`} allTotal={stats.totals.all} />
              <Row icon={<ClipboardCheck size={16} style={{ color: "#16a34a" }} />} label={t("dashboard.admin.scoringCost")} total={stats.totals.scoring}
                sub={`${stats.counts.scoredRuns} runs notés · moy ${usd(stats.avg.scoringPerRun)}/run`} allTotal={stats.totals.all} />
              <Row icon={<Bot size={16} style={{ color: "#3b82f6" }} />} label={t("dashboard.admin.assistantCost")} total={stats.totals.assistant}
                sub={`${stats.counts.runsWithAssistant} runs avec assistant · moy ${usd(stats.avg.assistantPerRun)}/run`} allTotal={stats.totals.all} />
            </div>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
              {t("dashboard.admin.transcriptionNote")}
            </p>
          </div>

          {/* Par poste */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--muted-foreground)" }}>{t("dashboard.admin.perJob")}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {[
                      t("dashboard.admin.jobColumn"),
                      t("dashboard.admin.runsColumn"),
                      t("dashboard.admin.generationCost"),
                      t("dashboard.admin.scoringCost"),
                      t("dashboard.admin.assistantCost"),
                      t("dashboard.billing.total"),
                    ].map((h, i) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: i === 0 ? "left" : "right", fontSize: 11, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.perJob.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>{t("dashboard.admin.noDataPeriod")}</td></tr>
                  )}
                  {stats.perJob.map((j) => (
                    <tr key={j.jobId} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{j.title}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13, color: "var(--muted-foreground)" }}>{j.runs}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13 }}>{usd(j.generation)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13 }}>{usd(j.scoring)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 13 }}>{usd(j.assistant)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 14, fontWeight: 700 }}>{usd(j.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, hint, big }) {
  return (
    <div className="card" style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: big ? "2rem" : "1.5rem", fontWeight: 800, color: "var(--foreground)" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function Row({ icon, label, total, sub, allTotal }) {
  const pct = allTotal ? Math.round((total / allTotal) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}>{icon} {label}</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{usd(total)} <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontWeight: 500 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)" }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{sub}</div>
    </div>
  );
}
