"use client";

import { useState, useEffect } from "react";
import { Video, Plus, Trash2, Wand2, Loader2, Library, ChevronDown, ChevronUp, GripVertical, Info } from "lucide-react";
import { getVideoQuestionLibrary, generateVideoQuestions } from "@/lib/actions/assessment";
import { useToast } from "@/components/ui/Toast";

const CATEGORY_COLORS = {
  Motivation:   { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Experience:   { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  "Soft Skills":{ bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  Technique:    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  "Culture Fit":{ bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  Custom:       { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

export default function VideoInterviewConfig({ jobId, config, onChange }) {
  const [questions, setQuestions] = useState(config?.questions || []);
  const [maxDuration, setMaxDuration] = useState(config?.max_duration_seconds || 120);
  const [maxRetakes, setMaxRetakes] = useState(config?.max_retakes ?? 1);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryQuestions, setLibraryQuestions] = useState([]);
  const [libraryFilter, setLibraryFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    notifyChange(questions, maxDuration, maxRetakes);
  }, [questions, maxDuration, maxRetakes]);

  function notifyChange(qs, dur, ret) {
    onChange({
      questions: qs,
      max_duration_seconds: dur,
      max_retakes: ret,
    });
  }

  async function loadLibrary() {
    setLoadingLibrary(true);
    const res = await getVideoQuestionLibrary();
    if (res.success) setLibraryQuestions(res.questions);
    else toast("Erreur lors du chargement de la bibliothèque", "error");
    setLoadingLibrary(false);
  }

  async function handleGenerateAi() {
    if (!jobId) { toast("Sauvegardez d'abord votre offre", "error"); return; }
    setGeneratingAi(true);
    const res = await generateVideoQuestions(jobId);
    if (res.success && res.questions.length > 0) {
      const newQs = res.questions.map((q, i) => ({
        id: `ai_${Date.now()}_${i}`,
        text: q.text,
        category: q.category || "Technique",
        hint: q.hint || "",
        evaluation_criteria: q.evaluation_criteria || "",
        source: "ai",
      }));
      const updated = [...questions, ...newQs];
      setQuestions(updated);
      toast(`${newQs.length} questions générées par l'IA !`);
    } else {
      toast(res.error || "Erreur lors de la génération", "error");
    }
    setGeneratingAi(false);
  }

  function addFromLibrary(libQ) {
    if (questions.find(q => q.library_id === libQ.id)) {
      toast("Cette question est déjà ajoutée", "error");
      return;
    }
    const newQ = {
      id: `lib_${libQ.id}_${Date.now()}`,
      library_id: libQ.id,
      text: libQ.text,
      category: libQ.category,
      hint: libQ.hint || "",
      evaluation_criteria: "",
      source: "library",
    };
    setQuestions(prev => [...prev, newQ]);
    toast("Question ajoutée");
  }

  function addCustomQuestion() {
    const newQ = {
      id: `custom_${Date.now()}`,
      text: "",
      category: "Custom",
      hint: "",
      evaluation_criteria: "",
      source: "custom",
    };
    setQuestions(prev => [...prev, newQ]);
  }

  function updateQuestion(index, field, value) {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  }

  function removeQuestion(index) {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }

  const categories = ["all", ...new Set(libraryQuestions.map(q => q.category))];

  const filteredLibrary = libraryFilter === "all"
    ? libraryQuestions
    : libraryQuestions.filter(q => q.category === libraryFilter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Settings row */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
            Durée max par réponse
          </label>
          <select
            className="input-field"
            value={maxDuration}
            onChange={e => setMaxDuration(Number(e.target.value))}
          >
            <option value={60}>1 minute</option>
            <option value={90}>1 min 30</option>
            <option value={120}>2 minutes (recommandé)</option>
            <option value={180}>3 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "180px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
            Re-enregistrements autorisés
          </label>
          <select
            className="input-field"
            value={maxRetakes}
            onChange={e => setMaxRetakes(Number(e.target.value))}
          >
            <option value={0}>Aucun (one-shot)</option>
            <option value={1}>1 essai supplémentaire</option>
            <option value={2}>2 essais supplémentaires</option>
            <option value={3}>3 essais supplémentaires</option>
            <option value={99}>Illimité</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          onClick={handleGenerateAi}
          disabled={generatingAi}
          style={{ gap: "8px" }}
        >
          {generatingAi
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Génération IA...</>
            : <><Wand2 size={16} /> Générer avec l&apos;IA</>}
        </button>
        <button
          className="btn btn-outline"
          onClick={async () => {
            if (!showLibrary && libraryQuestions.length === 0) await loadLibrary();
            setShowLibrary(v => !v);
          }}
          disabled={loadingLibrary}
          style={{ gap: "8px" }}
        >
          {loadingLibrary
            ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            : <Library size={16} />}
          {showLibrary ? "Fermer la bibliothèque" : "Bibliothèque de questions"}
          {showLibrary ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        <button
          className="btn btn-ghost"
          onClick={addCustomQuestion}
          style={{ gap: "8px" }}
        >
          <Plus size={16} /> Question personnalisée
        </button>
      </div>

      {/* Question library panel */}
      {showLibrary && (
        <div className="fade-in" style={{
          border: "1px solid var(--border)", borderRadius: "var(--radius)",
          background: "var(--secondary)", overflow: "hidden"
        }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: "700" }}>Bibliothèque Onbord</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setLibraryFilter(cat)}
                  style={{
                    padding: "3px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "600",
                    cursor: "pointer", border: "1px solid",
                    background: libraryFilter === cat ? "var(--foreground)" : "transparent",
                    color: libraryFilter === cat ? "white" : "var(--muted-foreground)",
                    borderColor: libraryFilter === cat ? "var(--foreground)" : "var(--border)",
                  }}
                >
                  {cat === "all" ? "Toutes" : cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0", maxHeight: "280px", overflowY: "auto" }}>
            {filteredLibrary.map(q => {
              const catStyle = CATEGORY_COLORS[q.category] || CATEGORY_COLORS["Custom"];
              const alreadyAdded = questions.some(sq => sq.library_id === q.id);
              return (
                <div key={q.id} style={{
                  padding: "0.875rem 1.25rem", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
                  background: alreadyAdded ? "#f8fafc" : "white", opacity: alreadyAdded ? 0.6 : 1
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px",
                        background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`
                      }}>{q.category}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--foreground)", marginBottom: "2px" }}>{q.text}</p>
                    {q.hint && <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic" }}>💡 {q.hint}</p>}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => addFromLibrary(q)}
                    disabled={alreadyAdded}
                    style={{ flexShrink: 0, fontSize: "12px", padding: "4px 12px" }}
                  >
                    {alreadyAdded ? "Ajoutée" : <><Plus size={14} /> Ajouter</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div style={{
          padding: "2.5rem", textAlign: "center", borderRadius: "var(--radius)",
          border: "2px dashed var(--border)", background: "var(--secondary)"
        }}>
          <Video size={32} style={{ color: "var(--muted-foreground)", margin: "0 auto 0.75rem", opacity: 0.5 }} />
          <p style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>Aucune question configurée</p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            Générez des questions avec l&apos;IA ou choisissez-en dans notre bibliothèque.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {questions.map((q, idx) => {
            const catStyle = CATEGORY_COLORS[q.category] || CATEGORY_COLORS["Custom"];
            return (
              <div key={q.id} style={{
                background: "white", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", overflow: "hidden"
              }}>
                {/* Question header */}
                <div style={{ padding: "0.875rem 1rem", display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--muted-foreground)", minWidth: "24px", marginTop: "2px" }}>
                    Q{idx + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px",
                        background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`
                      }}>{q.category}</span>
                      {q.source === "ai" && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>✦ IA</span>}
                      {q.source === "library" && <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>📚 Bibliothèque</span>}
                    </div>
                    <textarea
                      className="input-field"
                      rows={2}
                      value={q.text}
                      onChange={e => updateQuestion(idx, "text", e.target.value)}
                      placeholder="Texte de la question..."
                      style={{ resize: "vertical", fontSize: "14px" }}
                    />
                  </div>
                  <button
                    onClick={() => removeQuestion(idx)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px", flexShrink: 0, marginTop: "22px" }}
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Evaluation criteria */}
                <div style={{ padding: "0.75rem 1rem", background: "#fafafa", borderTop: "1px solid var(--border)", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <Info size={14} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "3px" }} />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                      Critères d&apos;évaluation IA
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={q.evaluation_criteria}
                      onChange={e => updateQuestion(idx, "evaluation_criteria", e.target.value)}
                      placeholder="Ex: Évaluer la clarté, les exemples concrets, la connaissance du secteur..."
                      style={{ fontSize: "13px" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {questions.length > 0 && (
        <div style={{ padding: "0.875rem 1rem", background: "#f0f9ff", borderRadius: "var(--radius)", border: "1px solid #bae6fd", fontSize: "13px", color: "#0369a1" }}>
          <strong>{questions.length} question{questions.length > 1 ? "s" : ""}</strong> ·  Durée max {Math.floor(maxDuration / 60)}min{maxDuration % 60 ? ` ${maxDuration % 60}s` : ""} par réponse · {maxRetakes === 0 ? "Aucun re-enregistrement" : `${maxRetakes} re-enregistrement${maxRetakes > 1 ? "s" : ""} autorisé${maxRetakes > 1 ? "s" : ""}`}
        </div>
      )}
    </div>
  );
}
