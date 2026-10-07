// Sandbox « sheet » — le tableur du candidat. Module PUR.
//
// Importé des deux côtés : par le navigateur (la grille calcule en direct ce que
// le candidat tape) et par le serveur (saveStepResponse dérive le texte lu par
// le correcteur, runScoring y ajoute des repères calculés). Une seule
// implémentation des formules : le correcteur lit EXACTEMENT les valeurs que le
// candidat avait sous les yeux.
//
// ── Pourquoi un moteur maison ───────────────────────────────────────────────
// Analyser des chiffres se prouve en calculant, pas en décrivant un calcul.
// Un tableau en lecture seule laissait le candidat sommer de tête ou sur son
// propre tableur, hors de notre vue — on ne voyait ni sa démarche ni ses
// erreurs. Les bibliothèques de tableur sérieuses sont sous licence GPL ou
// commerciale ; ce qu'un exercice de présélection demande (références, plages,
// une vingtaine de fonctions courantes) tient ici, sans dépendance.
//
// ── Ce qui est stocké ───────────────────────────────────────────────────────
// Le jeu de données vit dans config.sheet (généré, relu par le recruteur). La
// réponse du candidat ne stocke que ses MODIFICATIONS, cellule par cellule
// (meta.sheet.edits), plus sa synthèse écrite. Le classeur affiché est toujours
// recalculé : données d'origine + modifications.

export const COLONNES_LIBRES = 4;   // colonnes vides offertes à droite des données
export const LIGNES_LIBRES = 8;     // lignes vides offertes sous les données
export const MAX_COLONNES = 26;
export const MAX_LIGNES = 200;

// ─── Adresses ─────────────────────────────────────────────────────────────────

/** 0 → A, 25 → Z, 26 → AA. */
export function lettreColonne(i) {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function indexColonne(lettres) {
  let n = 0;
  for (const ch of String(lettres).toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Colonne et ligne À PARTIR DE 0 → « B3 ». */
export function adresse(col, row) {
  return `${lettreColonne(col)}${row + 1}`;
}

export function lireAdresse(a) {
  const m = /^\$?([A-Za-z]{1,2})\$?(\d{1,4})$/.exec(String(a || "").trim());
  if (!m) return null;
  return { col: indexColonne(m[1]), row: Number(m[2]) - 1 };
}

// ─── Classeur ─────────────────────────────────────────────────────────────────

function valeurBrute(v) {
  if (v === null || v === undefined) return "";
  return typeof v === "number" ? String(v) : String(v);
}

/** Les cellules d'un onglet généré : en-têtes en ligne 1, données dessous. */
export function cellulesDeBase(onglet) {
  const cells = {};
  (onglet?.columns || []).forEach((h, c) => {
    const brut = valeurBrute(h);
    if (brut !== "") cells[adresse(c, 0)] = brut;
  });
  (onglet?.rows || []).forEach((ligne, r) => {
    (ligne || []).forEach((v, c) => {
      const brut = valeurBrute(v);
      if (brut !== "") cells[adresse(c, r + 1)] = brut;
    });
  });
  return cells;
}

/**
 * Le classeur tel que le candidat le voit : données d'origine, puis ses
 * modifications par-dessus. Une modification vide EFFACE la cellule d'origine.
 *
 * @param {object} sheetConfig config.sheet de l'étape
 * @param {object} edits meta.sheet.edits — { "0": { "E2": "=C2*D2" } }
 */
export function construireClasseur(sheetConfig, edits) {
  return (sheetConfig?.sheets || []).map((onglet, i) => {
    const cells = cellulesDeBase(onglet);
    const propres = edits?.[i] || edits?.[String(i)] || {};
    let maxCol = Math.max((onglet?.columns || []).length - 1, ...(onglet?.rows || []).map((l) => (l || []).length - 1), 0);
    let maxRow = (onglet?.rows || []).length;
    for (const [a, brut] of Object.entries(propres)) {
      const pos = lireAdresse(a);
      if (!pos || pos.col >= MAX_COLONNES || pos.row >= MAX_LIGNES) continue;
      if (brut === "" || brut === null || brut === undefined) delete cells[a];
      else cells[a] = String(brut);
      maxCol = Math.max(maxCol, pos.col);
      maxRow = Math.max(maxRow, pos.row);
    }
    return {
      name: String(onglet?.name || `Feuille${i + 1}`),
      cells,
      nbCols: Math.min(MAX_COLONNES, maxCol + 1 + COLONNES_LIBRES),
      nbRows: Math.min(MAX_LIGNES, maxRow + 1 + LIGNES_LIBRES),
      // Nombre de lignes de données d'origine (sans l'en-tête) : la grille les
      // distingue des lignes ajoutées par le candidat.
      nbLignesDonnees: (onglet?.rows || []).length,
      nbColonnesDonnees: (onglet?.columns || []).length,
    };
  });
}

// ─── Erreurs et coercitions ───────────────────────────────────────────────────

const err = (code) => ({ erreur: code });
export const estErreur = (v) => !!v && typeof v === "object" && "erreur" in v;
const estPlage = (v) => !!v && typeof v === "object" && Array.isArray(v.plage);

// « 12,5 », « 1 250 », « 12 % » : ce qu'un candidat tape dans une cellule de
// données est un nombre, même écrit à la française.
export function lireNombre(texte) {
  if (typeof texte === "number") return Number.isFinite(texte) ? texte : null;
  let s = String(texte ?? "").trim();
  if (!s) return null;
  const pourcent = s.endsWith("%");
  if (pourcent) s = s.slice(0, -1).trim();
  s = s.replace(/[\s  ]/g, "");
  if (/^-?\d+,\d+$/.test(s)) s = s.replace(",", ".");
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return pourcent ? n / 100 : n;
}

function versNombre(v) {
  if (estErreur(v)) return v;
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = lireNombre(v);
  return n === null ? err("#VALUE!") : n;
}

function versTexte(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(Math.round(v * 1e10) / 1e10);
  return String(v);
}

function versBooleen(v) {
  if (estErreur(v)) return v;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v ?? "").trim().toUpperCase();
  if (["TRUE", "VRAI", "WAAR"].includes(s)) return true;
  if (["FALSE", "FAUX", "ONWAAR", ""].includes(s)) return false;
  const n = lireNombre(s);
  return n === null ? err("#VALUE!") : n !== 0;
}

// ─── Analyse lexicale ─────────────────────────────────────────────────────────

const OPERATEURS = ["<=", ">=", "<>", "<", ">", "=", "+", "-", "*", "/", "^", "&", "%"];

function decouper(formule) {
  const jetons = [];
  let i = 0;
  const s = formule;
  // Notation française : « ; » sépare les arguments, donc « , » est la virgule
  // décimale — SI(A1>0,05;…). Une formule sans « ; » suit la notation anglaise,
  // où « , » sépare les arguments.
  const virguleDecimale = s.split("\"").some((m, k) => k % 2 === 0 && m.includes(";"));
  while (i < s.length) {
    const reste = s.slice(i);
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }

    if (ch === "\"") {
      let j = i + 1;
      let v = "";
      while (j < s.length) {
        if (s[j] === "\"" && s[j + 1] === "\"") { v += "\""; j += 2; continue; }
        if (s[j] === "\"") break;
        v += s[j++];
      }
      if (j >= s.length) throw new Error("#ERROR!");
      jetons.push({ t: "str", v });
      i = j + 1;
      continue;
    }

    let m = (virguleDecimale ? /^(\d+(?:[.,]\d+)?|[.,]\d+)(e-?\d+)?/i : /^(\d+\.?\d*|\.\d+)(e-?\d+)?/i).exec(reste);
    if (m) { jetons.push({ t: "num", v: Number(m[0].replace(",", ".")) }); i += m[0].length; continue; }

    // Préfixe d'onglet : 'Ventes T3'!A1 ou Ventes!A1
    let feuille = null;
    m = /^'([^']+)'!/.exec(reste) || /^([A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_.]*)!/.exec(reste);
    if (m) { feuille = m[1]; i += m[0].length; }
    const apres = s.slice(i);

    // Plage de colonnes entières : B:B
    m = /^\$?([A-Za-z]{1,2}):\$?([A-Za-z]{1,2})(?![A-Za-z0-9(])/.exec(apres);
    if (m) {
      jetons.push({ t: "range", feuille, c1: indexColonne(m[1]), r1: null, c2: indexColonne(m[2]), r2: null });
      i += m[0].length;
      continue;
    }
    m = /^\$?([A-Za-z]{1,2})\$?(\d{1,4})(?::\$?([A-Za-z]{1,2})\$?(\d{1,4}))?(?![A-Za-z0-9_(])/.exec(apres);
    if (m) {
      const c1 = indexColonne(m[1]);
      const r1 = Number(m[2]) - 1;
      if (m[3]) jetons.push({ t: "range", feuille, c1, r1, c2: indexColonne(m[3]), r2: Number(m[4]) - 1 });
      else jetons.push({ t: "ref", feuille, col: c1, row: r1 });
      i += m[0].length;
      continue;
    }
    if (feuille) throw new Error("#REF!");

    m = /^([A-Za-z][A-Za-z0-9._]*)\s*\(/.exec(reste);
    if (m) { jetons.push({ t: "fn", nom: m[1].toUpperCase() }); i += m[0].length; continue; }

    m = /^(TRUE|FALSE|VRAI|FAUX|WAAR|ONWAAR)(?![A-Za-z0-9_])/i.exec(reste);
    if (m) { jetons.push({ t: "bool", v: ["TRUE", "VRAI", "WAAR"].includes(m[1].toUpperCase()) }); i += m[0].length; continue; }

    const op = OPERATEURS.find((o) => reste.startsWith(o));
    if (op) { jetons.push({ t: "op", v: op }); i += op.length; continue; }
    if (ch === "(" || ch === ")") { jetons.push({ t: ch }); i++; continue; }
    // Le séparateur d'arguments est « ; » dans un tableur francophone, « , »
    // dans un tableur anglophone : les deux sont acceptés.
    if (ch === "," || ch === ";") { jetons.push({ t: "sep" }); i++; continue; }
    throw new Error("#NAME?");
  }
  return jetons;
}

// ─── Analyse syntaxique ───────────────────────────────────────────────────────

function analyser(formule) {
  const jetons = decouper(formule);
  let p = 0;
  const voir = () => jetons[p];
  const prendre = () => jetons[p++];
  const estOp = (...ops) => voir()?.t === "op" && ops.includes(voir().v);

  function comparaison() {
    let g = concat();
    while (estOp("=", "<>", "<", ">", "<=", ">=")) {
      const op = prendre().v;
      g = { k: "bin", op, a: g, b: concat() };
    }
    return g;
  }
  function concat() {
    let g = additif();
    while (estOp("&")) { prendre(); g = { k: "bin", op: "&", a: g, b: additif() }; }
    return g;
  }
  function additif() {
    let g = multiplicatif();
    while (estOp("+", "-")) { const op = prendre().v; g = { k: "bin", op, a: g, b: multiplicatif() }; }
    return g;
  }
  function multiplicatif() {
    let g = puissance();
    while (estOp("*", "/")) { const op = prendre().v; g = { k: "bin", op, a: g, b: puissance() }; }
    return g;
  }
  function puissance() {
    let g = unaire();
    while (estOp("^")) { prendre(); g = { k: "bin", op: "^", a: g, b: unaire() }; }
    return g;
  }
  function unaire() {
    if (estOp("-")) { prendre(); return { k: "neg", a: unaire() }; }
    if (estOp("+")) { prendre(); return unaire(); }
    return suffixe();
  }
  function suffixe() {
    let g = primaire();
    while (estOp("%")) { prendre(); g = { k: "pct", a: g }; }
    return g;
  }
  function primaire() {
    const j = prendre();
    if (!j) throw new Error("#ERROR!");
    if (j.t === "num") return { k: "num", v: j.v };
    if (j.t === "str") return { k: "str", v: j.v };
    if (j.t === "bool") return { k: "bool", v: j.v };
    if (j.t === "ref") return { k: "ref", feuille: j.feuille, col: j.col, row: j.row };
    if (j.t === "range") return { k: "range", ...j };
    if (j.t === "(") {
      const e = comparaison();
      if (prendre()?.t !== ")") throw new Error("#ERROR!");
      return e;
    }
    if (j.t === "fn") {
      const args = [];
      if (voir()?.t === ")") { prendre(); return { k: "fn", nom: j.nom, args }; }
      for (;;) {
        // Argument vide (« SI(A1>0;;1) ») : vaut vide.
        if (voir()?.t === "sep" || voir()?.t === ")") args.push({ k: "vide" });
        else args.push(comparaison());
        const suivant = prendre();
        if (suivant?.t === ")") break;
        if (suivant?.t !== "sep") throw new Error("#ERROR!");
      }
      return { k: "fn", nom: j.nom, args };
    }
    throw new Error("#ERROR!");
  }

  const arbre = comparaison();
  if (p < jetons.length) throw new Error("#ERROR!");
  return arbre;
}

// ─── Fonctions ────────────────────────────────────────────────────────────────

// Noms français et néerlandais : un candidat belge tape la fonction dans la
// langue de son tableur habituel. Les noms anglais font foi.
const ALIAS = {
  SOMME: "SUM", SOM: "SUM",
  MOYENNE: "AVERAGE", GEMIDDELDE: "AVERAGE",
  NB: "COUNT", AANTAL: "COUNT",
  NBVAL: "COUNTA", "AANTALARG": "COUNTA",
  "NB.SI": "COUNTIF", "AANTAL.ALS": "COUNTIF",
  "SOMME.SI": "SUMIF", "SOM.ALS": "SUMIF",
  "MOYENNE.SI": "AVERAGEIF", "GEMIDDELDE.ALS": "AVERAGEIF",
  SI: "IF", ALS: "IF",
  SIERREUR: "IFERROR", "ALS.FOUT": "IFERROR",
  ARRONDI: "ROUND", AFRONDEN: "ROUND",
  "ARRONDI.SUP": "ROUNDUP", "AFRONDEN.NAAR.BOVEN": "ROUNDUP",
  "ARRONDI.INF": "ROUNDDOWN", "AFRONDEN.NAAR.BENEDEN": "ROUNDDOWN",
  MEDIANE: "MEDIAN", MEDIAAN: "MEDIAN",
  ET: "AND", EN: "AND",
  OU: "OR", OF: "OR",
  NON: "NOT", NIET: "NOT",
  RECHERCHEV: "VLOOKUP", "VERT.ZOEKEN": "VLOOKUP",
  CONCATENER: "CONCAT", "TEKST.SAMENVOEGEN": "CONCAT", CONCATENATE: "CONCAT",
  NBCAR: "LEN", LENGTE: "LEN",
  RACINE: "SQRT", WORTEL: "SQRT",
  "ECARTYPE": "STDEV", "ECARTYPE.STANDARD": "STDEV", "STDEV.S": "STDEV", STDEVA: "STDEV", STDEV_S: "STDEV",
  "SOMMEPROD": "SUMPRODUCT", "SOMPRODUCT": "SUMPRODUCT",
};

// Toutes les valeurs d'une liste d'arguments, plages déroulées.
function valeursAplaties(args) {
  const out = [];
  for (const a of args) {
    if (estPlage(a)) for (const ligne of a.plage) for (const v of ligne) out.push({ v, dePlage: true });
    else out.push({ v: a, dePlage: false });
  }
  return out;
}

// Dans une plage, seuls les nombres comptent (le texte et le vide sont ignorés,
// comme dans tout tableur). Un argument direct est converti, ou fait erreur.
function nombresDe(args) {
  const out = [];
  for (const { v, dePlage } of valeursAplaties(args)) {
    if (estErreur(v)) return v;
    if (dePlage) {
      if (typeof v === "number") out.push(v);
      continue;
    }
    if (v === "" || v === null || v === undefined) continue;
    const n = versNombre(v);
    if (estErreur(n)) return n;
    out.push(n);
  }
  return out;
}

// Critère de NB.SI / SOMME.SI : « >10 », « <>Nord », « Nord », « N* ».
function critere(c) {
  if (typeof c === "number") return (v) => typeof v === "number" ? v === c : lireNombre(v) === c;
  const s = versTexte(c);
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/s.exec(s);
  const op = m[1] || "=";
  const cible = m[2];
  const nCible = lireNombre(cible);
  const motif = /[*?]/.test(cible)
    ? new RegExp(`^${cible.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i")
    : null;
  return (v) => {
    if (estErreur(v)) return false;
    const nV = typeof v === "number" ? v : lireNombre(v);
    if (nCible !== null && nV !== null) {
      switch (op) {
        case "=": return nV === nCible;
        case "<>": return nV !== nCible;
        case "<": return nV < nCible;
        case ">": return nV > nCible;
        case "<=": return nV <= nCible;
        case ">=": return nV >= nCible;
      }
    }
    const texte = versTexte(v).toLowerCase();
    const ciblet = cible.toLowerCase();
    if (op === "=") return motif ? motif.test(versTexte(v)) : texte === ciblet;
    if (op === "<>") return motif ? !motif.test(versTexte(v)) : texte !== ciblet;
    if (nCible !== null) return false;
    switch (op) {
      case "<": return texte < ciblet;
      case ">": return texte > ciblet;
      case "<=": return texte <= ciblet;
      case ">=": return texte >= ciblet;
    }
    return false;
  };
}

function arrondir(x, n, mode) {
  const f = 10 ** n;
  const v = x * f;
  // Le décalage corrige 1.005 * 100 = 100.49999… : ARRONDI(1,005;2) vaut 1,01.
  if (mode === "up") return (Math.sign(v) * Math.ceil(Math.abs(v) - 1e-9)) / f;
  if (mode === "down") return (Math.sign(v) * Math.floor(Math.abs(v) + 1e-9)) / f;
  return (Math.sign(v) * Math.round(Math.abs(v) + 1e-9)) / f;
}

function appliquerFonction(nom, args, evalArg) {
  const vals = () => args.map(evalArg);
  switch (nom) {
    case "IF": {
      const cond = versBooleen(scalaire(evalArg(args[0])));
      if (estErreur(cond)) return cond;
      const branche = cond ? args[1] : args[2];
      if (!branche) return cond ? true : false;
      return scalaire(evalArg(branche));
    }
    case "IFERROR": {
      const v = scalaire(evalArg(args[0]));
      return estErreur(v) ? scalaire(evalArg(args[1] || { k: "vide" })) : v;
    }
    case "SUM": {
      const n = nombresDe(vals());
      return estErreur(n) ? n : n.reduce((s, x) => s + x, 0);
    }
    case "AVERAGE": {
      const n = nombresDe(vals());
      if (estErreur(n)) return n;
      return n.length ? n.reduce((s, x) => s + x, 0) / n.length : err("#DIV/0!");
    }
    case "MIN": case "MAX": {
      const n = nombresDe(vals());
      if (estErreur(n)) return n;
      if (!n.length) return 0;
      return nom === "MIN" ? Math.min(...n) : Math.max(...n);
    }
    case "MEDIAN": {
      const n = nombresDe(vals());
      if (estErreur(n)) return n;
      if (!n.length) return err("#NUM!");
      const t = [...n].sort((a, b) => a - b);
      const m = Math.floor(t.length / 2);
      return t.length % 2 ? t[m] : (t[m - 1] + t[m]) / 2;
    }
    case "STDEV": {
      const n = nombresDe(vals());
      if (estErreur(n)) return n;
      if (n.length < 2) return err("#DIV/0!");
      const moy = n.reduce((s, x) => s + x, 0) / n.length;
      return Math.sqrt(n.reduce((s, x) => s + (x - moy) ** 2, 0) / (n.length - 1));
    }
    case "COUNT": {
      return valeursAplaties(vals()).filter(({ v, dePlage }) => (dePlage ? typeof v === "number" : lireNombre(v) !== null || typeof v === "number")).length;
    }
    case "COUNTA": {
      return valeursAplaties(vals()).filter(({ v }) => v !== "" && v !== null && v !== undefined).length;
    }
    case "COUNTIF": {
      const [plage, c] = vals();
      if (!estPlage(plage)) return err("#VALUE!");
      const test = critere(scalaire(c));
      return plage.plage.flat().filter(test).length;
    }
    case "SUMIF": case "AVERAGEIF": {
      const [plage, c, plageSomme] = vals();
      if (!estPlage(plage)) return err("#VALUE!");
      const cible = estPlage(plageSomme) ? plageSomme : plage;
      const test = critere(scalaire(c));
      const retenus = [];
      plage.plage.forEach((ligne, i) => ligne.forEach((v, j) => {
        if (!test(v)) return;
        const x = cible.plage[i]?.[j];
        if (typeof x === "number") retenus.push(x);
      }));
      if (nom === "SUMIF") return retenus.reduce((s, x) => s + x, 0);
      return retenus.length ? retenus.reduce((s, x) => s + x, 0) / retenus.length : err("#DIV/0!");
    }
    case "SUMPRODUCT": {
      const plages = vals();
      if (!plages.length || !plages.every(estPlage)) return err("#VALUE!");
      const h = plages[0].plage.length;
      const w = plages[0].plage[0]?.length || 0;
      if (!plages.every((p) => p.plage.length === h && (p.plage[0]?.length || 0) === w)) return err("#VALUE!");
      let s = 0;
      for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) {
        s += plages.reduce((prod, p) => prod * (typeof p.plage[i][j] === "number" ? p.plage[i][j] : 0), 1);
      }
      return s;
    }
    case "ROUND": case "ROUNDUP": case "ROUNDDOWN": {
      const [a, b] = vals().map(scalaire);
      const x = versNombre(a);
      const n = b === undefined ? 0 : versNombre(b);
      if (estErreur(x)) return x;
      if (estErreur(n)) return n;
      return arrondir(x, Math.trunc(n), nom === "ROUNDUP" ? "up" : nom === "ROUNDDOWN" ? "down" : "near");
    }
    case "ABS": case "SQRT": {
      const x = versNombre(scalaire(vals()[0]));
      if (estErreur(x)) return x;
      if (nom === "SQRT") return x < 0 ? err("#NUM!") : Math.sqrt(x);
      return Math.abs(x);
    }
    case "AND": case "OR": {
      const bools = [];
      for (const { v } of valeursAplaties(vals())) {
        if (v === "" || v === null || v === undefined) continue;
        const b = versBooleen(v);
        if (estErreur(b)) return b;
        bools.push(b);
      }
      if (!bools.length) return err("#VALUE!");
      return nom === "AND" ? bools.every(Boolean) : bools.some(Boolean);
    }
    case "NOT": {
      const b = versBooleen(scalaire(vals()[0]));
      return estErreur(b) ? b : !b;
    }
    case "CONCAT": {
      const parts = [];
      for (const { v } of valeursAplaties(vals())) {
        if (estErreur(v)) return v;
        parts.push(versTexte(v));
      }
      return parts.join("");
    }
    case "LEN": {
      const v = scalaire(vals()[0]);
      return estErreur(v) ? v : versTexte(v).length;
    }
    case "VLOOKUP": {
      const [cherche, plage, colonne, approx] = vals();
      if (!estPlage(plage)) return err("#VALUE!");
      const c = versNombre(scalaire(colonne));
      if (estErreur(c)) return c;
      const idx = Math.trunc(c) - 1;
      if (idx < 0 || idx >= (plage.plage[0]?.length || 0)) return err("#REF!");
      const valeur = scalaire(cherche);
      const exact = approx !== undefined && versBooleen(scalaire(approx)) === false;
      const egal = (v) => {
        const a = typeof v === "number" ? v : lireNombre(v);
        const b = typeof valeur === "number" ? valeur : lireNombre(valeur);
        if (a !== null && b !== null) return a === b;
        return versTexte(v).toLowerCase() === versTexte(valeur).toLowerCase();
      };
      if (exact) {
        const ligne = plage.plage.find((l) => egal(l[0]));
        return ligne ? (ligne[idx] ?? "") : err("#N/A");
      }
      // Recherche approchée : la dernière ligne dont la clé est ≤ la valeur
      // (la colonne est supposée triée, comme dans tout tableur).
      let trouvee = null;
      for (const l of plage.plage) {
        const a = typeof l[0] === "number" ? l[0] : lireNombre(l[0]);
        const b = typeof valeur === "number" ? valeur : lireNombre(valeur);
        if (a !== null && b !== null ? a <= b : versTexte(l[0]).toLowerCase() <= versTexte(valeur).toLowerCase()) trouvee = l;
        else break;
      }
      return trouvee ? (trouvee[idx] ?? "") : err("#N/A");
    }
    default:
      return err("#NAME?");
  }
}

// Une plage rencontrée là où une valeur unique est attendue : une cellule,
// elle se lit ; plusieurs, c'est une erreur — comme dans tout tableur.
function scalaire(v) {
  if (!estPlage(v)) return v;
  if (v.plage.length === 1 && v.plage[0].length === 1) return v.plage[0][0];
  return err("#VALUE!");
}

// ─── Évaluation du classeur ───────────────────────────────────────────────────

/**
 * Évalue un classeur et renvoie un lecteur de valeurs mémorisé.
 * @param {Array} classeur construireClasseur(...)
 * @returns {(feuille:number, adresse:string) => any}
 */
export function evaluateur(classeur) {
  const cache = new Map();
  const enCours = new Set();
  const formules = new Map();

  function indexFeuille(nom, courante) {
    if (nom === null || nom === undefined) return courante;
    const i = classeur.findIndex((f) => f.name.toLowerCase() === String(nom).toLowerCase());
    return i;
  }

  function valeurCellule(f, col, row) {
    const feuille = classeur[f];
    if (!feuille || col < 0 || row < 0) return err("#REF!");
    const a = adresse(col, row);
    const cle = `${f}!${a}`;
    if (cache.has(cle)) return cache.get(cle);
    if (enCours.has(cle)) return err("#CIRC!");

    const brut = feuille.cells[a];
    let v;
    if (brut === undefined || brut === "") v = "";
    else if (brut.startsWith("=") && brut.length > 1) {
      enCours.add(cle);
      try {
        let arbre = formules.get(brut);
        if (!arbre) { arbre = analyser(brut.slice(1)); formules.set(brut, arbre); }
        v = scalaire(evaluer(arbre, f));
        if (typeof v === "number" && !Number.isFinite(v)) v = err("#NUM!");
      } catch (e) {
        v = err(String(e?.message || "").startsWith("#") ? e.message : "#ERROR!");
      }
      enCours.delete(cle);
    } else {
      const n = lireNombre(brut);
      v = n === null ? brut : n;
    }
    cache.set(cle, v);
    return v;
  }

  function evaluer(n, f) {
    switch (n.k) {
      case "num": return n.v;
      case "str": return n.v;
      case "bool": return n.v;
      case "vide": return "";
      case "ref": {
        const fi = indexFeuille(n.feuille, f);
        if (fi < 0) return err("#REF!");
        return valeurCellule(fi, n.col, n.row);
      }
      case "range": {
        const fi = indexFeuille(n.feuille, f);
        if (fi < 0) return err("#REF!");
        const feuille = classeur[fi];
        const r1 = n.r1 ?? 0;
        const r2 = n.r2 ?? feuille.nbRows - 1;
        const [ca, cb] = [Math.min(n.c1, n.c2), Math.max(n.c1, n.c2)];
        const [ra, rb] = [Math.min(r1, r2), Math.max(r1, r2)];
        if (rb - ra > MAX_LIGNES || cb - ca > MAX_COLONNES) return err("#REF!");
        const plage = [];
        for (let r = ra; r <= rb; r++) {
          const ligne = [];
          for (let c = ca; c <= cb; c++) ligne.push(valeurCellule(fi, c, r));
          plage.push(ligne);
        }
        return { plage };
      }
      case "neg": {
        const x = versNombre(scalaire(evaluer(n.a, f)));
        return estErreur(x) ? x : -x;
      }
      case "pct": {
        const x = versNombre(scalaire(evaluer(n.a, f)));
        return estErreur(x) ? x : x / 100;
      }
      case "bin": {
        const a = scalaire(evaluer(n.a, f));
        const b = scalaire(evaluer(n.b, f));
        if (estErreur(a)) return a;
        if (estErreur(b)) return b;
        if (n.op === "&") return versTexte(a) + versTexte(b);
        if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) {
          const na = typeof a === "number" ? a : (a === "" ? 0 : lireNombre(a));
          const nb = typeof b === "number" ? b : (b === "" ? 0 : lireNombre(b));
          const numerique = (typeof a === "number" || typeof b === "number") && na !== null && nb !== null;
          const x = numerique ? na : versTexte(a).toLowerCase();
          const y = numerique ? nb : versTexte(b).toLowerCase();
          switch (n.op) {
            case "=": return x === y;
            case "<>": return x !== y;
            case "<": return x < y;
            case ">": return x > y;
            case "<=": return x <= y;
            case ">=": return x >= y;
          }
        }
        const x = versNombre(a);
        const y = versNombre(b);
        if (estErreur(x)) return x;
        if (estErreur(y)) return y;
        switch (n.op) {
          case "+": return x + y;
          case "-": return x - y;
          case "*": return x * y;
          case "/": return y === 0 ? err("#DIV/0!") : x / y;
          case "^": return x ** y;
        }
        return err("#ERROR!");
      }
      case "fn": {
        // Les arguments sont évalués par la fonction elle-même : SI n'évalue
        // que la branche retenue, une division par zéro dans l'autre ne
        // remonte pas.
        return appliquerFonction(ALIAS[n.nom] || n.nom, n.args, (a) => evaluer(a, f));
      }
    }
    return err("#ERROR!");
  }

  return (f, a) => {
    const pos = lireAdresse(a);
    if (!pos) return err("#REF!");
    return valeurCellule(f, pos.col, pos.row);
  };
}

// ─── Affichage ────────────────────────────────────────────────────────────────

/** Valeur prête à afficher dans la grille, dans la langue du parcours. */
export function formaterValeur(v, locale = "fr-BE") {
  if (estErreur(v)) return v.erreur;
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: Math.abs(v) < 1 && v !== 0 ? 4 : 2 }).format(v);
    } catch {
      return String(Math.round(v * 100) / 100);
    }
  }
  return String(v);
}

// Valeur pour un PROMPT : sans séparateur de milliers ni virgule décimale, qui
// se confondraient avec les séparateurs de colonnes.
function valeurPourPrompt(v) {
  if (estErreur(v)) return v.erreur;
  if (typeof v === "number") return String(Math.round(v * 10000) / 10000);
  return versTexte(v);
}

// ─── Textes pour le correcteur et l'assistant ────────────────────────────────

// Forme relative d'une formule : « =C2*D2 » en E2 et « =C3*D3 » en E3 sont la
// même formule recopiée. Sert à résumer une colonne tirée vers le bas en une
// ligne, au lieu de vingt.
function formeRelative(brut, col, row) {
  return remplacerReferences(brut, (d1, lettres, d2, chiffres) => {
    const c = d1 ? `C${indexColonne(lettres)}` : `C[${indexColonne(lettres) - col}]`;
    const r = d2 ? `R${Number(chiffres) - 1}` : `R[${Number(chiffres) - 1 - row}]`;
    return `${r}${c}`;
  });
}

// ─── Graphiques ───────────────────────────────────────────────────────────────
// Présenter un constat fait partie de l'analyse : un candidat qui met en
// barres le taux de retour par région montre qu'il sait ce qu'il veut faire
// voir. Un graphique est une plage d'un onglet, un type, un titre — les
// valeurs sont relues dans le classeur, donc toujours à jour de ses formules.

export const TYPES_GRAPHIQUE = ["bar", "line"];
export const MAX_GRAPHIQUES = 3;

/** Les graphiques d'une réponse, réduits à ce qui est valide. */
export function graphiquesValides(charts) {
  return (Array.isArray(charts) ? charts : [])
    .filter((g) => g && TYPES_GRAPHIQUE.includes(g.type) && /^[A-Za-z]{1,2}\d{1,4}:[A-Za-z]{1,2}\d{1,4}$/.test(String(g.range || "")))
    .slice(0, MAX_GRAPHIQUES)
    .map((g) => ({
      sheet: Math.max(0, Math.min(2, Number(g.sheet) || 0)),
      range: String(g.range).toUpperCase(),
      type: g.type,
      title: String(g.title || "").slice(0, 120),
    }));
}

/**
 * Libellés et séries d'un graphique, lus dans le classeur évalué.
 * Convention de tout tableur : si la première colonne est du texte, ce sont
 * les libellés ; si la première ligne est du texte, ce sont les noms de série.
 */
export function donneesGraphique(classeur, valeur, g) {
  const [a, b] = String(g?.range || "").split(":").map(lireAdresse);
  if (!a || !b || !classeur[g.sheet]) return null;
  const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
  let r1 = Math.min(a.row, b.row);
  const r2 = Math.max(a.row, b.row);
  const lire = (c, r) => valeur(g.sheet, adresse(c, r));
  const estTexte = (v) => typeof v === "string" && v !== "" && lireNombre(v) === null;

  const colLibelles = c2 > c1 && Array.from({ length: r2 - r1 + 1 }, (_, k) => lire(c1, r1 + k)).some(estTexte);
  const premiereSerie = colLibelles ? c1 + 1 : c1;
  const enTetes = Array.from({ length: c2 - premiereSerie + 1 }, (_, k) => lire(premiereSerie + k, r1));
  const ligneNoms = enTetes.some(estTexte);
  if (ligneNoms) r1 += 1;
  if (r2 < r1) return null;

  const libelles = Array.from({ length: r2 - r1 + 1 }, (_, k) => (colLibelles ? versTexte(lire(c1, r1 + k)) : String(r1 + k + 1)));
  const series = Array.from({ length: c2 - premiereSerie + 1 }, (_, k) => ({
    nom: ligneNoms ? versTexte(enTetes[k]) : lettreColonne(premiereSerie + k),
    valeurs: Array.from({ length: r2 - r1 + 1 }, (_, i) => {
      const v = lire(premiereSerie + k, r1 + i);
      return typeof v === "number" ? v : null;
    }),
  })).slice(0, 4);
  return { libelles: libelles.slice(0, 40), series: series.map((s) => ({ ...s, valeurs: s.valeurs.slice(0, 40) })) };
}

/**
 * Une formule recopiée ailleurs : ses références relatives suivent, celles
 * marquées « $ » restent. C'est la poignée de recopie de tout tableur — sans
 * elle, calculer un taux sur vingt lignes, c'est taper vingt formules.
 * Une référence qui sortirait de la grille devient #REF!.
 */
export function decalerFormule(brut, dCol, dRow) {
  const s = String(brut ?? "");
  if (!s.startsWith("=")) return s;
  return remplacerReferences(s, (d1, lettres, d2, chiffres) => {
    const col = d1 ? indexColonne(lettres) : indexColonne(lettres) + dCol;
    const row = d2 ? Number(chiffres) - 1 : Number(chiffres) - 1 + dRow;
    if (col < 0 || row < 0 || col >= MAX_COLONNES || row >= MAX_LIGNES) return "#REF!";
    return `${d1}${lettreColonne(col)}${d2}${row + 1}`;
  });
}

// Applique `remplacer` à chaque référence de cellule d'une formule, sans
// toucher au texte entre guillemets ni aux noms d'onglet (« 'Ventes T3'!A1 » :
// T3 est un nom, pas une cellule ; « T3!A1 » non plus).
const RE_REFERENCE = /'[^']*'!|(?<![A-Za-z0-9_.])(\$?)([A-Za-z]{1,2})(\$?)(\d{1,4})(?![A-Za-z0-9_(!])/g;
function remplacerReferences(formule, remplacer) {
  return formule.split("\"").map((morceau, i) => (i % 2
    ? morceau
    : morceau.replace(RE_REFERENCE, (tout, d1, lettres, d2, chiffres) => (
      tout.startsWith("'") ? tout : remplacer(d1, lettres, d2, chiffres)
    ))
  )).join("\"");
}

/**
 * Ce que le candidat a fait dans le tableur, en texte — c'est la « réponse »
 * lue par le correcteur et affichée au recruteur. Les valeurs sont celles que
 * le candidat voyait, calculées par ce même moteur.
 *
 * @param {object} sheetConfig config.sheet
 * @param {object} answer meta.sheet — { edits, conclusion }
 */
export function sheetAnswerToText(sheetConfig, answer) {
  const edits = answer?.edits || {};
  const classeur = construireClasseur(sheetConfig, edits);
  const valeur = evaluateur(classeur);
  const lignes = [];

  classeur.forEach((feuille, f) => {
    const propres = edits[f] || edits[String(f)] || {};
    const adresses = Object.keys(propres).map((a) => ({ a, ...lireAdresse(a) })).filter((x) => x.col !== undefined);
    if (!adresses.length) return;
    adresses.sort((x, y) => x.col - y.col || x.row - y.row);

    const sortie = [];
    let i = 0;
    while (i < adresses.length) {
      const d = adresses[i];
      const brut = String(propres[d.a] ?? "");
      // Une formule recopiée sur au moins trois lignes consécutives : une ligne.
      if (brut.startsWith("=")) {
        const forme = formeRelative(brut, d.col, d.row);
        let j = i + 1;
        while (j < adresses.length) {
          const s = adresses[j];
          const sb = String(propres[s.a] ?? "");
          if (s.col !== d.col || s.row !== adresses[j - 1].row + 1 || !sb.startsWith("=") || formeRelative(sb, s.col, s.row) !== forme) break;
          j++;
        }
        if (j - i >= 3) {
          const fin = adresses[j - 1];
          const apercu = adresses.slice(i, Math.min(j, i + 6)).map((x) => valeurPourPrompt(valeur(f, x.a))).join(" ; ");
          sortie.push(`  ${d.a}:${fin.a} = ${brut} (recopiée sur ${j - i} lignes) → ${apercu}${j - i > 6 ? " ; …" : ""}`);
          i = j;
          continue;
        }
        sortie.push(`  ${d.a} = ${brut} → ${valeurPourPrompt(valeur(f, d.a))}`);
      } else if (brut === "") {
        sortie.push(`  ${d.a} : effacée`);
      } else {
        sortie.push(`  ${d.a} : « ${brut} »`);
      }
      i++;
    }
    const MAX = 60;
    lignes.push(`Onglet « ${feuille.name} » :`);
    lignes.push(...sortie.slice(0, MAX));
    if (sortie.length > MAX) lignes.push(`  … et ${sortie.length - MAX} autres cellules`);
  });

  // Les graphiques : ce qu'ils montrent, en données — le correcteur ne voit
  // pas l'image, il lit ce que le candidat a choisi de mettre en avant.
  const graphiques = graphiquesValides(answer?.charts).map((g) => {
    const d = donneesGraphique(classeur, valeur, g);
    const onglet = classeur[g.sheet]?.name || "?";
    const tete = `  ${g.type === "line" ? "Courbe" : "Barres"}${g.title ? ` « ${g.title} »` : ""} sur ${onglet}!${g.range}`;
    if (!d) return `${tete} (plage vide)`;
    const series = d.series.map((s) => `${s.nom} = ${s.valeurs.map((v) => (v === null ? "—" : valeurPourPrompt(v))).join(" ; ")}`).join(" | ");
    return `${tete}\n    libellés : ${d.libelles.join(" ; ")}\n    ${series}`;
  });

  const conclusion = String(answer?.conclusion || "").trim();
  return [
    lignes.length ? "CALCULS DU CANDIDAT DANS LE TABLEUR (formule → valeur obtenue) :" : "Le candidat n'a rien saisi dans le tableur.",
    ...lignes,
    ...(graphiques.length ? ["", "GRAPHIQUES CONSTRUITS PAR LE CANDIDAT :", ...graphiques] : []),
    "",
    "SYNTHÈSE RÉDIGÉE PAR LE CANDIDAT :",
    conclusion || "(aucune synthèse)",
  ].join("\n");
}

/** Le jeu de données, tel qu'il est remis au candidat — pour l'assistant et le correcteur. */
export function sheetSceneText(sheetConfig) {
  const onglets = sheetConfig?.sheets || [];
  if (!onglets.length) return "";
  const titre = sheetConfig.file_name ? `Fichier « ${sheetConfig.file_name} »` : "Tableur";
  return [
    titre,
    ...onglets.flatMap((o) => {
      const cols = (o.columns || []).map((c, i) => `${lettreColonne(i)}=${c}`).join(" ; ");
      return [
        `Onglet « ${o.name} » — ${(o.rows || []).length} lignes de données (ligne 1 = en-têtes : ${cols})`,
        ...(o.rows || []).map((l, r) => `ligne ${r + 2} : ${(l || []).map(valeurPourPrompt).join(" ; ")}`),
      ];
    }),
  ].join("\n");
}

/**
 * Repères CALCULÉS sur le jeu de données d'origine — jamais montrés au
 * candidat, donnés au correcteur. Un modèle de langage additionne mal vingt
 * lignes de tête : sans ces repères, il validait un total faux s'il était
 * énoncé avec aplomb, et doutait d'un total juste.
 */
export function sheetReperesCalcules(sheetConfig) {
  const lignes = [];
  for (const o of sheetConfig?.sheets || []) {
    const rows = o.rows || [];
    const cols = o.columns || [];
    if (!rows.length) continue;
    const num = (r, c) => (typeof r[c] === "number" ? r[c] : lireNombre(r[c]));
    const numeriques = cols.map((_, c) => rows.filter((r) => num(r, c) !== null).length >= Math.ceil(rows.length * 0.8));
    const fmt = (x) => String(Math.round(x * 100) / 100);

    lignes.push(`Onglet « ${o.name} » :`);
    cols.forEach((nom, c) => {
      if (!numeriques[c]) return;
      const xs = rows.map((r) => num(r, c)).filter((x) => x !== null);
      const somme = xs.reduce((s, x) => s + x, 0);
      lignes.push(`  ${nom} : total ${fmt(somme)}, moyenne ${fmt(somme / xs.length)}, min ${fmt(Math.min(...xs))}, max ${fmt(Math.max(...xs))}`);
    });

    // Ventilation par la première colonne de catégories (texte répété) : c'est
    // presque toujours l'axe d'analyse attendu (région, produit, commercial…).
    const cat = cols.findIndex((_, c) => {
      if (numeriques[c]) return false;
      const distinctes = new Set(rows.map((r) => String(r[c] ?? "")));
      return distinctes.size >= 2 && distinctes.size <= 12 && distinctes.size < rows.length;
    });
    if (cat >= 0) {
      const groupes = new Map();
      for (const r of rows) {
        const k = String(r[cat] ?? "");
        if (!groupes.has(k)) groupes.set(k, []);
        groupes.get(k).push(r);
      }
      lignes.push(`  Par « ${cols[cat]} » :`);
      for (const [k, rs] of groupes) {
        const parts = cols.map((nom, c) => {
          if (!numeriques[c]) return null;
          const xs = rs.map((r) => num(r, c)).filter((x) => x !== null);
          return `${nom} total ${fmt(xs.reduce((s, x) => s + x, 0))}`;
        }).filter(Boolean);
        lignes.push(`    ${k} (${rs.length} ligne${rs.length > 1 ? "s" : ""}) : ${parts.join(", ")}`);
      }
    }
  }
  return lignes.join("\n");
}

/**
 * Remet un tableur généré dans une forme exploitable, ou null s'il ne l'est
 * pas : des lignes de longueur cohérente, des nombres en nombres.
 */
export function normaliserTableur(sheet) {
  const onglets = (Array.isArray(sheet?.sheets) ? sheet.sheets : [])
    .map((o, i) => {
      const columns = (Array.isArray(o?.columns) ? o.columns : []).map((c) => String(c ?? "").trim()).slice(0, MAX_COLONNES - COLONNES_LIBRES);
      if (columns.length < 2) return null;
      const rows = (Array.isArray(o?.rows) ? o.rows : [])
        .filter(Array.isArray)
        .slice(0, 60)
        .map((r) => columns.map((_, c) => {
          const v = r[c];
          if (v === null || v === undefined) return "";
          if (typeof v === "number") return v;
          const n = lireNombre(v);
          // Un code (« 0042 », un numéro de commande) reste du texte.
          return n !== null && !/^0\d/.test(String(v).trim()) ? n : String(v);
        }));
      if (rows.length < 3) return null;
      return { name: String(o?.name || `Feuille${i + 1}`).slice(0, 40), columns, rows };
    })
    .filter(Boolean)
    .slice(0, 3);
  if (!onglets.length) return null;
  return {
    file_name: String(sheet?.file_name || "").trim() || null,
    sheets: onglets,
    analysis_notes: String(sheet?.analysis_notes || "").trim(),
    deliverable_label: String(sheet?.deliverable_label || "").trim() || null,
  };
}
