"use client";

import { useState } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { updateFilRouge } from "@/lib/actions/experience";
import { updateCvRequis } from "@/lib/actions/job";
import { useI18n } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { inputStyle, labelStyle } from "./ui";

// ─── CV avant la simulation ──────────────────────────────────────────────────
// Réglage de l'OFFRE (jobs.cv_requis), pas de la version : il survit aux
// régénérations et ne crée pas de nouvelle version. Enregistré au clic, sans
// bouton — c'est une case, pas un formulaire.
export function CvRequisCard({ jobId, cvRequis, onSaved, toast }) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  async function basculer(valeur) {
    setSaving(true);
    const res = await updateCvRequis(jobId, valeur);
    setSaving(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    onSaved?.(res.cvRequis);
    toast(t(res.cvRequis ? "dashboard.experienceEditor.cv.enabled" : "dashboard.experienceEditor.cv.disabled"));
  }

  return (
    <div className="card" style={{ padding: "1.1rem 1.4rem", marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: "0.6rem" }}>
        {t("dashboard.experienceEditor.cv.title")}
      </h2>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: saving ? "wait" : "pointer", fontSize: "13.5px", fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={cvRequis}
          disabled={saving}
          onChange={(e) => basculer(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "inherit" }}
        />
        {t("dashboard.experienceEditor.cv.label")}
        {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "var(--muted-foreground)" }} />}
      </label>
      <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: 1.5, margin: "0.5rem 0 0 26px" }}>
        {t("dashboard.experienceEditor.cv.help")} {t("dashboard.experienceEditor.cv.onlyNext")}
      </p>
      <p style={{ fontSize: "12.5px", lineHeight: 1.5, margin: "0.6rem 0 0 26px", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", color: "var(--foreground)" }}>
        {t("dashboard.experienceEditor.cv.advice")}
      </p>
    </div>
  );
}

// ─── Fil rouge ───────────────────────────────────────────────────────────────
// La situation qui relie les étapes, lue par le candidat avant de commencer.
// Décidée par la génération selon le métier ; le recruteur la relit, la
// retouche, ou la retire (texte vidé). L'« univers » est la fiche de cohérence
// des scènes détaillées : il ne s'affiche pas au candidat.
export function FilRougeCard({ experienceId, filRouge, onSaved, toast }) {
  const { t } = useI18n();
  const [contexte, setContexte] = useState(filRouge?.contexte_candidat || "");
  const [univers, setUnivers] = useState(filRouge?.univers || "");
  const [ouvert, setOuvert] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = contexte !== (filRouge?.contexte_candidat || "") || univers !== (filRouge?.univers || "");

  async function save() {
    setSaving(true);
    const res = await updateFilRouge(experienceId, { contexte_candidat: contexte, univers });
    setSaving(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    toast(t(contexte.trim() ? "dashboard.experienceEditor.filRouge.saved" : "dashboard.experienceEditor.filRouge.removed"));
    await onSaved?.(res);
  }

  return (
    <div className="card" style={{ padding: "1.1rem 1.4rem", marginBottom: "1.5rem", borderLeft: dirty ? "3px solid var(--primary)" : undefined }}>
      <h2 style={{ fontSize: "14px", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        {t("dashboard.experienceEditor.filRouge.title")}
      </h2>
      <p style={{ fontSize: "12.5px", color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: "0.75rem" }}>
        {t("dashboard.experienceEditor.filRouge.help")}
      </p>
      <label style={labelStyle}>{t("dashboard.experienceEditor.filRouge.candidateText")}</label>
      <AutoTextarea value={contexte} onChange={(e) => setContexte(e.target.value)} rows={3} style={{ ...inputStyle, lineHeight: 1.5 }} />
      <button className="btn btn-ghost btn-sm" onClick={() => setOuvert((o) => !o)} style={{ fontSize: "12px", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: 4 }}>
        <ChevronDown size={13} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
        {t("dashboard.experienceEditor.filRouge.universe")}
      </button>
      {ouvert && (
        <>
          <p style={{ fontSize: "11.5px", color: "var(--muted-foreground)", margin: "0.25rem 0 0.35rem" }}>{t("dashboard.experienceEditor.filRouge.universeHelp")}</p>
          <AutoTextarea value={univers} onChange={(e) => setUnivers(e.target.value)} rows={4} style={{ ...inputStyle, lineHeight: 1.5, fontSize: "13px" }} />
        </>
      )}
      {dirty && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.75rem" }}>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {t("dashboard.experienceEditor.save")}
          </button>
        </div>
      )}
    </div>
  );
}
