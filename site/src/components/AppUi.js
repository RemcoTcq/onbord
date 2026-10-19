// Les briques de l'interface recruteur, recopiées pour le site.
//
// Partagées par la fenêtre du hero (AppPeek.js) et par les visuels du reste
// de l'accueil : tout doit avoir l'air de venir du MÊME logiciel, celui que
// le prospect verra en démo. Les styles vont avec, classes `ap-*` sous
// `.app-ui` ou `.peek__win` dans globals.css.
//
// Pas de "use client" : ces composants n'ont pas d'état, ils servent aussi
// bien aux composants serveur (Mocks.js) qu'aux composants client.

// Les pastilles de couleur des jobs, dans l'ordre de l'application
// (src/components/ui/ds.js à la racine du dépôt).
export const PASTILLES = ["#1B45C4", "#4C74E0", "#7FA0F0", "#2E5BD8"];

/** Ton d'un score sur 100 : mêmes seuils que l'application (75 / 50). */
export function ton(n) {
  if (n === "" || n == null) return "wait";
  const v = Number(n);
  if (v >= 75) return "high";
  if (v >= 50) return "mid";
  return "low";
}

// ── Icônes, au trait de l'application (1,8) ─────────────────────────────────
export function Ic({ size = 16, sw = 1.8, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}
export const IcHome = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M11.3 2.6a1 1 0 0 1 1.4 0l8 7.2c.2.2.3.5.3.8V20a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H4.5A1.5 1.5 0 0 1 3 20v-9.4c0-.3.1-.6.3-.8z" />
  </svg>
);
export const IcJobs = (p) => <Ic {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Ic>;
export const IcSearch = (p) => <Ic sw={2} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Ic>;
export const IcGear = (p) => <Ic {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Ic>;
export const IcPanel = (p) => <Ic {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M16 10l-2 2 2 2" /></Ic>;
export const IcChevron = (p) => <Ic sw={2} {...p}><path d="m9 6 6 6-6 6" /></Ic>;
export const IcChevronDown = (p) => <Ic sw={2} {...p}><path d="m6 9 6 6 6-6" /></Ic>;
export const IcPlus = (p) => <Ic sw={2.2} {...p}><path d="M12 5v14M5 12h14" /></Ic>;
export const IcLink = (p) => <Ic sw={2} {...p}><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></Ic>;
export const IcArrow = (p) => <Ic sw={2.2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Ic>;
export const IcTrash = (p) => <Ic sw={2} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Ic>;
export const IcExpand = (p) => <Ic sw={2} {...p}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></Ic>;
export const IcMessage = (p) => <Ic {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-5A8 8 0 1 1 21 12z" /></Ic>;
export const IcCalendar = (p) => <Ic {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Ic>;
export const IcUsers = (p) => <Ic {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></Ic>;
export const IcCheckDone = (p) => <Ic sw={2.2} {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9 11l3-3 3 3" /></Ic>;

export const IcMail = (p) => <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></Ic>;

// Pour les autres visuels de l'accueil (Mocks.js, Steps.js, FeedbackTabs.js).
export const IcFile = (p) => <Ic {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Ic>;
export const IcCheck = (p) => <Ic sw={2.4} {...p}><path d="M20 6 9 17l-5-5" /></Ic>;
export const IcSparkle = (p) => <Ic {...p}><path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z" /><path d="M20 3v4M22 5h-4M4 17v2M5 18H3" /></Ic>;
export const IcPanelClose = (p) => <Ic {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M15 3v18M8 9l3 3-3 3" /></Ic>;
export const IcSend = (p) => <Ic sw={2} {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></Ic>;
export const IcRotate = (p) => <Ic sw={2} {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Ic>;
export const IcUpload = (p) => <Ic sw={2} {...p}><path d="M12 15V3M7 8l5-5 5 5" /><path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" /></Ic>;

/** Une pastille de score, colorée selon le ton. */
export function Note({ n, fmt = "{n}%", gros = false }) {
  const t = ton(n);
  return <span className={`ap-score ap-score--${t}${gros ? " ap-score--big" : ""}`}>{fmt.replace("{n}", n)}</span>;
}

/** Une pastille de statut, avec son point. */
export function Statut({ children, t = "ok" }) {
  return <span className={`ap-status ap-status--${t}`}><i />{children}</span>;
}

