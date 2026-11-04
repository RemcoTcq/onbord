"use client";

// Éditeurs du CONTENU d'une étape, un par type de mise en situation (scène
// écrite, boîte de réception, personnage). Sortis de la page de relecture de la
// simulation pour être rangés dans l'onglet « Scénario » de la page d'une
// étape. Chacun reçoit la donnée de son type et un onChange : aucun n'écrit en
// base lui-même.

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CANAUX } from "@/lib/boiteReception";
import { MODES_PERSONA, DEFAUT_TOURS, MAX_TOURS } from "@/lib/persona";
import { listerVoixDisponibles } from "@/lib/actions/voix";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { inputStyle, selectStyle, labelStyle, LigneReglage, ChoixSegmente, Compteur } from "./ui";

// La scène d'une mise en situation écrite : le message de l'interlocuteur, la
// fiche du destinataire d'un e-mail, le contexte d'un document. Générée, montrée
// au candidat, lue par le correcteur — et jusqu'ici invisible ici même : le
// recruteur publiait une scène qu'il n'avait jamais lue. Elle compte d'autant
// plus quand elle est jouée dans une autre langue que le parcours.
// [clé de config, nombre de lignes] — une seule ligne : champ simple.
export const CHAMPS_SCENE = {
  client_reply: [["client_message", 4]],
  email: [["to", 1], ["subject", 1], ["context", 4]],
  document: [["document_context", 4]],
};

export function SceneEditor({ kind, config, onChange }) {
  const { t } = useI18n();
  return (
    <div style={{ marginTop: "0.75rem" }}>
      {CHAMPS_SCENE[kind].map(([cle, lignes]) => (
        <div key={cle}>
          <label style={labelStyle}>{t(`dashboard.experienceEditor.scene.${cle}`)}</label>
          {lignes > 1 ? (
            <AutoTextarea
              value={config?.[cle] || ""}
              onChange={(e) => onChange({ [cle]: e.target.value })}
              rows={lignes}
              style={{ ...inputStyle, lineHeight: 1.5 }}
            />
          ) : (
            <input value={config?.[cle] || ""} onChange={(e) => onChange({ [cle]: e.target.value })} style={inputStyle} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Éditeur de la boîte de réception ────────────────────────────────────────
// Les messages tels que le candidat les reçoit. Le tri attendu de chacun (la
// lecture du correcteur) est dans « Le corrigé », onglet Scoring.
export function InboxEditor({ inbox, onChange }) {
  const { t } = useI18n();
  const b = inbox || { owner: "", now: "", items: [], triage_notes: [] };
  const items = b.items || [];
  const notes = b.triage_notes || [];
  const set = (patch) => onChange({ ...b, ...patch });
  const setItem = (i, patch) => set({ items: items.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  const ajouter = () => {
    const max = items.reduce((m, x) => Math.max(m, Number(String(x.id).replace(/\D/g, "")) || 0), 0);
    set({ items: [...items, { id: `m${max + 1}`, channel: "email", from: "", from_role: "", subject: "", received_at: "", body: "" }] });
  };
  const retirer = (i) => {
    const id = items[i]?.id;
    set({ items: items.filter((_, j) => j !== i), triage_notes: notes.filter((n) => n.item !== id) });
  };

  return (
    <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 240px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.owner")}</label>
          <input value={b.owner || ""} onChange={(e) => set({ owner: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>{t("dashboard.experienceEditor.inbox.now")}</label>
          <input value={b.now || ""} onChange={(e) => set({ now: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0 0.5rem" }}>
        <label style={{ ...labelStyle, margin: 0 }}>{t("dashboard.experienceEditor.inbox.messages", { count: items.length })}</label>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={ajouter}>
          <Plus size={13} /> {t("dashboard.experienceEditor.inbox.addMessage")}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {items.map((m, i) => {
          return (
            <div key={m.id || i} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted-foreground)", alignSelf: "center", fontFamily: "monospace" }}>{m.id}</span>
                <select value={m.channel || "email"} onChange={(e) => setItem(i, { channel: e.target.value })} style={{ ...selectStyle, marginBottom: 0, flex: "0 0 170px" }}>
                  {CANAUX.map((c) => <option key={c} value={c}>{t(`dashboard.experienceEditor.inbox.channels.${c}`)}</option>)}
                </select>
                <input value={m.from || ""} onChange={(e) => setItem(i, { from: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.from")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 140px" }} />
                <input value={m.from_role || ""} onChange={(e) => setItem(i, { from_role: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.fromRole")} style={{ ...inputStyle, marginBottom: 0, flex: "1 1 160px" }} />
                <button className="btn btn-ghost btn-sm" onClick={() => retirer(i)} style={{ padding: "4px", color: "var(--ds-red)" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <input value={m.subject || ""} onChange={(e) => setItem(i, { subject: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.subject")} style={{ ...inputStyle, marginBottom: 0 }} />
                <input value={m.received_at || ""} onChange={(e) => setItem(i, { received_at: e.target.value })} placeholder={t("dashboard.experienceEditor.inbox.receivedAt")} style={{ ...inputStyle, marginBottom: 0, flex: "0 0 140px" }} />
              </div>
              <AutoTextarea value={m.body || ""} onChange={(e) => setItem(i, { body: e.target.value })} rows={3}
                style={{ ...inputStyle, marginBottom: 0, fontSize: "13px", lineHeight: 1.5 }} />
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "0.75rem", lineHeight: 1.5 }}>{t("dashboard.experienceEditor.inbox.help")}</p>
    </div>
  );
}

// ─── Personnage : les réglages techniques ─────────────────────────────────────
// Canal, langue, accent, genre, voix, nombre d'échanges : rarement à changer,
// donc dans « Réglages avancés ». Le personnage lui-même (qui il est, ce qu'il
// cache, ses objections) se lit et se modifie dans le récit de l'étape.
const LANGUES_NOMMEES = ["fr", "nl", "en", "de", "es", "it"];

// La voix qui sera VRAIMENT utilisée pendant l'appel, d'après les voix
// configurées — même ordre que voixDuPersonnage (lib/constants/voix.js) :
// l'accent d'abord, le genre ensuite, la voix standard en dernier.
function voixEffective(p, variantes) {
  if (p.voice_id) return { type: "custom" };
  const langue = String(p.language || "fr").slice(0, 2).toLowerCase();
  const accent = String(p.accent || "").toUpperCase();
  const genre = p.gender === "m" ? "m" : "f";
  const autre = genre === "m" ? "f" : "m";
  const dispo = (cle) => variantes[cle] || [];
  if (accent) {
    for (const g of [genre, autre]) if (dispo(`${langue}-${accent}`).includes(g)) return { type: "variante", cle: `${langue}-${accent}`, genre: g };
  }
  const memeLangue = Object.keys(variantes).filter((k) => k.startsWith(`${langue}-`))
    .sort((x, y) => (y.endsWith("-BE")) - (x.endsWith("-BE")));
  for (const g of [genre, autre]) {
    for (const k of memeLangue) if (dispo(k).includes(g)) return { type: "variante", cle: k, genre: g };
  }
  return { type: "standard", langue, genre };
}

export function PersonaReglages({ persona, onChange }) {
  const { t } = useI18n();
  const p = persona || {};
  const set = (patch) => onChange({ ...p, ...patch });
  const k = (cle) => t(`dashboard.experienceEditor.persona.${cle}`);
  const v = (cle, vars) => t(`dashboard.experienceEditor.voices.${cle}`, vars);
  const tours = p.max_turns ?? DEFAUT_TOURS;
  const appel = (p.mode || "call") === "call";

  // Les voix configurées sur le serveur (langue, accent, genre — jamais l'identifiant).
  const [variantes, setVariantes] = useState(null);
  useEffect(() => {
    let actif = true;
    listerVoixDisponibles().then((r) => { if (actif) setVariantes(r?.success ? r.variantes : {}); });
    return () => { actif = false; };
  }, []);

  const langue = String(p.language || "fr").slice(0, 2).toLowerCase();
  // Langues et régions nommées dans les dictionnaires ; une autre s'affiche en code.
  const nomLangue = (l) => (LANGUES_NOMMEES.includes(l) ? v(`lang.${l}`) : l.toUpperCase());
  const nomVariante = (cle) => {
    const [l, acc] = cle.split("-");
    return v("variant", { lang: nomLangue(l), region: v(`region.${l}_${acc}`) });
  };
  const nomGenre = (g) => (g === "m" ? v("male") : v("female"));

  // Options : les voix configurées, celles de la langue de la scène en tête ;
  // les voix standard seulement si la langue n'en a aucune (sinon une voix
  // configurée passerait devant au moment de l'appel).
  const options = [];
  if (variantes) {
    const cles = Object.keys(variantes).sort((x, y) => (y.startsWith(`${langue}-`)) - (x.startsWith(`${langue}-`)) || x.localeCompare(y));
    for (const cle of cles) for (const g of ["m", "f"]) {
      if (variantes[cle].includes(g)) options.push({ valeur: `${cle}|${g}`, libelle: `${nomGenre(g)} · ${nomVariante(cle)}` });
    }
    if (!cles.some((c) => c.startsWith(`${langue}-`))) {
      for (const g of ["m", "f"]) options.push({ valeur: `std|${g}`, libelle: v("standard", { genre: nomGenre(g), lang: nomLangue(langue) }) });
    }
  }
  const effective = variantes ? voixEffective(p, variantes) : null;
  const valeur = !effective ? "" : effective.type === "custom" ? "custom"
    : effective.type === "variante" ? `${effective.cle}|${effective.genre}` : `std|${effective.genre}`;
  // Le genre de la voix diffère de celui du personnage : seule l'autre voix existe.
  const genreImpose = effective && effective.type === "variante" && effective.genre !== (p.gender === "m" ? "m" : "f");

  function choisir(val) {
    if (val === "custom") return;
    const [cle, g] = val.split("|");
    if (cle === "std") { set({ gender: g, accent: null, voice_id: null }); return; }
    const [l, acc] = cle.split("-");
    set({ language: l, accent: acc, gender: g, voice_id: null });
  }

  // Une ligne par réglage, dans « Réglages avancés » (maquette « Étape – Scénario »).
  return (
    <>
      <LigneReglage titre={k("mode")} aide={k("modeHelp")}>
        <ChoixSegmente
          label={k("mode")}
          valeur={p.mode || "call"}
          onChange={(mode) => set({ mode })}
          options={MODES_PERSONA.map((m) => [m, t(`dashboard.experienceEditor.persona.modes.${m}`)])}
        />
      </LigneReglage>
      {appel && (
        <LigneReglage titre={p.name ? v("titleNamed", { name: p.name }) : v("title")} aide={v("help")}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <select
              value={valeur}
              onChange={(e) => choisir(e.target.value)}
              disabled={!variantes}
              aria-label={v("title")}
              className="ds-select"
              style={{ height: 36, minWidth: 250, fontSize: 13 }}
            >
              {!variantes && <option value="">{v("loading")}</option>}
              {valeur === "custom" && <option value="custom">{v("custom")}</option>}
              {options.map((o) => <option key={o.valeur} value={o.valeur}>{o.libelle}</option>)}
            </select>
            {genreImpose && (
              <span className="ds-help" style={{ color: "var(--ds-amber-ink)", maxWidth: 280, textAlign: "right" }}>
                {v("forcedGender", { genre: nomGenre(effective.genre).toLowerCase() })}
              </span>
            )}
          </span>
        </LigneReglage>
      )}
      <LigneReglage titre={k("maxTurns")} aide={k("turnsHelp")}>
        <Compteur valeur={tours} min={2} max={MAX_TOURS} onChange={(max_turns) => set({ max_turns })} moins={k("turnsLess")} plus={k("turnsMore")} />
      </LigneReglage>
    </>
  );
}
