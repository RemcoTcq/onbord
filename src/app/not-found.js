import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content fade-in">
        <h1 className="not-found-code">404</h1>
        <h2 className="not-found-title">Page introuvable</h2>
        <p className="not-found-message">
          Il semble que la page que vous cherchez n'existe pas ou a été déplacée. 
          Ne vous inquiétez pas, notre IA est déjà sur le coup pour comprendre ce qu'il s'est passé.
        </p>
        
        <div className="not-found-actions">
          <Link href="/" className="btn btn-primary btn-lg">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}


