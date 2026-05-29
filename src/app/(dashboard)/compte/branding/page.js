"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBranding } from "@/lib/actions/user";
import { useToast } from "@/components/ui/Toast";
import { Loader2, Palette, UploadCloud, Lock, Sparkles, Check, Image as ImageIcon } from "lucide-react";

export default function BrandingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState("core");

  // Form states
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [secondaryColor, setSecondaryColor] = useState("#818cf8");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadUserData() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const { data, error } = await supabase
            .from("users")
            .select("id, plan, company_logo_url, brand_primary_color, brand_secondary_color")
            .eq("id", authUser.id)
            .single();

          if (data) {
            setUser(data);
            setPlan(data.plan || "core");
            setLogoUrl(data.company_logo_url || "");
            setPrimaryColor(data.brand_primary_color || "#4f46e5");
            setSecondaryColor(data.brand_secondary_color || "#818cf8");
          }
        }
      } catch (err) {
        console.error("Error loading user data:", err);
      }
      setLoading(false);
    }

    loadUserData();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 2MB) and type
    if (file.size > 2 * 1024 * 1024) {
      toast("L'image doit faire moins de 2 Mo.", "error");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

      // Upload file to 'logos' bucket
      const { data, error } = await supabase.storage
        .from("logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Storage upload error:", error);
        // Fallback info
        throw new Error(error.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("logos")
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast("Logo téléversé avec succès !", "success");
    } catch (err) {
      console.error("Logo upload failed:", err);
      toast("Échec du téléversement. Veuillez utiliser une URL directe à la place.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const result = await updateBranding({
      company_logo_url: logoUrl,
      brand_primary_color: primaryColor,
      brand_secondary_color: secondaryColor,
    });

    if (result.success) {
      toast("Branding mis à jour avec succès !", "success");
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

  // ─── Paywall View for Core Plan ───────────────────────────────────────────
  const isPremium = plan === "pro" || plan === "enterprise" || plan === "beta";
  if (!isPremium) {
    return (
      <div className="fade-in" style={{ padding: "1rem 0" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(129, 140, 248, 0.05) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "3rem 2rem",
          textAlign: "center",
          maxWidth: "680px",
          margin: "0 auto",
          boxShadow: "var(--shadow-md)"
        }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "#e0e7ff",
            color: "#4f46e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem"
          }}>
            <Lock size={26} />
          </div>

          <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "1rem" }}>
            Branding Personnalisé
          </h2>
          <p style={{ color: "var(--muted-foreground)", fontSize: "15px", lineHeight: "1.6", maxWidth: "500px", margin: "0 auto 2rem" }}>
            Personnalisez l'expérience de vos candidats en y intégrant vos propres couleurs et le logo de votre entreprise. 
            Disponible exclusivement dans les plans Pro et Entreprise.
          </p>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: "1.25rem", 
            textAlign: "left", 
            maxWidth: "500px", 
            margin: "0 auto 2.5rem" 
          }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, paddingLeft: '3px', paddingTop: '1px' }}>
                <Check size={14} />
              </div>
              <div>
                <strong style={{ fontSize: "13.5px", display: "block" }}>Logo de l'entreprise</strong>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Affiché sur les tests et l'accueil candidat.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, paddingLeft: '3px', paddingTop: '1px' }}>
                <Check size={14} />
              </div>
              <div>
                <strong style={{ fontSize: "13.5px", display: "block" }}>Palette de couleurs</strong>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Boutons, steppers et éléments interactifs.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, paddingLeft: '3px', paddingTop: '1px' }}>
                <Check size={14} />
              </div>
              <div>
                <strong style={{ fontSize: "13.5px", display: "block" }}>Marque grise</strong>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Expérience 100% immersive pour vos talents.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#dcfce7", color: "#166534", display: "flex", alignItems: "center", justifyItems: "center", flexShrink: 0, paddingLeft: '3px', paddingTop: '1px' }}>
                <Check size={14} />
              </div>
              <div>
                <strong style={{ fontSize: "13.5px", display: "block" }}>Tests sur mesure</strong>
                <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>Mettez en avant l'identité de votre entreprise.</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => toast("Contactez notre équipe de vente pour faire évoluer votre plan vers Pro/Entreprise !", "info")}
            className="btn btn-primary"
            style={{ 
              background: "linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)", 
              border: "none", 
              color: "white", 
              padding: "12px 28px", 
              fontSize: "14px", 
              fontWeight: "700",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <Sparkles size={16} /> Passer au plan supérieur
          </button>
        </div>
      </div>
    );
  }

  // ─── Customizer View for Premium Plans ────────────────────────────────────
  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Palette size={20} style={{ color: "var(--primary)" }} /> Personnalisation visuelle
        </h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem", fontSize: "13px" }}>
          Configurez l'apparence des pages d'évaluations que vos candidats vont parcourir.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
        {/* Paramètres */}
        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Logo */}
          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem" }}>Logo de l'entreprise</h3>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ 
                width: "80px", 
                height: "80px", 
                borderRadius: "8px", 
                border: "1px dashed var(--border)", 
                background: "var(--secondary)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                overflow: "hidden"
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo de l'entreprise" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                ) : (
                  <ImageIcon size={30} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label className="btn btn-secondary" style={{ cursor: "pointer", fontSize: "12.5px" }}>
                  {uploading ? (
                    <><Loader2 className="spin" size={14} /> Téléversement...</>
                  ) : (
                    <><UploadCloud size={14} /> Choisir une image</>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    disabled={uploading} 
                    style={{ display: "none" }} 
                  />
                </label>
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "6px" }}>
                  Format PNG ou JPEG. Moins de 2 Mo. Ratio horizontal recommandé.
                </p>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: "12px" }}>OU URL directe du logo</label>
              <input 
                type="url" 
                className="input-field" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                placeholder="https://mon-entreprise.com/logo.png" 
              />
            </div>
          </div>

          {/* Palette de couleurs */}
          <div className="card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1.25rem" }}>Palette de couleurs</h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <div>
                <label className="form-label" style={{ fontSize: "12px" }}>Couleur primaire</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    style={{ border: "1px solid var(--border)", borderRadius: "6px", width: "40px", height: "36px", padding: "1px", cursor: "pointer" }} 
                  />
                  <input 
                    type="text" 
                    className="input-field" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    style={{ fontFamily: "monospace" }} 
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "12px" }}>Couleur de survol</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input 
                    type="color" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)} 
                    style={{ border: "1px solid var(--border)", borderRadius: "6px", width: "40px", height: "36px", padding: "1px", cursor: "pointer" }} 
                  />
                  <input 
                    type="text" 
                    className="input-field" 
                    value={secondaryColor} 
                    onChange={(e) => setSecondaryColor(e.target.value)} 
                    style={{ fontFamily: "monospace" }} 
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving || uploading}
            style={{ alignSelf: "flex-end", padding: "10px 24px" }}
          >
            {saving ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : "Enregistrer le branding"}
          </button>
        </form>

        {/* Live Preview */}
        <div>
          <div style={{ position: "sticky", top: "2rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
              Aperçu en temps réel (Vue candidat)
            </h3>
            
            <div className="card" style={{ 
              borderRadius: "12px", 
              boxShadow: "var(--shadow-lg)", 
              padding: "1.5rem", 
              border: "1px solid var(--border)",
              display: "flex", 
              flexDirection: "column", 
              gap: "1.25rem",
              background: "white"
            }}>
              {/* Top branded header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ height: "24px", maxWidth: "120px", objectFit: "contain" }} />
                ) : (
                  <span style={{ fontSize: "14px", fontWeight: "700" }}>Nom de l'entreprise</span>
                )}
                <span style={{ fontSize: "11px", fontWeight: "600", color: "#64748b" }}>Assessment</span>
              </div>

              {/* Progress bar mock */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                  <span style={{ color: "#475569" }}>Progression</span>
                  <span style={{ fontWeight: "700", color: primaryColor }}>1/3 Complété</span>
                </div>
                <div style={{ height: "6px", background: "#f1f5f9", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: "33%", height: "100%", background: primaryColor, borderRadius: "99px" }} />
                </div>
              </div>

              {/* Card option preview */}
              <div style={{
                border: `2px solid ${primaryColor}`,
                background: `${primaryColor}0c`, // Transparent primary
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}>
                <div style={{ 
                  width: "24px", 
                  height: "24px", 
                  borderRadius: "6px", 
                  background: primaryColor, 
                  color: "white", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: "700"
                }}>
                  A
                </div>
                <span style={{ fontSize: "13px", color: "var(--foreground)", fontWeight: "500" }}>Option sélectionnée candidat</span>
              </div>

              {/* Button preview */}
              <button 
                type="button" 
                style={{ 
                  background: primaryColor, 
                  color: "white", 
                  border: "none", 
                  borderRadius: "6px", 
                  padding: "10px 16px", 
                  fontSize: "13px", 
                  fontWeight: "600",
                  cursor: "default",
                  transition: "background 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = secondaryColor}
                onMouseLeave={(e) => e.currentTarget.style.background = primaryColor}
              >
                Continuer l'évaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
