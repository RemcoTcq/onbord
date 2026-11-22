"use client";

// Assigner UN module à plusieurs personnes d'un coup (20/11/2026, Remco) :
// « pas envie de créer un programme complet, juste un module à envoyer à
// quinze personnes ». Une fenêtre : recherche, « tout sélectionner », une
// échéance facultative, puis l'envoi. Celles qui l'ont déjà sont grisées.
// Chaque personne reçoit l'e-mail « nouvelle simulation » (assigner, une
// personne après l'autre — l'envoi d'e-mails est limité en débit).

import { useEffect, useState } from "react";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { initials } from "@/components/ui/ds";
import { listerPersonnes, assigner } from "@/lib/actions/personnes";
import { getModule } from "@/lib/actions/modules";

const sansAccent = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function FenetreAssigner({ moduleId, titre, onFermer, onAssigne }) {
  const { t } = useI18n();
  const k = (cle, vars) => t(`dashboard.onb.modules.${cle}`, vars);
  const p = (cle, vars) => t(`dashboard.sims.page.${cle}`, vars);
  const [personnes, setPersonnes] = useState(null);
  const [deja, setDeja] = useState(new Set());
  const [choisies, setChoisies] = useState(new Set());
  const [recherche, setRecherche] = useState("");
  const [echeance, setEcheance] = useState("");
  const [envoi, setEnvoi] = useState(null); // { fait, total } pendant l'envoi
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    let annule = false;
    Promise.all([listerPersonnes(), getModule(moduleId)]).then(([pe, mo]) => {
      if (annule) return;
      setPersonnes(pe.success ? pe.personnes : []);
      setDeja(new Set((mo.success ? mo.assignations || [] : []).map((a) => a.learner_id)));
    });
    return () => { annule = true; };
  }, [moduleId]);

  useEffect(() => {
    const echap = (e) => { if (e.key === "Escape" && !envoi) onFermer(); };
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [onFermer, envoi]);

  const terme = sansAccent(recherche.trim());
  const visibles = (personnes || []).filter((pe) => !terme || sansAccent(`${pe.nom} ${pe.email}`).includes(terme));
  const libres = visibles.filter((pe) => !deja.has(pe.userId));
  const toutesChoisies = libres.length > 0 && libres.every((pe) => choisies.has(pe.userId));

  function basculer(id) {
    setChoisies((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  function toutBasculer() {
    setChoisies((s) => {
      const n = new Set(s);
      for (const pe of libres) { if (toutesChoisies) n.delete(pe.userId); else n.add(pe.userId); }
      return n;
    });
  }

  async function envoyer(e) {
    e.preventDefault();
    const ids = [...choisies];
    const dueAt = echeance ? new Date(echeance).toISOString() : null;
    setErreur(null);
    let nouvelles = 0;
    let echecs = 0;
    for (let i = 0; i < ids.length; i++) {
      setEnvoi({ fait: i, total: ids.length });
      const res = await assigner({ learnerId: ids[i], moduleIds: [moduleId], dueAt });
      if (res.success) nouvelles += res.nouvelles || 0;
      else echecs++;
    }
    setEnvoi(null);
    if (echecs) setErreur(k("assignPartial", { count: echecs }));
    onAssigne(nouvelles, !echecs);
  }

  return (
    <div className="ds-overlay" onMouseDown={() => !envoi && onFermer()}>
      <form role="dialog" aria-modal="true" aria-labelledby="ds-assigner" className="ds-modal" onSubmit={envoyer} onMouseDown={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <h2 id="ds-assigner" className="ds-h2">{k("assignTitle")}</h2>
            <span className="ds-muted" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{titre}</span>
          </span>
          <button type="button" onClick={onFermer} disabled={!!envoi} className="ds-icon-btn ds-icon-btn-outline" aria-label={k("cancel")}><X size={15} /></button>
        </div>
        <div className="ds-modal-body">

          {personnes === null ? (
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          ) : personnes.length === 0 ? (
            <p className="ds-sub" style={{ margin: 0 }}>{p("noPeople")} <Link href="/onboarding/personnes?inviter=1" className="ds-link">{p("invite")}</Link></p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label className="ds-search" style={{ flex: 1 }}>
                  <Search size={15} strokeWidth={2} />
                  <span className="sr-only">{k("searchPeople")}</span>
                  <input type="search" placeholder={k("searchPeople")} value={recherche} onChange={(e) => setRecherche(e.target.value)} />
                </label>
                <button type="button" className="ds-btn" onClick={toutBasculer} disabled={!libres.length || !!envoi}>
                  {toutesChoisies ? k("unselectAll") : k("selectAll")}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--ds-line-2)", borderRadius: 10, maxHeight: 300, overflowY: "auto" }}>
                {visibles.length === 0 && <p className="ds-sub" style={{ margin: 0, padding: 12 }}>{t("dashboard.search.noResults")}</p>}
                {visibles.map((pe, i) => {
                  const a = deja.has(pe.userId);
                  return (
                    <label key={pe.userId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderTop: i ? "1px solid var(--ds-line-3)" : "none", fontSize: 13, cursor: a ? "default" : "pointer", opacity: a ? 0.6 : 1 }}>
                      <input type="checkbox" disabled={a || !!envoi} checked={a || choisies.has(pe.userId)} onChange={() => basculer(pe.userId)} />
                      <span className="ds-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>{initials(...String(pe.nom || "").split(" "), pe.email)}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500 }}>{pe.nom || pe.email}</span>
                        {pe.nom && <span className="ds-muted" style={{ fontSize: 12 }}>{pe.email}</span>}
                      </span>
                      {a && <span className="ds-chip">{p("alreadyAssigned")}</span>}
                    </label>
                  );
                })}
              </div>
              <label className="ds-field" style={{ maxWidth: 220 }}>
                <span className="ds-label">{t("dashboard.onb.people.dueAt")}</span>
                <input className="ds-input" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} disabled={!!envoi} />
              </label>
            </>
          )}
          {erreur && <p role="alert" style={{ margin: 0, color: "var(--ds-red)", fontSize: 13 }}>{erreur}</p>}
        </div>
        <div className="ds-modal-foot">
          <button type="button" className="ds-btn" onClick={onFermer} disabled={!!envoi}>{k("cancel")}</button>
          <button type="submit" className="ds-btn ds-btn-primary" disabled={!!envoi || !choisies.size}>
            {envoi ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UserPlus size={14} />}
            {envoi ? k("assigning", { fait: envoi.fait, total: envoi.total }) : p("assign", { count: choisies.size })}
          </button>
        </div>
      </form>
    </div>
  );
}
