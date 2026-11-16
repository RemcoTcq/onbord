"use client";

// La fiche d'un personnage (16/11/2026) : une PERSONNE, réutilisable dans
// n'importe quelle simulation, quel que soit le rôle de celui qui s'entraîne.
//   • qui il est : nom, fonction, entreprise, ce qui le définit ;
//   • son caractère ;
//   • sa langue et sa voix — un seul choix : la voix vient avec la langue
//     (et l'accent), en homme ou en femme.
// Ses objections, son humeur du jour, ce qu'il cache s'écrivent avec chaque
// simulation, pas ici.
//
// « Proposer une fiche » : une description d'une phrase, et Onbord remplit
// les champs à partir de ce qu'il sait des clients de l'entreprise. Rien n'est
// enregistré par ce composant : le parent enregistre.
//
//   <PersonaFiche value={data} onChange={setData} langues={["fr"]} />

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import { EXPERIENCE_LOCALES } from "@/lib/i18n/config";
import { listerVoixDisponibles } from "@/lib/actions/voix";
import { proposerPersona } from "@/lib/actions/personas";
import Select from "@/components/ui/Select";

/** Les voix proposées : celles configurées par langue et accent, sinon la voix standard de la langue. */
export function optionsVoix(variantes, langues) {
  const out = [];
  for (const l of langues) {
    const cles = Object.keys(variantes || {}).filter((c) => c.startsWith(`${l}-`)).sort((x, y) => (y.endsWith("-BE")) - (x.endsWith("-BE")) || x.localeCompare(y));
    if (cles.length) {
      for (const cle of cles) for (const g of ["m", "f"]) {
        if (variantes[cle].includes(g)) out.push({ valeur: `${l}|${cle.split("-")[1]}|${g}`, langue: l, accent: cle.split("-")[1], genre: g });
      }
    } else {
      for (const g of ["m", "f"]) out.push({ valeur: `${l}||${g}`, langue: l, accent: "", genre: g });
    }
  }
  return out;
}

export default function PersonaFiche({ value, onChange, langues = EXPERIENCE_LOCALES }) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.personas.form.${cle}`, vars);
  const v = (cle, vars) => t(`dashboard.experienceEditor.voices.${cle}`, vars);
  const p = value || {};
  const set = (patch) => onChange({ ...p, ...patch });
  const [variantes, setVariantes] = useState(null);
  const [description, setDescription] = useState("");
  const [proposition, setProposition] = useState(false);

  useEffect(() => {
    let actif = true;
    listerVoixDisponibles().then((r) => { if (actif) setVariantes(r?.success ? r.variantes : {}); });
    return () => { actif = false; };
  }, []);

  const options = variantes ? optionsVoix(variantes, langues) : [];
  const langue = String(p.language || "").slice(0, 2).toLowerCase();
  const courante = `${langue}|${String(p.accent || "").toUpperCase()}|${p.gender === "m" ? "m" : "f"}`;
  // Une fiche dont la voix n'est pas (ou plus) dans la liste prend la première.
  const valeur = options.find((o) => o.valeur === courante)?.valeur
    || options.find((o) => o.langue === langue && o.genre === (p.gender === "m" ? "m" : "f"))?.valeur
    || options[0]?.valeur || "";

  useEffect(() => {
    if (!valeur || valeur === courante) return;
    const o = options.find((x) => x.valeur === valeur);
    if (o) onChange({ ...p, language: o.langue, accent: o.accent || null, gender: o.genre, voice_id: null });
  }, [valeur]); // eslint-disable-line react-hooks/exhaustive-deps

  const libelle = (o) => {
    const genre = o.genre === "m" ? v("male") : v("female");
    const nomLangue = v(`lang.${o.langue}`);
    return o.accent
      ? `${genre} · ${v("variant", { lang: nomLangue, region: v(`region.${o.langue}_${o.accent}`) })}`
      : v("standard", { genre, lang: nomLangue });
  };

  function choisirVoix(val) {
    const o = options.find((x) => x.valeur === val);
    if (o) set({ language: o.langue, accent: o.accent || null, gender: o.genre, voice_id: null });
  }

  async function proposer() {
    setProposition(true);
    const o = options.find((x) => x.valeur === valeur) || { langue: langues[0], accent: "", genre: "f" };
    const res = await proposerPersona({ description, language: o.langue, accent: o.accent, gender: o.genre, locale });
    setProposition(false);
    if (!res.success) return toast(t(`dashboard.personas.errors.${res.code || "generation"}`), "error");
    onChange({ ...p, ...res.data });
  }

  const champ = (cle, props = {}) => (
    <label className="ds-field" style={props.plein ? { gridColumn: "1 / -1" } : undefined}>
      <span className="ds-label">{k(cle)}</span>
      {props.zone
        ? <textarea className="ds-textarea" rows={props.rows || 3} value={p[cle] || ""} onChange={(e) => set({ [cle]: e.target.value })} placeholder={k(`${cle}Placeholder`)} />
        : <input className="ds-input" value={p[cle] || ""} onChange={(e) => set({ [cle]: e.target.value })} placeholder={k(`${cle}Placeholder`)} required={props.requis} />}
      {props.aide && <span className="ds-help">{k(`${cle}Help`)}</span>}
    </label>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── Proposer une fiche ──────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, padding: 12, borderRadius: 10, background: "var(--ds-page)", border: "1px dashed var(--ds-line)" }}>
        <label className="ds-field" style={{ flex: "1 1 320px" }}>
          <span className="ds-label">{k("suggest")}</span>
          <input className="ds-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={k("suggestPlaceholder")} />
        </label>
        <button type="button" className="ds-btn" onClick={proposer} disabled={proposition || !description.trim() || !options.length}>
          {proposition ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
          {proposition ? k("suggesting") : k("suggestSubmit")}
        </button>
      </div>

      {/* ── Qui il est ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {champ("name", { requis: true })}
        <label className="ds-field">
          <span className="ds-label">{k("voice")}</span>
          <Select className="ds-select" value={valeur} onChange={(e) => choisirVoix(e.target.value)} disabled={!variantes}>
            {!variantes && <option value="">{v("loading")}</option>}
            {options.map((o) => <option key={o.valeur} value={o.valeur}>{libelle(o)}</option>)}
          </Select>
          <span className="ds-help">{k("voiceHelp")}</span>
        </label>
        {champ("role")}
        {champ("company")}
        {champ("background", { zone: true, plein: true, aide: true })}
        {champ("personality", { zone: true, plein: true, rows: 2, aide: true })}
      </div>
    </div>
  );
}
