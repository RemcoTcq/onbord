"use client";

import { useState, useEffect, useCallback } from "react";
import { Maximize, ShieldAlert, Zap } from "lucide-react";

export default function FullscreenGuard({ children, onCheat, candidateId }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const checkFullscreen = useCallback(() => {
    const isFS = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    setIsFullscreen(isFS);
    return isFS;
  }, []);

  useEffect(() => {
    // Check support
    if (!document.fullscreenEnabled && 
        !document.webkitFullscreenEnabled && 
        !document.mozFullScreenEnabled && 
        !document.msFullscreenEnabled) {
      setIsSupported(false);
      return;
    }

    const handleFSChange = () => {
      const isFS = checkFullscreen();
      if (!isFS && onCheat) {
        onCheat({ type: "fullscreen_exit", timestamp: new Date().toISOString() });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && onCheat) {
        onCheat({ type: "tab_switch", timestamp: new Date().toISOString() });
      }
    };

    const handleBlur = () => {
      if (onCheat) {
        onCheat({ type: "window_blur", timestamp: new Date().toISOString() });
      }
    };

    const handlePaste = (e) => {
      if (onCheat) {
        onCheat({ type: "paste", timestamp: new Date().toISOString() });
      }
    };

    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("webkitfullscreenchange", handleFSChange);
    document.addEventListener("mozfullscreenchange", handleFSChange);
    document.addEventListener("MSFullscreenChange", handleFSChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("paste", handlePaste);

    // Initial check
    checkFullscreen();

    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("webkitfullscreenchange", handleFSChange);
      document.removeEventListener("mozfullscreenchange", handleFSChange);
      document.removeEventListener("MSFullscreenChange", handleFSChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("paste", handlePaste);
    };
  }, [checkFullscreen, onCheat]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  if (!isSupported) {
    return <>{children}</>; // Fallback for incompatible browsers (e.g. some mobile browsers)
  }

  if (!isFullscreen) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "#0f172a", color: "white", zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "2rem", textAlign: "center"
      }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "20px", background: "rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem"
        }}>
          <ShieldAlert size={40} color="#f87171" />
        </div>
        
        <h2 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "1rem" }}>
          Mode plein écran obligatoire
        </h2>
        
        <p style={{ color: "#94a3b8", fontSize: "15px", maxWidth: "400px", lineHeight: "1.6", marginBottom: "2rem" }}>
          Pour garantir l'intégrité de l'assessment, vous devez rester en mode plein écran. 
          Toute tentative de sortie sera enregistrée et signalée au recruteur.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "300px" }}>
          <button 
            onClick={enterFullscreen}
            className="btn btn-primary"
            style={{ 
              display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              padding: "1rem", fontSize: "16px", background: "white", color: "#0f172a", border: "none"
            }}
          >
            <Maximize size={20} />
            Activer le plein écran
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginTop: "0.5rem" }}>
            <Zap size={14} color="#fbbf24" />
            <span style={{ fontSize: "12px", color: "#64748b" }}>Anti-triche Onbord activé</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
