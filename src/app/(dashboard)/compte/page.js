"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { Loader2 } from "lucide-react";

export default function AccountInfoPage() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata) {
          setFirstName(user.user_metadata.first_name || "");
          setLastName(user.user_metadata.last_name || "");
          setCompanyName(user.user_metadata.company_name || "");
        }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateProfile({
      first_name: firstName,
      last_name: lastName,
      company_name: companyName
    });

    if (result.success) {
      toast("Profil mis à jour avec succès !", "success");
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
      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--foreground)" }}>
        Informations générales
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div>
            <label className="form-label" htmlFor="firstName">Prénom</label>
            <input 
              id="firstName"
              type="text" 
              className="input-field" 
              value={firstName} 
              onChange={(e) => setFirstName(e.target.value)} 
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="lastName">Nom</label>
            <input 
              id="lastName"
              type="text" 
              className="input-field" 
              value={lastName} 
              onChange={(e) => setLastName(e.target.value)} 
              required
            />
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="companyName">Entreprise</label>
          <input 
            id="companyName"
            type="text" 
            className="input-field" 
            value={companyName} 
            onChange={(e) => setCompanyName(e.target.value)} 
            required
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving}
            style={{ width: "fit-content" }}
          >
            {saving ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}
