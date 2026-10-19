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
  // Couleur du texte sur les boutons candidat. Vide = automatique (contraste).
  const [textColor, setTextColor] = useState("");
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
          setTextColor(res.branding.text_color || "");
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
      primary_color: primaryColor,
      text_color: textColor,
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

  // Couleur de l'entreprise : elle habille l'expérience CANDIDAT (pages de
  // candidature et simulation). L'interface recruteur, elle, garde la palette
  // Onbord quelle que soit cette couleur.
  const auto = !/^#[0-9a-f]{6}$/i.test(textColor);
  const primaryText = auto ? getContrastColor(primaryColor) : textColor;

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, alignItems: "start" }}>
        {/* Réglages */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.branding.displayName")}</span>
            <input type="text" className="ds-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t("dashboard.branding.companyNamePlaceholder")} required />
          </label>
          <label className="ds-field">
            <span className="ds-label">{t("dashboard.branding.shortPitch")}</span>
            <textarea className="ds-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("dashboard.branding.taglinePlaceholder")} rows={3} />
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
          <div className="ds-field">
            <span className="ds-label">{t("dashboard.branding.primaryColor")}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} aria-label={t("dashboard.branding.primaryColor")}
                style={{ width: 40, height: 40, padding: 3, border: "1px solid var(--ds-line)", borderRadius: 9, background: "#FFFFFF", cursor: "pointer" }} />
              <input type="text" className="ds-input ds-mono" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} aria-label={t("dashboard.branding.primaryColor")} style={{ width: 120 }} />
            </div>
            <span className="ds-help">{t("dashboard.branding.primaryColorHelp")}</span>
          </div>
          <div className="ds-field">
            <span className="ds-label">{t("dashboard.branding.textColor")}</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input type="color" value={auto ? primaryText : textColor} onChange={(e) => setTextColor(e.target.value)} aria-label={t("dashboard.branding.textColor")}
                style={{ width: 40, height: 40, padding: 3, border: "1px solid var(--ds-line)", borderRadius: 9, background: "#FFFFFF", cursor: "pointer" }} />
              <input type="text" className="ds-input ds-mono" value={textColor} onChange={(e) => setTextColor(e.target.value.trim())} placeholder={t("dashboard.branding.textColorAuto")} aria-label={t("dashboard.branding.textColor")} style={{ width: 120 }} />
              <button type="button" className="ds-btn ds-btn-sm" onClick={() => setTextColor("")} disabled={auto} aria-pressed={auto}>
                {t("dashboard.branding.textColorAuto")}
              </button>
            </div>
            <span className="ds-help">{auto ? t("dashboard.branding.textColorAutoHelp") : t("dashboard.branding.textColorHelp")}</span>
          </div>
        </div>

        {/* Aperçu de la page candidat, à la couleur de l'entreprise */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="ds-label">{t("dashboard.branding.preview")}</span>
          <div className="ds-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16, boxShadow: "var(--ds-shadow-pop)" }}>
            <div style={{ borderBottom: "1px solid var(--ds-line-2)", paddingBottom: 10 }}>
              {logoUrl
                ? <img src={logoUrl} alt="" style={{ height: 24, maxWidth: 120, objectFit: "contain" }} />
                : <span style={{ fontWeight: 600 }}>{companyName || t("dashboard.branding.previewCompanyName")}</span>}
            </div>
            {description && (
              <div style={{ fontSize: 13, color: "var(--ds-ink-3)", lineHeight: 1.5, fontStyle: "italic", borderLeft: `3px solid ${primaryColor}`, paddingLeft: 10 }}>
                « {description} »
              </div>
            )}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--ds-ink-3)" }}>{t("dashboard.branding.previewProgress")}</span>
                <span className="ds-mono" style={{ fontWeight: 500, color: primaryColor }}>1/3</span>
              </div>
              <div style={{ height: 6, background: "var(--ds-line-2)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: "33%", height: "100%", background: primaryColor, borderRadius: 999 }} />
              </div>
            </div>
            <div style={{ border: `2px solid ${primaryColor}`, background: `${primaryColor}0c`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: primaryColor, color: primaryText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>A</div>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t("dashboard.branding.previewSelected")}</span>
            </div>
            <span style={{ background: primaryColor, color: primaryText, borderRadius: 9, padding: "10px 16px", fontSize: 13, fontWeight: 500, textAlign: "center" }}>
              {t("dashboard.branding.previewContinue")}
            </span>
          </div>
        </div>
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
