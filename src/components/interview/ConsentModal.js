"use client";

import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function ConsentModal({ candidate, job, recruiter, onAccept, loading = false }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px"
    }}>
      <div className="card fade-in" style={{ maxWidth: "500px", width: "100%", padding: "2.5rem", textAlign: "center" }}>
        {recruiter?.company_logo_url && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <div style={{ 
              height: "50px", 
              maxWidth: "200px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden" 
            }}>
              <img 
                src={recruiter.company_logo_url} 
                alt={recruiter.company_name || "Logo"} 
                style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} 
              />
            </div>
          </div>
        )}

        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          Bonjour {candidate?.first_name} !
        </h1>
        <p style={{ color: "var(--muted-foreground)", marginBottom: "2rem" }}>
          Vous avez été invité à passer un entretien pour le poste de <strong>{job?.title}</strong> chez <strong>{recruiter?.company_name || job?.company_name || "l'entreprise"}</strong>.
        </p>

        <div style={{ textAlign: "left", background: "var(--secondary)", padding: "1.25rem", borderRadius: "var(--radius)", marginBottom: "2rem" }}>
          <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
            <ShieldCheck size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              <strong>Traitement par IA :</strong> Vos réponses seront analysées par notre recruteur IA pour aider l'équipe de recrutement.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
            <CheckCircle2 size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <p style={{ fontSize: "13px", lineHeight: "1.4" }}>
              <strong>Confidentialité :</strong> Vos données sont protégées et ne seront utilisées que dans le cadre de cette candidature.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ color: "#ef4444", flexShrink: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.4", color: "#b91c1c" }}>
              <strong>Anti-triche :</strong> Un système de détection de fraude est actif durant l'entretien. Toute activité suspecte sera détectée et automatiquement signalée au recruteur.
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
