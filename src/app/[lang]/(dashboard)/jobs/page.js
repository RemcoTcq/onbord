"use client";

import { useState, useEffect } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { Briefcase, Loader2, Trash2, MapPin, Users, Plus, Search, MessageSquare, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { deleteJob, listDeletedJobs, restoreJob, purgeJobNow } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";

export default function JobsPage() {
  const { t, locale } = useI18n();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [restoringId, setRestoringId] = useState(null);
  const [purgingId, setPurgingId] = useState(null);
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => { loadJobs(); }, []);

  async function loadJobs() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("jobs")
        .select("*, candidates(id, status, score_cv)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setJobs(data);

      // La corbeille ne peut PAS venir de la requête ci-dessus : la policy de
      // lecture exclut les offres supprimées, quel que soit le filtre demandé.
      // Elle passe par une action serveur (cf. migration 024).
      const res = await listDeletedJobs();
      if (res.success) setDeletedJobs(res.jobs);
    }
    setLoading(false);
  }

  async function handleRestore(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    setRestoringId(jobId);
    const res = await restoreJob(jobId);
    if (res.success) {
      const reste = deletedJobs.filter(j => j.id !== jobId);
      setDeletedJobs(reste);
      if (reste.length === 0) setTab("active");
      await loadJobs();
      toast(t("dashboard.jobs.restored"));
    } else {
      toast(res.error || t("dashboard.jobs.restoreError"), "error");
    }
    setRestoringId(null);
  }

  // Effacement définitif demandé depuis la corbeille : on court-circuite le
  // délai de 7 jours. Rien ne sera restaurable ensuite — d'où la confirmation
  // explicite, plus alarmante que celle de la mise en corbeille.
  async function handlePurge(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("dashboard.jobs.purgeNowConfirm"))) return;
    setPurgingId(jobId);
    const res = await purgeJobNow(jobId);
    if (res.success) {
      const reste = deletedJobs.filter(j => j.id !== jobId);
      setDeletedJobs(reste);
      if (reste.length === 0) setTab("active");
      toast(t("dashboard.jobs.purged"));
    } else {
      toast(res.error || t("dashboard.jobs.purgeError"), "error");
    }
    setPurgingId(null);
  }

  async function handleDelete(e, jobId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t("dashboard.jobs.deleteConfirm"))) return;
    setDeletingId(jobId);
    try {
      const res = await deleteJob(jobId);
      if (res.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
        await loadJobs(); // recharge la corbeille, où l'offre vient d'atterrir
        toast(`Offre déplacée dans la corbeille — restaurable ${res.delaiJours} jours`);
      } else {
        toast(res.error || t("dashboard.jobs.deleteError"), "error");
      }
    } catch (err) {
      toast(t("dashboard.jobs.deleteError"), "error");
    }
    setDeletingId(null);
  }

  const filteredJobs = jobs.filter(j => {
    const matchTab = tab === "active" ? j.status === "active" : j.status === "draft";
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const activeJobs = jobs.filter(j => j.status === "active");
  const allCandidates = activeJobs.flatMap(j => j.candidates || []);
  const interviewsDone = allCandidates.filter(c => c.status === "interview_completed").length;
  const draftsCount = jobs.filter(j => j.status === "draft").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={24} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--foreground)", letterSpacing: "-0.02em" }}>{t("dashboard.jobs.title")}</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "2px" }}>{t("dashboard.jobs.subtitle")}</p>
        </div>
        <Link href="/jobs/nouveau" className="btn btn-primary" style={{ textDecoration: "none" }}>
          <Plus size={15} />
          {t("dashboard.nav.newJob")}
        </Link>
      </div>



      {/* Tabs + Search */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none", gap: "0" }}>
          <button
            className={`tab ${tab === "active" ? "active" : ""}`}
            onClick={() => setTab("active")}
            style={{ borderBottom: tab === "active" ? "2px solid var(--foreground)" : "2px solid transparent" }}
          >
            {t("dashboard.jobs.tabActive")} {activeJobs.length > 0 && <span style={{ marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}>({activeJobs.length})</span>}
          </button>
          <button
            className={`tab ${tab === "drafts" ? "active" : ""}`}
            onClick={() => setTab("drafts")}
            style={{ borderBottom: tab === "drafts" ? "2px solid var(--foreground)" : "2px solid transparent" }}
          >
            {t("dashboard.jobs.tabDrafts")} {draftsCount > 0 && <span style={{ marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}>({draftsCount})</span>}
          </button>
          {deletedJobs.length > 0 && (
            <button
              className={`tab ${tab === "trash" ? "active" : ""}`}
              onClick={() => setTab("trash")}
              style={{ borderBottom: tab === "trash" ? "2px solid var(--foreground)" : "2px solid transparent" }}
            >
              {t("dashboard.jobs.tabTrash")} <span style={{ marginLeft: "4px", color: "var(--muted-foreground)", fontSize: "12px" }}>({deletedJobs.length})</span>
            </button>
          )}
        </div>
        <div style={{ position: "relative", width: "220px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            type="text"
            className="input-field"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: "32px", fontSize: "12px" }}
          />
        </div>
      </div>

      <div style={{ height: "1px", background: "var(--border)", marginTop: "-16px" }} />

      {/* Corbeille : offres supprimées, encore restaurables */}
      {tab === "trash" ? (
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", background: "var(--muted)", fontSize: "12px", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>
            {t("dashboard.jobs.trashNotice")}
          </div>
          {deletedJobs.map(job => (
            <div
              key={job.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: "12px", padding: "12px 14px", borderBottom: "1px solid var(--border)",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {job.title || t("dashboard.jobs.untitled")}
                </div>
                <div style={{ fontSize: "12px", color: job.joursRestants <= 1 ? "var(--destructive)" : "var(--muted-foreground)" }}>
                  {job.joursRestants === 0
                    ? t("dashboard.jobs.purgeSoon")
                    : t("dashboard.jobs.purgeIn", { count: job.joursRestants })}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <button
                  onClick={(e) => handleRestore(e, job.id)}
                  disabled={purgingId === job.id}
                  className="btn btn-ghost btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap" }}
                >
                  {restoringId === job.id
                    ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    : <RotateCcw size={14} />}
                  {t("dashboard.jobs.restore")}
                </button>
                <button
                  onClick={(e) => handlePurge(e, job.id)}
                  disabled={purgingId === job.id || restoringId === job.id}
                  className="btn btn-ghost btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", whiteSpace: "nowrap", color: "var(--destructive)" }}
                >
                  {purgingId === job.id
                    ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                    : <Trash2 size={14} />}
                  {t("dashboard.jobs.purgeNow")}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginBottom: "6px" }}>
            {tab === "active" ? t("dashboard.jobs.noActiveJobs") : t("dashboard.jobs.noDrafts")}
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "20px" }}>
            {tab === "active" ? t("dashboard.jobs.createFirst") : t("dashboard.jobs.draftsAppearHere")}
          </p>
          {tab === "active" && (
            <Link href="/jobs/nouveau" className="btn btn-primary" style={{ textDecoration: "none" }}>
              <Plus size={14} /> {t("dashboard.jobs.create")}
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          {filteredJobs.map(job => {
            const candidateCount = job.candidates?.length || 0;
            const isDeleting = deletingId === job.id;
            return (
              <div
                key={job.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 20px", background: "var(--card)",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                  transition: "background 100ms ease",
                  opacity: isDeleting ? 0.5 : 1,
                  pointerEvents: isDeleting ? "none" : "auto"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "4px",
                    background: tab === "active" ? "var(--foreground)" : "var(--secondary)",
                    color: tab === "active" ? "var(--background)" : "var(--muted-foreground)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                  }}>
                    <Briefcase size={14} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {job.title || t("dashboard.jobs.untitledShort")}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                      {job.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                          <MapPin size={11} /> {job.location}
                        </span>
                      )}
                      {job.contract_type && (
                        <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                          {job.contract_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                    <Users size={12} /> {candidateCount}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                    {formatDateShort(job.created_at, locale)}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, job.id)}
                    title={t("dashboard.jobs.delete")}
                    style={{
                      background: "transparent", border: "none", padding: "4px",
                      color: "var(--muted-foreground)", cursor: "pointer",
                      borderRadius: "2px", transition: "all 120ms", display: "flex"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "#fee2e2"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    {isDeleting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
