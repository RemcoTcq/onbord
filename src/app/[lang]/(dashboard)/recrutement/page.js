"use client";

// Recrutement → Vue d'ensemble (17/11/2026). C'était l'accueil de la
// plateforme, fait pour le seul recrutement ; l'accueil dit maintenant ce qui
// attend une action sur les deux métiers, et le détail du recrutement vit ici :
// chiffres clés, entonnoir par offre, candidats à décider, activité.

import { useState, useEffect, useMemo } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";
import { Plus, Briefcase, Users, Maximize2, ChevronRight, Calendar, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import CopyJobLink from "@/components/jobs/CopyJobLink";
import { jobDot, scoreTone, initials, candidateStatusLabel } from "@/components/ui/ds";
import Select from "@/components/ui/Select";
import { aTermine, estADecider, STATUTS_DECIDES } from "@/lib/accueil";

const NB_CANDIDATS = 6;
const RETENUS = ["shortlisted", "next_step"];

// ── Dates de la période ─────────────────────────────────────────────────────

function debutJour(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Jours de la période affichée : la semaine (lundi → dimanche) ou le mois. */
function joursDe(periode, maintenant = new Date()) {
  const aujourdhui = debutJour(maintenant);
  if (periode === "month") {
    const premier = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    const nb = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0).getDate();
    return Array.from({ length: nb }, (_, i) => new Date(premier.getFullYear(), premier.getMonth(), i + 1));
  }
  const lundi = new Date(aujourdhui);
  lundi.setDate(aujourdhui.getDate() - ((aujourdhui.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + i));
}

function cleJour(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function majuscule(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** L'entonnoir d'une offre : où les candidats décrochent. */
function entonnoir(cands) {
  return {
    invites: cands.length,
    commences: cands.filter((c) => aTermine(c) || c.assessment_status === "in_progress" || c.assessment_status === "submitted").length,
    termines: cands.filter(aTermine).length,
    aDecider: cands.filter(estADecider).length,
    retenus: cands.filter((c) => RETENUS.includes(c.status)).length,
    rejetes: cands.filter((c) => STATUTS_DECIDES.includes(c.status) && !RETENUS.includes(c.status)).length,
  };
}

/** Une ligne de candidat : avatar, nom, offre, score ou statut. */
function LigneCandidat({ c }) {
  const { t } = useI18n();
  const nom = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email;
  const rejete = c.status === "rejected" || c.status === "disqualified";
  return (
    <li style={{ borderTop: "1px solid var(--ds-line-3)" }}>
      <Link href={`/jobs/${c.job.id}/candidats/${c.id}`} className="ds-row-link">
        <span className="ds-avatar">{initials(c.first_name, c.last_name, c.email)}</span>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 500 }}>{nom}</span>
          <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {c.job.title}{rejete ? ` · ${candidateStatusLabel(t, c.status)}` : ""}
          </span>
        </span>
        <span className={`ds-tag ds-tag-${scoreTone(c.score_global)}`}>
          {c.score_global != null ? `${c.score_global} %` : candidateStatusLabel(t, c.status)}
        </span>
        <ChevronRight size={14} strokeWidth={2} color="var(--ds-ink-6)" style={{ flex: "none" }} />
      </Link>
    </li>
  );
}

export default function VueRecrutement() {
  const { t, locale } = useI18n();
  const h = (cle, vars) => t(`dashboard.hiringOverview.${cle}`, vars);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("week");
  const [jourActif, setJourActif] = useState(null);
  const [liste, setListe] = useState("aDecider");

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      // Les crédits restants vivent sur l'accueil (Remco, 20/11/2026).
      const { data } = await supabase
        .from("jobs")
        .select("id, title, status, location, contract_type, work_mode, created_at, candidates(id, first_name, last_name, email, status, assessment_status, score_global, created_at, assessment_submitted_at)")
        .order("created_at", { ascending: false });
      setJobs(data || []);
      setLoading(false);
    }
    loadData();
  }, []);

  const jobsOuverts = useMemo(() => jobs.filter((j) => j.status === "active"), [jobs]);
  const candidats = useMemo(
    () => jobs.flatMap((j) => (j.candidates || []).map((c) => ({ ...c, job: j }))),
    [jobs]
  );
  const aDecider = useMemo(
    () => candidats.filter(estADecider).sort((a, b) => (b.score_global ?? -1) - (a.score_global ?? -1)),
    [candidats]
  );
  const derniers = useMemo(
    () => [...candidats].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, NB_CANDIDATS),
    [candidats]
  );

  // Activité : invités (création du candidat) et terminées (soumission), par jour.
  const jours = useMemo(() => joursDe(periode), [periode]);
  const activite = useMemo(() => {
    const compter = (champ) => {
      const n = {};
      for (const c of candidats) {
        if (!c[champ]) continue;
        const k = cleJour(new Date(c[champ]));
        n[k] = (n[k] || 0) + 1;
      }
      return n;
    };
    const invites = compter("created_at");
    const termines = compter("assessment_submitted_at");
    return jours.map((d) => ({ date: d, inv: invites[cleJour(d)] || 0, done: termines[cleJour(d)] || 0 }));
  }, [jours, candidats]);

  if (loading) {
    return (
      <>
        <PageHeader title={h("title")} />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  // Graphique
  const max = Math.max(4, ...activite.map((a) => Math.max(a.inv, a.done)));
  const aujourdhui = cleJour(new Date());
  const indexActif = jourActif ?? Math.max(0, activite.findIndex((a) => cleJour(a.date) === aujourdhui));
  const totalTermines = activite.reduce((s, a) => s + a.done, 0);
  const mois = periode === "month";
  const fmtCourt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const fmtLong = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric" });
  const fmtPlage = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  const plage = fmtPlage.formatRange(jours[0], jours[jours.length - 1]);
  const etiquette = (d, i) => {
    if (!mois) return majuscule(fmtCourt.format(d).replace(".", ""));
    return i % 7 === 0 ? String(d.getDate()) : "";
  };
  const largeurBarre = mois ? 6 : 14;
  const listeAffichee = liste === "aDecider" ? aDecider.slice(0, NB_CANDIDATS) : derniers;
  const colonnes = ["invites", "commences", "termines", "aDecider", "retenus", "rejetes"];

  return (
    <>
      <PageHeader
        title={h("title")}
        actions={
          <Link href="/jobs/nouveau" className="ds-btn ds-btn-primary">
            <Plus size={15} strokeWidth={2.2} /> {t("dashboard.nav.newJob")}
          </Link>
        }
      />

      {/* ── Chiffres clés ── */}
      <section aria-label={t("dashboard.home.keyFigures")} className="ds-section">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 500 }}>
              <span className="ds-icon-tile"><Briefcase size={13} strokeWidth={2.2} /></span>
              {t("dashboard.nav.jobs")}
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ds-stat">{jobsOuverts.length}</span>
              <span className="ds-muted" style={{ fontSize: 12 }}>{t("dashboard.home.openJobs", { count: jobsOuverts.length })}</span>
            </span>
          </div>

          <div className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontWeight: 500 }}>
              <span className="ds-icon-tile" style={{ background: "#4C74E0" }}><Users size={13} strokeWidth={2.2} /></span>
              {t("dashboard.home.candidates")}
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ds-stat">{candidats.length}</span>
              <span className="ds-muted" style={{ fontSize: 12 }}>{h("toDecideCount", { count: aDecider.length })}</span>
            </span>
          </div>

        </div>
      </section>

      {/* ── Entonnoir par offre ── */}
      <section aria-labelledby="ds-entonnoir" className="ds-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <h2 id="ds-entonnoir" className="ds-h2">{h("funnel")}</h2>
          </span>
          <Link href="/jobs" aria-label={t("dashboard.home.seeAllJobs")} title={t("dashboard.home.seeAllJobs")} className="ds-icon-btn ds-icon-btn-outline">
            <Maximize2 size={15} strokeWidth={2} />
          </Link>
        </div>

        {jobsOuverts.length === 0 ? (
          <div className="ds-card ds-empty">
            <span className="ds-empty-title">{t("dashboard.home.noActiveJobs")}</span>
            <Link href="/jobs/nouveau" className="ds-btn ds-btn-primary ds-btn-md" style={{ marginTop: 8 }}>
              <Plus size={15} strokeWidth={2.2} /> {t("dashboard.nav.newJob")}
            </Link>
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th scope="col">{h("colJob")}</th>
                  {colonnes.map((c) => <th key={c} scope="col" style={{ width: 96, textAlign: "right" }}>{h(`col.${c}`)}</th>)}
                  <th scope="col" style={{ width: 44 }}><span className="sr-only">{h("copyLink")}</span></th>
                </tr>
              </thead>
              <tbody>
                {jobsOuverts.map((job) => {
                  const e = entonnoir(job.candidates || []);
                  const pct = e.invites ? Math.round((e.termines / e.invites) * 100) : 0;
                  return (
                    <tr key={job.id}>
                      <th scope="row">
                        <Link href={`/jobs/${job.id}`} style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>
                            <span className="ds-square" style={{ background: jobDot(job.id) }} />
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title || t("dashboard.jobs.untitled")}</span>
                          </span>
                          <span style={{ fontSize: 12, color: "var(--ds-ink-4)", paddingLeft: 16 }}>
                            {h("createdOn", { date: formatDateShort(job.created_at, locale) })}
                            {e.invites > 0 && ` · ${h("completionRate", { pct })}`}
                          </span>
                        </Link>
                      </th>
                      {colonnes.map((c) => (
                        <td key={c} className="ds-mono" style={{ textAlign: "right", fontSize: 14, color: e[c] ? (c === "aDecider" ? "var(--ds-amber-ink)" : "var(--ds-ink)") : "var(--ds-ink-5)", fontWeight: c === "aDecider" && e[c] ? 600 : 400 }}>
                          {e[c]}
                        </td>
                      ))}
                      <td><CopyJobLink jobId={job.id} style={{ width: 30, height: 30 }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch", padding: "18px 20px 24px" }}>

        {/* ── À décider / Derniers arrivés ── */}
        <section aria-labelledby="ds-candidats" className="ds-card" style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minHeight: 32, padding: "14px 14px 10px 16px" }}>
            <h2 id="ds-candidats" className="ds-h2">{t("dashboard.home.candidates")}</h2>
            <div role="radiogroup" aria-label={t("dashboard.home.candidates")} className="ds-seg" style={{ height: 30 }}>
              {[["aDecider", h("toDecideTab", { count: aDecider.length })], ["derniers", h("latestTab")]].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={liste === v} className="ds-seg-item" style={{ height: 24, fontSize: 12 }} onClick={() => setListe(v)}>{l}</button>
              ))}
            </div>
          </div>
          {listeAffichee.length === 0 ? (
            <div className="ds-empty" style={{ flex: 1 }}>{liste === "aDecider" ? h("noneToDecide") : t("dashboard.home.noCandidates")}</div>
          ) : (
            <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none", display: "flex", flexDirection: "column" }}>
              {listeAffichee.map((c) => <LigneCandidat key={c.id} c={c} />)}
            </ul>
          )}
          {liste === "aDecider" && aDecider.length > NB_CANDIDATS && (
            <Link href="/candidats?filtre=adecider" className="ds-link" style={{ padding: "0 16px 14px", fontSize: 13 }}>{h("seeAllToDecide", { count: aDecider.length })}</Link>
          )}
        </section>

        {/* ── Activité ── */}
        <section aria-labelledby="ds-activite" className="ds-card" style={{ flex: "2 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14, padding: "14px 16px 16px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <h2 id="ds-activite" className="ds-h2">{mois ? t("dashboard.home.activityMonth") : t("dashboard.home.activityWeek")}</h2>
            <span style={{ display: "flex", alignItems: "center", height: 32, borderRadius: 9, border: "1px solid var(--ds-line)", fontSize: 13, color: "var(--ds-ink-2)", overflow: "hidden" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, height: "100%", padding: "0 4px 0 10px", borderRight: "1px solid var(--ds-line)" }}>
                <Calendar size={14} strokeWidth={1.8} />
                <span className="sr-only">{t("dashboard.home.period")}</span>
                <Select value={periode} onChange={(e) => { setPeriode(e.target.value); setJourActif(null); }} style={{ border: 0, background: "transparent", font: "inherit", color: "var(--ds-ink)", paddingRight: 2, outline: 0 }}>
                  <option value="week">{t("dashboard.home.week")}</option>
                  <option value="month">{t("dashboard.home.month")}</option>
                </Select>
              </label>
              <span style={{ padding: "0 10px" }}>{plage}</span>
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span className="ds-stat">{totalTermines}</span>
              <span style={{ color: "var(--ds-ink-3)" }}>
                {mois ? t("dashboard.home.completedThisMonth", { count: totalTermines }) : t("dashboard.home.completedThisWeek", { count: totalTermines })}
              </span>
            </span>
            <span style={{ display: "flex", gap: 14, fontSize: 13, color: "var(--ds-ink-2)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ds-blue-light)" }} />{t("dashboard.home.legendInvited")}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ds-blue)" }} />{t("dashboard.home.legendCompleted")}</span>
            </span>
          </div>

          <div role="img" aria-label={activite.map((a) => t("dashboard.home.chartDay", { day: fmtLong.format(a.date), inv: a.inv, done: a.done })).join(" ; ")} style={{ display: "flex", flexDirection: "column", gap: 8 }} onMouseLeave={() => setJourActif(null)}>
            <div style={{ position: "relative", height: 210 }}>
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <span style={{ borderTop: "1px dashed #E6EAF2" }} />
                <span style={{ borderTop: "1px dashed #E6EAF2" }} />
                <span style={{ borderTop: "1px dashed #E6EAF2" }} />
                <span style={{ borderTop: "1px solid #DDE2EC" }} />
              </div>
              <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${activite.length}, minmax(0, 1fr))` }}>
                {activite.map((a, i) => {
                  const actif = i === indexActif;
                  return (
                    <div key={cleJour(a.date)} onMouseEnter={() => setJourActif(i)} style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "flex-end", height: "100%", borderRadius: "8px 8px 0 0", background: actif ? "var(--ds-blue-06)" : "transparent" }}>
                      {actif && (
                        <span style={{ position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 1, whiteSpace: "nowrap", padding: "5px 9px", borderRadius: 8, background: "#FFFFFF", border: "1px solid var(--ds-line)", boxShadow: "var(--ds-shadow-pop)", fontSize: 12, color: "var(--ds-ink-2)" }}>
                          <span style={{ fontWeight: 600, color: "var(--ds-ink)" }}>{majuscule(fmtLong.format(a.date))}</span>
                          {" · "}{t("dashboard.home.tooltip", { inv: a.inv, done: a.done })}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}>
                        <span style={{ width: largeurBarre, borderRadius: "4px 4px 0 0", height: `${(a.inv / max) * 100}%`, minHeight: a.inv ? 4 : 0, background: "var(--ds-blue-light)" }} />
                        <span style={{ width: largeurBarre, borderRadius: "4px 4px 0 0", height: `${(a.done / max) * 100}%`, minHeight: a.done ? 4 : 0, background: "var(--ds-blue)" }} />
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: `repeat(${activite.length}, minmax(0, 1fr))`, fontSize: 12, color: "var(--ds-ink-3)", textAlign: "center" }}>
              {activite.map((a, i) => (
                <span key={cleJour(a.date)} style={i === indexActif && !mois ? { color: "var(--ds-ink)", fontWeight: 600 } : undefined}>{etiquette(a.date, i)}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
