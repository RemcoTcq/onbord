"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateSecuritySettings } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

export default function SecurityPage() {
  const { toast } = useToast();
  const [currentEmail, setCurrentEmail] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentEmail(user.email || "");
        setEmail(user.email || "");
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!oldPassword) {
      toast("Veuillez saisir votre mot de passe actuel pour des raisons de sécurité.", "error");
      return;
    }

    setSaving(true);

    const result = await updateSecuritySettings(oldPassword, newPassword, email);

    if (result.success) {
      if (email !== currentEmail) {
        toast("Un lien de confirmation a été envoyé à votre nouvelle adresse e-mail. Le changement sera effectif une fois validé.", "success");
      } else {
        toast("Paramètres de sécurité mis à jour !", "success");
      }
      setOldPassword("");
      setNewPassword("");
      // We do NOT set currentEmail to email immediately because Supabase requires clicking the link first.
    } else {
      toast(`Erreur : ${result.error}`, "error");
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
        <Loader2 className="spin" size={24} style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)" }}>
          Sécurité & Connexion
        </h2>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
          Pour modifier votre e-mail ou votre mot de passe, vous devez confirmer votre mot de passe actuel.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Vérification de sécurité obligatoire */}
        <div style={{ padding: "1rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
          <label className="form-label" htmlFor="oldPassword" style={{ color: "#334155", fontWeight: "600" }}>Mot de passe actuel (Requis)</label>
          <input 
            id="oldPassword"
            type="password" 
            className="input-field" 
            placeholder="Nécessaire pour enregistrer les modifications"
            value={oldPassword} 
            onChange={(e) => setOldPassword(e.target.value)} 
            required
            style={{ background: "white" }}
          />
        </div>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
          <label className="form-label" htmlFor="email">Adresse E-mail</label>
          <input 
            id="email"
            type="email" 
            className="input-field" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
          />
          {email !== currentEmail && (
            <p style={{ fontSize: "12px", color: "var(--accent-foreground)", marginTop: "4px" }}>
              Un lien de confirmation pourrait être envoyé à la nouvelle adresse selon les paramètres de votre serveur.
            </p>
          )}
        </div>

        <div>
          <label className="form-label" htmlFor="newPassword">Nouveau mot de passe</label>
          <input 
            id="newPassword"
            type="password" 
            className="input-field" 
            placeholder="Laissez vide pour conserver le mot de passe actuel"
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving || !oldPassword}
            style={{ width: "fit-content" }}
          >
            {saving ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : "Mettre à jour la sécurité"}
          </button>
        </div>
      </form>
    </div>
  );
}
