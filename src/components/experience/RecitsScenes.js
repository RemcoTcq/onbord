"use client";

// Le récit de la mise en situation, par type d'étape — ce qui remplace, en
// tête de l'onglet Scénario, les formulaires bruts de la génération.
//
//   • personnage, e-mail, réponse client, document : peu de champs, du texte.
//     Ils se lisent et se modifient section par section (SectionRecit).
//   • CRM, tableur, boîte de réception, tableau, code : des données. On en
//     donne le résumé en deux ou trois lignes ; les données elles-mêmes
//     restent derrière « Voir et modifier les données ».

import { useState } from "react";
import { Phone, MessageSquare, Pencil, Check, EyeOff } from "lucide-react";
import { crmEstEspace } from "@/lib/crmScoring";
import { CODE_LANGUAGES } from "@/lib/constants/codeLanguages";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SectionRecit } from "./Recit";
import { CHAMPS_SCENE } from "./EditeursScene";
import { Panneau } from "./ui";

// ─── Personnage ──────────────────────────────────────────────────────────────
// Deux temps : ce que vit le candidat (qui il appelle, ce qu'il sait, ce qu'il
// entend en premier), puis ce qui se passe dans la tête du personnage — que le
// candidat ne voit jamais, et que le recruteur lit dans sa langue.
export function RecitPersona({ persona, onChange }) {
  const { t } = useI18n();
  const p = persona || {};
  const set = (patch) => onChange({ ...p, ...patch });
  const [identite, setIdentite] = useState(false);
  const appel = (p.mode || "call") === "call";
  const Icone = appel ? Phone : MessageSquare;
  const k = (cle) => `dashboard.experienceEditor.recit.persona.${cle}`;
  const sousTitre = [t(k(appel ? "call" : "chat")), [p.role, p.company].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const libelleIdentite = identite ? t("dashboard.experienceEditor.recit.done") : t("dashboard.experienceEditor.recit.edit");

  return (
    <>
      {/* Ce que vit le candidat : qui il rencontre, ce qu'il sait, ce qu'il entend en premier. */}
      <Panneau
        id="ds-personnage"
        icone={<Icone size={16} strokeWidth={2} />}
        titre={p.name || "—"}
        sousTitre={sousTitre}
        actions={
          <button
            type="button"
            className="ds-icon-btn"
            onClick={() => setIdentite((v) => !v)}
            aria-label={libelleIdentite}
            title={libelleIdentite}
            style={{ width: 30, height: 30, ...(identite ? { background: "var(--ds-blue-10)", color: "var(--ds-blue)" } : {}) }}
          >
            {identite ? <Check size={15} strokeWidth={2.2} /> : <Pencil size={14} strokeWidth={1.8} />}
          </button>
        }
      >
        {identite && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 14px" }}>
            {["name", "role", "company"].map((cle) => (
              <input key={cle} value={p[cle] || ""} onChange={(e) => set({ [cle]: e.target.value })}
                placeholder={t(`dashboard.experienceEditor.persona.${cle}`)}
                aria-label={t(`dashboard.experienceEditor.persona.${cle}`)}
                className="ds-input" style={{ flex: "1 1 160px" }} />
            ))}
          </div>
        )}
        <SectionRecit titre={t(k("knows"))} valeur={p.context} onChange={(v) => set({ context: v })} />
        <SectionRecit titre={t(k("opening"))} valeur={p.opening_message} vide={t(k("openingEmpty"))} lignes={2} citation onChange={(v) => set({ opening_message: v })} />
      </Panneau>

      {/* Dans la tête du personnage : jamais montré au candidat. */}
      <Panneau
        id="ds-coulisses"
        pointilles
        icone={<EyeOff size={16} strokeWidth={2} />}
        titre={t(k("hiddenTitle"))}
        sousTitre={t(k("hiddenSub"))}
      >
        <SectionRecit fort titre={t(k("personality"))} valeur={p.personality} lignes={2} onChange={(v) => set({ personality: v })} />
        <SectionRecit fort titre={t(k("goals"))} valeur={p.goals} lignes={2} onChange={(v) => set({ goals: v })} />
        <SectionRecit fort titre={t(k("hidden"))} aide={t(k("hiddenHint"))} valeur={p.hidden_info} liste onChange={(v) => set({ hidden_info: v })} />
        <SectionRecit fort titre={t(k("objections"))} valeur={p.objections} liste onChange={(v) => set({ objections: v })} />
        <SectionRecit fort titre={t(k("redLines"))} valeur={p.red_lines} liste onChange={(v) => set({ red_lines: v })} />
      </Panneau>
    </>
  );
}

// ─── E-mail, réponse client, document ────────────────────────────────────────
// La scène écrite, champ par champ : peu de texte, tout se lit.
export function RecitScene({ kind, config, setConfig, stepId, toast }) {
  const { t } = useI18n();
  return (
    <>
      {CHAMPS_SCENE[kind].map(([cle, lignes]) => (
        <SectionRecit
          key={cle}
          stepId={lignes > 1 ? stepId : null}
          toast={toast}
          titre={t(`dashboard.experienceEditor.scene.${cle}`)}
          valeur={config?.[cle] || ""}
          lignes={lignes}
          onChange={(v) => setConfig({ [cle]: v })}
        />
      ))}
    </>
  );
}

// ─── Résumé des données (CRM, tableur, boîte, tableau, code) ─────────────────
export function ResumeDonnees({ kind, config }) {
  const { t } = useI18n();
  const k = (cle, vars) => t(`dashboard.experienceEditor.recit.data.${cle}`, vars);
  const lignes = [];
  const puces = [];

  if (kind === "crm") {
    const c = config?.crm || {};
    const fields = c.fields || [];
    if (crmEstEspace(c)) {
      lignes.push(k("crm", {
        name: c.pipeline_name || "—",
        records: (c.records || []).length,
        mission: c.mission ? t(`dashboard.experienceEditor.crm.missions.${c.mission}`) : "—",
      }));
    } else {
      lignes.push(k("crmSources", { count: (c.sources || []).length }));
    }
    lignes.push(k("crmFields", { count: fields.length, factual: fields.filter((f) => f.nature === "factual").length }));
    for (const f of fields.slice(0, 8)) puces.push(f.label || f.key);
  }

  if (kind === "sheet") {
    const s = config?.sheet || {};
    const onglets = s.sheets || [];
    lignes.push(k("sheet", {
      file: s.file_name || "—",
      tabs: onglets.length,
      rows: onglets.reduce((n, o) => n + (o.rows || []).length, 0),
    }));
    if (s.deliverable_label) lignes.push(k("sheetDeliverable", { label: s.deliverable_label }));
    for (const o of onglets) puces.push(`${o.name || "—"} : ${(o.columns || []).join(", ")}`);
  }

  if (kind === "inbox") {
    const b = config?.inbox || {};
    const items = b.items || [];
    lignes.push(k("inbox", { owner: b.owner || "—", count: items.length, now: b.now || "—" }));
    for (const m of items.slice(0, 8)) puces.push([m.from, m.subject].filter(Boolean).join(" — ") || m.id);
    if (items.length > 8) puces.push("…");
  }

  if (kind === "board") {
    const b = config?.board || {};
    lignes.push(k("board", { title: b.title || "—", count: (b.cards || []).length }));
    if ((b.columns || []).length) lignes.push(k("boardColumns", { columns: b.columns.filter(Boolean).join(" · ") }));
    if (b.constraint) lignes.push(k("boardConstraint", { constraint: b.constraint }));
  }

  if (kind === "code") {
    const c = config?.code || {};
    const tests = c.tests || [];
    const caches = tests.filter((x) => x.hidden).length;
    lignes.push(k("code", {
      language: CODE_LANGUAGES[c.language]?.label || c.language || "—",
      visible: tests.length - caches,
      hidden: caches,
    }));
  }

  if (!lignes.length) return null;
  return (
    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ds-ink-3)" }}>
        {t("dashboard.experienceEditor.recit.data.title")}
      </span>
      {lignes.map((l, i) => <p key={i} style={{ lineHeight: 1.6, margin: 0, color: "var(--ds-ink-2)" }}>{l}</p>)}
      {puces.length > 0 && (
        <ul style={{ margin: "4px 0 0", paddingLeft: "1.1rem", fontSize: 13, color: "var(--ds-ink-3)", lineHeight: 1.55 }}>
          {puces.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}
