"use client";

// Écran de message plein cadre côté candidat, aux couleurs du recruteur.
// Repris tel quel des écrans de fin et de disqualification de /run : logo (ou
// monogramme de marque), titre, paragraphe. Partagé par les deux portes
// d'entrée (/assessment et /apply) pour qu'un candidat voie exactement la même
// chose quel que soit le lien sur lequel il a cliqué.

import { container, heading, getContrastColor, PAGE_BG, DEFAULT_PRIMARY } from "./candidateUi";

export default function CandidateNotice({ recruiter, job, title, children }) {
  const primary = recruiter?.brand_primary_color || DEFAULT_PRIMARY;
  const label = recruiter?.company_name || job?.title || "O";

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: PAGE_BG, padding: "2rem",
      "--primary": primary, "--primary-hover": primary,
    }}>
      <div style={{ ...container, padding: "3rem 2rem", textAlign: "center", maxWidth: 480, width: "100%" }}>
        {recruiter?.company_logo_url ? (
          <img
            src={recruiter.company_logo_url}
            alt={recruiter?.company_name || "Logo"}
            style={{ height: 48, width: "auto", margin: "0 auto 2rem", borderRadius: 8, objectFit: "contain", display: "block" }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: 10, background: primary, color: getContrastColor(primary),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 20, margin: "0 auto 2rem",
          }}>
            {label[0].toUpperCase()}
          </div>
        )}
        <h1 style={{ ...heading, marginBottom: "0.75rem" }}>{title}</h1>
        <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "var(--muted-foreground)" }}>{children}</p>
      </div>
    </div>
  );
}
