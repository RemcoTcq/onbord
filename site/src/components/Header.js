"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n/config";
import { href, localiserChemin, canoniserChemin } from "@/lib/i18n/routes";
import { Logo, Globe, Menu, Close, Check, ArrowRight } from "./Icons";

// Seul composant client du chrome : il lui faut la position de défilement,
// l'état d'un menu, et le chemin courant. Les textes arrivent en props depuis
// le layout serveur — le dictionnaire ne traverse jamais la frontière en entier.

// Les trois premieres entrees sont des ANCRES vers les sections de
// l accueil, pas des pages : /how-it-works, /simulations et /scoring ont ete
// retirees.  vaut donc l identifiant de section, et le lien se
// construit sur la page d accueil de la langue courante.
// Simulations passe AVANT How it works : c'est aussi l'ordre des sections sur
// l'accueil (#work arrive avant #how), donc la barre suit la page qu'elle sert.
const PAGES = [
  { key: "simulations", ancre: "work" },
  { key: "how", ancre: "how" },
  { key: "scoring", ancre: "proof" },
  { path: "/pricing", key: "pricing" },
];

export default function Header({ locale, nav, demoHref, appHref }) {
  const [stuck, setStuck] = useState(false);
  const [menu, setMenu] = useState(false);
  const [langs, setLangs] = useState(false);
  const langRef = useRef(null);
  const pathname = usePathname() || `/${locale}`;

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 6);
    onScroll(); // à l'arrivée sur une ancre, la page n'est pas forcément en haut
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fermeture du menu de langue : clic à côté, ou Échap. Sans le second, un
  // utilisateur au clavier reste enfermé dans un menu qu'il ne peut pas fermer.
  useEffect(() => {
    if (!langs) return;
    const onClick = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangs(false);
    };
    const onKey = (e) => e.key === "Escape" && setLangs(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [langs]);

  // Le menu mobile couvre l'écran : laisser la page défiler derrière lui donne
  // l'impression que le site a deux fonds qui glissent l'un sur l'autre.
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);

  const fermer = () => { setMenu(false); setLangs(false); };

  // Le chemin courant, ramené en canonique, sert à deux choses : marquer la
  // page active, et traduire l'URL quand on change de langue. Passer par le
  // canonique est indispensable — /fr/comment-ca-marche et /nl/hoe-het-werkt
  // sont la même page, et seule la forme canonique le sait.
  const segments = pathname.split("/");
  const cheminLocalise = "/" + segments.slice(2).join("/");
  const cheminCanonique = canoniserChemin(cheminLocalise === "/" ? "/" : cheminLocalise, locale);

  /** Le même contenu, dans une autre langue, à l'URL de cette langue-là. */
  const versLocale = (cible) => {
    if (cheminCanonique === "/" || cheminCanonique === "/") return `/${cible}`;
    // Les pages légales ne sont pas traduites : leur chemin traverse tel quel.
    if (cheminCanonique.startsWith("/legal/")) return `/${cible}${cheminCanonique}`;
    return `/${cible}${localiserChemin(cheminCanonique, cible)}`;
  };

  return (
    <>
      <header className={`header${stuck ? " header--stuck" : ""}`}>
        <div className="wrap header__in">
          <Link href={`/${locale}`} className="brand" onClick={fermer}>
            <Logo height={28} />
            <span>onbord</span>
          </Link>

          <nav className="nav" aria-label="Onbord">
            {PAGES.map((p) => (
              <Link
                key={p.key}
                href={p.path ? href(p.path, locale) : `/${locale}#${p.ancre}`}
                aria-current={p.path && cheminCanonique === p.path ? "page" : undefined}
              >
                {nav[p.key]}
              </Link>
            ))}
          </nav>

          <div className="header__right">
            {/* Masque tant qu'une seule langue est publiee : un menu a une
                seule entree n'offre aucun choix. Voir LOCALES. */}
            {LOCALES.length > 1 && (
            <div className="lang" ref={langRef}>
              <button
                type="button"
                className="lang__btn"
                aria-label={`${nav.language} — ${LOCALE_LABELS[locale]}`}
                aria-expanded={langs}
                aria-haspopup="true"
                onClick={() => setLangs((v) => !v)}
              >
                <Globe size={13} />
                {LOCALE_SHORT[locale]}
              </button>

              {langs && (
                <div className="lang__menu" role="menu">
                  {LOCALES.map((l) => (
                    <Link
                      key={l}
                      href={versLocale(l)}
                      className="lang__item"
                      role="menuitem"
                      aria-current={l === locale}
                      onClick={fermer}
                    >
                      <span>{LOCALE_LABELS[l]}</span>
                      {l === locale ? <Check size={13} /> : <span>{LOCALE_SHORT[l]}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            )}

            <a className="btn btn--primary" href={demoHref}>
              {nav.demo}
              <ArrowRight size={14} />
            </a>

            <button
              type="button"
              className="burger"
              aria-label={menu ? nav.closeMenu : nav.openMenu}
              aria-expanded={menu}
              onClick={() => setMenu((v) => !v)}
            >
              {menu ? <Close size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </div>
      </header>

      {menu && (
        <div className="mobile">
          {PAGES.map((p, i) => (
            <Link
              key={p.key}
              href={p.path ? href(p.path, locale) : `/${locale}#${p.ancre}`}
              className="mobile__link"
              onClick={fermer}
            >
              {nav[p.key]}
              <span>{String(i + 1).padStart(2, "0")}</span>
            </Link>
          ))}

          <div className="mobile__actions">
            <a className="btn btn--primary btn--block" href={demoHref} onClick={fermer}>
              {nav.demo}
              <ArrowRight size={14} />
            </a>
            <a className="btn btn--ghost btn--block" href={appHref}>{nav.login}</a>
          </div>

          {LOCALES.length > 1 && (
          <div className="mobile__langs">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={versLocale(l)}
                className="mobile__lang"
                aria-current={l === locale}
                onClick={fermer}
              >
                {LOCALE_LABELS[l]}
              </Link>
            ))}
          </div>
          )}
        </div>
      )}
    </>
  );
}
