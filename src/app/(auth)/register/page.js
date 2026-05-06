"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
        }
      }
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
    <div className="card" style={{ padding: '2rem' }}>
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Inscription</h2>
        <p style={{ color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>Créez votre compte recruteur</p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleRegister}>
        {error && (
          <div style={{ color: 'var(--destructive)', backgroundColor: 'var(--destructive-foreground)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
             <div>
                <label className="form-label" htmlFor="first-name">Prénom</label>
                <input
                  id="first-name"
                  type="text"
                  required
                  className="input-field"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="last-name">Nom</label>
                <input
                  id="last-name"
                  type="text"
                  required
                  className="input-field"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
          </div>
          <div>
            <label className="form-label" htmlFor="company-name">Entreprise</label>
            <input
              id="company-name"
              type="text"
              required
              className="input-field"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="email-address">Email</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label" htmlFor="password">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? "Création en cours..." : "S'inscrire"}
          </button>
        </div>
      </form>
      <div className="text-center mt-6">
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Déjà un compte ?{" "}
          <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
