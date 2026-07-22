"use client";

import { useState, useEffect } from "react";
import { BookOpen, FolderHeart, Plus } from "lucide-react";
import { getTestsLibrary, getMyAssessments, addTestToMyAssessments } from "@/lib/actions/assessment";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export default function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState("my_assessments");
  const [myTests, setMyTests] = useState([]);
  const [libraryTests, setLibraryTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    const [myRes, libRes] = await Promise.all([
      getMyAssessments(),
      getTestsLibrary()
    ]);
    if (myRes.success) setMyTests(myRes.tests || []);
    if (libRes.success) setLibraryTests(libRes.tests || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFromLibrary = async (testId) => {
    const res = await addTestToMyAssessments(testId);
    if (res.success) {
      toast("Test ajouté à vos assessments !");
      loadData();
    } else {
      toast(res.error, "error");
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--foreground)" }}>Assessments</h1>
        <button 
          onClick={() => router.push("/assessments/nouveau")}
          style={{
            background: "var(--foreground)", color: "white",
            padding: "8px 16px", borderRadius: "8px", border: "none",
            display: "flex", alignItems: "center", gap: "8px",
            fontSize: "14px", fontWeight: "500", cursor: "pointer"
          }}
        >
          <Plus size={16} /> Créer un assessment
        </button>
      </div>

      <div style={{ display: "flex", gap: "24px", borderBottom: "1px solid var(--border)", marginBottom: "24px" }}>
        <button
          onClick={() => setActiveTab("my_assessments")}
          style={{
            background: "none", border: "none",
            padding: "0 0 12px 0", cursor: "pointer",
            fontSize: "14px", fontWeight: "500",
            color: activeTab === "my_assessments" ? "var(--foreground)" : "var(--muted-foreground)",
            borderBottom: activeTab === "my_assessments" ? "2px solid var(--foreground)" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <FolderHeart size={16} /> Mes Assessments
        </button>
        <button
          onClick={() => setActiveTab("library")}
          style={{
            background: "none", border: "none",
            padding: "0 0 12px 0", cursor: "pointer",
            fontSize: "14px", fontWeight: "500",
            color: activeTab === "library" ? "var(--foreground)" : "var(--muted-foreground)",
            borderBottom: activeTab === "library" ? "2px solid var(--foreground)" : "2px solid transparent",
            display: "flex", alignItems: "center", gap: "8px"
          }}
        >
          <BookOpen size={16} /> Bibliothèque Onbord
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)" }}>Chargement...</div>
      ) : (
        <div>
          {activeTab === "my_assessments" && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {myTests.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: "40px", textAlign: "center", background: "var(--card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  <p style={{ color: "var(--muted-foreground)", marginBottom: "16px" }}>Vous n'avez pas encore de tests dans vos assessments.</p>
                  <button 
                    onClick={() => setActiveTab("library")}
                    style={{ background: "transparent", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                  >Parcourir la bibliothèque</button>
                </div>
              ) : (
                myTests.map(t => (
                  <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>{t.name}</h3>
                    <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "16px", height: "40px", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", background: "var(--primary-light, #e0e7ff)", color: "var(--primary)", padding: "4px 8px", borderRadius: "100px" }}>{t.category}</span>
                      <span style={{ fontSize: "12px", color: "var(--muted-foreground)" }}>{t.company_assessment_status === 'en_creation' ? 'En création' : 'Disponible'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "library" && (
            <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {libraryTests.map(t => {
                const alreadyAdded = myTests.some(my => my.id === t.id);
                return (
                  <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>{t.name}</h3>
                    <p style={{ fontSize: "14px", color: "var(--muted-foreground)", marginBottom: "16px", height: "40px", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", background: "var(--primary-light, #e0e7ff)", color: "var(--primary)", padding: "4px 8px", borderRadius: "100px" }}>{t.category}</span>
                      <button 
                        onClick={() => handleAddFromLibrary(t.id)}
                        disabled={alreadyAdded}
                        style={{
                          background: alreadyAdded ? "var(--muted)" : "transparent",
                          color: alreadyAdded ? "var(--muted-foreground)" : "var(--foreground)",
                          border: "1px solid var(--border)", padding: "4px 12px", borderRadius: "6px",
                          fontSize: "12px", cursor: alreadyAdded ? "not-allowed" : "pointer"
                        }}
                      >
                        {alreadyAdded ? "Déjà ajouté" : "Ajouter"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
