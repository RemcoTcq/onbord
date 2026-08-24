"use client";

import { usePathname } from "next/navigation";
import { useRouter, useLocaleHref, stripLocale } from "@/lib/i18n/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  ClipboardList,
  Users,
  Plus,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ShieldCheck,
  Briefcase,
  BookOpen
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { isCurrentUserAdmin } from "@/lib/actions/usage";
import CreditBadge from "../billing/CreditBadge";
import { useT } from "@/lib/i18n/I18nProvider";

// "/assessments" = hub de génération d'expériences (chat-first). Remplace
// l'ancienne bibliothèque de tests QCM.
// `labelKey` et non `label` : le libellé se résout au rendu, dans la langue du
// recruteur. Une constante de module figerait le français au chargement du
// bundle, avant même que le provider existe.
const navItems = [
  { labelKey: "dashboard.nav.home", href: "/accueil", icon: Home },
  { labelKey: "dashboard.nav.jobs", href: "/jobs", icon: Briefcase },
  { labelKey: "dashboard.nav.experiences", href: "/assessments", icon: BookOpen },
];

export default function Sidebar() {
  const t = useT();
  const href = useLocaleHref();
  // Dépouillé du préfixe : les href de navItems sont sans langue.
  const pathname = stripLocale(usePathname());
  const router = useRouter();
  const supabase = createClient();
  const collapsed = true; // Forcer la sidebar toujours fermée
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // ADMIN_EMAILS est une variable serveur : le navigateur ne peut pas la lire,
  // c'est donc le serveur qui répond.
  const [estAdmin, setEstAdmin] = useState(false);

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        setProfile({
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          company_name: user.user_metadata?.company_name || ""
        });
      }
      setEstAdmin(await isCurrentUserAdmin());
    }
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : user?.email || t("dashboard.nav.account");

  const initials = profile
    ? `${(profile.first_name || "")[0] || ""}${(profile.last_name || "")[0] || ""}`.toUpperCase()
    : (user?.email || "U")[0].toUpperCase();

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      {/* Logo */}
      <div className={`${styles.logo} ${collapsed ? styles.collapsed : ""}`}>
        {collapsed ? (
          /* Logomark SVG when collapsed */
          <svg width="20" height="33" viewBox="0 0 370 617" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: "var(--foreground)" }}>
            <path fill="currentColor" d="m0 1h150c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150-82.84 0-150-67.16-150-150z"/>
            <path fill="currentColor" d="m0 501c0-102.17 82.83-185 185-185h35c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150h-220z"/>
          </svg>
        ) : (
          <img
            src="/logo.png"
            alt="Onbord"
            style={{ height: "24px", width: "auto", objectFit: "contain" }}
          />
        )}
      </div>

      {/* New Job CTA */}
      <a
        href={href("/jobs/nouveau")}
        className={`${styles.newDemandBtn} ${collapsed ? styles.collapsed : ""}`}
        title={collapsed ? t("dashboard.nav.newJob") : undefined}
      >
        <Plus size={18} />
        {!collapsed && <span>{t("dashboard.nav.newJob")}</span>}
      </a>

      {/* Navigation */}
      <nav className={styles.nav} style={{ marginTop: '4px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${collapsed ? styles.collapsed : ""}`}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </a>
          );
        })}

        {estAdmin && (
          <>
            <div style={{ margin: "8px 0 4px", height: "1px", background: "var(--border)" }} />
            {!collapsed && <span className={styles.navLabel}>{t("dashboard.nav.admin")}</span>}
            <a
              href={href("/admin")}
              className={`${styles.navItem} ${pathname.startsWith("/admin") ? styles.navItemActive : ""} ${collapsed ? styles.collapsed : ""}`}
              title={collapsed ? t("dashboard.nav.administration") : undefined}
            >
              <ShieldCheck size={20} />
              {!collapsed && <span>{t("dashboard.nav.administration")}</span>}
            </a>
          </>
        )}
      </nav>

      {/* Credit Badge */}
      {!collapsed && (
        <div style={{ padding: "0 12px", marginBottom: "4px" }}>
          <CreditBadge />
        </div>
      )}

      {/* User footer */}
      <div 
        className={`${styles.userSection} ${collapsed ? styles.collapsed : ""}`} 
        onClick={() => router.push("/compte")}
        title={t("dashboard.nav.manageAccount")}
      >
        <div className={styles.userAvatar}>{initials}</div>
        {!collapsed && (
          <div className={styles.userInfo}>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.userCompany}>{profile?.company_name || "Onbord"}</span>
          </div>
        )}
        {!collapsed && (
          <button 
            className={styles.logoutBtn} 
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }} 
            title={t("dashboard.nav.signOut")}
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
