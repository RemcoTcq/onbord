"use client";

import { usePathname } from "next/navigation";
import { LocaleLink as Link, stripLocale } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { Shield } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

// En-tête commun des écrans d'administration : titre, puis les trois onglets.
// Ces écrans ne sont plus dans le menu (refonte d'octobre 2026) : on y arrive
// par leur adresse, /admin.
export default function AdminEnTete({ sousTitre }) {
  const t = useT();
  const pathname = stripLocale(usePathname());
  const onglets = [
    { href: "/admin", label: t("dashboard.admin.tabInvites"), actif: pathname === "/admin" },
    { href: "/admin/couts", label: t("dashboard.admin.tabCosts"), actif: pathname.startsWith("/admin/couts") },
    { href: "/admin/billing", label: t("dashboard.admin.tabCredits"), actif: pathname.startsWith("/admin/billing") },
  ];
  return (
    <>
      <PageHeader title={t("dashboard.admin.title")} />
      <div className="ds-tabbar">
        <nav aria-label={t("dashboard.admin.title")} className="ds-tabs">
          {onglets.map((o) => (
            <Link key={o.href} href={o.href} className="ds-tab" aria-current={o.actif ? "page" : undefined}>{o.label}</Link>
          ))}
        </nav>
        {sousTitre && <span className="ds-sub" style={{ paddingBottom: 13 }}>{sousTitre}</span>}
      </div>
    </>
  );
}

/** Écran affiché à un compte qui n'est pas administrateur. */
export function AccesRefuse() {
  const t = useT();
  return (
    <>
      <PageHeader title={t("dashboard.admin.title")} />
      <div className="ds-empty" style={{ padding: "80px 20px" }}>
        <Shield size={32} color="var(--ds-red)" />
        <span className="ds-empty-title">{t("dashboard.admin.accessDenied")}</span>
        <span>{t("dashboard.admin.adminsOnly")}</span>
      </div>
    </>
  );
}
