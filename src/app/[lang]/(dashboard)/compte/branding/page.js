"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";
import { Palette } from "lucide-react";

export default function BrandingPage() {
  const t = useT();

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Palette size={20} style={{ color: "var(--primary)" }} /> Personnalisation visuelle
        </h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem", fontSize: "13px" }}>
          {t("dashboard.branding.pageSubtitle")}
        </p>
      </div>
      <EmployerBrandingForm showContextWarning={false} />
    </div>
  );
}
