"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, LogOut, Settings } from "lucide-react";
import { LocaleLink as Link, useRouter } from "@/lib/i18n/navigation";
import { useT } from "@/lib/i18n/I18nProvider";
import { createClient } from "@/lib/supabase/client";
import { useShell } from "./ShellContext";
import { initials } from "@/components/ui/ds";

/**
 * En-tête de page, dans la carte blanche : titre (ou fil d'Ariane), actions,
 * puis l'avatar du recruteur. Chaque page du tableau de bord en pose un.
 *
 *   <PageHeader title="Jobs" actions={<Link className="ds-btn ds-btn-primary">…} />
 *   <PageHeader crumbs={[{ label: "Jobs", href: "/jobs" }]} title={job.title} />
 *
 * `garde` : appelée avant de suivre un lien du fil d'Ariane ; renvoyer false
 * l'annule (modifications non enregistrées).
 */
export default function PageHeader({ title, crumbs, actions, garde }) {
  return (
    <header className="ds-header">
      {crumbs?.length ? (
        <nav aria-label="breadcrumb" className="ds-crumbs">
          {crumbs.map((c) => (
            <span key={c.href} style={{ display: "contents" }}>
              <Link href={c.href} onClick={(e) => { if (garde && !garde()) e.preventDefault(); }}>{c.label}</Link>
              <ChevronRight size={16} strokeWidth={2} />
            </span>
          ))}
          <h1 className="ds-h1">{title}</h1>
        </nav>
      ) : (
        <h1 className="ds-h1">{title}</h1>
      )}
      <div className="ds-header-actions">
        {actions}
        {actions && <span className="ds-vsep" />}
        <AvatarMenu />
      </div>
    </header>
  );
}

function AvatarMenu() {
  const t = useT();
  const router = useRouter();
  const { user } = useShell();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fermer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const echap = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [open]);

  async function deconnexion() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  const nom = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={nom}
        className="ds-avatar"
        style={{ width: 36, height: 36, border: 0, cursor: "pointer", background: "var(--ds-blue-16)" }}
      >
        {initials(user?.first_name, user?.last_name, user?.email)}
      </button>
      {open && (
        <div role="menu" className="ds-menu" style={{ right: 0, top: 42, minWidth: 230 }}>
          <div style={{ padding: "8px 10px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nom}</span>
            {user?.company_name && <span className="ds-muted" style={{ fontSize: 12 }}>{user.company_name}</span>}
          </div>
          <div className="ds-menu-sep" />
          <Link href="/compte" role="menuitem" className="ds-menu-item" onClick={() => setOpen(false)}>
            <Settings size={15} strokeWidth={1.8} /> {t("dashboard.nav.manageAccount")}
          </Link>
          <button type="button" role="menuitem" className="ds-menu-item is-danger" onClick={deconnexion}>
            <LogOut size={15} strokeWidth={1.8} /> {t("dashboard.nav.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
