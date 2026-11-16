"use client";

// La fiche d'une nouvelle recrue (phase 2) : ce qui lui est assigné et où elle
// en est, chacun de ses essais avec ses checkpoints et les citations qui les
// prouvent, la validation des modules, et « prête pour de vrais clients ».

import { useState, useEffect, useCallback, use } from "react";
import { Loader2, CheckCircle2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { formatDateShort } from "@/lib/i18n/format";
import { getPersonne, assigner, retirerAssignation, validerAssignation, marquerPret } from "@/lib/actions/personnes";
import { listerModules } from "@/lib/actions/modules";
import { listerProgrammes } from "@/lib/actions/programmes";
import LacunesRecrutement from "@/components/onboarding/LacunesRecrutement";
import Select from "@/components/ui/Select";

export default function PersonnePage({ params }) {
  const { userId } = use(params);
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const k = (cle, vars) => t(`dashboard.onb.people.${cle}`, vars);
  const [donnees, setDonnees] = useState(null);
  const [modules, setModules] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [choixModules, setChoixModules] = useState([]);
  const [choixProgramme, setChoixProgramme] = useState("");
  const [echeance, setEcheance] = useState("");
  const [ouvert, setOuvert] = useState(null);

  const charger = useCallback(async () => {
    const [p, m, pr] = await Promise.all([getPersonne(userId), listerModules(), listerProgrammes()]);
    setDonnees(p.success ? p : { erreur: true });
    setModules(m.success ? m.modules : []);
    setProgrammes(pr.success ? pr.programmes : []);
  }, [userId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  async function agir(action, message) {
    const res = await action();
    if (!res.success) return toast(res.code ? k(`errors.${res.code}`) : k("errors.generic"), "error");
    if (message) toast(message, "success");
    charger();
  }

  async function assignerChoix(e) {
    e.preventDefault();
    await agir(() => assigner({ learnerId: userId, moduleIds: choixModules, programId: choixProgramme || null, dueAt: echeance ? new Date(echeance).toISOString() : null }), k("assigned"));
    setChoixModules([]);
    setChoixProgramme("");
  }

  const crumbs = [{ label: k("title"), href: "/onboarding/personnes" }];
  if (!donnees) return (<><PageHeader crumbs={crumbs} title="…" /><div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} /></div></>);
  if (donnees.erreur) return (<><PageHeader crumbs={crumbs} title={k("notFound")} /><div className="ds-body" /></>);

  const { personne, assignations, essais, recrutement } = donnees;
  const pret = personne.lifecycle === "ready";
  const dejaAssignes = new Set(assignations.map((a) => a.module_id));

  return (
    <>
      <PageHeader crumbs={crumbs} title={personne.nom} actions={
        <button type="button" className={`ds-btn ${pret ? "" : "ds-btn-primary"}`} onClick={() => agir(() => marquerPret(userId, !pret), pret ? null : k("markedReady"))}>
          <CheckCircle2 size={14} /> {pret ? k("unmarkReady") : k("markReady")}
        </button>
      } />
      <div className="ds-body" style={{ maxWidth: 980, display: "flex", flexDirection: "column", gap: 16 }}>
        <p className="ds-sub">
          {personne.email} · {k(`lifecycle.${personne.lifecycle}`)}
          {pret && personne.readyAt ? ` · ${k("readySince", { date: formatDateShort(personne.readyAt, locale) })}` : ""}
        </p>

        {/* ── Depuis le recrutement (phase 4) ───────────────────────────── */}
        {recrutement && <LacunesRecrutement userId={userId} recrutement={recrutement} onAssigne={charger} />}

        {/* ── Assigner ──────────────────────────────────────────────────── */}
        <form onSubmit={assignerChoix} className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2">{k("assign")}</h2>
            <p className="ds-sub">{k("assignHint")}</p>
          </div>
          <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label className="ds-field"><span className="ds-label">{k("program")}</span>
              <Select className="ds-select" value={choixProgramme} onChange={(e) => setChoixProgramme(e.target.value)}>
                <option value="">—</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </Select>
            </label>
            <label className="ds-field"><span className="ds-label">{k("dueAt")}</span>
              <input className="ds-input" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </label>
            <div className="ds-field" style={{ gridColumn: "1 / -1" }}>
              <span className="ds-label">{k("modules")}</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {modules.filter((m) => !dejaAssignes.has(m.id)).map((m) => (
                  <label key={m.id} className="ds-chip" style={{ cursor: "pointer", gap: 6 }}>
                    <input type="checkbox" checked={choixModules.includes(m.id)}
                      onChange={() => setChoixModules((c) => (c.includes(m.id) ? c.filter((x) => x !== m.id) : [...c, m.id]))} />
                    {m.title}
                  </label>
                ))}
                {modules.every((m) => dejaAssignes.has(m.id)) && <span className="ds-sub">{k("allAssigned")}</span>}
              </div>
            </div>
          </div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={!choixModules.length && !choixProgramme}>{k("assignSubmit")}</button>
          </div>
        </form>

        {/* ── Les modules assignés ──────────────────────────────────────── */}
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("assignments")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: assignations.length ? 0 : 14 }}>
            {!assignations.length && <p className="ds-sub">{k("noAssignments")}</p>}
            {assignations.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 14, fontWeight: 600 }}>{a.titre}</b>
                  <span className="ds-muted" style={{ fontSize: 12 }}>
                    {[k("attempts", { count: a.essais }), a.best_score != null ? k("best", { score: a.best_score, min: a.minScore }) : k("minScore", { min: a.minScore }),
                      a.due_at ? k("due", { date: formatDateShort(a.due_at, locale) }) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={`ds-chip ${a.status === "validated" ? "ds-chip-green" : a.status === "passed" ? "ds-chip-blue" : ""}`}>{k(`status.${a.status}`)}</span>
                {a.status !== "validated"
                  ? <button type="button" className={`ds-btn ${a.status === "passed" ? "ds-btn-primary" : ""}`} onClick={() => agir(() => validerAssignation(a.id, true), k("validated"))}>{k("validate")}</button>
                  : <button type="button" className="ds-btn" onClick={() => agir(() => validerAssignation(a.id, false))}>{k("unvalidate")}</button>}
                <button type="button" className="ds-icon-btn" aria-label={k("unassign")} onClick={() => window.confirm(k("unassignConfirm")) && agir(() => retirerAssignation(a.id))}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Les essais, avec leurs preuves ────────────────────────────── */}
        <section className="ds-panel">
          <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{k("attemptsTitle")}</h2>
          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", padding: essais.length ? 0 : 14 }}>
            {!essais.length && <p className="ds-sub">{k("noAttempts")}</p>}
            {essais.map((r, i) => {
              const titre = assignations.find((a) => a.id === r.assignmentId)?.titre || "—";
              const ouvre = ouvert === r.id;
              return (
                <div key={r.id} style={{ borderTop: i ? "1px solid var(--ds-line)" : "none" }}>
                  <button type="button" onClick={() => setOuvert(ouvre ? null : r.id)} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", width: "calc(100% - 28px)" }}>
                    {ouvre ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    <span style={{ flex: 1, fontSize: 14 }}><b style={{ fontWeight: 600 }}>{titre}</b> <span className="ds-muted">· {k("attemptN", { n: r.numero || "?" })} · {formatDateShort(r.debut, locale)}</span></span>
                    <span className="ds-mono" style={{ fontSize: 14 }}>{r.note != null ? `${r.note} %` : k(`runStatus.${r.statut}`)}</span>
                  </button>
                  {ouvre && (
                    <div style={{ padding: "0 14px 14px 41px", display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                      {r.resume && <p style={{ lineHeight: 1.55 }}>{r.resume}</p>}
                      {r.criteres.map((c, j) => (
                        <div key={j} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <b style={{ fontWeight: 600 }}>{c.sub_dimension_name || c.skill_name} · {c.score} %</b>
                          {(c.checkpoints || []).map((cp) => (
                            <div key={cp.id} style={{ display: "flex", gap: 8 }}>
                              <span className="ds-mono" style={{ color: cp.score === 2 ? "var(--ds-green-ink)" : cp.score === 1 ? "var(--ds-amber-ink)" : "var(--ds-red)" }}>{cp.score}/2</span>
                              <span style={{ flex: 1 }}>
                                {cp.description}
                                {cp.verbatim && <span style={{ display: "block", fontStyle: "italic", color: "var(--ds-ink-3)" }}>« {cp.verbatim} »</span>}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
