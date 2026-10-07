// Sandbox « board » — un tableau de cartes à prioriser. Module PUR.
//
// Un seul composant pour quatre terrains, selon le scénario généré : un
// backlog produit, une roadmap, un plan de projet, une file de tickets. Le
// geste mesuré est le même — arbitrer sous contrainte : ce qui passe
// maintenant, ce qui attend, ce qu'on abandonne, et pourquoi. C'est la règle
// de réutilisation : un environnement générique, un scénario qui change.
//
// ── Ce qui est stocké ───────────────────────────────────────────────────────
// config.board : les cartes (demande, contexte, chiffres), les colonnes où les
// ranger, la contrainte (capacité, budget, délai) et, à part, la lecture
// attendue — grille du CORRECTEUR, jamais envoyée au candidat.
// meta.board : l'ordre des cartes dans chaque colonne, une note par carte,
// et la justification d'ensemble. Le texte lu par le correcteur est dérivé
// côté SERVEUR (boardAnswerToText).

export const MODES = ["backlog", "roadmap", "project", "tickets"];

const net = (v) => String(v ?? "").trim();

/** Remet un tableau généré ou édité dans sa forme stockée, ou null. */
export function normaliserTableau(b) {
  const columns = (Array.isArray(b?.columns) ? b.columns : []).map(net).filter(Boolean).slice(0, 5);
  if (columns.length < 2) return null;
  const vus = new Set();
  const cards = (Array.isArray(b?.cards) ? b.cards : [])
    .map((c, i) => {
      let id = net(c?.id) || `c${i + 1}`;
      if (vus.has(id)) id = `c${i + 1}_${vus.size}`;
      vus.add(id);
      const title = net(c?.title);
      if (!title) return null;
      const meta = c?.meta && typeof c.meta === "object" && !Array.isArray(c.meta)
        ? Object.fromEntries(Object.entries(c.meta).map(([k, v]) => [net(k), net(v)]).filter(([k, v]) => k && v))
        : {};
      return { id, title, body: net(c?.body), meta };
    })
    .filter(Boolean)
    .slice(0, 12);
  if (cards.length < 3) return null;
  const ids = new Set(cards.map((c) => c.id));
  return {
    title: net(b?.title) || null,
    mode: MODES.includes(b?.mode) ? b.mode : "backlog",
    constraint: net(b?.constraint) || null,
    columns,
    cards,
    triage_notes: (Array.isArray(b?.triage_notes) ? b.triage_notes : [])
      .filter((n) => ids.has(net(n?.card)))
      .map((n) => ({ card: net(n.card), column: net(n.column) || null, trap: !!n.trap, why: net(n.why) })),
  };
}

/** Colonne où se trouve une carte dans la réponse, ou -1 si elle reste à classer. */
export function colonneDe(answer, cardId) {
  return (answer?.order || []).findIndex((col) => (col || []).includes(cardId));
}

/** Toutes les cartes classées, et la justification écrite ? */
export function tableauTraite(board, answer) {
  const cards = board?.cards || [];
  if (!cards.length) return true;
  return cards.every((c) => colonneDe(answer, c.id) >= 0) && !!net(answer?.justification);
}

/**
 * Remet une réponse reçue du navigateur dans une forme sûre : uniquement des
 * cartes qui existent, chacune dans une seule colonne.
 */
export function assainirReponseTableau(board, brut) {
  const ids = new Set((board?.cards || []).map((c) => c.id));
  const places = new Set();
  const order = (board?.columns || []).map((_, i) => {
    const col = Array.isArray(brut?.order?.[i]) ? brut.order[i] : [];
    return col.filter((id) => ids.has(id) && !places.has(id) && places.add(id));
  });
  const notes = {};
  for (const [id, n] of Object.entries(brut?.notes || {})) {
    if (ids.has(id) && net(n)) notes[id] = String(n).slice(0, 1500);
  }
  return { order, notes, justification: String(brut?.justification || "").slice(0, 6000) };
}

function ligneCarte(c) {
  const meta = Object.entries(c.meta || {}).map(([k, v]) => `${k} : ${v}`).join(" ; ");
  return `[${c.id}] ${c.title}${meta ? ` (${meta})` : ""}`;
}

/** Le classement du candidat, en texte — la « réponse » du correcteur et du recruteur. */
export function boardAnswerToText(board, answer) {
  const cards = new Map((board?.cards || []).map((c) => [c.id, c]));
  const lignes = ["CLASSEMENT DU CANDIDAT, colonne par colonne, dans l'ordre qu'il a fixé :"];
  (board?.columns || []).forEach((nom, i) => {
    const ids = answer?.order?.[i] || [];
    lignes.push(`Colonne « ${nom} » :${ids.length ? "" : " (vide)"}`);
    ids.forEach((id, k) => {
      const c = cards.get(id);
      if (!c) return;
      const note = net(answer?.notes?.[id]);
      lignes.push(`  ${k + 1}. ${ligneCarte(c)}${note ? `\n     Note du candidat : ${note.replace(/\s*\n\s*/g, " / ")}` : ""}`);
    });
  });
  const restantes = (board?.cards || []).filter((c) => colonneDe(answer, c.id) < 0);
  if (restantes.length) lignes.push(`Cartes laissées sans classement : ${restantes.map((c) => `[${c.id}] ${c.title}`).join(" ; ")}`);
  lignes.push("", "JUSTIFICATION DU CANDIDAT :", net(answer?.justification) || "(aucune)");
  return lignes.join("\n");
}

/** Le tableau tel que le candidat le voit — pour l'assistant et le correcteur. */
export function boardSceneText(board) {
  if (!board?.cards?.length) return "";
  return [
    `${board.title || "Tableau"} — colonnes : ${(board.columns || []).join(" | ")}`,
    board.constraint ? `Contrainte : ${board.constraint}` : null,
    ...board.cards.map((c) => `${ligneCarte(c)}${c.body ? `\n  ${c.body.replace(/\s*\n\s*/g, " / ")}` : ""}`),
  ].filter(Boolean).join("\n");
}

/** La lecture attendue du classement — grille du CORRECTEUR, jamais montrée au candidat. */
export function boardBriefing(board) {
  const notes = board?.triage_notes || [];
  if (!notes.length) return "";
  return `  Lecture attendue du classement, préparée à la conception (NON communiquée au candidat). C'est un repère, pas un corrigé : un autre arbitrage se crédite s'il tient compte de la contrainte et qu'il est justifié.\n${notes.map((n) => `    • ${n.card} → ${n.column || "—"}${n.trap ? " (PIÈGE)" : ""} : ${n.why || "—"}`).join("\n")}`;
}
