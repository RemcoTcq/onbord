"use client";

import { useState, useEffect, useMemo } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { Plus, Briefcase, Users, CircleArrowUp, Maximize2, ChevronRight, Calendar, Loader2 } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";
import CopyJobLink from "@/components/jobs/CopyJobLink";
import { jobDot, scoreTone, initials, candidateStatusLabel } from "@/components/ui/ds";

const NB_JOBS = 4;
const NB_CANDIDATS = 5;
const SEUIL_CREDITS_BAS = 10;

/** Un candidat a-t-il terminé sa simulation ? */
function aTermine(c) {
  return !!c.assessment_submitted_at || c.score_global != null;
}

/** Libellé de lieu d'un job : « Gent · CDI · Hybride ». */
function metaJob(t, job) {
  const mode = { remote: "remote", hybrid: "hybrid", onsite: "fullTime" }[job.work_mode];
  return [job.location, job.contract_type, mode && t(`dashboard.jobDetail.workMode.${mode}`)].filter(Boolean).join(" · ");
}

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

export default function Accueil() {
  const { t, locale } = useI18n();
  const { user } = useShell();
  const [jobs, setJobs] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState("week");
  const [jourActif, setJourActif] = useState(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const [credits, { data }] = await Promise.all([
        getUserCreditInfo(),
        supabase
          .from("jobs")
          .select("id, title, status, location, contract_type, work_mode, created_at, candidates(id, first_name, last_name, email, status, score_global, created_at, assessment_submitted_at)")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false }),
      ]);
      setUsage(credits);
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
  const derniersCandidats = useMemo(
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
        <PageHeader title={t("dashboard.nav.home")} />
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  const illimite = !!usage?.illimite;
  const total = usage?.credits_allocated ?? 0;
  const restants = usage?.credits_balance ?? 0;
  const utilises = Math.max(0, total - restants);
  const pctUtilises = total > 0 ? Math.min(100, Math.round((utilises / total) * 100)) : 0;

  const prenom = user?.first_name || user?.email?.split("@")[0] || "";

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

  return (
    <>
      <PageHeader
        title={t("dashboard.nav.home")}
        actions={
          <Link href="/jobs/nouveau" className="ds-btn ds-btn-primary">
            <Plus size={15} strokeWidth={2.2} /> {t("dashboard.nav.newJob")}
          </Link>
        }
      />

      {/* ── Chiffres clés ── */}
      <section aria-label={t("dashboard.home.keyFigures")} className="ds-section">
        <span className="ds-chip ds-chip-lg" style={{ alignSelf: "flex-start", height: 30, padding: "0 11px", borderRadius: 8 }}>
          <span className="ds-dot ds-dot-green" style={{ width: 7, height: 7 }} />
          {t("dashboard.home.hello", { name: prenom })}
        </span>
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
              <span className="ds-muted" style={{ fontSize: 12 }}>{t("dashboard.home.inTotal")}</span>
            </span>
          </div>

          <div className="ds-card ds-card-pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 9, fontWeight: 500 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="ds-icon-tile" style={{ background: "#7FA0F0" }}><CircleArrowUp size={13} strokeWidth={2.2} /></span>
                {t("dashboard.home.credits")}
              </span>
              {!illimite && (
                <span className="ds-muted" style={{ fontSize: 12, fontWeight: 400 }}>
                  {t("dashboard.home.creditsUsedOf", { used: utilises, total })}
                </span>
              )}
            </span>
            {illimite ? (
              <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="ds-stat">∞</span>
                <span className="ds-muted" style={{ fontSize: 12 }}>{usage?.planLabel}</span>
              </span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 8, flex: "none" }}>
                  <span className="ds-stat">{restants}</span>
                  <span className="ds-muted" style={{ fontSize: 12 }}>{t("dashboard.home.creditsLeft")}</span>
                </span>
                <span role="meter" aria-label={t("dashboard.home.credits")} aria-valuemin={0} aria-valuemax={total} aria-valuenow={utilises} className="ds-meter" style={{ flex: 1 }}>
                  <span style={{ width: `${pctUtilises}%`, background: restants <= SEUIL_CREDITS_BAS ? "var(--ds-amber)" : undefined }} />
                </span>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Vos jobs ── */}
      <section aria-labelledby="ds-vos-jobs" className="ds-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 id="ds-vos-jobs" className="ds-h2">{t("dashboard.home.yourJobs")}</h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            {jobsOuverts.slice(0, NB_JOBS).map((job) => {
              const cands = job.candidates || [];
              const termines = cands.filter(aTermine).length;
              const pct = cands.length ? Math.round((termines / cands.length) * 100) : 0;
              return (
                <div key={job.id} className="ds-panel">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 7px 0 9px" }}>
                    <Link href={`/jobs/${job.id}`} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
                        <span className="ds-square" style={{ background: jobDot(job.id) }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.title || t("dashboard.jobs.untitled")}</span>
                      </span>
                      <span style={{ fontSize: 13, color: "var(--ds-ink-3)", paddingLeft: 16, minHeight: 19 }}>{metaJob(t, job)}</span>
                    </Link>
                    <CopyJobLink jobId={job.id} style={{ width: 30, height: 30, marginTop: -4 }} />
                  </div>
                  <dl className="ds-inset ds-kv" style={{ padding: 12 }}>
                    <div>
                      <dt>{t("dashboard.home.status")}</dt>
                      <dd className="ds-chip ds-chip-green"><span className="ds-dot ds-dot-green" />{t("dashboard.home.statusOpen")}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.home.candidates")}</dt>
                      <dd className="ds-chip">{t("dashboard.home.candidatesCount", { count: cands.length })}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.home.completed")}</dt>
                      <dd className="ds-chip" style={{ gap: 8 }}>
                        <span className="ds-meter ds-meter-thin" style={{ width: 36 }}><span style={{ width: `${pct}%` }} /></span>
                        {termines}/{cands.length}
                      </dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.home.createdOn")}</dt>
                      <dd className="ds-chip">{formatDateShort(job.created_at, locale)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "stretch", padding: "18px 20px 24px" }}>

        {/* ── Derniers candidats ── */}
        <section aria-labelledby="ds-derniers" className="ds-card" style={{ flex: "1 1 320px", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 32, padding: "14px 14px 10px 16px" }}>
            <h2 id="ds-derniers" className="ds-h2">{t("dashboard.home.latestCandidates")}</h2>
          </div>
          {derniersCandidats.length === 0 ? (
            <div className="ds-empty" style={{ flex: 1 }}>{t("dashboard.home.noCandidates")}</div>
          ) : (
            <ul style={{ margin: 0, padding: "0 8px 8px", listStyle: "none", display: "flex", flexDirection: "column" }}>
              {derniersCandidats.map((c) => {
                const nom = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email;
                const tone = scoreTone(c.score_global);
                const rejete = c.status === "rejected" || c.status === "disqualified";
                return (
                  <li key={c.id} style={{ borderTop: "1px solid var(--ds-line-3)" }}>
                    <Link href={`/jobs/${c.job.id}/candidats/${c.id}`} className="ds-row-link">
                      <span className="ds-avatar">{initials(c.first_name, c.last_name, c.email)}</span>
                      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: 500 }}>{nom}</span>
                        <span style={{ fontSize: 12, color: "var(--ds-ink-4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.job.title}{rejete ? ` · ${candidateStatusLabel(t, c.status)}` : ""}
                        </span>
                      </span>
                      <span className={`ds-tag ds-tag-${tone}`}>
                        {c.score_global != null ? `${c.score_global} %` : candidateStatusLabel(t, c.status)}
                      </span>
                      <ChevronRight size={14} strokeWidth={2} color="var(--ds-ink-6)" style={{ flex: "none" }} />
                    </Link>
                  </li>
                );
              })}
            </ul>
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
                <select value={periode} onChange={(e) => { setPeriode(e.target.value); setJourActif(null); }} style={{ border: 0, background: "transparent", font: "inherit", color: "var(--ds-ink)", paddingRight: 2, outline: 0 }}>
                  <option value="week">{t("dashboard.home.week")}</option>
                  <option value="month">{t("dashboard.home.month")}</option>
                </select>
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
