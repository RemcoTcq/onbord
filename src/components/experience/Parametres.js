"use client";

import { useState, useEffect } from "react";
import { Loader2, Check, ChevronDown, Maximize2, Minimize2 } from "lucide-react";
import { updateFilRouge } from "@/lib/actions/experience";
import { updateCvRequis } from "@/lib/actions/job";
import { useI18n, tNodes } from "@/lib/i18n/I18nProvider";
import AutoTextarea from "@/components/ui/AutoTextarea";
import { inputStyle } from "./ui";

// Carte de réglage de la vue d'ensemble (maquette « D · Simulation ») : un
// titre, puis un encart gris-bleu.
function CarteReglage({ titre, aide, action, children, modifie = false }) {
  return (
    <div className="ds-panel" style={modifie ? { borderColor: "var(--ds-blue-30)" } : undefined}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, padding: "9px 9px 0" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontWeight: 500 }}>{titre}</span>
          {action}
        </span>
        {aide && <span className="ds-sub">{aide}</span>}
      </span>
      <div className="ds-inset" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        {children}
      </div>
    </div>
  );
}

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
    <CarteReglage titre={t("dashboard.experienceEditor.cv.title")}>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: saving ? "wait" : "pointer" }}>
        <input
          type="checkbox"
          checked={cvRequis}
          disabled={saving}
          onChange={(e) => basculer(e.target.checked)}
          style={{ width: 16, height: 16, margin: "2px 0 0", cursor: "inherit", flex: "none" }}
        />
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 8 }}>
            {t("dashboard.experienceEditor.cv.label")}
            {saving && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "var(--ds-ink-4)" }} />}
          </span>
          <span className="ds-sub">{t("dashboard.experienceEditor.cv.help")} {t("dashboard.experienceEditor.cv.onlyNext")}</span>
        </span>
      </label>
      <p style={{ margin: 0, padding: "10px 12px", borderRadius: 9, background: "#FFFFFF", border: "1px solid var(--ds-line)", fontSize: 13, color: "var(--ds-ink-2)", lineHeight: 1.55 }}>
        {tNodes(t("dashboard.experienceEditor.cv.adviceRich"), {
          lead: <span key="l" style={{ fontWeight: 600, color: "var(--ds-blue)" }}>{t("dashboard.experienceEditor.cv.adviceLead")}</span>,
        })}
      </p>
    </CarteReglage>
  );
}

// ─── Fil rouge ───────────────────────────────────────────────────────────────
// La situation qui relie les étapes, lue par le candidat avant de commencer.
// Décidée par la génération selon le métier ; le recruteur la relit, la
// retouche, ou la retire (texte vidé). L'« univers » est la fiche de cohérence
// des scènes détaillées : il ne s'affiche pas au candidat. Le texte s'ouvre
// aussi en plein écran, pour être relu comme le candidat le lira.
export function FilRougeCard({ experienceId, filRouge, jobTitle, onSaved, toast }) {
  const { t } = useI18n();
  const [contexte, setContexte] = useState(filRouge?.contexte_candidat || "");
  const [univers, setUnivers] = useState(filRouge?.univers || "");
  const [ouvert, setOuvert] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = contexte !== (filRouge?.contexte_candidat || "") || univers !== (filRouge?.univers || "");
  const k = (cle, vars) => t(`dashboard.experienceEditor.filRouge.${cle}`, vars);

  useEffect(() => {
    if (!pleinEcran) return;
    const echap = (e) => { if (e.key === "Escape") setPleinEcran(false); };
    document.addEventListener("keydown", echap);
    return () => document.removeEventListener("keydown", echap);
  }, [pleinEcran]);

  async function save() {
    setSaving(true);
    const res = await updateFilRouge(experienceId, { contexte_candidat: contexte, univers });
    setSaving(false);
    if (!res.success) { toast(res.error || t("dashboard.experienceEditor.error"), "error"); return; }
    toast(t(contexte.trim() ? "dashboard.experienceEditor.filRouge.saved" : "dashboard.experienceEditor.filRouge.removed"));
    await onSaved?.(res);
  }

  return (
    <>
      <CarteReglage
        titre={k("title")}
        aide={k("help")}
        modifie={dirty}
        action={
          <button type="button" className="ds-btn ds-btn-sm" onClick={() => setPleinEcran(true)} aria-label={k("fullscreen")} title={k("fullscreen")} style={{ height: 28, margin: "-4px 0", padding: "0 8px", fontSize: 12, color: "var(--ds-ink-2)" }}>
            <Maximize2 size={13} />
          </button>
        }
      >
        <label htmlFor="ds-fil" className="ds-mono" style={{ fontSize: 11, color: "var(--ds-ink-3)", textTransform: "uppercase" }}>{k("candidateText")}</label>
        <AutoTextarea id="ds-fil" value={contexte} onChange={(e) => setContexte(e.target.value)} rows={5} style={{ ...inputStyle, fontSize: 13, lineHeight: 1.6, marginBottom: 0 }} />
        <button type="button" className="ds-link" onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ChevronDown size={14} style={{ transform: ouvert ? "none" : "rotate(-90deg)", transition: "transform .15s" }} />
          {k("universe")}
        </button>
        {ouvert && (
          <>
            <p className="ds-sub" style={{ fontSize: 12 }}>{k("universeHelp")}</p>
            <AutoTextarea value={univers} onChange={(e) => setUnivers(e.target.value)} rows={4} style={{ ...inputStyle, lineHeight: 1.55, fontSize: 13, marginBottom: 0 }} />
          </>
        )}
        {dirty && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="ds-btn ds-btn-primary ds-btn-sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
              {t("dashboard.experienceEditor.save")}
            </button>
          </div>
        )}
      </CarteReglage>

      {pleinEcran && (
        <div className="ds-overlay" style={{ alignItems: "stretch" }} onMouseDown={() => setPleinEcran(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="ds-fil-titre" className="ds-modal" style={{ width: "100%", maxWidth: 900, maxHeight: "none" }} onMouseDown={(e) => e.stopPropagation()}>
            <header className="ds-modal-head" style={{ padding: "14px 16px 14px 24px" }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <h2 id="ds-fil-titre" className="ds-h1">{k("title")}</h2>
                <span className="ds-sub">{k("fullscreenSub", { job: jobTitle || "" })}</span>
              </span>
              <button type="button" className="ds-btn" onClick={() => setPleinEcran(false)}>
                <Minimize2 size={15} /> {k("reduce")}
              </button>
            </header>
            <div style={{ flex: 1, display: "flex", padding: 24, background: "var(--ds-soft)" }}>
              <label htmlFor="ds-fil-plein" className="sr-only">{k("title")}</label>
              <textarea
                id="ds-fil-plein"
                value={contexte}
                onChange={(e) => setContexte(e.target.value)}
                style={{ flex: 1, width: "100%", resize: "none", border: "1px solid var(--ds-line)", borderRadius: 12, padding: "28px 32px", font: "inherit", fontSize: 17, lineHeight: 1.75, color: "var(--ds-ink)", background: "#FFFFFF", outline: "none" }}
              />
            </div>
            <footer className="ds-modal-foot" style={{ justifyContent: "space-between", padding: "12px 16px 12px 24px" }}>
              <span className="ds-sub">{dirty ? k("unsavedHint") : k("liveHint")}</span>
              <span style={{ display: "flex", gap: 8 }}>
                {dirty && (
                  <button type="button" className="ds-btn" onClick={save} disabled={saving}>
                    {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                    {t("dashboard.experienceEditor.save")}
                  </button>
                )}
                <button type="button" className="ds-btn ds-btn-primary" onClick={() => setPleinEcran(false)}>{k("finish")}</button>
              </span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
