// La page du parcours est un composant client : elle ne peut pas porter de
// config de segment. Ce layout existe uniquement pour poser `maxDuration`, qui
// s'applique aux Server Actions du segment — dont submitRun et le scoreRun
// qu'elle planifie via `after`. Sans ça, le scoring détaché (~30 s) serait
// coupé par le timeout par défaut de la plateforme.
export const maxDuration = 300;

export default function RunLayout({ children }) {
  return children;
}
