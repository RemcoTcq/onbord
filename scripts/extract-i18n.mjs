// Inventaire des chaînes traduisibles. Heuristique volontairement large :
// on préfère du bruit à un oubli, le tri se fait à la relecture.
import { readFileSync } from "node:fs";

const FR = /[éèêëàâçûôîïùÉÈÀÇÊÔÎ]/;
const looksHuman = (s) =>
  s.length > 1 && s.length < 400 &&
  (FR.test(s) ||
    /^[A-ZÀ-Ý][a-zà-ÿ]+(\s+[\wà-ÿ'’-]+)+/.test(s) ||
    /^[A-ZÀ-Ý][a-zà-ÿ]{2,}$/.test(s));

const NOISE = /^(use client|use server|server-only|\d+px|#[0-9a-f]{3,8}|var\(|--|https?:|[a-z-]+\/[a-z-]+$)/i;
const CSS_PROP = /^(flex|grid|none|auto|center|bold|solid|hidden|absolute|relative|pointer|inherit|border-box|nowrap|ellipsis|column|row|wrap|block|inline-block|100%|Loader2|Bold)$/i;

const STRING_RE = /"((?:[^"\\]|\\.){2,}?)"|'((?:[^'\\]|\\.){2,}?)'/g;
const JSX_RE = />([^<>{}\n]{2,})</g;
const TPL_RE = /`([^`${}\n]{3,})`/g;

export function extract(file) {
  const src = readFileSync(file, "utf8");
  const out = new Map();
  const add = (s, line, kind) => {
    const v = (s || "").trim();
    if (!v || NOISE.test(v) || CSS_PROP.test(v) || !looksHuman(v)) return;
    if (!out.has(v)) out.set(v, { line, kind });
  };

  src.split("\n").forEach((ln, i) => {
    const n = i + 1;
    if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return; // commentaire : le FR y reste
    for (const m of ln.matchAll(STRING_RE)) add(m[1] ?? m[2], n, "string");
    for (const m of ln.matchAll(JSX_RE)) add(m[1], n, "jsx");
    for (const m of ln.matchAll(TPL_RE)) add(m[1], n, "template");

    // Texte JSX SEUL sur sa ligne — le cas que la première version manquait :
    //     <label …>
    //       Notes internes          ← ni guillemets, ni chevrons sur la ligne
    //     </label>
    // C'est ainsi qu'est écrit tout le texte un peu long du projet, donc c'est
    // loin d'être un cas marginal.
    // Les entités HTML (&apos; &amp; &nbsp;) sont du TEXTE, pas du code : les
    // exclure faisait manquer les phrases les plus longues du projet, qui sont
    // précisément celles qui en contiennent.
    const seul = ln.trim();
    const sansEntites = seul.replace(/&[a-z]+;|&#\d+;/gi, "'");
    if (seul && !/[<>{}=`"]/.test(sansEntites) && !/;\s*$/.test(sansEntites)
        && /[A-Za-zÀ-ÿ]{2}/.test(seul)) {
      add(seul, n, "jsx-seul");
    }
  });
  return out;
}

if (process.argv[2]) {
  let total = 0;
  for (const file of process.argv.slice(2)) {
    const map = extract(file);
    total += map.size;
    console.log(`\n# ${file} — ${map.size}`);
    for (const [s, meta] of map) {
      console.log(`${String(meta.line).padStart(4)}  ${s}`);
    }
  }
  console.log(`\n== TOTAL ${total} ==`);
}
