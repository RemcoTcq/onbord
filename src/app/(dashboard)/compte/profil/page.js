"use client";

import { useState, useEffect } from "react";
import { getCompanyProfile, updateCompanyProfile, fetchAndAnalyzeWebsite } from "@/lib/actions/company-profile";
import { useToast } from "@/components/ui/Toast";
import {
  Loader2, Building2, Globe, Target, Briefcase, Users,
  Wand2, AlertCircle, Lock, ChevronRight, TrendingUp
} from "lucide-react";

export default function CompanyProfilePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form states
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [industry, setIndustry] = useState("");
  const [domain, setDomain] = useState("");
  const [recruitmentHabits, setRecruitmentHabits] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getCompanyProfile();
      if (res.success && res.profile) {
        setWebsiteUrl(res.profile.website_url || "");
        setDescription(res.profile.description || "");
        setTargetMarket(res.profile.target_market || "");
        setIndustry(res.profile.industry || "");
        setDomain(res.profile.domain || "");
        setRecruitmentHabits(res.profile.recruitment_habits || "");
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl.trim()) {
      toast("Veuillez saisir l'URL de votre site web.", "error");
      return;
    }
    setAnalyzing(true);
    const result = await fetchAndAnalyzeWebsite(websiteUrl.trim());
    if (result.success && result.context) {
      if (result.context.description) setDescription(result.context.description);
      if (result.context.target_market) setTargetMarket(result.context.target_market);
      if (result.context.industry) setIndustry(result.context.industry);
      if (result.context.domain) setDomain(result.context.domain);
      toast("Contexte IA généré avec succès ! Vérifiez et ajustez les champs si besoin.", "success");
    } else {
      toast(result.error || "Analyse impossible. Remplissez les champs manuellement.", "error");
    }
    setAnalyzing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateCompanyProfile({
      website_url: websiteUrl,
      description,
      target_market: targetMarket,
      industry,
      domain,
      recruitment_habits: recruitmentHabits,
    });
    if (result.success) {
      toast("Profil entreprise enregistré !", "success");
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

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--foreground)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Building2 size={20} style={{ color: "var(--primary)" }} /> Profil Entreprise
        </h2>
        <p style={{ color: "var(--muted-foreground)", marginTop: "0.25rem", fontSize: "13px" }}>
          Ces informations sont utilisées uniquement par l'IA d'Onbord pour personnaliser l'analyse de vos offres. Elles ne sont pas visibles par les candidats.
        </p>
      </div>

      {/* Bandeau informatif */}
      <div style={{
        display: "flex", gap: "10px", alignItems: "flex-start",
        background: "#f0fdf4", border: "1px solid #bbf7d0",
        borderRadius: "8px", padding: "12px 14px", marginBottom: "2rem"
      }}>
        <Lock size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: "2px" }} />
        <p style={{ fontSize: "12.5px", color: "#15803d", margin: 0, lineHeight: "1.6" }}>
          <strong>Contexte privé</strong> — Ces données enrichissent les analyses IA (qualification des offres, scoring candidats) mais ne sont jamais affichées aux candidats.
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* BLOC A — Site web + génération IA */}
        <div className="card">
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Globe size={15} style={{ color: "var(--primary)" }} /> Site web &amp; Contexte IA
          </h3>

          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label" style={{ fontSize: "12px" }}>URL du site web</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="url"
                className="input-field"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://votre-entreprise.com"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAnalyzeWebsite}
                disabled={analyzing || !websiteUrl.trim()}
                className="btn btn-secondary"
                style={{ whiteSpace: "nowrap", gap: "6px", opacity: websiteUrl.trim() ? 1 : 0.5 }}
              >
                {analyzing ? (
                  <><Loader2 size={14} className="spin" /> Analyse...</>
                ) : (
                  <><Wand2 size={14} /> Analyser</>
                )}
              </button>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", marginTop: "6px" }}>
              Onbord va lire votre site et pré-remplir les champs ci-dessous automatiquement.
            </p>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label className="form-label" style={{ fontSize: "12px" }}>
              Description de l'entreprise
              {analyzing && <span style={{ color: "var(--primary)", marginLeft: "8px", fontSize: "11px" }}>Génération en cours...</span>}
            </label>
            <textarea
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="En 3 à 5 phrases, décrivez ce que fait votre entreprise, votre valeur ajoutée, vos produits ou services principaux..."
              rows={4}
              style={{ opacity: analyzing ? 0.6 : 1, transition: "opacity 0.3s" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label className="form-label" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Target size={12} /> Marché cible
              </label>
              <input
                type="text"
                className="input-field"
                value={targetMarket}
                onChange={(e) => setTargetMarket(e.target.value)}
                placeholder="Ex: PME européennes, Grands comptes, Grand public..."
                style={{ opacity: analyzing ? 0.6 : 1, transition: "opacity 0.3s" }}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Briefcase size={12} /> Industrie / Secteur
              </label>
              <input
                type="text"
                className="input-field"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Ex: SaaS RH, Fintech, Retail, Conseil IT..."
                style={{ opacity: analyzing ? 0.6 : 1, transition: "opacity 0.3s" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="form-label" style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={12} /> Modèle commercial (Domain)
              </label>
              <input
                type="text"
                className="input-field"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="Ex: B2B SaaS, B2C, Marketplace, Services professionnels..."
                style={{ opacity: analyzing ? 0.6 : 1, transition: "opacity 0.3s" }}
              />
            </div>
          </div>
        </div>

        {/* BLOC B — Habitudes de recrutement */}
        <div className="card">
          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={15} style={{ color: "var(--primary)" }} /> Habitudes de recrutement
          </h3>
          <p style={{ fontSize: "12px", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
            Décrivez comment vous recrutez habituellement : processus, nombre d'étapes, outils, critères culturels importants…
            L'IA utilisera ces informations pour mieux adapter les parcours d'évaluation.
          </p>
          <textarea
            className="input-field"
            value={recruitmentHabits}
            onChange={(e) => setRecruitmentHabits(e.target.value)}
            placeholder="Ex : Nous recrutons généralement en 3 étapes — un entretien RH de qualification (30 min), un entretien technique avec le manager (1h) et un cas pratique final. Nous valorisons beaucoup la curiosité intellectuelle et la capacité à travailler en autonomie. Nos processus durent environ 3 semaines..."
            rows={5}
          />
        </div>

        {/* BLOC C — Tendances observées (readonly, phase 1 : placeholder) */}
        <div className="card" style={{ opacity: 0.7, position: "relative", overflow: "hidden" }}>
          {/* Overlay grisé */}
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(248,250,252,0.85)",
            backdropFilter: "blur(1px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            zIndex: 2, gap: "8px"
          }}>
            <Lock size={20} style={{ color: "var(--muted-foreground)" }} />
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted-foreground)", margin: 0 }}>
              Disponible après votre premier recrutement sur Onbord
            </p>
            <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: 0, textAlign: "center", maxWidth: "320px" }}>
              Onbord analysera les tendances de vos recrutements passés pour enrichir ce contexte automatiquement.
            </p>
          </div>

          <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={15} style={{ color: "var(--primary)" }} /> Tendances observées (auto-généré)
          </h3>
          <div style={{ height: "80px", background: "var(--secondary)", borderRadius: "6px" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: "10px 24px" }}
          >
            {saving ? <><Loader2 size={16} className="spin" /> Enregistrement...</> : "Enregistrer le profil"}
          </button>
        </div>
      </form>
    </div>
  );
}
