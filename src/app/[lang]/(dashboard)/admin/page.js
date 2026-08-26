"use client";
import { formatDateShort, formatDateLong } from "@/lib/i18n/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useLocaleHref } from "@/lib/i18n/navigation";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Copy, Check, Link2, Trash2, Loader2, Shield, UserPlus, KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import {
  isCurrentUserAdmin,
  adminListInviteTokens,
  adminCreateInviteToken,
  adminDeleteInviteToken,
  adminCreerCompte,
} from "@/lib/actions/usage";

// generateToken() vivait ici : 24 caractères tirés avec Math.random(), dont la
// suite est prédictible. Sur une invitation qui peut porter le plan `admin`,
// cela suffit à la deviner. Le jeton est désormais tiré côté serveur, avec
// crypto.randomUUID() (cf. adminCreateInviteToken).

// Style des champs du formulaire de création. Sorti du rendu : il est repris
// par six entrées, et six copies finissent toujours par diverger.
const CHAMP = {
  padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--border)",
  background: "var(--background)", fontSize: "14px", color: "var(--foreground)", width: "100%",
};

export default function AdminPage() {
  const { t, locale } = useI18n();
  const href = useLocaleHref();
  const [plan, setPlan] = useState("core");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Création directe d'un compte : le chemin principal depuis que l'inscription
  // publique est fermée côté Supabase.
  const VIDE = { email: "", first_name: "", last_name: "", company_name: "", plan: "core" };
  const [form, setForm] = useState(VIDE);
  const [creating, setCreating] = useState(false);
  // Identifiants du dernier compte créé. Le mot de passe n'existe QUE là :
  // Supabase n'en garde qu'un hachage, il ne se retrouve pas.
  const [nouveau, setNouveau] = useState(null);
  const [copieMdp, setCopieMdp] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !(await isCurrentUserAdmin())) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setHasAccess(true);

    // `invite_tokens` n'accepte plus d'accès direct (migration 022) : la lecture
    // passe par une action serveur, gardée par ADMIN_EMAILS.
    const res = await adminListInviteTokens();
    if (res.success) setTokens(res.tokens);
    setLoading(false);
  }

  async function handleGenerate() {
    setGenerating(true);

    // Jeton tiré serveur, plan validé serveur : l'insert partait auparavant du
    // navigateur, qui choisissait donc librement le plan de l'invitation.
    const { success, token: data, error } = await adminCreateInviteToken(plan);

    if (!success) {
      toast("Erreur : " + error, "error");
    } else {
      setTokens(prev => [data, ...prev]);
      const link = `${window.location.origin}/join?token=${data.token}`;
      await navigator.clipboard.writeText(link);
      setCopiedId(data.id);
      toast(t("dashboard.admin.linkGenerated"));
      setTimeout(() => setCopiedId(null), 3000);
    }
    setGenerating(false);
  }

  async function handleCreerCompte(e) {
    e.preventDefault();
    setCreating(true);
    setNouveau(null);
    const res = await adminCreerCompte(form);
    if (res.success) {
      setNouveau({ email: res.email, motDePasse: res.motDePasse });
      setForm(VIDE);
      toast(t("dashboard.admin.accountCreated"));
    } else {
      toast(res.error || t("dashboard.admin.accountError"), "error");
    }
    setCreating(false);
  }

  async function handleDelete(id) {
    await adminDeleteInviteToken(id);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast(t("dashboard.admin.tokenDeleted"));
  }

  function copyLink(token, id) {
    const link = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast(t("dashboard.admin.linkCopied"));
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
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "12px" }}>{t("dashboard.admin.accessDenied")}</h1>
        <p style={{ color: "var(--muted-foreground)" }}>{t("dashboard.admin.adminsOnly")}</p>
      </div>
    );
  }

  const PLAN_COLORS = {
    core: { bg: "#e0e7ff", color: "#4338ca" },
    pro: { bg: "#ede9fe", color: "#6d28d9" },
    custom: { bg: "#f1f5f9", color: "#1e293b" },
    admin: { bg: "#1e293b", color: "#ffffff" },
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>{t("dashboard.admin.title")}</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>{t("dashboard.admin.subtitle")}</p>
      </div>

      {/* Tabs / Navigation */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "2rem" }}>
        <button 
          className="btn btn-primary" 
          style={{ padding: "10px 20px" }}
        >
          {t("dashboard.admin.tabInvites")}
        </button>
        <a
          href={href("/admin/couts")}
          className="btn btn-ghost"
          style={{ padding: "10px 20px", border: "1px solid var(--border)" }}
        >
          {t("dashboard.admin.tabCosts")}
        </a>
      </div>

      {/* ── Création directe d'un compte ─────────────────────────────────
          Chemin principal depuis la fermeture des inscriptions publiques :
          l'API d'administration n'est pas soumise au réglage Supabase, elle
          reste donc le seul moyen de créer un compte. */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <UserPlus size={18} style={{ color: "var(--primary)" }} />
          <h2 style={{ fontSize: "16px", fontWeight: 700 }}>{t("dashboard.admin.createAccount")}</h2>
        </div>
        <p style={{ fontSize: "13px", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
          {t("dashboard.admin.createAccountHelp")}
        </p>

        <form onSubmit={handleCreerCompte} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder={t("dashboard.admin.fields.email")} style={CHAMP}
            />
            <input
              type="text" value={form.company_name}
              onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              placeholder={t("dashboard.admin.fields.company")} style={CHAMP}
            />
            <input
              type="text" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              placeholder={t("dashboard.admin.fields.firstName")} style={CHAMP}
            />
            <input
              type="text" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              placeholder={t("dashboard.admin.fields.lastName")} style={CHAMP}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              style={{ ...CHAMP, width: "auto", fontWeight: 600, cursor: "pointer" }}
            >
              <option value="core">Core</option>
              <option value="pro">Pro</option>
              <option value="custom">Custom</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit" className="btn btn-primary" disabled={creating}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {creating ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />}
              {t("dashboard.admin.createAccountSubmit")}
            </button>
          </div>
        </form>

        {/* Le mot de passe ne se retrouve pas : il n'existe que sur cet écran,
            jusqu'au prochain rechargement. D'où l'avertissement, et le bouton
            de copie plutôt qu'une sélection à la main. */}
        {nouveau && (
          <div style={{ marginTop: "1.25rem", padding: "16px", borderRadius: "10px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <KeyRound size={16} style={{ color: "#166534" }} />
              <strong style={{ fontSize: "14px", color: "#166534" }}>{nouveau.email}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <code style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "0.03em", background: "white", padding: "8px 12px", borderRadius: "8px", border: "1px solid #bbf7d0", color: "#14532d" }}>
                {nouveau.motDePasse}
              </code>
              <button
                type="button" className="btn btn-ghost btn-sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(`${nouveau.email}\n${nouveau.motDePasse}`);
                  setCopieMdp(true);
                  setTimeout(() => setCopieMdp(false), 3000);
                }}
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "#166534" }}
              >
                {copieMdp ? <Check size={15} /> : <Copy size={15} />}
                {t("dashboard.admin.copyCredentials")}
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "#166534", marginTop: "10px" }}>
              {t("dashboard.admin.passwordOnce")}
            </p>
          </div>
        )}
      </div>

      {/* Generator */}
      <div className="card" style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: "13px", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
          {t("dashboard.admin.invitesNeedSignup")}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
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
            <option value="core">Core</option>
            <option value="pro">Pro</option>
            <option value="custom">Custom</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          className="btn btn-primary"
          disabled={generating}
          style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
        >
          {generating ? <Loader2 size={18} className="spin" /> : <Link2 size={18} />}
          {t("dashboard.admin.generateLink")}
        </button>
        </div>
      </div>

      {/* Tokens list */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.token")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.plan")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.status")}</th>
              <th style={{ padding: "14px 20px", textAlign: "left", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.expires")}</th>
              <th style={{ padding: "14px 20px", textAlign: "right", fontSize: "12px", fontWeight: "700", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("dashboard.admin.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {tokens.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted-foreground)", fontSize: "14px" }}>{t("dashboard.admin.noTokens")}</td></tr>
            )}
            {tokens.map(tok => {
              const expired = new Date(tok.expires_at) < new Date();
              const pc = PLAN_COLORS[tok.plan] || PLAN_COLORS.core;
              return (
                <tr key={tok.id} style={{ borderBottom: "1px solid var(--border)", opacity: tok.used || expired ? 0.5 : 1 }}>
                  <td style={{ padding: "14px 20px" }}>
                    <code style={{ fontSize: "12px", background: "var(--secondary)", padding: "4px 8px", borderRadius: "6px" }}>
                      {tok.token.substring(0, 12)}...
                    </code>
                  </td>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", background: pc.bg, color: pc.color }}>
                      {tok.plan.charAt(0).toUpperCase() + tok.plan.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px" }}>
                    {tok.used ? (
                      <span style={{ color: "#166534", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.used")}</span>
                    ) : expired ? (
                      <span style={{ color: "#991b1b", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.expired")}</span>
                    ) : (
                      <span style={{ color: "#0369a1", fontWeight: "600" }}>{t("dashboard.admin.tokenStatus.active")}</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: "13px", color: "var(--muted-foreground)" }}>
                    {formatDateLong(tok.expires_at, locale)}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                      {!tok.used && !expired && (
                        <button
                          onClick={() => copyLink(tok.token, tok.id)}
                          className="btn btn-ghost btn-sm"
                          title={t("dashboard.admin.copyLink")}
                          style={{ color: copiedId === tok.id ? "#166534" : "var(--primary)" }}
                        >
                          {copiedId === tok.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tok.id)}
                        className="btn btn-ghost btn-sm"
                        title={t("dashboard.admin.delete")}
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
