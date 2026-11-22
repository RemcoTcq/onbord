"use client";

// Assigner des modules (ou un programme) à UNE personne, depuis sa fiche
// (21/11/2026, Remco) : un bouton en haut à droite ouvre cette fenêtre, comme
// « Assigner » sur la page d'un module. Les modules déjà assignés sont grisés.

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Select from "@/components/ui/Select";
import { assigner } from "@/lib/actions/personnes";

const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function FenetreAssignerPersonne({ learnerId, nom, modules, programmes, dejaAssignes, onFermer, onAssigne }) {
  const { t } = useI18n();
  const k = (cle, vars) => t(`dashboard.onb.people.${cle}`, vars);
  const m = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const [choisis, setChoisis] = useState(new Set());
  const [programme, setProgramme] = useState("");
  const [echeance, setEcheance] = useState("");
  const [recherche, setRecherche] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    const echap = (e) => { if (e.key === "Escape" && !envoi) onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer, envoi]);

  const terme = sansAccent(recherche.trim());
  const visibles = modules.filter((mo) => !terme || sansAccent(mo.title).includes(terme));

  function basculer(id) {
    setChoisis((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  async function envoyer(e) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const res = await assigner({ learnerId, moduleIds: [...choisis], programId: programme || null, dueAt: echeance ? new Date(echeance).toISOString() : null });
    setEnvoi(false);
    if (!res.success) return setErreur(res.code ? k(`errors.${res.code}`) : k("errors.generic"));
    onAssigne();
  }

  return (
    <div className="ds-overlay" onMouseDown={() => !envoi && onFermer()}>
      <form role="dialog" aria-modal="true" aria-labelledby="ds-assigner-personne" className="ds-modal" onSubmit={envoyer} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h2 id="ds-assigner-personne" className="ds-h2">{k("assign")}</h2>
            <span className="ds-muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nom}</span>
          </span>
          <button type="button" onClick={onFermer} disabled={envoi} className="ds-icon-btn ds-icon-btn-outline" aria-label={m("cancel")}><X size={15} /></button>
        </div>
        <div className="ds-modal-body">
          {programmes.length > 0 && (
            <label className="ds-field">
              <span className="ds-label">{k("program")}</span>
              <Select className="ds-select" value={programme} onChange={(e) => setProgramme(e.target.value)} disabled={envoi}>
                <option value="">—</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </label>
          )}
          <div className="ds-field">
            <span className="ds-label">{k("modules")}</span>
            <label className="ds-search">
              <Search size={15} strokeWidth={2} />
              <span className="sr-only">{m("searchModules")}</span>
              <input type="search" placeholder={m("searchModules")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            </label>
          </div>
          <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--ds-line-2)", borderRadius: 10, maxHeight: 300, overflowY: "auto" }}>
            {visibles.length === 0 && <p className="ds-sub" style={{ margin: 0, padding: 12 }}>{t("dashboard.search.noResults")}</p>}
            {visibles.map((mo, i) => {
              const a = dejaAssignes.has(mo.id);
              return (
                <label key={mo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? "1px solid var(--ds-line-3)" : "none", fontSize: 13, cursor: a ? "default" : "pointer", opacity: a ? 0.6 : 1 }}>
                  <input type="checkbox" disabled={a || envoi} checked={a || choisis.has(mo.id)} onChange={() => basculer(mo.id)} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{mo.title}</span>
                  {a && <span className="ds-chip">{t("dashboard.sims.page.alreadyAssigned")}</span>}
                </label>
              );
            })}
          </div>
          <label className="ds-field" style={{ maxWidth: 220 }}>
            <span className="ds-label">{k("dueAt")}</span>
            <input className="ds-input" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} disabled={envoi} />
          </label>
          {erreur && <p role="alert" style={{ margin: 0, color: "var(--ds-red)", fontSize: 13 }}>{erreur}</p>}
        </div>
        <div className="ds-modal-foot">
          <button type="button" className="ds-btn" onClick={onFermer} disabled={envoi}>{m("cancel")}</button>
          <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi || (!choisis.size && !programme)}>
            {envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {k("assignSubmit")}
          </button>
        </div>
      </form>
    </div>
  );
}
