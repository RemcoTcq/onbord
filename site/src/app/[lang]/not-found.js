import Link from "next/link";
import { ArrowLeft } from "@/components/Icons";

// 404 du site.
//
// Elle est SOUS [lang], donc elle hérite de l'en-tête, du pied de page et de la
// langue : un visiteur perdu garde sa navigation et peut repartir. Le proxy
// renvoie toute URL sans préfixe vers /{langue}/…, si bien qu'une adresse
// inconnue finit toujours ici plutôt que sur l'écran nu de Next.
//
// Le texte reste dans ce fichier plutôt que dans les dictionnaires : Next rend
// ce composant HORS du segment dynamique, il n'a donc pas accès à `params`. Les
// trois langues sont écrites l'une sous l'autre — c'est court, et ça évite un
// chargement de dictionnaire à l'endroit précis où quelque chose a déjà échoué.

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap">
        <p className="eyebrow">404</p>
        <h1 className="display" style={{ maxWidth: "14ch" }}>
          This page <em className="em">does not</em> exist.
        </h1>
        <p className="lede" style={{ marginTop: 24 }}>
          Cette page n&apos;existe pas. · Deze pagina bestaat niet.
        </p>
        <p style={{ marginTop: 32 }}>
          <Link className="btn btn--ghost" href="/">
            <ArrowLeft size={14} />
            Onbord
          </Link>
        </p>
      </div>
    </section>
  );
}
