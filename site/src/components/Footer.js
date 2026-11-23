import Link from "next/link";
import { Logo, FlagEU } from "./Icons";
import { CONTACT_EMAIL } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { demoHref } from "@/lib/contact";

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
      <div className="wrap">
        <div className="footer__grid">
          <div>
            <Link href={`/${locale}`} className="brand">
              <Logo height={21} />
              <span>onbord</span>
            </Link>
            <p className="footer__tag">{f.tagline}</p>
          </div>

          {/* ⚠️ Aligné sur le site actuel le 10/11/2026 (demande directe) :
              les colonnes suivent la barre, Solutions, puis le produit
              (l'accueil et les tarifs), puis les ressources. Simulations
              (#work), Scoring (#proof) et Business roles, qui renvoyaient à
              l'ancien site, sont retirés ; /business-roles n'est plus
              ouverte que par la bulle du hero. */}
          <div>
            <p className="footer__h">{f.solutions}</p>
            <ul className="footer__links">
              <li><Link href={href("/hiring", locale)}>{n.solutionsItems.hiring.title}</Link></li>
              <li><Link href={href("/new-hire-onboarding", locale)}>{n.solutionsItems.onboarding.title}</Link></li>
              <li><Link href={href("/b2b-saas", locale)}>{n.solutionsItems.saas.title}</Link></li>
            </ul>
          </div>

          <div>
            <p className="footer__h">{f.product}</p>
            <ul className="footer__links">
              <li><Link href={`/${locale}#how`}>{n.how}</Link></li>
              <li><Link href={`/${locale}#faq`}>{f.faq}</Link></li>
            </ul>
          </div>

          {/* Les ressources (15/10/2026) : la documentation n'y est pas tant
              qu'elle n'a pas de page. */}
          <div>
            <p className="footer__h">{f.resources}</p>
            <ul className="footer__links">
              <li><Link href={href("/resources", locale)}>{n.resourcesItems.all.title}</Link></li>
              <li><Link href={href("/resources/blog", locale)}>{n.resourcesItems.blog.title}</Link></li>
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
              <li><a href={demoHref(locale)}>{n.demo}</a></li>
              <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} Onbord · {f.rights}</span>
          {/* Où l'on est. Le drapeau européen plutôt que le belge : c'est le
              cadre qui compte pour un prospect (RGPD, hébergement, AI Act). */}
          <span className="footer__place">
            <FlagEU height={11} />
            {f.place}
          </span>
        </div>
      </div>
    </footer>
  );
}
