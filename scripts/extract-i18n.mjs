// Inventaire des chaînes traduisibles. Heuristique volontairement large :
// on préfère du bruit à un oubli, le tri se fait à la relecture.
import { readFileSync } from "node:fs";

const FR = /[éèêëàâçûôîïùÉÈÀÇÊÔÎ]/;
const looksHuman = (s) =>
  s.length > 1 && s.length < 400 &&
  (FR.test(s) ||
    /^[A-ZÀ-Ý][a-zà-ÿ]+(\s+[\wà-ÿ'’-]+)+/.test(s) ||
    /^[A-ZÀ-Ý][a-zà-ÿ]{2,}$/.test(s) ||
    // EN-TÊTES EN MAJUSCULES. Les quatre colonnes du tableau des candidats
    // (CANDIDAT, SCORE GLOBAL, STATUT, ACTIONS) sont restées en français
    // jusqu'au 31/08/2026 parce que les deux motifs ci-dessus exigent une
    // minuscule après l'initiale. Le bruit ajouté (CDI, SQL, POST) se trie à
    // la relecture ; un en-tête manqué, non.
    /^[A-ZÀ-Ý][A-ZÀ-Ý0-9 '’-]{2,}$/.test(s));

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

    // Texte JSX SUIVI d'une expression sur la MÊME ligne :
    //     Actifs {activeJobs.length > 0 && <span>({activeJobs.length})</span>}
    //     Corbeille <span …>({deletedJobs.length})</span>
    // La règle « seul sur sa ligne » ci-dessus rejette ces lignes parce
    // qu'elles contiennent { ou <. C'est l'angle mort qui a laissé les onglets
    // de /jobs en français : « Actifs » n'a pas d'accent, donc aucune
    // recherche de texte français ne le rattrapait non plus.
    const coupe = seul.search(/[{<]/);
    if (coupe > 0) {
      const avant = seul.slice(0, coupe).trim();
      // Le préfixe doit être de la PROSE, pas du code : ni ponctuation de
      // syntaxe, ni opérateur. Deux lettres minimum, comme partout ailleurs.
      if (/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'’s.,!?…&:-]*$/.test(avant)
          && /[A-Za-zÀ-ÿ]{2}/.test(avant)
          && !/^(return|const|let|var|if|else|import|export|from|case|default|await|async|function|new|typeof)/.test(avant)) {
        add(avant, n, "jsx-avant-expr");
      }
    }

    // Texte JSX APRÈS une balise, en fin de ligne :
    //     <Trash2 size={14} /> Supprimer
    //     <span>🔒</span> Non visible par le candidat
    // Aucune règle précédente ne les voit : JSX_RE veut « >texte< » sur la
    // même ligne, « seul sur sa ligne » refuse toute balise, et « avant-expr »
    // coupe au premier < — qui est ici en position 0. Motif rencontré quatre
    // fois entre le 23 et le 31/08/2026, signalé par un humain à chaque fois.
    {
      const apres = seul.match(/>[ ]*([^<>{}`"']+)$/);
      if (apres) {
        const texte = apres[1].trim();
        if (/[A-Za-zÀ-ÿ]{2}/.test(texte) && !/[=;:,]$/.test(texte)) {
          add(texte, n, "jsx-apres-balise");
        }
      }
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
