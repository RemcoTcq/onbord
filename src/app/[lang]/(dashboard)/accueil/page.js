"use client";

import { useState, useEffect, useRef } from "react";
import { LocaleLink as Link } from "@/lib/i18n/navigation";
import { useI18n, useT } from "@/lib/i18n/I18nProvider";
import { formatDateShort } from "@/lib/i18n/format";
import { createClient } from "@/lib/supabase/client";
import { getUserCreditInfo } from "@/lib/actions/usage";
import { 
  Plus, Settings, ChevronRight, Briefcase, FileText, Edit3, X, Check,
  Home, Users, Settings2, BarChart2, Star
} from "lucide-react";

const ICON_MAP = {
  Plus, Settings, ChevronRight, Briefcase, FileText, Edit3, X, Check,
  Home, Users, Settings2, BarChart2, Star
};

// Les raccourcis prédéfinis sont identifiés par un `id` STABLE, et leur libellé
// est résolu au rendu depuis cet id — pas stocké.
//
// C'est nécessaire parce que les raccourcis vivent dans le localStorage du
// navigateur : ceux qu'un recruteur a enregistrés avant la traduction portent un
// libellé français figé. Résoudre par id les remet dans la bonne langue sans
// migration ni perte. Les raccourcis vers une offre (`job_<uuid>`) gardent leur
// libellé stocké : c'est un titre de poste, il ne se traduit pas.
const SHORTCUT_LABELS = {
  home: "dashboard.nav.home",
  new_job: "dashboard.nav.newJob",
  jobs: "dashboard.nav.jobs",
  assessments: "dashboard.nav.assessments",
  settings: "dashboard.nav.settings",
};

/** Libellé d'un raccourci : traduit s'il est prédéfini, stocké sinon. */
function shortcutLabel(t, shortcut) {
  const key = SHORTCUT_LABELS[shortcut.id];
  return key ? t(key) : shortcut.label;
}

const DEFAULT_SHORTCUTS = [
  { id: 'new_job', iconName: 'Plus', href: "/jobs/nouveau" },
  { id: 'jobs', iconName: 'Briefcase', href: "/jobs" },
  { id: 'assessments', iconName: 'FileText', href: "/assessments" },
];

function ActionButton({ iconName, label, href, isEditing, onRemove }) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = ICON_MAP[iconName] || FileText;
  
  const content = (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "12px 24px",
        border: isEditing ? "1px dashed var(--muted-foreground)" : "1px solid var(--border)", 
        borderRadius: "8px",
        fontSize: "15px",
        fontWeight: "600", color: "var(--foreground)",
        background: "white", transition: "all 0.15s ease",
        position: "relative",
        cursor: isEditing ? "default" : "pointer"
      }} 
      className={isEditing ? "" : "hover-bg-secondary"}
    >
      {Icon && <Icon size={18} color="var(--muted-foreground)" />}
      {label}
      {isEditing && isHovered && (
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          style={{
            position: "absolute", top: "-10px", right: "-10px", 
            width: "24px", height: "24px", borderRadius: "12px",
            background: "white", color: "var(--muted-foreground)",
            border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", padding: 0, boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            transition: "all 0.15s ease", zIndex: 10
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.borderColor = 'var(--foreground)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );

  return isEditing ? content : <Link href={href} style={{ textDecoration: "none" }}>{content}</Link>;
}

function AddShortcutModal({ onClose, onAdd, activeJobs }) {
  const t = useT();
  const PREDEFINED = [
    { id: 'home', iconName: 'Home', href: "/accueil" },
    { id: 'new_job', iconName: 'Plus', href: "/jobs/nouveau" },
    { id: 'jobs', iconName: 'Briefcase', href: "/jobs" },
    { id: 'assessments', iconName: 'FileText', href: "/assessments" },
    { id: 'settings', iconName: 'Settings2', href: "/compte/profil" },
  ];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="fade-in" style={{
        background: 'white', borderRadius: '12px', width: '600px', maxWidth: '90vw',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>{t("dashboard.home.addShortcut")}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--muted-foreground)' }}><X size={24} /></button>
        </div>
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--muted-foreground)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("dashboard.home.mainPages")}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {PREDEFINED.map(item => {
                const Icon = ICON_MAP[item.iconName] || FileText;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => { onAdd(item); onClose(); }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', 
                      border: '1px solid var(--border)', borderRadius: '10px', background: 'white', 
                      cursor: 'pointer', textAlign: 'left'
                    }}
                    className="hover-border-foreground"
                  >
                    <Icon size={20} color="var(--muted-foreground)" />
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--foreground)' }}>{shortcutLabel(t, item)}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {activeJobs && activeJobs.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--muted-foreground)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t("dashboard.home.activeJobs")}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeJobs.map(job => (
                  <button 
                    key={job.id} 
                    onClick={() => { 
                      onAdd({ id: `job_${job.id}`, iconName: 'Star', label: job.title, href: `/jobs/${job.id}` }); 
                      onClose(); 
                    }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', 
                      border: '1px solid var(--border)', borderRadius: '10px', background: 'white', 
                      cursor: 'pointer', textAlign: 'left'
                    }}
                    className="hover-border-foreground"
                  >
                    <div style={{ width: '10px', height: '10px', borderRadius: '5px', background: '#22c55e' }}></div>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--foreground)' }}>{job.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactJobCard({ job }) {
  const t = useT();
  const candidates = job.candidates || [];
  return (
    <Link href={`/jobs/${job.id}`} style={{ textDecoration: "none" }}>
      <div style={{
        padding: "20px 24px", border: "1px solid var(--border)", borderRadius: "10px",
        marginBottom: "16px", background: "white", transition: "border-color 0.15s ease"
      }} className="hover-border-foreground">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div style={{ fontWeight: "700", fontSize: "16px", color: "var(--foreground)" }}>
            {job.title}
          </div>
          <span style={{
            fontSize: "12px", fontWeight: "700", color: "#22c55e", background: "#22c55e15",
            padding: "4px 10px", borderRadius: "6px"
          }}>{t("dashboard.home.open")}</span>
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          {job.location || t("dashboard.home.noLocation")} &nbsp;&nbsp; {t("dashboard.home.candidatesCount", { count: candidates.length })}
        </div>
      </div>
    </Link>
  );
}

export default function Accueil() {
  const { t, locale } = useI18n();
  const [userName, setUserName] = useState("");
  const [activeJobs, setActiveJobs] = useState([]);
  const [stats, setStats] = useState({ totalJobs: 0, testsDone: 0, candidates: 0 });
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [customShortcuts, setCustomShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [showActionEdit, setShowActionEdit] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
    const savedShortcuts = localStorage.getItem("onbord_custom_shortcuts");
    if (savedShortcuts) {
      try {
        // Le raccourci « Talents » a été retiré avec la fonctionnalité. Il vit
        // dans le localStorage du navigateur, pas en base : sans ce filtre, un
        // recruteur qui l'avait ajouté garderait un bouton sans libellé
        // pointant vers une route qui n'existe plus.
        setCustomShortcuts(JSON.parse(savedShortcuts).filter((s) => s.id !== "talents"));
      } catch (e) {}
    }
  }, []);

  const removeShortcut = (id) => {
    const next = customShortcuts.filter(s => s.id !== id);
    setCustomShortcuts(next);
    localStorage.setItem("onbord_custom_shortcuts", JSON.stringify(next));
  };

  const addShortcut = (shortcut) => {
    if (customShortcuts.find(s => s.id === shortcut.id)) return;
    const next = [...customShortcuts, shortcut];
    setCustomShortcuts(next);
    localStorage.setItem("onbord_custom_shortcuts", JSON.stringify(next));
  };

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    setUserName(user.user_metadata?.first_name || user.email?.split("@")[0] || "");
    
    setUsage(await getUserCreditInfo());

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*, candidates(id, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (jobs) {
      const allCandidates = jobs.flatMap(j => j.candidates || []);
      const active = jobs.filter(j => j.status === "active");
      setActiveJobs(active.slice(0, 3));

      setStats({
        totalJobs: jobs.length,
        testsDone: allCandidates.filter(c => c.status === "interview_completed" || c.status === "shortlisted").length,
        candidates: allCandidates.length,
      });
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "100px" }}>
        <div style={{ fontSize: "16px", color: "var(--muted-foreground)" }}>Loading...</div>
      </div>
    );
  }

  const illimite = !!usage?.illimite;
  const planLabel = usage?.planLabel || "—";
  const maxCredits = usage?.credits_allocated ?? 0;
  const creditsLeft = usage?.credits_balance ?? 0;
  const creditsUsed = Math.max(0, maxCredits - creditsLeft);
  const creditsPercent = maxCredits > 0 ? Math.min(100, Math.max(0, (creditsUsed / maxCredits) * 100)) : 0;

  return (
    <div className="fade-in" style={{ width: "100%", maxWidth: "1600px", margin: "0 auto", padding: "24px 32px", boxSizing: "border-box", overflowX: "hidden" }}>
      
      {showAddModal && (
        <AddShortcutModal 
          onClose={() => setShowAddModal(false)} 
          onAdd={addShortcut}
          activeJobs={activeJobs}
        />
      )}

      {/* 1. Header (Logo + Welcome) */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <img src="/logo.png" alt="Onbord" style={{ height: "80px", marginBottom: "12px", objectFit: "contain" }} />
        <div style={{ fontSize: "16px", color: "var(--muted-foreground)" }}>
          {t("dashboard.home.greeting", { name: userName })}
        </div>
      </div>

      {/* 2. Action Bar */}
      <div style={{ 
        background: "white", borderRadius: "12px", border: "1px solid var(--border)",
        padding: "20px", marginBottom: "32px", position: "relative",
        display: "flex", justifyContent: "center", alignItems: "center"
      }}>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
          {customShortcuts.map(shortcut => (
            <ActionButton 
              key={shortcut.id} 
              iconName={shortcut.iconName} 
              label={shortcutLabel(t, shortcut)} 
              href={shortcut.href} 
              isEditing={showActionEdit}
              onRemove={() => removeShortcut(shortcut.id)}
            />
          ))}
          
          {showActionEdit && (
            <button 
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 24px", border: "2px dashed var(--border)", borderRadius: "8px",
                fontSize: "15px", fontWeight: "600", color: "var(--muted-foreground)",
                background: "transparent", cursor: "pointer"
              }} className="hover-bg-secondary"
            >
              <Plus size={18} /> {t("dashboard.home.addShortcut")}
            </button>
          )}

          {!showActionEdit && customShortcuts.length === 0 && <span style={{fontSize: "15px", color: "var(--muted-foreground)"}}>{t("dashboard.home.noShortcuts")}</span>}
        </div>
        
        <div style={{ position: "absolute", right: "32px", top: "50%", transform: "translateY(-50%)" }}>
          <button 
            onClick={() => setShowActionEdit(!showActionEdit)} 
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)", display: "flex", padding: "6px" }}
          >
            {showActionEdit ? <Check size={22} color="var(--foreground)" /> : <Edit3 size={22} />}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        
        {/* 3. Organization Card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border)", padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>{t("dashboard.home.company")}</h3>
            <Link href="/compte/profil" style={{ color: "var(--muted-foreground)" }}>
              <Settings size={22} />
            </Link>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "var(--muted-foreground)", marginBottom: "24px" }}>
            <span>{t("dashboard.home.plan")}</span>
            <span style={{ fontWeight: "700", color: "var(--foreground)" }}>{planLabel}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "var(--muted-foreground)", marginBottom: "20px" }}>
            <span>{t("dashboard.home.creditsUsed")}</span>
            <span style={{ fontWeight: "700", color: "var(--foreground)" }}>
              {illimite ? "∞" : `${creditsUsed} / ${maxCredits}`}
            </span>
          </div>
          
          <div style={{ height: "8px", background: "var(--secondary)", borderRadius: "4px", overflow: "hidden", marginBottom: "32px" }}>
            <div style={{ height: "100%", width: `${creditsPercent}%`, background: "var(--foreground)", borderRadius: "4px" }} />
          </div>

          <div style={{ height: "1px", background: "var(--border)", margin: "0 -32px 32px -32px" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--foreground)", marginBottom: "8px" }}>{stats.totalJobs}</div>
              <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>{t("dashboard.nav.jobs")}</div>
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--foreground)", marginBottom: "8px" }}>{stats.candidates}</div>
              <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>{t("dashboard.home.candidates")}</div>
            </div>
          </div>
        </div>

        {/* 4. Postings Card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border)", padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>{t("dashboard.home.latestJobs")}</h3>
            <Link href="/jobs" style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
              Voir tout <ChevronRight size={16} />
            </Link>
          </div>
          
          {activeJobs.length > 0 ? (
            <div>
              {activeJobs.map(job => (
                <CompactJobCard key={job.id} job={job} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0", fontSize: "15px", color: "var(--muted-foreground)" }}>
              {t("dashboard.home.noActiveJobs")}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
