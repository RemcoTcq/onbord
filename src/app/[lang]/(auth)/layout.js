import "../../globals.css";

// `.ds` : la page de connexion suit le design recruteur (app/recruteur.css).
export default function AuthLayout({ children }) {
  return (
    <div className="ds ds-auth">
      {children}
    </div>
  );
}
