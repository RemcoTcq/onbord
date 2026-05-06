"use client";

import { CheckCircle2, Circle, Clock } from "lucide-react";

export const AGENCY_STATUSES = [
  { id: "searching", label: "Recherche de candidats", description: "Sourcing sur nos réseaux et bases de données" },
  { id: "qualifying", label: "Qualification", description: "Analyse et tri des CV reçus" },
  { id: "interviewing", label: "Entretiens", description: "Entretiens asynchrones avec l'IA en cours" },
  { id: "shortlist_prep", label: "Finalisation", description: "Sélection des meilleurs profils" },
  { id: "shortlist_ready", label: "Shortlist prête", description: "Consultez les candidats retenus" },
];

export default function AgencyTimeline({ currentStatus }) {
  const currentIndex = Math.max(
    0,
    AGENCY_STATUSES.findIndex((s) => s.id === currentStatus)
  );

  return (
    <div style={{ padding: "2rem", background: "white", borderRadius: "16px", border: "1px solid var(--border)", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--foreground)" }}>Suivi du Recrutement</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px", marginTop: "0.25rem" }}>
          Notre équipe gère cette demande. Voici l'état d'avancement.
        </p>
      </div>

      <div style={{ position: "relative", paddingLeft: "1.5rem" }}>
        {AGENCY_STATUSES.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          return (
            <div key={status.id} style={{ display: "flex", gap: "1.5rem", marginBottom: index === AGENCY_STATUSES.length - 1 ? 0 : "2rem", position: "relative" }}>
              {/* Vertical Line */}
              {index !== AGENCY_STATUSES.length - 1 && (
                <div style={{ 
                  position: "absolute", 
                  left: "11px", 
                  top: "24px", 
                  bottom: "-24px", 
                  width: "2px", 
                  background: isCompleted ? "var(--primary)" : "var(--border)",
                  zIndex: 0
                }} />
              )}
              
              {/* Icon */}
              <div style={{ 
                position: "relative", 
                zIndex: 1, 
                background: "white",
                color: isCompleted ? "var(--primary)" : isCurrent ? "white" : "var(--muted-foreground)",
                backgroundColor: isCurrent ? "var(--primary)" : "white",
                borderRadius: "50%",
                padding: isCurrent ? "4px" : "0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {isCompleted ? <CheckCircle2 size={24} /> : isCurrent ? <Clock size={16} /> : <Circle size={24} />}
              </div>

              {/* Text */}
              <div style={{ flex: 1, marginTop: isCurrent ? "1px" : "2px" }}>
                <h4 style={{ 
                  fontWeight: isCurrent ? "700" : "500", 
                  color: isPending ? "var(--muted-foreground)" : "var(--foreground)",
                  fontSize: "15px"
                }}>
                  {status.label}
                </h4>
                <p style={{ 
                  fontSize: "13px", 
                  color: "var(--muted-foreground)", 
                  marginTop: "2px" 
                }}>
                  {status.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
