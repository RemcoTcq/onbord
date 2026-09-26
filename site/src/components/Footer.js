import Link from "next/link";
import { Logo } from "./Icons";
import { CONTACT_EMAIL } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";

// Composant serveur : aucun état, aucun gestionnaire d'événement, donc aucune
// raison de partir dans le bundle du navigateur.
//
// Les trois chemins légaux sont en anglais dans TOUTES les langues, et ce n'est
// pas un oubli de traduction : l'application les écrit en dur
// (src/lib/constants/legal.js, à la racine du dépôt) dans l'écran de
// consentement du candidat. Les traduire casserait ces liens-là.

export default function Footer({ locale, common }) {
  const f = common.footer;
  const n = common.nav;

  return (
    <footer className="footer">
      <span className="colonnes colonnes--tail" aria-hidden="true" />
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <Link href={`/${locale}`} className="brand">
              <Logo height={21} />
              <span>onbord</span>
            </Link>
            <p className="footer__tag">{f.tagline}</p>
          </div>

          <div>
            <p className="footer__h">{f.product}</p>
            <ul className="footer__links">
              {/* Les trois premières sont des ancres vers l'accueil : leurs
                  pages ont été retirées (voir routes.js). */}
              <li><Link href={`/${locale}#how`}>{n.how}</Link></li>
              <li><Link href={`/${locale}#work`}>{n.simulations}</Link></li>
              <li><Link href={`/${locale}#proof`}>{n.scoring}</Link></li>
              <li><Link href={href("/pricing", locale)}>{n.pricing}</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer__h">{f.legal}</p>
            <ul className="footer__links">
              <li><Link href={`/${locale}/legal/ai-transparency`}>{f.ai}</Link></li>
              <li><Link href={`/${locale}/legal/terms`}>{f.terms}</Link></li>
              <li><Link href={`/${locale}/legal/privacy`}>{f.privacy}</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer__h">{f.contact}</p>
            <ul className="footer__links">
              <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Onbord · {f.rights}</span>
        </div>
      </div>
    </footer>
  );
}
