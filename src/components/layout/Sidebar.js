"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LocaleLink as Link, stripLocale } from "@/lib/i18n/navigation";
import { Briefcase, Search, Settings, PanelLeftClose, PanelLeftOpen, BookOpen, Contact, GraduationCap, Layers, ListOrdered, Users, UserSearch, ChevronDown, ChartColumn } from "lucide-react";
// Layers : « Simulations », l'entrée commune au recrutement et à l'onboarding.
import { useT } from "@/lib/i18n/I18nProvider";
import { useShell } from "./ShellContext";
import { jobDot } from "@/components/ui/ds";
import styles from "./Sidebar.module.css";

// Maison pleine de la maquette : Lucide n'en a qu'une version au trait.
function HomeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.3 2.6a1 1 0 0 1 1.4 0l8 7.2c.2.2.3.5.3.8V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20v-9.4c0-.3.1-.6.3-.8z" />
    </svg>
  );
}

function Logomark({ height = 22 }) {
  return (
    <svg height={height} viewBox="0 0 370 617" fill="none" aria-hidden="true">
      <path fill="#07294b" d="m0 1h150c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150-82.84 0-150-67.16-150-150z" />
      <path fill="#07294b" d="m0 501c0-102.17 82.83-185 185-185h35c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150h-220z" />
    </svg>
  );
}

const CLE_OUVERT = "onbord_sidebar_open";
// Les groupes repliés par l'utilisateur (phase 5). Un groupe qui contient la
// page ouverte s'affiche toujours déplié.
const CLE_GROUPES = "onbord_sidebar_groupes_replies";
const NB_RECENTS = 5;

export default function Sidebar() {
  const t = useT();
  // Chemin canonique (français, sans préfixe) : comparable aux href du code.
  const pathname = stripLocale(usePathname());
  const { jobs, openSearch } = useShell();
  // Lecture directe au premier rendu : le cadre n'affiche le menu qu'après la
  // vérification de session, côté client — pas de rendu serveur à accorder.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(CLE_OUVERT) !== "0"; } catch { return true; }
  });
  const [replies, setReplies] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CLE_GROUPES) || "[]"); } catch { return []; }
  });
  const [isMac] = useState(() => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || ""));

  function basculerGroupe(cle) {
    const next = replies.includes(cle) ? replies.filter((c) => c !== cle) : [...replies, cle];
    setReplies(next);
    try { localStorage.setItem(CLE_GROUPES, JSON.stringify(next)); } catch {}
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(CLE_OUVERT, next ? "1" : "0"); } catch {}
  }

  const ouverts = jobs.filter((j) => j.status === "active");
  const recents = ouverts.slice(0, NB_RECENTS);
  const jobCourant = pathname.match(/^\/jobs\/([^/]+)/)?.[1];

  const taille = open ? 16 : 17;
  const icone = (Icone) => <Icone size={taille} strokeWidth={1.8} />;
  // Le menu : l'accueil et les SIMULATIONS (toutes, quel que soit leur usage,
  // 16/11/2026), puis ce que chaque usage en fait — les offres et les candidats
  // du recrutement, les personnes et les programmes de l'onboarding — et ce que
  // les deux partagent : l'entreprise (connaissances, personnages).
  const groupes = [
    { cle: "accueil", items: [
      { href: "/accueil", label: t("dashboard.nav.home"), icon: <HomeIcon size={taille} />, actif: pathname === "/accueil" },
      { href: "/simulations", label: t("dashboard.nav.simulations"), icon: icone(Layers), actif: pathname.startsWith("/simulations") || pathname.startsWith("/onboarding/modules") },
    ] },
    { cle: "hiring", label: t("dashboard.nav.hiring"), items: [
      { href: "/recrutement", label: t("dashboard.nav.overview"), icon: icone(ChartColumn), actif: pathname === "/recrutement" },
      {
        href: "/jobs",
        label: t("dashboard.nav.jobs"),
        icon: icone(Briefcase),
        actif: pathname === "/jobs" || (pathname.startsWith("/jobs/") && !recents.some((j) => j.id === jobCourant)),
        count: ouverts.length || null,
      },
      { href: "/candidats", label: t("dashboard.nav.candidates"), icon: icone(UserSearch), actif: pathname.startsWith("/candidats") },
    ] },
    { cle: "onboarding", label: t("dashboard.nav.onboarding"), items: [
      { href: "/onboarding", label: t("dashboard.nav.overview"), icon: icone(GraduationCap), actif: pathname === "/onboarding" },
      { href: "/onboarding/personnes", label: t("dashboard.nav.people"), icon: icone(Users), actif: pathname.startsWith("/onboarding/personnes") },
      { href: "/onboarding/programmes", label: t("dashboard.nav.programs"), icon: icone(ListOrdered), actif: pathname.startsWith("/onboarding/programmes") },
    ] },
    { cle: "company", label: t("dashboard.nav.company"), items: [
      { href: "/entreprise/connaissances", label: t("dashboard.nav.knowledge"), icon: icone(BookOpen), actif: pathname.startsWith("/entreprise") },
      { href: "/bibliotheque/personnages", label: t("dashboard.nav.personas"), icon: icone(Contact), actif: pathname.startsWith("/bibliotheque") },
    ] },
  ];
  const lien = (it) => (
    <Link key={it.href} href={it.href} aria-current={it.actif ? "page" : undefined} className={`${styles.navItem} ${it.actif ? styles.active : ""}`}>
      {it.icon}
      <span className={styles.navLabel}>{it.label}</span>
      {it.count != null && <span className={styles.count}>{it.count}</span>}
    </Link>
  );
  const parametresActif = pathname.startsWith("/compte");
  const raccourci = isMac ? "⌘K" : "Ctrl K";

  if (!open) {
    return (
      <aside className={`${styles.sidebar} ${styles.closed}`}>
        <Link href="/accueil" className={styles.logoTile} aria-label={t("dashboard.nav.home")}>
          <Logomark />
        </Link>
        <button type="button" className={styles.squareBtn} onClick={toggle} aria-label={t("dashboard.nav.expand")} aria-expanded="false">
          <PanelLeftOpen size={17} strokeWidth={1.8} />
        </button>
        <button type="button" className={`${styles.squareBtn} ${styles.searchSquare}`} onClick={openSearch} aria-label={t("dashboard.nav.search")} title={`${t("dashboard.nav.search")} · ${raccourci}`}>
          <Search size={16} strokeWidth={2} />
        </button>
        <nav aria-label={t("dashboard.nav.menu")} className={styles.navClosed}>
          {groupes.map((g, i) => [
            i > 0 && <span key={`sep-${g.cle}`} className={styles.sepClosed} aria-hidden="true" />,
            ...g.items.map((it) => (
              <Link key={it.href} href={it.href} title={it.label} aria-label={it.label} aria-current={it.actif ? "page" : undefined} className={`${styles.squareLink} ${it.actif ? styles.active : ""}`}>
                {it.icon}
              </Link>
            )),
          ])}
        </nav>
        <div className={styles.grow} />
        <Link href="/compte" title={t("dashboard.nav.settings")} aria-label={t("dashboard.nav.settings")} aria-current={parametresActif ? "page" : undefined} className={`${styles.squareLink} ${parametresActif ? styles.active : ""}`}>
          <Settings size={17} strokeWidth={1.8} />
        </Link>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoBar}>
        <Link href="/accueil" className={styles.logoLink}>
          <img src="/logo.png" alt="Onbord" style={{ height: 20, width: "auto" }} />
        </Link>
        <button type="button" className={styles.ghostBtn} onClick={toggle} aria-label={t("dashboard.nav.collapse")} aria-expanded="true">
          <PanelLeftClose size={17} strokeWidth={1.8} />
        </button>
      </div>

      <button type="button" className={styles.search} onClick={openSearch}>
        <Search size={15} strokeWidth={2} />
        <span className={styles.searchText}>{t("dashboard.nav.searchPlaceholder")}</span>
        <kbd className={styles.kbd}>{raccourci}</kbd>
      </button>

      <nav aria-label={t("dashboard.nav.menu")} className={styles.menu}>
        {groupes.map((g) => {
          if (!g.label) return <div key={g.cle} className={styles.group}>{g.items.map(lien)}</div>;
          const contientActif = g.items.some((it) => it.actif);
          const deplie = contientActif || !replies.includes(g.cle);
          return (
            <div key={g.cle} className={styles.group}>
              <button type="button" className={styles.groupToggle} onClick={() => basculerGroupe(g.cle)} aria-expanded={deplie} disabled={contientActif}>
                <span className={styles.navLabel}>{g.label}</span>
                <ChevronDown size={14} strokeWidth={2} className={styles.chevron} style={{ transform: deplie ? "none" : "rotate(-90deg)" }} />
              </button>
              {deplie && g.items.map(lien)}
            </div>
          );
        })}
      </nav>

      {recents.length > 0 && (
        <div className={styles.group}>
          <span className={styles.groupLabel}>{t("dashboard.nav.recentJobs")}</span>
          {recents.map((job) => {
            const courant = job.id === jobCourant;
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} aria-current={courant ? "page" : undefined} className={`${styles.navItem} ${styles.recent} ${courant ? styles.recentActive : ""}`}>
                <span className="ds-square" style={{ background: jobDot(job.id) }} />
                <span className={styles.navLabel}>{job.title || t("dashboard.jobs.untitled")}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className={styles.grow} />

      <div className={styles.group}>
        <Link href="/compte" aria-current={parametresActif ? "page" : undefined} className={`${styles.navItem} ${parametresActif ? styles.active : ""}`}>
          <Settings size={16} strokeWidth={1.8} />
          <span className={styles.navLabel}>{t("dashboard.nav.settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
