"use client";

// Onboarding → Programs (phase 2). Un programme est un modèle facultatif :
// une liste ordonnée de modules pour un rôle, assignée d'un coup à une
// nouvelle recrue (page People). On le compose ici à partir des modules
// existants ; les suggestions de modules vivent sur la page Modules.

import { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, ArrowUp, ArrowDown, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { listerProgrammes, getProgramme, enregistrerProgramme, archiverProgramme } from "@/lib/actions/programmes";
import { listerModules } from "@/lib/actions/modules";
import Select from "@/components/ui/Select";

const VIDE = { id: null, title: "", target_role: "", description: "", moduleIds: [] };

export default function ProgrammesPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.programs.${cle}`, vars);
  const [liste, setListe] = useState(null);
  const [modules, setModules] = useState([]);
  const [edition, setEdition] = useState(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    const [p, m] = await Promise.all([listerProgrammes(), listerModules()]);
    setListe(p.success ? p.programmes : []);
    setModules(m.success ? m.modules : []);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function ouvrir(id) {
    const res = await getProgramme(id);
    if (!res.success) return toast(k("errors.generic"), "error");
    setEdition({ ...res.programme, moduleIds: res.modules.map((m) => m.id) });
  }

  async function enregistrer(e) {
    e.preventDefault();
    setEnvoi(true);
    const res = await enregistrerProgramme(edition);
    setEnvoi(false);
    if (!res.success) return toast(k(`errors.${res.code || "generic"}`), "error");
    toast(k("saved"), "success");
    setEdition(null);
    charger();
  }

  async function archiver() {
    if (!window.confirm(k("archiveConfirm"))) return;
    await archiverProgramme(edition.id);
    setEdition(null);
    charger();
  }

  const titreModule = (id) => modules.find((m) => m.id === id)?.title || "—";
  const deplacer = (i, d) => setEdition((e) => {
    const ids = [...e.moduleIds];
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    return { ...e, moduleIds: ids };
  });

  return (
    <>
      <PageHeader title={k("title")} actions={
        <button type="button" className="ds-btn ds-btn-primary" onClick={() => setEdition({ ...VIDE })}><Plus size={14} /> {k("new")}</button>
      } />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>

        {edition && (
          <form onSubmit={enregistrer} className="ds-panel">
            <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{edition.id ? edition.title : k("new")}</h2>
            <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <label className="ds-field"><span className="ds-label">{k("fields.title")}</span>
                <input className="ds-input" required value={edition.title} onChange={(e) => setEdition({ ...edition, title: e.target.value })} /></label>
              <label className="ds-field"><span className="ds-label">{k("fields.role")}</span>
                <input className="ds-input" value={edition.target_role || ""} onChange={(e) => setEdition({ ...edition, target_role: e.target.value })} /></label>
              <label className="ds-field" style={{ gridColumn: "1 / -1" }}><span className="ds-label">{k("fields.description")}</span>
                <textarea className="ds-textarea" rows={2} value={edition.description || ""} onChange={(e) => setEdition({ ...edition, description: e.target.value })} /></label>
            </div>
            <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="ds-label">{k("fields.modules")}</span>
              {edition.moduleIds.length === 0 && <p className="ds-sub">{k("noModules")}</p>}
              {edition.moduleIds.map((id, i) => (
                <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <span className="ds-mono" style={{ width: 22, color: "var(--ds-ink-4)" }}>{i + 1}.</span>
                  <span style={{ flex: 1 }}>{titreModule(id)}</span>
                  <button type="button" className="ds-icon-btn" disabled={i === 0} onClick={() => deplacer(i, -1)} aria-label={k("up")}><ArrowUp size={14} /></button>
                  <button type="button" className="ds-icon-btn" disabled={i === edition.moduleIds.length - 1} onClick={() => deplacer(i, 1)} aria-label={k("down")}><ArrowDown size={14} /></button>
                  <button type="button" className="ds-icon-btn" onClick={() => setEdition({ ...edition, moduleIds: edition.moduleIds.filter((x) => x !== id) })} aria-label={k("remove")}><X size={14} /></button>
                </div>
              ))}
              <Select className="ds-select" value="" onChange={(e) => e.target.value && setEdition({ ...edition, moduleIds: [...edition.moduleIds, e.target.value] })} aria-label={k("add")}>
                <option value="">{k("add")}</option>
                {modules.filter((m) => !edition.moduleIds.includes(m.id)).map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </Select>
            </div>
            <div className="ds-panel-foot" style={{ gap: 8 }}>
              {edition.id && <button type="button" className="ds-btn" onClick={archiver}>{k("archive")}</button>}
              <button type="button" className="ds-btn" onClick={() => setEdition(null)}>{t("common.actions.cancel")}</button>
              <button type="submit" className="ds-btn ds-btn-primary" disabled={envoi}>{envoi && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}{k("save")}</button>
            </div>
          </form>
        )}

        <section className="ds-panel">
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: liste?.length ? 0 : 14 }}>
            {liste === null && <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />}
            {liste?.length === 0 && <p className="ds-sub">{k("empty")}</p>}
            {(liste || []).map((p, i) => (
              <button key={p.id} type="button" onClick={() => ouvrir(p.id)} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{[p.target_role, k("count", { count: p.nbModules })].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
