"use client";

import { useState, useEffect } from "react";
import { X, Search, Loader2, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatDateNumeric } from "@/lib/i18n/format";
import { useToast } from "@/components/ui/Toast";

export default function JobSelectionModal({ isOpen, onClose, onSelect }) {
  const { t, locale } = useI18n();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadJobs();
    }
  }, [isOpen]);

  async function loadJobs() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast(t("dashboard.jobSelection.notAuthenticated"), "error");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, location, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error(err);
      toast(t("dashboard.jobSelection.loadError"), "error");
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const filteredJobs = jobs.filter(j => 
    (j.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (j.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div 
        className="fade-in" 
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 90 }} 
      />
      <div className="zoom-in" style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "max(50vw, 600px)",
        maxHeight: "85vh",
        background: "white",
        borderRadius: "16px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        zIndex: 100,
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#fafafa" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>{t("dashboard.jobSelection.title")}</h3>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
              {t("dashboard.jobSelection.subtitle")}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "8px", borderRadius: "50%" }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", flex: 1, minHeight: "400px" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder={t("dashboard.jobSelection.search")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "36px" }}
            />
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", margin: "0 -1.5rem", padding: "0 1.5rem" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
                <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <Briefcase size={48} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 1rem" }} />
                <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{t("dashboard.jobSelection.noResults")}</h4>
                <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
                  {searchQuery ? t("dashboard.jobSelection.changeSearch") : t("dashboard.jobSelection.noJobsYet")}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredJobs.map(job => (
                  <div
                    key={job.id}
                    className="card"
                    style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", transition: "border-color 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "8px" }}>
                        {job.title}
                        {job.status === 'brouillon' && (
                          <span style={{ fontSize: "10px", padding: "2px 6px", background: "var(--secondary)", borderRadius: "4px", fontWeight: "500" }}>{t("dashboard.jobSelection.draft")}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                        <span>{job.location || t("dashboard.jobSelection.noLocation")}</span>
                        <span>•</span>
                        <span>{t("dashboard.jobSelection.createdOn", { date: formatDateNumeric(job.created_at, locale) })}</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => onSelect(job)}
                      style={{ fontSize: "13px", padding: "8px 16px" }}
                    >
                      {t("dashboard.jobSelection.select")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
