"use client";

import EmployerBrandingForm from "@/components/settings/EmployerBrandingForm";
import { Palette } from "lucide-react";

export default function BrandingPage() {
  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Palette size={20} style={{ color: "var(--primary)" }} /> Personnalisation visuelle
        </h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem", fontSize: "13px" }}>
          Configurez l'apparence globale des évaluations que vos candidats vont parcourir.
        </p>
      </div>
      <EmployerBrandingForm showContextWarning={false} />
    </div>
  );
}
