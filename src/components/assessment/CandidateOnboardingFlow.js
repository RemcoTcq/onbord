"use client";

import { useState } from "react";
import { ChevronRight, ArrowRight, Loader2, Check, Send } from "lucide-react";

export function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default function CandidateOnboardingFlow({ candidate, job, recruiter, onComplete, onUpdateCandidate }) {
  const [step, setStep] = useState(0); // 0: Accueil, 1: Prénom, 2: Nom, 3: Email, 4: Consentement
  
  const [firstName, setFirstName] = useState((candidate?.first_name && candidate?.first_name !== 'Candidat') ? candidate.first_name : "");
  const [lastName, setLastName] = useState(candidate?.last_name || "");
  const [email, setEmail] = useState(candidate?.email || "");
  const [consentRGPD, setConsentRGPD] = useState(false);
  const [consentAI, setConsentAI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Branding
  const primaryColor = recruiter?.brand_primary_color || "#0f172a";
  const primaryText = getContrastColor(primaryColor);
  const logoUrl = recruiter?.company_logo_url || null;
  const companyName = recruiter?.company_name || job?.company || "l'entreprise";

  // Flow nodes
  const welcomeNode = job?.saved_flow_nodes?.find(n => n.type === 'accueil');
  const welcomeTextRaw = welcomeNode?.config?.text || "Nous sommes ravis de vous accueillir pour cette évaluation.";
  const welcomeText = welcomeTextRaw.replace(/{first_name}/g, firstName || "candidat");

  const companyDescription = recruiter?.company_description || "";

  // Estimation de temps (simplifiée, à ajuster si besoin)
  const estimatedTime = "15-20 min"; 

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step > 0 && step < 4) {
      setStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    await onUpdateCandidate({
      first_name: firstName,
      last_name: lastName,
      email: email,
      gdpr_consent_at: new Date().toISOString()
    });
    // The parent will set hasConsented and unmount this flow
    onComplete(); 
  };

  const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Styles communs pour Nodalview-style
  const pageStyle = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
    color: "var(--foreground)",
    fontFamily: "var(--font-sans)",
    position: "relative",
  };

  const headerStyle = {
    padding: "2rem 2.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    boxSizing: "border-box"
  };

  const contentStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    maxWidth: "600px",
    margin: "0 auto",
    marginTop: "-8vh", // Remonter très légèrement le contenu
    width: "100%",
    textAlign: "center"
  };

  const inlineInputContainerStyle = {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    maxWidth: "460px",
  };

  const inputStyle = {
    flex: 1,
    padding: "0.875rem 1.25rem",
    fontSize: "1rem",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    backgroundColor: "#fafafa"
  };

  const buttonStyle = {
    backgroundColor: primaryColor,
    color: primaryText,
    border: "none",
    borderRadius: "8px",
    padding: "0.875rem 2rem",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    transition: "opacity 0.2s",
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: "not-allowed"
  };

  // Logo component
  const Logo = ({ centered = false }) => (
    <div style={{ ...headerStyle, justifyContent: centered ? 'center' : 'flex-start', paddingBottom: centered ? '0' : '2rem' }}>
      {logoUrl ? (
        <img src={logoUrl} alt={companyName} style={{ height: "32px", objectFit: "contain" }} />
      ) : (
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>{companyName}</h2>
      )}
    </div>
  );

  return (
    <div style={pageStyle} className="fade-in">
      {/* Dynamic injection for focus state of the inputs */}
      <style>{`
        .nodal-input:focus {
          border-color: ${primaryColor} !important;
          box-shadow: 0 0 0 3px ${primaryColor}20 !important;
        }
        .nodal-checkbox {
          accent-color: ${primaryColor};
          width: 1.25rem;
          height: 1.25rem;
          cursor: pointer;
          flex-shrink: 0;
        }
        @keyframes blurZoomIn {
          0% {
            filter: blur(12px);
            transform: scale(0.85);
            opacity: 0;
          }
          100% {
            filter: blur(0);
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-blur-zoom {
          animation: blurZoomIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .btn-hover-effect {
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), filter 0.2s, box-shadow 0.3s, opacity 0.2s !important;
        }
        .btn-hover-effect:hover {
          transform: translateY(-3px) scale(1.05);
          opacity: 0.85;
          box-shadow: 0 10px 25px -5px ${primaryColor}90, 0 0 15px ${primaryColor}60;
        }
        .btn-hover-effect:active {
          transform: translateY(1px) scale(0.98);
        }
      `}</style>

      {/* Screen 0 : Accueil */}
      {step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", width: "100%" }}>
          <div className="animate-blur-zoom" style={{ marginBottom: "2rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ height: "64px", objectFit: "contain", maxWidth: "300px" }} />
            ) : (
              <h2 style={{ fontSize: "3rem", fontWeight: "800", margin: 0, color: "var(--foreground)" }}>{companyName}</h2>
            )}
          </div>
          
          <button 
            onClick={handleNext} 
            className="btn-hover-effect"
            style={{
              ...buttonStyle, 
              padding: "0.875rem 2.5rem", 
              borderRadius: "100px", 
              animation: "blurZoomIn 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards", 
              opacity: 0,
              fontSize: "15px"
            }}
          >
            Démarrer l'évaluation
          </button>
        </div>
      )}

      {/* Screen 1 : Prénom */}
      {step === 1 && (
        <>
          <Logo />
          <div style={contentStyle} className="slide-up">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "2rem" }}>
              Quel est votre <span style={{ color: primaryColor }}>prénom</span> ?
            </h2>
            <div style={inlineInputContainerStyle}>
              <input 
                type="text" 
                className="nodal-input"
                style={inputStyle}
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Ex: Camille"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && firstName.trim()) handleNext(); }}
              />
              <button onClick={handleNext} disabled={!firstName.trim()} style={{ ...(firstName.trim() ? buttonStyle : disabledButtonStyle), padding: "0 1.25rem" }}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Screen 2 : Nom */}
      {step === 2 && (
        <>
          <Logo />
          <div style={contentStyle} className="slide-up">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "2rem" }}>
              Quel est votre <span style={{ color: primaryColor }}>nom</span> ?
            </h2>
            <div style={{ ...inlineInputContainerStyle, marginBottom: "1rem" }}>
              <input 
                type="text" 
                className="nodal-input"
                style={inputStyle}
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Ex: Dupont"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && lastName.trim()) handleNext(); }}
              />
              <button onClick={handleNext} disabled={!lastName.trim()} style={{ ...(lastName.trim() ? buttonStyle : disabledButtonStyle), padding: "0 1.25rem" }}>
                <Send size={18} />
              </button>
            </div>
            <button onClick={handleBack} style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: "0.95rem", cursor: "pointer", textDecoration: "underline", padding: "0.5rem" }}>
              Retour
            </button>
          </div>
        </>
      )}

      {/* Screen 3 : Email */}
      {step === 3 && (
        <>
          <Logo />
          <div style={contentStyle} className="slide-up">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "2rem" }}>
              Quel est votre <span style={{ color: primaryColor }}>email</span> ?
            </h2>
            <div style={{ ...inlineInputContainerStyle, marginBottom: "1rem" }}>
              <input 
                type="email" 
                className="nodal-input"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="camille.dupont@email.com"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter' && isEmailValid(email)) handleNext(); }}
              />
              <button onClick={handleNext} disabled={!isEmailValid(email)} style={{ ...(isEmailValid(email) ? buttonStyle : disabledButtonStyle), padding: "0 1.25rem" }}>
                <Send size={18} />
              </button>
            </div>
            <button onClick={handleBack} style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: "0.95rem", cursor: "pointer", textDecoration: "underline", padding: "0.5rem" }}>
              Retour
            </button>
          </div>
        </>
      )}

      {/* Screen 4 : Consentement */}
      {step === 4 && (
        <>
          <Logo />
          <div style={{...contentStyle, maxWidth: "550px"}} className="slide-up">
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "2rem", textAlign: "center" }}>
              Une dernière étape
            </h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "450px", marginBottom: "2.5rem", textAlign: "left", margin: "0 auto 2.5rem auto" }}>
              <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  className="nodal-checkbox" 
                  checked={consentRGPD}
                  onChange={e => setConsentRGPD(e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span style={{ fontSize: "0.95rem", lineHeight: "1.4", color: "var(--foreground)" }}>
                  J'ai lu et j'accepte les <a href="#" style={{ color: primaryColor, textDecoration: "underline", fontWeight: "500" }}>conditions d'utilisation</a> et la <a href="#" style={{ color: primaryColor, textDecoration: "underline", fontWeight: "500" }}>politique de confidentialité</a>
                </span>
              </label>

              <label style={{ display: "flex", gap: "12px", alignItems: "flex-start", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  className="nodal-checkbox" 
                  checked={consentAI}
                  onChange={e => setConsentAI(e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span style={{ fontSize: "0.95rem", lineHeight: "1.4", color: "var(--foreground)" }}>
                  Je comprends qu'une <a href="#" style={{ color: primaryColor, textDecoration: "underline", fontWeight: "500" }}>IA analysera mes réponses</a>, sous la supervision finale d'un recruteur humain.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: "60px" }}>
              {consentRGPD && consentAI ? (
                <button 
                  onClick={handleFinish} 
                  disabled={isSubmitting} 
                  className="btn-hover-effect"
                  style={isSubmitting ? disabledButtonStyle : { ...buttonStyle, padding: "0.875rem 2.5rem", borderRadius: "100px" }}
                >
                  {isSubmitting ? <><Loader2 size={18} className="spin" /> Validation...</> : "Continuer"}
                </button>
              ) : (
                <button onClick={handleBack} style={{ background: "none", border: "none", color: "var(--muted-foreground)", fontSize: "0.95rem", cursor: "pointer", textDecoration: "underline", padding: "0.5rem", marginTop: "0.5rem" }}>
                  Retour
                </button>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
