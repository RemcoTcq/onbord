"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, Settings, ChevronRight, Briefcase, FileText, Edit3, X, Check,
  Home, Users, Settings2, BarChart2, Star
} from "lucide-react";
import { PLANS } from "@/lib/constants/plans";

const ICON_MAP = {
  Plus, Settings, ChevronRight, Briefcase, FileText, Edit3, X, Check,
  Home, Users, Settings2, BarChart2, Star
};

const DEFAULT_SHORTCUTS = [
  { id: 'new_job', iconName: 'Plus', label: "Nouvelle offre", href: "/jobs/nouveau" },
  { id: 'jobs', iconName: 'Briefcase', label: "Offres d'emploi", href: "/jobs" },
  { id: 'assessments', iconName: 'FileText', label: "Évaluations", href: "/assessments" },
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
  const PREDEFINED = [
    { id: 'home', iconName: 'Home', label: "Accueil", href: "/accueil" },
    { id: 'new_job', iconName: 'Plus', label: "Nouvelle offre", href: "/jobs/nouveau" },
    { id: 'jobs', iconName: 'Briefcase', label: "Offres d'emploi", href: "/jobs" },
    { id: 'assessments', iconName: 'FileText', label: "Évaluations", href: "/assessments" },
    { id: 'talents', iconName: 'Users', label: "Candidats / Talents", href: "/candidats" },
    { id: 'settings', iconName: 'Settings2', label: "Paramètres", href: "/compte/profil" },
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
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Ajouter un raccourci</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--muted-foreground)' }}><X size={24} /></button>
        </div>
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: '40px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--muted-foreground)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pages principales</div>
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
                    <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--foreground)' }}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {activeJobs && activeJobs.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--muted-foreground)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vos offres d'emploi actives</div>
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
          }}>Open</span>
        </div>
        <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
          {job.location || "Localisation non précisée"} &nbsp;&nbsp; {candidates.length} candidats
        </div>
      </div>
    </Link>
  );
}

export default function Accueil() {
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
      try { setCustomShortcuts(JSON.parse(savedShortcuts)); } catch (e) {}
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
    
    const { data: usageData } = await supabase.from('company_usage').select('*').eq('user_id', user.id).single();
    if (usageData) {
      setUsage(usageData);
    }

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

  const plan = usage ? (PLANS[usage.plan] || PLANS.core) : PLANS.core;
  const maxCredits = plan.creditsPerMonth || 170;
  
  let creditsLeft = maxCredits;
  if (usage && usage.credits_balance !== undefined && usage.credits_balance !== null) {
      creditsLeft = usage.credits_balance;
  } else if (usage) {
      creditsLeft = Math.max(0, maxCredits - (usage.jobs_count * 10 || 0));
  }
  const creditsUsed = maxCredits - creditsLeft;
  const creditsPercent = Math.min(100, Math.max(0, (creditsUsed / maxCredits) * 100));

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
          Bonjour, {userName}
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
              label={shortcut.label} 
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
              <Plus size={18} /> Add
            </button>
          )}

          {!showActionEdit && customShortcuts.length === 0 && <span style={{fontSize: "15px", color: "var(--muted-foreground)"}}>Aucun raccourci configuré</span>}
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
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>Entreprise</h3>
            <Link href="/compte/profil" style={{ color: "var(--muted-foreground)" }}>
              <Settings size={22} />
            </Link>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "var(--muted-foreground)", marginBottom: "24px" }}>
            <span>Plan</span>
            <span style={{ fontWeight: "700", color: "var(--foreground)" }}>{plan.label}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", color: "var(--muted-foreground)", marginBottom: "20px" }}>
            <span>Crédits utilisés</span>
            <span style={{ fontWeight: "700", color: "var(--foreground)" }}>{creditsUsed} / {maxCredits}</span>
          </div>
          
          <div style={{ height: "8px", background: "var(--secondary)", borderRadius: "4px", overflow: "hidden", marginBottom: "32px" }}>
            <div style={{ height: "100%", width: `${creditsPercent}%`, background: "var(--foreground)", borderRadius: "4px" }} />
          </div>

          <div style={{ height: "1px", background: "var(--border)", margin: "0 -32px 32px -32px" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--foreground)", marginBottom: "8px" }}>{stats.totalJobs}</div>
              <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Offres d'emploi</div>
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--foreground)", marginBottom: "8px" }}>{stats.candidates}</div>
              <div style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>Candidats</div>
            </div>
          </div>
        </div>

        {/* 4. Postings Card */}
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border)", padding: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>Dernières offres</h3>
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
              Aucune offre d'emploi active
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
