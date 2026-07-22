"use client";

import { useEffect, useRef } from "react";
import { Plus, BookOpen, X } from "lucide-react";

export default function AssessmentActionModal({ isOpen, onClose, onAddAI, onSelectLibrary }) {
  const modalRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(2px)"
    }}>
      <div 
        ref={modalRef}
        className="zoom-in"
        style={{
          background: "white", padding: "32px", borderRadius: "16px",
          width: "100%", maxWidth: "480px", position: "relative",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)"
        }}
      >
        <button 
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--muted-foreground)"
          }}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "var(--foreground)" }}>
          Test de compétences
        </h2>
        <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "32px" }}>
          Que souhaitez-vous faire ?
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <button
            onClick={onAddAI}
            style={{
              display: "flex", alignItems: "center", gap: "16px",
              padding: "20px", background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "12px", cursor: "pointer", textAlign: "left",
              transition: "all 150ms"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Plus size={20} color="#16a34a" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)" }}>Ajouter un nouveau test</div>
              <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>Créer un test sur-mesure avec l'IA</div>
            </div>
          </button>

          <button
            onClick={onSelectLibrary}
            style={{
              display: "flex", alignItems: "center", gap: "16px",
              padding: "20px", background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: "12px", cursor: "pointer", textAlign: "left",
              transition: "all 150ms"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{
              width: "40px", height: "40px", borderRadius: "10px",
              background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <BookOpen size={20} color="#64748b" />
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)" }}>Sélectionner depuis la bibliothèque</div>
              <div style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "2px" }}>Utiliser un test déjà existant</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
