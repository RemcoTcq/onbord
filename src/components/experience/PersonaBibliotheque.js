"use client";

// Le lien entre le personnage d'une étape et la BIBLIOTHÈQUE de
// l'organisation (phase 1 de l'onboarding, migration 040).
//
//   • prendre une fiche de la bibliothèque : son IDENTITÉ (nom, fonction,
//     entreprise, caractère, langue, voix) remplace celle du personnage de
//     l'étape ; la situation de l'étape (contexte, objections, informations
//     cachées) reste, et l'étape garde le lien ;
//   • ranger le personnage de l'étape dans la bibliothèque, pour le
//     réutiliser ailleurs.
//
// Rien n'est enregistré ici : comme toute modification de l'étape, le
// changement part au clic sur « Enregistrer » de l'éditeur (updateStep), et
// une version déjà commencée par un candidat est copiée, pas modifiée.

import { useEffect, useState } from "react";
import { Library, BookmarkPlus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { listerPersonas, rangerPersonaEtape } from "@/lib/actions/personas";
import { appliquerIdentite } from "@/lib/persona";
import Select from "@/components/ui/Select";

export default function PersonaBibliotheque({ config, setConfig, toast }) {
  const { t } = useI18n();
  const [fiches, setFiches] = useState(null);
  const [choix, setChoix] = useState("");
  const [rangement, setRangement] = useState(false);
  const k = (cle, vars) => t(`dashboard.personas.inStep.${cle}`, vars);

  useEffect(() => {
    let actif = true;
    listerPersonas().then((r) => { if (actif) setFiches(r.success ? r.personas : []); });
    return () => { actif = false; };
  }, []);

  const liee = fiches?.find((f) => f.id === config?.persona_id) || null;

  function utiliser() {
    const fiche = fiches?.find((f) => f.id === choix);
    if (!fiche) return;
    setConfig({ persona: appliquerIdentite(config?.persona, fiche.data), persona_id: fiche.id });
    setChoix("");
    toast?.(k("applied", { name: fiche.name }), "success");
  }

  async function ranger() {
    setRangement(true);
    const res = await rangerPersonaEtape(config?.persona);
    setRangement(false);
    if (!res.success) return toast?.(k("saveError"), "error");
    setConfig({ persona_id: res.id });
    const maj = await listerPersonas();
    if (maj.success) setFiches(maj.personas);
    toast?.(k("saved"), "success");
  }

  return (
    <div className="ds-inset" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 12px", fontSize: 13 }}>
      <Library size={15} strokeWidth={1.8} style={{ color: "var(--ds-ink-4)" }} />
      <span style={{ color: "var(--ds-ink-3)" }}>
        {liee ? k("linked", { name: liee.name }) : k("notLinked")}
      </span>
      <span style={{ flex: 1 }} />
      <Select className="ds-select" style={{ height: 32, fontSize: 13, minWidth: 200 }} value={choix}
        onChange={(e) => setChoix(e.target.value)} disabled={!fiches?.length} aria-label={k("choose")}>
        <option value="">{fiches === null ? k("loading") : fiches.length ? k("choose") : k("empty")}</option>
        {(fiches || []).map((f) => (
          <option key={f.id} value={f.id}>{[f.name, f.role].filter(Boolean).join(" · ")}</option>
        ))}
      </Select>
      <button type="button" className="ds-btn" style={{ height: 32 }} onClick={utiliser} disabled={!choix}>{k("use")}</button>
      {!liee && config?.persona?.name && (
        <button type="button" className="ds-btn" style={{ height: 32 }} onClick={ranger} disabled={rangement}>
          <BookmarkPlus size={14} /> {k("save")}
        </button>
      )}
    </div>
  );
}
