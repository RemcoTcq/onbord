// Le titre de l'onglet (« … · Onbord ») : la page est un composant client et
// ne peut pas porter de métadonnées elle-même.
import { titrePage } from "@/lib/i18n/titrePage";

export const generateMetadata = titrePage("home");

export default function Layout({ children }) {
  return children;
}
