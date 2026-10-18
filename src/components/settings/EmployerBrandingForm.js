"use client";

import { useT, tNodes } from "@/lib/i18n/I18nProvider";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEmployerBranding, updateEmployerBranding } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { Loader2, UploadCloud, Image as ImageIcon, Info } from "lucide-react";

export function getContrastColor(hexColor) {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export default function EmployerBrandingForm({ showContextWarning = false }) {
  const t = useT();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getEmployerBranding();
        if (res.success && res.branding) {
          setCompanyName(res.branding.name || "");
          setLogoUrl(res.branding.logo_url || "");
          setPrimaryColor(res.branding.primary_color || "#4f46e5");
          setDescription(res.branding.description || "");
        }
      } catch (err) {
        console.error("Error loading branding:", err);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast(t("dashboard.branding.tooLarge"), "error");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage.from("logos").upload(fileName, file, { cacheControl: "3600", upsert: true });
      if (error) throw new Error(error.message);

      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(fileName);
      setLogoUrl(publicUrl);
      toast(t("dashboard.branding.logoUploaded"), "success");
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast(t("dashboard.branding.uploadFailed"), "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateEmployerBranding({
      name: companyName,
      description,
      logo_url: logoUrl,
      primary_color: primaryColor
    });

    if (result.success) {
      if (showContextWarning) {
        toast(t("dashboard.branding.appliedToAll"), "success");
      } else {
        toast(t("dashboard.branding.saved"), "success");
      }
    } else {
      toast(result.error || t("dashboard.jobDetail.error"), "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  // La couleur d'entreprise n'est plus réglable depuis l'interface recruteur
  // (refonte d'octobre 2026) : celle déjà enregistrée est conservée telle quelle
  // à l'enregistrement, rien n'est effacé.
  return (
    <form onSubmit={handleSave} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {showContextWarning && (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 12px", borderRadius: 10, background: "var(--ds-blue-06)", border: "1px solid var(--ds-blue-16)" }}>
          <Info size={16} color="var(--ds-blue)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 500, color: "var(--ds-ink)", margin: "0 0 2px" }}>{t("dashboard.branding.globalSetting")}</h4>
            <p className="ds-sub" style={{ lineHeight: 1.5 }}>
              {tNodes(t("dashboard.branding.globalSettingHelp"), {
                allJobs: <strong key="a" style={{ fontWeight: 500 }}>{t("dashboard.branding.globalSettingAllJobs")}</strong>,
              })}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <label className="ds-field">
          <span className="ds-label">{t("dashboard.branding.displayName")}</span>
          <input type="text" className="ds-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("dashboard.branding.companyNamePlaceholder")} required />
        </label>
        <div className="ds-field">
          <span className="ds-label">{t("dashboard.branding.logo")}</span>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 40, height: 40, flex: "none", borderRadius: 10, border: "1px dashed #C9D3EA", background: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {logoUrl ? <img src={logoUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <ImageIcon size={18} color="var(--ds-ink-5)" />}
            </span>
            <label className="ds-btn" style={{ height: 40 }}>
              {uploading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <UploadCloud size={14} />}
              {uploading ? t("dashboard.branding.uploading") : t("dashboard.branding.chooseImage")}
              <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: "none" }} />
            </label>
          </div>
        </div>
        <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
          <span className="ds-label">{t("dashboard.branding.shortPitch")}</span>
          <textarea className="ds-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("dashboard.branding.taglinePlaceholder")} rows={3} />
        </label>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="ds-btn ds-btn-primary" disabled={saving || uploading}>
          {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          {saving ? t("common.states.saving") : t("dashboard.branding.save")}
        </button>
      </div>
    </form>
  );
}
