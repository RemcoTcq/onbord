"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Zap, RefreshCw, Mail, ChevronRight, Sparkles, CreditCard } from "lucide-react";
import { PLANS, CREDIT_COSTS, COUT_CANDIDAT_COMPLET } from "@/lib/constants/plans";

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

  const isUnlimited = !!info.illimite;
  const pct = info.credits_allocated > 0
    ? Math.min(100, Math.round((info.credits_balance / info.credits_allocated) * 100))
    : 100;
  const creditColor = pct > 50 ? "#166534" : pct > 20 ? "#d97706" : "#dc2626";

  const nextReset = info.nextResetDate
    ? formatDateLong(info.nextResetDate, locale)
    : null;

  // info.plan sort déjà de planVisible() : un bêta-testeur y lit « core ».
  const planDetails = PLANS[info.plan];

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
                {/* Le prix affiché est celui du cycle du compte, plus toujours
                    celui de l'annuel. */}
                {!isUnlimited && info.cycle === "annual" && planDetails.priceAnnual > 0 && (
                  <span> · {t("dashboard.billing.pricePerMonthAnnual", { price: planDetails.priceAnnual })}</span>
                )}
                {!isUnlimited && info.cycle !== "annual" && planDetails.priceMonthly > 0 && (
                  <span> · {t("dashboard.billing.pricePerMonth", { price: planDetails.priceMonthly })}</span>
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
            {nextReset && info.cycle !== "annual" && (
              <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px" }}>
                🔄 {t("dashboard.billing.autoReset")} <strong>{nextReset}</strong>
              </p>
            )}
            {/* Annuel : la recharge S'AJOUTE au solde, et le report s'éteint au
                renouvellement (voir CYCLES, constants/plans.js). */}
            {nextReset && info.cycle === "annual" && (
              <>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "8px" }}>
                  🔄 {t("dashboard.billing.nextRefill", { count: planDetails?.creditsPerMonth ?? 0 })} <strong>{nextReset}</strong>
                </p>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "4px", lineHeight: 1.5 }}>
                  {t("dashboard.billing.rolloverHelp", { date: info.renewalDate ? formatDateLong(info.renewalDate, locale) : "—" })}
                </p>
              </>
            )}
          </>
        ) : (
          <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", fontSize: "13px", color: "#166534", fontWeight: "600" }}>
            {t("dashboard.billing.unlimitedAccess")}
          </div>
        )}
      </div>

      {/* Coût des actions — trois opérations, et trois seulement. */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={14} style={{ color: "var(--primary)" }} /> {t("dashboard.billing.costPerAction")}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            {
              icon: "🧩",
              label: t("dashboard.billing.createJob"),
              help: t("dashboard.billing.createJobHelp"),
              unit: t("dashboard.billing.perJobUnit"),
              cost: CREDIT_COSTS.simulation_generation,
            },
            {
              icon: "✏️",
              label: t("dashboard.billing.regenerateStep"),
              help: t("dashboard.billing.regenerateStepHelp"),
              unit: t("dashboard.billing.perStepUnit"),
              cost: CREDIT_COSTS.step_regeneration,
            },
            {
              icon: "🏁",
              label: t("dashboard.billing.candidateRun"),
              help: t("dashboard.billing.candidateRunHelp", {
                start: CREDIT_COSTS.candidate_start,
                scoring: CREDIT_COSTS.candidate_scoring,
              }),
              unit: t("dashboard.billing.perCandidateUnit"),
              cost: COUT_CANDIDAT_COMPLET,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px",
                padding: "14px 16px", borderRadius: "10px",
                background: "var(--background)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.icon} {item.label}
                </div>
                <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "4px", lineHeight: 1.45 }}>
                  {item.help}
                </p>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: "16px", fontWeight: "900" }}>
                  {t("dashboard.billing.creditsSuffix", { count: item.cost })}
                </div>
                <div style={{ fontSize: "11px", color: "var(--muted-foreground)", fontWeight: "600" }}>
                  {item.unit}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "12px" }}>
          {t("dashboard.billing.nothingElse")}
        </p>
      </div>

      {/* Plus d'encart « crédits supplémentaires » : l'achat de crédits à l'unité
          a été retiré de l'offre (voir constants/plans.js). Un compte à court
          passe par le contact ci-dessous. */}

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
          <Mail size={14} /> {t("dashboard.billing.contactUs")}
        </a>
      </div>
    </div>
  );
}
