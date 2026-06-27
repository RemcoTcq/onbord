"use client";

import { useState, useEffect } from "react";
import { Video, Plus, Trash2, Wand2, Loader2, Library, ChevronDown, ChevronUp, GripVertical, Info, Sparkles } from "lucide-react";

const MAX_CRITERIA = 5;
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
  const [evaluationMode, setEvaluationMode] = useState(config?.evaluation_mode || "ai");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryQuestions, setLibraryQuestions] = useState([]);
  const [libraryFilter, setLibraryFilter] = useState("all");
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    notifyChange(questions, maxDuration, maxRetakes, evaluationMode);
  }, [questions, maxDuration, maxRetakes, evaluationMode]);

  function notifyChange(qs, dur, ret, evalMode) {
    onChange({
      questions: qs,
      max_duration_seconds: dur,
      max_retakes: ret,
      evaluation_mode: evalMode,
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
        weight: 1,
        source: "ai",
        criteria: (q.criteria || []).map((c, ci) => ({
          id: `crit_${Date.now()}_${i}_${ci}`,
          name: c.name || "",
          weight: 1,
          source: "ai",
          bars_levels: c.bars_levels || [
            { level: 1, label: "Insuffisant", description: c.description || "" },
            { level: 3, label: "Attendu", description: "" },
            { level: 5, label: "Excellent", description: "" },
          ],
        })),
      }));
      setAiSuggestions(newQs);
      setShowAiSuggestions(true);
      setShowLibrary(false);
      toast(`${newQs.length} suggestions générées par l'IA !`);
    } else {
      toast(res.error || "Erreur lors de la génération", "error");
    }
    setGeneratingAi(false);
  }

  function addFromAiSuggestions(aiQ) {
    if (questions.find(q => q.id === aiQ.id)) {
      toast("Cette question est déjà ajoutée", "error");
      return;
    }
    setQuestions(prev => [...prev, aiQ]);
    toast("Question IA ajoutée");
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
      weight: 1,
      source: "library",
      criteria: [],
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
      weight: 1,
      source: "custom",
      criteria: [],
    };
    setQuestions(prev => [...prev, newQ]);
  }

  function addCriterion(questionIndex) {
    const updated = [...questions];
    const q = updated[questionIndex];
    q.criteria = [...(q.criteria || []), {
      id: `crit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: "",
      weight: 1,
      source: "manual",
      bars_levels: [
        { level: 1, label: "Insuffisant", description: "" },
        { level: 3, label: "Attendu", description: "" },
        { level: 5, label: "Excellent", description: "" },
      ],
    }];
    setQuestions(updated);
  }

  function removeCriterion(questionIndex, criterionIndex) {
    const updated = [...questions];
    updated[questionIndex].criteria = updated[questionIndex].criteria.filter((_, i) => i !== criterionIndex);
    setQuestions(updated);
  }

  function updateCriterion(questionIndex, criterionIndex, field, value) {
    const updated = [...questions];
    updated[questionIndex].criteria = [...updated[questionIndex].criteria];
    updated[questionIndex].criteria[criterionIndex] = { ...updated[questionIndex].criteria[criterionIndex], [field]: value };
    setQuestions(updated);
  }

  function updateBarsLevel(questionIndex, criterionIndex, levelIndex, description) {
    const updated = [...questions];
    updated[questionIndex].criteria = [...updated[questionIndex].criteria];
    const crit = { ...updated[questionIndex].criteria[criterionIndex] };
    crit.bars_levels = [...(crit.bars_levels || [])];
    crit.bars_levels[levelIndex] = { ...crit.bars_levels[levelIndex], description };
    updated[questionIndex].criteria[criterionIndex] = crit;
    setQuestions(updated);
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
            <option value={99}>Illimité</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "10px", background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)", height: "fit-content", marginTop: "auto" }}>
          <input 
            type="checkbox" 
            id="manualEval"
            checked={evaluationMode === "manual"}
            onChange={e => setEvaluationMode(e.target.checked ? "manual" : "ai")}
            style={{ width: "16px", height: "16px", accentColor: "var(--primary)", cursor: "pointer", marginTop: "2px" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label htmlFor="manualEval" style={{ fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              Évaluer moi-même les vidéos
            </label>
            {evaluationMode === "manual" && (
              <span style={{ fontSize: "11px", color: "var(--muted-foreground)", lineHeight: "1.3", marginTop: "2px" }}>
                Vous noterez chaque vidéo après l'avoir visionnée.
              </span>
            )}
          </div>
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
            : <><Wand2 size={16} /> Générer avec l'IA</>}
        </button>
        <button
          className="btn btn-outline"
          onClick={async () => {
            if (!showLibrary && libraryQuestions.length === 0) await loadLibrary();
            setShowLibrary(v => !v);
            if (!showLibrary) setShowAiSuggestions(false);
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

      {/* AI Suggestions panel */}
      {showAiSuggestions && (
        <div className="fade-in" style={{
          border: "1px solid var(--border)", borderRadius: "var(--radius)",
          background: "#f8fafc", overflow: "hidden"
        }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#f0f9ff" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={16} style={{ color: "#0ea5e9" }} />
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#0284c7" }}>Suggestions IA</span>
            </div>
            <button onClick={() => setShowAiSuggestions(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
              <ChevronUp size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0", maxHeight: "350px", overflowY: "auto" }}>
            {aiSuggestions.map(q => {
              const catStyle = CATEGORY_COLORS[q.category] || CATEGORY_COLORS["Custom"];
              const alreadyAdded = questions.some(sq => sq.id === q.id);
              return (
                <div key={q.id} style={{
                  padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
                  background: alreadyAdded ? "#f1f5f9" : "white", opacity: alreadyAdded ? 0.6 : 1
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "99px",
                        background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}`
                      }}>{q.category}</span>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted-foreground)" }}>
                        {q.criteria.length} critère(s) BARS généré(s)
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--foreground)", marginBottom: "4px", fontWeight: "500" }}>{q.text}</p>
                    {q.hint && <p style={{ fontSize: "12px", color: "var(--muted-foreground)", fontStyle: "italic", marginTop: "4px" }}>💡 {q.hint}</p>}
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => addFromAiSuggestions(q)}
                    disabled={alreadyAdded}
                    style={{ flexShrink: 0, fontSize: "12px", padding: "6px 12px", borderColor: "#0ea5e9", color: "#0ea5e9" }}
                  >
                    {alreadyAdded ? "Ajoutée" : <><Plus size={14} /> Ajouter</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

                {/* Criteria list with BARS grids (only for AI evaluation) */}
                {evaluationMode === "ai" && (
                <div style={{ padding: "0.75rem 1rem", background: "#fafafa", borderTop: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <label style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Info size={12} style={{ color: "var(--primary)" }} />
                      Grilles BARS ({(q.criteria || []).length}/{MAX_CRITERIA})
                    </label>
                  </div>

                  {(q.criteria || []).length === 0 && (
                    <p style={{ fontSize: "12px", color: "#c2410c", marginBottom: "8px", fontWeight: "500" }}>
                      ⚠ Minimum 1 critère BARS requis pour le scoring.
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(q.criteria || []).map((crit, cIdx) => {
                      const barsLevels = crit.bars_levels || [];
                      const BARS_COLORS = {
                        1: { bg: "#fef2f2", border: "#fecaca", dot: "#ef4444", label: "Insuffisant" },
                        3: { bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Attendu" },
                        5: { bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", label: "Excellent" },
                      };
                      return (
                        <div key={crit.id} style={{
                          background: "white", borderRadius: "8px",
                          border: "1px solid var(--border)", overflow: "hidden"
                        }}>
                          {/* Criterion header */}
                          <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
                            {crit.source === "ai" && (
                              <span style={{ fontSize: "10px", color: "#6366f1", fontWeight: "700" }}>✦ IA</span>
                            )}
                            <input
                              type="text"
                              className="input-field"
                              value={crit.name}
                              onChange={e => updateCriterion(idx, cIdx, "name", e.target.value)}
                              placeholder="Nom du critère (ex: Storytelling commercial)"
                              style={{ fontSize: "12px", fontWeight: "700", padding: "4px 8px", flex: 1 }}
                            />
                            <button
                              onClick={() => removeCriterion(idx, cIdx)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "4px", flexShrink: 0 }}
                              title="Supprimer ce critère"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          {/* BARS levels */}
                          <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {barsLevels.length > 0 ? barsLevels.map((bl, blIdx) => {
                              const colors = BARS_COLORS[bl.level] || BARS_COLORS[3];
                              return (
                                <div key={bl.level} style={{
                                  display: "flex", gap: "8px", alignItems: "flex-start",
                                  padding: "6px 8px", borderRadius: "6px",
                                  background: colors.bg, border: `1px solid ${colors.border}`,
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: "90px", paddingTop: "4px" }}>
                                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.dot, flexShrink: 0 }} />
                                    <span style={{ fontSize: "11px", fontWeight: "700", color: colors.dot }}>
                                      Niv. {bl.level} — {colors.label}
                                    </span>
                                  </div>
                                  <textarea
                                    className="input-field"
                                    rows={2}
                                    value={bl.description}
                                    onChange={e => updateBarsLevel(idx, cIdx, blIdx, e.target.value)}
                                    placeholder={`Décrivez le comportement de niveau ${bl.level} (${colors.label})...`}
                                    style={{ fontSize: "11px", padding: "4px 8px", resize: "vertical", flex: 1, background: "white" }}
                                  />
                                </div>
                              );
                            }) : (
                              <p style={{ fontSize: "11px", color: "var(--muted-foreground)", fontStyle: "italic" }}>
                                Ancien format (sans grille BARS). Régénérez les questions pour bénéficier du scoring structuré.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => addCriterion(idx)}
                    disabled={(q.criteria || []).length >= MAX_CRITERIA}
                    style={{
                      marginTop: "8px", background: "transparent", border: "1px dashed var(--border)",
                      borderRadius: "6px", padding: "5px 10px", fontSize: "12px", fontWeight: "600",
                      color: (q.criteria || []).length >= MAX_CRITERIA ? "var(--muted-foreground)" : "var(--primary)",
                      cursor: (q.criteria || []).length >= MAX_CRITERIA ? "not-allowed" : "pointer",
                      opacity: (q.criteria || []).length >= MAX_CRITERIA ? 0.5 : 1,
                      display: "flex", alignItems: "center", gap: "5px", width: "100%", justifyContent: "center"
                    }}
                  >
                    <Plus size={13} /> Ajouter un critère BARS{(q.criteria || []).length >= MAX_CRITERIA ? " (max atteint)" : ""}
                  </button>
                </div>
                )}
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
