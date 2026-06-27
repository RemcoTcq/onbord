"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEmployerBranding, updateEmployerBranding } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { Loader2, Palette, UploadCloud, Lock, Sparkles, Check, Image as ImageIcon, Info } from "lucide-react";

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
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

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
      toast("L'image doit faire moins de 2 Mo.", "error");
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
      toast("Logo téléversé avec succès !", "success");
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast("Échec du téléversement.", "error");
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
        toast("Modifications appliquées à TOUTES les offres de votre entreprise.", "success");
      } else {
        toast("Branding mis à jour avec succès !", "success");
      }
    } else {
      toast(`Erreur : ${result.error}`, "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
        <Loader2 className="spin" size={24} style={{ color: "var(--primary)" }} />
      </div>
    );
  }



  const primaryText = getContrastColor(primaryColor);

  return (
    <div className="fade-in">
      {showContextWarning && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '1.5rem', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Info size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#1e3a8a', margin: '0 0 4px 0' }}>Réglage global (Niveau Entreprise)</h4>
            <p style={{ fontSize: '12px', color: '#1e40af', margin: 0, lineHeight: '1.5' }}>
              La marque employeur est unique pour tout votre compte. Toute modification ici s'appliquera automatiquement à <strong>toutes vos offres d'emploi</strong>.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem" }}>Identité de l'entreprise</h3>
            
            <div style={{ marginBottom: "1.25rem" }}>
              <label className="form-label" style={{ fontSize: "12px" }}>Nom d'affichage</label>
              <input 
                type="text" 
                className="input-field" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder="Ex: Acme Corp" 
                required
              />
            </div>

            <div>
              <label className="form-label" style={{ fontSize: "12px" }}>Courte présentation (optionnel)</label>
              <textarea 
                className="input-field" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Ex: Start-up innovante dans le domaine de la greentech..." 
                rows={3}
              />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem" }}>Logo</h3>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ 
                width: "80px", height: "80px", borderRadius: "8px", border: "1px dashed var(--border)", 
                background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden"
              }}>
                {logoUrl ? <img src={logoUrl} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} /> : <ImageIcon size={30} style={{ opacity: 0.5 }} />}
              </div>
              <div style={{ flex: 1 }}>
                <label className="btn btn-secondary" style={{ cursor: "pointer", fontSize: "12.5px" }}>
                  {uploading ? <><Loader2 className="spin" size={14} /> Téléversement...</> : <><UploadCloud size={14} /> Choisir une image</>}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: "none" }} />
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1.25rem" }}>Couleur principale (Accent)</h3>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
              Appliquée aux boutons, bordures et éléments interactifs (jamais au fond de la page).
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: "6px", width: "40px", height: "36px", cursor: "pointer" }} />
              <input type="text" className="input-field" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ fontFamily: "monospace", width: "120px" }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ alignSelf: "flex-start", padding: "10px 24px" }}>
            {saving ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : "Enregistrer les modifications"}
          </button>
        </form>

        <div>
          <div style={{ position: "sticky", top: "2rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>Aperçu (Vue candidat)</h3>
            
            <div className="card" style={{ borderRadius: "12px", boxShadow: "var(--shadow-lg)", padding: "1.5rem", background: "white", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ height: "24px", maxWidth: "120px", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>{companyName || "Nom de l'entreprise"}</span>
                )}
              </div>

              {description && (
                <div style={{ fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: "1.5", fontStyle: "italic", borderLeft: `3px solid ${primaryColor}`, paddingLeft: "10px" }}>
                  "{description}"
                </div>
              )}

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#475569" }}>Progression</span>
                  <span style={{ fontWeight: "700", color: primaryColor }}>1/3</span>
                </div>
                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: "33%", height: "100%", background: primaryColor, borderRadius: "99px" }} />
                </div>
              </div>

              <div style={{ border: `2px solid ${primaryColor}`, background: `${primaryColor}0c`, borderRadius: "8px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: primaryColor, color: primaryText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700" }}>A</div>
                <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: "500" }}>Option sélectionnée</span>
              </div>

              <button type="button" style={{ background: primaryColor, color: primaryText, border: "none", borderRadius: "6px", padding: "10px 16px", fontSize: "13px", fontWeight: "600", cursor: "default" }}>
                Continuer l'évaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
