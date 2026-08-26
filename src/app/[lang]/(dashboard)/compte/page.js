"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n/I18nProvider";
import { useRouter } from "@/lib/i18n/navigation";
import { Loader2, LogOut } from "lucide-react";

export default function AccountInfoPage() {
  const t = useT();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

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
      toast(t("dashboard.account.profileUpdated"), "success");
    } else {
      toast(`Erreur : ${result.error}`, "error");
    }
    
    setSaving(false);
  };

  // La déconnexion n'existait que dans la barre latérale, derrière une icône
  // sans libellé : personne ne la trouvait depuis les paramètres, qui sont
  // pourtant l'endroit où on la cherche.
  const handleSignOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
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
        {t("dashboard.account.general")}
      </h2>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <div>
            <label className="form-label" htmlFor="firstName">{t("dashboard.account.firstName")}</label>
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
            <label className="form-label" htmlFor="lastName">{t("dashboard.account.lastName")}</label>
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
          <label className="form-label" htmlFor="companyName">{t("dashboard.account.company")}</label>
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
            {saving ? <><Loader2 size={16} className="spin" /> {t("common.states.saving")}</> : t("dashboard.account.saveChanges")}
          </button>
        </div>
      </form>

      {/* Session — séparé du formulaire : ce n'est pas une modification à
          enregistrer, c'est une action immédiate. */}
      <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: "600", color: "var(--foreground)" }}>
          {t("dashboard.account.session")}
        </h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0, maxWidth: "420px" }}>
            {t("dashboard.account.signOutHelp")}
          </p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{ display: "flex", alignItems: "center", gap: "8px", width: "fit-content", flexShrink: 0 }}
          >
            {signingOut ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />}
            {t("dashboard.nav.signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
