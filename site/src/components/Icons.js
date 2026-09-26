// Jeu d'icônes écrit à la main, en SVG.
//
// L'application utilise lucide-react ; le site ne le fait PAS exprès. Une
// vitrine qui charge une bibliothèque d'icônes entière pour en afficher douze
// paie ce poids sur la première visite, celle qui décide si le visiteur reste.
// Les tracés suivent le style de lucide (trait de 1,5, bouts arrondis, grille
// de 24) pour que le site et l'application restent cousins.
//
// Toutes décoratives : elles accompagnent un texte qui dit déjà la même chose,
// d'où `aria-hidden` systématique.

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

function Svg({ size = 16, children, ...rest }) {
  return (
    <svg width={size} height={size} {...base} {...rest}>
      {children}
    </svg>
  );
}

/** Le glyphe Onbord, repris de public/logo-onbord.svg.
 *  En `currentColor` et non en navy figé : sur ce site il est blanc, et le
 *  figer obligerait à maintenir deux fichiers. */
export function Logo({ height = 19 }) {
  return (
    <svg
      viewBox="0 0 370 617"
      height={height}
      width={(370 / 617) * height}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m0 1h150c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150-82.84 0-150-67.16-150-150z" />
      <path d="m0 501c0-102.17 82.83-185 185-185h35c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150h-220z" />
    </svg>
  );
}

/* ── Interface ───────────────────────────────────────────────────────────── */

export const ArrowRight = (p) => (<Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>);
export const ArrowLeft = (p) => (<Svg {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Svg>);
export const ArrowUp = (p) => (<Svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>);
export const Check = (p) => (<Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>);
export const Close = (p) => (<Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>);
export const Menu = (p) => (<Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>);
export const Plus = (p) => (<Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>);
export const Info = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.01" /></Svg>);
export const Alert = (p) => (<Svg {...p}><path d="M12 4l9 16H3l9-16zM12 10v4M12 17.5v.01" /></Svg>);

// Les quatre commandes d un appel. Elles ne pilotent rien : elles sont là pour
// qu on reconnaisse un appel en une demi-seconde, sans avoir à lire le mot.
export const MicOff = (p) => (<Svg {...p}><path d="M15 9V6a3 3 0 0 0-5.9-.7M9 10v2a3 3 0 0 0 4.9 2.3" /><path d="M5 11a7 7 0 0 0 10.5 6M19 11a7 7 0 0 1-.6 2.8M12 18v3" /><path d="M3 3l18 18" /></Svg>);
export const Cam = (p) => (<Svg {...p}><rect x="3" y="6" width="12" height="12" rx="2" /><path d="M15 11l6-3v8l-6-3z" /></Svg>);
export const Hangup = (p) => (<Svg {...p}><path d="M3 10.5c5-3.5 13-3.5 18 0l-1.8 2.4a2 2 0 0 1-2.4.5l-1.9-1a1.6 1.6 0 0 1-.8-1.6l.2-1.3c-2.2-.6-4.4-.6-6.6 0l.2 1.3a1.6 1.6 0 0 1-.8 1.6l-1.9 1a2 2 0 0 1-2.4-.5L3 10.5z" /></Svg>);

export const Globe = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 3.7 5.8 3.7 9S14.5 18.3 12 21c-2.5-2.7-3.7-5.8-3.7-9S9.5 5.7 12 3z" />
  </Svg>
);

export const Mail = (p) => (<Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></Svg>);
export const Mic = (p) => (<Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>);
export const Bot = (p) => (<Svg {...p}><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 14h.01M15 14h.01M2 13v2M22 13v2" /></Svg>);
export const Clock = (p) => (<Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>);
/* Les deux icônes de chrome de l'aperçu de plateforme (AppPeek) : elles ne
   servent qu'à meubler une barre d'outils, elles ne commandent rien. */
export const Search = (p) => (<Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>);
export const FileText = (p) => (<Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Svg>);
export const Link = (p) => (<Svg {...p}><path d="M10 13a4 4 0 0 0 5.7.4l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.4 1.4" /><path d="M14 11a4 4 0 0 0-5.7-.4l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.4-1.4" /></Svg>);
export const Bell = (p) => (<Svg {...p}><path d="M18 16H6l1.2-2V11a4.8 4.8 0 0 1 9.6 0v3z" /><path d="M10.5 19h3" /></Svg>);

/* ── Bénéfices ───────────────────────────────────────────────────────────── */

/** Éclair : « prêt en secondes, pas en jours ». */
export const Bolt = (p) => (<Svg {...p}><path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12z" /></Svg>);

/** Lecture : la simulation qui se joue. */
export const Play = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M10.5 9.5l4.5 2.5-4.5 2.5z" />
  </Svg>
);

/** Étincelle : l'IA. Deux tailles d'étoile — une grande, une petite — parce
 *  qu'une seule étoile centrée fait « décoratif » et deux font « génération ». */
export const Sparkle = (p) => (
  <Svg {...p}>
    <path d="M11 3l1.6 4.6L17 9.2l-4.4 1.6L11 15.4 9.4 10.8 5 9.2l4.4-1.6z" />
    <path d="M18 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Svg>
);

/** Immeuble : aux couleurs de votre entreprise. */
export const Building = (p) => (
  <Svg {...p}>
    <path d="M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15M15 11h3a2 2 0 0 1 2 2v8M2 21h20" />
    <path d="M8 8h3M8 12h3M8 16h3" />
  </Svg>
);

/** Bulle : chaque candidat reçoit une réponse. */
export const Message = (p) => (
  <Svg {...p}>
    <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />
    <path d="M9 11h6M9 14.5h3" />
  </Svg>
);

/** Écusson coché : chaque note a sa preuve. */
export const Shield = (p) => (
  <Svg {...p}>
    <path d="M12 3l7 3v5.5c0 4.3-2.9 7.9-7 9.5-4.1-1.6-7-5.2-7-9.5V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </Svg>
);

/** Table des icônes de bénéfice, désignées par la clé `icon` du dictionnaire.
 *  Une clé inconnue ne rend rien plutôt que de faire tomber la page : une
 *  faute de frappe dans une traduction ne doit pas coûter l'écran entier. */
const BENEFITS = { bolt: Bolt, play: Play, sparkle: Sparkle, building: Building, message: Message, shield: Shield };

export function BenefitIcon({ name, size = 19 }) {
  const Ico = BENEFITS[name];
  return Ico ? <Ico size={size} /> : null;
}

/* ── Gestes ──────────────────────────────────────────────────────────────── */
/* Les quatre icônes de /simulations. Elles ne sont PAS des maquettes : une
   maquette (voir Mocks.js) montre UN exemple concret et détaillé ; un geste
   montre la CAPACITÉ elle-même, en un pictogramme abstrait, pour que le bloc
   se lise comme « on peut écrire » et non comme « voici cet e-mail précis ».
   Même trait que le reste du jeu d'icônes (1.5, bouts arrondis, grille 24). */

/** Écrire : le stylo, pas la lettre qu'il trace. */
export const GestureWrite = (p) => (
  <Svg {...p}><path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" /><path d="M14 6l3 3" /></Svg>
);

/** Parler : réutilise le micro des commandes d'appel — même geste, même icône. */
export const GestureSpeak = Mic;

/** Exécuter : les chevrons du code, pas une ligne de code précise. */
export const GestureRun = (p) => (
  <Svg {...p}><path d="M9 8l-5 4 5 4M15 8l5 4-5 4" /></Svg>
);

/** Consigner : la fiche à lignes, pas les champs d'UNE fiche CRM précise. */
export const GestureFile = (p) => (
  <Svg {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 3v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V3" />
    <path d="M8 11h8M8 15h5" />
  </Svg>
);

const GESTURES = { write: GestureWrite, speak: GestureSpeak, run: GestureRun, file: GestureFile };

/** Table des icônes de geste, désignées par l'identifiant `id` du dictionnaire
 *  (même logique que BenefitIcon : une clé inconnue ne rend rien). */
export function GestureIcon({ name, size = 22 }) {
  const Ico = GESTURES[name];
  return Ico ? <Ico size={size} /> : null;
}
