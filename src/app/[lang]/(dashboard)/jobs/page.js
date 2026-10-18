"use client";

import { useState, useEffect, useRef } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { Loader2, Trash2, Plus, Search, MoreHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { deleteJob } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";
import PageHeader from "@/components/layout/PageHeader";
import { useShell } from "@/components/layout/ShellContext";
import CopyJobLink from "@/components/jobs/CopyJobLink";
import { jobDot } from "@/components/ui/ds";

// Onglets de la maquette. La corbeille n'a plus d'écran : un job supprimé reste
// effacé automatiquement au bout du délai (cron de purge, migration 024).
const ONGLETS = [
  { id: "active", label: "dashboard.jobs.tabOpen", vide: "dashboard.jobs.noActiveJobs", aide: "dashboard.jobs.createFirst", pied: "dashboard.jobs.footerOpen" },
  { id: "draft", label: "dashboard.jobs.tabDrafts", vide: "dashboard.jobs.noDrafts", aide: "dashboard.jobs.draftsAppearHere", pied: "dashboard.jobs.footerDrafts" },
  { id: "closed", label: "dashboard.jobs.tabClosed", vide: "dashboard.jobs.noClosed", aide: "dashboard.jobs.closedAppearHere", pied: "dashboard.jobs.footerClosed" },
];

function aTermine(c) {
  return !!c.assessment_submitted_at || c.score_global != null;
}

function metaJob(t, job) {
  const mode = { remote: "remote", hybrid: "hybrid", onsite: "fullTime" }[job.work_mode];
  return [job.location, job.contract_type, mode && t(`dashboard.jobDetail.workMode.${mode}`)].filter(Boolean).join(" · ");
}

/** Menu « plus d'actions » d'une ligne. Une seule action aujourd'hui : supprimer. */
function ActionsJob({ job, onDelete, busy }) {
  const { t } = useI18n();
  // Position en `fixed`, calée sur le bouton : le tableau défile en largeur et
  // couperait un menu en `absolute` sous la dernière ligne.
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const open = !!pos;

  useEffect(() => {
    if (!open) return;
    const fermer = (e) => { if (ref.current && !ref.current.contains(e.target)) setPos(null); };
    const quitter = () => setPos(null);
    document.addEventListener("mousedown", fermer);
    window.addEventListener("scroll", quitter, true);
    return () => {
      document.removeEventListener("mousedown", fermer);
      window.removeEventListener("scroll", quitter, true);
    };
  }, [open]);

  function basculer(e) {
    if (open) { setPos(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  return (
    <span ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="ds-icon-btn"
        aria-label={t("dashboard.jobs.moreActionsFor", { title: job.title || t("dashboard.jobs.untitled") })}
        title={t("dashboard.jobs.moreActions")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={basculer}
      >
        {busy ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <MoreHorizontal size={16} strokeWidth={2} />}
      </button>
      {open && (
        <div role="menu" className="ds-menu" style={{ position: "fixed", top: pos.top, right: pos.right, minWidth: 180 }}>
          <button type="button" role="menuitem" className="ds-menu-item is-danger" onClick={(e) => { setPos(null); onDelete(e, job.id); }}>
            <Trash2 size={15} strokeWidth={1.8} /> {t("dashboard.jobs.delete")}
          </button>
        </div>
      )}
    </span>
  );
}

export default function JobsPage() {
  const { t, locale } = useI18n();
  const { refreshJobs } = useShell();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState("recent");
  const { toast } = useToast();

  async function loadJobs() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("jobs")
        .select("*, candidates(id, status, score_cv, score_global, assessment_submitted_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setJobs(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadJobs(); }, []);

  async function handleDelete(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("dashboard.jobs.deleteConfirm"))) return;
    setDeletingId(jobId);
    try {
      const res = await deleteJob(jobId);
      if (res.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        refreshJobs();
        toast(t("dashboard.jobs.deleted"));
      } else {
        toast(res.error || t("dashboard.jobs.deleteError"), "error");
      }
    } catch (err) {
      toast(t("dashboard.jobs.deleteError"), "error");
    }
    setDeletingId(null);
  }

  const compte = (id) => jobs.filter(j => j.status === id).length;
  const onglet = ONGLETS.find(o => o.id === tab);

  const terme = search.trim().toLowerCase();
  const filteredJobs = jobs
    .filter(j => j.status === tab && (!terme || (j.title || "").toLowerCase().includes(terme)))
    .sort((a, b) => {
      if (tri === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      if (tri === "candidates") return (b.candidates?.length || 0) - (a.candidates?.length || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const header = (
    <PageHeader
      title={t("dashboard.nav.jobs")}
      actions={
        <Link href="/jobs/nouveau" className="ds-btn ds-btn-primary">
          <Plus size={15} strokeWidth={2.2} /> {t("dashboard.nav.newJob")}
        </Link>
      }
    />
  );

  if (loading) {
    return (
      <>
        {header}
        <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
          <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="ds-body">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div role="tablist" aria-label={t("dashboard.jobs.filterLabel")} className="ds-seg">
            {ONGLETS.map(o => {
              const n = compte(o.id);
              return (
                <button key={o.id} type="button" role="tab" aria-selected={tab === o.id} onClick={() => setTab(o.id)} className="ds-seg-item">
                  {t(o.label)}
                  {n > 0 && <span className="ds-seg-count">{n}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <label className="ds-search" style={{ minWidth: 240 }}>
              <Search size={15} strokeWidth={2} />
              <span className="sr-only">{t("dashboard.jobs.filterLabel")}</span>
              <input type="search" placeholder={t("dashboard.jobs.filterLabel")} value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            <label className="ds-sort">
              {t("dashboard.jobs.sort")}
              <select value={tri} onChange={e => setTri(e.target.value)}>
                <option value="recent">{t("dashboard.jobs.sortRecent")}</option>
                <option value="oldest">{t("dashboard.jobs.sortOldest")}</option>
                <option value="candidates">{t("dashboard.jobs.sortCandidates")}</option>
              </select>
            </label>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="ds-card ds-empty">
            <span className="ds-empty-title">{terme ? t("dashboard.search.noResults") : t(onglet.vide)}</span>
            {!terme && <span>{t(onglet.aide)}</span>}
            {!terme && tab === "active" && (
              <Link href="/jobs/nouveau" className="ds-btn ds-btn-primary ds-btn-md" style={{ marginTop: 10 }}>
                <Plus size={15} strokeWidth={2.2} /> {t("dashboard.nav.newJob")}
              </Link>
            )}
          </div>
        ) : (
          <div className="ds-table-wrap">
            <table className="ds-table" style={{ minWidth: 660 }}>
              <thead>
                <tr>
                  <th scope="col">{t("dashboard.jobs.colJob")}</th>
                  <th scope="col" style={{ width: 110 }}>{t("dashboard.jobs.colCreated")}</th>
                  <th scope="col" style={{ width: 120 }}>{t("dashboard.jobs.colCandidates")}</th>
                  <th scope="col" className="ds-num" style={{ width: 150 }}>{t("dashboard.jobs.colCompleted")}</th>
                  <th scope="col" style={{ width: 84 }}><span className="sr-only">{t("dashboard.jobs.colActions")}</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map(job => {
                  const cands = job.candidates || [];
                  const termines = cands.filter(aTermine).length;
                  const pct = cands.length ? Math.round((termines / cands.length) * 100) : 0;
                  const meta = metaJob(t, job);
                  return (
                    <tr key={job.id} style={{ opacity: deletingId === job.id ? 0.5 : 1 }}>
                      <th scope="row">
                        <Link href={`/jobs/${job.id}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--ds-ink)", fontSize: 14 }}>
                            <span className="ds-square" style={{ background: jobDot(job.id) }} />
                            {job.title || t("dashboard.jobs.untitled")}
                          </span>
                          {meta && <span style={{ fontSize: 13, color: "var(--ds-ink-3)", paddingLeft: 16 }}>{meta}</span>}
                        </Link>
                      </th>
                      <td>{formatDateShort(job.created_at, locale)}</td>
                      <td><span className="ds-chip">{t("dashboard.home.candidatesCount", { count: cands.length })}</span></td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
                          <span className="ds-meter" style={{ width: 56, height: 5, background: "#E6EBF4" }}><span style={{ width: `${pct}%` }} /></span>
                          <span className="ds-mono" style={{ fontWeight: 500, minWidth: 28, textAlign: "right", color: "var(--ds-ink)" }}>{termines}/{cands.length}</span>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
                          {job.status === "active" && <CopyJobLink jobId={job.id} />}
                          <ActionsJob job={job} onDelete={handleDelete} busy={deletingId === job.id} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredJobs.length > 0 && (
          <span style={{ fontSize: 13, color: "var(--ds-ink-4)" }}>{t(onglet.pied, { count: filteredJobs.length })}</span>
        )}
      </div>
    </>
  );
}
