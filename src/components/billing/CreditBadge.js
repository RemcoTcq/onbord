"use client";

import { useState, useEffect } from "react";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Zap } from "lucide-react";

/**
 * Badge affichant les crédits restants dans la sidebar/navbar.
 * Se recharge automatiquement au montage.
 */
export default function CreditBadge() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getUserCreditInfo().then(setInfo);
  }, []);

  if (!info) return null;

  const pct = info.credits_allocated > 0
    ? Math.min(100, Math.round((info.credits_balance / info.credits_allocated) * 100))
    : 100;

  const color = pct > 50 ? "#166534" : pct > 20 ? "#d97706" : "#dc2626";
  const bg = pct > 50 ? "#f0fdf4" : pct > 20 ? "#fffbeb" : "#fef2f2";
  const borderColor = pct > 50 ? "#bbf7d0" : pct > 20 ? "#fde68a" : "#fecaca";

  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: "10px",
        background: bg,
        border: `1px solid ${borderColor}`,
        margin: "0 0 8px 0",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color, display: "flex", alignItems: "center", gap: "5px" }}>
          <Zap size={11} fill={color} /> Crédits
        </span>
        <span style={{ fontSize: "12px", fontWeight: "800", color }}>
          {info.credits_balance === 999999 ? "∞" : info.credits_balance}
          {info.credits_balance !== 999999 && (
            <span style={{ fontWeight: "500", color: "var(--muted-foreground)", fontSize: "11px" }}>
              /{info.credits_allocated}
            </span>
          )}
        </span>
      </div>

      {info.credits_balance !== 999999 && (
        <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: color,
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
        <span style={{ fontSize: "10px", color: "var(--muted-foreground)", fontWeight: "600" }}>
          Plan {info.planLabel}
        </span>
        {info.credits_balance !== 999999 && pct <= 20 && (
          <a
            href="/compte/billing"
            style={{ fontSize: "10px", fontWeight: "700", color, textDecoration: "underline" }}
          >
            Recharger
          </a>
        )}
      </div>
    </div>
  );
}
