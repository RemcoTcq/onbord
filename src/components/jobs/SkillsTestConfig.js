"use client";

import { useState, useEffect } from "react";
import { Brain, CheckCircle2, Clock, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { getTestsLibrary } from "@/lib/actions/assessment";

const CATEGORY_LABELS = {
  cognitif: "Cognitif",
  langue: "Langues",
  metier: "Métier",
  personnalite: "Personnalité",
};

const CATEGORY_COLORS = {
  cognitif:     { bg: "#ede9fe", color: "#6d28d9" },
  langue:       { bg: "#dbeafe", color: "#1d4ed8" },
  metier:       { bg: "#dcfce7", color: "#166534" },
  personnalite: { bg: "#fce7f3", color: "#9d174d" },
};

const MAX_TOTAL_DURATION = 30; // minutes

export default function SkillsTestConfig({ jobId, config, onChange }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(
    (config?.tests || []).map((t) => t.test_id)
  );

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);
    const res = await getTestsLibrary();
    if (res.success) setTests(res.tests);
    setLoading(false);
  }

  const selectedTests = tests.filter((t) => selectedIds.includes(t.id));
  const totalDuration = selectedTests.reduce((sum, t) => sum + t.estimated_duration_minutes, 0);
  const canAdd = selectedIds.length < 5 && totalDuration < MAX_TOTAL_DURATION;

  function toggleTest(testId) {
    let newIds;
    if (selectedIds.includes(testId)) {
      newIds = selectedIds.filter((id) => id !== testId);
    } else {
      if (!canAdd) return; // max reached
      newIds = [...selectedIds, testId];
    }
    setSelectedIds(newIds);

    // Notify parent with updated config structure
    const updatedTests = newIds.map((id) => {
      // Preserve existing selected_question_ids if any
      const existing = (config?.tests || []).find((t) => t.test_id === id);
      const testData = tests.find((t) => t.id === id);
      return {
        test_id: id,
        test_name: testData?.name || "",
        selected_question_ids: existing?.selected_question_ids || [], // will be filled on save
      };
    });
    onChange({ ...config, enabled: true, tests: updatedTests });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "1rem", color: "var(--muted-foreground)" }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: "14px" }}>Chargement de la bibliothèque…</span>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Duration summary */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderRadius: "6px", marginBottom: "1rem",
        background: totalDuration > MAX_TOTAL_DURATION ? "#fef2f2" : totalDuration > 0 ? "#f0fdf4" : "var(--secondary)",
        border: `1px solid ${totalDuration > MAX_TOTAL_DURATION ? "#fecaca" : totalDuration > 0 ? "#bbf7d0" : "var(--border)"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Clock size={14} style={{ color: totalDuration > MAX_TOTAL_DURATION ? "#991b1b" : "var(--muted-foreground)" }} />
          <span style={{ fontSize: "13px", fontWeight: "600", color: totalDuration > MAX_TOTAL_DURATION ? "#991b1b" : "var(--foreground)" }}>
            Durée totale estimée pour le candidat
          </span>
        </div>
        <span style={{ fontSize: "14px", fontWeight: "800", color: totalDuration > MAX_TOTAL_DURATION ? "#991b1b" : "#166534" }}>
          {totalDuration} / {MAX_TOTAL_DURATION} min
        </span>
      </div>

      {/* Selection info */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
          Sélectionnez entre 1 et 5 tests (durée max {MAX_TOTAL_DURATION} min)
        </span>
        <span style={{
          fontSize: "12px", fontWeight: "700", padding: "2px 10px", borderRadius: "99px",
          background: selectedIds.length >= 5 ? "#fef3c7" : "var(--secondary)",
          color: selectedIds.length >= 5 ? "#92400e" : "var(--muted-foreground)",
        }}>
          {selectedIds.length} / 5
        </span>
      </div>

      {totalDuration > MAX_TOTAL_DURATION && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", marginBottom: "0.75rem" }}>
          <AlertCircle size={14} style={{ color: "#991b1b" }} />
          <span style={{ fontSize: "13px", color: "#991b1b" }}>La durée dépasse {MAX_TOTAL_DURATION} minutes. Retirez un test.</span>
        </div>
      )}

      {/* Tests grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {tests.map((test) => {
          const isSelected = selectedIds.includes(test.id);
          const isDisabled = !isSelected && !canAdd;
          const catColor = CATEGORY_COLORS[test.category] || { bg: "#f1f5f9", color: "#475569" };

          return (
            <div
              key={test.id}
              onClick={() => !isDisabled && test.status === "active" && toggleTest(test.id)}
              style={{
                padding: "12px 14px", borderRadius: "8px",
                border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                background: isSelected ? "var(--accent)" : test.status === "coming_soon" ? "var(--secondary)" : "var(--card)",
                cursor: isDisabled || test.status === "coming_soon" ? "not-allowed" : "pointer",
                opacity: isDisabled || test.status === "coming_soon" ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: "12px", transition: "all 150ms",
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                background: isSelected ? "var(--primary)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isSelected && <CheckCircle2 size={13} style={{ color: "white" }} />}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--foreground)" }}>{test.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: catColor.bg, color: catColor.color }}>
                    {CATEGORY_LABELS[test.category] || test.category}
                  </span>
                  {test.status === "coming_soon" && (
                    <span style={{ fontSize: "11px", fontWeight: "700", padding: "1px 7px", borderRadius: "99px", background: "#f1f5f9", color: "#64748b" }}>
                      Bientôt
                    </span>
                  )}
                </div>
                {test.description && (
                  <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginTop: "2px", lineHeight: "1.4" }}>{test.description}</p>
                )}
              </div>

              {/* Duration */}
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                <Clock size={12} style={{ color: "var(--muted-foreground)" }} />
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)", fontWeight: "500" }}>~{test.estimated_duration_minutes} min</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
