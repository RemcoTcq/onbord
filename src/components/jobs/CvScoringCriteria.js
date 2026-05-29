"use client";

import { useState } from "react";
import { Plus, Trash2, Sliders, Info, AlertTriangle } from "lucide-react";

export default function CvScoringCriteria({ criteria, onChange }) {
  const [localCriteria, setLocalCriteria] = useState(criteria || []);

  const totalWeight = localCriteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  const updateCriteria = (newCriteria) => {
    setLocalCriteria(newCriteria);
    if (onChange) onChange(newCriteria);
  };

  const handleChange = (index, field, value) => {
    const next = [...localCriteria];
    next[index] = { ...next[index], [field]: value };
    updateCriteria(next);
  };

  const handleAdd = () => {
    if (localCriteria.length >= 8) return;
    updateCriteria([...localCriteria, { name: "", weight: 10 }]);
  };

  const handleRemove = (index) => {
    updateCriteria(localCriteria.filter((_, i) => i !== index));
  };

  const distributeEqually = () => {
    if (localCriteria.length === 0) return;
    const weight = Math.floor(100 / localCriteria.length);
    const next = localCriteria.map((c, i) => ({
      ...c,
      weight: i === localCriteria.length - 1 ? 100 - weight * (localCriteria.length - 1) : weight
    }));
    updateCriteria(next);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ background: "var(--primary-light)", padding: "1rem", borderRadius: "var(--radius)", border: "1px dashed var(--primary)", display: "flex", gap: "12px" }}>
        <Info size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <p style={{ fontSize: "13px", color: "var(--primary-dark)", lineHeight: "1.5" }}>
          L'IA a identifié ces 5 critères basés sur votre offre. Ils seront utilisés pour calculer le <strong>score de correspondance</strong> de chaque CV importé. Vous pouvez ajuster les intitulés et leur importance (poids).
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {localCriteria.map((criterion, index) => (
          <div key={index} className="card" style={{ padding: "1rem", display: "flex", alignItems: "center", gap: "1rem", borderStyle: "dashed" }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={criterion.name}
                onChange={(e) => handleChange(index, "name", e.target.value)}
                placeholder="Ex: Expérience en management d'équipe"
                style={{
                  width: "100%", border: "none", background: "transparent",
                  fontSize: "14px", fontWeight: "600", outline: "none",
                  color: "var(--foreground)"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "180px" }}>
              <Sliders size={14} style={{ color: "var(--muted-foreground)" }} />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={criterion.weight}
                onChange={(e) => handleChange(index, "weight", parseInt(e.target.value))}
                style={{ flex: 1, accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "13px", fontWeight: "700", minWidth: "35px", textAlign: "right" }}>
                {criterion.weight}%
              </span>
            </div>

            <button
              onClick={() => handleRemove(index)}
              style={{ background: "none", border: "none", color: "var(--muted-foreground)", cursor: "pointer", padding: "4px" }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={handleAdd}
          disabled={localCriteria.length >= 8}
          style={{
            display: "flex", alignItems: "center", gap: "8px", background: "none",
            border: "1px dashed var(--border)", padding: "8px 16px", borderRadius: "var(--radius)",
            fontSize: "13px", fontWeight: "600", color: "var(--muted-foreground)", cursor: "pointer"
          }}
        >
          <Plus size={16} /> Ajouter un critère
        </button>

        <button
          onClick={distributeEqually}
          style={{ fontSize: "12px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}
        >
          Répartir équitablement
        </button>
      </div>

      {totalWeight !== 100 && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px", background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: "var(--radius)", color: "#9a3412", fontSize: "12px" }}>
          <AlertTriangle size={14} />
          Le total des poids est de <strong>{totalWeight}%</strong>. Il devrait être de 100% pour un scoring précis.
        </div>
      )}
    </div>
  );
}
