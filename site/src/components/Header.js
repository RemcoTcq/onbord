"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n/config";
import { href, localiserChemin, canoniserChemin } from "@/lib/i18n/routes";
import { Logo, Globe, Menu, Close, Check, ArrowRight, ChevronDown } from "./Icons";

// Seul composant client du chrome : il lui faut la position de défilement,
// l'état d'un menu, et le chemin courant. Les textes arrivent en props depuis
// le layout serveur — le dictionnaire ne traverse jamais la frontière en entier.

// Les trois premieres entrees sont des ANCRES vers les sections de
// l accueil, pas des pages : /how-it-works, /simulations et /scoring ont ete
// retirees.  vaut donc l identifiant de section, et le lien se
// construit sur la page d accueil de la langue courante.
// Simulations passe AVANT How it works : c'est aussi l'ordre des sections sur
// l'accueil (#work arrive avant #how), donc la barre suit la page qu'elle sert.
// Le menu « Roles » (12/10/2026), sur le modèle d'un menu de secteurs : ce
// qu'Onbord fait passer AUJOURD'HUI, et ce qui arrive. L'état de chacun est
// écrit dans le menu même : un visiteur qui recrute un développeur le sait
// avant d'avoir cliqué.
//
// ⚠️ Depuis le 14/10/2026, la tech n'a PLUS DE PAGE (demande directe) : son
// entrée n'a pas de `path`, elle s'affiche « Soon » et ne se clique pas. Le
// jour où la tech ouvre, on lui redonne un `path` et une page.
const METIERS = [
  { path: "/business-roles", key: "business", etat: "now" },
  { key: "tech", etat: "soon" },
];

// Le menu « Resources » (15/10/2026), sur le modèle de spott.io : le blog,
// les comparaisons, et la documentation « bientôt », sans page donc sans lien.
const RESSOURCES = [
  { path: "/resources", key: "all" },
  { path: "/resources/blog", key: "blog" },
  { path: "/resources/comparisons", key: "comparisons" },
  { key: "docs", etat: "soon" },
];

// Le menu « Product » (15/10/2026, demande directe : « décharger la barre »).
// Simulations, How it works et Scoring étaient trois liens de premier niveau ;
// ce sont des ANCRES vers les sections de l'accueil, pas des pages, d'où
// `ancre` et non `path`.
const PRODUIT = [
  { key: "simulations", ancre: "work" },
  { key: "how", ancre: "how" },
  { key: "scoring", ancre: "proof" },
];

// Les trois menus déroulants de la barre, décrits une fois : leur libellé et
// leurs entrées viennent du dictionnaire (`nav[cle]`, `nav[items]`).
const DEROULANTS = {
  product: { items: "productItems", entrees: PRODUIT, actif: () => false },
  roles: { items: "rolesItems", entrees: METIERS, actif: (c) => METIERS.some((m) => m.path === c) },
  resources: { items: "resourcesItems", entrees: RESSOURCES, actif: (c) => c === "/resources" || c.startsWith("/resources/") },
};

const PAGES = [
  { key: "simulations", ancre: "work" },
  { key: "how", ancre: "how" },
  { key: "scoring", ancre: "proof" },
  { path: "/pricing", key: "pricing" },
];

// L'ordre de la barre : trois menus, puis les tarifs, seul lien direct, en
// dernier comme sur la plupart des sites.
const BARRE = [
  { menu: "product" },
  { menu: "roles" },
  { menu: "resources" },
  { page: PAGES.find((p) => p.key === "pricing") },
];

export default function Header({ locale, nav, demoHref, simulationHref, appHref }) {
  const [stuck, setStuck] = useState(false);
  const [menu, setMenu] = useState(false);
  const [langs, setLangs] = useState(false);
  // Le menu déroulant ouvert : "roles", "resources" ou rien. Un seul à la
  // fois : en ouvrir un ferme l'autre.
  const [deroulant, setDeroulant] = useState(null);
  const langRef = useRef(null);
  const navRef = useRef(null);
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

  // Même fermeture pour les menus déroulants : clic hors du menu ouvert, ou
  // Échap. Le clic sur l'AUTRE déclencheur passe par son propre onClick.
  useEffect(() => {
    if (!deroulant) return;
    const onClick = (e) => {
      const ouvert = navRef.current?.querySelector(`[data-deroulant="${deroulant}"]`);
      if (ouvert && !ouvert.contains(e.target)) setDeroulant(null);
    };
    const onKey = (e) => e.key === "Escape" && setDeroulant(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [deroulant]);

  // Le menu mobile couvre l'écran : laisser la page défiler derrière lui donne
  // l'impression que le site a deux fonds qui glissent l'un sur l'autre.
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);

  const fermer = () => { setMenu(false); setLangs(false); setDeroulant(null); };

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

          <nav className="nav" aria-label="Onbord" ref={navRef}>
            {BARRE.map((b) => b.menu ? (
              <Deroulant
                key={b.menu}
                cle={b.menu}
                nav={nav}
                locale={locale}
                chemin={cheminCanonique}
                ouvert={deroulant === b.menu}
                basculer={() => setDeroulant((v) => (v === b.menu ? null : b.menu))}
                fermer={fermer}
              />
            ) : (
              <Link
                key={b.page.key}
                href={b.page.path ? href(b.page.path, locale) : `/${locale}#${b.page.ancre}`}
                aria-current={b.page.path && cheminCanonique === b.page.path ? "page" : undefined}
              >
                {nav[b.page.key]}
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

            {/* L'appel principal du site (20/10/2026). La démo reste dans le
                hero, la bande finale et le menu mobile. */}
            <a className="btn btn--primary" href={simulationHref}>
              {nav.simulation}
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
          {[["roles", METIERS], ["resources", RESSOURCES.filter((r) => r.key !== "all")]].flatMap(([cle, entrees]) =>
            entrees.map((m) => m.path ? (
              <Link key={cle + m.key} href={href(m.path, locale)} className="mobile__link" onClick={fermer}>
                {nav[DEROULANTS[cle].items][m.key].title}
                <span />
              </Link>
            ) : (
              <div key={cle + m.key} className="mobile__link mobile__link--off" aria-disabled="true">
                {nav[DEROULANTS[cle].items][m.key].title}
                <span>{nav.soon}</span>
              </div>
            ))
          )}
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
            <a className="btn btn--primary btn--block" href={simulationHref} onClick={fermer}>
              {nav.simulation}
              <ArrowRight size={14} />
            </a>
            <a className="btn btn--ghost btn--block" href={demoHref} onClick={fermer}>
              {nav.demo}
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

/** Un menu déroulant de la barre : son déclencheur, et ses entrées avec leur
 *  état. Une entrée sans `path` est inerte et marquée « Soon ». */
function Deroulant({ cle, nav, locale, chemin, ouvert, basculer, fermer }) {
  const d = DEROULANTS[cle];
  return (
    <div className="roles" data-deroulant={cle}>
      <button
        type="button"
        className="nav__trigger"
        aria-expanded={ouvert}
        aria-haspopup="true"
        aria-current={d.actif(chemin) ? "page" : undefined}
        onClick={basculer}
      >
        {nav[cle]}
        <ChevronDown size={13} />
      </button>
      {ouvert && (
        <div className="roles__menu" role="menu">
          {d.entrees.map((m) => {
            const contenu = (
              <>
                <span className="roles__label">
                  {nav[d.items][m.key].title}
                  {m.etat === "soon" && <span className="soon">{nav.soon}</span>}
                </span>
                <span className="roles__desc">{nav[d.items][m.key].desc}</span>
              </>
            );
            // Sans page : une entrée inerte, annoncée comme désactivée.
            if (!m.path && !m.ancre) {
              return (
                <div key={m.key} className="roles__item roles__item--off" role="menuitem" aria-disabled="true">
                  {contenu}
                </div>
              );
            }
            return (
              <Link
                key={m.key}
                href={m.ancre ? `/${locale}#${m.ancre}` : href(m.path, locale)}
                className="roles__item"
                role="menuitem"
                aria-current={m.path && chemin === m.path ? "page" : undefined}
                onClick={fermer}
              >
                {contenu}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
