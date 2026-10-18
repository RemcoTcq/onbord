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
      toast(result.error || t("dashboard.jobDetail.error"), "error");
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
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="ds-panel">
        <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.account.general")}</h2>
        <div className="ds-inset" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <label className="ds-field" htmlFor="firstName">
            <span className="ds-label">{t("dashboard.account.firstName")}</span>
            <input id="firstName" type="text" className="ds-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </label>
          <label className="ds-field" htmlFor="lastName">
            <span className="ds-label">{t("dashboard.account.lastName")}</span>
            <input id="lastName" type="text" className="ds-input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </label>
          <label className="ds-field" htmlFor="companyName" style={{ gridColumn: "1 / -1" }}>
            <span className="ds-label">{t("dashboard.account.company")}</span>
            <input id="companyName" type="text" className="ds-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </label>
        </div>
        <div className="ds-panel-foot">
          <button type="submit" className="ds-btn ds-btn-primary" disabled={saving}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? t("common.states.saving") : t("dashboard.account.saveChanges")}
          </button>
        </div>
      </form>

      {/* Session — séparé du formulaire : ce n'est pas une modification à
          enregistrer, c'est une action immédiate. */}
      <section className="ds-panel">
        <h2 className="ds-h2" style={{ padding: "10px 10px 0" }}>{t("dashboard.account.session")}</h2>
        <div className="ds-inset" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <p className="ds-sub" style={{ maxWidth: 460 }}>{t("dashboard.account.signOutHelp")}</p>
          <button type="button" className="ds-btn" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <LogOut size={15} />}
            {t("dashboard.nav.signOut")}
          </button>
        </div>
      </section>
    </>
  );
}
