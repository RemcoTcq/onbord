"use client";

import { Bot, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ConsentModal({ candidate, job, onAccept, loading = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px"
    }}>
      <div className="card fade-in" style={{ maxWidth: "500px", width: "100%", padding: "2.5rem", textAlign: "center" }}>
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: "var(--primary)", color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 1.5rem"
        }}>
          <Bot size={32} />
        </div>

        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Bonjour {candidate?.first_name} !
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "2rem" }}>
          Vous avez été invité à passer un entretien pour le poste de <strong>{job?.title}</strong> chez <strong>{job?.company_name || "l'entreprise"}</strong>.
        </p>

        <div style={{ textAlign: "left", background: "var(--secondary)", padding: "1.25rem", borderRadius: "var(--radius)", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
            <ShieldCheck size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              <strong>Traitement par IA :</strong> Vos réponses seront analysées par notre recruteur IA pour aider l'équipe de recrutement.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <CheckCircle2 size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              <strong>Confidentialité :</strong> Vos données sont protégées et ne seront utilisées que dans le cadre de cette candidature.
            </p>
          </div>
        </div>

        <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
          En cliquant sur le bouton ci-dessous, vous acceptez nos conditions et autorisez l'analyse de vos données par Onbord.
        </p>

        <button 
          className="btn btn-primary" 
          style={{ width: "100%", padding: "14px", fontSize: "16px" }}
          onClick={onAccept}
          disabled={loading}
        >
          {loading ? "Démarrage..." : "Accepter et commencer"}
        </button>
      </div>
    </div>
  );
}
