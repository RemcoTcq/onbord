"use client";

import { useState, useRef } from "react";
import { ArrowLeft, UploadCloud, FileText, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { parseFile } from "@/lib/actions/parse-file";
import { scoreCandidate } from "@/lib/actions/candidate";

export default function CvUploadModule({ candidate, job, onComplete, onBack }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(!!candidate.cv_raw_text);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const jobCriteria = job?.extracted_criteria || job;

  async function handleFile(selectedFile) {
    if (!selectedFile) return;
    if (selectedFile.type !== "application/pdf") {
      setError("Veuillez sélectionner un fichier PDF uniquement.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (max 5 Mo).");
      return;
    }
    setFile(selectedFile);
    setError(null);
    await processCV(selectedFile);
  }

  async function processCV(selectedFile) {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Upload to Supabase Storage
      const filePath = `${candidate.id}/${Date.now()}_cv.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, selectedFile, { contentType: "application/pdf", upsert: true });

      if (uploadError) throw new Error("Erreur lors de l'upload : " + uploadError.message);

      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(filePath);

      // 2. Parse PDF text
      const formData = new FormData();
      formData.append("file", selectedFile);
      const parseResult = await parseFile(formData);

      if (!parseResult.success) {
        throw new Error(parseResult.error || "Erreur lors de l'analyse du CV.");
      }

      const cvText = parseResult.text;

      if (!cvText || cvText.trim().length < 50) {
        throw new Error("Le PDF semble vide ou illisible. Vérifiez que votre CV n'est pas une image scannée.");
      }

      // 3. Score CV with AI (updates candidate in DB)
      const enrichedText = `Nom du candidat: ${candidate.first_name} ${candidate.last_name}\nEmail: ${candidate.email || ""}\n\nCV:\n${cvText}`;
      const result = await scoreCandidate(job.id, enrichedText, jobCriteria, `${candidate.first_name} ${candidate.last_name}`, candidate.id);

      if (!result.success) throw new Error(result.error || "Erreur lors de l'analyse IA");

      // 4. Update cv_storage_path + cv_url on existing candidate
      await supabase
        .from("candidates")
        .update({
          cv_storage_path: filePath,
          cv_url: urlData?.publicUrl || null,
          cv_raw_text: cvText,
        })
        .eq("id", candidate.id);

      setDone(true);
    } catch (err) {
      console.error("CV processing error:", err);
      setError(err.message || "Une erreur est survenue. Veuillez réessayer.");
    }
    setUploading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "2rem", padding: 0 }}
        >
          <ArrowLeft size={16} /> Retour
        </button>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--foreground)", marginBottom: "0.5rem" }}>
            Votre CV
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)" }}>
            Importez votre CV au format PDF. Notre IA l'analysera pour évaluer votre profil face à l'offre.
          </p>
        </div>

        {/* Done state */}
        {done ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius)", padding: "2rem", textAlign: "center", marginBottom: "1.5rem" }}>
            <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto 1rem" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#166534", marginBottom: "0.5rem" }}>CV bien reçu !</h3>
            <p style={{ fontSize: "14px", color: "#15803d" }}>
              Votre CV a été analysé avec succès.
            </p>
            {file && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "1rem", fontSize: "13px", color: "#166534" }}>
                <FileText size={14} /> {file.name}
              </div>
            )}
          </div>
        ) : (
          /* Upload zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`,
              borderRadius: "var(--radius)", padding: "3rem 2rem", textAlign: "center",
              cursor: uploading ? "default" : "pointer", marginBottom: "1.5rem",
              background: isDragging ? "var(--accent)" : "var(--card)",
              transition: "all 150ms",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />
            {uploading ? (
              <>
                <Loader2 size={40} style={{ color: "var(--primary)", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
                <p style={{ fontWeight: "600", color: "var(--foreground)", marginBottom: "4px" }}>Analyse en cours…</p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Notre IA évalue votre profil, cela peut prendre quelques secondes.</p>
              </>
            ) : (
              <>
                <UploadCloud size={40} style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
                <p style={{ fontWeight: "600", color: "var(--foreground)", marginBottom: "4px" }}>Cliquez ou glissez votre CV ici</p>
                <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>Format PDF uniquement · Max 5 Mo</p>
              </>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "var(--radius)", marginBottom: "1.5rem" }}>
            <AlertCircle size={16} style={{ color: "#991b1b", flexShrink: 0, marginTop: "1px" }} />
            <p style={{ fontSize: "13px", color: "#991b1b" }}>{error}</p>
          </div>
        )}

        {/* CTA */}
        {done ? (
          <button
            onClick={onComplete}
            style={{
              width: "100%", padding: "1rem", borderRadius: "var(--radius)",
              background: "#22c55e", color: "white", border: "none",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            }}
          >
            <CheckCircle2 size={18} /> Continuer
          </button>
        ) : (
          !uploading && (
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "1rem", borderRadius: "var(--radius)",
                background: "var(--primary)", color: "white", border: "none",
                fontSize: "15px", fontWeight: "700", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              <UploadCloud size={18} /> Sélectionner mon CV (PDF)
            </button>
          )
        )}
      </div>
    </div>
  );
}
