"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

// Identifiant par compteur, pas par horodatage : deux toasts émis d'affilée
// (« étape réécrite » puis « nouvelle version ») tombaient dans la même
// milliseconde et partageaient leur clé React — l'un des deux disparaissait.
let prochainId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = ++prochainId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast ${t.type === "success" ? "toast-success" : "toast-error"}`}
            style={{ display: "flex", alignItems: "center", gap: "10px" }}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={18} style={{ color: "var(--success)", flexShrink: 0 }} />
            ) : (
              <XCircle size={18} style={{ color: "var(--destructive)", flexShrink: 0 }} />
            )}
            <span style={{ flex: 1 }}>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{ background: "transparent", border: "none", padding: "2px", color: "var(--muted-foreground)", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
