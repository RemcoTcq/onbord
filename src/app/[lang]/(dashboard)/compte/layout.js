// Paramètres : le titre de l'onglet, puis la barre d'onglets (composant client).
import { titrePage } from "@/lib/i18n/titrePage";
import OngletsCompte from "./OngletsCompte";

export const generateMetadata = titrePage("settings");

export default function AccountLayout({ children }) {
  return <OngletsCompte>{children}</OngletsCompte>;
}
