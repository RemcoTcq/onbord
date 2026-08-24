"use client";

import { useT } from "@/lib/i18n/I18nProvider";
import { useState, useEffect } from "react";
import { X, Search, Loader2, BrainCircuit } from "lucide-react";
import { getMyAssessments } from "@/lib/actions/assessment";
import { useToast } from "@/components/ui/Toast";

export default function AssessmentSelectionModal({ isOpen, onClose, onSelect }) {
  const t = useT();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTests();
    }
  }, [isOpen]);

  async function loadTests() {
    setLoading(true);
    const res = await getMyAssessments();
    if (res.success) {
      setTests(res.tests);
    } else {
      toast(t("dashboard.testSelection.loadError"), "error");
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const filteredTests = tests.filter(t => 
    (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.category || "").toLowerCase().includes(searchQuery.toLowerCase())
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
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        zIndex: 100,
        display: "flex", flexDirection: "column",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.5rem", borderBottom: "1px solid var(--border)", background: "#fafafa" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--foreground)" }}>{t("dashboard.testSelection.title")}</h3>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
              {t("dashboard.testSelection.subtitle")}
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
              placeholder={t("dashboard.testSelection.search")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: "36px" }}
            />
          </div>

          {/* Test List */}
          <div style={{ flex: 1, overflowY: "auto", margin: "0 -1.5rem", padding: "0 1.5rem" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px" }}>
                <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
              </div>
            ) : filteredTests.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <BrainCircuit size={48} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 1rem" }} />
                <h4 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>{t("dashboard.testSelection.noResults")}</h4>
                <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
                  {searchQuery ? t("dashboard.testSelection.changeSearch") : t("dashboard.testSelection.noTestsYet")}
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredTests.map(test => (
                  <div
                    key={test.id}
                    className="card"
                    style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border)", transition: "border-color 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)", marginBottom: "4px" }}>
                        {test.name}
                      </div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                        <span>{test.category}</span>
                        <span>•</span>
                        <span>{test.estimated_duration_minutes || 0} min</span>
                      </div>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => onSelect(test)}
                      style={{ fontSize: "13px", padding: "8px 16px" }}
                    >
                      {t("dashboard.testSelection.attach")}
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
