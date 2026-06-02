"use client";

import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { isAdmin } from "@/lib/utils/admin";
import CreditBadge from "../billing/CreditBadge";

const navItems = [
  { label: "Accueil", href: "/accueil", icon: Home },
  { label: "Évaluations", href: "/jobs", icon: ClipboardList },
  { label: "Talents", href: "/talents", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const collapsed = true; // Forcer la sidebar toujours fermée
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

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
    }
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
    : user?.email || "Mon compte";

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
        href="/jobs/nouveau"
        className={`${styles.newDemandBtn} ${collapsed ? styles.collapsed : ""}`}
        title={collapsed ? "Nouvelle évaluation" : undefined}
      >
        <Plus size={18} />
        {!collapsed && <span>Nouvelle évaluation</span>}
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
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}

        {isAdmin(user) && (
          <>
            <div style={{ margin: "8px 0 4px", height: "1px", background: "var(--border)" }} />
            {!collapsed && <span className={styles.navLabel}>Admin</span>}
            <a
              href="/admin"
              className={`${styles.navItem} ${pathname.startsWith("/admin") ? styles.navItemActive : ""} ${collapsed ? styles.collapsed : ""}`}
              title={collapsed ? "Administration" : undefined}
            >
              <ShieldCheck size={20} />
              {!collapsed && <span>Administration</span>}
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
        title="Gérer mon compte"
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
            title="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </aside>
  );
}
