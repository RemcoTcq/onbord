"use client";

import { LocaleLink as Link, stripLocale } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { usePathname } from "next/navigation";
import { User, Shield, Palette, CreditCard, Building2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

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
    <>
      <PageHeader title={t("dashboard.nav.settings")} />

      <div className="ds-tabbar">
        <nav aria-label={t("dashboard.account.title")} className="ds-tabs">
          {tabs.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link key={tab.href} href={tab.href} className="ds-tab" aria-current={isActive ? "page" : undefined}>
                <Icon size={15} strokeWidth={1.8} />
                {t(tab.nameKey)}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Contenu de l'onglet actif : des panneaux, sur la largeur d'une colonne de lecture. */}
      <div className="ds-body" style={{ maxWidth: 820 }}>
        {children}
      </div>
    </>
  );
}
