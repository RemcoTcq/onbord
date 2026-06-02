"use client";

import { useState, useEffect } from "react";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Zap, RefreshCw, Mail, ChevronRight, Sparkles, CreditCard } from "lucide-react";
import { CREDIT_PACKS, PLANS } from "@/lib/constants/plans";

function CreditBar({ value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 100;
  return (
    <div style={{ height: "8px", background: "var(--border)", borderRadius: "99px", overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "99px", transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function BillingPage() {
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
    return <p style={{ color: "var(--muted-foreground)" }}>Impossible de charger les informations de facturation.</p>;
  }

  const isUnlimited = info.credits_balance === 999999;
  const pct = info.credits_allocated > 0
    ? Math.min(100, Math.round((info.credits_balance / info.credits_allocated) * 100))
    : 100;
  const creditColor = pct > 50 ? "#166534" : pct > 20 ? "#d97706" : "#dc2626";

  const nextReset = info.nextResetDate
    ? new Date(info.nextResetDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  const planDetails = PLANS[info.plan];

  return (
    <div className="fade-in" style={{ maxWidth: "720px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "6px", display: "flex", alignItems: "center", gap: "10px" }}>
          <CreditCard size={22} style={{ color: "var(--primary)" }} /> Facturation &amp; Crédits
        </h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Suivez votre consommation et rechargez votre compte.
        </p>
      </div>

      {/* Plan actuel */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "6px" }}>Plan actuel</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                fontSize: "20px", fontWeight: "900", color: "var(--foreground)",
              }}>
                {info.planLabel}
              </span>
              {info.plan === "beta" && (
                <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px", background: "#fef3c7", color: "#92400e" }}>
                  ACCÈS BETA
                </span>
              )}
            </div>
            {planDetails && (
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                {isUnlimited ? "Crédits illimités" : `${planDetails.creditsPerMonth} crédits/mois`}
              </p>
            )}
          </div>
          <Zap size={32} style={{ color: creditColor }} fill={creditColor} />
        </div>

        {/* Barre de crédits */}
        {!isUnlimited ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: "600" }}>Crédits restants</span>
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
            ✓ Votre compte a un accès illimité.
          </div>
        )}
      </div>

      {/* Coût des actions */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={14} style={{ color: "var(--primary)" }} /> Coût par action IA
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { label: "CV Screening IA", cost: 1, icon: "📄" },
            { label: "Test de compétences", cost: 2, icon: "🧠" },
            { label: "Interview IA texte", cost: 3, icon: "💬" },
            { label: "Interview IA vidéo", cost: 5, icon: "🎥", locked: !(planDetails?.features?.videoInterview) },
          ].map(item => (
            <div
              key={item.label}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: "8px",
                background: item.locked ? "var(--secondary)" : "var(--background)",
                border: "1px solid var(--border)",
                opacity: item.locked ? 0.6 : 1,
              }}
            >
              <span style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                {item.icon} {item.label}
                {item.locked && <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: "600" }}>— Plan Scale requis</span>}
              </span>
              <span style={{ fontSize: "13px", fontWeight: "700" }}>
                {item.cost} crédit{item.cost > 1 ? "s" : ""} / candidat
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Packs crédits */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "700", marginBottom: "4px" }}>Packs de crédits supplémentaires</h3>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
          Pour commander un pack, contactez-nous et nous l'ajouterons à votre compte.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {CREDIT_PACKS.map(pack => (
            <div
              key={pack.id}
              style={{
                padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)",
                textAlign: "center", background: "var(--background)",
              }}
            >
              <div style={{ fontSize: "1.5rem", fontWeight: "900", color: "var(--foreground)" }}>
                {pack.credits}
              </div>
              <div style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "8px" }}>crédits</div>
              <div style={{ fontSize: "18px", fontWeight: "800", color: "var(--primary)" }}>{pack.price}€</div>
            </div>
          ))}
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
          <p style={{ fontWeight: "700", fontSize: "15px", marginBottom: "2px" }}>Besoin de plus de crédits ou d'un upgrade ?</p>
          <p style={{ fontSize: "13px", opacity: 0.85 }}>Contactez-nous, nous gérons votre compte manuellement.</p>
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
