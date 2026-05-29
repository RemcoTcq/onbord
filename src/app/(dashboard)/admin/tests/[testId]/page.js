"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  Shield, 
  ArrowLeft, 
  Save, 
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  UploadCloud,
  Image as ImageIcon
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isAdmin as checkAdmin } from "@/lib/utils/admin";
import Link from "next/link";
import TestPreview from "@/components/assessment/TestPreview";

export default function TestQuestionsPage() {
  const { testId } = useParams();
  const router = useRouter();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [testId]);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !checkAdmin(user)) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    // Fetch test details
    const { data: testData, error: testError } = await supabase
      .from("assessment_tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (testError) {
      toast("Erreur lors du chargement du test", "error");
      router.push("/admin/tests");
      return;
    }

    setTest(testData);

    // Fetch questions
    const { data: questionsData, error: qError } = await supabase
      .from("assessment_questions")
      .select("*")
      .eq("test_id", testId)
      .order("created_at", { ascending: true });

    if (qError) {
      toast("Erreur lors du chargement des questions", "error");
    } else {
      setQuestions(questionsData || []);
    }
    setLoading(false);
  }

  function startEditing(q) {
    setEditingId(q.id);
    setEditForm({ ...q });
  }

  function duplicateQuestion(q) {
    setEditingId("new");
    setEditForm({
      ...q,
      id: undefined,
      statement: q.statement + " (Copie)"
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm(null);
  }

  async function handleSave() {
    if (!editForm.statement || !editForm.option_a || !editForm.option_b || !editForm.correct_answer) {
      toast("Veuillez remplir les champs obligatoires", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    
    let error;
    let updatedData;

    const payload = {
      statement: editForm.statement,
      option_a: editForm.option_a,
      option_b: editForm.option_b,
      option_c: editForm.option_c,
      option_d: editForm.option_d,
      correct_answer: editForm.correct_answer,
      difficulty: editForm.difficulty,
      time_limit_seconds: editForm.time_limit_seconds,
      language: editForm.language || "fr",
      image_url: editForm.image_url || null
    };

    if (editingId === "new") {
      const { data, error: insertError } = await supabase
        .from("assessment_questions")
        .insert({ ...payload, test_id: testId })
        .select();
      error = insertError;
      updatedData = data?.[0];
    } else {
      const { data, error: updateError } = await supabase
        .from("assessment_questions")
        .update(payload)
        .eq("id", editingId)
        .select();
      error = updateError;
      updatedData = data?.[0];
    }

    if (error) {
      toast("Erreur : " + error.message, "error");
    } else if (!updatedData) {
      toast("Erreur : La question n'a pas pu être récupérée après l'enregistrement.", "error");
    } else {
      toast("Question enregistrée !");
      if (editingId === "new") {
        setQuestions(prev => [...prev, updatedData]);
      } else {
        setQuestions(prev => prev.map(q => q.id === editingId ? updatedData : q));
      }
      setEditingId(null);
      setEditForm(null);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Supprimer cette question ?")) return;

    const supabase = createClient();
    const { error } = await supabase.from("assessment_questions").delete().eq("id", id);
    
    if (error) {
      toast("Erreur : " + error.message, "error");
    } else {
      setQuestions(prev => prev.filter(q => q.id !== id));
      toast("Question supprimée");
    }
  }

  function addNewQuestion() {
    setEditingId("new");
    setEditForm({
      statement: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      difficulty: "moyen",
      time_limit_seconds: 45,
      language: "fr",
      image_url: ""
    });
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="fade-in" style={{ textAlign: "center", padding: "80px 20px" }}>
        <Shield size={48} style={{ color: "var(--destructive)", margin: "0 auto 24px" }} />
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>Accès refusé</h1>
        <p style={{ color: "var(--muted-foreground)" }}>Cette page est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <Link 
          href="/admin/tests" 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "16px", textDecoration: "none" }}
        >
          <ArrowLeft size={16} /> Retour aux tests
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>{test?.name}</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Gérez les questions pour ce test.</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              className="btn btn-outline"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => setShowPreview(true)}
              disabled={questions.length === 0}
            >
              <Eye size={18} /> Prévisualiser
            </button>
            <button 
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={addNewQuestion}
              disabled={editingId !== null}
            >
              <Plus size={18} /> Ajouter une question
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {editingId === "new" && (
          <QuestionForm 
            form={editForm} 
            onChange={setEditForm} 
            onSave={handleSave} 
            onCancel={cancelEditing} 
            saving={saving}
          />
        )}

        {questions.length === 0 && editingId !== "new" && (
          <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--muted-foreground)" }}>
            Aucune question pour ce test.
          </div>
        )}

        {questions.map((q, index) => (
          <div key={q.id}>
            {editingId === q.id ? (
              <QuestionForm 
                form={editForm} 
                onChange={setEditForm} 
                onSave={handleSave} 
                onCancel={cancelEditing} 
                saving={saving}
              />
            ) : (
              <div className="card" style={{ position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--primary)" }}>QUESTION {index + 1}</span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => startEditing(q)} className="btn btn-ghost btn-sm" style={{ padding: "4px" }} title="Modifier"><Edit2 size={16} /></button>
                    <button onClick={() => duplicateQuestion(q)} className="btn btn-ghost btn-sm" style={{ padding: "4px" }} title="Dupliquer"><Copy size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} className="btn btn-ghost btn-sm" style={{ padding: "4px", color: "var(--destructive)" }} title="Supprimer"><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <p style={{ fontWeight: "600", fontSize: "16px", marginBottom: "16px", whiteSpace: "pre-wrap" }}>{q.statement}</p>
                
                {q.image_url && (
                  <div style={{ marginBottom: "16px", maxWidth: "300px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border)" }}>
                    <img src={q.image_url} alt="Illustration de la question" style={{ width: "100%", height: "auto", display: "block" }} />
                  </div>
                )}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {['a', 'b', 'c', 'd'].map(opt => (
                    q[`option_${opt}`] && (
                      <div key={opt} style={{ 
                        padding: "10px 14px", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border)",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: q.correct_answer === opt.toUpperCase() ? "#f0fdf4" : "transparent",
                        borderColor: q.correct_answer === opt.toUpperCase() ? "#bcf0da" : "var(--border)"
                      }}>
                        <span style={{ fontWeight: "700", color: "var(--muted-foreground)" }}>{opt.toUpperCase()}.</span>
                        {q[`option_${opt}`]}
                        {q.correct_answer === opt.toUpperCase() && <CheckCircle2 size={16} style={{ color: "#16a34a", marginLeft: "auto" }} />}
                      </div>
                    )
                  ))}
                </div>

                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "16px", fontSize: "12px", color: "var(--muted-foreground)" }}>
                  <span>Difficulté : <strong>{q.difficulty}</strong></span>
                  <span>Temps : <strong>{q.time_limit_seconds}s</strong></span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showPreview && (
        <TestPreview 
          test={test}
          questions={questions}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function QuestionForm({ form, onChange, onSave, onCancel, saving }) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("L'image doit faire moins de 2 Mo.");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `question-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("test-questions")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("test-questions")
        .getPublicUrl(fileName);

      onChange({ ...form, image_url: publicUrl });
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Échec du téléversement. Veuillez utiliser une URL directe à la place.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card" style={{ border: "2px solid var(--primary)", background: "rgba(var(--primary-rgb), 0.02)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Énoncé de la question *</label>
          <textarea
            value={form.statement || ""}
            onChange={e => onChange({ ...form, statement: e.target.value })}
            style={{ width: "100%", minHeight: "100px", padding: "12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
            placeholder="Quelle est la question ?"
          />
        </div>

        {/* Image upload and url field */}
        <div style={{ border: "1px solid var(--border)", padding: "16px", borderRadius: "10px", background: "white" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Image d'illustration (Optionnel)</label>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ 
              width: "60px", 
              height: "60px", 
              borderRadius: "6px", 
              border: "1px dashed var(--border)", 
              background: "var(--secondary)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              overflow: "hidden"
            }}>
              {form.image_url ? (
                <img src={form.image_url} alt="Aperçu" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
              ) : (
                <ImageIcon size={20} style={{ color: "var(--muted-foreground)", opacity: 0.5 }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
                {uploading ? <Loader2 size={12} className="spin" /> : <UploadCloud size={12} />}
                {uploading ? " Upload..." : " Choisir une image"}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={uploading} 
                  style={{ display: "none" }} 
                />
              </label>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm" 
                style={{ marginLeft: "8px", color: "var(--destructive)" }} 
                onClick={() => onChange({ ...form, image_url: "" })}
                disabled={!form.image_url}
              >
                Supprimer
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "var(--muted-foreground)", marginBottom: "4px" }}>OU URL directe de l'image</label>
            <input
              type="text"
              value={form.image_url || ""}
              onChange={e => onChange({ ...form, image_url: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", fontSize: "12px" }}
              placeholder="https://exemple.com/illustration.png"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {['a', 'b', 'c', 'd'].map(opt => (
            <div key={opt}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Option {opt.toUpperCase()} {opt < 'c' ? '*' : ''}</label>
              <input
                type="text"
                value={form[`option_${opt}`] || ""}
                onChange={e => onChange({ ...form, [`option_${opt}`]: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
                placeholder={`Réponse ${opt.toUpperCase()}`}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Bonne réponse *</label>
            <select
              value={form.correct_answer || "A"}
              onChange={e => onChange({ ...form, correct_answer: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Difficulté</label>
            <select
              value={form.difficulty || "moyen"}
              onChange={e => onChange({ ...form, difficulty: e.target.value })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
            >
              <option value="facile">Facile</option>
              <option value="moyen">Moyen</option>
              <option value="difficile">Difficile</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Temps (sec)</label>
            <input
              type="number"
              value={form.time_limit_seconds ?? ""}
              onChange={e => onChange({ ...form, time_limit_seconds: e.target.value === "" ? null : parseInt(e.target.value) })}
              style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "10px" }}>
          <button onClick={onCancel} className="btn btn-ghost" disabled={saving}>Annuler</button>
          <button onClick={onSave} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "8px" }} disabled={saving}>
            {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
