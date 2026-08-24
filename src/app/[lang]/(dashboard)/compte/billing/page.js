"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Zap, RefreshCw, Mail, ChevronRight, Sparkles, CreditCard } from "lucide-react";
import { PLANS, CREDIT_COSTS, EXTRA_CREDIT_PRICING, PLAN_PRICING } from "@/lib/constants/plans";

function CreditBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 100;
  return (
    <div style={{ height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "99px", transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function BillingPage() {
  const { t, locale } = useI18n();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserCreditInfo().then(res => {
      setInfo(res);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px" }}>
        <RefreshCw size={28} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!info) {
    return <p style={{ color: "var(--muted-foreground)" }}>{t("dashboard.billing.loadError")}</p>;
  }

  const isUnlimited = info.credits_balance === 999999;
  const pct = info.credits_allocated > 0
    ? Math.min(100, Math.round((info.credits_balance / info.credits_allocated) * 100))
    : 100;
  const creditColor = pct > 50 ? "#166534" : pct > 20 ? "#d97706" : "#dc2626";

  const nextReset = info.nextResetDate
    ? formatDateLong(info.nextResetDate, locale)
    : null;

  const planDetails = PLANS[info.plan];
  const extraPrice = EXTRA_CREDIT_PRICING[info.plan] || null;

  return (
    <div className="fade-in" style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CreditCard size={22} style={{ color: "var(--primary)" }} /> {t("dashboard.billing.title")}
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          {t("dashboard.billing.subtitle")}
        </p>
      </div>

      {/* Plan actuel */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>{t("dashboard.billing.currentPlan")}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                fontSize: "20px", fontWeight: "900", color: "var(--foreground)",
              }}>
                {info.planLabel}
              </span>
            </div>
            {planDetails && (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                {isUnlimited ? t("dashboard.billing.unlimitedCredits") : t("dashboard.billing.creditsPerMonth", { count: planDetails.creditsPerMonth })}
                {planDetails.priceAnnual !== null && planDetails.priceAnnual > 0 && (
                  <span> · {t("dashboard.billing.pricePerMonthAnnual", { price: planDetails.priceAnnual })}</span>
                )}
              </p>
            )}
          </div>
          <Zap size={32} style={{ color: creditColor }} fill={creditColor} />
        </div>

        {/* Barre de crédits */}
        {!isUnlimited ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>{t("dashboard.billing.remainingCredits")}</span>
              <span style={{ fontSize: "14px", fontWeight: "800", color: creditColor }}>
                {info.credits_balance} / {info.credits_allocated}
              </span>
            </div>
            <CreditBar value={info.credits_balance} total={info.credits_allocated} color={creditColor} />
            {nextReset && (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px" }}>
                🔄 Réinitialisation automatique le <strong>{nextReset}</strong>
              </p>
            )}
          </>
        ) : (
          <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", fontSize: "13px", color: "#166534", fontWeight: "600" }}>
            {t("dashboard.billing.unlimitedAccess")}
          </div>
        )}
      </div>

      {/* Coût des actions */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={14} style={{ color: "var(--primary)" }} /> {t("dashboard.billing.costPerAction")}
        </h3>
        
        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px" }}>{t("dashboard.billing.onAdd")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.25rem" }}>
          {[
            { label: t("dashboard.billing.qualifyingQuestions"), cost: CREDIT_COSTS.qualifying_questions, icon: "✅" },
            { label: t("dashboard.billing.skillsTest"), cost: CREDIT_COSTS.assessment_setup, icon: "🧠" },
            { label: t("dashboard.billing.videoModule"), cost: CREDIT_COSTS.video_setup, icon: "🎥" },
            { label: t("dashboard.billing.cvScoring"), cost: CREDIT_COSTS.cv_scoring_setup, icon: "📄" },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: "8px",
                background: "var(--background)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                {item.icon} {item.label}
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>
                {item.cost === 0 ? t("dashboard.billing.free") : t("dashboard.billing.creditsSuffix", { count: item.cost })}
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "8px" }}>{t("dashboard.billing.perCandidate")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: t("dashboard.billing.cvScoringPerCandidate"), cost: CREDIT_COSTS.cv_scoring_per_candidate, icon: "📄" },
            { label: t("dashboard.billing.fullJourney"), cost: CREDIT_COSTS.candidate_completion, icon: "🏁" },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: "8px",
                background: "var(--background)",
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                {item.icon} {item.label}
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>
                {item.cost} crédits / candidat
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Crédits supplémentaires */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "4px" }}>{t("dashboard.billing.extraCredits")}</h3>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
          {t("dashboard.billing.extraCreditsHelp")}
        </p>
        <div style={{
          padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)",
          background: "var(--background)", display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "4px" }}>{t("dashboard.billing.pricePerExtraCredit")}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--foreground)" }}>
              {extraPrice !== null ? `${extraPrice.toFixed(2).replace('.', ',')} €` : t("dashboard.billing.onQuote")}
            </div>
          </div>
          <a
            href="mailto:hello@onbord.be"
            style={{
              background: "var(--foreground)", color: "white", padding: "8px 16px",
              borderRadius: "8px", fontSize: "13px", fontWeight: "700",
              textDecoration: "none", display: "flex", alignItems: "center", gap: "6px",
              whiteSpace: "nowrap",
            }}
          >
            <Mail size={14} /> Commander
          </a>
        </div>
      </div>

      {/* CTA contact */}
      <div style={{
        padding: "1.25rem 1.5rem",
        background: "linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)",
        borderRadius: "12px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        color: "white",
      }}>
        <div>
          <p style={{ fontWeight: "700", fontSize: "15px", marginBottom: "2px" }}>{t("dashboard.billing.needMore")}</p>
          <p style={{ fontSize: "13px", opacity: 0.85 }}>{t("dashboard.billing.needMoreHelp")}</p>
        </div>
        <a
          href="mailto:hello@onbord.be"
          style={{
            background: "white", color: "var(--primary)", padding: "8px 16px",
            borderRadius: "8px", fontSize: "13px", fontWeight: "700",
            textDecoration: "none", display: "flex", alignItems: "center", gap: "6px",
            whiteSpace: "nowrap",
          }}
        >
          <Mail size={14} /> Nous contacter
        </a>
      </div>
    </div>
  );
}
