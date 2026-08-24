"use client";

import { LocaleLink as Link, stripLocale } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { usePathname } from "next/navigation";
import { User, Shield, Palette, CreditCard, Building2 } from "lucide-react";

export default function AccountLayout({ children }) {
  const t = useT();
  // Le chemin porte désormais le préfixe de langue (/fr/compte). Les href des
  // onglets, eux, restent sans préfixe — c'est LocaleLink qui l'ajoute. On
  // compare donc sur le chemin dépouillé, sinon aucun onglet ne s'allume.
  const pathname = stripLocale(usePathname());

  const tabs = [
    { nameKey: "dashboard.account.tabs.general", href: "/compte", icon: User, exact: true },
    { nameKey: "dashboard.account.tabs.company", href: "/compte/profil", icon: Building2, exact: false },
    { nameKey: "dashboard.account.tabs.branding", href: "/compte/branding", icon: Palette, exact: false },
    { nameKey: "dashboard.account.tabs.security", href: "/compte/securite", icon: Shield, exact: false },
    { nameKey: "dashboard.account.tabs.billing", href: "/compte/billing", icon: CreditCard, exact: false },
  ];


  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">{t("dashboard.account.title")}</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
          {t("dashboard.account.subtitle")}
        </p>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexDirection: "column" }}>
        {/* Onglets de navigation */}
        <div style={{ 
          display: "flex", 
          gap: "1rem", 
          borderBottom: "1px solid var(--border)",
          paddingBottom: "1px"
        }}>
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  fontSize: "14px",
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                  borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                  marginBottom: "-1px",
                  textDecoration: "none",
                  transition: "all 0.2s"
                }}
              >
                <Icon size={16} />
                {t(tab.nameKey)}
              </Link>
            );
          })}
        </div>

        {/* Contenu de la page active */}
        <div className="card" style={{ padding: "2rem" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
