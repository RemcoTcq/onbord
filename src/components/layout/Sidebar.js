"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  Plus,
  FileText,
  Send,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { isAdmin } from "@/lib/utils/admin";
import UsageWidget from "../usage/UsageWidget";

const navItems = [
  { label: "Accueil", href: "/accueil", icon: Home },
  { label: "Brouillons", href: "/brouillons", icon: FileText },
  { label: "Demandes", href: "/demandes", icon: Send },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [collapsed, setCollapsed] = useState(false);
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
      <div className={styles.logo}>
        <div style={{ 
          width: collapsed ? "26px" : "120px", 
          height: "34px", 
          overflow: "hidden", 
          transition: "width 0.2s ease" 
        }}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 392 112" 
            style={{ width: "120px", height: "34px", display: "block" }}
            preserveAspectRatio="xMidYMid meet"
          >
            <g transform="translate(0,112) scale(0.1,-0.1)" fill="var(--primary)" stroke="none">
              <path d="M0 902 l0 -199 29 -40 c64 -89 216 -125 321 -76 170 78 210 303 78 435 -67 67 -107 78 -279 78 l-149 0 0 -198z"/>
              <path d="M2090 600 l0 -320 55 0 c48 0 55 2 55 20 0 25 4 25 41 -3 26 -18 43 -22 108 -22 67 0 83 4 118 27 61 40 93 112 93 207 0 42 -5 93 -11 114 -11 40 -58 100 -93 119 -60 33 -164 27 -218 -12 -15 -11 -30 -20 -33 -20 -3 0 -5 47 -5 105 l0 105 -55 0 -55 0 0 -320z m294 55 c58 -27 83 -100 65 -185 -14 -66 -53 -100 -115 -100 -87 0 -134 51 -134 145 0 113 92 183 184 140z"/>
              <path d="M3790 819 c0 -55 -3 -99 -7 -97 -81 42 -157 51 -225 29 -171 -56 -182 -386 -15 -462 72 -32 176 -20 229 28 17 15 18 14 18 -10 0 -26 2 -27 55 -27 l55 0 0 320 0 320 -55 0 -55 0 0 -101z m-73 -166 c81 -38 97 -188 28 -253 -37 -35 -120 -40 -159 -9 -56 44 -71 129 -36 207 30 66 97 88 167 55z"/>
              <path d="M1220 756 c-110 -23 -172 -106 -174 -230 -2 -159 86 -256 234 -256 97 0 170 42 213 124 31 60 30 182 -3 250 -27 56 -85 103 -139 111 -20 4 -45 8 -56 9 -11 2 -45 -1 -75 -8z m111 -103 c48 -19 78 -72 79 -136 0 -84 -44 -138 -117 -144 -80 -7 -128 34 -139 119 -10 73 16 131 69 157 51 25 55 25 108 4z"/>
              <path d="M1790 759 c-25 -5 -57 -18 -72 -29 -34 -25 -36 -25 -40 3 -3 19 -9 22 -53 22 l-50 0 -3 -237 -2 -238 55 0 55 0 0 121 c0 144 12 197 52 236 23 22 39 28 73 28 86 0 104 -46 105 -252 l0 -133 56 0 57 0 -5 174 c-4 160 -6 177 -29 222 -36 71 -106 100 -199 83z"/>
              <path d="M2786 759 c-65 -10 -125 -55 -156 -115 -21 -40 -25 -62 -24 -129 0 -92 20 -142 78 -193 83 -72 233 -70 316 4 136 123 77 401 -90 429 -68 12 -75 12 -124 4z m124 -117 c74 -54 79 -186 10 -247 -17 -15 -36 -20 -82 -20 -55 0 -62 3 -88 32 -34 37 -45 85 -36 148 15 97 118 143 196 87z"/>
              <path d="M3341 759 c-25 -5 -56 -20 -72 -35 l-27 -26 -7 31 c-6 30 -9 31 -56 31 l-49 0 0 -240 0 -240 55 0 55 0 0 133 c0 106 4 139 18 167 23 46 75 80 124 80 l39 0 -3 52 c-3 59 -7 61 -77 47z"/>
              <path d="M205 516 c-57 -18 -82 -33 -132 -79 -71 -65 -73 -74 -73 -267 l0 -170 225 0 c203 0 230 2 263 19 124 64 183 231 124 352 -53 108 -145 159 -285 158 -45 0 -100 -6 -122 -13z"/>
            </g>
          </svg>
        </div>
      </div>

      {/* New Demand CTA */}
      <a
        href="/nouvelle-demande"
        className={`${styles.newDemandBtn} ${collapsed ? styles.collapsed : ""}`}
        title={collapsed ? "Nouvelle demande" : undefined}
      >
        <Plus size={16} />
        {!collapsed && <span>Nouvelle demande</span>}
      </a>

      {/* Navigation */}
      <nav className={styles.nav} style={{ marginTop: '12px' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={17} />
              {!collapsed && <span>{item.label}</span>}
            </a>
          );
        })}

        {isAdmin(user) && (
          <>
            <div style={{ margin: "10px 0 5px", height: "1px", background: "var(--border)" }} />
            {!collapsed && <span className={styles.navLabel}>ADMINISTRATION</span>}
            <a
              href="/admin"
              className={`${styles.navItem} ${pathname.startsWith("/admin") ? styles.navItemActive : ""}`}
              title={collapsed ? "Administration" : undefined}
            >
              <ShieldCheck size={17} />
              {!collapsed && <span>Dashboard Admin</span>}
            </a>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Ouvrir la sidebar" : "Fermer la sidebar"}
      >
        {collapsed ? <PanelLeft size={17} /> : <PanelLeftClose size={17} />}
      </button>

      {/* Usage Widget */}
      {!collapsed && (
        <div style={{ padding: "0 10px", marginBottom: "8px" }}>
          <UsageWidget compact />
        </div>
      )}

      {/* User footer */}
      <div 
        className={styles.userSection} 
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
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
