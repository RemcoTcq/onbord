"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Loader2, Search, Star, Briefcase, Trash2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

export default function TalentsPage() {
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadTalents(); }, []);

  async function loadTalents() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("candidates")
        .select("*, jobs!inner(id, title, user_id)")
        .eq("jobs.user_id", user.id)
        .eq("is_in_pool", true)
        .order("pool_added_at", { ascending: false });

      if (data) setTalents(data);
    }
    setLoading(false);
  }

  async function handleRemoveFromPool(e, candidateId) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Retirer ce talent du pool ?")) return;
    setRemovingId(candidateId);

    const supabase = createClient();
    const { error } = await supabase
      .from("candidates")
      .update({ is_in_pool: false, pool_added_at: null })
      .eq("id", candidateId);

    if (!error) {
      setTalents(prev => prev.filter(t => t.id !== candidateId));
      toast("Talent retiré du pool");
    } else {
      toast("Erreur lors de la suppression", "error");
    }
    setRemovingId(null);
  }

  const filtered = talents.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.first_name?.toLowerCase().includes(q) ||
      t.last_name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.jobs?.title?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <Loader2 size={24} style={{ color: "var(--muted-foreground)", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "700", color: "var(--foreground)", letterSpacing: "-0.02em" }}>Talents</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "13px", marginTop: "2px" }}>
            Votre base de talents sauvegardés pour de futurs recrutements.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted-foreground)", background: "var(--secondary)", padding: "4px 10px", borderRadius: "4px", fontWeight: "500" }}>
            {talents.length} talent{talents.length > 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: "320px" }}>
        <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
        <input
          type="text"
          className="input-field"
          placeholder="Rechercher un talent..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: "32px", fontSize: "12px" }}
        />
      </div>

      {/* Talent list */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
          <Users size={32} style={{ color: "var(--muted-foreground)", opacity: 0.3, margin: "0 auto 16px" }} />
          <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--foreground)", marginBottom: "6px" }}>
            {talents.length === 0 ? "Aucun talent sauvegardé" : "Aucun résultat"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
            {talents.length === 0
              ? "Sauvegardez des candidats depuis vos jobs pour les retrouver ici."
              : "Essayez un autre terme de recherche."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          {filtered.map(talent => {
            const isRemoving = removingId === talent.id;
            return (
              <Link
                key={talent.id}
                href={`/jobs/${talent.job_id}/candidats/${talent.id}`}
                style={{ textDecoration: "none", opacity: isRemoving ? 0.5 : 1 }}
              >
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 20px", background: "var(--card)",
                    borderBottom: "1px solid var(--border)", cursor: "pointer",
                    transition: "background 100ms ease"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--card)"}
                >
                  {/* Left */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "var(--foreground)", color: "var(--background)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: "600", flexShrink: 0
                    }}>
                      {`${(talent.first_name || "?")[0]}${(talent.last_name || "?")[0]}`.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: "500", color: "var(--foreground)" }}>
                        {talent.first_name} {talent.last_name}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
                        {talent.email && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                            <Mail size={10} /> {talent.email}
                          </span>
                        )}
                        {talent.jobs?.title && (
                          <span style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "var(--muted-foreground)" }}>
                            <Briefcase size={10} /> {talent.jobs.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                    {talent.score_cv != null && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        fontSize: "12px", fontWeight: "600",
                        color: talent.score_cv >= 70 ? "#166534" : talent.score_cv >= 40 ? "#92400e" : "#991b1b"
                      }}>
                        <Star size={12} /> {talent.score_cv}
                      </div>
                    )}
                    {talent.pool_added_at && (
                      <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                        {new Date(talent.pool_added_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <button
                      onClick={(e) => handleRemoveFromPool(e, talent.id)}
                      title="Retirer du pool"
                      style={{
                        background: "transparent", border: "none", padding: "4px",
                        color: "var(--muted-foreground)", cursor: "pointer",
                        borderRadius: "4px", transition: "all 120ms", display: "flex"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = "var(--destructive)"; e.currentTarget.style.background = "#fee2e2"; }}
                      onMouseLeave={e => { e.currentTarget.style.color = "var(--muted-foreground)"; e.currentTarget.style.background = "transparent"; }}
                    >
                      {isRemoving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
