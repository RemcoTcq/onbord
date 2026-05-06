"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/accueil");
      router.refresh();
    }
  };

  return (
    <div className="auth-card fade-in">
      <div className="auth-header">
        <div className="auth-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 370 617" width="48" height="80">
            <path fill="var(--primary)" d="m0 1h150c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150-82.84 0-150-67.16-150-150z"/>
            <path fill="var(--primary)" d="m0 501c0-102.17 82.83-185 185-185h35c82.84 0 150 67.16 150 150 0 82.84-67.16 150-150 150h-220z"/>
          </svg>
        </div>
        <h2 className="auth-title">Connexion</h2>
        <p className="auth-subtitle">Content de vous revoir sur Onbord</p>
      </div>

      <form onSubmit={handleLogin}>
        {error && (
          <div style={{ color: 'var(--destructive)', backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </div>
        )}
        
        <div className="auth-form-group">
          <label className="form-label" htmlFor="email-address">Email professionnel</label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder="vous@entreprise.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div className="auth-form-group" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>Mot de passe</label>
            <Link href="#" style={{ fontSize: '13px', color: 'var(--muted-foreground)' }}>Oublié ?</Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px' }}
          disabled={loading}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      
      <div className="auth-footer">
        Pas encore de compte ?{" "}
        <Link href="/register" className="auth-link">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}

