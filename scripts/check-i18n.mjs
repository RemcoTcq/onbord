// Contrôle de parité des dictionnaires.
//
// Le français est la source de vérité : toute clé présente en fr/ doit exister
// dans les autres locales du même namespace. Une clé manquante ne casse pas le
// rendu (dictionaries/index.js retombe sur le français), c'est justement le
// problème : le trou passe inaperçu jusqu'à ce qu'un client le signale.
//
//   node scripts/check-i18n.mjs
//
// Sort en code 1 s'il manque quelque chose — utilisable en CI ou en pre-commit.

import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "lib", "i18n", "dictionaries");
const SOURCE = "fr";

// Namespaces volontairement absents d'une locale : l'interface recruteur
// n'existe qu'en FR et EN, un dashboard néerlandais n'est pas au programme.
const EXPECTED_MISSING = { nl: ["dashboard"] };

/** Chemins pointés ("a.b.c") de toutes les feuilles chaîne d'un objet. */
function leafPaths(obj, prefix = "", out = []) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) leafPaths(value, path, out);
    else out.push(path);
  }
  return out;
}

/** Marqueurs {var} d'une chaîne — ils doivent survivre à la traduction. */
function placeholders(str) {
  return typeof str === "string"
    ? [...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    : [];
}

function valueAt(obj, path) {
  return path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), obj);
}

const locales = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const namespaces = readdirSync(join(ROOT, SOURCE))
  .filter((f) => f.endsWith(".js"))
  .map((f) => f.replace(/\.js$/, ""));

let problems = 0;
const report = (msg) => { console.error(msg); problems++; };

for (const ns of namespaces) {
  const sourceMod = await import(pathToFileURL(join(ROOT, SOURCE, `${ns}.js`)).href);
  const sourcePaths = leafPaths(sourceMod.default);

  for (const locale of locales) {
    if (locale === SOURCE) continue;
    const file = join(ROOT, locale, `${ns}.js`);

    if (!existsSync(file)) {
      if (!(EXPECTED_MISSING[locale] || []).includes(ns)) {
        report(`✗ ${locale}/${ns}.js absent`);
      }
      continue;
    }

    const mod = await import(pathToFileURL(file).href);
    const localePaths = new Set(leafPaths(mod.default));

    for (const path of sourcePaths) {
      if (!localePaths.has(path)) {
        report(`✗ ${locale}/${ns} — clé manquante : ${path}`);
        continue;
      }
      // Un {company} perdu à la traduction produit une phrase amputée en prod,
      // sans erreur nulle part. On le rattrape ici.
      const expected = placeholders(valueAt(sourceMod.default, path));
      const actual = placeholders(valueAt(mod.default, path));
      if (expected.join(",") !== actual.join(",")) {
        report(
          `✗ ${locale}/${ns} — variables divergentes sur ${path} : ` +
          `attendu {${expected.join("} {")}}, trouvé {${actual.join("} {")}}`
        );
      }
    }

    for (const path of localePaths) {
      if (!sourcePaths.includes(path)) {
        report(`✗ ${locale}/${ns} — clé orpheline (absente de ${SOURCE}/) : ${path}`);
      }
    }
  }
}

// ─── 2) Contrôle du code source ─────────────────────────────────────────────
// Deux erreurs que le build ne voit PAS, parce qu'elles ne cassent qu'à
// l'exécution ou pas du tout :
//   • un composant qui appelle t() sans avoir écrit `const t = useT()` —
//     ReferenceError au premier rendu, dans un écran candidat ;
//   • une clé appelée qui n'existe dans aucun dictionnaire — la clé brute
//     s'affiche à l'écran (« candidate.run.next ») sans la moindre alerte.

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function jsFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== "i18n") jsFiles(p, out);
    } else if (e.name.endsWith(".js")) out.push(p);
  }
  return out;
}

// Toutes les clés connues, tous namespaces et locales confondus, préfixées du
// namespace comme les composants les appellent : "candidate.run.next".
const knownKeys = new Set();
for (const ns of namespaces) {
  for (const locale of locales) {
    const file = join(ROOT, locale, `${ns}.js`);
    if (!existsSync(file)) continue;
    const mod = await import(pathToFileURL(file).href);
    for (const path of leafPaths(mod.default)) {
      knownKeys.add(`${ns}.${path}`);
      // Les formes plurielles sont appelées sans leur suffixe.
      knownKeys.add(`${ns}.${path}`.replace(/_(one|other)$/, ""));
    }
  }
}

const CALL_RE = /(?:^|[^A-Za-z0-9_.])t\(\s*["'`]([^"'`]+)["'`]/g;

for (const file of jsFiles(SRC)) {
  const src = readFileSync(file, "utf8");
  const calls = [...src.matchAll(CALL_RE)].map((m) => m[1]);
  if (!calls.length) continue;

  const rel = file.slice(SRC.length + 1).replace(/\\/g, "/");

  // `t` doit être en portée DANS CHAQUE FONCTION qui l'appelle, pas seulement
  // quelque part dans le fichier.
  //
  // La première version vérifiait au niveau du fichier : un composant qui
  // appelait t() sans le déclarer passait inaperçu dès lors qu'un AUTRE
  // composant du même fichier, lui, le déclarait. C'est exactement ce qui est
  // arrivé à PipelineVisualEditor, où SortableNodeCard couvrait la faute.
  //
  // On découpe donc sur les déclarations de fonction de premier niveau — ce
  // codebase les écrit toutes en `function X(` ou `export default function X(`,
  // une par composant. Approximation assumée : pas d'analyse syntaxique ici,
  // mais elle attrape le cas réel.
  const blocs = src
    .split(/\n(?=(?:export\s+default\s+)?function\s+\w+\s*\()/)
    .filter((b) => CALL_RE.test(b) && ((CALL_RE.lastIndex = 0), true));

  for (const bloc of blocs) {
    CALL_RE.lastIndex = 0;
    if (!CALL_RE.test(bloc)) continue;

    const nom = bloc.match(/function\s+(\w+)/)?.[1] || "(module)";
    const declare =
      /const\s+t\s*=\s*useT\(\)/.test(bloc) ||
      /const\s*\{[^}]*\bt\b[^}]*\}\s*=\s*useI18n\(\)/.test(bloc) ||
      // `t` reçu en paramètre. Cherché dans TOUT le bloc et pas seulement dans
      // la signature : au niveau module, les helpers du genre
      // `const kindLabel = (t, kind) => …` arrivent après les imports, bien
      // au-delà des premières lignes.
      /function\s+\w+\s*\([^)]*\bt\b[^)]*\)/.test(bloc) ||
      /=\s*\(\s*t\s*[,)]/.test(bloc) ||
      /\(\{[^}]*\bt\b[^}]*\}\)\s*=>/.test(bloc);

    if (!declare) {
      report(`✗ ${rel} — ${nom}() appelle t() sans l'avoir en portée`);
    }
  }

  // `"{t("` : un appel t() enfermé dans une chaîne. Produit par un
  // remplacement automatique quand le texte visé était déjà entre guillemets —
  // dans un attribut JSX (`placeholder="{t(…)}"`) ou dans une expression
  // (`cond ? "a" : "{t(…)}"`). Le second cas est une ERREUR DE SYNTAXE que le
  // build de Turbopack a laissé passer une fois : ce contrôle est le seul
  // filet.
  for (const m of src.matchAll(/(\w+=)?"\{t\(/g)) {
    const ou = m[1] ? `attribut ${m[1].slice(0, -1)}` : "expression";
    report(`✗ ${rel} — ${ou} : t() enfermé dans une chaîne, il manque les accolades`);
  }

  // Variante : `title=t("clé")` — les guillemets de l'attribut ont disparu avec
  // la chaîne remplacée, et il ne reste rien pour ouvrir l'expression JSX.
  for (const m of src.matchAll(/\s(\w+)=t\(/g)) {
    report(`✗ ${rel} — attribut ${m[1]}=t(…) : il manque les accolades JSX`);
  }

  for (const key of new Set(calls)) {
    // Les clés construites dynamiquement (`candidate.crm.sourceKinds.${x}`)
    // sortent du filtre : le littéral s'arrête avant l'interpolation.
    if (key.includes("${")) continue;
    if (!knownKeys.has(key)) report(`✗ ${rel} — clé inconnue des dictionnaires : ${key}`);
  }
}

if (problems === 0) {
  console.log(
    `✓ i18n cohérent — ${locales.length} locales, ${namespaces.length} namespace(s), ` +
    `${knownKeys.size} clés, sources vérifiées`
  );
} else {
  console.error(`\n${problems} problème(s). Corrigez avant de livrer.`);
  process.exit(1);
}
