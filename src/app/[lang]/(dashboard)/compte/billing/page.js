"use client";
import { formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Zap, RefreshCw, Mail, Sparkles, CreditCard, Loader2, Puzzle, PenLine, Flag } from "lucide-react";
import { PLANS, CREDIT_COSTS, COUT_CANDIDAT_COMPLET } from "@/lib/constants/plans";

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
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!info) {
    return <p className="ds-sub">{t("dashboard.billing.loadError")}</p>;
  }

  const isUnlimited = !!info.illimite;
  const pct = info.credits_allocated > 0
    ? Math.min(100, Math.round((info.credits_balance / info.credits_allocated) * 100))
    : 100;
  // La jauge reste bleue tant qu'il reste de la marge, comme sur le tableau de bord.
  const couleur = pct > 20 ? "var(--ds-blue)" : pct > 10 ? "var(--ds-amber)" : "var(--ds-red)";

  const nextReset = info.nextResetDate
    ? formatDateLong(info.nextResetDate, locale)
    : null;

  // info.plan sort déjà de planVisible() : un bêta-testeur y lit « core ».
  const planDetails = PLANS[info.plan];

  const actions = [
    {
      Icone: Puzzle,
      label: t("dashboard.billing.createJob"),
      help: t("dashboard.billing.createJobHelp"),
      unit: t("dashboard.billing.perJobUnit"),
      cost: CREDIT_COSTS.simulation_generation,
    },
    {
      Icone: PenLine,
      label: t("dashboard.billing.regenerateStep"),
      help: t("dashboard.billing.regenerateStepHelp"),
      unit: t("dashboard.billing.perStepUnit"),
      cost: CREDIT_COSTS.step_regeneration,
    },
    {
      Icone: Flag,
      label: t("dashboard.billing.candidateRun"),
      help: t("dashboard.billing.candidateRunHelp", {
        start: CREDIT_COSTS.candidate_start,
        scoring: CREDIT_COSTS.candidate_scoring,
      }),
      unit: t("dashboard.billing.perCandidateUnit"),
      cost: COUT_CANDIDAT_COMPLET,
    },
  ];

  return (
    <>
      {/* Plan actuel */}
      <section className="ds-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
          <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.billing.title")}
          </h2>
          <p className="ds-sub">{t("dashboard.billing.subtitle")}</p>
        </div>
        <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <span className="ds-label">{t("dashboard.billing.currentPlan")}</span>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>{info.planLabel}</div>
              {planDetails && (
                <p className="ds-sub" style={{ marginTop: 2 }}>
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
            <span className="ds-icon-tile" style={{ width: 36, height: 36, borderRadius: 10 }}><Zap size={17} fill="currentColor" /></span>
          </div>

          {/* Jauge de crédits */}
          {!isUnlimited ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 500 }}>{t("dashboard.billing.remainingCredits")}</span>
                <span className="ds-mono" style={{ fontWeight: 500, color: couleur }}>{info.credits_balance} / {info.credits_allocated}</span>
              </div>
              <span className="ds-meter" style={{ height: 8 }}><span style={{ width: `${pct}%`, background: couleur }} /></span>
              {nextReset && info.cycle !== "annual" && (
                <p className="ds-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <RefreshCw size={13} /> {t("dashboard.billing.autoReset")} <strong style={{ fontWeight: 500, color: "var(--ds-ink)" }}>{nextReset}</strong>
                </p>
              )}
              {/* Annuel : la recharge S'AJOUTE au solde, et le report s'éteint au
                  renouvellement (voir CYCLES, constants/plans.js). */}
              {nextReset && info.cycle === "annual" && (
                <>
                  <p className="ds-sub" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <RefreshCw size={13} /> {t("dashboard.billing.nextRefill", { count: planDetails?.creditsPerMonth ?? 0 })} <strong style={{ fontWeight: 500, color: "var(--ds-ink)" }}>{nextReset}</strong>
                  </p>
                  <p className="ds-sub" style={{ lineHeight: 1.5 }}>
                    {t("dashboard.billing.rolloverHelp", { date: info.renewalDate ? formatDateLong(info.renewalDate, locale) : "—" })}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="ds-chip ds-chip-green ds-chip-lg" style={{ alignSelf: "flex-start" }}>
              <span className="ds-dot ds-dot-green" /> {t("dashboard.billing.unlimitedAccess")}
            </div>
          )}
        </div>
      </section>

      {/* Coût des actions — trois opérations, et trois seulement. */}
      <section className="ds-panel">
        <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
          <Sparkles size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.billing.costPerAction")}
        </h2>
        <div className="ds-inset ds-rows">
          {actions.map(({ Icone, ...item }) => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: 14 }}>
              <span style={{ display: "flex", gap: 10, minWidth: 0 }}>
                <span className="ds-icon-tile ds-icon-tile-soft"><Icone size={14} /></span>
                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>{item.label}</span>
                  <span className="ds-sub" style={{ lineHeight: 1.45 }}>{item.help}</span>
                </span>
              </span>
              <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                <span className="ds-mono" style={{ display: "block", fontWeight: 500, fontSize: 15 }}>{t("dashboard.billing.creditsSuffix", { count: item.cost })}</span>
                <span className="ds-help">{item.unit}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="ds-sub" style={{ padding: "0 10px 8px" }}>{t("dashboard.billing.nothingElse")}</p>
      </section>

      {/* Plus d'encart « crédits supplémentaires » : l'achat de crédits à l'unité
          a été retiré de l'offre (voir constants/plans.js). Un compte à court
          passe par le contact ci-dessous. */}
      <section className="ds-card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", background: "var(--ds-blue)", borderColor: "var(--ds-blue)", color: "#FFFFFF" }}>
        <div>
          <p style={{ fontWeight: 600, margin: "0 0 2px" }}>{t("dashboard.billing.needMore")}</p>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>{t("dashboard.billing.needMoreHelp")}</p>
        </div>
        <a href="mailto:hello@onbord.be" className="ds-btn" style={{ border: 0, color: "var(--ds-blue)" }}>
          <Mail size={14} /> {t("dashboard.billing.contactUs")}
        </a>
      </section>
    </>
  );
}
