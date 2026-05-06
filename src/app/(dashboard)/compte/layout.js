"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Shield } from "lucide-react";

export default function AccountLayout({ children }) {
  const pathname = usePathname();

  const tabs = [
    { name: "Informations générales", href: "/compte", icon: User, exact: true },
    { name: "Sécurité & Connexion", href: "/compte/securite", icon: Shield, exact: false },
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 className="page-title">Mon Compte</h1>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
          Gérez vos informations personnelles et vos paramètres de sécurité.
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
                {tab.name}
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
