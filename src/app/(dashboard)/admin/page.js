"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Link2, Trash2, Loader2, Shield } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { isAdmin as checkAdmin } from "@/lib/utils/admin";

function generateToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 24; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function AdminPage() {
  const [plan, setPlan] = useState("core");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !checkAdmin(user)) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    const { data } = await supabase
      .from("invite_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setTokens(data);
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    const supabase = createClient();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("invite_tokens")
      .insert({ token, plan, expires_at: expiresAt })
      .select()
      .single();

    if (error) {
      toast("Erreur : " + error.message, "error");
    } else {
      setTokens(prev => [data, ...prev]);
      const link = `${window.location.origin}/join?token=${token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(data.id);
      toast("Lien généré et copié !");
      setTimeout(() => setCopiedId(null), 3000);
    }
    setGenerating(false);
  }

  async function handleDelete(id) {
    const supabase = createClient();
    await supabase.from("invite_tokens").delete().eq("id", id);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast("Token supprimé");
  }

  function copyLink(token, id) {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast("Lien copié !");
    setTimeout(() => setCopiedId(null), 3000);
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

  const PLAN_COLORS = {
    beta: { bg: "#fef3c7", color: "#92400e" },
    core: { bg: "#e0e7ff", color: "#4338ca" },
    pro: { bg: "#ede9fe", color: "#6d28d9" },
    enterprise: { bg: "#f1f5f9", color: "#1e293b" },
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>Administration</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>Générez des liens d'invitation pour vos clients.</p>
      </div>

      {/* Generator */}
      <div className="card" style={{ marginBottom: "2rem", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "250px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", whiteSpace: "nowrap" }}>Plan :</label>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value)}
            style={{
              padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)",
              background: "var(--background)", fontSize: "14px", fontWeight: "600",
              color: "var(--foreground)", cursor: "pointer", flex: 1
            }}
          >
            <option value="beta">Beta</option>
            <option value="core">Core</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={generating}
          style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Link2 size={18} />}
          Générer le lien
        </button>
      </div>

      {/* Tokens list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Token</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plan</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statut</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Expire</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>Aucun lien généré pour l'instant.</td></tr>
            )}
            {tokens.map(t => {
              const expired = new Date(t.expires_at) < new Date();
              const pc = PLAN_COLORS[t.plan] || PLAN_COLORS.core;
              return (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--border)", opacity: t.used || expired ? 0.5 : 1 }}>
                  <td style={{ padding: "14px 20px" }}>
                    <code style={{ fontSize: "12px", background: "var(--secondary)", padding: "4px 8px", borderRadius: "6px" }}>
                      {t.token.substring(0, 12)}...
                    </code>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", background: pc.bg, color: pc.color }}>
                      {t.plan.charAt(0).toUpperCase() + t.plan.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                    {t.used ? (
                      <span style={{ color: "#166534", fontWeight: "600" }}>Utilisé</span>
                    ) : expired ? (
                      <span style={{ color: "#991b1b", fontWeight: "600" }}>Expiré</span>
                    ) : (
                      <span style={{ color: "#0369a1", fontWeight: "600" }}>Actif</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                    {new Date(t.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      {!t.used && !expired && (
                        <button
                          onClick={() => copyLink(t.token, t.id)}
                          className="btn btn-ghost btn-sm"
                          title="Copier le lien"
                          style={{ color: copiedId === t.id ? "#166534" : "var(--primary)" }}
                        >
                          {copiedId === t.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="btn btn-ghost btn-sm"
                        title="Supprimer"
                        style={{ color: "var(--destructive)" }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
