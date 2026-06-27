"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Copy, CheckCircle2, Save } from "lucide-react";
import { generateConstructiveFeedback, saveConstructiveFeedback } from "@/lib/actions/candidate";

export default function FeedbackModal({ isOpen, onClose, candidateId, candidateName }) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadFeedback();
    } else {
      // Reset state when closed
      setFeedback("");
      setError(null);
      setCopied(false);
    }
  }, [isOpen, candidateId]);

  async function loadFeedback() {
    setLoading(true);
    setError(null);
    const res = await generateConstructiveFeedback(candidateId);
    if (res.success) {
      setFeedback(res.feedback || "");
    } else {
      setError(res.error || "Une erreur est survenue lors de la génération du feedback.");
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await saveConstructiveFeedback(candidateId, feedback);
    if (!res.success) {
      setError("Erreur lors de la sauvegarde.");
    } else {
      // Show short visual feedback? 
    }
    setSaving(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(feedback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem"
    }}>
      <div className="card" style={{
        width: "100%", maxWidth: "700px", background: "var(--background)",
        borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: "90vh", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--card)"
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} style={{ color: "var(--primary)" }} />
            Feedback Constructif : {candidateName}
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "4px" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 0", gap: "1rem", color: "var(--muted-foreground)" }}>
              <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: "14px" }}>Génération du feedback par l'IA...</p>
            </div>
          ) : error ? (
            <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", fontSize: "14px" }}>
              {error}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ fontSize: "13px", color: "var(--muted-foreground)", lineHeight: "1.5" }}>
                Ce brouillon a été généré en se basant sur les points forts, les axes d'amélioration et le statut actuel du candidat. 
                Vous pouvez l'éditer librement avant de le copier. N'oubliez pas de sauvegarder si vous souhaitez conserver vos modifications !
              </p>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                style={{
                  width: "100%", minHeight: "300px", padding: "1rem",
                  borderRadius: "8px", border: "1px solid var(--border)",
                  fontSize: "14px", lineHeight: "1.6", fontFamily: "inherit",
                  resize: "vertical", backgroundColor: "var(--background)", color: "var(--foreground)"
                }}
                placeholder="Rédigez ou modifiez le feedback ici..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "1rem 1.5rem", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--card)"
        }}>
          <div>
            {!loading && !error && (
              <button 
                className="btn btn-outline btn-sm" 
                onClick={handleSave} 
                disabled={saving || !feedback.trim()}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                {saving ? "Sauvegarde..." : "Sauvegarder"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>
              Fermer
            </button>
            {!loading && !error && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleCopy}
                disabled={!feedback.trim()}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? "Copié !" : "Copier"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
