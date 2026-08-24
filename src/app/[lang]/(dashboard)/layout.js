import DashboardShell from "./DashboardShell";

// Le chargement du dictionnaire et le provider vivent un cran au-dessus, dans
// app/[lang]/layout.js : c'est lui qui porte le segment de langue. Ce layout ne
// garde que l'enveloppe d'interface (session, sidebar, onboarding), restée
// composant client.
export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>;
}
