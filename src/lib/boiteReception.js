// Sandbox « inbox » — la boîte de réception du candidat. Module PUR.
//
// Ce qu'elle mesure : la priorisation et l'organisation, citées dans presque
// toutes les offres et qu'aucun autre format ne voyait. Un énoncé « comment
// prioriseriez-vous… » obtient une réponse de manuel ; une boîte de huit
// messages, dont un urgent noyé sous trois bruyants, montre ce que le candidat
// FAIT quand tout arrive en même temps.
//
// ── Ce qui est stocké ───────────────────────────────────────────────────────
// config.inbox : les messages générés (relus par le recruteur) et, à part, les
// notes de tri — ce qu'un bon professionnel verrait dans cette boîte. Ces notes
// sont la grille du correcteur : elles ne partent JAMAIS chez le candidat
// (sanitizeStepForCandidate).
// meta.inbox : pour chaque message, la priorité, l'action et le texte du
// candidat (réponse, ou consigne de délégation), plus sa note d'organisation.
// Le texte lu par le correcteur est dérivé côté SERVEUR (inboxAnswerToText),
// comme la fiche CRM : le client n'envoie que la donnée structurée.

export const PRIORITES = ["urgent", "today", "week", "none"];
export const ACTIONS = ["reply", "delegate", "schedule", "archive"];
export const CANAUX = ["email", "chat", "ticket", "calendar", "voicemail"];

// Les actions qui n'ont de sens qu'accompagnées d'un texte : une réponse sans
// réponse, une délégation sans consigne, ne traitent rien.
export const ACTIONS_AVEC_TEXTE = new Set(["reply", "delegate"]);

// Libellés des prompts — en français, comme tous les prompts.
const LIBELLE_PRIORITE = { urgent: "Urgent", today: "Aujourd'hui", week: "Cette semaine", none: "Sans suite" };
const LIBELLE_ACTION = { reply: "répondre", delegate: "déléguer", schedule: "planifier", archive: "archiver" };
const LIBELLE_CANAL = { email: "E-mail", chat: "Message interne", ticket: "Ticket", calendar: "Invitation", voicemail: "Message vocal (retranscrit)" };

const net = (v) => String(v ?? "").trim();

/** Le traitement d'un message est-il complet ? */
export function messageTraite(t) {
  if (!t?.priority || !t?.action) return false;
  if (ACTIONS_AVEC_TEXTE.has(t.action) && !net(t.text)) return false;
  return true;
}

/** Tous les messages sont-ils traités ? (bouton « Suivant » du candidat) */
export function boiteTraitee(inbox, answer) {
  const items = inbox?.items || [];
  if (!items.length) return true;
  return items.every((m) => messageTraite(answer?.items?.[m.id]));
}

function enteteMessage(m) {
  const de = [net(m.from), net(m.from_role)].filter(Boolean).join(", ");
  return `${LIBELLE_CANAL[m.channel] || "Message"}${de ? ` de ${de}` : ""}${net(m.subject) ? ` — « ${net(m.subject)} »` : ""}${net(m.received_at) ? ` — reçu ${net(m.received_at)}` : ""}`;
}

/**
 * Le traitement de la boîte, en texte, dans l'ordre de priorité choisi par le
 * candidat. C'est la « réponse » lue par le correcteur et par le recruteur.
 */
export function inboxAnswerToText(inbox, answer) {
  const items = inbox?.items || [];
  const traits = answer?.items || {};
  const rang = (m) => {
    const p = PRIORITES.indexOf(traits[m.id]?.priority);
    return p < 0 ? PRIORITES.length : p;
  };
  const ordonnes = items
    .map((m, i) => ({ m, i }))
    .sort((a, b) => rang(a.m) - rang(b.m) || a.i - b.i);

  const lignes = ["TRAITEMENT DE LA BOÎTE DE RÉCEPTION, dans l'ordre de priorité fixé par le candidat :"];
  for (const { m } of ordonnes) {
    const t = traits[m.id] || {};
    const prio = LIBELLE_PRIORITE[t.priority] || "non classé";
    lignes.push(`[${prio}] ${m.id} — ${enteteMessage(m)}`);
    lignes.push(`  Action : ${LIBELLE_ACTION[t.action] || "aucune"}`);
    const texte = net(t.text);
    if (texte) {
      const etiquette = t.action === "reply" ? "Réponse" : t.action === "delegate" ? "Consigne de délégation" : "Note";
      lignes.push(`  ${etiquette} : ${texte.replace(/\s*\n\s*/g, " / ")}`);
    }
  }
  const plan = net(answer?.plan);
  lignes.push("", "ORGANISATION DE LA JOURNÉE (note du candidat) :", plan || "(aucune note)");
  return lignes.join("\n");
}

/** La boîte telle que le candidat la voit — pour l'assistant et le correcteur. */
export function inboxSceneText(inbox) {
  const items = inbox?.items || [];
  if (!items.length) return "";
  const tete = [net(inbox.owner) && `Boîte de ${net(inbox.owner)}`, net(inbox.now) && `il est ${net(inbox.now)}`].filter(Boolean).join(", ");
  return [
    `${tete || "Boîte de réception"} — ${items.length} messages :`,
    ...items.flatMap((m) => [`[${m.id}] ${enteteMessage(m)}`, `  ${net(m.body).replace(/\s*\n\s*/g, " / ")}`]),
  ].join("\n");
}

/**
 * Ce qu'un bon professionnel voit dans cette boîte — la lecture attendue du
 * tri, pièges compris. Grille du CORRECTEUR, jamais montrée au candidat.
 */
export function inboxBriefing(inbox) {
  const notes = inbox?.triage_notes || [];
  if (!notes.length) return "";
  const lignes = notes.map((n) => {
    const prio = LIBELLE_PRIORITE[n.priority] || net(n.priority) || "—";
    return `    • ${net(n.item) || "?"} — ${prio}${n.trap ? " (PIÈGE)" : ""} : ${net(n.why) || "—"}`;
  });
  return `  Lecture attendue du tri, préparée à la conception (NON communiquée au candidat). C'est un repère, pas un corrigé : un autre ordre se défend s'il est justifié, et le candidat ne connaît de l'entreprise que ce que la boîte lui dit.\n${lignes.join("\n")}`;
}

/**
 * Remet une boîte générée dans une forme exploitable, ou null si elle ne l'est
 * pas : des identifiants uniques, un canal connu, un corps non vide.
 */
export function normaliserBoite(inbox) {
  const vus = new Set();
  const items = (Array.isArray(inbox?.items) ? inbox.items : [])
    .map((m, i) => {
      let id = net(m?.id) || `m${i + 1}`;
      if (vus.has(id)) id = `m${i + 1}_${vus.size}`;
      vus.add(id);
      const body = net(m?.body);
      if (!body) return null;
      return {
        id,
        channel: CANAUX.includes(m?.channel) ? m.channel : "email",
        from: net(m?.from),
        from_role: net(m?.from_role),
        subject: net(m?.subject),
        received_at: net(m?.received_at),
        body,
      };
    })
    .filter(Boolean)
    .slice(0, 12);
  if (items.length < 3) return null;
  const ids = new Set(items.map((m) => m.id));
  return {
    owner: net(inbox?.owner) || null,
    now: net(inbox?.now) || null,
    items,
    triage_notes: (Array.isArray(inbox?.triage_notes) ? inbox.triage_notes : [])
      .filter((n) => ids.has(net(n?.item)))
      .map((n) => ({
        item: net(n.item),
        priority: PRIORITES.includes(n.priority) ? n.priority : null,
        trap: !!n.trap,
        why: net(n.why),
      })),
  };
}
