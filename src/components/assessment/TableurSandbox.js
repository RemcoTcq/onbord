"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet, ArrowDownToLine, BarChart3, X } from "lucide-react";
import { field, DEFAULT_PRIMARY } from "./candidateUi";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  construireClasseur, evaluateur, formaterValeur, adresse, lettreColonne,
  decalerFormule, cellulesDeBase, estErreur, donneesGraphique, MAX_GRAPHIQUES,
} from "@/lib/tableur";

// ─── Graphique (SVG) ─────────────────────────────────────────────────────────
// Barres groupées ou courbes, une couleur par série : la marque du recruteur
// pour la première, des gris et des tons calmes pour les suivantes.
const LARGEUR_SVG = 640;
const HAUTEUR_SVG = 250;
const MARGES = { haut: 14, droite: 14, bas: 44, gauche: 56 };

function GraphiqueSvg({ donnees, type, primary, localeTag }) {
  const couleurs = [primary, "#94a3b8", "#f59e0b", "#10b981"];
  const toutes = donnees.series.flatMap((s) => s.valeurs).filter((x) => typeof x === "number");
  if (!toutes.length) return null;
  const min = Math.min(0, ...toutes);
  const max = Math.max(0, ...toutes);
  const etendue = max - min || 1;
  const w = LARGEUR_SVG - MARGES.gauche - MARGES.droite;
  const h = HAUTEUR_SVG - MARGES.haut - MARGES.bas;
  const y = (val) => MARGES.haut + h - ((val - min) / etendue) * h;
  const n = donnees.libelles.length;
  const pas = w / Math.max(n, 1);
  const graduations = [0, 1, 2, 3, 4].map((k) => min + (etendue * k) / 4);
  const court = (s) => (s.length > 10 ? `${s.slice(0, 9)}…` : s);

  return (
    <svg viewBox={`0 0 ${LARGEUR_SVG} ${HAUTEUR_SVG}`} style={{ width: "100%", height: "auto", display: "block" }} role="img">
      {graduations.map((g, k) => (
        <g key={k}>
          <line x1={MARGES.gauche} x2={LARGEUR_SVG - MARGES.droite} y1={y(g)} y2={y(g)} stroke={g === 0 ? "#cbd5e1" : "#eef0f3"} />
          <text x={MARGES.gauche - 6} y={y(g) + 4} textAnchor="end" fontSize="10.5" fill="#64748b">{formaterValeur(g, localeTag)}</text>
        </g>
      ))}
      {type === "line"
        ? donnees.series.map((s, k) => {
          const points = s.valeurs.map((val, i) => (typeof val === "number" ? `${MARGES.gauche + pas * i + pas / 2},${y(val)}` : null)).filter(Boolean);
          return (
            <g key={k}>
              <polyline points={points.join(" ")} fill="none" stroke={couleurs[k]} strokeWidth="2.2" />
              {points.map((p, i) => { const [cx, cy] = p.split(","); return <circle key={i} cx={cx} cy={cy} r="3" fill={couleurs[k]} />; })}
            </g>
          );
        })
        : donnees.series.map((s, k) => {
          const largeur = Math.max(2, (pas * 0.72) / donnees.series.length);
          return s.valeurs.map((val, i) => {
            if (typeof val !== "number") return null;
            const x = MARGES.gauche + pas * i + pas * 0.14 + largeur * k;
            return <rect key={`${k}-${i}`} x={x} width={largeur} y={Math.min(y(val), y(0))} height={Math.max(1, Math.abs(y(val) - y(0)))} fill={couleurs[k]} rx="2" />;
          });
        })}
      {donnees.libelles.map((l, i) => (
        <text key={i} x={MARGES.gauche + pas * i + pas / 2} y={HAUTEUR_SVG - MARGES.bas + 16} textAnchor="middle" fontSize="10.5" fill="#475569">{court(l)}</text>
      ))}
      {donnees.series.length > 1 && donnees.series.map((s, k) => (
        <g key={k} transform={`translate(${MARGES.gauche + k * 130}, ${HAUTEUR_SVG - 12})`}>
          <rect width="10" height="10" y="-9" fill={couleurs[k]} rx="2" />
          <text x="14" fontSize="10.5" fill="#475569">{court(s.nom)}</text>
        </g>
      ))}
    </svg>
  );
}

// Sandbox « sheet » — un vrai tableur, pas un tableau à lire.
//
// Le candidat explore les données, pose ses formules (=SOMME, =MOYENNE.SI,
// =RECHERCHEV… en français, en anglais ou en néerlandais), les recopie vers le
// bas, puis rédige sa synthèse. Le moteur de calcul est celui du serveur
// (lib/tableur.js) : le correcteur lit exactement les valeurs affichées ici.
//
// Les gestes d'un tableur sont là parce que leur absence fausserait la mesure :
// sans recopie, un candidat qui sait calculer un taux sur vingt lignes passe
// cinq minutes à taper vingt formules ; sans barre d'état, il ne peut pas
// vérifier d'un coup d'œil le total d'une sélection.

const VIDE = {};
const LARGEUR_NUMEROS = 44;
const HAUTEUR_ENTETE = 26;
const FOND_ENTETE = "#f4f5f7";
const FOND_LIGNE_FIGEE = "#f8fafc";

// Une colonne prend la largeur de ce qu'elle contient — un nom de compte de
// vingt caractères ne doit pas s'afficher « Lumen Re… », et une colonne de
// petits nombres n'a pas à occuper la même place.
// Une formule se mesure à ce qu'elle affiche, pas à son texte.
function largeurColonne(cells, col, nbRows, afficher) {
  let max = 0;
  for (let r = 0; r < nbRows; r++) {
    const brut = cells[adresse(col, r)];
    if (!brut) continue;
    const texte = String(brut).startsWith("=") ? afficher(adresse(col, r)) : String(brut);
    // La ligne d'en-têtes est en gras : un peu plus large par caractère.
    max = Math.max(max, texte.length * (r === 0 ? 1.12 : 1));
  }
  return max ? Math.min(240, Math.max(72, Math.round(max * 7.6 + 26))) : 96;
}

// Un fond surligné, mais OPAQUE : une cellule figée laisse sinon voir le
// contenu qui défile dessous.
const surligne = (primary, fond, alpha = "1F") => `linear-gradient(${primary}${alpha}, ${primary}${alpha}), ${fond}`;
// Après ces caractères, un clic sur une cellule insère sa référence dans la
// formule en cours au lieu de quitter l'édition — comme dans tout tableur.
const ATTEND_REFERENCE = /[=+\-*/^(;,:&<>]$/;

function Cellule({ a, texte, numerique, erreur, entete, figee, modifiee, active, dansPlage, hors, primary, edition, onMouseDown, onDoubleClick, onEditionChange, onEditionKey, onEditionBlur }) {
  const fond = figee ? FOND_LIGNE_FIGEE : hors ? "#fcfcfd" : "#ffffff";
  return (
    <td
      data-addr={a}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      style={{
        // La ligne des en-têtes de données reste visible quand on descend dans
        // le tableau : c'est elle qui dit ce que contient chaque colonne.
        position: figee ? "sticky" : "relative",
        top: figee ? HAUTEUR_ENTETE : undefined,
        zIndex: figee ? 1 : undefined,
        height: 30,
        padding: "0 8px",
        borderRight: "1px solid #eef0f3", borderBottom: figee ? "1px solid var(--border)" : "1px solid #eef0f3",
        background: active || dansPlage ? surligne(primary, fond, "14") : modifiee ? surligne(primary, fond, "0A") : fond,
        boxShadow: active ? `inset 0 0 0 2px ${primary}` : undefined,
        fontWeight: entete ? 700 : 400,
        color: erreur ? "#b91c1c" : "var(--foreground)",
        textAlign: numerique ? "right" : "left",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        cursor: "cell", userSelect: "none",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {edition !== null ? (
        <input
          autoFocus
          value={edition}
          onChange={(e) => onEditionChange(e.target.value)}
          onKeyDown={onEditionKey}
          onBlur={onEditionBlur}
          style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", border: "none",
            outline: `2px solid ${primary}`, padding: "0 8px", font: "inherit", fontWeight: 400,
            background: "#ffffff", color: "var(--foreground)", boxSizing: "border-box",
          }}
        />
      ) : texte}
    </td>
  );
}

export default function TableurSandbox({ sheet, value, onChange, primary = DEFAULT_PRIMARY, compact = false }) {
  const { t, localeTag } = useI18n();
  const edits = value?.edits || VIDE;
  const conclusion = value?.conclusion || "";
  const charts = value?.charts || [];

  const [feuille, setFeuille] = useState(0);
  const [sel, setSel] = useState({ col: 0, row: 1 });
  const [ancre, setAncre] = useState(null);
  // Brouillon de la cellule active : null hors édition. `lieu` dit où l'on
  // tape — dans la cellule ou dans la barre de formule.
  const [edition, setEdition] = useState(null);
  const [lieu, setLieu] = useState("cellule");
  const presse = useRef(null);
  const grilleRef = useRef(null);
  const scrollRef = useRef(null);
  // Un clic sur une cellule pendant une formule insère une référence : le
  // `blur` qui suit ne doit pas valider la formule à moitié écrite.
  const insertionEnCours = useRef(false);

  const classeur = useMemo(() => construireClasseur(sheet, edits), [sheet, edits]);
  const valeur = useMemo(() => evaluateur(classeur), [classeur]);
  const bases = useMemo(() => (sheet?.sheets || []).map(cellulesDeBase), [sheet]);

  const f = classeur[feuille] ? feuille : 0;
  const grille = classeur[f];
  const largeurs = useMemo(
    () => (grille
      ? Array.from({ length: grille.nbCols }, (_, c) => largeurColonne(grille.cells, c, grille.nbRows, (a) => formaterValeur(valeur(f, a), localeTag)))
      : []),
    [grille, valeur, f, localeTag]
  );

  // La cellule active reste visible quand on la déplace au clavier.
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-addr="${adresse(sel.col, sel.row)}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [sel]);

  if (!grille) {
    return <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{t("candidate.sheet.empty")}</p>;
  }

  const brutDe = (col, row) => grille.cells[adresse(col, row)] ?? "";
  const plage = ancre
    ? { c1: Math.min(ancre.col, sel.col), c2: Math.max(ancre.col, sel.col), r1: Math.min(ancre.row, sel.row), r2: Math.max(ancre.row, sel.row) }
    : { c1: sel.col, c2: sel.col, r1: sel.row, r2: sel.row };
  const plageMultiple = plage.c1 !== plage.c2 || plage.r1 !== plage.r2;

  function publier(nouveauxEdits, nouvelleConclusion = conclusion, nouveauxCharts = charts) {
    onChange({ edits: nouveauxEdits, conclusion: nouvelleConclusion, charts: nouveauxCharts });
  }

  // Un graphique naît de la plage sélectionnée — comme dans tout tableur.
  function ajouterGraphique() {
    if (!plageMultiple || charts.length >= MAX_GRAPHIQUES) return;
    publier(edits, conclusion, [...charts, {
      sheet: f,
      range: `${adresse(plage.c1, plage.r1)}:${adresse(plage.c2, plage.r2)}`,
      type: "bar",
      title: "",
    }]);
  }
  const majGraphique = (i, patch) => publier(edits, conclusion, charts.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  const retirerGraphique = (i) => publier(edits, conclusion, charts.filter((_, k) => k !== i));

  // Écrit des cellules de l'onglet courant. Une cellule ramenée à sa valeur
  // d'origine n'est plus une modification : la réponse ne garde que le travail
  // réel du candidat.
  function ecrire(changements) {
    const propres = { ...(edits[f] || {}) };
    for (const { col, row, brut } of changements) {
      const a = adresse(col, row);
      const v = String(brut ?? "");
      if (v === (bases[f]?.[a] ?? "")) delete propres[a];
      else propres[a] = v;
    }
    publier({ ...edits, [f]: propres });
  }

  function deplacer(dCol, dRow, etendre = false) {
    if (etendre && !ancre) setAncre(sel);
    if (!etendre) setAncre(null);
    setSel((s) => ({
      col: Math.max(0, Math.min(grille.nbCols - 1, s.col + dCol)),
      row: Math.max(0, Math.min(grille.nbRows - 1, s.row + dRow)),
    }));
  }

  function commencer(brut, ou = "cellule") {
    setAncre(null);
    setLieu(ou);
    setEdition(brut);
  }

  function valider(dCol = 0, dRow = 0) {
    if (edition === null) return;
    ecrire([{ col: sel.col, row: sel.row, brut: edition }]);
    setEdition(null);
    if (dCol || dRow) deplacer(dCol, dRow);
    grilleRef.current?.focus();
  }

  function annuler() {
    setEdition(null);
    grilleRef.current?.focus();
  }

  function cellulesDeLaPlage() {
    const out = [];
    for (let r = plage.r1; r <= plage.r2; r++) for (let c = plage.c1; c <= plage.c2; c++) out.push({ col: c, row: r });
    return out;
  }

  // Recopie vers le bas. Sur une plage sélectionnée : la première ligne est
  // recopiée sur les suivantes. Sur une seule cellule : jusqu'à la dernière
  // ligne de données — le geste le plus fréquent, ajouter une colonne calculée.
  function recopierVersLeBas() {
    const derniere = plageMultiple ? plage.r2 : Math.max(grille.nbLignesDonnees, sel.row);
    if (derniere <= plage.r1) return;
    const changements = [];
    for (let c = plage.c1; c <= plage.c2; c++) {
      const source = brutDe(c, plage.r1);
      for (let r = plage.r1 + 1; r <= derniere; r++) {
        changements.push({ col: c, row: r, brut: decalerFormule(source, 0, r - plage.r1) });
      }
    }
    ecrire(changements);
  }

  function coller() {
    const p = presse.current;
    if (!p) return;
    const cibles = plageMultiple ? cellulesDeLaPlage() : [sel];
    ecrire(cibles.map(({ col, row }) => ({ col, row, brut: decalerFormule(p.brut, col - p.col, row - p.row) })));
  }

  function surToucheGrille(e) {
    if (edition !== null) return;
    const mod = e.ctrlKey || e.metaKey;
    const touches = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    };
    if (touches[e.key]) { e.preventDefault(); deplacer(...touches[e.key], e.shiftKey); return; }
    if (e.key === "Tab") { e.preventDefault(); deplacer(e.shiftKey ? -1 : 1, 0); return; }
    if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); commencer(brutDe(sel.col, sel.row)); return; }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      ecrire(cellulesDeLaPlage().map((c) => ({ ...c, brut: "" })));
      return;
    }
    if (mod && e.key.toLowerCase() === "c") {
      presse.current = { brut: brutDe(sel.col, sel.row), col: sel.col, row: sel.row };
      return;
    }
    if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); coller(); return; }
    if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); recopierVersLeBas(); return; }
    if (!mod && !e.altKey && e.key.length === 1) { e.preventDefault(); commencer(e.key); }
  }

  function surToucheEdition(e) {
    if (e.key === "Enter") { e.preventDefault(); valider(0, e.shiftKey ? -1 : 1); }
    else if (e.key === "Tab") { e.preventDefault(); valider(e.shiftKey ? -1 : 1, 0); }
    else if (e.key === "Escape") { e.preventDefault(); annuler(); }
  }

  function surBlurEdition() {
    if (insertionEnCours.current) { insertionEnCours.current = false; return; }
    if (edition !== null) {
      ecrire([{ col: sel.col, row: sel.row, brut: edition }]);
      setEdition(null);
    }
  }

  function surClicCellule(e, col, row) {
    if (edition !== null && edition.startsWith("=") && ATTEND_REFERENCE.test(edition)) {
      // Insertion de référence : on garde le focus dans le champ d'édition.
      e.preventDefault();
      insertionEnCours.current = false;
      setEdition((d) => d + adresse(col, row));
      return;
    }
    if (edition !== null) {
      ecrire([{ col: sel.col, row: sel.row, brut: edition }]);
      setEdition(null);
    }
    if (e.shiftKey) {
      if (!ancre) setAncre(sel);
    } else {
      setAncre(null);
    }
    setSel({ col, row });
    // Le focus revient à la grille pour la navigation au clavier.
    setTimeout(() => grilleRef.current?.focus(), 0);
  }

  // Barre d'état : ce qu'un tableur affiche sous toute sélection de nombres.
  let statut = null;
  if (plageMultiple) {
    const nombres = cellulesDeLaPlage().map(({ col, row }) => valeur(f, adresse(col, row))).filter((v) => typeof v === "number");
    if (nombres.length) {
      const somme = nombres.reduce((s, x) => s + x, 0);
      statut = t("candidate.sheet.status", {
        sum: formaterValeur(somme, localeTag),
        average: formaterValeur(somme / nombres.length, localeTag),
        count: nombres.length,
      });
    }
  }

  const colonnes = Array.from({ length: grille.nbCols }, (_, c) => c);
  const lignes = Array.from({ length: grille.nbRows }, (_, r) => r);
  const brutActif = brutDe(sel.col, sel.row);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ border: "1px solid var(--border)", borderTop: `3px solid ${primary}`, borderRadius: 16, overflow: "hidden", background: "#ffffff" }}>
        {/* Barre de titre */}
        <div style={{ background: "#fafafa", padding: "10px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FileSpreadsheet size={16} style={{ color: primary }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sheet?.file_name || t("candidate.sheet.title")}
          </span>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={recopierVersLeBas}
            title={t("candidate.sheet.fillDownHint")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#ffffff", cursor: "pointer", fontFamily: "inherit", color: "var(--foreground)" }}
          >
            <ArrowDownToLine size={13} /> {t("candidate.sheet.fillDown")}
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={ajouterGraphique}
            disabled={!plageMultiple || charts.length >= MAX_GRAPHIQUES}
            title={t("candidate.sheet.chartHint")}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "#ffffff", cursor: plageMultiple && charts.length < MAX_GRAPHIQUES ? "pointer" : "not-allowed", opacity: plageMultiple && charts.length < MAX_GRAPHIQUES ? 1 : 0.5, fontFamily: "inherit", color: "var(--foreground)" }}
          >
            <BarChart3 size={13} /> {t("candidate.sheet.chart")}
          </button>
        </div>

        {/* Barre de formule */}
        <div style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
          <div style={{ width: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)", fontWeight: 600, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
            {plageMultiple ? `${adresse(plage.c1, plage.r1)}:${adresse(plage.c2, plage.r2)}` : adresse(sel.col, sel.row)}
          </div>
          <div style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)", fontStyle: "italic", color: "var(--muted-foreground)" }}>fx</div>
          <input
            value={edition !== null ? edition : brutActif}
            onFocus={() => { if (edition === null) commencer(brutActif, "barre"); else setLieu("barre"); }}
            onChange={(e) => setEdition(e.target.value)}
            onKeyDown={surToucheEdition}
            onBlur={surBlurEdition}
            placeholder={t("candidate.sheet.formulaPlaceholder")}
            style={{ flex: 1, minWidth: 0, border: "none", outline: "none", padding: "8px 10px", font: "inherit", fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace", fontSize: 12.5, background: "#ffffff", color: "var(--foreground)" }}
          />
        </div>

        {/* Grille */}
        <div
          ref={(el) => { grilleRef.current = el; scrollRef.current = el; }}
          tabIndex={0}
          onKeyDown={surToucheGrille}
          style={{ overflow: "auto", maxHeight: compact ? 340 : 440, outline: "none", fontSize: 13 }}
        >
          {/* Largeur imposée au tableau : sans elle, sur un écran étroit, le
              navigateur écrase les colonnes au lieu de faire défiler la grille. */}
          <table style={{ borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", width: LARGEUR_NUMEROS + largeurs.reduce((s, l) => s + l, 0) }}>
            <colgroup>
              <col style={{ width: LARGEUR_NUMEROS }} />
              {colonnes.map((c) => <col key={c} style={{ width: largeurs[c] }} />)}
            </colgroup>
            <thead>
              <tr>
                <th style={{ position: "sticky", top: 0, left: 0, zIndex: 4, height: HAUTEUR_ENTETE, background: FOND_ENTETE, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }} />
                {colonnes.map((c) => (
                  <th key={c} style={{
                    position: "sticky", top: 0, zIndex: 2, height: HAUTEUR_ENTETE,
                    background: c >= plage.c1 && c <= plage.c2 ? surligne(primary, FOND_ENTETE) : FOND_ENTETE,
                    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                    fontSize: 11.5, fontWeight: 600, color: "var(--muted-foreground)",
                  }}>{lettreColonne(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((r) => (
                <tr key={r}>
                  <th style={{
                    position: "sticky", left: 0,
                    top: r === 0 ? HAUTEUR_ENTETE : undefined,
                    zIndex: r === 0 ? 3 : 2,
                    background: r >= plage.r1 && r <= plage.r2 ? surligne(primary, FOND_ENTETE) : FOND_ENTETE,
                    borderRight: "1px solid var(--border)", borderBottom: "1px solid #eef0f3",
                    fontSize: 11.5, fontWeight: 600, color: "var(--muted-foreground)",
                  }}>{r + 1}</th>
                  {colonnes.map((c) => {
                    const a = adresse(c, r);
                    const v = valeur(f, a);
                    const active = c === sel.col && r === sel.row;
                    return (
                      <Cellule
                        key={c}
                        a={a}
                        texte={formaterValeur(v, localeTag)}
                        numerique={typeof v === "number"}
                        erreur={estErreur(v)}
                        entete={r === 0 && c < grille.nbColonnesDonnees}
                        figee={r === 0}
                        modifiee={Object.prototype.hasOwnProperty.call(edits[f] || {}, a)}
                        active={active}
                        dansPlage={plageMultiple && c >= plage.c1 && c <= plage.c2 && r >= plage.r1 && r <= plage.r2}
                        hors={r > grille.nbLignesDonnees || c >= grille.nbColonnesDonnees}
                        primary={primary}
                        edition={active && edition !== null && lieu === "cellule" ? edition : null}
                        onMouseDown={(e) => surClicCellule(e, c, r)}
                        onDoubleClick={() => commencer(brutDe(c, r))}
                        onEditionChange={setEdition}
                        onEditionKey={surToucheEdition}
                        onEditionBlur={surBlurEdition}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Onglets + barre d'état */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderTop: "1px solid var(--border)", background: "#fafafa", flexWrap: "wrap", minHeight: 36 }}>
          {classeur.map((o, i) => (
            <button key={i} type="button"
              onClick={() => { setEdition(null); setAncre(null); setFeuille(i); setSel({ col: 0, row: 1 }); }}
              style={{
                fontSize: 12, fontWeight: i === f ? 700 : 500, padding: "4px 12px", borderRadius: 6,
                border: i === f ? "1px solid var(--border)" : "1px solid transparent",
                background: i === f ? "#ffffff" : "transparent", color: i === f ? primary : "var(--muted-foreground)",
                cursor: "pointer", fontFamily: "inherit",
              }}>{o.name}</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--muted-foreground)", fontVariantNumeric: "tabular-nums" }}>
            {statut || t("candidate.sheet.hint")}
          </span>
        </div>
      </div>

      {/* Graphiques : relus dans le classeur à chaque rendu, donc toujours à
          jour des formules. */}
      {charts.length > 0 && (
        // auto-fill et non auto-fit : un graphique seul garde une largeur de
        // graphique, au lieu de s'étirer sur toute la page avec des libellés géants.
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "repeat(auto-fill, minmax(420px, 1fr))", gap: 12 }}>
          {charts.map((g, i) => {
            const donnees = donneesGraphique(classeur, valeur, g);
            return (
              <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", background: "#ffffff", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <input value={g.title || ""} onChange={(e) => majGraphique(i, { title: e.target.value })}
                    placeholder={t("candidate.sheet.chartTitle")}
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "transparent", color: "var(--foreground)" }} />
                  {["bar", "line"].map((ty) => (
                    <button key={ty} type="button" onClick={() => majGraphique(i, { type: ty })}
                      style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, border: `1px solid ${g.type === ty ? primary : "var(--border)"}`, background: g.type === ty ? `${primary}12` : "#ffffff", color: g.type === ty ? primary : "var(--muted-foreground)", cursor: "pointer", fontFamily: "inherit" }}>
                      {t(`candidate.sheet.chartTypes.${ty}`)}
                    </button>
                  ))}
                  <button type="button" onClick={() => retirerGraphique(i)} aria-label={t("candidate.sheet.chartRemove")}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "var(--muted-foreground)", display: "flex", padding: 2 }}><X size={14} /></button>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 4 }}>{classeur[g.sheet]?.name} · {g.range}</div>
                {donnees ? <GraphiqueSvg donnees={donnees} type={g.type} primary={primary} localeTag={localeTag} /> : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Le livrable : ce que le candidat conclut de ses calculs. */}
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 6 }}>
          {sheet?.deliverable_label || t("candidate.sheet.conclusion")}
        </label>
        <textarea
          className="nodal-input"
          value={conclusion}
          onChange={(e) => publier(edits, e.target.value)}
          rows={6}
          placeholder={t("candidate.sheet.conclusionPlaceholder")}
          style={{ ...field, minHeight: 140, maxHeight: 420, overflowY: "auto", resize: "vertical" }}
        />
      </div>
    </div>
  );
}
