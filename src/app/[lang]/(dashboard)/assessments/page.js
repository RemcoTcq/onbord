"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { Plus, Briefcase, Send, ArrowLeft, Loader2, FileText, X, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createRoleQuick } from "@/lib/actions/job";
import { useToast } from "@/components/ui/Toast";
import AssessmentChatCreator from "@/components/assessment/AssessmentChatCreator";

// Couleurs figées, libellés résolus au rendu : les statuts sont les valeurs
// stockées dans experiences.status et ne changent pas de langue.
const STATUS_STYLE = {
  draft: { bg: "#f1f5f9", color: "#475569" },
  pending_review: { bg: "#fef3c7", color: "#92400e" },
  published: { bg: "#dcfce7", color: "#166534" },
  archived: { bg: "#f1f5f9", color: "#94a3b8" },
};

const statusLabel = (t, status) => t(`dashboard.experienceEditor.status.${status}`);

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
  // Plein écran : le conteneur est fixé au viewport pour échapper au padding et
  // au maxWidth 1200 du layout dashboard. Il démarre après la sidebar (qui reste
  // accessible) et n'est plus enfermé dans une carte.
  if (mode === "chat" && selectedJob) {
    return (
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, left: "var(--sidebar-collapsed-width)",
        display: "flex", flexDirection: "column", background: "var(--background)", zIndex: 30,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={() => { setMode("list"); setSelectedJob(null); setInitialPrompt(""); setPrompt(""); load(); }}
            className="btn btn-ghost btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={16} /> {t("dashboard.jobDetail.back")}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--muted-foreground)", minWidth: 0 }}>
            <Briefcase size={15} style={{ flexShrink: 0 }} />
            <strong style={{ color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedJob.title}</strong>
          </div>
        </div>
        {/* minHeight:0 : sans ça, l'enfant flex ne rétrécit pas et la zone de
            messages déborde au lieu de scroller. */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <AssessmentChatCreator
            standalone context="job"
            jobId={selectedJob.id}
            jobData={selectedJob}
            initialPrompt={initialPrompt}
            onGenerated={handleGenerated}
          />
        </div>
      </div>
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
      <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* En-tête */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--foreground)", letterSpacing: "-0.02em" }}>{t("dashboard.experiences.title")}</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "2px" }}>
              {t("dashboard.experiences.subtitle")}
            </p>
          </div>
          <button onClick={() => setMode("create")} className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <Plus size={15} /> {t("dashboard.experiences.create")}
          </button>
        </div>

        {/* Recherche */}
        <div style={{ position: "relative", maxWidth: "320px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
          <input
            type="text"
            className="input-field"
            placeholder={t("dashboard.experiences.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "32px", fontSize: "12px" }}
          />
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px" }}>
            <Loader2 size={24} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
            <FileText size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 16px" }} />
            <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginBottom: "6px" }}>
              {experiences.length === 0 ? t("dashboard.experiences.none") : t("dashboard.experiences.noResults")}
            </p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              {experiences.length === 0
                ? t("dashboard.experiences.noneHelp")
                : t("dashboard.experiences.noResultsHelp")}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            {filtered.map((e) => {
              const s = STATUS_STYLE[e.status] || STATUS_STYLE.draft;
              return (
                <div
                  key={e.id}
                  onClick={() => router.push(`/jobs/${e.job_id}/experience`)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", background: "var(--card)",
                    borderBottom: "1px solid var(--border)", cursor: "pointer",
                    transition: "background 100ms ease",
                  }}
                  onMouseEnter={(ev) => { ev.currentTarget.style.background = "#fafafa"; }}
                  onMouseLeave={(ev) => { ev.currentTarget.style.background = "var(--card)"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "4px",
                      background: "var(--foreground)", color: "var(--background)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <FileText size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.jobs?.title || t("dashboard.experiences.jobDeleted")}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                          <Briefcase size={10} /> Version {e.version}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: s.bg, color: s.color }}>{statusLabel(t, e.status in STATUS_STYLE ? e.status : "draft")}</span>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {formatDateShort(e.created_at, locale)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── Création : écran de lancement du chat (inchangé, seulement déplacé
  // derrière le bouton "Créer une expérience candidat"). ───
  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>
      <button onClick={() => { setMode("list"); setPrompt(""); }} className="btn btn-ghost btn-sm"
        style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ArrowLeft size={16} /> {t("dashboard.jobDetail.back")}
      </button>

      <h1 style={{ fontSize: "1.9rem", fontWeight: 800, textAlign: "center", marginTop: "3rem", marginBottom: "2rem" }}>
        Prêt(e) quand vous voulez{firstName ? `, ${firstName}` : ""}
      </h1>

      {/* Champ central type chat */}
      <div style={{ border: "1px solid var(--border)", borderRadius: 16, padding: "1rem 1.25rem", background: "var(--card)", boxShadow: "0 4px 16px -8px rgba(0,0,0,0.1)" }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={t("dashboard.experiences.whichExperience")}
          rows={2}
          style={{ width: "100%", border: "none", outline: "none", resize: "none", fontSize: 15, fontFamily: "inherit", background: "transparent", color: "var(--foreground)", lineHeight: 1.5 }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <button onClick={() => setPickerOpen(true)} title={t("dashboard.experiences.attachJob")}
            style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted-foreground)" }}>
            <Plus size={18} />
          </button>
          <button onClick={handleSend} disabled={!prompt.trim()}
            style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "var(--primary)", color: "white", cursor: prompt.trim() ? "pointer" : "not-allowed", opacity: prompt.trim() ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "var(--muted-foreground)", textAlign: "center", margin: "1rem 0 1.5rem" }}>
        {t("dashboard.experiences.attachJobHelp")}
      </p>

      {/* Deux cartes */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button onClick={() => setPickerOpen(true)} className="card"
          style={{ padding: "1.25rem", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--card)" }}>
          <Briefcase size={20} style={{ color: "var(--muted-foreground)", marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t("dashboard.experiences.existingJob")}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{t("dashboard.experiences.existingJobHelp")}</div>
        </button>
        <button onClick={() => setNewRoleOpen(true)} className="card"
          style={{ padding: "1.25rem", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--card)" }}>
          <Plus size={20} style={{ color: "var(--muted-foreground)", marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t("dashboard.experiences.newJob")}</div>
          <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 2 }}>{t("dashboard.experiences.newJobHelp")}</div>
        </button>
      </div>

      {pickerOpen && (
        <JobPicker jobs={jobs} onClose={() => setPickerOpen(false)} onPick={(job) => openChatForJob(job, prompt)} />
      )}
      {newRoleOpen && (
        <NewRoleModal onClose={() => setNewRoleOpen(false)} onCreated={(job) => openChatForJob(job, prompt)} toast={toast} />
      )}
    </div>
  );
}

// ─── Sélecteur de poste existant ─────────────────────────────────────────────
function JobPicker({ jobs, onClose, onPick }) {
  const { t, locale } = useI18n();
  const [q, setQ] = useState("");
  const filtered = jobs.filter((j) => (j.title || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal title={t("dashboard.experiences.chooseJob")} onClose={onClose}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("dashboard.experiences.search")} autoFocus
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, marginBottom: 12, boxSizing: "border-box" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", textAlign: "center", padding: "1rem" }}>{t("dashboard.experiences.noJobYet")}</p>
        ) : filtered.map((j) => (
          <button key={j.id} onClick={() => onPick(j)} className="card"
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "0.75rem 1rem", textAlign: "left", cursor: "pointer", border: "1px solid var(--border)", background: "var(--card)" }}>
            <Briefcase size={15} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{j.title || t("dashboard.experiences.untitled")}</span>
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
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Account Executive B2B" autoFocus
        style={inputS} />
      <label style={{ ...labelS, marginTop: 12 }}>{t("dashboard.experiences.jobDescription")}</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6}
        placeholder={t("dashboard.experiences.jobDescriptionPlaceholder")} style={{ ...inputS, resize: "vertical", lineHeight: 1.5 }} />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button onClick={onClose} className="btn btn-ghost btn-sm">{t("common.actions.cancel")}</button>
        <button onClick={submit} disabled={saving} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
          {t("dashboard.experiences.createAndContinue")}
        </button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: 520, maxWidth: "100%", padding: "1.5rem", background: "var(--card)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800 }}>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const labelS = { display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted-foreground)", marginBottom: 4 };
const inputS = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "var(--background)", color: "var(--foreground)" };
