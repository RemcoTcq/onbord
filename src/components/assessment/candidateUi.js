// Système visuel candidat — RÉFÉRENCE : l'écran d'onboarding
// (CandidateOnboardingFlow). Tous les renderers de l'expérience candidat
// (texte, QCM, choix, vidéo, code, sandbox) réutilisent ces mêmes tokens :
// fond blanc, champs #fafafa (radius 12) avec focus-ring de marque, boutons
// primaires en couleur de marque + texte à contraste (radius 8), titres
// 1.5rem/700, boutons secondaires discrets soulignés. Le branding client est
// une couche par-dessus (couleur `primary`), pas un système à part.

export function getContrastColor(hexColor) {
  if (!hexColor) return "#ffffff";
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export const PAGE_BG = "#ffffff";
export const DEFAULT_PRIMARY = "#0f172a";

// Champ de saisie (input / textarea) — repris de l'onboarding.
export const field = {
  width: "100%",
  padding: "0.875rem 1.25rem",
  fontSize: "1rem",
  lineHeight: 1.6,
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "#fafafa",
  color: "var(--foreground)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

// Conteneur/carte : blanc, bordé, sans ombre lourde (esprit onboarding).
export const container = {
  background: "#ffffff",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "2rem",
  boxSizing: "border-box",
};

export const heading = { fontSize: "1.5rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.3 };
export const subtle = { color: "var(--muted-foreground)" };

export function primaryBtn(primary = DEFAULT_PRIMARY, disabled = false) {
  return {
    background: primary,
    color: getContrastColor(primary),
    border: "none",
    borderRadius: 8,
    padding: "0.875rem 2rem",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "opacity 0.2s",
  };
}

// Bouton "pilule" (démarrer / continuer) — radius 100.
export function pillBtn(primary = DEFAULT_PRIMARY, disabled = false) {
  return { ...primaryBtn(primary, disabled), borderRadius: 100, padding: "0.875rem 2.5rem" };
}

// Bouton secondaire discret (retour / lien).
export const ghostBtn = {
  background: "none",
  border: "none",
  color: "var(--muted-foreground)",
  fontSize: "0.95rem",
  cursor: "pointer",
  textDecoration: "underline",
  padding: "0.5rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

// Option cliquable (QCM / choix) — style champ ; sélectionnée = couleur de marque.
export function optionBtn(primary = DEFAULT_PRIMARY, selected = false) {
  return {
    width: "100%",
    textAlign: "left",
    padding: "0.875rem 1.25rem",
    fontSize: "1rem",
    lineHeight: 1.5,
    borderRadius: 12,
    border: `1px solid ${selected ? primary : "var(--border)"}`,
    background: selected ? primary : "#fafafa",
    color: selected ? getContrastColor(primary) : "var(--foreground)",
    cursor: "pointer",
    fontFamily: "inherit",
    fontWeight: selected ? 600 : 400,
    transition: "border-color .15s, background .15s",
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    wordBreak: "break-word",
  };
}

// CSS injecté (focus-ring de marque sur .nodal-input, accent des checkboxes).
export function focusStyle(primary = DEFAULT_PRIMARY) {
  return `
    .nodal-input:focus { border-color: ${primary} !important; box-shadow: 0 0 0 3px ${primary}20 !important; background: #fff !important; }
    .nodal-checkbox { accent-color: ${primary}; width: 1.25rem; height: 1.25rem; cursor: pointer; }
  `;
}
