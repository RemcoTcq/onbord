"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANS } from "@/lib/constants/plans";
import { isAdmin } from "@/lib/utils/admin";
import { Loader2, Zap } from "lucide-react";

export default function UsageWidget({ compact = false }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadUsage() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("user_usage")
          .select("*")
          .eq("user_id", user.id)
          .single();
        
        if (data) setUsage(data);
      }
      setLoading(false);
    }
    loadUsage();
  }, []);

  if (loading) return null; // Pas de chargement visible dans la nav bar
  if (!user || isAdmin(user)) return null; // Les admins n'ont pas de limites affichées
  if (!usage) return null;

  const plan = PLANS[usage.plan] || PLANS.core;
  const jobsPercent = Math.min(100, (usage.jobs_count / plan.maxJobs) * 100);
  const candidatesPercent = Math.min(100, (usage.candidates_count / plan.maxCandidates) * 100);

  if (compact) {
    return (
      <div style={{ padding: "1rem", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "8px", color: "rgba(255,255,255,0.6)" }}>
          <span>PLAN {plan.label.toUpperCase()}</span>
          <span style={{ color: "var(--primary)", fontWeight: "bold" }}>UPGRADE</span>
        </div>
        
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "white", marginBottom: "4px" }}>
            <span>Offres</span>
            <span>{usage.jobs_count}/{plan.maxJobs}</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${jobsPercent}%`, background: jobsPercent > 80 ? "#ef4444" : "var(--primary)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "white", marginBottom: "4px" }}>
            <span>Candidats</span>
            <span>{usage.candidates_count}/{plan.maxCandidates}</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
            <div style={{ height: "100%", width: `${candidatesPercent}%`, background: candidatesPercent > 80 ? "#ef4444" : "var(--primary)", borderRadius: "2px", transition: "width 0.3s" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.5rem" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={18} fill="currentColor" />
        </div>
        <div>
          <h3 style={{ fontSize: "14px", fontWeight: "bold" }}>Usage du Plan {plan.label}</h3>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Réinitialisation le 1er du mois</p>
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Offres créées</span>
          <span style={{ fontWeight: "bold" }}>{usage.jobs_count} / {plan.maxJobs}</span>
        </div>
        <div style={{ height: "8px", background: "var(--secondary)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${jobsPercent}%`, background: jobsPercent > 80 ? "var(--destructive)" : "var(--primary)", transition: "width 0.5s" }} />
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
          <span style={{ color: "var(--muted-foreground)" }}>Candidats analysés</span>
          <span style={{ fontWeight: "bold" }}>{usage.candidates_count} / {plan.maxCandidates}</span>
        </div>
        <div style={{ height: "8px", background: "var(--secondary)", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${candidatesPercent}%`, background: candidatesPercent > 80 ? "var(--destructive)" : "var(--primary)", transition: "width 0.5s" }} />
        </div>
      </div>
      
      <button className="btn btn-outline" style={{ width: "100%", marginTop: "1.5rem", fontSize: "13px" }}>
        Changer de plan
      </button>
    </div>
  );
}
