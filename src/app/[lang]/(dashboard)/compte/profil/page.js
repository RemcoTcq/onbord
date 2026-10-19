"use client";

import LanguageSelector from "@/components/settings/LanguageSelector";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import { useState, useEffect } from "react";
import { getCompanyProfile, updateCompanyProfile, fetchAndAnalyzeWebsite } from "@/lib/actions/company-profile";
import { useToast } from "@/components/ui/Toast";
import {
  Loader2, Building2, Globe, Target, Briefcase, Users,
  Wand2, Lock, TrendingUp
} from "lucide-react";

export default function CompanyProfilePage() {
  const { t, locale } = useI18n();
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
      toast(t("dashboard.companyProfile.urlRequired"), "error");
      return;
    }
    setAnalyzing(true);
    const result = await fetchAndAnalyzeWebsite(websiteUrl.trim(), locale);
    if (result.success && result.context) {
      if (result.context.description) setDescription(result.context.description);
      if (result.context.target_market) setTargetMarket(result.context.target_market);
      if (result.context.industry) setIndustry(result.context.industry);
      if (result.context.domain) setDomain(result.context.domain);
      toast(t("dashboard.companyProfile.contextGenerated"), "success");
    } else {
      toast(result.code ? t(`dashboard.companyProfile.analyzeErrors.${result.code}`, { status: result.status }) : t("dashboard.companyProfile.analysisFailed"), "error");
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
      toast(t("dashboard.companyProfile.saved"), "success");
    } else {
      toast(result.error || t("dashboard.jobDetail.error"), "error");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <Loader2 size={22} style={{ color: "var(--ds-ink-5)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  const estompe = { opacity: analyzing ? 0.6 : 1, transition: "opacity 0.3s" };

  return (
    <>
      {/* Langue de l'interface — en tête de page, avant le profil entreprise :
          c'est le réglage qui change ce que le recruteur lit ensuite. */}
      <LanguageSelector />

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Site web + génération IA */}
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.companyProfile.title")}
            </h2>
            <p className="ds-sub">{t("dashboard.companyProfile.subtitle")}</p>
          </div>

          {/* Bandeau informatif */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "#F5FBF8", border: "1px solid #D4EEE1", borderRadius: 10, padding: "10px 12px" }}>
            <Lock size={14} color="var(--ds-green-ink)" style={{ flexShrink: 0, marginTop: 3 }} />
            <p style={{ fontSize: 13, color: "#0F5C39", margin: 0, lineHeight: 1.55 }}>
              {tNodes(t("dashboard.companyProfile.privateNotice"), {
                label: <strong key="l" style={{ fontWeight: 600 }}>{t("dashboard.companyProfile.privateContext")}</strong>,
              })}
            </p>
          </div>

          <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="ds-field">
              <label className="ds-label" htmlFor="ds-site" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Globe size={12} /> {t("dashboard.companyProfile.websiteUrl")}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="ds-site"
                  type="url"
                  className="ds-input"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder={t("dashboard.companyProfile.websitePlaceholder")}
                />
                <button type="button" onClick={handleAnalyzeWebsite} disabled={analyzing || !websiteUrl.trim()} className="ds-btn" style={{ height: 40, flex: "none" }}>
                  {analyzing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Wand2 size={14} />}
                  {analyzing ? t("dashboard.companyProfile.analyzing") : t("dashboard.companyProfile.analyze")}
                </button>
              </div>
              <span className="ds-help">{t("dashboard.companyProfile.analyzeHelp")}</span>
            </div>

            <label className="ds-field">
              <span className="ds-label">
                {t("dashboard.companyProfile.description")}
                {analyzing && <span style={{ color: "var(--ds-blue)", marginLeft: 8 }}>{t("dashboard.companyProfile.generating")}</span>}
              </span>
              <textarea className="ds-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("dashboard.companyProfile.descriptionPlaceholder")} rows={4} style={estompe} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <label className="ds-field">
                <span className="ds-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Target size={12} /> {t("dashboard.companyProfile.targetMarket")}</span>
                <input type="text" className="ds-input" value={targetMarket} onChange={(e) => setTargetMarket(e.target.value)} placeholder={t("dashboard.companyProfile.targetMarketPlaceholder")} style={estompe} />
              </label>
              <label className="ds-field">
                <span className="ds-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={12} /> {t("dashboard.companyProfile.industry")}</span>
                <input type="text" className="ds-input" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder={t("dashboard.companyProfile.targetMarketPlaceholder")} style={estompe} />
              </label>
              <label className="ds-field" style={{ gridColumn: "1 / -1" }}>
                <span className="ds-label" style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={12} /> {t("dashboard.companyProfile.businessModel")}</span>
                <input type="text" className="ds-input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder={t("dashboard.companyProfile.businessModelPlaceholder")} style={estompe} />
              </label>
            </div>
          </div>
        </section>

        {/* Habitudes de recrutement */}
        <section className="ds-panel">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 10px 0" }}>
            <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} style={{ color: "var(--ds-blue)" }} /> {t("dashboard.companyProfile.habits")}
            </h2>
            <p className="ds-sub">{t("dashboard.companyProfile.habitsPlaceholder")} {t("dashboard.companyProfile.habitsHelp")}</p>
          </div>
          <div className="ds-inset">
            <textarea className="ds-textarea" value={recruitmentHabits} onChange={(e) => setRecruitmentHabits(e.target.value)} placeholder={t("dashboard.companyProfile.habitsExample")} rows={5} aria-label={t("dashboard.companyProfile.habits")} />
          </div>
          <div className="ds-panel-foot">
            <button type="submit" className="ds-btn ds-btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
              {saving ? t("common.states.saving") : t("dashboard.companyProfile.save")}
            </button>
          </div>
        </section>

        {/* Tendances observées — à venir, après le premier recrutement */}
        <section className="ds-panel" style={{ opacity: 0.85 }}>
          <h2 className="ds-h2" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 10px 0" }}>
            <TrendingUp size={16} style={{ color: "var(--ds-ink-4)" }} /> {t("dashboard.companyProfile.observedTrends")}
          </h2>
          <div className="ds-inset ds-empty" style={{ padding: "22px 16px" }}>
            <Lock size={16} />
            <span className="ds-empty-title">{t("dashboard.companyProfile.afterFirstHire")}</span>
            <span style={{ maxWidth: 360 }}>{t("dashboard.companyProfile.afterFirstHireHelp")}</span>
          </div>
        </section>
      </form>
    </>
  );
}
