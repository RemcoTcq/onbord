"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Edit2, Trash2, Loader2, Shield, ArrowLeft, Settings2, Save, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isAdmin as checkAdmin } from "@/lib/utils/admin";
import Link from "next/link";

export default function AdminTestsPage() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !checkAdmin(user)) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    const { data, error } = await supabase
      .from("assessment_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast("Erreur lors du chargement des tests : " + error.message, "error");
    } else {
      setTests(data || []);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce test ? Tous les questions associées seront également supprimées.")) return;

    const supabase = createClient();
    const { error } = await supabase.from("assessment_tests").delete().eq("id", id);
    
    if (error) {
      toast("Erreur : " + error.message, "error");
    } else {
      setTests(prev => prev.filter(t => t.id !== id));
      toast("Test supprimé");
    }
  }

  async function handleSaveTest() {
    if (!editingTest.name || !editingTest.category) {
      toast("Nom et catégorie obligatoires", "error");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    
    let error;
    let updatedData;

    const payload = {
      name: editingTest.name,
      description: editingTest.description,
      category: editingTest.category,
      difficulty: editingTest.difficulty,
      estimated_duration_minutes: editingTest.estimated_duration_minutes,
      status: editingTest.status
    };

    if (editingTest.id === "new") {
      const { data, error: insertError } = await supabase
        .from("assessment_tests")
        .insert(payload)
        .select();
      error = insertError;
      updatedData = data?.[0];
    } else {
      const { data, error: updateError } = await supabase
        .from("assessment_tests")
        .update(payload)
        .eq("id", editingTest.id)
        .select();
      error = updateError;
      updatedData = data?.[0];
    }

    if (error) {
      toast("Erreur : " + error.message, "error");
    } else if (!updatedData) {
      toast("Erreur : Le test n'a pas pu être récupéré après l'enregistrement.", "error");
    } else {
      toast("Test enregistré !");
      if (editingTest.id === "new") {
        setTests(prev => [updatedData, ...prev]);
      } else {
        setTests(prev => prev.map(t => t.id === editingTest.id ? updatedData : t));
      }
      setEditingTest(null);
    }
    setSaving(false);
  }

  function startNewTest() {
    setEditingTest({
      name: "",
      description: "",
      category: "cognitif",
      difficulty: "moyen",
      estimated_duration_minutes: 10,
      status: "active"
    });
  }

  function startEditTest(test) {
    setEditingTest({ ...test });
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

  const CATEGORY_LABELS = {
    cognitif: "Cognitif",
    langue: "Langue",
    metier: "Métier",
    personnalite: "Personnalité"
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <Link 
          href="/admin" 
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "var(--muted-foreground)", fontSize: "14px", marginBottom: "16px", textDecoration: "none" }}
        >
          <ArrowLeft size={16} /> Retour à l'administration
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>Gestion des Tests</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Créez et modifiez les tests de compétences.</p>
          </div>
          <button 
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => setEditingTest({ id: "new", name: "", category: "cognitif", difficulty: "moyen", estimated_duration_minutes: 10, status: "active" })}
            disabled={editingTest !== null}
          >
            <Plus size={18} /> Nouveau Test
          </button>
        </div>
      </div>

      {editingTest && (
        <div className="card" style={{ marginBottom: "2rem", border: "2px solid var(--primary)" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>
            {editingTest.id === "new" ? "Nouveau Test" : "Modifier le Test"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Nom du test *</label>
              <input
                type="text"
                value={editingTest.name || ""}
                onChange={e => setEditingTest({ ...editingTest, name: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
                placeholder="Ex: Raisonnement Logique"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Catégorie *</label>
              <select
                value={editingTest.category || "cognitif"}
                onChange={e => setEditingTest({ ...editingTest, category: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
              >
                <option value="cognitif">Cognitif</option>
                <option value="langue">Langue</option>
                <option value="metier">Métier</option>
                <option value="personnalite">Personnalité</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Difficulté</label>
              <select
                value={editingTest.difficulty || "moyen"}
                onChange={e => setEditingTest({ ...editingTest, difficulty: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
              >
                <option value="facile">Facile</option>
                <option value="moyen">Moyen</option>
                <option value="difficile">Difficile</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Durée estimée (min)</label>
              <input
                type="number"
                value={editingTest.estimated_duration_minutes ?? ""}
                onChange={e => setEditingTest({ ...editingTest, estimated_duration_minutes: e.target.value === "" ? null : parseInt(e.target.value) })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Statut</label>
              <select
                value={editingTest.status || "active"}
                onChange={e => setEditingTest({ ...editingTest, status: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)" }}
              >
                <option value="active">Actif</option>
                <option value="coming_soon">Bientôt disponible</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
            <button onClick={() => setEditingTest(null)} className="btn btn-ghost" disabled={saving}>Annuler</button>
            <button onClick={handleSaveTest} className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              Enregistrer le test
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Nom</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Catégorie</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Difficulté</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tests.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>Aucun test trouvé.</td></tr>
            )}
            {tests.map(test => (
              <tr key={test.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "14px 20px" }}>
                  <div style={{ fontWeight: "600" }}>{test.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{test.estimated_duration_minutes} min</div>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: "13px" }}>{CATEGORY_LABELS[test.category] || test.category}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ fontSize: "13px", textTransform: "capitalize" }}>{test.difficulty}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ 
                    padding: "4px 8px", 
                    borderRadius: "4px", 
                    fontSize: "11px", 
                    fontWeight: "700",
                    background: test.status === 'active' ? "#dcfce7" : "#f1f5f9",
                    color: test.status === 'active' ? "#166534" : "#475569"
                  }}>
                    {test.status === 'active' ? 'ACTIF' : 'BIENTÔT'}
                  </span>
                </td>
                <td style={{ padding: "14px 20px", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      onClick={() => setEditingTest({ ...test })}
                      className="btn btn-ghost btn-sm"
                      title="Modifier les détails"
                    >
                      <Edit2 size={16} />
                    </button>
                    <Link
                      href={`/admin/tests/${test.id}`}
                      className="btn btn-ghost btn-sm"
                      title="Modifier les questions"
                      style={{ color: "var(--primary)" }}
                    >
                      <Settings2 size={16} />
                    </Link>
                    <button
                      onClick={() => handleDelete(test.id)}
                      className="btn btn-ghost btn-sm"
                      title="Supprimer"
                      style={{ color: "var(--destructive)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
