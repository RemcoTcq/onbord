"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { Plus, Briefcase, Send, ArrowLeft, Loader2, FileText, X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoleQuick } from "@/lib/actions/job";
import { useToast } from "@/components/ui/Toast";
import ExperienceChatScreen from "@/components/assessment/ExperienceChatScreen";
import PageHeader from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/experience/ui";

// Couleurs figées, libellés résolus au rendu : les statuts sont les valeurs
// stockées dans experiences.status et ne changent pas de langue.
const STATUS_STYLE = {
  draft: { bg: "#f1f5f9", color: "#475569" },
  pending_review: { bg: "#fef3c7", color: "#92400e" },
  published: { bg: "#dcfce7", color: "#166534" },
  archived: { bg: "#f1f5f9", color: "#94a3b8" },
};


export default function AssessmentsHubPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [jobs, setJobs] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  const [prompt, setPrompt] = useState("");
  // liste (accueil de la section, comme les autres menus) | create (écran de
  // lancement du chat) | chat. Le chat n'est plus l'écran par défaut : on y
  // entre par une action explicite du recruteur.
  const [mode, setMode] = useState("list");
  const [selectedJob, setSelectedJob] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [search, setSearch] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newRoleOpen, setNewRoleOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setFirstName(user?.user_metadata?.first_name || "");
    const [{ data: js }, { data: exps }] = await Promise.all([
      supabase.from("jobs").select("id, title, extracted_criteria").order("created_at", { ascending: false }),
      supabase.from("experiences").select("id, status, version, created_at, job_id, jobs(title)").order("created_at", { ascending: false }),
    ]);
    setJobs(js || []);
    setExperiences(exps || []);
    setLoading(false);
  }

  // Ouvre le chat sur un poste (contexte offre + entreprise chargé côté serveur).
  function openChatForJob(job, withPrompt = "") {
    setSelectedJob(job);
    setInitialPrompt(withPrompt || "");
    setMode("chat");
    setPickerOpen(false);
    setNewRoleOpen(false);
  }

  // Envoi depuis le champ central : il faut un poste → on passe par le sélecteur.
  function handleSend() {
    if (!prompt.trim()) return;
    setPickerOpen(true); // choisir le poste, puis le chat démarre avec ce prompt
  }

  function handleGenerated() {
    toast(t("dashboard.experiences.generated"));
    if (selectedJob?.id) router.push(`/jobs/${selectedJob.id}/experience`);
  }

  // ─── Mode chat ───
  // Plein écran, dans le même écran partagé que la conception depuis une offre.
  if (mode === "chat" && selectedJob) {
    return (
      <ExperienceChatScreen
        jobId={selectedJob.id}
        jobData={selectedJob}
        title={selectedJob.title}
        backLabel={t("dashboard.jobDetail.back")}
        onBack={() => { setMode("list"); setSelectedJob(null); setInitialPrompt(""); setPrompt(""); load(); }}
        initialPrompt={initialPrompt}
        onGenerated={handleGenerated}
      />
    );
  }

  // ─── Liste (accueil de la section) ───
  // Même mise en page que les autres menus de la plateforme : en-tête +
  // action à droite, puis la liste. Le chat n'est plus ici.
  if (mode === "list") {
    const filtered = experiences.filter((e) =>
      !search || (e.jobs?.title || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
      <>
        <PageHeader
          title={t("dashboard.experiences.title")}
          actions={
            <button type="button" onClick={() => setMode("create")} className="ds-btn ds-btn-primary">
              <Plus size={15} strokeWidth={2.2} /> {t("dashboard.experiences.create")}
            </button>
          }
        />
        <div className="ds-body">
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <p className="ds-sub">{t("dashboard.experiences.subtitle")}</p>
            <label className="ds-search" style={{ minWidth: 260 }}>
              <Search size={15} strokeWidth={2} />
              <span className="sr-only">{t("dashboard.experiences.search")}</span>
              <input type="search" placeholder={t("dashboard.experiences.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>

          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
              <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="ds-card ds-empty">
              <FileText size={22} />
              <span className="ds-empty-title">{experiences.length === 0 ? t("dashboard.experiences.none") : t("dashboard.experiences.noResults")}</span>
              <span>{experiences.length === 0 ? t("dashboard.experiences.noneHelp") : t("dashboard.experiences.noResultsHelp")}</span>
            </div>
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} onClick={() => router.push(`/jobs/${e.job_id}/experience`)} style={{ cursor: "pointer" }}>
                      <th scope="row">
                        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                          <span className="ds-icon-tile ds-icon-tile-soft"><FileText size={14} /></span>
                          <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontWeight: 500, color: "var(--ds-ink)", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {e.jobs?.title || t("dashboard.experiences.jobDeleted")}
                            </span>
                            <span style={{ fontSize: 12, color: "var(--ds-ink-4)" }}>{t("dashboard.experiences.version", { n: e.version })}</span>
                          </span>
                        </span>
                      </th>
                      <td style={{ width: 160 }}><StatusBadge status={e.status in STATUS_STYLE ? e.status : "draft"} /></td>
                      <td className="ds-num" style={{ width: 120 }}>{formatDateShort(e.created_at, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── Création : écran de lancement du chat (inchangé, seulement déplacé
  // derrière le bouton "Créer une expérience candidat"). ───
  return (
    <>
      <PageHeader
        title={t("dashboard.experiences.create")}
        actions={
          <button type="button" onClick={() => { setMode("list"); setPrompt(""); }} className="ds-btn ds-btn-ghost">
            <ArrowLeft size={15} /> {t("dashboard.jobDetail.back")}
          </button>
        }
      />
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 20px 40px" }}>
        <div style={{ width: "100%", maxWidth: 780, display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 style={{ margin: 0, fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", textAlign: "center" }}>
            {firstName ? t("dashboard.experiences.readyName", { name: firstName }) : t("dashboard.experiences.ready")}
          </h2>

          {/* Champ central type chat */}
          <div className="ds-panel" style={{ gap: 0, borderRadius: 16, boxShadow: "0 1px 2px rgba(20,32,74,0.04), 0 12px 32px rgba(20,32,74,0.05)" }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={t("dashboard.experiences.whichExperience")}
              aria-label={t("dashboard.experiences.whichExperience")}
              rows={3}
              style={{ width: "100%", border: 0, outline: 0, resize: "none", padding: "14px 16px", font: "inherit", fontSize: 15, lineHeight: 1.55, background: "transparent", color: "var(--ds-ink)" }}
            />
            <div className="ds-inset" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 8px 12px", borderRadius: 11 }}>
              <button type="button" onClick={() => setPickerOpen(true)} title={t("dashboard.experiences.attachJob")} aria-label={t("dashboard.experiences.attachJob")} className="ds-icon-btn ds-icon-btn-outline" style={{ background: "#FFFFFF" }}>
                <Plus size={17} />
              </button>
              <button type="button" onClick={handleSend} disabled={!prompt.trim()} aria-label={t("dashboard.experienceEditor.stepChat.send")} className="ds-btn ds-btn-primary" style={{ width: 36, padding: 0 }}>
                <Send size={15} />
              </button>
            </div>
          </div>

          <p className="ds-sub" style={{ textAlign: "center" }}>{t("dashboard.experiences.attachJobHelp")}</p>

          {/* Deux cartes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            <button type="button" onClick={() => setPickerOpen(true)} className="ds-card ds-card-pad" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--ds-ink)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="ds-icon-tile ds-icon-tile-soft" style={{ marginBottom: 6 }}><Briefcase size={14} /></span>
              <span style={{ fontWeight: 500 }}>{t("dashboard.experiences.existingJob")}</span>
              <span className="ds-sub">{t("dashboard.experiences.existingJobHelp")}</span>
            </button>
            <button type="button" onClick={() => setNewRoleOpen(true)} className="ds-card ds-card-pad" style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "var(--ds-ink)", display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="ds-icon-tile ds-icon-tile-soft" style={{ marginBottom: 6 }}><Plus size={14} /></span>
              <span style={{ fontWeight: 500 }}>{t("dashboard.experiences.newJob")}</span>
              <span className="ds-sub">{t("dashboard.experiences.newJobHelp")}</span>
            </button>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <JobPicker jobs={jobs} onClose={() => setPickerOpen(false)} onPick={(job) => openChatForJob(job, prompt)} />
      )}
      {newRoleOpen && (
        <NewRoleModal onClose={() => setNewRoleOpen(false)} onCreated={(job) => openChatForJob(job, prompt)} toast={toast} />
      )}
    </>
  );
}

// ─── Sélecteur de poste existant ─────────────────────────────────────────────
function JobPicker({ jobs, onClose, onPick }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const filtered = jobs.filter((j) => (j.title || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title={t("dashboard.experiences.chooseJob")} onClose={onClose}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("dashboard.experiences.search")} autoFocus className="ds-input" aria-label={t("dashboard.experiences.search")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p className="ds-empty" style={{ padding: 16 }}>{t("dashboard.experiences.noJobYet")}</p>
        ) : filtered.map((j) => (
          <button key={j.id} type="button" onClick={() => onPick(j)} className="ds-row-link"
            style={{ border: "1px solid var(--ds-line)", background: "#FFFFFF", font: "inherit", textAlign: "left", cursor: "pointer" }}>
            <Briefcase size={15} style={{ color: "var(--ds-ink-4)" }} />
            <span style={{ fontWeight: 500 }}>{j.title || t("dashboard.experiences.untitled")}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ─── Création rapide d'un poste ──────────────────────────────────────────────
function NewRoleModal({ onClose, onCreated, toast }) {
  const { t, locale } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim() && description.trim().length < 50) {
      toast(t("dashboard.experiences.jobTitleRequired"), "error");
      return;
    }
    setSaving(true);
    const res = await createRoleQuick(title, description);
    setSaving(false);
    if (res.success) { toast(t("dashboard.experiences.jobCreated")); onCreated(res.job); }
    else toast(res.error || t("dashboard.experiences.error"), "error");
  }

  return (
    <Modal title={t("dashboard.experiences.newJob")} onClose={onClose}>
      <label style={labelS}>{t("dashboard.experiences.jobTitle")}</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("dashboard.experiences.titlePlaceholder")} autoFocus
        style={inputS} />
      <label style={{ ...labelS, marginTop: 12 }}>{t("dashboard.experiences.jobDescription")}</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
        placeholder={t("dashboard.experiences.jobDescriptionPlaceholder")} style={{ ...inputS, resize: "vertical", lineHeight: 1.5 }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button type="button" onClick={onClose} className="ds-btn ds-btn-ghost">{t("common.actions.cancel")}</button>
        <button type="button" onClick={submit} disabled={saving} className="ds-btn ds-btn-primary">
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          {t("dashboard.experiences.createAndContinue")}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  const { t } = useI18n();
  return (
    <div className="ds-overlay" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="ds-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ds-modal-head">
          <h3 className="ds-h2">{title}</h3>
          <button type="button" onClick={onClose} className="ds-icon-btn ds-icon-btn-outline" aria-label={t("common.actions.close")}><X size={16} /></button>
        </div>
        <div className="ds-modal-body" style={{ gap: 10 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const labelS = { display: "block", fontSize: 12, fontWeight: 500, color: "var(--ds-ink-2)", marginBottom: 2 };
const inputS = { width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--ds-line)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "#FFFFFF", color: "var(--ds-ink)" };
