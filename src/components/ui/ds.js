// Petits utilitaires du design recruteur (classes `ds-*`, cf. app/recruteur.css).
// Rien ici ne touche aux données : ce sont des correspondances valeur → style.

// Pastilles de couleur des jobs, dans l'ordre de la maquette.
const JOB_DOTS = ["#1B45C4", "#4C74E0", "#7FA0F0", "#2E5BD8", "#A9BFF5"];

/**
 * Couleur stable d'un job, tirée de son id : le même job garde la même
 * pastille dans le menu, le tableau de bord et la liste, quel que soit l'ordre.
 */
export function jobDot(id) {
  const s = String(id || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return JOB_DOTS[h % JOB_DOTS.length];
}

/** Ton d'un score sur 100 — mêmes seuils que le rapport candidat (75 / 50). */
export function scoreTone(score) {
  if (score == null) return "wait";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

/** Initiales à partir d'un prénom / nom, ou d'un e-mail à défaut. */
export function initials(first, last, fallback) {
  const i = `${(first || "").trim()[0] || ""}${(last || "").trim()[0] || ""}`;
  if (i) return i.toUpperCase();
  return ((fallback || "?").trim()[0] || "?").toUpperCase();
}

/** Assemble des classes en ignorant les valeurs vides. */
export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

// Statuts candidat qui ont un libellé dans dashboard.candidateStatus.
const STATUTS_TRADUITS = new Set([
  "invited", "in_progress", "interview_completed", "termine", "soumis",
  "scored", "shortlisted", "next_step", "rejected", "disqualified",
]);

/**
 * Libellé d'un statut candidat. Un statut inconnu s'affiche brut : c'est
 * volontaire, il se voit à l'écran plutôt que de disparaître.
 */
export function candidateStatusLabel(t, status) {
  return STATUTS_TRADUITS.has(status) ? t(`dashboard.candidateStatus.${status}`) : status || "—";
}
