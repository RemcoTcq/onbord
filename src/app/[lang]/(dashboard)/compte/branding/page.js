"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";
import { Palette } from "lucide-react";

export default function BrandingPage() {
  const t = useT();

  return (
    <section className="ds-panel">
      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
        <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Palette size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.branding.visualCustomisation")}
        </h2>
        <p className="ds-sub">{t("dashboard.branding.pageSubtitle")}</p>
      </div>
      <div className="ds-inset">
        <EmployerBrandingForm showContextWarning={false} />
      </div>
    </section>
  );
}
