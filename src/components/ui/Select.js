"use client";

// La liste déroulante de la plateforme (16/11/2026) — à la place du <select>
// natif, dont le menu s'ouvre dans le style du navigateur.
//
// Elle s'utilise EXACTEMENT comme un <select> : mêmes props (value, onChange,
// disabled, className, style, aria-label…), mêmes enfants <option> et
// <optgroup>. `onChange` reçoit un événement de la même forme
// ({ target: { value } }) : remplacer <select> par <Select> suffit.
//
//   <Select className="ds-select" value={x} onChange={(e) => setX(e.target.value)}>
//     <option value="a">A</option>
//   </Select>
//
// En plus : `defaultOpen` (le menu s'ouvre à l'affichage) et `onClose`.
//
// Le menu (classe ds-menu, comme les autres menus de la plateforme) est rendu
// dans le conteneur `.ds` le plus proche, en position fixe : il n'est jamais
// coupé par un tableau ou un panneau qui défile, et s'ouvre vers le haut s'il
// manque de place en bas. Clavier : flèches, Entrée, Échap, Tab, et la
// première lettre d'une option.

import { Children, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

const HAUTEUR_MAX = 300;
const HAUTEUR_OPTION = 36;

/** Les options déclarées en enfants, à plat, avec le libellé de leur groupe. */
function lireOptions(children, groupe = null, out = []) {
  Children.forEach(children, (enfant) => {
    if (!isValidElement(enfant)) return;
    if (enfant.type === "optgroup") {
      lireOptions(enfant.props.children, enfant.props.label, out);
    } else if (enfant.type === "option") {
      const { value, children: libelle, disabled } = enfant.props;
      out.push({
        value: value === undefined ? (typeof libelle === "string" ? libelle : "") : String(value),
        libelle,
        disabled: Boolean(disabled),
        groupe,
      });
    }
  });
  return out;
}

/** Le texte d'un libellé (pour la recherche par première lettre). */
function texteDe(n) {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(texteDe).join("");
  return isValidElement(n) ? texteDe(n.props.children) : "";
}

export default function Select({
  value, defaultValue, onChange, children, disabled = false, className = "", style,
  id, name, title, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby,
  defaultOpen = false, onClose,
}) {
  const options = lireOptions(children);
  const [interne, setInterne] = useState(defaultValue ?? options[0]?.value ?? "");
  const courant = value === undefined ? interne : String(value ?? "");
  const choisie = options.find((o) => o.value === courant) || options[0] || null;

  const [ouvert, setOuvert] = useState(false);
  const [survol, setSurvol] = useState(-1);
  const [position, setPosition] = useState(null);
  const [hote, setHote] = useState(null);
  const bouton = useRef(null);
  const menu = useRef(null);
  const listeId = useId();

  // `onClose` : prévenu à chaque fermeture du menu (choix fait ou non).
  const fermer = useCallback(() => { setOuvert(false); setSurvol(-1); onClose?.(); }, [onClose]);

  const placer = useCallback(() => {
    const r = bouton.current?.getBoundingClientRect();
    if (!r) return;
    const hauteur = Math.min(HAUTEUR_MAX, options.length * HAUTEUR_OPTION + 12);
    const enBas = window.innerHeight - r.bottom - 8;
    const versLeHaut = enBas < hauteur && r.top > enBas;
    // 200 : la largeur minimale d'un .ds-menu. Un bouton plus étroit (un tri
    // compact) aligne le menu sur son bord droit, comme les autres menus.
    const largeur = Math.max(r.width, 200);
    const gauche = Math.min(r.width < largeur ? r.right - largeur : r.left, window.innerWidth - largeur - 8);
    const left = Math.max(8, gauche);
    setPosition({
      left,
      // Au moins la largeur du bouton ; un libellé long élargit le menu, sans
      // sortir de l'écran.
      minWidth: largeur,
      maxWidth: Math.max(largeur, Math.min(380, window.innerWidth - left - 8)),
      ...(versLeHaut ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      maxHeight: Math.max(120, Math.min(HAUTEUR_MAX, (versLeHaut ? r.top : enBas) - 8)),
    });
  }, [options.length]);

  function ouvrir() {
    if (disabled) return;
    setHote(bouton.current?.closest(".ds") || document.body);
    placer();
    setSurvol(Math.max(0, options.findIndex((o) => o.value === choisie?.value)));
    setOuvert(true);
  }

  function choisir(o) {
    if (!o || o.disabled) return;
    if (value === undefined) setInterne(o.value);
    if (o.value !== courant) onChange?.({ target: { value: o.value, name }, currentTarget: { value: o.value, name } });
    fermer();
    bouton.current?.focus();
  }

  // `defaultOpen` : le menu s'ouvre dès l'affichage (un choix qu'on vient de demander).
  useEffect(() => {
    if (!defaultOpen) return;
    bouton.current?.focus();
    ouvrir();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture : clic ailleurs, redimensionnement. Au défilement, le menu suit
  // son bouton ; il ne se ferme que si le bouton sort de l'écran.
  useEffect(() => {
    if (!ouvert) return undefined;
    const dehors = (e) => {
      if (bouton.current?.contains(e.target) || menu.current?.contains(e.target)) return;
      fermer();
    };
    const defile = (e) => {
      if (menu.current?.contains(e.target)) return;
      const r = bouton.current?.getBoundingClientRect();
      if (!r || r.bottom < 0 || r.top > window.innerHeight) fermer();
      else placer();
    };
    document.addEventListener("mousedown", dehors);
    window.addEventListener("scroll", defile, true);
    window.addEventListener("resize", fermer);
    return () => {
      document.removeEventListener("mousedown", dehors);
      window.removeEventListener("scroll", defile, true);
      window.removeEventListener("resize", fermer);
    };
  }, [ouvert, fermer, placer]);

  // L'option survolée reste visible quand on la déplace au clavier.
  useLayoutEffect(() => {
    if (!ouvert || survol < 0) return;
    // Le menu défile seul : scrollIntoView ferait aussi défiler la page, ce
    // qui referme le menu.
    const m = menu.current;
    const el = m?.querySelector(`[data-index="${survol}"]`);
    if (!m || !el) return;
    if (el.offsetTop < m.scrollTop) m.scrollTop = el.offsetTop - 5;
    else if (el.offsetTop + el.offsetHeight > m.scrollTop + m.clientHeight) m.scrollTop = el.offsetTop + el.offsetHeight - m.clientHeight + 5;
  }, [ouvert, survol]);

  function suivante(depart, pas) {
    for (let i = 1; i <= options.length; i++) {
      const j = (depart + pas * i + options.length) % options.length;
      if (!options[j].disabled) return j;
    }
    return depart;
  }

  function clavier(e) {
    if (disabled) return;
    if (!ouvert) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); ouvrir(); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); fermer(); return; }
    if (e.key === "Tab") { fermer(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSurvol((s) => suivante(s < 0 ? -1 : s, 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setSurvol((s) => suivante(s < 0 ? 0 : s, -1)); return; }
    if (e.key === "Home") { e.preventDefault(); setSurvol(suivante(-1, 1)); return; }
    if (e.key === "End") { e.preventDefault(); setSurvol(suivante(0, -1)); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choisir(options[survol]); return; }
    if (e.key.length === 1) {
      const lettre = e.key.toLowerCase();
      const n = options.length;
      for (let i = 1; i <= n; i++) {
        const j = (survol + i) % n;
        if (!options[j].disabled && texteDe(options[j].libelle).trim().toLowerCase().startsWith(lettre)) { setSurvol(j); break; }
      }
    }
  }

  return (
    <>
      <button
        ref={bouton}
        type="button"
        id={id}
        title={title}
        className={`ds-dd ${className}`.trim()}
        style={style}
        disabled={disabled}
        onClick={() => (ouvert ? fermer() : ouvrir())}
        onKeyDown={clavier}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-controls={ouvert ? listeId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-activedescendant={ouvert && survol >= 0 ? `${listeId}-${survol}` : undefined}
        data-open={ouvert || undefined}
      >
        <span className="ds-dd-valeur">{choisie ? choisie.libelle : ""}</span>
        <ChevronDown size={15} strokeWidth={2} className="ds-dd-chevron" aria-hidden="true" />
      </button>
      {name && <input type="hidden" name={name} value={courant} />}
      {ouvert && position && hote && createPortal(
        <div ref={menu} id={listeId} role="listbox" className="ds-menu ds-dd-menu" style={{ position: "fixed", ...position }}>
          {options.map((o, i) => {
            const titreGroupe = o.groupe && o.groupe !== options[i - 1]?.groupe ? o.groupe : null;
            const actif = o.value === choisie?.value;
            return (
              <div key={`${o.value}-${i}`}>
                {titreGroupe && <div className="ds-dd-groupe">{titreGroupe}</div>}
                <div
                  id={`${listeId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={actif}
                  aria-disabled={o.disabled || undefined}
                  className={`ds-menu-item ds-dd-option${actif ? " is-selected" : ""}${survol === i ? " is-active" : ""}`}
                  onMouseEnter={() => !o.disabled && setSurvol(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choisir(o)}
                >
                  <span className="ds-dd-libelle">{o.libelle}</span>
                  {actif && <Check size={14} strokeWidth={2.2} aria-hidden="true" />}
                </div>
              </div>
            );
          })}
        </div>,
        hote,
      )}
    </>
  );
}
