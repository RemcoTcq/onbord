"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import {
  ArrowLeft, Loader2, Briefcase, Mail, MapPin,
  TrendingUp, Trash2, ExternalLink, FileText
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteCandidate, getCvSignedUrl } from "@/lib/actions/candidate";
import { useToast } from "@/components/ui/Toast";



export default function TalentDetailPage() {
  const { t, locale } = useI18n();
  const params = useParams();
  const router = useRouter();
  const { id: talentId } = params;

  const [talent, setTalent] = useState(null);
  // `resumes` est un bucket privé : la colonne cv_url n'est plus une adresse
  // ouvrable, il faut demander une URL signée au serveur.
  const [cvUrl, setCvUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadTalent(); }, [talentId]);

  async function loadTalent() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("candidates")
      .select("*, jobs(id, title, location, contract_type, category)")
      .eq("id", talentId)
      .eq("is_in_pool", true)
      .single();

    if (data) {
      setTalent(data);
      if (data.cv_url || data.cv_storage_path) {
        const res = await getCvSignedUrl(talentId);
        setCvUrl(res.success ? res.url : null);
      }
    }
    setLoading(false);
  }

  async function handleRemoveFromPool() {
    if (!confirm(t("dashboard.talents.removeConfirm"))) return;
    setRemoving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("candidates")
      .update({ is_in_pool: false, pool_added_at: null })
      .eq("id", talentId);

    if (!error) {
      toast(t("dashboard.talents.removed"));
      router.push("/talents");
    } else {
      toast(t("dashboard.talents.error"), "error");
    }
    setRemoving(false);
  }

  async function handleDeleteTalent() {
    if (!confirm(t("dashboard.talents.deleteForeverConfirm"))) return;
    setRemoving(true);
    const res = await deleteCandidate(talentId);
    if (res.success) {
      toast(t("dashboard.talents.deletedForever"));
      router.push("/talents");
    } else {
      toast(t("dashboard.talents.removeError"), "error");
    }
    setRemoving(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={24} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!talent) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>{t("dashboard.talents.notFound")}</h2>
        <button className="btn btn-primary" onClick={() => router.push("/talents")}>{t("dashboard.talents.backToTalents")}</button>
      </div>
    );
  }

  const initials = `${(talent.first_name || "?")[0]}${(talent.last_name || "?")[0]}`.toUpperCase();

  return (
    <div className="fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Back */}
      <button
        className="btn btn-ghost"
        onClick={() => router.push("/talents")}
        style={{ marginBottom: "24px" }}
      >
        <ArrowLeft size={16} /> Retour aux talents
      </button>

      {/* Profile Header */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "56px", height: "56px", borderRadius: "6px",
              background: "var(--foreground)", color: "var(--background)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "18px", fontWeight: "700", flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--foreground)", letterSpacing: "-0.02em" }}>
                {talent.first_name} {talent.last_name}
              </h1>
              {talent.email && (
                <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                  <Mail size={12} /> {talent.email}
                </p>
              )}
              {talent.pool_added_at && (
                <p style={{ fontSize: "11px", color: "var(--muted-foreground)", marginTop: "4px" }}>
                  {t("dashboard.talents.addedOn", { date: formatDateLong(talent.pool_added_at, locale) })}
                </p>
              )}
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: "8px", padding: "0", height: "auto", fontSize: "12px", color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <FileText size={12} /> Voir le CV original
                </a>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-sm btn-outline"
              style={{ flexShrink: 0 }}
              onClick={handleRemoveFromPool}
              disabled={removing}
            >
              {t("dashboard.talents.removeFromPool")}
            </button>
            <button
              className="btn btn-sm"
              style={{ background: "#fee2e2", color: "#991b1b", border: "none", flexShrink: 0 }}
              onClick={handleDeleteTalent}
              disabled={removing}
            >
              {removing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
              {t("dashboard.talents.deleteForever")}
            </button>
          </div>
        </div>
      </div>

      {/* Job associé */}
      {talent.jobs && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {t("dashboard.talents.linkedJob")}
          </h2>
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", border: "1px dashed var(--border)", borderRadius: "4px",
              cursor: "pointer", transition: "background 100ms"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            onClick={() => router.push(`/jobs/${talent.jobs.id}/candidats/${talent.id}`)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "4px",
                background: "var(--foreground)", color: "var(--background)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
              }}>
                <Briefcase size={14} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>{talent.jobs.title}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                  {talent.jobs.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                      <MapPin size={10} /> {talent.jobs.location}
                    </span>
                  )}
                  {talent.jobs.contract_type && (
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>{talent.jobs.contract_type}</span>
                  )}
                </div>
              </div>
            </div>
            <ExternalLink size={14} style={{ color: "var(--muted-foreground)" }} />
          </div>
        </div>
      )}

      {/* Résumé IA */}
      {talent.ai_summary && (
        <div className="card" style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "13px", fontWeight: "600", color: "var(--muted-foreground)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "6px" }}>
            <TrendingUp size={14} /> Synthèse du profil
          </h2>
          <p style={{ fontSize: "13px", lineHeight: "1.8", color: "var(--foreground)" }}>
            {talent.ai_summary}
          </p>
        </div>
      )}


      {/* Link to full scorecard */}
      <div
        className="card-dashed"
        style={{ textAlign: "center", cursor: "pointer", transition: "background 100ms" }}
        onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
        onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
        onClick={() => router.push(`/jobs/${talent.job_id}/candidats/${talent.id}`)}
      >
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <ExternalLink size={13} /> Voir la scorecard complète dans le job
        </p>
      </div>
    </div>
  );
}
