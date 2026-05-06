"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function JoinForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide. Aucun token fourni.");
      setLoading(false);
      return;
    }

    async function validateToken() {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (fetchError || !data) {
        setError("Ce lien d'invitation est invalide.");
      } else if (data.used) {
        setError("Ce lien d'invitation a déjà été utilisé.");
      } else if (new Date(data.expires_at) < new Date()) {
        setError("Ce lien d'invitation a expiré.");
      } else {
        setTokenData(data);
      }
      setLoading(false);
    }

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      // 1. Create account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
            company_name: form.company_name,
          },
        },
      });

      if (signUpError) throw signUpError;

      // 2. Set plan on user row
      if (authData.user) {
        await supabase
          .from("users")
          .update({ plan: tokenData.plan })
          .eq("id", authData.user.id);

        // 3. Mark token as used
        await supabase
          .from("invite_tokens")
          .update({ used: true, used_by: authData.user.id })
          .eq("id", tokenData.id);
      }

      // 4. Redirect to dashboard
      router.push("/accueil");
      router.refresh();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const PLAN_LABELS = {
    beta: { label: "Beta", color: "#f59e0b" },
    core: { label: "Core", color: "var(--primary)" },
    pro: { label: "Pro", color: "#8b5cf6" },
    enterprise: { label: "Enterprise", color: "#1e293b" },
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
        <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "48px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#fee2e2", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", fontSize: "28px" }}>!</div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>Lien invalide</h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "32px" }}>{error}</p>
          <a href="/login" style={{ color: "var(--primary)", fontWeight: "600", fontSize: "14px" }}>Déjà un compte ? Se connecter</a>
        </div>
      </div>
    );
  }

  const planInfo = PLAN_LABELS[tokenData?.plan] || PLAN_LABELS.core;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--background)", padding: "20px" }}>
      <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "48px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px" }}>Rejoindre Onbord</h1>
          <p style={{ color: "var(--muted-foreground)", marginBottom: "16px" }}>
            Créez votre compte pour accéder à la plateforme.
          </p>
          <span style={{
            display: "inline-block", padding: "4px 16px", borderRadius: "20px",
            fontSize: "13px", fontWeight: "700",
            background: planInfo.color + "18", color: planInfo.color,
          }}>
            Plan {planInfo.label}
          </span>
        </div>

        {error && (
          <div style={{ color: "#991b1b", background: "#fee2e2", padding: "12px", borderRadius: "10px", fontSize: "13px", marginBottom: "20px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Prénom</label>
              <input className="input-field" required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Prénom" />
            </div>
            <div>
              <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Nom</label>
              <input className="input-field" required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Nom" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Entreprise</label>
            <input className="input-field" required value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Nom de l'entreprise" />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Email</label>
            <input className="input-field" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="votre@email.com" />
          </div>

          <div>
            <label style={{ fontSize: "13px", fontWeight: "600", marginBottom: "6px", display: "block" }}>Mot de passe</label>
            <input className="input-field" type="password" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 6 caractères" />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", marginTop: "8px" }}
            disabled={submitting}
          >
            {submitting ? "Création du compte..." : "Créer mon compte"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--muted-foreground)" }}>
          Déjà un compte ? <a href="/login" style={{ color: "var(--primary)", fontWeight: "600" }}>Se connecter</a>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: "24px", height: "24px", border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
