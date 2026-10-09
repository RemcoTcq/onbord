"use client";

import { useRef, useState } from "react";
import { Loader2, ArrowRight, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveCandidateCv } from "@/lib/actions/run";
import { pillBtn, container, heading, focusStyle, getContrastColor } from "@/components/assessment/candidateUi";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Dépôt du CV avant la simulation, quand l'entreprise l'a demandé
// (jobs.cv_requis). Le fichier part du navigateur vers le bucket privé
// `resumes`, sous le dossier du candidat — seul préfixe que la policy de dépôt
// autorise —, puis saveCandidateCv vérifie le fichier et l'attache au
// candidat. Le parcours ne démarre qu'ensuite : `onDone` relance startRun.
export default function CvGate({ token, gate, recruiter, job, primary, onDone }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [fichier, setFichier] = useState(null);
  const [survol, setSurvol] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState(null);

  function choisir(f) {
    setErreur(null);
    if (!f) return;
    const estPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!estPdf) { setFichier(null); setErreur(t("candidate.cvUpload.notPdf")); return; }
    if (f.size > gate.maxBytes) { setFichier(null); setErreur(t("candidate.cvUpload.tooLarge")); return; }
    setFichier(f);
  }

  async function envoyer() {
    if (!fichier) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const supabase = createClient();
      const path = `${gate.candidateId}/cv_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from("resumes")
        .upload(path, fichier, { contentType: "application/pdf", upsert: false });
      if (error) throw error;
      const res = await saveCandidateCv(token, path);
      if (!res.success) throw new Error(res.error);
      await onDone();
    } catch {
      setErreur(t("candidate.cvUpload.uploadError"));
      setEnvoi(false);
    }
  }

  return (
    <div style={{ ...container, padding: "2.5rem 2rem", maxWidth: 560, width: "100%" }}>
      <style>{focusStyle(primary)}</style>
      {recruiter?.company_logo_url ? (
        <img src={recruiter.company_logo_url} alt={recruiter?.company_name || t("candidate.notice.logoAlt")} style={{ height: 44, width: "auto", margin: "0 auto 1.5rem", borderRadius: 8, objectFit: "contain", display: "block" }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 10, background: primary, color: getContrastColor(primary), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, margin: "0 auto 1.5rem" }}>
          {(recruiter?.company_name || job?.title || "O")[0].toUpperCase()}
        </div>
      )}
      <h1 style={{ ...heading, marginBottom: "0.5rem", textAlign: "center" }}>{t("candidate.cvUpload.title")}</h1>
      <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--muted-foreground)", textAlign: "center", marginBottom: "1.75rem" }}>
        {t("candidate.cvUpload.subtitle")}
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true); }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); choisir(e.dataTransfer.files?.[0]); }}
        disabled={envoi}
        style={{
          width: "100%", padding: "1.75rem 1rem", borderRadius: 12, cursor: envoi ? "wait" : "pointer",
          border: `2px dashed ${survol || fichier ? primary : "var(--border)"}`,
          background: survol ? "var(--muted)" : "transparent",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "var(--foreground)",
          font: "inherit", transition: "border-color .15s, background .15s",
        }}
      >
        {fichier ? (
          <>
            <FileText size={26} style={{ color: primary }} />
            <span style={{ fontWeight: 600, fontSize: 14, wordBreak: "break-all" }}>{fichier.name}</span>
            <span style={{ fontSize: 12.5, color: "var(--muted-foreground)", textDecoration: "underline" }}>{t("candidate.cvUpload.change")}</span>
          </>
        ) : (
          <>
            <Upload size={26} style={{ color: "var(--muted-foreground)" }} />
            <span style={{ fontWeight: 600, fontSize: 14 }}>{t("candidate.cvUpload.dropzone")}</span>
            <span style={{ fontSize: 12.5, color: "var(--muted-foreground)" }}>{t("candidate.cvUpload.constraints")}</span>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: "none" }}
        onChange={(e) => { choisir(e.target.files?.[0]); e.target.value = ""; }}
      />

      {erreur && <p style={{ color: "#991b1b", fontSize: 13, marginTop: "1rem", textAlign: "center" }}>{erreur}</p>}

      <div style={{ display: "flex", justifyContent: "center", marginTop: "1.75rem" }}>
        <button onClick={envoyer} disabled={!fichier || envoi} style={pillBtn(primary, !fichier || envoi)}>
          {envoi ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
          {envoi ? t("candidate.cvUpload.uploading") : t("candidate.cvUpload.continue")} {!envoi && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
